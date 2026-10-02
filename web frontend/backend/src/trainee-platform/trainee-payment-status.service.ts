import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NonPaymentAction } from '@prisma/client';
import { DisciplinaryActionsService } from '../disciplinary-actions/disciplinary-actions.service';

export interface PaymentStatusResult {
  status: 'ACTIVE' | 'PAYMENT_DUE' | 'BLOCKED';
  message: string;
  canAccessPlatform: boolean;
  canAccessQuizzes: boolean;
  canAccessAttendance: boolean;
  blockReason?: string;
  overduePayments?: OverduePaymentInfo[];
  upcomingPayments?: UpcomingPaymentInfo[];
  blockedFeatures?: NonPaymentAction[];
}

export interface OverduePaymentInfo {
  feeId: number;
  feeName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  deadline: Date;
  daysOverdue: number;
  actions: NonPaymentAction[];
}

export interface UpcomingPaymentInfo {
  feeId: number;
  feeName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: Date | null;
  endDate: Date | null;
  finalDeadline: Date | null;
  daysRemaining: number;
}

@Injectable()
export class TraineePaymentStatusService {
  constructor(
    private prisma: PrismaService,
    private disciplinaryActionsService: DisciplinaryActionsService,
  ) {}

  /**
   * فحص حالة الدفع الشاملة للمتدرب
   * يتحقق من جميع الرسوم وجداول السداد والاستثناءات
   */
  async checkTraineePaymentStatus(traineeId: number): Promise<PaymentStatusResult> {
    console.log(`🔍 [PaymentStatus] فحص حالة الدفع للمتدرب ${traineeId}`);

    // 0. فحص الفصل أولاً (أعلى أولوية)
    const suspensionCheck = await this.disciplinaryActionsService.isTraineeSuspended(traineeId);
    
    if (suspensionCheck.isSuspended) {
      console.log(`🚫 [PaymentStatus] المتدرب مفصول - النوع: ${suspensionCheck.suspensionType}`);
      
      // تنسيق التاريخ بشكل واضح
      let suspensionMessage = 'تم فصلك نهائياً من البرنامج التدريبي';
      if (suspensionCheck.suspensionType === 'TEMPORARY' && suspensionCheck.suspensionEnds) {
        const endDate = new Date(suspensionCheck.suspensionEnds);
        const formattedDate = endDate.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        suspensionMessage = `تم فصلك مؤقتاً حتى يوم ${formattedDate}`;
      }
      
      return {
        status: 'BLOCKED',
        message: suspensionMessage,
        canAccessPlatform: false,
        canAccessQuizzes: false,
        canAccessAttendance: false,
        blockReason: suspensionCheck.suspensionType === 'PERMANENT'
          ? 'PERMANENT_EXPULSION'
          : 'TEMPORARY_SUSPENSION',
        blockedFeatures: [NonPaymentAction.DISABLE_ALL],
      };
    }

    // 1. جلب جميع الرسوم غير المدفوعة بالكامل
    const unpaidPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId,
        status: {
          in: ['PENDING', 'PARTIALLY_PAID'],
        },
      },
      include: {
        fee: {
          include: {
            paymentSchedule: true, // جدول موعد السداد
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // الأقدم أولاً
      },
    });

    console.log(`📊 [PaymentStatus] وجد ${unpaidPayments.length} رسوم غير مدفوعة`);

    if (unpaidPayments.length === 0) {
      return {
        status: 'ACTIVE',
        message: 'جميع المدفوعات منتظمة',
        canAccessPlatform: true,
        canAccessQuizzes: true,
        canAccessAttendance: true,
      };
    }

    // 2. جلب استثناءات المتدرب
    const traineeExceptions = await this.prisma.traineePaymentException.findMany({
      where: { traineeId },
    });

    console.log(`📋 [PaymentStatus] وجد ${traineeExceptions.length} استثناء للمتدرب`);

    const now = new Date();
    const overduePayments: OverduePaymentInfo[] = [];
    const upcomingPayments: UpcomingPaymentInfo[] = [];
    const blockedFeatures = new Set<NonPaymentAction>();

    // 3. فحص كل رسم
    for (const payment of unpaidPayments) {
      const schedule = payment.fee.paymentSchedule;

      // تخطي الرسوم بدون جدول سداد
      if (!schedule) {
        console.log(`⏭️  [PaymentStatus] رسوم "${payment.fee.name}" ليس لها جدول سداد`);
        continue;
      }

      // تخطي إذا كانت الإجراءات غير مفعلة
      if (!schedule.actionEnabled) {
        console.log(`⏭️  [PaymentStatus] رسوم "${payment.fee.name}" - الإجراءات غير مفعلة`);
        continue;
      }

      // 4. البحث عن استثناء خاص بهذا الرسم أو استثناء عام
      const specificException = traineeExceptions.find(
        (e) => e.feeId === payment.feeId,
      );
      const generalException = traineeExceptions.find((e) => e.feeId === null);
      const applicableException = specificException || generalException;

      // 5. تحديد الموعد النهائي الفعلي
      const effectiveDeadline = applicableException?.customFinalDeadline || schedule.finalDeadline;

      if (!effectiveDeadline) {
        console.log(`⏭️  [PaymentStatus] رسوم "${payment.fee.name}" - لا يوجد موعد نهائي محدد`);
        continue;
      }

      const remainingAmount = payment.amount - (payment.paidAmount || 0);

      // 6. فحص حالة الموعد
      const daysUntilDeadline = this.calculateDaysDifference(now, effectiveDeadline);

      // 🔴 تجاوز الموعد النهائي
      if (now > effectiveDeadline) {
        const daysOverdue = Math.abs(daysUntilDeadline);

        console.log(`🔴 [PaymentStatus] رسوم "${payment.fee.name}" متأخرة ${daysOverdue} يوم`);

        const actions = (schedule.nonPaymentActions as any) || [];

        overduePayments.push({
          feeId: payment.feeId,
          feeName: payment.fee.name,
          amount: payment.amount,
          paidAmount: payment.paidAmount || 0,
          remainingAmount,
          deadline: effectiveDeadline,
          daysOverdue,
          actions,
        });

        // إضافة الإجراءات للحجب
        actions.forEach((action: NonPaymentAction) => {
          blockedFeatures.add(action);
        });
      }
      // 🟡 ضمن فترة السداد
      else if (schedule.paymentStartDate && schedule.paymentEndDate) {
        if (now >= schedule.paymentStartDate && now <= effectiveDeadline) {
          console.log(`🟡 [PaymentStatus] رسوم "${payment.fee.name}" ضمن فترة السداد`);

          upcomingPayments.push({
            feeId: payment.feeId,
            feeName: payment.fee.name,
            amount: payment.amount,
            paidAmount: payment.paidAmount || 0,
            remainingAmount,
            startDate: schedule.paymentStartDate,
            endDate: schedule.paymentEndDate,
            finalDeadline: effectiveDeadline,
            daysRemaining: daysUntilDeadline,
          });
        }
      }
    }

