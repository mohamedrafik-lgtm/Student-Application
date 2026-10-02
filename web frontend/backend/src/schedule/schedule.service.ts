import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { CancelSessionDto } from './dto/update-session-status.dto';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // إنشاء فترة في الجدول
  async createSlot(createSlotDto: CreateScheduleSlotDto) {
    // التحقق من عدم تعارض الأوقات
    await this.checkTimeConflict(
      createSlotDto.classroomId,
      createSlotDto.dayOfWeek,
      createSlotDto.startTime,
      createSlotDto.endTime,
      createSlotDto.distributionRoomId,
    );

    const slot = await this.prisma.scheduleSlot.create({
      data: createSlotDto,
      include: {
        content: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // توليد الجلسات الفعلية بناءً على تاريخ الفصل
    await this.generateSessionsForSlot(slot.id);

    return slot;
  }

  // التحقق من تعارض الأوقات
  private async checkTimeConflict(
    classroomId: number,
    dayOfWeek: any,
    startTime: string,
    endTime: string,
    distributionRoomId?: string | null,
    excludeSlotId?: number,
  ) {
    // إذا كانت الفترة مرتبطة بمجموعة، التحقق من التعارض فقط مع نفس المجموعة
    // إذا لم تكن مرتبطة بمجموعة (عامة)، التحقق من التعارض مع كل الفترات العامة فقط
    const conflictingSlots = await this.prisma.scheduleSlot.findMany({
      where: {
        classroomId,
        dayOfWeek,
        // إذا كان distributionRoomId موجود، تحقق فقط من نفس المجموعة
        // إذا كان null، تحقق فقط من الفترات العامة (null)
        distributionRoomId: distributionRoomId || null,
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
        OR: [
          // الوقت الجديد يبدأ خلال فترة موجودة
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          // الوقت الجديد ينتهي خلال فترة موجودة
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          // الوقت الجديد يحتوي على فترة موجودة
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingSlots.length > 0) {
      throw new BadRequestException('يوجد تعارض في الأوقات مع فترة أخرى في نفس اليوم لنفس المجموعة');
    }
  }

  // توليد الجلسات الفعلية للفترة
  async generateSessionsForSlot(slotId: number) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: {
        classroom: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException(`Slot ${slotId} not found`);
    }

    if (!slot.classroom.startDate || !slot.classroom.endDate) {
      throw new BadRequestException('يجب تحديد تاريخ بداية ونهاية الفصل الدراسي');
    }

    const dayOfWeekMap: any = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const targetDay = dayOfWeekMap[slot.dayOfWeek];
    const startDate = new Date(slot.classroom.startDate);
    const endDate = new Date(slot.classroom.endDate);

    // إيجاد أول يوم مطابق
    let currentDate = new Date(startDate);
    while (currentDate.getDay() !== targetDay && currentDate <= endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // إنشاء جلسة لكل أسبوع
    const sessions = [];
    while (currentDate <= endDate) {
      sessions.push({
        scheduleSlotId: slotId,
        date: new Date(currentDate),
        isCancelled: false,
      });
      currentDate.setDate(currentDate.getDate() + 7); // أسبوع تالي
    }

    // إنشاء الجلسات بشكل جماعي
    await this.prisma.scheduledSession.createMany({
      data: sessions,
      skipDuplicates: true,
    });

    return sessions.length;
  }

  // الحصول على جميع الفترات لفصل معين
  async findAllByClassroom(classroomId: number) {
    return this.prisma.scheduleSlot.findMany({
      where: { classroomId },
      include: {
        content: {
          select: {
            id: true,
            code: true,
            name: true,
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        distributionRoom: {
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  // الحصول على فترة واحدة
  async findOne(id: number) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            code: true,
            name: true,
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        sessions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException(`Schedule slot ${id} not found`);
    }

    return slot;
  }

  // تحديث فترة
  async update(id: number, updateSlotDto: UpdateScheduleSlotDto) {
    const slot = await this.findOne(id);

    // التحقق من تعارض الأوقات إذا تم تغيير الوقت
    if (updateSlotDto.startTime || updateSlotDto.endTime || updateSlotDto.dayOfWeek || updateSlotDto.distributionRoomId !== undefined) {
      await this.checkTimeConflict(
        updateSlotDto.classroomId || slot.classroom.id,
        updateSlotDto.dayOfWeek || slot.dayOfWeek,
        updateSlotDto.startTime || slot.startTime,
        updateSlotDto.endTime || slot.endTime,
        updateSlotDto.distributionRoomId !== undefined ? updateSlotDto.distributionRoomId : (slot as any).distributionRoomId,
        id,
      );
    }

    return this.prisma.scheduleSlot.update({
      where: { id },
      data: updateSlotDto,
      include: {
        content: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // حذف فترة
  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.scheduleSlot.delete({
      where: { id },
    });

    return { message: 'تم حذف الفترة بنجاح' };
  }

  // الحصول على جميع الجلسات لفترة معينة
  async findSessionsBySlot(slotId: number) {
    await this.findOne(slotId);

    return this.prisma.scheduledSession.findMany({
      where: { scheduleSlotId: slotId },
      include: {
        scheduleSlot: {
          include: {
            distributionRoom: {
              select: {
                id: true,
                roomName: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendance: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // إلغاء/تفعيل محاضرة
  async cancelSession(sessionId: number, cancelDto: CancelSessionDto) {
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`المحاضرة ${sessionId} غير موجودة`);
    }

    return this.prisma.scheduledSession.update({
      where: { id: sessionId },
      data: {
        isCancelled: cancelDto.isCancelled,
        cancellationReason: cancelDto.cancellationReason,
      },
    });
  }

  // الحصول على الجدول الأسبوعي لفصل معين
  async getWeeklySchedule(classroomId: number) {
    const slots = await this.findAllByClassroom(classroomId);

    // تنظيم البيانات حسب اليوم
    const schedule: any = {
      SUNDAY: [],
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
    };

    slots.forEach((slot) => {
      schedule[slot.dayOfWeek].push(slot);
    });

    return schedule;
  }

  // الحصول على المجموعات المتاحة لمادة ونوع معين
  async getDistributionRooms(contentId: number, type: 'THEORY' | 'PRACTICAL', classroomId?: number) {
    // الحصول على المادة التدريبية مع البرنامج والفصل
    const content = await this.prisma.trainingContent.findUnique({
      where: { id: contentId },
      select: { 
        id: true,
        programId: true,
        classroomId: true,
      },
    });

    if (!content) {
      throw new NotFoundException('المادة غير موجودة');
    }

    const targetClassroomId = classroomId || content.classroomId;

    // محاولة 1: البحث عن توزيعة خاصة بالفصل الدراسي
    let distribution = await this.prisma.traineeDistribution.findFirst({
      where: {
        programId: content.programId,
        type: type === 'THEORY' ? 'THEORY' : 'PRACTICAL',
        classroomId: targetClassroomId,
      },
      include: {
        rooms: {
          include: {
            _count: {
              select: {
                assignments: true,
              },
            },
          },
          orderBy: {
            roomNumber: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // محاولة 2: إذا لم توجد توزيعة للفصل، نستخدم التوزيعة العامة
    if (!distribution) {
      distribution = await this.prisma.traineeDistribution.findFirst({
        where: {
          programId: content.programId,
          type: type === 'THEORY' ? 'THEORY' : 'PRACTICAL',
          classroomId: null,
        },
        include: {
          rooms: {
            include: {
              _count: {
                select: {
                  assignments: true,
                },
              },
            },
            orderBy: {
              roomNumber: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!distribution) {
      return [];
    }

    return distribution.rooms;
  }
}

