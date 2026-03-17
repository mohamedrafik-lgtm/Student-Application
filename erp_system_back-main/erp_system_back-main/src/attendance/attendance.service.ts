import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { TraineePaymentStatusService } from '../trainee-platform/trainee-payment-status.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
    private paymentStatusService: TraineePaymentStatusService
  ) {}

  // تسجيل حضور متدرب واحد
  async recordAttendance(dto: RecordAttendanceDto, userId: string) {
    // التحقق من وجود المحاضرة
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        scheduleSlot: {
          include: {
            content: true,
            classroom: true,
            distributionRoom: {
              include: {
                assignments: {
                  select: { traineeId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    if (session.isCancelled) {
      throw new BadRequestException('لا يمكن تسجيل الحضور لمحاضرة ملغاة');
    }

    // التحقق من أن تاريخ المحاضرة هو اليوم فقط (إلا إذا كان لديه صلاحية تسجيل التواريخ السابقة)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      // التحقق من صلاحية تسجيل التواريخ السابقة
      try {
        const userPermissions = await this.permissionsService.getUserPermissions(userId);
        const canRecordPast = userPermissions.hasPermission('dashboard.attendance', 'record_past');
        
        if (!canRecordPast) {
          throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        // في حالة فشل التحقق من الصلاحيات، نمنع تسجيل الحضور للتواريخ السابقة
        throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
      }
    }

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: dto.traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // ✅ التحقق من أن المتدرب ينتمي لمجموعة هذه الجلسة (إذا كانت مرتبطة بمجموعة)
    if (session.scheduleSlot.distributionRoom) {
      const roomTraineeIds = session.scheduleSlot.distributionRoom.assignments.map(a => a.traineeId);
      if (!roomTraineeIds.includes(dto.traineeId)) {
        throw new BadRequestException(
          `المتدرب ${trainee.nameAr} غير مدرج في مجموعة هذه المحاضرة. لا يمكن تسجيل الحضور.`
        );
      }
    }

    // 🔴 التحقق من حالة الدفع - إيقاف الحضور إذا كان متأخر
    console.log(`🔍 [Attendance] بدء فحص حالة الدفع للمتدرب ${dto.traineeId} (${trainee.nameAr})`);
    
    try {
      const paymentStatus = await this.paymentStatusService.checkTraineePaymentStatus(dto.traineeId);
      
      console.log(`📊 [Attendance] حالة الدفع:`, {
        status: paymentStatus.status,
        canAccessAttendance: paymentStatus.canAccessAttendance,
        overduePayments: paymentStatus.overduePayments?.length || 0,
        blockedFeatures: paymentStatus.blockedFeatures || []
      });
      
      // إذا كان الحضور محجوب - منع فقط حالات الحضور (PRESENT/LATE/EXCUSED)
      // السماح بتسجيل الغياب (ABSENT) بشكل طبيعي
      if (!paymentStatus.canAccessAttendance && dto.status !== 'ABSENT') {
        const overdueFeesNames = paymentStatus.overduePayments?.map(p => p.feeName).join('، ') || 'الرسوم';
        console.log(`🚫 [Attendance] منع تسجيل حضور ${dto.status} - رسوم متأخرة: ${overdueFeesNames}`);
        
        throw new BadRequestException(
          `لا يمكن تسجيل حضور هذا المتدرب بسبب تأخر في سداد: ${overdueFeesNames}. ` +
          `يجب السداد أولاً لتمكين تسجيل الحضور.`
        );
      } else if (!paymentStatus.canAccessAttendance && dto.status === 'ABSENT') {
        console.log(`✅ [Attendance] السماح بتسجيل غياب للمتدرب ${trainee.nameAr} رغم التأخر في السداد`);
      }
      
      // تحذير في الكونسول إذا كان هناك رسوم مستحقة قريباً (لكن السماح بالتسجيل)
      if (paymentStatus.status === 'PAYMENT_DUE' && paymentStatus.upcomingPayments?.length > 0) {
        console.log(`⚠️  [Attendance] المتدرب ${trainee.nameAr} لديه رسوم مستحقة قريباً - السماح بالتسجيل`);
      }
      
      console.log(`✅ [Attendance] سُمح بتسجيل الحضور للمتدرب ${trainee.nameAr}`);
      
    } catch (error) {
      console.error(`❌ [Attendance] خطأ في فحص حالة الدفع:`, error);
      
      // إذا كان الخطأ BadRequestException (أي حجب الحضور)، رميه للأعلى
      if (error instanceof BadRequestException) {
        throw error;
      }
      // خطأ آخر (مثل فشل الاتصال) - نسمح بالتسجيل (fail-safe)
      console.warn('⚠️  [Attendance] فشل فحص حالة الدفع، السماح بالتسجيل:', error.message);
    }

    // تسجيل أو تحديث الحضور
    const attendance = await this.prisma.attendance.upsert({
      where: {
        sessionId_traineeId: {
          sessionId: dto.sessionId,
          traineeId: dto.traineeId,
        },
      },
      create: {
        sessionId: dto.sessionId,
        traineeId: dto.traineeId,
        status: dto.status,
        notes: dto.notes,
        recordedBy: userId,
        recordedAt: new Date(),
      },
      update: {
        status: dto.status,
        notes: dto.notes,
        updatedBy: userId,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
        recordedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // تم تعطيل الحساب التلقائي - يتم حساب درجات الحضور من صفحة إعادة الحساب
    // await this.updateAttendanceGrade(
    //   dto.traineeId,
    //   session.scheduleSlot.contentId,
    //   session.scheduleSlot.classroomId,
    // );

    // ===== نشر الحضور تلقائياً لباقي المواد في نفس اليوم =====
    // فقط عند تسجيل حضور فعلي (PRESENT / LATE / EXCUSED) وليس غياب
    if (dto.status !== 'ABSENT') {
      try {
        const classroomId = session.scheduleSlot.classroomId;
        const sourceContentId = session.scheduleSlot.contentId;
        const sourceDistributionRoomId = session.scheduleSlot.distributionRoomId;
        const sessionDate = session.date;
        const dayOfWeek = (session.scheduleSlot as any).dayOfWeek;
        
        console.log(`🔍 [Auto-Spread] === بدء النشر التلقائي ===`);
        console.log(`🔍 [Auto-Spread] traineeId=${dto.traineeId}, status=${dto.status}`);
        console.log(`🔍 [Auto-Spread] classroomId=${classroomId}, sourceContentId=${sourceContentId}, sourceDistRoomId=${sourceDistributionRoomId}`);
        console.log(`🔍 [Auto-Spread] dayOfWeek=${dayOfWeek}, sessionDate=${sessionDate}`);

        if (!dayOfWeek) {
          console.error('❌ [Auto-Spread] dayOfWeek غير موجود! تخطي النشر');
        } else {
          // 1. معرفة مجموعات الطالب في هذا الفصل
          const traineeAssignments = await this.prisma.distributionAssignment.findMany({
            where: {
              traineeId: dto.traineeId,
              room: {
                distribution: {
                  classroomId,
                },
              },
            },
            select: {
              roomId: true,
              room: { 
                select: { 
                  roomName: true,
                  distribution: { select: { type: true } },
                } 
              },
            },
          });
          
          const traineeRoomIds = traineeAssignments.map(a => a.roomId);
          console.log(`🔍 [Auto-Spread] مجموعات الطالب:`, traineeAssignments.map(a => `${a.room.roomName} (${a.roomId}, type=${a.room.distribution.type})`));

          // 2. جلب حصص نفس اليوم في نفس الفصل (ما عدا المادة الحالية)
          const otherSlots = await this.prisma.scheduleSlot.findMany({
            where: {
              classroomId,
              dayOfWeek,
              contentId: { not: sourceContentId },
            },
            include: {
              content: { select: { id: true, name: true } },
            },
          });
          
          console.log(`🔍 [Auto-Spread] كل الحصص الأخرى في يوم ${dayOfWeek}: ${otherSlots.length}`, otherSlots.map(s => `${s.content.name} (distRoom=${s.distributionRoomId})`));

          // 3. تصفية: فقط الحصص التي تنتمي لمجموعة الطالب أو بدون مجموعة
          const filteredSlots = otherSlots.filter(slot => {
            // إذا الحصة ليست مرتبطة بمجموعة (عامة لكل الطلاب)
            if (!slot.distributionRoomId) return true;
            // إذا الحصة مرتبطة بمجموعة الطالب
            if (traineeRoomIds.includes(slot.distributionRoomId)) return true;
            return false;
          });

          // ✅ حماية إضافية: لكل مادة نأخذ حصة واحدة فقط (لتجنب النشر لمجموعتين من نفس المادة)
          const seenContentIds = new Set<number>();
          const deduplicatedSlots = filteredSlots.filter(slot => {
            if (seenContentIds.has(slot.contentId)) {
              console.log(`⚠️ [Auto-Spread] تخطي حصة مكررة للمادة ${slot.content.name} (slotId=${slot.id}, distRoom=${slot.distributionRoomId})`);
              return false;
            }
            seenContentIds.add(slot.contentId);
            return true;
          });

          console.log(`🔍 [Auto-Spread] الحصص المفلترة (خاصة بمجموعة الطالب): ${deduplicatedSlots.length}`, deduplicatedSlots.map(s => `${s.content.name} (distRoom=${s.distributionRoomId})`));

          if (deduplicatedSlots.length > 0) {
            console.log(`🔄 [Auto-Spread] نشر حضور ${dto.traineeId} (${dto.status}) إلى ${deduplicatedSlots.length} حصة`);

            for (const slot of deduplicatedSlots) {
              try {
                // إنشاء أو جلب المحاضرة (ScheduledSession) لهذا التاريخ
                const targetSession = await this.prisma.scheduledSession.upsert({
                  where: {
                    scheduleSlotId_date: {
                      scheduleSlotId: slot.id,
                      date: sessionDate,
                    },
                  },
                  update: {},
                  create: {
                    scheduleSlotId: slot.id,
                    date: sessionDate,
                    isCancelled: false,
                  },
                });

                // التحقق من وجود سجل حضور مسبق
                const existingAttendance = await this.prisma.attendance.findUnique({
                  where: {
                    sessionId_traineeId: {
                      sessionId: targetSession.id,
                      traineeId: dto.traineeId,
                    },
                  },
                });

                // إذا كان مسجل بحالة غير غائب → لا نعدل
                if (existingAttendance && existingAttendance.status !== 'ABSENT') {
                  console.log(`⏭️ [Auto-Spread] تخطي ${slot.content.name} - مسجل (${existingAttendance.status})`);
                  continue;
                }

                if (existingAttendance && existingAttendance.status === 'ABSENT') {
                  await this.prisma.attendance.update({
                    where: { id: existingAttendance.id },
                    data: {
                      status: dto.status,
                      notes: 'تم النشر تلقائياً - تحديث من غياب',
                      updatedBy: userId,
                    },
                  });
                  console.log(`✅ [Auto-Spread] تحديث غياب → ${dto.status} في ${slot.content.name}`);
                } else {
                  await this.prisma.attendance.create({
                    data: {
                      sessionId: targetSession.id,
                      traineeId: dto.traineeId,
                      status: dto.status,
                      notes: 'تم النشر تلقائياً من مادة أخرى',
                      recordedBy: userId,
                    },
                  });
                  console.log(`✅ [Auto-Spread] إنشاء حضور ${dto.status} في ${slot.content.name}`);
                }
              } catch (slotError: any) {
                console.error(`⚠️ [Auto-Spread] خطأ في ${slot.content.name}:`, slotError.message);
              }
            }
          } else {
            console.log(`🔍 [Auto-Spread] لا توجد حصص مناسبة لنشر الحضور`);
          }
        }
      } catch (spreadError: any) {
        console.error('⚠️ [Auto-Spread] خطأ عام:', spreadError.message);
      }
    }

    return attendance;
  }

  // تسجيل حضور جماعي
  async bulkRecordAttendance(sessionId: number, records: any[], userId: string) {
    // التحقق من وجود المحاضرة
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    if (session.isCancelled) {
      throw new BadRequestException('لا يمكن تسجيل الحضور لمحاضرة ملغاة');
    }

    // التحقق من أن تاريخ المحاضرة هو اليوم فقط (إلا إذا كان لديه صلاحية تسجيل التواريخ السابقة)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      // التحقق من صلاحية تسجيل التواريخ السابقة
      try {
        const userPermissions = await this.permissionsService.getUserPermissions(userId);
        const canRecordPast = userPermissions.hasPermission('dashboard.attendance', 'record_past');
        
        if (!canRecordPast) {
          throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        // في حالة فشل التحقق من الصلاحيات، نمنع تسجيل الحضور للتواريخ السابقة
        throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
      }
    }

    // تسجيل جميع السجلات - نضيف sessionId لكل record
    const results = await Promise.allSettled(
      records.map(record =>
        this.recordAttendance({
          sessionId,
          traineeId: record.traineeId,
          status: record.status,
          notes: record.notes,
        }, userId)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // إذا فشل أي سجل، نرمي الخطأ الأول (لعرضه في Frontend)
    const firstError = results.find(r => r.status === 'rejected');
    if (firstError && firstError.status === 'rejected') {
      console.log(`❌ [BulkAttendance] فشل ${failed} من ${records.length} سجل - رمي الخطأ للأعلى`);
      throw firstError.reason; // رمي الخطأ الأول
    }

    return {
      total: records.length,
      successful,
      failed,
      results,
    };
  }

  // الحصول على سجلات الحضور لمحاضرة معينة
  async getSessionAttendance(sessionId: number) {
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
      include: {
        scheduleSlot: {
      include: {
        content: {
              include: {
                instructor: {
          select: {
            id: true,
            name: true,
                  },
                },
                classroom: true,
                program: true,
              },
            },
            classroom: true,
            distributionRoom: true,
          },
        },
        attendance: {
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nationalId: true,
                email: true,
                phone: true,
              },
            },
            recordedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
            updatedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            trainee: {
              nameAr: 'asc',
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    return session;
  }

  // الحصول على قائمة المتدربين المفترض حضورهم للمحاضرة
  async getExpectedTrainees(sessionId: number, userId: string) {
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
      include: {
        scheduleSlot: {
          include: {
            content: {
              include: {
                classroom: {
                  include: {
                    program: true,
                  },
                },
              },
            },
            distributionRoom: {
              include: {
                assignments: {
                  include: {
                    trainee: {
                      select: {
                        id: true,
                        nameAr: true,
                        nationalId: true,
                        email: true,
                        phone: true,
                        programId: true,
                      },
                    },
                  },
                  orderBy: {
                    orderNumber: 'asc',
                  },
                },
              },
            },
          },
        },
        attendance: {
          select: {
            traineeId: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    // التحقق من أن تاريخ المحاضرة هو اليوم فقط (إلا إذا كان لديه صلاحية تسجيل التواريخ السابقة)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      // التحقق من صلاحية تسجيل التواريخ السابقة
      try {
        const userPermissions = await this.permissionsService.getUserPermissions(userId);
        const canRecordPast = userPermissions.hasPermission('dashboard.attendance', 'record_past');
        
        if (!canRecordPast) {
          throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        // في حالة فشل التحقق من الصلاحيات، نمنع تسجيل الحضور للتواريخ السابقة
        throw new BadRequestException('لا يمكن تسجيل الحضور إلا في يوم المحاضرة فقط');
      }
    }

    // إذا كان هناك توزيع قاعات، نحضر المتدربين من القاعة المحددة
    if (session.scheduleSlot.distributionRoom) {
      const trainees = session.scheduleSlot.distributionRoom.assignments
        .map(assignment => assignment.trainee)
        .filter(trainee => trainee.programId === session.scheduleSlot.content.programId);

      return {
        session,
        trainees,
        distributionRoom: session.scheduleSlot.distributionRoom,
      };
    }

    // إذا لم يكن هناك توزيع، نحضر جميع المتدربين في البرنامج
    const trainees = await this.prisma.trainee.findMany({
      where: {
        programId: session.scheduleSlot.content.programId,
      },
      select: {
        id: true,
        nameAr: true,
        nationalId: true,
        email: true,
        phone: true,
        programId: true,
      },
      orderBy: {
        nameAr: 'asc',
      },
    });

    return {
      session,
      trainees,
      distributionRoom: null,
    };
  }

  // إحصائيات الحضور لمتدرب معين في مادة معينة
  async getTraineeAttendanceStats(traineeId: number, contentId: number) {
    const attendance = await this.prisma.attendance.findMany({
        where: {
        traineeId,
        session: {
          scheduleSlot: {
            contentId,
          },
        },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            scheduleSlot: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'PRESENT').length,
      absent: attendance.filter(a => a.status === 'ABSENT').length,
      late: attendance.filter(a => a.status === 'LATE').length,
      excused: attendance.filter(a => a.status === 'EXCUSED').length,
      attendanceRate: 0,
    };

    if (stats.total > 0) {
      stats.attendanceRate = Math.round(
        ((stats.present + stats.late) / stats.total) * 100
      );
    }

    return {
      stats,
      records: attendance,
    };
  }

  // إحصائيات الحضور لمحاضرة معينة
  async getSessionAttendanceStats(sessionId: number) {
    const attendance = await this.prisma.attendance.findMany({
      where: { sessionId },
    });

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'PRESENT').length,
      absent: attendance.filter(a => a.status === 'ABSENT').length,
      late: attendance.filter(a => a.status === 'LATE').length,
      excused: attendance.filter(a => a.status === 'EXCUSED').length,
      attendanceRate: 0,
    };

    if (stats.total > 0) {
      stats.attendanceRate = Math.round(
        ((stats.present + stats.late) / stats.total) * 100
      );
    }

    return stats;
  }

  // الحصول على المحاضرات التي أنا مسؤول عن تسجيل حضورها
  async getMySessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // الحصول على المحاضرات التي يكون المستخدم مسؤول عن حضورها أو محاضر فيها
    const sessions = await this.prisma.scheduledSession.findMany({
      where: {
        isCancelled: false,
        OR: [
          {
            scheduleSlot: {
              content: {
                instructorId: userId,
              },
            },
          },
          {
            scheduleSlot: {
              content: {
                theoryAttendanceRecorderId: userId,
              },
            },
          },
          {
            scheduleSlot: {
              content: {
                practicalAttendanceRecorderId: userId,
              },
            },
          },
        ],
      },
      include: {
        scheduleSlot: {
          include: {
            content: {
              include: {
                instructor: {
              select: {
                id: true,
                    name: true,
                  },
                },
                classroom: true,
                program: true,
              },
            },
            classroom: true,
          },
        },
        _count: {
          select: {
            attendance: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 50,
    });

    return sessions;
  }

  // حذف سجل حضور
  async deleteAttendance(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('سجل الحضور غير موجود');
    }

    await this.prisma.attendance.delete({
      where: { id: attendanceId },
    });

    return { message: 'تم حذف سجل الحضور بنجاح' };
  }

  // استعراض سجلات الحضور للمتدربين
  async getTraineesWithAttendance(query: {
    page?: number;
    limit?: number;
    search?: string;
    programId?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // بناء شروط البحث
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nameAr: { contains: query.search } },
        { nameEn: { contains: query.search } },
        { nationalId: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    if (query.programId) {
      where.programId = query.programId;
    }

    // جلب المتدربين
    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where,
        skip,
        take: limit,
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
          nationalId: true,
          email: true,
          phone: true,
          photoUrl: true,
          program: {
            select: {
              id: true,
              nameAr: true,
            },
          },
          attendance: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          nameAr: 'asc',
        },
      }),
      this.prisma.trainee.count({ where }),
    ]);

    // حساب الحضور والغياب لكل متدرب
    const traineesWithStats = trainees.map(trainee => {
      const presentCount = trainee.attendance.filter(a => a.status === 'PRESENT').length;
      const absentCount = trainee.attendance.filter(a => a.status === 'ABSENT').length;

      return {
        ...trainee,
        attendance: undefined, // إزالة البيانات الكاملة
        attendanceStats: {
          present: presentCount,
          absent: absentCount,
        },
      };
    });

    return {
      data: traineesWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // جلب سجل حضور متدرب معين
  async getTraineeAttendanceDetails(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        email: true,
        phone: true,
        photoUrl: true,
        program: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // جلب جميع سجلات الحضور مع تفاصيل المحاضرات
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { traineeId },
      include: {
        session: {
          include: {
            scheduleSlot: {
              include: {
                content: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
                classroom: {
                  select: {
                    id: true,
                    name: true,
                    classNumber: true,
                  },
                },
              },
            },
          },
        },
        recordedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
        },
      });

    // حساب الإحصائيات
    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
    };

    // تجميع حسب المادة التدريبية
    const byContent: any = {};
    attendanceRecords.forEach(record => {
      const contentId = record.session.scheduleSlot.content.id;
      const contentName = record.session.scheduleSlot.content.name;
      
      if (!byContent[contentId]) {
        byContent[contentId] = {
          content: {
            id: contentId,
            name: contentName,
            code: record.session.scheduleSlot.content.code,
          },
          classroom: record.session.scheduleSlot.classroom,
          stats: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          },
          records: [],
        };
      }

      byContent[contentId].stats.total++;
      if (record.status === 'PRESENT') byContent[contentId].stats.present++;
      else if (record.status === 'ABSENT') byContent[contentId].stats.absent++;
      else if (record.status === 'LATE') byContent[contentId].stats.late++;
      else if (record.status === 'EXCUSED') byContent[contentId].stats.excused++;

      byContent[contentId].records.push(record);
    });

    return {
      trainee,
      stats,
      byContent: Object.values(byContent),
      allRecords: attendanceRecords,
    };
  }

  /**
   * تحديث درجة الحضور تلقائياً بناءً على سجلات الحضور
   * الحساب: (عدد المحاضرات التي حضرها / إجمالي المحاضرات) × درجة الحضور القصوى
   */
  /**
   * إعادة حساب درجات الحضور لجميع المتدربين في جميع المواد
   * يتم استخدامها لإصلاح الدرجات القديمة التي حُسبت بشكل خاطئ
   */
  async recalculateAllAttendanceGrades(): Promise<{
    total: number;
    updated: number;
    errors: number;
    details: Array<{ traineeId: number; contentId: number; classroomId: number; oldGrade: number; newGrade: number }>;
  }> {
    // جلب جميع سجلات الدرجات التي تحتوي على درجة حضور
    const allGrades = await this.prisma.traineeGrades.findMany({
      select: {
        traineeId: true,
        trainingContentId: true,
        classroomId: true,
        attendanceMarks: true,
      },
    });

    // جلب جميع المواد التي لديها درجات حضور
    const allContents = await this.prisma.trainingContent.findMany({
      where: {
        attendanceMarks: { gt: 0 },
      },
      select: {
        id: true,
        attendanceMarks: true,
        scheduleSlots: {
          select: {
            classroomId: true,
          },
          distinct: ['classroomId'],
        },
      },
    });

    // بناء قائمة فريدة من (trainee, content, classroom) للمعالجة
    const toProcess = new Set<string>();

    // من سجلات الدرجات الموجودة
    for (const grade of allGrades) {
      toProcess.add(`${grade.traineeId}-${grade.trainingContentId}-${grade.classroomId}`);
    }

    // من المتدربين الذين لديهم سجلات حضور ولكن ليس لديهم درجات بعد
    const attendanceRecords = await this.prisma.attendance.findMany({
      select: {
        traineeId: true,
        session: {
          select: {
            scheduleSlot: {
              select: {
                contentId: true,
                classroomId: true,
              },
            },
          },
        },
      },
      distinct: ['traineeId', 'sessionId'],
    });

    for (const record of attendanceRecords) {
      if (record.session?.scheduleSlot) {
        toProcess.add(`${record.traineeId}-${record.session.scheduleSlot.contentId}-${record.session.scheduleSlot.classroomId}`);
      }
    }

    let updated = 0;
    let errors = 0;
    const details: Array<{ traineeId: number; contentId: number; classroomId: number; oldGrade: number; newGrade: number }> = [];

    for (const key of toProcess) {
      const [traineeId, contentId, classroomId] = key.split('-').map(Number);
      try {
        // جلب الدرجة القديمة
        const existingGrade = await this.prisma.traineeGrades.findUnique({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId: contentId,
              classroomId,
            },
          },
          select: { attendanceMarks: true },
        });
        const oldGrade = existingGrade?.attendanceMarks || 0;

        // إعادة الحساب
        await this.updateAttendanceGrade(traineeId, contentId, classroomId);

        // جلب الدرجة الجديدة
        const newGradeRecord = await this.prisma.traineeGrades.findUnique({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId: contentId,
              classroomId,
            },
          },
          select: { attendanceMarks: true },
        });
        const newGrade = newGradeRecord?.attendanceMarks || 0;

        if (oldGrade !== newGrade) {
          updated++;
          details.push({ traineeId, contentId, classroomId, oldGrade, newGrade });
        }
      } catch (error) {
        errors++;
        console.error(`Error recalculating grade for trainee ${traineeId}, content ${contentId}, classroom ${classroomId}:`, error);
      }
    }

    return {
      total: toProcess.size,
      updated,
      errors,
      details,
    };
  }

  private async updateAttendanceGrade(
    traineeId: number,
    contentId: number,
    classroomId: number,
  ) {
    try {
      // 1. الحصول على معلومات المادة التدريبية لمعرفة درجة الحضور القصوى
      const content = await this.prisma.trainingContent.findUnique({
        where: { id: contentId },
        select: {
          attendanceMarks: true,
        },
      });

      if (!content || !content.attendanceMarks || content.attendanceMarks === 0) {
        // لا توجد درجات للحضور في هذه المادة
        return;
      }

      const maxAttendanceMarks = content.attendanceMarks;

      // 2. معرفة مجموعات التوزيع التي ينتمي لها المتدرب في هذا الفصل
      const traineeAssignments = await this.prisma.distributionAssignment.findMany({
        where: {
          traineeId,
          room: {
            distribution: { classroomId },
          },
        },
        select: { roomId: true },
      });
      const traineeRoomIds = traineeAssignments.map(a => a.roomId);

      // 3. حساب إجمالي المحاضرات الفعلية (ScheduledSession) المخصصة لهذا المتدرب
      // → الجلسات التي حصتها بدون مجموعة (عامة) أو حصتها مرتبطة بمجموعة المتدرب
      const totalSessions = await this.prisma.scheduledSession.count({
        where: {
          isCancelled: false,
          scheduleSlot: {
            contentId,
            classroomId,
            OR: [
              { distributionRoomId: null },
              ...(traineeRoomIds.length > 0
                ? [{ distributionRoomId: { in: traineeRoomIds } }]
                : []),
            ],
          },
        },
      });

      if (totalSessions === 0) {
        // لا توجد محاضرات مجدولة
        return;
      }

      // 4. حساب عدد المحاضرات التي حضرها المتدرب (PRESENT أو LATE أو EXCUSED)
      const attendedSessions = await this.prisma.attendance.count({
        where: {
          traineeId,
          status: {
            in: ['PRESENT', 'LATE', 'EXCUSED'],
          },
          session: {
            scheduleSlot: {
              contentId,
              classroomId,
            },
            isCancelled: false,
          },
        },
      });

      // 5. حساب درجة الحضور
      const attendanceGrade = Math.round(((attendedSessions / totalSessions) * maxAttendanceMarks) * 100) / 100;

      // 5. تحديث أو إنشاء سجل الدرجات
      await this.prisma.traineeGrades.upsert({
        where: {
          traineeId_trainingContentId_classroomId: {
            traineeId,
            trainingContentId: contentId,
            classroomId,
          },
        },
        create: {
          traineeId,
          trainingContentId: contentId,
          classroomId,
          attendanceMarks: attendanceGrade,
          yearWorkMarks: 0,
          practicalMarks: 0,
          writtenMarks: 0,
          quizzesMarks: 0,
          finalExamMarks: 0,
          totalMarks: attendanceGrade,
        },
        update: {
          attendanceMarks: attendanceGrade,
          // تحديث المجموع الكلي
          totalMarks: {
            increment: attendanceGrade,
          },
        },
      });

      // إعادة حساب المجموع الكلي بشكل صحيح
      const updatedGrade = await this.prisma.traineeGrades.findUnique({
        where: {
          traineeId_trainingContentId_classroomId: {
            traineeId,
            trainingContentId: contentId,
            classroomId,
          },
        },
      });

      if (updatedGrade) {
        const newTotal =
          (updatedGrade.yearWorkMarks || 0) +
          (updatedGrade.practicalMarks || 0) +
          (updatedGrade.writtenMarks || 0) +
          (updatedGrade.attendanceMarks || 0) +
          (updatedGrade.quizzesMarks || 0) +
          (updatedGrade.finalExamMarks || 0);

        await this.prisma.traineeGrades.update({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId: contentId,
              classroomId,
            },
          },
          data: {
            totalMarks: newTotal,
          },
        });
      }
    } catch (error) {
      // نسجل الخطأ لكن لا نوقف عملية تسجيل الحضور
      console.error('Error updating attendance grade:', error);
    }
  }

  /**
   * تنظيف سجلات الحضور الوهمية - حذف سجلات حضور لمتدربين في جلسات ليست مجموعتهم
   * هذا يصلح البيانات الخاطئة الناتجة عن الخطأ السابق في autoCompleteOldSessions
   */
  async cleanupPhantomAttendanceRecords(classroomId: number) {
    console.log(`🧹 [Cleanup] بدء تنظيف سجلات الحضور الوهمية للفصل ${classroomId}...`);

    // 1. جلب جميع الحصص المرتبطة بمجموعات في هذا الفصل
    const slotsWithRooms = await this.prisma.scheduleSlot.findMany({
      where: {
        classroomId,
        distributionRoomId: { not: null },
      },
      include: {
        content: { select: { id: true, name: true } },
        distributionRoom: {
          include: {
            assignments: {
              select: { traineeId: true },
            },
          },
        },
        sessions: {
          include: {
            attendance: {
              select: {
                id: true,
                traineeId: true,
                status: true,
                notes: true,
              },
            },
          },
        },
      },
    });

    let totalDeleted = 0;
    let totalChecked = 0;
    const details: Array<{
      sessionId: number;
      traineeId: number;
      slotContent: string;
      distributionRoom: string;
      status: string;
      notes: string | null;
    }> = [];

    for (const slot of slotsWithRooms) {
      if (!slot.distributionRoom) continue;

      // قائمة المتدربين المنتمين لهذه المجموعة
      const validTraineeIds = new Set(
        slot.distributionRoom.assignments.map(a => a.traineeId)
      );

      for (const session of slot.sessions) {
        for (const record of session.attendance) {
          totalChecked++;
          
          // إذا المتدرب ليس في مجموعة هذه الحصة → سجل وهمي!
          if (!validTraineeIds.has(record.traineeId)) {
            details.push({
              sessionId: session.id,
              traineeId: record.traineeId,
              slotContent: slot.content.name,
              distributionRoom: slot.distributionRoom.id,
              status: record.status,
              notes: record.notes,
            });
          }
        }
      }
    }

    // حذف السجلات الوهمية
    if (details.length > 0) {
      const idsToDelete = [];
      
      for (const detail of details) {
        const record = await this.prisma.attendance.findUnique({
          where: {
            sessionId_traineeId: {
              sessionId: detail.sessionId,
              traineeId: detail.traineeId,
            },
          },
        });
        if (record) {
          idsToDelete.push(record.id);
        }
      }

      if (idsToDelete.length > 0) {
        const deleteResult = await this.prisma.attendance.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });
        totalDeleted = deleteResult.count;
      }
    }

    console.log(`🧹 [Cleanup] اكتمل: فحص ${totalChecked} سجل | حذف ${totalDeleted} سجل وهمي`);

    return {
      classroomId,
      totalChecked,
      totalDeleted,
      phantomRecords: details.slice(0, 200), // أول 200 سجل للعرض
    };
  }

  /**
   * توحيد الحضور عبر المواد في نفس اليوم بالفصل الدراسي
   * إذا حضر متدرب في مادة واحدة في يوم ما، يتم نسخ الحضور لجميع المواد الأخرى في نفس اليوم
   * بما في ذلك إنشاء محاضرات (ScheduledSession) مفقودة إذا لم تكن مولّدة
   */
  async unifyAttendanceByClassroom(classroomId: number, userId: string) {
    // 1. جلب جميع المواد في هذا الفصل الدراسي
    const contents = await this.prisma.trainingContent.findMany({
      where: { classroomId },
      select: { id: true, name: true, code: true },
    });

    if (contents.length === 0) {
      throw new BadRequestException('لا توجد مواد في هذا الفصل الدراسي');
    }

    // 2. جلب جميع ScheduleSlots لهذا الفصل (مع معلومات المجموعة)
    const scheduleSlots = await this.prisma.scheduleSlot.findMany({
      where: { classroomId },
      include: {
        content: { select: { id: true, name: true } },
      },
    });

    if (scheduleSlots.length === 0) {
      throw new BadRequestException('لا يوجد جدول دراسي لهذا الفصل');
    }

    // 3. بناء خريطة: لكل يوم أسبوع → الحصص المجدولة
    const slotsByDayOfWeek = new Map<string, typeof scheduleSlots>();
    for (const slot of scheduleSlots) {
      const day = slot.dayOfWeek;
      if (!slotsByDayOfWeek.has(day)) {
        slotsByDayOfWeek.set(day, []);
      }
      slotsByDayOfWeek.get(day)!.push(slot);
    }

    // 4. جلب جميع تخصيصات المتدربين للمجموعات في هذا الفصل
    const allAssignments = await this.prisma.distributionAssignment.findMany({
      where: {
        room: {
          distribution: { classroomId },
        },
      },
      select: { traineeId: true, roomId: true },
    });

    // بناء خريطة: لكل متدرب → قائمة المجموعات التي ينتمي لها
    const traineeRoomsMap = new Map<number, Set<string>>();
    for (const assignment of allAssignments) {
      if (!traineeRoomsMap.has(assignment.traineeId)) {
        traineeRoomsMap.set(assignment.traineeId, new Set());
      }
      traineeRoomsMap.get(assignment.traineeId)!.add(assignment.roomId);
    }

    // 5. جلب جميع المحاضرات الموجودة مع سجلات الحضور
    const existingSessions = await this.prisma.scheduledSession.findMany({
      where: {
        scheduleSlot: { classroomId },
        isCancelled: false,
      },
      include: {
        scheduleSlot: { select: { id: true, contentId: true, dayOfWeek: true, distributionRoomId: true } },
        attendance: {
          select: { id: true, traineeId: true, status: true },
        },
      },
    });

    // 6. بناء خريطة المحاضرات الموجودة حسب التاريخ
    const sessionsByDate = new Map<string, typeof existingSessions>();
    for (const session of existingSessions) {
      const dateKey = new Date(session.date).toISOString().split('T')[0];
      if (!sessionsByDate.has(dateKey)) {
        sessionsByDate.set(dateKey, []);
      }
      sessionsByDate.get(dateKey)!.push(session);
    }

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSessionsCreated = 0;
    let totalDaysProcessed = 0;
    const errors: string[] = [];
    const traineeNamesCache = new Map<number, string>();
    const details: Array<{
      date: string;
      traineeName: string;
      traineeId: number;
      sourceContent: string;
      targetContent: string;
      status: string;
      action: string;
    }> = [];

    const getTraineeName = async (traineeId: number): Promise<string> => {
      if (traineeNamesCache.has(traineeId)) return traineeNamesCache.get(traineeId)!;
      try {
        const trainee = await this.prisma.trainee.findUnique({
          where: { id: traineeId },
          select: { nameAr: true },
        });
        const name = trainee?.nameAr || `متدرب #${traineeId}`;
        traineeNamesCache.set(traineeId, name);
        return name;
      } catch {
        const name = `متدرب #${traineeId}`;
        traineeNamesCache.set(traineeId, name);
        return name;
      }
    };

    // دالة: هل هذه الحصة مناسبة لهذا المتدرب؟
    const isSlotForTrainee = (slot: typeof scheduleSlots[0], traineeId: number): boolean => {
      // إذا الحصة بدون مجموعة → عامة لكل الطلاب
      if (!slot.distributionRoomId) return true;
      // إذا الحصة مرتبطة بمجموعة → تحقق أن الطالب في هذه المجموعة
      const traineeRooms = traineeRoomsMap.get(traineeId);
      if (!traineeRooms) return false;
      return traineeRooms.has(slot.distributionRoomId);
    };

    const dayOfWeekMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // 7. لكل تاريخ فيه محاضرات:
    for (const [dateKey, dateSessions] of sessionsByDate) {
      // جمع المتدربين الذين لديهم حضور (غير غائب) في هذا اليوم
      const traineeAttendanceMap = new Map<number, { status: string; sourceContentId: number }>();

      for (const sess of dateSessions) {
        for (const att of sess.attendance) {
          if (!traineeAttendanceMap.has(att.traineeId)) {
            traineeAttendanceMap.set(att.traineeId, {
              status: att.status,
              sourceContentId: sess.scheduleSlot.contentId,
            });
          } else {
            const existing = traineeAttendanceMap.get(att.traineeId)!;
            if (existing.status === 'ABSENT' && att.status !== 'ABSENT') {
              traineeAttendanceMap.set(att.traineeId, {
                status: att.status,
                sourceContentId: sess.scheduleSlot.contentId,
              });
            }
          }
        }
      }

      const presentTrainees = [...traineeAttendanceMap.entries()].filter(
        ([, val]) => val.status !== 'ABSENT'
      );
      if (presentTrainees.length === 0) continue;

      // تحديد يوم الأسبوع
      const dateObj = new Date(dateKey);
      const jsDayOfWeek = dateObj.getUTCDay();
      const dayOfWeek = dayOfWeekMap[jsDayOfWeek];

      const slotsForThisDay = slotsByDayOfWeek.get(dayOfWeek) || [];
      if (slotsForThisDay.length <= 1) continue;

      totalDaysProcessed++;

      // بناء خريطة المحاضرات: slotId → session info
      const sessionsForDayBySlotId = new Map<number, { sessionId: number; slotId: number; contentId: number; distributionRoomId: string | null; attendance: Array<{ traineeId: number; status: string }> }>();

      for (const sess of dateSessions) {
        sessionsForDayBySlotId.set(sess.scheduleSlot.id, {
          sessionId: sess.id,
          slotId: sess.scheduleSlot.id,
          contentId: sess.scheduleSlot.contentId,
          distributionRoomId: sess.scheduleSlot.distributionRoomId,
          attendance: sess.attendance.map(a => ({ traineeId: a.traineeId, status: a.status })),
        });
      }

      // إنشاء المحاضرات المفقودة (لكل slot وليس لكل content)
      for (const slot of slotsForThisDay) {
        if (sessionsForDayBySlotId.has(slot.id)) continue;

        try {
          const newSession = await this.prisma.scheduledSession.upsert({
            where: {
              scheduleSlotId_date: {
                scheduleSlotId: slot.id,
                date: dateObj,
              },
            },
            update: {},
            create: {
              scheduleSlotId: slot.id,
              date: dateObj,
              isCancelled: false,
            },
          });

          sessionsForDayBySlotId.set(slot.id, {
            sessionId: newSession.id,
            slotId: slot.id,
            contentId: slot.contentId,
            distributionRoomId: slot.distributionRoomId,
            attendance: [],
          });
          totalSessionsCreated++;
        } catch (err: any) {
          errors.push(`خطأ في إنشاء محاضرة للمادة ${slot.content.name} بتاريخ ${dateKey}: ${err.message}`);
        }
      }

      // لكل متدرب حاضر: نسخ حضوره لباقي الحصص المناسبة فقط
      for (const [traineeId, { status, sourceContentId }] of presentTrainees) {
        // ✅ حماية: لكل مادة نعالج حصة واحدة فقط لتجنب النشر لمجموعتين من نفس المادة
        const processedContentIds = new Set<number>();
        
        // جلب الحصص المناسبة لهذا المتدرب فقط
        for (const slot of slotsForThisDay) {
          if (slot.contentId === sourceContentId) continue; // تخطي المادة المصدر
          if (!isSlotForTrainee(slot, traineeId)) continue; // تخطي حصص ليست لمجموعته
          if (processedContentIds.has(slot.contentId)) continue; // ✅ تخطي مادة عولجت بالفعل
          processedContentIds.add(slot.contentId);

          const sessInfo = sessionsForDayBySlotId.get(slot.id);
          if (!sessInfo) continue;

          const existingRecord = sessInfo.attendance.find(a => a.traineeId === traineeId);
          if (existingRecord && existingRecord.status !== 'ABSENT') continue;

          try {
            if (existingRecord && existingRecord.status === 'ABSENT') {
              await this.prisma.attendance.updateMany({
                where: { sessionId: sessInfo.sessionId, traineeId },
                data: {
                  status: status as any,
                  notes: 'تم التوحيد تلقائياً - تحديث غياب سابق',
                  updatedBy: userId,
                },
              });
              totalUpdated++;
              details.push({
                date: dateKey,
                traineeId,
                traineeName: await getTraineeName(traineeId),
                sourceContent: contents.find(c => c.id === sourceContentId)?.name || `مادة #${sourceContentId}`,
                targetContent: contents.find(c => c.id === slot.contentId)?.name || `مادة #${slot.contentId}`,
                status,
                action: 'تحديث',
              });
            } else {
              await this.prisma.attendance.create({
                data: {
                  sessionId: sessInfo.sessionId,
                  traineeId,
                  status: status as any,
                  notes: 'تم التوحيد تلقائياً من أداة توحيد الحضور',
                  recordedBy: userId,
                },
              });
              totalCreated++;
              details.push({
                date: dateKey,
                traineeId,
                traineeName: await getTraineeName(traineeId),
                sourceContent: contents.find(c => c.id === sourceContentId)?.name || `مادة #${sourceContentId}`,
                targetContent: contents.find(c => c.id === slot.contentId)?.name || `مادة #${slot.contentId}`,
                status,
                action: 'إنشاء',
              });
            }
          } catch (err: any) {
            if (!err.message?.includes('Unique constraint')) {
              errors.push(`خطأ للمتدرب ${traineeId} في مادة ${slot.contentId}: ${err.message}`);
            }
          }
        }
      }
    }

    return {
      classroomId,
      totalDaysProcessed,
      totalCreated,
      totalUpdated,
      totalSessionsCreated,
      totalErrors: errors.length,
      contentsCount: contents.length,
      details: details.slice(0, 500),
      errors: errors.slice(0, 20),
    };
  }

  // ================== نظام أكواد تسجيل الحضور ==================

  /**
   * إنشاء كود حضور من 6 أرقام لمحاضرة معينة
   */
  async generateAttendanceCode(sessionId: number, userId: string, expiresInMinutes?: number) {
    // التحقق من وجود المحاضرة
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
      include: {
        scheduleSlot: {
          include: {
            content: { select: { name: true, code: true } },
            classroom: { include: { program: { select: { nameAr: true } } } },
          },
        },
        attendanceCode: true,
      },
    });

    if (!session) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    if (session.isCancelled) {
      throw new BadRequestException('لا يمكن إنشاء كود لمحاضرة ملغاة');
    }

    // إذا كان هناك كود نشط بالفعل، نعيده
    if (session.attendanceCode && session.attendanceCode.isActive) {
      // التحقق مما إذا انتهت صلاحية الكود
      if (session.attendanceCode.expiresAt && new Date() > session.attendanceCode.expiresAt) {
        // تعطيل الكود المنتهي
        await this.prisma.attendanceCode.update({
          where: { id: session.attendanceCode.id },
          data: { isActive: false },
        });
      } else {
        return {
          code: session.attendanceCode.code,
          sessionId,
          isNew: false,
          expiresAt: session.attendanceCode.expiresAt,
          session: {
            date: session.date,
            content: session.scheduleSlot.content.name,
            contentCode: session.scheduleSlot.content.code,
            program: session.scheduleSlot.classroom.program.nameAr,
          },
        };
      }
    }

    // توليد كود عشوائي من 6 أرقام
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // تحديد وقت انتهاء الصلاحية
    let expiresAt: Date | null = null;
    if (expiresInMinutes) {
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    }

    // حذف الكود القديم إن وجد ثم إنشاء كود جديد
    if (session.attendanceCode) {
      await this.prisma.attendanceCode.delete({
        where: { id: session.attendanceCode.id },
      });
    }

    await this.prisma.attendanceCode.create({
      data: {
        sessionId,
        code,
        isActive: true,
        expiresAt,
        createdBy: userId,
      },
    });

    return {
      code,
      sessionId,
      isNew: true,
      expiresAt,
      session: {
        date: session.date,
        content: session.scheduleSlot.content.name,
        contentCode: session.scheduleSlot.content.code,
        program: session.scheduleSlot.classroom.program.nameAr,
      },
    };
  }

  /**
   * الحصول على الكود النشط لمحاضرة
   */
  async getAttendanceCode(sessionId: number) {
    const code = await this.prisma.attendanceCode.findUnique({
      where: { sessionId },
      include: {
        session: {
          include: {
            scheduleSlot: {
              include: {
                content: { select: { name: true, code: true } },
                classroom: { include: { program: { select: { nameAr: true } } } },
              },
            },
          },
        },
      },
    });

    if (!code || !code.isActive) {
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (code.expiresAt && new Date() > code.expiresAt) {
      await this.prisma.attendanceCode.update({
        where: { id: code.id },
        data: { isActive: false },
      });
      return null;
    }

    return code;
  }

  /**
   * تعطيل كود حضور
   */
  async deactivateAttendanceCode(sessionId: number) {
    const code = await this.prisma.attendanceCode.findUnique({
      where: { sessionId },
    });

    if (!code) {
      throw new NotFoundException('لا يوجد كود لهذه المحاضرة');
    }

    await this.prisma.attendanceCode.update({
      where: { id: code.id },
      data: { isActive: false },
    });

    return { success: true, message: 'تم تعطيل الكود بنجاح' };
  }

  /**
   * تحقق المتدرب من الكود وتسجيل حضوره
   */
  async verifyAttendanceCode(code: string, traineeId: number) {
    // البحث عن الكود
    const attendanceCode = await this.prisma.attendanceCode.findFirst({
      where: {
        code,
        isActive: true,
      },
      include: {
        session: {
          include: {
            scheduleSlot: {
              include: {
                content: {
                  include: {
                    classroom: { include: { program: true } },
                  },
                },
                distributionRoom: {
                  include: {
                    assignments: { select: { traineeId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attendanceCode) {
      throw new BadRequestException('الكود غير صحيح أو منتهي الصلاحية');
    }

    // التحقق من انتهاء الصلاحية
    if (attendanceCode.expiresAt && new Date() > attendanceCode.expiresAt) {
      await this.prisma.attendanceCode.update({
        where: { id: attendanceCode.id },
        data: { isActive: false },
      });
      throw new BadRequestException('انتهت صلاحية هذا الكود');
    }

    const session = attendanceCode.session;
    const slot = session.scheduleSlot;

    // التحقق من أن تاريخ المحاضرة هو اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      throw new BadRequestException('هذا الكود خاص بمحاضرة ليست اليوم');
    }

    if (session.isCancelled) {
      throw new BadRequestException('هذه المحاضرة ملغاة');
    }

    // التحقق من أن المتدرب مدرج في توزيعة هذا الميعاد
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true, programId: true },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من أن المتدرب في نفس البرنامج
    if (trainee.programId !== slot.content.programId) {
      throw new BadRequestException('أنت غير مسجل في هذا البرنامج التدريبي');
    }

    // التحقق من التوزيعة إذا كانت موجودة
    if (slot.distributionRoom) {
      const isInRoom = slot.distributionRoom.assignments.some(a => a.traineeId === traineeId);
      if (!isInRoom) {
        throw new BadRequestException('أنت غير مدرج في قاعة هذه المحاضرة');
      }
    }

    // التحقق من عدم تسجيل الحضور مسبقاً
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        sessionId_traineeId: {
          sessionId: session.id,
          traineeId,
        },
      },
    });

    if (existingAttendance && existingAttendance.status === 'PRESENT') {
      return {
        success: true,
        alreadyRecorded: true,
        message: 'تم تسجيل حضورك مسبقاً لهذه المحاضرة',
        session: {
          content: slot.content.name,
          date: session.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      };
    }

    // تسجيل الحضور
    await this.prisma.attendance.upsert({
      where: {
        sessionId_traineeId: {
          sessionId: session.id,
          traineeId,
        },
      },
      create: {
        sessionId: session.id,
        traineeId,
        status: 'PRESENT',
        recordedBy: attendanceCode.createdBy,
        recordedAt: new Date(),
        notes: 'تسجيل حضور عبر الكود',
      },
      update: {
        status: 'PRESENT',
        updatedBy: attendanceCode.createdBy,
        notes: 'تسجيل حضور عبر الكود',
      },
    });

    return {
      success: true,
      alreadyRecorded: false,
      message: `تم تسجيل حضورك بنجاح في مادة ${slot.content.name}`,
      session: {
        content: slot.content.name,
        date: session.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    };
  }
}
