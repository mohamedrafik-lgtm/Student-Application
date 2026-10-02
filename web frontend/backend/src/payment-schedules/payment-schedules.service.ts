import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';

@Injectable()
export class PaymentSchedulesService {
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
      const graceDays = createDto.gracePeriodDays || 0; // افتراضي 0 إذا لم يُحدد
      endDate.setDate(endDate.getDate() + graceDays);
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

    return schedule;
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
        const days = graceDays || 0; // افتراضي 0
        deadline.setDate(deadline.getDate() + days);
        finalDeadline = deadline;
      } else {
        finalDeadline = null;
      }
    }

    // تحديث الجدول
    const updated = await this.prisma.feePaymentSchedule.update({
      where: { id },
      data: {
        ...updateDto,
        paymentStartDate: updateDto.paymentStartDate ? new Date(updateDto.paymentStartDate) : undefined,
        paymentEndDate: updateDto.paymentEndDate ? new Date(updateDto.paymentEndDate) : undefined,
        finalDeadline,
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

    return updated;
  }

  /**
   * حذف جدول المواعيد
   */
  async remove(id: string) {
    // التحقق من وجود الجدول
    await this.findOne(id);

    await this.prisma.feePaymentSchedule.delete({
      where: { id },
    });

    return { message: 'تم حذف جدول المواعيد بنجاح' };
  }
}