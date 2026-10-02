import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MessageTemplatesService } from '../whatsapp/templates.service';
import { CreateReminderTemplateDto, ReminderTriggerType } from './dto/create-reminder-template.dto';
import { UpdateReminderTemplateDto } from './dto/update-reminder-template.dto';

@Injectable()
export class PaymentRemindersService {
  private readonly logger = new Logger(PaymentRemindersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private templatesService: MessageTemplatesService,
  ) {}

  /**
   * إنشاء قالب رسالة تذكيرية جديد
   */
  async create(dto: CreateReminderTemplateDto, userId: string) {
    try {
      // 1. التحقق من وجود الرسم
      const fee = await this.prisma.traineeFee.findUnique({
        where: { id: dto.feeId },
        include: { paymentSchedule: true, program: true }
      });

      if (!fee) {
        throw new NotFoundException('الرسم غير موجود');
      }

      // 2. التحقق من وجود جدول سداد
      if (!fee.paymentSchedule) {
        throw new BadRequestException(
          'الرسم ليس له موعد سداد محدد. يجب إنشاء موعد سداد أولاً من صفحة مواعيد السداد.'
        );
      }

      // 3. التحقق من التوقيت المخصص
      if (dto.triggerType === ReminderTriggerType.CUSTOM_DATE && !dto.customTriggerDate) {
        throw new BadRequestException('يجب تحديد تاريخ مخصص عند اختيار توقيت مخصص');
      }

      // 4. التحقق من daysOffset
      if (
        (dto.triggerType === ReminderTriggerType.DAYS_BEFORE_END || 
         dto.triggerType === ReminderTriggerType.DAYS_AFTER_START) &&
        !dto.daysOffset
      ) {
        throw new BadRequestException('يجب تحديد عدد الأيام لهذا النوع من التوقيت');
      }

      // 5. إنشاء القالب
      const template = await this.prisma.paymentReminderTemplate.create({
        data: {
          name: dto.name,
          message: dto.message,
          description: dto.description,
          feeId: dto.feeId,
          triggerType: dto.triggerType,
          customTriggerDate: dto.customTriggerDate ? new Date(dto.customTriggerDate) : null,
          daysOffset: dto.daysOffset,
          delayBetweenMessages: dto.delayBetweenMessages || 30,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdBy: userId,
        },
        include: {
          fee: {
            include: {
              program: true,
              paymentSchedule: true,
            },
          },
        },
      });

      // 6. تسجيل في Audit Log
      await this.auditService.log({
        action: 'CREATE' as any,
        entity: 'PaymentReminderTemplate',
        entityId: template.id,
        userId,
        details: {
          message: `إنشاء رسالة تذكيرية "${template.name}" للرسم "${fee.name}"`,
          feeName: fee.name,
          triggerType: template.triggerType,
        },
      });

      this.logger.log(`✅ تم إنشاء رسالة تذكيرية "${template.name}" بواسطة ${userId}`);

      return template;
    } catch (error) {
      this.logger.error('خطأ في إنشاء رسالة تذكيرية:', error);
      throw error;
    }
  }

