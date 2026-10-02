import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { PaymentRemindersService } from './payment-reminders.service';
import { ReminderTriggerType } from './dto/create-reminder-template.dto';

@Injectable()
export class PaymentRemindersSchedulerService {
  private readonly logger = new Logger(PaymentRemindersSchedulerService.name);
  private processingTemplates = new Set<string>(); // لتجنب المعالجة المتزامنة

  constructor(
    private prisma: PrismaService,
    private whatsappService: UnifiedWhatsAppService,
    private remindersService: PaymentRemindersService,
  ) {}

  /**
   * Cron Job - يعمل كل ساعة للبحث عن رسائل مجدولة
   * يعمل عند الدقيقة 0 من كل ساعة (00:00, 01:00, 02:00, ...)
   */
  @Cron('0 * * * *', {
    name: 'process-payment-reminders',
    timeZone: 'Africa/Cairo',
  })
  async processPendingReminders() {
    this.logger.log('🔍 [Reminders Cron] بدء فحص الرسائل المجدولة...');

    const now = new Date();
    
    try {
      // 1. جلب جميع القوالب النشطة
      const activeTemplates = await this.prisma.paymentReminderTemplate.findMany({
        where: { isActive: true },
        include: {
          fee: {
            include: {
              paymentSchedule: true,
              program: true,
            },
          },
        },
      });

      this.logger.log(`📋 [Reminders Cron] وجد ${activeTemplates.length} رسالة نشطة`);

      // 2. لكل قالب، فحص إذا حان وقته
      for (const template of activeTemplates) {
        // تجنب المعالجة المتزامنة لنفس القالب
        if (this.processingTemplates.has(template.id)) {
          this.logger.warn(`⏭️ [Reminders] تخطي "${template.name}" - قيد المعالجة حالياً`);
          continue;
        }

        const shouldTrigger = await this.shouldTriggerReminder(template, now);

        if (shouldTrigger) {
          this.logger.log(`⏰ [Reminder] حان وقت "${template.name}"`);
          
          // معالجة بشكل غير متزامن
          this.scheduleAndProcessDeliveries(template).catch(error => {
            this.logger.error(`❌ خطأ في معالجة "${template.name}":`, error);
          });
        }
      }

      this.logger.log('✅ [Reminders Cron] اكتمل الفحص');
    } catch (error) {
      this.logger.error('❌ [Reminders Cron] خطأ في المعالجة:', error);
    }
  }

