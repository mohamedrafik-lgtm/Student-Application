import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { TraineePaymentStatusService } from '../trainee-platform/trainee-payment-status.service';
import { AttendanceStatus } from './dto/record-attendance.dto';
import { getSessionAttendanceDeadline } from './attendance-window';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
    private paymentStatusService: TraineePaymentStatusService
  ) {}

  private assertAttendanceWindow(session: { date: Date; scheduleSlot: { endTime: string } }) {
    const deadline = getSessionAttendanceDeadline(session.date, session.scheduleSlot.endTime);
    if (!deadline) {
      throw new BadRequestException('وقت نهاية المحاضرة غير صالح؛ تعذر التحقق من مهلة تسجيل الحضور');
    }

    if (Date.now() > deadline.getTime()) {
      throw new BadRequestException('انتهت مهلة تسجيل الحضور؛ يسمح بالتسجيل خلال 24 ساعة من نهاية المحاضرة فقط');
    }
  }

  // ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ù…ØªØ¯Ø±Ø¨ ÙˆØ§Ø­Ø¯
  async recordAttendance(dto: RecordAttendanceDto, userId: string) {
    // record/bulk Ù„Ù„Ø£ÙŠØ¯ÙˆÙŠ ÙÙ‚Ø·
    const userPermissions = await this.permissionsService.getUserPermissions(userId);
    const canManual = userPermissions.hasPermission('dashboard.attendance', 'record_manual');
    if (!canManual) {
      throw new ForbiddenException('Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ÙŠØ¯ÙˆÙŠ Ù„Ù„Ø­Ø¶ÙˆØ± - Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ù‡Ù†Ø§ Ø¹Ø¨Ø± QR ÙÙ‚Ø·');
    }
    return this.recordAttendanceInternal(dto.sessionId, dto.traineeId, dto.status, dto.notes, userId);
  }

  // Ù…Ù†Ø·Ù‚ Ù…Ù†Ø¹ ØªÙˆØ­ÙŠØ¯ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ â€” ÙŠØ³ØªØ®Ø¯Ù…Ù‡ Ø§Ù„ÙŠØ¯ÙˆÙŠ (record/bulk) ÙˆÙ…Ø³Ø­ QR (scan)
  // Ø§Ù„Ù…Ù†Ø¹ ÙŠØªØ·Ù„Ø¨ record_manual Ù„Ø£Ù† /record Ùˆ/bulk Ù…Ø­Ø¬ÙˆØ¨Ø© Ù„ØºÙŠØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ› scan ØªØªØ¬Ø§ÙˆØ²Ù‡Ø§ Ø¨Ù€ record ÙÙ‚Ø·
  async recordAttendanceInternal(
    sessionId: number,
    traineeId: number,
    status: AttendanceStatus,
    notes: string | undefined,
    userId: string,
  ) {
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
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
      throw new NotFoundException('Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
    }

    if (session.isCancelled) {
      throw new BadRequestException('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ù„ØºØ§Ø©');
    }

    // يسمح بالتصحيح خلال 24 ساعة من نهاية المحاضرة، حتى بعد إغلاقها.
    // المهلة حد ثابت ولا تتجاوز صلاحية تسجيل الأيام السابقة.
    this.assertAttendanceWindow(session);

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø§Ù„Ù…ØªØ¯Ø±Ø¨
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    }

    // âœ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ÙŠÙ†ØªÙ…ÙŠ Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø© (Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø©)
    if (session.scheduleSlot.distributionRoom) {
      const roomTraineeIds = session.scheduleSlot.distributionRoom.assignments.map(a => a.traineeId);
      if (!roomTraineeIds.includes(traineeId)) {
        throw new BadRequestException(
          `Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ${trainee.nameAr} ØºÙŠØ± Ù…Ø¯Ø±Ø¬ ÙÙŠ Ù…Ø¬Ù…ÙˆØ¹Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©. Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±.`
        );
      }
    }

    // ðŸ”´ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹ - Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø­Ø¶ÙˆØ± Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…ØªØ£Ø®Ø±
    console.log(`ðŸ” [Attendance] Ø¨Ø¯Ø¡ ÙØ­Øµ Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹ Ù„Ù„Ù…ØªØ¯Ø±Ø¨ ${traineeId} (${trainee.nameAr})`);
    
    try {
      const paymentStatus = await this.paymentStatusService.checkTraineePaymentStatus(traineeId);
      
      console.log(`ðŸ“Š [Attendance] Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹:`, {
        status: paymentStatus.status,
        canAccessAttendance: paymentStatus.canAccessAttendance,
        overduePayments: paymentStatus.overduePayments?.length || 0,
        blockedFeatures: paymentStatus.blockedFeatures || []
      });
      
      // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø­Ø¶ÙˆØ± Ù…Ø­Ø¬ÙˆØ¨ - Ù…Ù†Ø¹ ÙÙ‚Ø· Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± (PRESENT/LATE/EXCUSED)
      // Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØºÙŠØ§Ø¨ (ABSENT) Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠ
      if (!paymentStatus.canAccessAttendance && status !== 'ABSENT') {
        const overdueFeesNames = paymentStatus.overduePayments?.map(p => p.feeName).join('ØŒ ') || 'Ø§Ù„Ø±Ø³ÙˆÙ…';
        console.log(`ðŸš« [Attendance] Ù…Ù†Ø¹ ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± ${status} - Ø±Ø³ÙˆÙ… Ù…ØªØ£Ø®Ø±Ø©: ${overdueFeesNames}`);
        
        throw new BadRequestException(
          `Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ù‡Ø°Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ Ø¨Ø³Ø¨Ø¨ ØªØ£Ø®Ø± ÙÙŠ Ø³Ø¯Ø§Ø¯: ${overdueFeesNames}. ` +
          `ÙŠØ¬Ø¨ Ø§Ù„Ø³Ø¯Ø§Ø¯ Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªÙ…ÙƒÙŠÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±.`
        );
      } else if (!paymentStatus.canAccessAttendance && status === 'ABSENT') {
        console.log(`âœ… [Attendance] Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨ØªØ³Ø¬ÙŠÙ„ ØºÙŠØ§Ø¨ Ù„Ù„Ù…ØªØ¯Ø±Ø¨ ${trainee.nameAr} Ø±ØºÙ… Ø§Ù„ØªØ£Ø®Ø± ÙÙŠ Ø§Ù„Ø³Ø¯Ø§Ø¯`);
      }
      
      // ØªØ­Ø°ÙŠØ± ÙÙŠ Ø§Ù„ÙƒÙˆÙ†Ø³ÙˆÙ„ Ø¥Ø°Ø§ ÙƒØ§Ù† Ù‡Ù†Ø§Ùƒ Ø±Ø³ÙˆÙ… Ù…Ø³ØªØ­Ù‚Ø© Ù‚Ø±ÙŠØ¨Ø§Ù‹ (Ù„ÙƒÙ† Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„ØªØ³Ø¬ÙŠÙ„)
      if (paymentStatus.status === 'PAYMENT_DUE' && paymentStatus.upcomingPayments?.length > 0) {
        console.log(`âš ï¸  [Attendance] Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ${trainee.nameAr} Ù„Ø¯ÙŠÙ‡ Ø±Ø³ÙˆÙ… Ù…Ø³ØªØ­Ù‚Ø© Ù‚Ø±ÙŠØ¨Ø§Ù‹ - Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„ØªØ³Ø¬ÙŠÙ„`);
      }
      
      console.log(`âœ… [Attendance] Ø³ÙÙ…Ø­ Ø¨ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù„Ù…ØªØ¯Ø±Ø¨ ${trainee.nameAr}`);
      
    } catch (error) {
      console.error(`âŒ [Attendance] Ø®Ø·Ø£ ÙÙŠ ÙØ­Øµ Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹:`, error);
      
      // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø®Ø·Ø£ BadRequestException (Ø£ÙŠ Ø­Ø¬Ø¨ Ø§Ù„Ø­Ø¶ÙˆØ±)ØŒ Ø±Ù…ÙŠÙ‡ Ù„Ù„Ø£Ø¹Ù„Ù‰
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Ø®Ø·Ø£ Ø¢Ø®Ø± (Ù…Ø«Ù„ ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„) - Ù†Ø³Ù…Ø­ Ø¨Ø§Ù„ØªØ³Ø¬ÙŠÙ„ (fail-safe)
      console.warn('âš ï¸  [Attendance] ÙØ´Ù„ ÙØ­Øµ Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹ØŒ Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„ØªØ³Ø¬ÙŠÙ„:', error.message);
    }

    // ØªØ³Ø¬ÙŠÙ„ Ø£Ùˆ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø¶ÙˆØ±
    const attendance = await this.prisma.attendance.upsert({
      where: {
        sessionId_traineeId: {
          sessionId: sessionId,
          traineeId: traineeId,
        },
      },
      create: {
        sessionId: sessionId,
        traineeId: traineeId,
        status: status,
        notes: notes,
        recordedBy: userId,
        recordedAt: new Date(),
      },
      update: {
        status: status,
        notes: notes,
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

    // ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ±
    await this.updateAttendanceGrade(
      traineeId,
      session.scheduleSlot.contentId,
      session.scheduleSlot.classroomId,
    );

    // ===== Ù†Ø´Ø± Ø§Ù„Ø­Ø¶ÙˆØ± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù„Ø¨Ø§Ù‚ÙŠ Ø§Ù„Ù…ÙˆØ§Ø¯ ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙŠÙˆÙ… =====
    // ÙÙ‚Ø· Ø¹Ù†Ø¯ ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± ÙØ¹Ù„ÙŠ (PRESENT / LATE / EXCUSED) ÙˆÙ„ÙŠØ³ ØºÙŠØ§Ø¨
    if (status === 'PRESENT' || status === 'LATE') {
      try {
        const classroomId = session.scheduleSlot.classroomId;
        const sourceContentId = session.scheduleSlot.contentId;
        const sourceScheduleSlotId = session.scheduleSlot.id;
        const propagatedStatus = 'PRESENT' as const;
        const sourceDistributionRoomId = session.scheduleSlot.distributionRoomId;
        const sessionDate = session.date;
        const dayOfWeek = (session.scheduleSlot as any).dayOfWeek;
        
        console.log(`ðŸ” [Auto-Spread] === Ø¨Ø¯Ø¡ Ø§Ù„Ù†Ø´Ø± Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ ===`);
        console.log(`ðŸ” [Auto-Spread] traineeId=${traineeId}, status=${status}`);
        console.log(`ðŸ” [Auto-Spread] classroomId=${classroomId}, sourceContentId=${sourceContentId}, sourceDistRoomId=${sourceDistributionRoomId}`);
        console.log(`ðŸ” [Auto-Spread] dayOfWeek=${dayOfWeek}, sessionDate=${sessionDate}`);

        if (!dayOfWeek) {
          console.error('âŒ [Auto-Spread] dayOfWeek ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯! ØªØ®Ø·ÙŠ Ø§Ù„Ù†Ø´Ø±');
        } else {
          // 1. Ù…Ø¹Ø±ÙØ© Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„
          const traineeAssignments = await this.prisma.distributionAssignment.findMany({
            where: {
              traineeId: traineeId,
              room: {
                distribution: {
                  programId: session.scheduleSlot.classroom.programId,
                  OR: [{ classroomId }, { classroomId: null }],
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
          console.log(`ðŸ” [Auto-Spread] Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨:`, traineeAssignments.map(a => `${a.room.roomName} (${a.roomId}, type=${a.room.distribution.type})`));

          // 2. Ø¬Ù„Ø¨ Ø­ØµØµ Ù†ÙØ³ Ø§Ù„ÙŠÙˆÙ… ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙØµÙ„ (Ù…Ø§ Ø¹Ø¯Ø§ Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©)
          const otherSlots = await this.prisma.scheduleSlot.findMany({
            where: {
              classroomId,
              dayOfWeek,
            },
            include: {
              content: { select: { id: true, name: true } },
            },
          });
          
          console.log(`ðŸ” [Auto-Spread] ÙƒÙ„ Ø§Ù„Ø­ØµØµ Ø§Ù„Ø£Ø®Ø±Ù‰ ÙÙŠ ÙŠÙˆÙ… ${dayOfWeek}: ${otherSlots.length}`, otherSlots.map(s => `${s.content.name} (distRoom=${s.distributionRoomId})`));

          // 3. ØªØµÙÙŠØ©: ÙÙ‚Ø· Ø§Ù„Ø­ØµØµ Ø§Ù„ØªÙŠ ØªÙ†ØªÙ…ÙŠ Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ Ø£Ùˆ Ø¨Ø¯ÙˆÙ† Ù…Ø¬Ù…ÙˆØ¹Ø©
          const filteredSlots = otherSlots.filter(slot => {
            if (slot.id === sourceScheduleSlotId) return false;
            // Ø¥Ø°Ø§ Ø§Ù„Ø­ØµØ© Ù„ÙŠØ³Øª Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø© (Ø¹Ø§Ù…Ø© Ù„ÙƒÙ„ Ø§Ù„Ø·Ù„Ø§Ø¨)
            if (!slot.distributionRoomId) return true;
            // Ø¥Ø°Ø§ Ø§Ù„Ø­ØµØ© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ø·Ø§Ù„Ø¨
            if (traineeRoomIds.includes(slot.distributionRoomId)) return true;
            return false;
          });

          // âœ… Ø­Ù…Ø§ÙŠØ© Ø¥Ø¶Ø§ÙÙŠØ©: Ù„ÙƒÙ„ Ù…Ø§Ø¯Ø© Ù†Ø£Ø®Ø° Ø­ØµØ© ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø· (Ù„ØªØ¬Ù†Ø¨ Ø§Ù„Ù†Ø´Ø± Ù„Ù…Ø¬Ù…ÙˆØ¹ØªÙŠÙ† Ù…Ù† Ù†ÙØ³ Ø§Ù„Ù…Ø§Ø¯Ø©)
          const seenSlotIds = new Set<number>();
          const deduplicatedSlots = filteredSlots.filter(slot => {
            if (seenSlotIds.has(slot.id)) {
              console.log(`âš ï¸ [Auto-Spread] ØªØ®Ø·ÙŠ Ø­ØµØ© Ù…ÙƒØ±Ø±Ø© Ù„Ù„Ù…Ø§Ø¯Ø© ${slot.content.name} (slotId=${slot.id}, distRoom=${slot.distributionRoomId})`);
              return false;
            }
            seenSlotIds.add(slot.id);
            return true;
          });

          console.log(`ðŸ” [Auto-Spread] Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…ÙÙ„ØªØ±Ø© (Ø®Ø§ØµØ© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ø·Ø§Ù„Ø¨): ${deduplicatedSlots.length}`, deduplicatedSlots.map(s => `${s.content.name} (distRoom=${s.distributionRoomId})`));

          if (deduplicatedSlots.length > 0) {
            console.log(`ðŸ”„ [Auto-Spread] Ù†Ø´Ø± Ø­Ø¶ÙˆØ± ${traineeId} (${status}) Ø¥Ù„Ù‰ ${deduplicatedSlots.length} Ø­ØµØ©`);

            for (const slot of deduplicatedSlots) {
              try {
                // Ø¥Ù†Ø´Ø§Ø¡ Ø£Ùˆ Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© (ScheduledSession) Ù„Ù‡Ø°Ø§ Ø§Ù„ØªØ§Ø±ÙŠØ®
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

                // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø³Ø¬Ù„ Ø­Ø¶ÙˆØ± Ù…Ø³Ø¨Ù‚
                const existingAttendance = await this.prisma.attendance.findUnique({
                  where: {
                    sessionId_traineeId: {
                      sessionId: targetSession.id,
                      traineeId: traineeId,
                    },
                  },
                });

                if (targetSession.isCancelled) continue;

                // Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…Ø³Ø¬Ù„ Ø¨Ø­Ø§Ù„Ø© ØºÙŠØ± ØºØ§Ø¦Ø¨ â†’ Ù„Ø§ Ù†Ø¹Ø¯Ù„
                if (existingAttendance && existingAttendance.status !== 'ABSENT') {
                  console.log(`â­ï¸ [Auto-Spread] ØªØ®Ø·ÙŠ ${slot.content.name} - Ù…Ø³Ø¬Ù„ (${existingAttendance.status})`);
                  continue;
                }

                if (existingAttendance && existingAttendance.status === 'ABSENT') {
                  const updated = await this.prisma.attendance.updateMany({
                    where: { id: existingAttendance.id, status: 'ABSENT' },
                    data: {
                      status: propagatedStatus,
                      notes: 'ØªÙ… Ø§Ù„Ù†Ø´Ø± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ - ØªØ­Ø¯ÙŠØ« Ù…Ù† ØºÙŠØ§Ø¨',
                      updatedBy: userId,
                    },
                  });
                  if (updated.count === 0) continue;
                  console.log(`âœ… [Auto-Spread] ØªØ­Ø¯ÙŠØ« ØºÙŠØ§Ø¨ â†’ ${status} ÙÙŠ ${slot.content.name}`);
                } else {
                  await this.prisma.attendance.create({
                    data: {
                      sessionId: targetSession.id,
                      traineeId: traineeId,
                      status: propagatedStatus,
                      notes: 'ØªÙ… Ø§Ù„Ù†Ø´Ø± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù…Ù† Ù…Ø§Ø¯Ø© Ø£Ø®Ø±Ù‰',
                      recordedBy: userId,
                    },
                  });
                  console.log(`âœ… [Auto-Spread] Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø¶ÙˆØ± ${status} ÙÙŠ ${slot.content.name}`);
                }
              // ØªØ­Ø¯ÙŠØ« Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ© ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹
              await this.updateAttendanceGrade(traineeId, slot.contentId, classroomId);
              } catch (slotError: any) {
                console.error(`âš ï¸ [Auto-Spread] Ø®Ø·Ø£ ÙÙŠ ${slot.content.name}:`, slotError.message);
              }
            }
          } else {
            console.log(`ðŸ” [Auto-Spread] Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­ØµØµ Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù†Ø´Ø± Ø§Ù„Ø­Ø¶ÙˆØ±`);
          }
        }
      } catch (spreadError: any) {
        console.error('âš ï¸ [Auto-Spread] Ø®Ø·Ø£ Ø¹Ø§Ù…:', spreadError.message);
      }
    }

    return attendance;
  }

  // ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø¬Ù…Ø§Ø¹ÙŠ
  async bulkRecordAttendance(sessionId: number, records: any[], userId: string) {
    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ÙŠØ¯ÙˆÙŠ
    // ÙÙ‚Ø· Ø­Ø§Ù…Ù„Ùˆ dashboard.attendance:record_manual ÙŠÙ…ÙƒÙ†Ù‡Ù… Ø§Ø³ØªØ®Ø¯Ø§Ù… bulk (ÙŠØ¯ÙˆÙŠ/Ø¬Ù…Ø§Ø¹ÙŠ/Ø¥Ù†Ù‡Ø§Ø¡)
    // Ù…Ø³Ø­ QR ÙŠØ³ØªØ®Ø¯Ù… /attendance/scan Ù…Ø«Ù„ PRESENT ÙÙ‚Ø· Ø¹Ø¨Ø± record
    const userPermissions = await this.permissionsService.getUserPermissions(userId);
    const canManual = userPermissions.hasPermission('dashboard.attendance', 'record_manual');
    if (!canManual) {
      throw new ForbiddenException('Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ÙŠØ¯ÙˆÙŠ Ù„Ù„Ø­Ø¶ÙˆØ± - Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ù‡Ù†Ø§ Ø¹Ø¨Ø± QR ÙÙ‚Ø·');
    }
    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
    }

    if (session.isCancelled) {
      throw new BadRequestException('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ù„ØºØ§Ø©');
    }

    // ØªØ³Ø¬ÙŠÙ„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø³Ø¬Ù„Ø§Øª - Ù†Ø¶ÙŠÙ sessionId Ù„ÙƒÙ„ record
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
    
    // Ø¥Ø°Ø§ ÙØ´Ù„ Ø£ÙŠ Ø³Ø¬Ù„ØŒ Ù†Ø±Ù…ÙŠ Ø§Ù„Ø®Ø·Ø£ Ø§Ù„Ø£ÙˆÙ„ (Ù„Ø¹Ø±Ø¶Ù‡ ÙÙŠ Frontend)
    const firstError = results.find(r => r.status === 'rejected');
    if (firstError && firstError.status === 'rejected') {
      console.log(`âŒ [BulkAttendance] ÙØ´Ù„ ${failed} Ù…Ù† ${records.length} Ø³Ø¬Ù„ - Ø±Ù…ÙŠ Ø§Ù„Ø®Ø·Ø£ Ù„Ù„Ø£Ø¹Ù„Ù‰`);
      throw firstError.reason; // Ø±Ù…ÙŠ Ø§Ù„Ø®Ø·Ø£ Ø§Ù„Ø£ÙˆÙ„
    }

    return {
      total: records.length,
      successful,
      failed,
      results,
    };
  }

  // Ù…Ø³Ø­ QR Ù„Ù„Ù…ØªØ¯Ø±Ø¨ â€” ÙŠØ³Ù…Ø­ Ø¨Ù€ record ÙÙ‚Ø· (Ø¨Ø¯ÙˆÙ† manual) ÙˆÙŠØ³Ø¬Ù„ Ø­Ø§Ø¶Ø± ÙÙ‚Ø·
  async scanAttendanceAsPresent(sessionId: number, traineeId: number, userId: string) {
    return this.recordAttendanceInternal(sessionId, traineeId, AttendanceStatus.PRESENT, undefined, userId);
  }

  // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ø¹ÙŠÙ†Ø©
  async getSessionAttendance(sessionId: number, restrictedTraineeIds?: number[] | null) {
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
          where: restrictedTraineeIds ? { traineeId: { in: restrictedTraineeIds } } : undefined,
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nationalId: true,
                email: true,
                phone: true,
                guardianPhone: true,
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
      throw new NotFoundException('Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
    }

    return session;
  }

  // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø§Ù„Ù…ÙØªØ±Ø¶ Ø­Ø¶ÙˆØ±Ù‡Ù… Ù„Ù„Ù…Ø­Ø§Ø¶Ø±Ø©
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
      throw new NotFoundException('Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
    }

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù‡Ùˆ Ø§Ù„ÙŠÙˆÙ… ÙÙ‚Ø· (Ø¥Ù„Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† Ù„Ø¯ÙŠÙ‡ ØµÙ„Ø§Ø­ÙŠØ© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØµÙ„Ø§Ø­ÙŠØ© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©
      try {
        const userPermissions = await this.permissionsService.getUserPermissions(userId);
        const canRecordPast = userPermissions.hasPermission('dashboard.attendance', 'record_past');
        
        if (!canRecordPast) {
          throw new BadRequestException('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ø¥Ù„Ø§ ÙÙŠ ÙŠÙˆÙ… Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ÙÙ‚Ø·');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        // ÙÙŠ Ø­Ø§Ù„Ø© ÙØ´Ù„ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§ØªØŒ Ù†Ù…Ù†Ø¹ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù„ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©
        throw new BadRequestException('Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ø¥Ù„Ø§ ÙÙŠ ÙŠÙˆÙ… Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ÙÙ‚Ø·');
      }
    }

    // Ø¥Ø°Ø§ ÙƒØ§Ù† Ù‡Ù†Ø§Ùƒ ØªÙˆØ²ÙŠØ¹ Ù‚Ø§Ø¹Ø§ØªØŒ Ù†Ø­Ø¶Ø± Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ù…Ù† Ø§Ù„Ù‚Ø§Ø¹Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
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

    // Ø¥Ø°Ø§ Ù„Ù… ÙŠÙƒÙ† Ù‡Ù†Ø§Ùƒ ØªÙˆØ²ÙŠØ¹ØŒ Ù†Ø­Ø¶Ø± Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† ÙÙŠ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬
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

  // Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù…ØªØ¯Ø±Ø¨ Ù…Ø¹ÙŠÙ† ÙÙŠ Ù…Ø§Ø¯Ø© Ù…Ø¹ÙŠÙ†Ø©
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

  // Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ø¹ÙŠÙ†Ø©
  async getSessionAttendanceStats(sessionId: number, restrictedTraineeIds?: number[] | null) {
    const whereClause: any = { sessionId };
    if (restrictedTraineeIds) {
      whereClause.traineeId = { in: restrictedTraineeIds };
    }
    const attendance = await this.prisma.attendance.findMany({
      where: whereClause,
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

  // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„ØªÙŠ Ø£Ù†Ø§ Ù…Ø³Ø¤ÙˆÙ„ Ø¹Ù† ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ±Ù‡Ø§
  async getMySessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    }

    // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„ØªÙŠ ÙŠÙƒÙˆÙ† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¤ÙˆÙ„ Ø¹Ù† Ø­Ø¶ÙˆØ±Ù‡Ø§ Ø£Ùˆ Ù…Ø­Ø§Ø¶Ø± ÙÙŠÙ‡Ø§
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

  // Ø­Ø°Ù Ø³Ø¬Ù„ Ø­Ø¶ÙˆØ±
  async deleteAttendance(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    }

    await this.prisma.attendance.delete({
      where: { id: attendanceId },
    });

    return { message: 'ØªÙ… Ø­Ø°Ù Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­' };
  }

  // Ø§Ø³ØªØ¹Ø±Ø§Ø¶ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ†
  async getTraineesWithAttendance(query: {
    page?: number;
    limit?: number;
    search?: string;
    programId?: number;
    traineeIds?: number[];
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Ø¨Ù†Ø§Ø¡ Ø´Ø±ÙˆØ· Ø§Ù„Ø¨Ø­Ø«
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

    // ØªØµÙÙŠØ© Ø­Ø³Ø¨ Ø§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª/Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„Ù…Ø³Ù…ÙˆØ­Ø©
    if (query.traineeIds) {
      where.id = { in: query.traineeIds };
    }

    // Ø¬Ù„Ø¨ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ†
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

    // Ø­Ø³Ø§Ø¨ Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„ØºÙŠØ§Ø¨ Ù„ÙƒÙ„ Ù…ØªØ¯Ø±Ø¨
    const traineesWithStats = trainees.map(trainee => {
      const presentCount = trainee.attendance.filter(a => a.status === 'PRESENT').length;
      const absentCount = trainee.attendance.filter(a => a.status === 'ABSENT').length;

      return {
        ...trainee,
        attendance: undefined, // Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙƒØ§Ù…Ù„Ø©
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

  // Ø¬Ù„Ø¨ Ø³Ø¬Ù„ Ø­Ø¶ÙˆØ± Ù…ØªØ¯Ø±Ø¨ Ù…Ø¹ÙŠÙ†
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
        programId: true,
        program: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    }

    // Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù…Ø¹ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª
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

    // Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª â€” Ø§Ù„Ù…Ù„ØºØ§Ø© Ù„Ø§ ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø­Ø³Ø§Ø¨
    const nonCancelledRecords = attendanceRecords.filter(r => !(r.session as any)?.isCancelled);
    const stats = {
      total: nonCancelledRecords.length,
      present: nonCancelledRecords.filter(r => r.status === 'PRESENT').length,
      absent: nonCancelledRecords.filter(r => r.status === 'ABSENT').length,
      late: nonCancelledRecords.filter(r => r.status === 'LATE').length,
      excused: nonCancelledRecords.filter(r => r.status === 'EXCUSED').length,
      cancelled: attendanceRecords.filter(r => (r.session as any)?.isCancelled).length,
    };

    // ØªØ¬Ù…ÙŠØ¹ Ø­Ø³Ø¨ Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ©
    const byContent: any = {};
    const recordedSessionIds = new Set(attendanceRecords.map(r => r.sessionId));
    // ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…Ù„ØºØ§Ø© Ù„Ø¹Ø±Ø¶Ù‡Ø§ ÙƒÙ€ CANCELLED Ù…Ø¹ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ©
    const mappedRecords = attendanceRecords.map((record: any) => {
      const isCancelled = !!record.session?.isCancelled;
      return {
        ...record,
        originalStatus: record.status,
        status: isCancelled ? 'CANCELLED' : record.status,
      };
    });

    mappedRecords.forEach((record: any) => {
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

      const isCancelled = !!record.session?.isCancelled;
      if (!isCancelled) {
        byContent[contentId].stats.total++;
        if (record.status === 'PRESENT') byContent[contentId].stats.present++;
        else if (record.status === 'ABSENT') byContent[contentId].stats.absent++;
        else if (record.status === 'LATE') byContent[contentId].stats.late++;
        else if (record.status === 'EXCUSED') byContent[contentId].stats.excused++;
      }

      byContent[contentId].records.push(record);
    });

    // Ø¥Ø¶Ø§ÙØ© Ø¬Ù„Ø³Ø§Øª Ù…Ù„ØºØ§Ø© Ø¨Ø¯ÙˆÙ† Ø³Ø¬Ù„ ÙƒØ¹Ù†Ø§ØµØ± CANCELLED (Ù„Ø§ ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª)
    try {
      const traineeWithProgram: any = trainee;
      const programId = traineeWithProgram.programId ?? trainee?.program?.id;
      if (programId) {
        const traineeAssignments = await this.prisma.distributionAssignment.findMany({
          where: {
            traineeId,
            room: { distribution: { classroom: { programId } } },
          },
          select: { roomId: true },
        });
        const traineeRoomIds = new Set(traineeAssignments.map(a => a.roomId));

        const cancelledWithoutRecord = await this.prisma.scheduledSession.findMany({
          where: {
            isCancelled: true,
            scheduleSlot: { classroom: { programId } },
          },
          include: {
            scheduleSlot: {
              include: {
                content: { select: { id: true, name: true, code: true } },
                classroom: { select: { id: true, name: true, classNumber: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        });

        for (const cs of cancelledWithoutRecord) {
          if (recordedSessionIds.has(cs.id)) continue;
          const slot: any = cs.scheduleSlot;
          if (slot.distributionRoomId && !traineeRoomIds.has(slot.distributionRoomId)) continue;

          const contentId = slot.content.id;
          if (!byContent[contentId]) {
            byContent[contentId] = {
              content: { id: contentId, name: slot.content.name, code: slot.content.code },
              classroom: slot.classroom,
              stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
              records: [],
            };
          }
          const pseudoRecord: any = {
            id: -cs.id,
            traineeId,
            sessionId: cs.id,
            status: 'CANCELLED',
            originalStatus: null,
            notes: (cs as any).cancellationReason || null,
            recordedAt: cs.createdAt,
            recordedByUser: { id: '', name: 'Ø§Ù„Ù†Ø¸Ø§Ù…' },
            session: {
              id: cs.id,
              date: cs.date,
              isCancelled: true,
              scheduleSlot: {
                id: slot.id,
                content: { id: slot.content.id, name: slot.content.name, code: slot.content.code },
                classroom: { id: slot.classroom.id, name: slot.classroom.name, classNumber: slot.classroom.classNumber },
                startTime: (slot as any).startTime ?? '',
                endTime: (slot as any).endTime ?? '',
              },
            },
          };
          byContent[contentId].records.push(pseudoRecord);
          (mappedRecords as any).push(pseudoRecord);
        }
      }
    } catch (e: any) {
      console.error('Error adding cancelled sessions without record:', e?.message);
    }

    return {
      trainee,
      stats,
      byContent: Object.values(byContent),
      allRecords: mappedRecords,
    };
  }

  /**
   * ØªØ­Ø¯ÙŠØ« Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ±
   * Ø§Ù„Ø­Ø³Ø§Ø¨: (Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„ØªÙŠ Ø­Ø¶Ø±Ù‡Ø§ / Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª) Ã— Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„Ù‚ØµÙˆÙ‰
   */
  /**
   * Ø¥Ø¹Ø§Ø¯Ø© Ø­Ø³Ø§Ø¨ Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† ÙÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§Ø¯
   * ÙŠØªÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù…Ù‡Ø§ Ù„Ø¥ØµÙ„Ø§Ø­ Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ø§Ù„ØªÙŠ Ø­ÙØ³Ø¨Øª Ø¨Ø´ÙƒÙ„ Ø®Ø§Ø·Ø¦
   */
  async recalculateAllAttendanceGrades(): Promise<{
    total: number;
    updated: number;
    errors: number;
    details: Array<{ traineeId: number; contentId: number; classroomId: number; oldGrade: number; newGrade: number }>;
  }> {
    // Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ø§Ù„ØªÙŠ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¯Ø±Ø¬Ø© Ø­Ø¶ÙˆØ±
    const allGrades = await this.prisma.traineeGrades.findMany({
      select: {
        traineeId: true,
        trainingContentId: true,
        classroomId: true,
        attendanceMarks: true,
      },
    });

    // Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„ØªÙŠ Ù„Ø¯ÙŠÙ‡Ø§ Ø¯Ø±Ø¬Ø§Øª Ø­Ø¶ÙˆØ±
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

    // Ø¨Ù†Ø§Ø¡ Ù‚Ø§Ø¦Ù…Ø© ÙØ±ÙŠØ¯Ø© Ù…Ù† (trainee, content, classroom) Ù„Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©
    const toProcess = new Set<string>();

    // Ù…Ù† Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø©
    for (const grade of allGrades) {
      toProcess.add(`${grade.traineeId}-${grade.trainingContentId}-${grade.classroomId}`);
    }

    // Ù…Ù† Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø§Ù„Ø°ÙŠÙ† Ù„Ø¯ÙŠÙ‡Ù… Ø³Ø¬Ù„Ø§Øª Ø­Ø¶ÙˆØ± ÙˆÙ„ÙƒÙ† Ù„ÙŠØ³ Ù„Ø¯ÙŠÙ‡Ù… Ø¯Ø±Ø¬Ø§Øª Ø¨Ø¹Ø¯
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
        // Ø¬Ù„Ø¨ Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
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

        // Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø­Ø³Ø§Ø¨
        await this.updateAttendanceGrade(traineeId, contentId, classroomId);

        // Ø¬Ù„Ø¨ Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©
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

  async updateAttendanceGrade(
    traineeId: number,
    contentId: number,
    classroomId: number,
  ) {
    try {
      // 1. Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ù„Ù…Ø¹Ø±ÙØ© Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„Ù‚ØµÙˆÙ‰
      const content = await this.prisma.trainingContent.findUnique({
        where: { id: contentId },
        select: {
          attendanceMarks: true,
        },
      });

      if (!content || !content.attendanceMarks || content.attendanceMarks === 0) {
        // Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯Ø±Ø¬Ø§Øª Ù„Ù„Ø­Ø¶ÙˆØ± ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø§Ø¯Ø©
        return;
      }

      const maxAttendanceMarks = content.attendanceMarks;

      // 2. Ù…Ø¹Ø±ÙØ© Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„ØªÙŠ ÙŠÙ†ØªÙ…ÙŠ Ù„Ù‡Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„
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

      // 3. Ø­Ø³Ø§Ø¨ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„ÙØ¹Ù„ÙŠØ© (ScheduledSession) Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨
      // â†’ Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø§Ù„ØªÙŠ Ø­ØµØªÙ‡Ø§ Ø¨Ø¯ÙˆÙ† Ù…Ø¬Ù…ÙˆØ¹Ø© (Ø¹Ø§Ù…Ø©) Ø£Ùˆ Ø­ØµØªÙ‡Ø§ Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨
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
        // Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ù…Ø¬Ø¯ÙˆÙ„Ø©
        return;
      }

      // 4. Ø­Ø³Ø§Ø¨ Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„ØªÙŠ Ø­Ø¶Ø±Ù‡Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ (PRESENT Ø£Ùˆ LATE Ø£Ùˆ EXCUSED)
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

      // 5. Ø­Ø³Ø§Ø¨ Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ±
      // Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ø§ ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø³Ø§Ù„Ø¨Ø© Ø£Ø¨Ø¯Ø§Ù‹
      const attendanceGrade = Math.max(0, Math.round(((attendedSessions / totalSessions) * maxAttendanceMarks) * 100) / 100);

      // 5. ØªØ­Ø¯ÙŠØ« Ø£Ùˆ Ø¥Ù†Ø´Ø§Ø¡ Ø³Ø¬Ù„ Ø§Ù„Ø¯Ø±Ø¬Ø§Øª
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
          // ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙƒÙ„ÙŠ
          totalMarks: {
            increment: attendanceGrade,
          },
        },
      });

      // Ø¥Ø¹Ø§Ø¯Ø© Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙƒÙ„ÙŠ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­
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
            totalMarks: Math.max(0, newTotal),
          },
        });
      }
    } catch (error) {
      // Ù†Ø³Ø¬Ù„ Ø§Ù„Ø®Ø·Ø£ Ù„ÙƒÙ† Ù„Ø§ Ù†ÙˆÙ‚Ù Ø¹Ù…Ù„ÙŠØ© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±
      console.error('Error updating attendance grade:', error);
    }
  }

  /**
   * Ø¥Ø¹Ø§Ø¯Ø© Ø­Ø³Ø§Ø¨ Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ù„ÙƒÙ„ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø§Ù„Ù…ØªÙˆÙ‚Ø¹ÙŠÙ† ÙÙŠ Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ø¹ÙŠÙ†Ø©
   * ØªÙØ³ØªØ¯Ø¹Ù‰ Ø¹Ù†Ø¯ Ø¥Ù„ØºØ§Ø¡ Ø£Ùˆ ÙÙƒ Ø¥Ù„ØºØ§Ø¡ Ù…Ø­Ø§Ø¶Ø±Ø© Ù„Ø¶Ù…Ø§Ù† Ø£Ù† Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„Ù…Ù„ØºØ§Ø© Ù„Ø§ ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø¯Ø±Ø¬Ø§Øª
   * Ø­ØªÙ‰ Ù„Ùˆ Ø£ÙÙ„ØºÙŠØª Ø¨Ø¹Ø¯ ØªØ§Ø±ÙŠØ®Ù‡Ø§
   */
  async recalculateAttendanceGradeForSession(sessionId: number): Promise<{ processed: number }> {
    const session = await this.prisma.scheduledSession.findUnique({
      where: { id: sessionId },
      include: {
        scheduleSlot: {
          include: {
            classroom: { select: { id: true, programId: true } },
            distributionRoom: {
              include: {
                assignments: { select: { traineeId: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return { processed: 0 };
    }

    const contentId = session.scheduleSlot.contentId;
    const classroomId = session.scheduleSlot.classroomId;
    const programId = (session.scheduleSlot.classroom as any)?.programId;

    let expectedTraineeIds: number[] = [];

    if (session.scheduleSlot.distributionRoom) {
      const roomTraineeIds = (session.scheduleSlot.distributionRoom as any).assignments.map((a: any) => a.traineeId);
      const trainees = await this.prisma.trainee.findMany({
        where: { id: { in: roomTraineeIds }, programId },
        select: { id: true },
      });
      expectedTraineeIds = trainees.map((t) => t.id);
    } else {
      const trainees = await this.prisma.trainee.findMany({
        where: { programId },
        select: { id: true },
      });
      expectedTraineeIds = trainees.map((t) => t.id);
    }

    let processed = 0;
    for (const traineeId of expectedTraineeIds) {
      await this.updateAttendanceGrade(traineeId, contentId, classroomId);
      processed++;
    }

    return { processed };
  }

  /**
   * ØªÙ†Ø¸ÙŠÙ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙˆÙ‡Ù…ÙŠØ© - Ø­Ø°Ù Ø³Ø¬Ù„Ø§Øª Ø­Ø¶ÙˆØ± Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† ÙÙŠ Ø¬Ù„Ø³Ø§Øª Ù„ÙŠØ³Øª Ù…Ø¬Ù…ÙˆØ¹ØªÙ‡Ù…
   * Ù‡Ø°Ø§ ÙŠØµÙ„Ø­ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø®Ø§Ø·Ø¦Ø© Ø§Ù„Ù†Ø§ØªØ¬Ø© Ø¹Ù† Ø§Ù„Ø®Ø·Ø£ Ø§Ù„Ø³Ø§Ø¨Ù‚ ÙÙŠ autoCompleteOldSessions
   */
  async cleanupPhantomAttendanceRecords(classroomId: number) {
    console.log(`ðŸ§¹ [Cleanup] Ø¨Ø¯Ø¡ ØªÙ†Ø¸ÙŠÙ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙˆÙ‡Ù…ÙŠØ© Ù„Ù„ÙØµÙ„ ${classroomId}...`);

    // 1. Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„
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

      // Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø§Ù„Ù…Ù†ØªÙ…ÙŠÙ† Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©
      const validTraineeIds = new Set(
        slot.distributionRoom.assignments.map(a => a.traineeId)
      );

      for (const session of slot.sessions) {
        for (const record of session.attendance) {
          totalChecked++;
          
          // Ø¥Ø°Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ Ù„ÙŠØ³ ÙÙŠ Ù…Ø¬Ù…ÙˆØ¹Ø© Ù‡Ø°Ù‡ Ø§Ù„Ø­ØµØ© â†’ Ø³Ø¬Ù„ ÙˆÙ‡Ù…ÙŠ!
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

    // Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„ÙˆÙ‡Ù…ÙŠØ©
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

    console.log(`ðŸ§¹ [Cleanup] Ø§ÙƒØªÙ…Ù„: ÙØ­Øµ ${totalChecked} Ø³Ø¬Ù„ | Ø­Ø°Ù ${totalDeleted} Ø³Ø¬Ù„ ÙˆÙ‡Ù…ÙŠ`);

    return {
      classroomId,
      totalChecked,
      totalDeleted,
      phantomRecords: details.slice(0, 200), // Ø£ÙˆÙ„ 200 Ø³Ø¬Ù„ Ù„Ù„Ø¹Ø±Ø¶
    };
  }

  /**
   * ØªÙˆØ­ÙŠØ¯ Ø§Ù„Ø­Ø¶ÙˆØ± Ø¹Ø¨Ø± Ø§Ù„Ù…ÙˆØ§Ø¯ ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙŠÙˆÙ… Ø¨Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ
   * Ø¥Ø°Ø§ Ø­Ø¶Ø± Ù…ØªØ¯Ø±Ø¨ ÙÙŠ Ù…Ø§Ø¯Ø© ÙˆØ§Ø­Ø¯Ø© ÙÙŠ ÙŠÙˆÙ… Ù…Ø§ØŒ ÙŠØªÙ… Ù†Ø³Ø® Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø£Ø®Ø±Ù‰ ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙŠÙˆÙ…
   * Ø¨Ù…Ø§ ÙÙŠ Ø°Ù„Ùƒ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø­Ø§Ø¶Ø±Ø§Øª (ScheduledSession) Ù…ÙÙ‚ÙˆØ¯Ø© Ø¥Ø°Ø§ Ù„Ù… ØªÙƒÙ† Ù…ÙˆÙ„Ù‘Ø¯Ø©
   */
  async unifyAttendanceByClassroom(classroomId: number, userId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { programId: true },
    });
    if (!classroom) {
      throw new NotFoundException('الفصل الدراسي غير موجود');
    }

    // 1. Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§Ø¯ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ
    const contents = await this.prisma.trainingContent.findMany({
      where: { classroomId },
      select: { id: true, name: true, code: true },
    });

    if (contents.length === 0) {
      throw new BadRequestException('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆØ§Ø¯ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ');
    }

    // 2. Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ ScheduleSlots Ù„Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„ (Ù…Ø¹ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©)
    const scheduleSlots = await this.prisma.scheduleSlot.findMany({
      where: { classroomId },
      include: {
        content: { select: { id: true, name: true } },
      },
    });

    if (scheduleSlots.length === 0) {
      throw new BadRequestException('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¬Ø¯ÙˆÙ„ Ø¯Ø±Ø§Ø³ÙŠ Ù„Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„');
    }

    // 3. Ø¨Ù†Ø§Ø¡ Ø®Ø±ÙŠØ·Ø©: Ù„ÙƒÙ„ ÙŠÙˆÙ… Ø£Ø³Ø¨ÙˆØ¹ â†’ Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©
    const slotsByDayOfWeek = new Map<string, typeof scheduleSlots>();
    for (const slot of scheduleSlots) {
      const day = slot.dayOfWeek;
      if (!slotsByDayOfWeek.has(day)) {
        slotsByDayOfWeek.set(day, []);
      }
      slotsByDayOfWeek.get(day)!.push(slot);
    }

    // 4. Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ ØªØ®ØµÙŠØµØ§Øª Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ù„Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„
    const allAssignments = await this.prisma.distributionAssignment.findMany({
      where: {
        room: {
          distribution: {
            programId: classroom.programId,
            OR: [{ classroomId }, { classroomId: null }],
          },
        },
      },
      select: { traineeId: true, roomId: true },
    });

    // Ø¨Ù†Ø§Ø¡ Ø®Ø±ÙŠØ·Ø©: Ù„ÙƒÙ„ Ù…ØªØ¯Ø±Ø¨ â†’ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„ØªÙŠ ÙŠÙ†ØªÙ…ÙŠ Ù„Ù‡Ø§
    const traineeRoomsMap = new Map<number, Set<string>>();
    for (const assignment of allAssignments) {
      if (!traineeRoomsMap.has(assignment.traineeId)) {
        traineeRoomsMap.set(assignment.traineeId, new Set());
      }
      traineeRoomsMap.get(assignment.traineeId)!.add(assignment.roomId);
    }

    // 5. Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© Ù…Ø¹ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ±
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

    // 6. Ø¨Ù†Ø§Ø¡ Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© Ø­Ø³Ø¨ Ø§Ù„ØªØ§Ø±ÙŠØ®
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
        const name = trainee?.nameAr || `Ù…ØªØ¯Ø±Ø¨ #${traineeId}`;
        traineeNamesCache.set(traineeId, name);
        return name;
      } catch {
        const name = `Ù…ØªØ¯Ø±Ø¨ #${traineeId}`;
        traineeNamesCache.set(traineeId, name);
        return name;
      }
    };

    // Ø¯Ø§Ù„Ø©: Ù‡Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ø­ØµØ© Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ØŸ
    const isSlotForTrainee = (slot: typeof scheduleSlots[0], traineeId: number): boolean => {
      // Ø¥Ø°Ø§ Ø§Ù„Ø­ØµØ© Ø¨Ø¯ÙˆÙ† Ù…Ø¬Ù…ÙˆØ¹Ø© â†’ Ø¹Ø§Ù…Ø© Ù„ÙƒÙ„ Ø§Ù„Ø·Ù„Ø§Ø¨
      if (!slot.distributionRoomId) return true;
      // Ø¥Ø°Ø§ Ø§Ù„Ø­ØµØ© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø¬Ù…ÙˆØ¹Ø© â†’ ØªØ­Ù‚Ù‚ Ø£Ù† Ø§Ù„Ø·Ø§Ù„Ø¨ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©
      const traineeRooms = traineeRoomsMap.get(traineeId);
      if (!traineeRooms) return false;
      return traineeRooms.has(slot.distributionRoomId);
    };

    const dayOfWeekMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // 7. Ù„ÙƒÙ„ ØªØ§Ø±ÙŠØ® ÙÙŠÙ‡ Ù…Ø­Ø§Ø¶Ø±Ø§Øª:
    for (const [dateKey, dateSessions] of sessionsByDate) {
      // Ø¬Ù…Ø¹ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ø§Ù„Ø°ÙŠÙ† Ù„Ø¯ÙŠÙ‡Ù… Ø­Ø¶ÙˆØ± (ØºÙŠØ± ØºØ§Ø¦Ø¨) ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ÙŠÙˆÙ…
      const traineeAttendanceMap = new Map<number, { status: string; sourceContentId: number; sourceSlotId: number }>();

      for (const sess of dateSessions) {
        for (const att of sess.attendance) {
          if (att.status !== 'PRESENT' && att.status !== 'LATE') continue;
          if (!traineeAttendanceMap.has(att.traineeId)) {
            traineeAttendanceMap.set(att.traineeId, {
              status: att.status,
              sourceContentId: sess.scheduleSlot.contentId,
              sourceSlotId: sess.scheduleSlot.id,
            });
          }
        }
      }

      const presentTrainees = [...traineeAttendanceMap.entries()];
      if (presentTrainees.length === 0) continue;

      // ØªØ­Ø¯ÙŠØ¯ ÙŠÙˆÙ… Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹
      const dateObj = new Date(dateKey);
      const jsDayOfWeek = dateObj.getUTCDay();
      const dayOfWeek = dayOfWeekMap[jsDayOfWeek];

      const slotsForThisDay = slotsByDayOfWeek.get(dayOfWeek) || [];
      if (slotsForThisDay.length <= 1) continue;

      totalDaysProcessed++;

      // Ø¨Ù†Ø§Ø¡ Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª: slotId â†’ session info
      const sessionsForDayBySlotId = new Map<number, { sessionId: number; slotId: number; contentId: number; distributionRoomId: string | null; isCancelled: boolean; attendance: Array<{ traineeId: number; status: string }> }>();

      for (const sess of dateSessions) {
        sessionsForDayBySlotId.set(sess.scheduleSlot.id, {
          sessionId: sess.id,
          slotId: sess.scheduleSlot.id,
          contentId: sess.scheduleSlot.contentId,
          distributionRoomId: sess.scheduleSlot.distributionRoomId,
          isCancelled: false,
          attendance: sess.attendance.map(a => ({ traineeId: a.traineeId, status: a.status })),
        });
      }

      // Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø§Øª Ø§Ù„Ù…ÙÙ‚ÙˆØ¯Ø© (Ù„ÙƒÙ„ slot ÙˆÙ„ÙŠØ³ Ù„ÙƒÙ„ content)
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
            isCancelled: newSession.isCancelled,
            attendance: [],
          });
          totalSessionsCreated++;
        } catch (err: any) {
          errors.push(`Ø®Ø·Ø£ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø­Ø§Ø¶Ø±Ø© Ù„Ù„Ù…Ø§Ø¯Ø© ${slot.content.name} Ø¨ØªØ§Ø±ÙŠØ® ${dateKey}: ${err.message}`);
        }
      }

      // Ù„ÙƒÙ„ Ù…ØªØ¯Ø±Ø¨ Ø­Ø§Ø¶Ø±: Ù†Ø³Ø® Ø­Ø¶ÙˆØ±Ù‡ Ù„Ø¨Ø§Ù‚ÙŠ Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© ÙÙ‚Ø·
      for (const [traineeId, { sourceContentId, sourceSlotId }] of presentTrainees) {
        const propagatedStatus = 'PRESENT' as const;
        // âœ… Ø­Ù…Ø§ÙŠØ©: Ù„ÙƒÙ„ Ù…Ø§Ø¯Ø© Ù†Ø¹Ø§Ù„Ø¬ Ø­ØµØ© ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø· Ù„ØªØ¬Ù†Ø¨ Ø§Ù„Ù†Ø´Ø± Ù„Ù…Ø¬Ù…ÙˆØ¹ØªÙŠÙ† Ù…Ù† Ù†ÙØ³ Ø§Ù„Ù…Ø§Ø¯Ø©
        const processedSlotIds = new Set<number>();
        
        // Ø¬Ù„Ø¨ Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ÙÙ‚Ø·
        for (const slot of slotsForThisDay) {
          if (slot.id === sourceSlotId) continue; // Skip only the source slot, not every slot for that subject.
          if (!isSlotForTrainee(slot, traineeId)) continue; // ØªØ®Ø·ÙŠ Ø­ØµØµ Ù„ÙŠØ³Øª Ù„Ù…Ø¬Ù…ÙˆØ¹ØªÙ‡
          if (processedSlotIds.has(slot.id)) continue;
          processedSlotIds.add(slot.id);

          const sessInfo = sessionsForDayBySlotId.get(slot.id);
          if (!sessInfo || sessInfo.isCancelled) continue;

          const existingRecord = sessInfo.attendance.find(a => a.traineeId === traineeId);
          if (existingRecord && existingRecord.status !== 'ABSENT') continue;

          try {
            if (existingRecord && existingRecord.status === 'ABSENT') {
              const updated = await this.prisma.attendance.updateMany({
                where: { sessionId: sessInfo.sessionId, traineeId, status: 'ABSENT' },
                data: {
                  status: propagatedStatus,
                  notes: 'ØªÙ… Ø§Ù„ØªÙˆØ­ÙŠØ¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ - ØªØ­Ø¯ÙŠØ« ØºÙŠØ§Ø¨ Ø³Ø§Ø¨Ù‚',
                  updatedBy: userId,
                },
              });
              if (updated.count === 0) continue;
              totalUpdated++;
              details.push({
                date: dateKey,
                traineeId,
                traineeName: await getTraineeName(traineeId),
                sourceContent: contents.find(c => c.id === sourceContentId)?.name || `Ù…Ø§Ø¯Ø© #${sourceContentId}`,
                targetContent: contents.find(c => c.id === slot.contentId)?.name || `Ù…Ø§Ø¯Ø© #${slot.contentId}`,
                status: propagatedStatus,
                action: 'ØªØ­Ø¯ÙŠØ«',
              });
            } else {
              await this.prisma.attendance.create({
                data: {
                  sessionId: sessInfo.sessionId,
                  traineeId,
                  status: propagatedStatus,
                  notes: 'ØªÙ… Ø§Ù„ØªÙˆØ­ÙŠØ¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù…Ù† Ø£Ø¯Ø§Ø© ØªÙˆØ­ÙŠØ¯ Ø§Ù„Ø­Ø¶ÙˆØ±',
                  recordedBy: userId,
                },
              });
              totalCreated++;
              details.push({
                date: dateKey,
                traineeId,
                traineeName: await getTraineeName(traineeId),
                sourceContent: contents.find(c => c.id === sourceContentId)?.name || `Ù…Ø§Ø¯Ø© #${sourceContentId}`,
                targetContent: contents.find(c => c.id === slot.contentId)?.name || `Ù…Ø§Ø¯Ø© #${slot.contentId}`,
                status: propagatedStatus,
                action: 'Ø¥Ù†Ø´Ø§Ø¡',
              });
            }
          } catch (err: any) {
            if (!err.message?.includes('Unique constraint')) {
              errors.push(`Ø®Ø·Ø£ Ù„Ù„Ù…ØªØ¯Ø±Ø¨ ${traineeId} ÙÙŠ Ù…Ø§Ø¯Ø© ${slot.contentId}: ${err.message}`);
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

  // ================== Ù†Ø¸Ø§Ù… Ø£ÙƒÙˆØ§Ø¯ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± ==================

  /**
   * Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¯ Ø­Ø¶ÙˆØ± Ù…Ù† 6 Ø£Ø±Ù‚Ø§Ù… Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ø¹ÙŠÙ†Ø©
   */
  async generateAttendanceCode(sessionId: number, userId: string, expiresInMinutes?: number) {
    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©
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
      throw new NotFoundException('Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
    }

    if (session.isCancelled) {
      throw new BadRequestException('Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¯ Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ù„ØºØ§Ø©');
    }

    this.assertAttendanceWindow(session);

    // Ø¥Ø°Ø§ ÙƒØ§Ù† Ù‡Ù†Ø§Ùƒ ÙƒÙˆØ¯ Ù†Ø´Ø· Ø¨Ø§Ù„ÙØ¹Ù„ØŒ Ù†Ø¹ÙŠØ¯Ù‡
    if (session.attendanceCode && session.attendanceCode.isActive) {
      // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù…Ø§ Ø¥Ø°Ø§ Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ÙƒÙˆØ¯
      if (session.attendanceCode.expiresAt && new Date() > session.attendanceCode.expiresAt) {
        // ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ù…Ù†ØªÙ‡ÙŠ
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

    // ØªÙˆÙ„ÙŠØ¯ ÙƒÙˆØ¯ Ø¹Ø´ÙˆØ§Ø¦ÙŠ Ù…Ù† 6 Ø£Ø±Ù‚Ø§Ù…
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ØªØ­Ø¯ÙŠØ¯ ÙˆÙ‚Øª Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©
    let expiresAt: Date | null = null;
    if (expiresInMinutes) {
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    }

    // Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ù‚Ø¯ÙŠÙ… Ø¥Ù† ÙˆØ¬Ø¯ Ø«Ù… Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¯ Ø¬Ø¯ÙŠØ¯
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
   * Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ù†Ø´Ø· Ù„Ù…Ø­Ø§Ø¶Ø±Ø©
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

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©
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
   * ØªØ¹Ø·ÙŠÙ„ ÙƒÙˆØ¯ Ø­Ø¶ÙˆØ±
   */
  async deactivateAttendanceCode(sessionId: number) {
    const code = await this.prisma.attendanceCode.findUnique({
      where: { sessionId },
    });

    if (!code) {
      throw new NotFoundException('Ù„Ø§ ÙŠÙˆØ¬Ø¯ ÙƒÙˆØ¯ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©');
    }

    await this.prisma.attendanceCode.update({
      where: { id: code.id },
      data: { isActive: false },
    });

    return { success: true, message: 'ØªÙ… ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯ Ø¨Ù†Ø¬Ø§Ø­' };
  }

  /**
   * ØªØ­Ù‚Ù‚ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ Ù…Ù† Ø§Ù„ÙƒÙˆØ¯ ÙˆØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ±Ù‡
   */
  async verifyAttendanceCode(code: string, traineeId: number) {
    // Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„ÙƒÙˆØ¯
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
      throw new BadRequestException('Ø§Ù„ÙƒÙˆØ¯ ØºÙŠØ± ØµØ­ÙŠØ­ Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©');
    }

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©
    if (attendanceCode.expiresAt && new Date() > attendanceCode.expiresAt) {
      await this.prisma.attendanceCode.update({
        where: { id: attendanceCode.id },
        data: { isActive: false },
      });
      throw new BadRequestException('Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØ© Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯');
    }

    const session = attendanceCode.session;
    const slot = session.scheduleSlot;

    if (session.isCancelled) {
      throw new BadRequestException('Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø© Ù…Ù„ØºØ§Ø©');
    }

    this.assertAttendanceWindow(session);

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø§Ù„Ù…ØªØ¯Ø±Ø¨ Ù…Ø¯Ø±Ø¬ ÙÙŠ ØªÙˆØ²ÙŠØ¹Ø© Ù‡Ø°Ø§ Ø§Ù„Ù…ÙŠØ¹Ø§Ø¯
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true, programId: true },
    });

    if (!trainee) {
      throw new NotFoundException('Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    }

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ÙÙŠ Ù†ÙØ³ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬
    if (trainee.programId !== slot.content.programId) {
      throw new BadRequestException('Ø£Ù†Øª ØºÙŠØ± Ù…Ø³Ø¬Ù„ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬ Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠ');
    }

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØªÙˆØ²ÙŠØ¹Ø© Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…ÙˆØ¬ÙˆØ¯Ø©
    if (slot.distributionRoom) {
      const isInRoom = slot.distributionRoom.assignments.some(a => a.traineeId === traineeId);
      if (!isInRoom) {
        throw new BadRequestException('Ø£Ù†Øª ØºÙŠØ± Ù…Ø¯Ø±Ø¬ ÙÙŠ Ù‚Ø§Ø¹Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©');
      }
    }

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¹Ø¯Ù… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± Ù…Ø³Ø¨Ù‚Ø§Ù‹
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
        message: 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ±Ùƒ Ù…Ø³Ø¨Ù‚Ø§Ù‹ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±Ø©',
        session: {
          content: slot.content.name,
          date: session.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      };
    }

    // ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±
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
        notes: 'ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø¹Ø¨Ø± Ø§Ù„ÙƒÙˆØ¯',
      },
      update: {
        status: 'PRESENT',
        updatedBy: attendanceCode.createdBy,
        notes: 'ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø¹Ø¨Ø± Ø§Ù„ÙƒÙˆØ¯',
      },
    });

    // Ù†Ø´Ø± Ø§Ù„Ø­Ø¶ÙˆØ± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù„Ø¨Ø§Ù‚ÙŠ Ù…ÙˆØ§Ø¯ Ù†ÙØ³ Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ø¬Ø¯ÙˆÙ„ ÙˆØªÙˆØ²ÙŠØ¹Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨
    const targetClassroomId = (slot as any).classroomId || slot.content?.classroomId;
    if (targetClassroomId) {
      this.unifyAttendanceByClassroom(targetClassroomId, attendanceCode.createdBy).catch(err => {
        console.warn('âš ï¸ [VerifyCode] ØªØ¹Ø°Ø± Ù†Ø´Ø± Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø£Ø®Ø±Ù‰:', err.message);
      });
    }

    return {
      success: true,
      alreadyRecorded: false,
      message: `ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ±Ùƒ Ø¨Ù†Ø¬Ø§Ø­ ÙÙŠ Ù…Ø§Ø¯Ø© ${slot.content.name}`,
      session: {
        content: slot.content.name,
        date: session.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    };
  }
}

