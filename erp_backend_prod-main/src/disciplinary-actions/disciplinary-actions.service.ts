import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisciplinaryActionDto, DisciplinaryActionType } from './dto/create-disciplinary-action.dto';
import { UpdateDisciplinaryActionDto, DisciplinaryActionStatus } from './dto/update-disciplinary-action.dto';

@Injectable()
export class DisciplinaryActionsService {
  constructor(private prisma: PrismaService) {}

  // إنشاء إجراء عقابي جديد
  async create(createDto: CreateDisciplinaryActionDto, createdBy: string) {
    const { traineeId, actionType, reason, startDate, endDate, notes, guardianNotified, guardianNotificationDate } = createDto;

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من التواريخ للفصل المؤقت
    if (actionType === DisciplinaryActionType.TEMPORARY_SUSPENSION) {
      if (!startDate || !endDate) {
        throw new BadRequestException('يجب تحديد تاريخ البداية والنهاية للفصل المؤقت');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }

      // مقارنة التواريخ فقط (بدون الوقت)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(start);
      startDateOnly.setHours(0, 0, 0, 0);

      if (startDateOnly < today) {
        throw new BadRequestException('تاريخ البداية يجب أن يكون اليوم أو في المستقبل');
      }
    }

    // إنشاء الإجراء
    const action = await this.prisma.disciplinaryAction.create({
      data: {
        traineeId,
        actionType,
        reason,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes,
        guardianNotified: guardianNotified || false,
        guardianNotificationDate: guardianNotificationDate ? new Date(guardianNotificationDate) : null,
        createdBy,
        status: 'ACTIVE',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            guardianPhone: true,
            guardianName: true,
          }
        }
      }
    });

    console.log(`🚫 [DisciplinaryAction] تم اتخاذ إجراء ${actionType} ضد المتدرب ${trainee.nameAr}`);

    return {
      success: true,
      message: 'تم اتخاذ الإجراء العقابي بنجاح',
      action,
    };
  }

  // جلب جميع الإجراءات العقابية لمتدرب
  async getTraineeActions(traineeId: number) {
    return this.prisma.disciplinaryAction.findMany({
      where: { traineeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // جلب الإجراءات النشطة لمتدرب
  async getActiveActions(traineeId: number) {
    return this.prisma.disciplinaryAction.findMany({
      where: {
        traineeId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // فحص إذا كان المتدرب مفصول حالياً
  async isTraineeSuspended(traineeId: number): Promise<{
    isSuspended: boolean;
    suspensionType?: 'TEMPORARY' | 'PERMANENT';
    suspensionEnds?: Date;
    reason?: string;
    actionId?: string;
  }> {
    const now = new Date();

    // فحص الفصل النهائي
    const permanentExpulsion = await this.prisma.disciplinaryAction.findFirst({
      where: {
        traineeId,
        actionType: 'PERMANENT_EXPULSION',
        status: 'ACTIVE',
      },
    });

    if (permanentExpulsion) {
      console.log(`🚫 [DisciplinaryCheck] المتدرب ${traineeId} مفصول نهائياً`);
      return {
        isSuspended: true,
        suspensionType: 'PERMANENT',
        reason: permanentExpulsion.reason,
        actionId: permanentExpulsion.id,
      };
    }

    // فحص الفصل المؤقت
    const temporarySuspension = await this.prisma.disciplinaryAction.findFirst({
      where: {
        traineeId,
        actionType: 'TEMPORARY_SUSPENSION',
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (temporarySuspension) {
      console.log(`🚫 [DisciplinaryCheck] المتدرب ${traineeId} مفصول مؤقتاً حتى ${temporarySuspension.endDate}`);
      return {
        isSuspended: true,
        suspensionType: 'TEMPORARY',
        suspensionEnds: temporarySuspension.endDate!,
        reason: temporarySuspension.reason,
        actionId: temporarySuspension.id,
      };
    }

    return { isSuspended: false };
  }

  // تحديث حالة الإجراء
  async update(id: string, updateDto: UpdateDisciplinaryActionDto, updatedBy: string) {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException('الإجراء العقابي غير موجود');
    }

    // إذا كان الإلغاء، إضافة معلومات الإلغاء
    const updateData: any = { ...updateDto };
    
    if (updateDto.status === DisciplinaryActionStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = updatedBy;
      console.log(`✅ [DisciplinaryAction] تم إلغاء الإجراء ${id}`);
    }

    if (updateDto.status === DisciplinaryActionStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.completedBy = updatedBy;
      console.log(`✅ [DisciplinaryAction] تم إكمال الإجراء ${id}`);
    }

    return this.prisma.disciplinaryAction.update({
      where: { id },
      data: updateData,
    });
  }

  // حذف إجراء عقابي
  async delete(id: string) {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException('الإجراء العقابي غير موجود');
    }

    await this.prisma.disciplinaryAction.delete({
      where: { id },
    });

    console.log(`🗑️ [DisciplinaryAction] تم حذف الإجراء ${id}`);

    return { success: true, message: 'تم حذف الإجراء العقابي' };
  }

  // جلب جميع الإجراءات العقابية (مع فلترة)
  async getAll(filters?: {
    traineeId?: number;
    actionType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    allowedProgramIds?: number[];
  }) {
    const where: any = {};

    if (filters?.traineeId) where.traineeId = filters.traineeId;
    if (filters?.actionType) where.actionType = filters.actionType;
    if (filters?.status) where.status = filters.status;
    
    if (filters?.fromDate) {
      where.createdAt = { gte: new Date(filters.fromDate) };
    }
    
    if (filters?.toDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(filters.toDate),
      };
    }

    // فلتر البرامج المسموحة
    if (filters?.allowedProgramIds) {
      where.trainee = { ...where.trainee, programId: { in: filters.allowedProgramIds } };
    }

    return this.prisma.disciplinaryAction.findMany({
      where,
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            program: { select: { nameAr: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // إحصائيات الإجراءات العقابية
  async getStats(allowedProgramIds?: number[]) {
    const baseWhere = allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {};
    
    const [total, active, byType, byStatus] = await Promise.all([
      this.prisma.disciplinaryAction.count({ where: baseWhere }),
      this.prisma.disciplinaryAction.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['actionType'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      byType,
      byStatus,
    };
  }
}