  /**
   * فحص: هل حان وقت إرسال هذه الرسالة؟
   */
  private async shouldTriggerReminder(template: any, now: Date): Promise<boolean> {
    const schedule = template.fee.paymentSchedule;

    if (!schedule) {
      return false;
    }

    // التحقق من عدم الإرسال اليوم (رسالة واحدة في اليوم لكل قالب)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const alreadyScheduledToday = await this.prisma.paymentReminderDelivery.count({
      where: {
        templateId: template.id,
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (alreadyScheduledToday > 0) {
      this.logger.debug(`⏭️ [Reminder] "${template.name}" تم جدولته اليوم بالفعل`);
      return false;
    }

    // فحص حسب نوع التوقيت
    switch (template.triggerType) {
      case ReminderTriggerType.PAYMENT_START:
        return this.isSameDate(now, schedule.paymentStartDate);

      case ReminderTriggerType.PAYMENT_END:
        return this.isSameDate(now, schedule.paymentEndDate);

      case ReminderTriggerType.GRACE_START:
        // بداية فترة السماح = نهاية موعد السداد
        return this.isSameDate(now, schedule.paymentEndDate);

      case ReminderTriggerType.GRACE_END:
        // نهاية فترة السماح = الموعد النهائي
        return this.isSameDate(now, schedule.finalDeadline);

      case ReminderTriggerType.CUSTOM_DATE:
        return this.isSameDate(now, template.customTriggerDate);

      case ReminderTriggerType.DAYS_BEFORE_END:
        if (schedule.finalDeadline && template.daysOffset) {
          const targetDate = new Date(schedule.finalDeadline);
          targetDate.setDate(targetDate.getDate() - template.daysOffset);
          return this.isSameDate(now, targetDate);
        }
        return false;

      case ReminderTriggerType.DAYS_AFTER_START:
        if (schedule.paymentStartDate && template.daysOffset) {
          const targetDate = new Date(schedule.paymentStartDate);
          targetDate.setDate(targetDate.getDate() + template.daysOffset);
          return this.isSameDate(now, targetDate);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * جدولة ومعالجة الإرسال
   */
  private async scheduleAndProcessDeliveries(template: any) {
    this.processingTemplates.add(template.id);

    try {
      // 1. جلب المتدربين المؤهلين (غير مسددين للرسم)
      const unpaidPayments = await this.prisma.traineePayment.findMany({
        where: {
          feeId: template.feeId,
          status: {
            in: ['PENDING', 'PARTIALLY_PAID'],
          },
        },
        include: {
          trainee: {
            include: {
              program: true,
            },
          },
          fee: true,
        },
      });

      // فلترة: فقط من لديه متبقي > 0 ورقم هاتف
      const qualifiedPayments = unpaidPayments.filter(p => {
        const remaining = p.amount - (p.paidAmount || 0);
        return remaining > 0 && p.trainee.phone;
      });

      this.logger.log(`👥 [Reminder] ${qualifiedPayments.length} متدرب مؤهل لـ "${template.name}"`);

      if (qualifiedPayments.length === 0) {
        this.logger.log(`ℹ️ [Reminder] لا يوجد متدربين مؤهلين لـ "${template.name}"`);
        return;
      }

      // 2. إنشاء سجلات الإرسال
      const deliveries = qualifiedPayments.map(payment => {
        const remainingAmount = payment.amount - (payment.paidAmount || 0);
        const processedMessage = this.remindersService.processMessageVariables(
          template.message,
          payment,
          payment.fee,
          payment.trainee
        );

        return {
          templateId: template.id,
          traineeId: payment.traineeId,
          phoneNumber: payment.trainee.phone,
          message: processedMessage,
          status: 'SCHEDULED' as const,
          scheduledAt: new Date(),
          paymentStatus: payment.status as string,
          paidAmount: payment.paidAmount || 0,
          remainingAmount,
        };
      });

      // حفظ في قاعدة البيانات
      await this.prisma.paymentReminderDelivery.createMany({
        data: deliveries,
        skipDuplicates: true, // تجنب التكرار
      });

      this.logger.log(`✅ [Reminder] تم جدولة ${deliveries.length} رسالة لـ "${template.name}"`);

      // 3. بدء المعالجة الفعلية
      await this.processDeliveries(template.id, template.delayBetweenMessages);

    } catch (error) {
      this.logger.error(`❌ [Reminder] خطأ في جدولة "${template.name}":`, error);
    } finally {
      this.processingTemplates.delete(template.id);
    }
  }

  /**
   * معالجة الإرسال الفعلي (متسلسل مع مؤقت)
   */
  private async processDeliveries(templateId: string, delaySeconds: number) {
    try {
      // جلب أول رسالة مجدولة
      const pending = await this.prisma.paymentReminderDelivery.findFirst({
        where: {
          templateId,
          status: 'SCHEDULED',
        },
        include: {
          trainee: {
            include: {
              program: true,
            },
          },
          template: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!pending) {
        this.logger.log(`✅ [Delivery] اكتملت جميع الإرسالات للقالب ${templateId}`);
        return;
      }

      const trainee = pending.trainee;

      // التحقق مرة أخرى: هل دفع المتدرب في هذه الأثناء؟
      const currentPayment = await this.prisma.traineePayment.findFirst({
        where: {
          feeId: pending.template.feeId,
          traineeId: pending.traineeId,
        },
      });

      if (currentPayment && currentPayment.status === 'PAID') {
        // المتدرب دفع - تخطي
        await this.prisma.paymentReminderDelivery.update({
          where: { id: pending.id },
          data: {
            status: 'SKIPPED',
            sentAt: new Date(),
          },
        });

        this.logger.log(`⏭️ [Delivery] تم تخطي ${trainee.nameAr} - دفع الرسم بالكامل`);

        // المتابعة للتالي
        setTimeout(() => {
          this.processDeliveries(templateId, delaySeconds);
        }, 1000);
        return;
      }

      // محاولة الإرسال
      try {
        // تحديث الحالة
        await this.prisma.paymentReminderDelivery.update({
          where: { id: pending.id },
          data: { status: 'SENDING' },
        });

        // التحقق من جاهزية WhatsApp
        const isReady = await this.whatsappService.isClientReallyReady();
        if (!isReady) {
          throw new Error('WhatsApp client not ready');
        }

        // إرسال الرسالة
        const success = await this.whatsappService.sendMessage(
          pending.phoneNumber,
          pending.message,
          pending.template.createdBy
        );

        if (success) {
          // نجح الإرسال
          await this.prisma.paymentReminderDelivery.update({
            where: { id: pending.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          this.logger.log(`✅ [Delivery] تم إرسال التذكير لـ ${trainee.nameAr}`);
        } else {
          throw new Error('فشل إرسال الرسالة');
        }

      } catch (error) {
        // فشل الإرسال
        const newRetryCount = pending.retryCount + 1;
        const isFinalFailure = newRetryCount >= 3;

        await this.prisma.paymentReminderDelivery.update({
          where: { id: pending.id },
          data: {
            status: isFinalFailure ? 'FAILED' : 'SCHEDULED',
            failedAt: new Date(),
            errorMessage: error.message,
            retryCount: newRetryCount,
          },
        });

        this.logger.error(
          `❌ [Delivery] فشل إرسال التذكير لـ ${trainee.nameAr} (محاولة ${newRetryCount}/3): ${error.message}`
        );
      }

      // جدولة الرسالة التالية بعد التأخير المحدد
      setTimeout(() => {
        this.processDeliveries(templateId, delaySeconds);
      }, delaySeconds * 1000);

    } catch (error) {
      this.logger.error(`❌ [Delivery] خطأ في معالجة الإرسالات:`, error);
    }
  }

  /**
   * مقارنة تاريخين (نفس اليوم)
   */
  private isSameDate(date1: Date, date2: Date | null): boolean {
    if (!date2) return false;

    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * إرسال تجريبي لرسالة (لاختبار المحتوى)
   */
  async sendTestReminder(templateId: string, testTraineeId: number, userId: string) {
    try {
      const template = await this.remindersService.findOne(templateId);

      // جلب متدرب تجريبي
      const payment = await this.prisma.traineePayment.findFirst({
        where: {
          feeId: template.feeId,
          traineeId: testTraineeId,
        },
        include: {
          trainee: {
            include: {
              program: true,
            },
          },
          fee: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('المتدرب غير موجود أو لا يوجد رسوم مطبقة عليه');
      }

      if (!payment.trainee.phone) {
        throw new BadRequestException('المتدرب ليس لديه رقم هاتف');
      }

      // معالجة المتغيرات
      const processedMessage = this.remindersService.processMessageVariables(
        template.message,
        payment,
        payment.fee,
        payment.trainee
      );

      // إرسال الرسالة
      const success = await this.whatsappService.sendMessage(
        payment.trainee.phone,
        processedMessage,
        userId
      );

      if (success) {
        this.logger.log(`✅ [Test] تم إرسال رسالة تجريبية لـ ${payment.trainee.nameAr}`);
        return {
          success: true,
          message: `تم إرسال الرسالة التجريبية لـ ${payment.trainee.nameAr} بنجاح`,
          trainee: {
            name: payment.trainee.nameAr,
            phone: payment.trainee.phone,
          },
        };
      } else {
        throw new Error('فشل إرسال الرسالة');
      }

    } catch (error) {
      this.logger.error('[Test] خطأ في الإرسال التجريبي:', error);
      throw error;
    }
  }

  /**
   * إعادة محاولة إرسال الرسائل الفاشلة
   */
  async retryFailedDeliveries(templateId: string) {
    try {
      // جلب الرسائل الفاشلة (retryCount < 3)
      const failedDeliveries = await this.prisma.paymentReminderDelivery.findMany({
        where: {
          templateId,
          status: 'FAILED',
          retryCount: { lt: 3 },
        },
      });

      if (failedDeliveries.length === 0) {
        return { message: 'لا توجد رسائل فاشلة قابلة لإعادة المحاولة' };
      }

      // إعادة جدولتها
      await this.prisma.paymentReminderDelivery.updateMany({
        where: {
          id: { in: failedDeliveries.map(d => d.id) },
        },
        data: {
          status: 'SCHEDULED',
          failedAt: null,
          errorMessage: null,
        },
      });

      this.logger.log(`🔄 [Retry] تمت إعادة جدولة ${failedDeliveries.length} رسالة فاشلة`);

      // بدء المعالجة
      const template = await this.remindersService.findOne(templateId);
      await this.processDeliveries(templateId, template.delayBetweenMessages);

      return {
        message: `تمت إعادة جدولة ${failedDeliveries.length} رسالة بنجاح`,
        count: failedDeliveries.length,
      };

    } catch (error) {
      this.logger.error('[Retry] خطأ في إعادة المحاولة:', error);
      throw error;
    }
  }

  /**
   * جدولة فورية (للتشغيل اليدوي من الإدارة)
   */
  async triggerManually(templateId: string, userId: string) {
    try {
      const template = await this.remindersService.findOne(templateId);

      this.logger.log(`🚀 [Manual] تشغيل يدوي لـ "${template.name}" بواسطة ${userId}`);

      await this.scheduleAndProcessDeliveries(template);

      return {
        success: true,
        message: `تم تشغيل الرسالة "${template.name}" يدوياً`,
      };
    } catch (error) {
      this.logger.error('[Manual] خطأ في التشغيل اليدوي:', error);
      throw error;
    }
  }
}