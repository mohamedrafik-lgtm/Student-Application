import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceAutoCompleteService {
  private readonly logger = new Logger(AttendanceAutoCompleteService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron Job - يعمل كل 8 ساعات لإنهاء المحاضرات القديمة تلقائياً
   * يعمل عند: 00:00, 08:00, 16:00 يومياً
   */
  @Cron('0 */8 * * *', {
    name: 'auto-complete-old-sessions',
    timeZone: 'Africa/Cairo',
  })
  async autoCompleteOldSessions() {
    this.logger.log('🔍 [Auto-Complete] بدء فحص المحاضرات القديمة...');

    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    try {
      // جلب المحاضرات التي:
      // 1. لم تُلغى (isCancelled = false)
      // 2. مر على تاريخها 8 ساعات أو أكثر
      const oldSessions = await this.prisma.scheduledSession.findMany({
        where: {
          isCancelled: false,
          date: {
            lt: eightHoursAgo, // تاريخ المحاضرة أقدم من 8 ساعات
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

      this.logger.log(`📋 [Auto-Complete] وجد ${oldSessions.length} محاضرة قديمة`);

      let processedCount = 0;
      let absentMarkedCount = 0;

      // معالجة كل محاضرة
      for (const session of oldSessions) {
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

          // جلب من سجل حضورهم
          const attendedTraineeIds = session.attendance.map(a => a.traineeId);

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
              notes: 'تم التسجيل تلقائياً بواسطة النظام (مر على المحاضرة أكثر من 8 ساعات)',
              recordedBy: 'system',
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

      const attendedIds = session.attendance.map(a => a.traineeId);
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