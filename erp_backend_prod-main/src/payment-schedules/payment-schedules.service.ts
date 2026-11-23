import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';

@Injectable()
export class PaymentSchedulesService {
  private readonly logger = new Logger(PaymentSchedulesService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء جدول مواعيد سداد جديد
   */
  async create(createDto: CreatePaymentScheduleDto, userId: string) {
    // التحقق من وجود الرسوم
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: createDto.feeId },
    });

    if (!fee) {
      throw new NotFoundException('الرسوم غير موجودة');
    }

    const fineSourceFee = createDto.fineSourceFeeId
      ? await this.prisma.traineeFee.findUnique({ where: { id: createDto.fineSourceFeeId } })
      : null;
    if (createDto.fineSourceFeeId && !fineSourceFee) throw new BadRequestException('الرسم المالي المختار غير موجود');
    if (fineSourceFee && fineSourceFee.programId !== fee.programId) throw new BadRequestException('يجب اختيار مصدر غرامة من البرنامج التدريبي نفسه');
    if (fineSourceFee && fineSourceFee.id === fee.id) throw new BadRequestException('اختر رسمًا ماليًا آخر ليكون مصدر الغرامة');
    if (createDto.fineRecurrence && !fineSourceFee) throw new BadRequestException('اختر رسمًا ماليًا صالحًا قبل تفعيل الغرامة');

    // التحقق من عدم وجود جدول مواعيد مسبق لهذه الرسوم
    const existing = await this.prisma.feePaymentSchedule.findUnique({
      where: { feeId: createDto.feeId },
    });

    if (existing) {
      throw new BadRequestException('يوجد جدول مواعيد مسبق لهذه الرسوم');
    }

    // حساب التاريخ النهائي
    let finalDeadline = null;
    if (createDto.paymentEndDate) {
      const endDate = new Date(createDto.paymentEndDate);
      endDate.setUTCHours(23, 59, 59, 999);
      const graceDays = createDto.gracePeriodDays || 0; // افتراضي 0 إذا لم يُحدد
      endDate.setUTCDate(endDate.getUTCDate() + graceDays);
      finalDeadline = endDate;
    }

    // إنشاء الجدول
    const schedule = await this.prisma.feePaymentSchedule.create({
      data: {
        feeId: createDto.feeId,
        paymentStartDate: createDto.paymentStartDate ? new Date(createDto.paymentStartDate) : null,
        paymentEndDate: createDto.paymentEndDate ? new Date(createDto.paymentEndDate) : null,
        gracePeriodDays: createDto.gracePeriodDays || 0,
        finalDeadline,
        nonPaymentActions: createDto.nonPaymentActions || [],
        actionEnabled: createDto.actionEnabled || false,
        fineSourceTransactionId: null,
        fineSourceFeeId: fineSourceFee?.id ?? null,
        fineSourceAmount: fineSourceFee ? Math.abs(fineSourceFee.amount) : null,
        fineSourceDescription: fineSourceFee?.name || null,
        fineRecurrence: fineSourceFee ? createDto.fineRecurrence ?? null : null,
        notes: createDto.notes,
        createdBy: userId,
      },
      include: {
        fee: {
          include: {
            program: true,
            safe: true,
          },
        },
      },
    });

    let fineProcessing;
    try {
      fineProcessing = await this.applyOverdueFinesForSchedule(schedule.id);
    } catch (error: any) {
      this.logger.error(`تعذر تطبيق الغرامات المستحقة فورًا للجدول ${schedule.id}: ${error?.message || error}`);
      fineProcessing = { applied: 0, failure: error?.message || 'تعذر تشغيل معالجة الغرامات' };
    }
    return { ...schedule, fineProcessing };
  }

  /**
   * جلب جميع جداول المواعيد
   */
  async findAll() {
    return this.prisma.feePaymentSchedule.findMany({
      include: {
        fee: {
          include: {
            program: true,
            safe: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * جلب جدول مواعيد محدد
   */
  async findOne(id: string) {
    const schedule = await this.prisma.feePaymentSchedule.findUnique({
      where: { id },
      include: {
        fineApplications: { select: { id: true } },
        fee: {
          include: {
            program: true,
            safe: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('جدول المواعيد غير موجود');
    }

    return schedule;
  }

  /**
   * جلب جدول المواعيد حسب معرف الرسوم
   */
  async findByFeeId(feeId: number) {
    return this.prisma.feePaymentSchedule.findUnique({
      where: { feeId },
      include: {
        fee: {
          include: {
            program: true,
            safe: true,
          },
        },
      },
    });
  }

  /**
   * تحديث جدول المواعيد
   */
  async update(id: string, updateDto: UpdatePaymentScheduleDto) {
    // التحقق من وجود الجدول
    await this.findOne(id);

    // حساب التاريخ النهائي إذا تم تحديث التواريخ
    let finalDeadline = undefined;
    if (updateDto.paymentEndDate !== undefined || updateDto.gracePeriodDays !== undefined) {
      const schedule = await this.findOne(id);
      const endDate = updateDto.paymentEndDate
        ? new Date(updateDto.paymentEndDate)
        : schedule.paymentEndDate;
      const graceDays = updateDto.gracePeriodDays !== undefined
        ? updateDto.gracePeriodDays
        : schedule.gracePeriodDays;

      if (endDate) {
        const deadline = new Date(endDate);
        deadline.setUTCHours(23, 59, 59, 999);
        const days = graceDays || 0; // افتراضي 0
        deadline.setUTCDate(deadline.getUTCDate() + days);
        finalDeadline = deadline;
      } else {
        finalDeadline = null;
      }
    }

    // تحديث الجدول
    const fineSourceFee = updateDto.fineSourceFeeId !== undefined
      ? updateDto.fineSourceFeeId
        ? await this.prisma.traineeFee.findUnique({ where: { id: updateDto.fineSourceFeeId } })
        : null
      : undefined;
    if (updateDto.fineSourceFeeId && !fineSourceFee) throw new BadRequestException('الرسم المالي المختار غير موجود');
    const existingSchedule = await this.findOne(id);
    if (fineSourceFee && fineSourceFee.programId !== existingSchedule.fee.programId) throw new BadRequestException('يجب اختيار مصدر غرامة من البرنامج التدريبي نفسه');
    if (fineSourceFee && fineSourceFee.id === existingSchedule.feeId) throw new BadRequestException('اختر رسمًا ماليًا آخر ليكون مصدر الغرامة');
    const effectiveSource = fineSourceFee === undefined ? (existingSchedule.fineSourceFeeId ? {
      id: existingSchedule.fineSourceFeeId,
      amount: existingSchedule.fineSourceAmount,
      description: existingSchedule.fineSourceDescription,
    } : null) : fineSourceFee;
    const effectiveRecurrence = updateDto.fineRecurrence === undefined ? existingSchedule.fineRecurrence : updateDto.fineRecurrence;
    if (effectiveRecurrence && !effectiveSource) throw new BadRequestException('اختر رسمًا ماليًا صالحًا قبل تفعيل الغرامة');
    if (existingSchedule.fineApplications.length && updateDto.fineSourceFeeId && updateDto.fineSourceFeeId !== existingSchedule.fineSourceFeeId) {
      throw new BadRequestException('لا يمكن تغيير مصدر الغرامة بعد تطبيقها؛ احتفظ بسجلها التاريخي');
    }

    const updated = await this.prisma.feePaymentSchedule.update({
      where: { id },
      data: {
        ...updateDto,
        paymentStartDate: updateDto.paymentStartDate ? new Date(updateDto.paymentStartDate) : undefined,
        paymentEndDate: updateDto.paymentEndDate ? new Date(updateDto.paymentEndDate) : undefined,
        finalDeadline,
        ...(fineSourceFee !== undefined ? {
          fineSourceTransactionId: null,
          fineSourceFeeId: fineSourceFee?.id ?? null,
          fineSourceAmount: fineSourceFee ? Math.abs(fineSourceFee.amount) : null,
          fineSourceDescription: fineSourceFee?.name ?? null,
        } : {}),
        ...(updateDto.fineRecurrence !== undefined ? { fineRecurrence: updateDto.fineRecurrence ?? null } : {}),
      },
      include: {
        fee: {
          include: {
            program: true,
            safe: true,
          },
        },
      },
    });

    let fineProcessing;
    try {
      fineProcessing = await this.applyOverdueFinesForSchedule(updated.id);
    } catch (error: any) {
      this.logger.error(`تعذر تطبيق الغرامات المستحقة فورًا للجدول ${updated.id}: ${error?.message || error}`);
      fineProcessing = { applied: 0, failure: error?.message || 'تعذر تشغيل معالجة الغرامات' };
    }
    return { ...updated, fineProcessing };
  }

  /**
   * حذف جدول المواعيد
   */
  async remove(id: string) {
    // التحقق من وجود الجدول
    await this.findOne(id);

    const fineCount = await this.prisma.traineeFineApplication.count({ where: { scheduleId: id } });
    if (fineCount) throw new BadRequestException('لا يمكن حذف موعد السداد بعد تسجيل غرامات مرتبطة به؛ يمكن إيقاف الغرامة مع الاحتفاظ بالسجل');
    await this.prisma.feePaymentSchedule.delete({
      where: { id },
    });

    return { message: 'تم حذف جدول المواعيد بنجاح' };
  }

  @Cron('0 * * * *', { timeZone: 'Africa/Cairo' })
  async applyOverdueFines() {
    const schedules = await this.prisma.feePaymentSchedule.findMany({
      where: {
        fineRecurrence: { not: null },
        fineSourceFeeId: { not: null },
        fineSourceAmount: { gt: 0 },
        OR: [{ finalDeadline: { not: null } }, { paymentEndDate: { not: null } }],
      },
      select: { id: true },
    });
    for (const schedule of schedules) await this.applyOverdueFinesForSchedule(schedule.id);
  }

  private async applyOverdueFinesForSchedule(scheduleId: string) {
    const result = { paymentRecords: 0, unpaidRecords: 0, pendingRequests: 0, deferredRecords: 0, notYetDue: 0, applied: 0, failed: 0 };
    const now = new Date();
    const schedule = await this.prisma.feePaymentSchedule.findFirst({
      where: {
        id: scheduleId,
        fineRecurrence: { not: null },
        fineSourceFeeId: { not: null },
        fineSourceAmount: { gt: 0 },
        OR: [{ finalDeadline: { not: null } }, { paymentEndDate: { not: null } }],
      },
      include: { fee: { include: { safe: true } } },
    });
    if (!schedule) return result;
      // Support older schedules where the computed deadline was not stored.
      const scheduleDeadline = schedule.finalDeadline || (schedule.paymentEndDate ? (() => {
        const deadline = new Date(schedule.paymentEndDate!);
        deadline.setUTCHours(23, 59, 59, 999);
        deadline.setUTCDate(deadline.getUTCDate() + (schedule.gracePeriodDays || 0));
        return deadline;
      })() : null);
      if (!scheduleDeadline) return result;
      const payments = await this.prisma.traineePayment.findMany({
        where: { feeId: schedule.feeId, status: { not: 'CANCELLED' } },
        include: { trainee: { select: { nameAr: true } } },
      });
      result.paymentRecords = payments.length;
      const principalAmounts = new Map(payments.map(debt => {
        // Some older payment creation paths left feeAmount at its default of zero.
        // In that case, amount is the original fee and paidAmount is capped at that principal.
        const principal = debt.feeAmount > 0 ? debt.feeAmount : debt.amount;
        const principalPaid = debt.feeAmount > 0 ? debt.feePaidAmount : Math.min(debt.paidAmount, principal);
        return [debt.id, { principal, principalPaid }] as const;
      }));
      const debtors = payments.filter(debt => {
        const principal = principalAmounts.get(debt.id)!;
        return principal.principalPaid + 0.005 < principal.principal;
      });
      result.unpaidRecords = debtors.length;
      const exceptions = debtors.length ? await this.prisma.traineePaymentException.findMany({
        where: {
          traineeId: { in: debtors.map(debt => debt.traineeId) },
          OR: [{ feeId: schedule.feeId }, { feeId: null }],
        },
        select: { traineeId: true, feeId: true, customFinalDeadline: true, customPaymentEndDate: true, customGracePeriodDays: true },
      }) : [];
      const pendingDeferrals = debtors.length ? await this.prisma.paymentDeferralRequest.findMany({
        where: {
          traineeId: { in: debtors.map(debt => debt.traineeId) },
          feeId: schedule.feeId,
          status: 'PENDING',
        },
        select: { traineeId: true },
      }) : [];
      for (const debt of debtors) {
        // Keep the debt out of fine processing while a platform deferral request is awaiting review.
        if (pendingDeferrals.some(request => request.traineeId === debt.traineeId)) { result.pendingRequests++; continue; }
        const exception = exceptions.find(item => item.traineeId === debt.traineeId && item.feeId === schedule.feeId)
          || exceptions.find(item => item.traineeId === debt.traineeId && item.feeId === null);
        let deadline = exception?.customFinalDeadline || exception?.customPaymentEndDate || scheduleDeadline;
        if (!exception?.customFinalDeadline && exception?.customPaymentEndDate) {
          deadline = new Date(exception.customPaymentEndDate);
          deadline.setUTCHours(23, 59, 59, 999);
          deadline.setUTCDate(deadline.getUTCDate() + (exception.customGracePeriodDays || 0));
        }
        if (now <= deadline) { result.notYetDue++; continue; }
        // Monthly periods are anchored to the final due date; each period key is unique, making hourly retries safe.
        const elapsedMonths = Math.max(0, (now.getUTCFullYear() - deadline.getUTCFullYear()) * 12 + now.getUTCMonth() - deadline.getUTCMonth());
        const periods = schedule.fineRecurrence === 'ONCE' ? [0] : Array.from({ length: elapsedMonths + 1 }, (_, i) => i);
        for (const period of periods) {
          const periodDate = new Date(Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + period, 1));
          const periodKey = schedule.fineRecurrence === 'ONCE' ? 'ONCE' : `${periodDate.getUTCFullYear()}-${String(periodDate.getUTCMonth() + 1).padStart(2, '0')}`;
          try {
            const applied = await this.prisma.$transaction(async (tx) => {
              const pendingDeferral = await tx.paymentDeferralRequest.findFirst({
                where: { traineeId: debt.traineeId, feeId: schedule.feeId, status: 'PENDING' },
                select: { id: true },
              });
              if (pendingDeferral) return false;
              const currentDebt = await tx.traineePayment.findUnique({ where: { id: debt.id }, select: { amount: true, feeAmount: true, paidAmount: true, feePaidAmount: true, status: true } });
              if (!currentDebt || currentDebt.status === 'CANCELLED') return false;
              const principal = currentDebt.feeAmount > 0 ? currentDebt.feeAmount : currentDebt.amount;
              const principalPaid = currentDebt.feeAmount > 0 ? currentDebt.feePaidAmount : Math.min(currentDebt.paidAmount, principal);
              if (principalPaid + 0.005 >= principal) return false;
              const duplicate = await tx.traineeFineApplication.findUnique({ where: { traineePaymentId_periodKey: { traineePaymentId: debt.id, periodKey } } });
              if (duplicate) return false;
              const fineAmount = Math.abs(schedule.fineSourceAmount!);
              await tx.traineeFineApplication.create({ data: {
                scheduleId: schedule.id, traineePaymentId: debt.id,
                sourceTransactionId: null,
                sourceFeeId: schedule.fineSourceFeeId!,
                sourceDescription: schedule.fineSourceDescription || 'رسم مالي',
                sourceAmount: fineAmount, recurrence: schedule.fineRecurrence!, periodKey, amount: fineAmount,
              } });
              const changed = await tx.traineePayment.updateMany({
                where: { id: debt.id, status: { not: 'CANCELLED' }, amount: currentDebt.amount, paidAmount: currentDebt.paidAmount },
                data: {
                  amount: { increment: fineAmount },
                  feeAmount: principal,
                  feePaidAmount: principalPaid,
                  status: currentDebt.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING',
                },
              });
              if (changed.count !== 1) throw new Error('تغيرت حالة المديونية أثناء تطبيق الغرامة');
              await tx.safe.update({ where: { id: schedule.fee.safeId }, data: { balance: { decrement: fineAmount } } });
              await tx.transaction.create({ data: {
                amount: fineAmount, type: 'FEE', sourceId: schedule.fee.safeId,
                traineeFeeId: schedule.feeId, traineePaymentId: debt.id,
                description: `غرامة ${periodKey} على رسم ${schedule.fee.name} للمتدرب ${debt.trainee.nameAr} — ${schedule.fineSourceDescription || 'رسم مالي'}`,
              } });
              return true;
            });
            if (applied) result.applied++;
          } catch (error: any) {
            if (error?.code !== 'P2002') {
              result.failed++;
              this.logger.error(`تعذر تطبيق غرامة للمديونية ${debt.id}: ${error?.message || error}`);
            }
          }
          if (schedule.fineRecurrence === 'ONCE') break;
        }
      }
      result.deferredRecords = exceptions.filter(item => {
        const effective = item.customFinalDeadline || item.customPaymentEndDate;
        return effective && now <= effective;
      }).length;
      return result;
  }

  async getFinesReport() {
    return this.prisma.traineeFineApplication.findMany({
      include: { schedule: { include: { fee: { include: { program: true } } } }, traineePayment: { include: { trainee: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }
}
