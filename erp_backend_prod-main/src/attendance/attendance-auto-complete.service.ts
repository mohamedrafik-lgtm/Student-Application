import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';
import { getSessionAttendanceDeadline } from './attendance-window';

@Injectable()
export class AttendanceAutoCompleteService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceAutoCompleteService.name);

  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
  ) {}

  async onModuleInit() {
    // إكمال المحاضرات السابقة (إن وجدت) فور بدء التشغيل (في الخلفية، دون انتظار cron)
    setImmediate(() => {
      this.autoCompleteOldSessions().catch((e) =>
        this.logger.error('Auto-complete on boot failed:', e),
      );
      this.markStartedSessionsAbsent().catch((e) =>
        this.logger.error('Started-session attendance initialization on boot failed:', e),
      );
    });
  }

  /**
   * عند بلوغ وقت بداية الجلسة، أنشئ سجلات غياب مبدئية للمتدربين المتوقعين.
   * createMany + skipDuplicates يجعل العملية آمنة مع التسجيل اليدوي وQR والكود:
   * إذا سبق تسجيل المتدرب، لا تتغير حالته؛ وإذا لم يسجل بعد، يبدأ كغائب.
   */
  @Cron('0 * * * * *', {
    name: 'initialize-started-session-attendance',
    timeZone: 'Africa/Cairo',
  })
  async markStartedSessionsAbsent() {
    const adminUser = await this.prisma.user.findFirst({ where: { email: 'admin@codex.com' } })
      || await this.prisma.user.findFirst();
    if (!adminUser) {
      this.logger.warn('لا يوجد مستخدم صالح لتسجيل سجلات الغياب المبدئية');
      return;
    }

    const now = new Date();
    // date مخزن كـ DateTime، لذلك نقرأ نافذة واسعة ثم نطابق يوم القاهرة صراحةً.
    // هذا يغطي اختلاف المنطقة الزمنية بين قاعدة البيانات والخادم.
    const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const cairoDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const cairoTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);

    const sessions = await this.prisma.scheduledSession.findMany({
      where: {
        isCancelled: false,
        date: { gte: windowStart, lte: windowEnd },
      },
      include: {
        scheduleSlot: {
          include: {
            classroom: { select: { programId: true } },
            distributionRoom: {
              include: { assignments: { select: { traineeId: true } } },
            },
          },
        },
      },
    });

    for (const session of sessions) {
      const sessionDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(session.date);
      if (sessionDate !== cairoDate) continue;

      const startTime = session.scheduleSlot.startTime;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || startTime > cairoTime) continue;

      const expectedTrainees = session.scheduleSlot.distributionRoom
        ? await this.prisma.trainee.findMany({
            where: {
              id: { in: session.scheduleSlot.distributionRoom.assignments.map(a => a.traineeId) },
              programId: session.scheduleSlot.classroom.programId,
            },
            select: { id: true },
          })
        : await this.prisma.trainee.findMany({
            where: { programId: session.scheduleSlot.classroom.programId },
            select: { id: true },
          });

      if (expectedTrainees.length === 0) continue;

      const existingAttendance = await this.prisma.attendance.findMany({
        where: { sessionId: session.id },
        select: { traineeId: true },
      });
      const existingTraineeIds = new Set(existingAttendance.map(record => record.traineeId));
      const traineesToInitialize = expectedTrainees.filter(trainee => !existingTraineeIds.has(trainee.id));
      if (traineesToInitialize.length === 0) continue;

      await this.prisma.attendance.createMany({
        data: traineesToInitialize.map(trainee => ({
          sessionId: session.id,
          traineeId: trainee.id,
          status: 'ABSENT' as const,
          notes: 'غياب مبدئي عند بدء المحاضرة؛ يمكن تحديث الحالة عند تسجيل الحضور',
          recordedBy: adminUser.id,
          recordedAt: now,
        })),
        skipDuplicates: true,
      });

      for (const trainee of traineesToInitialize) {
        await this.attendanceService.updateAttendanceGrade(
          trainee.id,
          session.scheduleSlot.contentId,
          session.scheduleSlot.classroomId,
        );
      }
    }
  }

  /**
   * يفحص كل ساعة المحاضرات التي مر على موعدها 24 ساعة ولم يتم إنهاؤها.
   */
  @Cron('0 * * * *', {
    name: 'auto-complete-old-sessions',
    timeZone: 'Africa/Cairo',
  })
  async autoCompleteOldSessions() {
    this.logger.log('🔍 [Auto-Complete] بدء فحص المحاضرات القديمة...');

    // حل recordedBy: FK إلى User — 'system' غير صالح. نستخدم حساب admin (أو أول مستخدم).
    const adminUser = await this.prisma.user.findFirst({ where: { email: 'admin@codex.com' } })
      || await this.prisma.user.findFirst();
    const systemUserId = adminUser ? adminUser.id : null;
    if (!systemUserId) {
      this.logger.error('❌ [Auto-Complete] لا يوجد مستخدم في النظام — تخطي');
      return;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // جلب المحاضرات التي:
      // 1. لم تُلغى (isCancelled = false)
      // 2. مر على موعدها 24 ساعة أو أكثر ولم يسبق إنهاؤها
      const oldSessions = await this.prisma.scheduledSession.findMany({
        where: {
          isCancelled: false,
          completedAt: null,
          date: {
            lt: twentyFourHoursAgo,
          },
        },
        include: {
          scheduleSlot: {
            include: {
              content: true,
              classroom: {
                include: {
                  program: true,
                },
              },
              // ✅ جلب معلومات التوزيع لتحديد المتدربين المفترضين
              distributionRoom: {
                include: {
                  assignments: {
                    select: {
                      traineeId: true,
                    },
                  },
                },
              },
            },
          },
          attendance: {
            include: {
              trainee: true,
            },
          },
        },
      });

      // تاريخ الجلسة محفوظ كتاريخ دون وقت؛ لذلك نضم وقت نهاية الفترة قبل احتساب مهلة الـ24 ساعة.
      const dueSessions = oldSessions.filter((session) => {
        const deadline = getSessionAttendanceDeadline(session.date, session.scheduleSlot.endTime);
        if (!deadline) {
          this.logger.warn(`⚠️ [Auto-Complete] وقت نهاية غير صالح للمحاضرة ${session.id}`);
          return false;
        }
        return now.getTime() >= deadline.getTime();
      });

      this.logger.log(`📋 [Auto-Complete] وجد ${dueSessions.length} محاضرة تجاوزت مهلة 24 ساعة`);

      // ── خطوة استباقية: توحيد الحضور للفصول أولاً لضمان نسخ الحضور لمواد نفس اليوم قبل رصد الغياب ──
      const uniqueClassroomIds = [...new Set(dueSessions.map(s => s.scheduleSlot.classroom.id))];
      for (const cId of uniqueClassroomIds) {
        try {
          await this.attendanceService.unifyAttendanceByClassroom(cId, systemUserId);
          this.logger.log(`🔄 [Auto-Complete] تم توحيد الحضور للفصل ${cId} قبل رصد الغياب`);
        } catch (unifyErr: any) {
          this.logger.warn(`⚠️ [Auto-Complete] تعذر توحيد الحضور للفصل ${cId}: ${unifyErr.message}`);
        }
      }

      let processedCount = 0;
      let absentMarkedCount = 0;

      // معالجة كل محاضرة
      for (const session of dueSessions) {
        try {
          let expectedTrainees: { id: number; nameAr: string }[];

          // ✅ إذا المحاضرة مرتبطة بمجموعة توزيع → نسجل غياب فقط لمتدربي المجموعة
          if (session.scheduleSlot.distributionRoom) {
            const roomTraineeIds = session.scheduleSlot.distributionRoom.assignments.map(a => a.traineeId);
            
            expectedTrainees = await this.prisma.trainee.findMany({
              where: {
                id: { in: roomTraineeIds },
                programId: session.scheduleSlot.classroom.programId,
              },
              select: {
                id: true,
                nameAr: true,
              },
            });

            this.logger.log(
              `🏷️ [Auto-Complete] محاضرة ${session.id} مرتبطة بمجموعة "${session.scheduleSlot.distributionRoom.id}" - ${expectedTrainees.length} متدرب متوقع`
            );
          } else {
            // إذا لم تكن مرتبطة بمجموعة → كل متدربي البرنامج
            expectedTrainees = await this.prisma.trainee.findMany({
              where: {
                programId: session.scheduleSlot.classroom.programId,
              },
              select: {
                id: true,
                nameAr: true,
              },
            });
          }

          // جلب من سجل حضورهم (بعد خطوة التوحيد لضمان عدم رصد غياب لمن حضر في مادة أخرى)
          const currentAttendance = await this.prisma.attendance.findMany({
            where: { sessionId: session.id },
            select: { traineeId: true },
          });
          const attendedTraineeIds = currentAttendance.map(a => a.traineeId);

          // المتدربين الذين لم يسجل لهم حضور (من المتدربين المتوقعين فقط)
          const absentTrainees = expectedTrainees.filter(
            t => !attendedTraineeIds.includes(t.id)
          );

          this.logger.log(
            `📊 [Auto-Complete] محاضرة ${session.id} | متوقع: ${expectedTrainees.length} | حضر: ${attendedTraineeIds.length} | غائبين: ${absentTrainees.length}`
          );

          // تسجيل الغائبين
          if (absentTrainees.length > 0) {
            const attendanceRecords = absentTrainees.map(trainee => ({
              sessionId: session.id,
              traineeId: trainee.id,
              status: 'ABSENT' as const,
              notes: 'تم التسجيل تلقائياً بواسطة النظام (مر على موعد المحاضرة 24 ساعة)',
              recordedBy: systemUserId,
              recordedAt: new Date(),
            }));

            await this.prisma.attendance.createMany({
              data: attendanceRecords,
              skipDuplicates: true, // تجنب التكرار
            });

            absentMarkedCount += absentTrainees.length;

            this.logger.log(
              `✅ [Auto-Complete] تم تسجيل ${absentTrainees.length} غائب للمحاضرة ${session.id}`
            );
          }

          // تحديث درجات الحضور للمتدربين تلقائياً
          const contentId = session.scheduleSlot.contentId;
          const classroomId = session.scheduleSlot.classroomId;
          for (const trainee of expectedTrainees) {
            try {
              await this.attendanceService.updateAttendanceGrade(trainee.id, contentId, classroomId);
            } catch (e) {
              this.logger.error(`خطأ في تحديث درجة ${trainee.id}:`, e);
            }
          }

          await this.prisma.scheduledSession.update({
            where: { id: session.id },
            data: { completedAt: new Date() },
          });

          processedCount++;

        } catch (error) {
          this.logger.error(
            `❌ [Auto-Complete] خطأ في معالجة المحاضرة ${session.id}:`,
            error.message
          );
        }
      }

      this.logger.log(
        `✅ [Auto-Complete] اكتمل: ${processedCount} محاضرة معالجة | ${absentMarkedCount} غائب مسجل`
      );

    } catch (error) {
      this.logger.error('❌ [Auto-Complete] خطأ عام:', error);
    }
  }

  /**
   * إنهاء محاضرة يدوياً (للاستدعاء من Controller)
   */
  async completeSessionManually(sessionId: number, userId: string) {
    try {
      const session = await this.prisma.scheduledSession.findUnique({
        where: { id: sessionId },
        include: {
          scheduleSlot: {
            include: {
              classroom: true,
              // ✅ جلب معلومات التوزيع لتحديد المتدربين المفترضين
              distributionRoom: {
                include: {
                  assignments: {
                    select: {
                      traineeId: true,
                    },
                  },
                },
              },
            },
          },
          attendance: true,
        },
      });

      if (!session) {
        throw new Error('المحاضرة غير موجودة');
      }

      if (session.isCancelled) {
        throw new Error('المحاضرة ملغاة');
      }

      let expectedTrainees: { id: number }[];

      // ✅ إذا المحاضرة مرتبطة بمجموعة توزيع → فقط متدربي المجموعة
      if (session.scheduleSlot.distributionRoom) {
        const roomTraineeIds = session.scheduleSlot.distributionRoom.assignments.map(a => a.traineeId);
        
        expectedTrainees = await this.prisma.trainee.findMany({
          where: {
            id: { in: roomTraineeIds },
            programId: session.scheduleSlot.classroom.programId,
          },
          select: { id: true },
        });
      } else {
        // جلب جميع المتدربين
        expectedTrainees = await this.prisma.trainee.findMany({
          where: {
            programId: session.scheduleSlot.classroom.programId,
          },
          select: { id: true },
        });
      }

      // توحيد الحضور للفصل الدراسي أولاً قبل رصد الغياب
      const classroomIdM = session.scheduleSlot.classroomId;
      try {
        await this.attendanceService.unifyAttendanceByClassroom(classroomIdM, userId);
      } catch (e: any) {
        this.logger.warn(`⚠️ [Complete-Manually] تعذر توحيد الحضور: ${e.message}`);
      }

      // جلب سجلات الحضور المحدثة بعد خطوة التوحيد
      const currentAttendance = await this.prisma.attendance.findMany({
        where: { sessionId },
        select: { traineeId: true },
      });
      const attendedIds = currentAttendance.map(a => a.traineeId);
      const absentTrainees = expectedTrainees.filter(t => !attendedIds.includes(t.id));

      // تسجيل الغائبين
      if (absentTrainees.length > 0) {
        await this.prisma.attendance.createMany({
          data: absentTrainees.map(t => ({
            sessionId,
            traineeId: t.id,
            status: 'ABSENT' as const,
            notes: 'تم التسجيل تلقائياً عند إنهاء المحاضرة يدوياً',
            recordedBy: userId,
            recordedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // تحديث درجات الحضور للمتدربين تلقائياً
      const contentIdM = session.scheduleSlot.contentId;
      for (const trainee of expectedTrainees) {
        try {
          await this.attendanceService.updateAttendanceGrade(trainee.id, contentIdM, classroomIdM);
        } catch (e) {
          this.logger.error(`خطأ في تحديث درجة ${trainee.id}:`, e);
        }
      }

      await this.prisma.scheduledSession.update({
        where: { id: sessionId },
        data: { completedAt: new Date() },
      });

      return {
        success: true,
        message: `تم إنهاء المحاضرة وتسجيل ${absentTrainees.length} غائب`,
        absentCount: absentTrainees.length,
      };


    } catch (error) {
      this.logger.error('خطأ في الإنهاء اليدوي:', error);
      throw error;
    }
  }
}