  /**
   * جلب جميع القوالب مع إمكانية الفلترة
   */
  async findAll(filters?: { feeId?: number; isActive?: boolean; programId?: number }) {
    try {
      const where: any = {};

      if (filters?.feeId) {
        where.feeId = filters.feeId;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.programId) {
        where.fee = {
          programId: filters.programId,
        };
      }

      const templates = await this.prisma.paymentReminderTemplate.findMany({
        where,
        include: {
          fee: {
            include: {
              program: true,
              paymentSchedule: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return templates;
    } catch (error) {
      this.logger.error('خطأ في جلب القوالب:', error);
      throw error;
    }
  }

  /**
   * جلب قالب محدد بالتفاصيل
   */
  async findOne(id: string) {
    try {
      const template = await this.prisma.paymentReminderTemplate.findUnique({
        where: { id },
        include: {
          fee: {
            include: {
              program: true,
              paymentSchedule: true,
            },
          },
          deliveries: {
            include: {
              trainee: {
                select: {
                  id: true,
                  nameAr: true,
                  phone: true,
                  program: {
                    select: {
                      nameAr: true,
                    },
                  },
                },
              },
            },
            orderBy: { scheduledAt: 'desc' },
          },
        },
      });

      if (!template) {
        throw new NotFoundException('الرسالة التذكيرية غير موجودة');
      }

      return template;
    } catch (error) {
      this.logger.error(`خطأ في جلب القالب ${id}:`, error);
      throw error;
    }
  }

  /**
   * تحديث قالب
   */
  async update(id: string, dto: UpdateReminderTemplateDto, userId: string) {
    try {
      // التحقق من وجود القالب
      const existing = await this.findOne(id);

      // التحقق من التوقيت المخصص
      if (dto.triggerType === ReminderTriggerType.CUSTOM_DATE && !dto.customTriggerDate) {
        throw new BadRequestException('يجب تحديد تاريخ مخصص عند اختيار توقيت مخصص');
      }

      const updated = await this.prisma.paymentReminderTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          message: dto.message,
          description: dto.description,
          triggerType: dto.triggerType,
          customTriggerDate: dto.customTriggerDate ? new Date(dto.customTriggerDate) : undefined,
          daysOffset: dto.daysOffset,
          delayBetweenMessages: dto.delayBetweenMessages,
          isActive: dto.isActive,
        },
        include: {
          fee: {
            include: {
              program: true,
              paymentSchedule: true,
            },
          },
        },
      });

      // تسجيل في Audit Log
      await this.auditService.log({
        action: 'UPDATE' as any,
        entity: 'PaymentReminderTemplate',
        entityId: id,
        userId,
        details: {
          message: `تحديث رسالة تذكيرية "${updated.name}"`,
          changes: dto,
        },
      });

      this.logger.log(`✅ تم تحديث رسالة "${updated.name}" بواسطة ${userId}`);

      return updated;
    } catch (error) {
      this.logger.error(`خطأ في تحديث القالب ${id}:`, error);
      throw error;
    }
  }

  /**
   * حذف قالب
   */
  async remove(id: string, userId: string) {
    try {
      const template = await this.findOne(id);

      await this.prisma.paymentReminderTemplate.delete({
        where: { id },
      });

      // تسجيل في Audit Log
      await this.auditService.log({
        action: 'DELETE' as any,
        entity: 'PaymentReminderTemplate',
        entityId: id,
        userId,
        details: {
          message: `حذف رسالة تذكيرية "${template.name}"`,
          feeName: template.fee.name,
        },
      });

      this.logger.log(`✅ تم حذف رسالة "${template.name}" بواسطة ${userId}`);

      return { message: 'تم حذف الرسالة التذكيرية بنجاح' };
    } catch (error) {
      this.logger.error(`خطأ في حذف القالب ${id}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات القوالب
   */
  async getStats(filters?: { feeId?: number; programId?: number }) {
    try {
      const where: any = {};

      if (filters?.feeId) {
        where.feeId = filters.feeId;
      }

      if (filters?.programId) {
        where.fee = {
          programId: filters.programId,
        };
      }

      const [total, active, byTriggerType, totalDeliveries, sentDeliveries, failedDeliveries] = await Promise.all([
        this.prisma.paymentReminderTemplate.count({ where }),
        this.prisma.paymentReminderTemplate.count({ where: { ...where, isActive: true } }),
        this.prisma.paymentReminderTemplate.groupBy({
          by: ['triggerType'],
          where,
          _count: true,
        }),
        this.prisma.paymentReminderDelivery.count({
          where: where.feeId ? { template: { feeId: where.feeId } } : {},
        }),
        this.prisma.paymentReminderDelivery.count({
          where: {
            ...(where.feeId ? { template: { feeId: where.feeId } } : {}),
            status: 'SENT',
          },
        }),
        this.prisma.paymentReminderDelivery.count({
          where: {
            ...(where.feeId ? { template: { feeId: where.feeId } } : {}),
            status: 'FAILED',
          },
        }),
      ]);

      const successRate = totalDeliveries > 0 ? ((sentDeliveries / totalDeliveries) * 100).toFixed(1) : '0';

      return {
        total,
        active,
        inactive: total - active,
        byTriggerType,
        deliveries: {
          total: totalDeliveries,
          sent: sentDeliveries,
          failed: failedDeliveries,
          pending: totalDeliveries - sentDeliveries - failedDeliveries,
          successRate: parseFloat(successRate),
        },
      };
    } catch (error) {
      this.logger.error('خطأ في جلب الإحصائيات:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات إرسال قالب محدد
   */
  async getDeliveryStats(templateId: string) {
    try {
      const [total, sent, failed, pending, scheduled, skipped] = await Promise.all([
        this.prisma.paymentReminderDelivery.count({ where: { templateId } }),
        this.prisma.paymentReminderDelivery.count({ where: { templateId, status: 'SENT' } }),
        this.prisma.paymentReminderDelivery.count({ where: { templateId, status: 'FAILED' } }),
        this.prisma.paymentReminderDelivery.count({ where: { templateId, status: 'PENDING' } }),
        this.prisma.paymentReminderDelivery.count({ where: { templateId, status: 'SCHEDULED' } }),
        this.prisma.paymentReminderDelivery.count({ where: { templateId, status: 'SKIPPED' } }),
      ]);

      const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';

      return {
        total,
        sent,
        failed,
        pending,
        scheduled,
        skipped,
        successRate: parseFloat(successRate),
      };
    } catch (error) {
      this.logger.error(`خطأ في جلب إحصائيات الإرسال للقالب ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * جلب سجلات الإرسال لقالب محدد
   */
  async getDeliveries(
    templateId: string,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { templateId };

      if (filters?.status && filters.status !== 'ALL') {
        where.status = filters.status;
      }

      const [deliveries, total] = await Promise.all([
        this.prisma.paymentReminderDelivery.findMany({
          where,
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                phone: true,
                program: {
                  select: {
                    nameAr: true,
                  },
                },
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.paymentReminderDelivery.count({ where }),
      ]);

      return {
        data: deliveries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`خطأ في جلب سجلات الإرسال للقالب ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * معالجة المتغيرات في الرسالة
   */
  processMessageVariables(content: string, payment: any, fee: any, trainee: any): string {
    const remainingAmount = payment.amount - (payment.paidAmount || 0);
    
    const data = {
      trainee_name: trainee.nameAr,
      fee_name: fee.name,
      fee_amount: payment.amount.toLocaleString('ar-EG'),
      remaining_amount: remainingAmount.toLocaleString('ar-EG'),
      paid_amount: (payment.paidAmount || 0).toLocaleString('ar-EG'),
      program_name: trainee.program?.nameAr || 'غير محدد',
      registration_number: trainee.id.toString().padStart(6, '0'),
      current_date: new Date().toLocaleDateString('ar-EG'),
      current_time: new Date().toLocaleTimeString('ar-EG'),
    };

    return this.templatesService.processTemplate(content, data);
  }

  /**
   * الحصول على القوالب حسب الرسم
   */
  async findByFee(feeId: number) {
    try {
      return await this.prisma.paymentReminderTemplate.findMany({
        where: { feeId },
        include: {
          fee: {
            include: {
              program: true,
              paymentSchedule: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
        orderBy: [
          { triggerType: 'asc' },
          { customTriggerDate: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`خطأ في جلب القوالب للرسم ${feeId}:`, error);
      throw error;
    }
  }
}