    // 7. تحديد الحالة النهائية
    const blockedFeaturesArray = Array.from(blockedFeatures);

    // تحديد حالة الوصول لكل ميزة
    const canAccessPlatform = !(
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_PLATFORM) ||
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_ALL)
    );
    
    const canAccessQuizzes = !(
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_QUIZZES) ||
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_ALL)
    );
    
    const canAccessAttendance = !(
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_ATTENDANCE) ||
      blockedFeaturesArray.includes(NonPaymentAction.DISABLE_ALL)
    );

    // إذا كانت المنصة محجوبة
    if (!canAccessPlatform) {
      console.log(`🚫 [PaymentStatus] المنصة محجوبة - ${overduePayments.length} رسوم متأخرة`);

      return {
        status: 'BLOCKED',
        message: 'تم إيقاف المنصة بسبب تأخر في سداد الرسوم',
        canAccessPlatform: false,
        canAccessQuizzes: false,
        canAccessAttendance: false,
        blockReason: 'PAYMENT_OVERDUE',
        overduePayments,
        blockedFeatures: blockedFeaturesArray,
      };
    }

    // إذا كان الحضور محجوب (لكن المنصة متاحة)
    if (!canAccessAttendance && overduePayments.length > 0) {
      console.log(`📅 [PaymentStatus] نظام الحضور محجوب - ${overduePayments.length} رسوم متأخرة`);

      return {
        status: 'PAYMENT_DUE',
        message: 'تم إيقاف نظام الحضور بسبب تأخر في سداد الرسوم',
        canAccessPlatform: true,
        canAccessQuizzes,
        canAccessAttendance: false,
        overduePayments,
        blockedFeatures: blockedFeaturesArray,
      };
    }

    // إذا كانت هناك رسوم مستحقة (تذكير)
    if (upcomingPayments.length > 0) {
      console.log(`🟡 [PaymentStatus] ${upcomingPayments.length} رسوم مستحقة قريباً`);

      return {
        status: 'PAYMENT_DUE',
        message: 'لديك رسوم مستحقة قريباً',
        canAccessPlatform: true,
        canAccessQuizzes,
        canAccessAttendance,
        upcomingPayments,
        blockedFeatures: blockedFeaturesArray,
      };
    }

    // إذا كانت هناك رسوم متأخرة لكن بدون حجب
    if (overduePayments.length > 0) {
      console.log(`⚠️  [PaymentStatus] ${overduePayments.length} رسوم متأخرة (بدون حجب)`);

      return {
        status: 'PAYMENT_DUE',
        message: 'لديك رسوم متأخرة',
        canAccessPlatform: true,
        canAccessQuizzes,
        canAccessAttendance,
        overduePayments,
        blockedFeatures: blockedFeaturesArray,
      };
    }

    // ✅ لا توجد مشاكل
    console.log(`✅ [PaymentStatus] جميع المدفوعات منتظمة`);

    return {
      status: 'ACTIVE',
      message: 'جميع المدفوعات منتظمة',
      canAccessPlatform: true,
      canAccessQuizzes: true,
      canAccessAttendance: true,
    };
  }

  /**
   * حساب الفرق بالأيام بين تاريخين
   */
  private calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * فحص إمكانية الوصول لميزة معينة
   */
  async canAccessFeature(traineeId: number, feature: NonPaymentAction): Promise<boolean> {
    const status = await this.checkTraineePaymentStatus(traineeId);

    // إذا كانت الميزة محجوبة
    if (status.blockedFeatures?.includes(feature)) {
      return false;
    }

    // إذا كان DISABLE_ALL مفعل، جميع الميزات محجوبة
    if (status.blockedFeatures?.includes(NonPaymentAction.DISABLE_ALL)) {
      return false;
    }

    return true;
  }

  /**
   * جلب ملخص سريع للمدفوعات المتأخرة
   */
  async getOverduePaymentsSummary(traineeId: number) {
    const status = await this.checkTraineePaymentStatus(traineeId);

    return {
      hasOverduePayments: (status.overduePayments?.length || 0) > 0,
      overdueCount: status.overduePayments?.length || 0,
      totalOverdueAmount:
        status.overduePayments?.reduce((sum, p) => sum + p.remainingAmount, 0) || 0,
      isBlocked: status.status === 'BLOCKED',
    };
  }
}