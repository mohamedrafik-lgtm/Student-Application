import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialAction } from '@prisma/client';

export interface AuditContext {
  userId: string;
  userName: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogData {
  action: FinancialAction;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  description?: string;
  amount?: number;
  currency?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  notes?: string;
  isReversible?: boolean;
}

@Injectable()
export class FinancialAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * تسجيل عملية مالية في سجل التدقيق
   */
  async logFinancialOperation(
    auditData: AuditLogData,
    context: AuditContext,
  ) {
    try {


      // حساب التغييرات إذا كانت متاحة
      const changes = this.calculateChanges(auditData.oldData, auditData.newData);

      const auditLog = await this.prisma.financialAuditLog.create({
        data: {
          action: auditData.action,
          entityType: auditData.entityType,
          entityId: auditData.entityId,
          oldData: auditData.oldData,
          newData: auditData.newData,
          changes,
          description: auditData.description,
          amount: auditData.amount,
          currency: auditData.currency || 'EGP',
          userId: context.userId,
          userName: context.userName,
          userRole: context.userRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          relatedEntityType: auditData.relatedEntityType,
          relatedEntityId: auditData.relatedEntityId,
          notes: auditData.notes,
          isReversible: auditData.isReversible || false,
        },
      });


      return auditLog;
    } catch (error) {
      console.error('❌ خطأ في تسجيل عملية التدقيق المالي:', error);
      // لا نريد أن يفشل العملية الأساسية بسبب فشل التدقيق
      throw error;
    }
  }

  // ترجمة حالة الدفع
  private getStatusArabic(status: string): string {
    const statusAr: Record<string, string> = { PENDING: 'معلق', PAID: 'مدفوع', PARTIALLY_PAID: 'مدفوع جزئياً', CANCELLED: 'ملغي' };
    return statusAr[status] || status;
  }

  // تنظيف بيانات الخزينة للتخزين
  private cleanSafeData(safeData: any): any {
    if (!safeData) return null;
    const clean: any = {};
    if (safeData.name) clean['اسم الخزينة'] = safeData.name;
    if (safeData.description) clean['الوصف'] = safeData.description;
    if (safeData.category) clean['التصنيف'] = safeData.category;
    if (safeData.balance != null) clean['الرصيد'] = safeData.balance;
    if (safeData.currency) clean['العملة'] = safeData.currency;
    if (safeData.isActive != null) clean['نشط'] = safeData.isActive ? 'نعم' : 'لا';
    return clean;
  }

  // تنظيف بيانات الرسوم للتخزين
  private cleanFeeData(feeData: any): any {
    if (!feeData) return null;
    const typeAr: Record<string, string> = { TUITION: 'رسوم دراسية', SERVICES: 'رسوم خدمات', TRAINING: 'رسوم تدريب', ADDITIONAL: 'رسوم إضافية' };
    const clean: any = {};
    if (feeData.name) clean['اسم الرسوم'] = feeData.name;
    if (feeData.amount != null) clean['المبلغ'] = feeData.amount;
    if (feeData.type) clean['النوع'] = typeAr[feeData.type] || feeData.type;
    if (feeData.academicYear) clean['العام الدراسي'] = feeData.academicYear;
    if (feeData.isApplied != null) clean['تم التطبيق'] = feeData.isApplied ? 'نعم' : 'لا';
    if (feeData.safe?.name) clean['الخزينة'] = feeData.safe.name;
    if (feeData.program?.name) clean['البرنامج'] = feeData.program.name;
    return clean;
  }

  // تنظيف بيانات الدفعة للتخزين
  private cleanPaymentData(paymentData: any): any {
    if (!paymentData) return null;
    const statusAr: Record<string, string> = { PENDING: 'معلق', PAID: 'مدفوع', PARTIALLY_PAID: 'مدفوع جزئياً', CANCELLED: 'ملغي' };
    const clean: any = {};
    if (paymentData.amount != null) clean['المبلغ'] = paymentData.amount;
    if (paymentData.paidAmount != null) clean['المدفوع'] = paymentData.paidAmount;
    if (paymentData.status) clean['الحالة'] = statusAr[paymentData.status] || paymentData.status;
    if (paymentData.notes) clean['ملاحظات'] = paymentData.notes;
    return clean;
  }

  /**
   * تسجيل إنشاء خزينة جديدة
   */
  async logSafeCreation(safeData: any, context: AuditContext) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.SAFE_CREATE,
        entityType: 'Safe',
        entityId: safeData.id,
        newData: this.cleanSafeData(safeData),
        description: `تم إنشاء خزينة جديدة: ${safeData.name}`,
        currency: safeData.currency,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل تحديث خزينة
   */
  async logSafeUpdate(safeId: string, oldData: any, newData: any, context: AuditContext) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.SAFE_UPDATE,
        entityType: 'Safe',
        entityId: safeId,
        oldData: this.cleanSafeData(oldData),
        newData: this.cleanSafeData(newData),
        description: `تم تحديث خزينة: ${newData.name || oldData.name}`,
        currency: newData.currency || oldData.currency,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل حذف خزينة
   */
  async logSafeDelete(safeId: string, safeData: any, context: AuditContext) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.SAFE_DELETE,
        entityType: 'Safe',
        entityId: safeId,
        oldData: this.cleanSafeData(safeData),
        description: `تم حذف خزينة: ${safeData.name}`,
        currency: safeData.currency,
        amount: safeData.balance,
        isReversible: false,
      },
      context,
    );
  }

  /**
   * تسجيل تحديث رصيد خزينة
   */
  async logSafeBalanceUpdate(
    safeId: string,
    oldBalance: number,
    newBalance: number,
    safeName: string,
    currency: string,
    description: string,
    context: AuditContext,
  ) {
    const balanceChange = newBalance - oldBalance;
    
    return this.logFinancialOperation(
      {
        action: FinancialAction.SAFE_BALANCE_UPDATE,
        entityType: 'Safe',
        entityId: safeId,
        oldData: { 'الرصيد': oldBalance },
        newData: { 'الرصيد': newBalance },
        description: `${description} - تغيير الرصيد: ${balanceChange > 0 ? '+' : ''}${balanceChange}`,
        amount: Math.abs(balanceChange),
        currency,
        notes: `الرصيد السابق: ${oldBalance} - الرصيد الجديد: ${newBalance}`,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل إنشاء رسوم جديدة
   */
  async logFeeCreation(feeData: any, context: AuditContext) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.FEE_CREATE,
        entityType: 'TraineeFee',
        entityId: feeData.id.toString(),
        newData: this.cleanFeeData(feeData),
        description: `تم إنشاء رسوم جديدة: ${feeData.name}`,
        amount: feeData.amount,
        currency: 'EGP',
        relatedEntityType: 'TrainingProgram',
        relatedEntityId: feeData.programId?.toString(),
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل تطبيق رسوم على متدربين
   */
  async logFeeApplication(
    feeId: number,
    feeName: string,
    traineeIds: number[],
    feeAmount: number,
    context: AuditContext,
  ) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.FEE_APPLY,
        entityType: 'TraineeFee',
        entityId: feeId.toString(),
        description: `تم تطبيق رسوم "${feeName}" على ${traineeIds.length} متدرب`,
        amount: feeAmount * traineeIds.length,
        currency: 'EGP',
        notes: `معرفات المتدربين: ${traineeIds.join(', ')}`,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل تحديث رسوم المتدربين
   */
  async logFeeUpdate(
    feeId: number,
    oldFeeData: any,
    newFeeData: any,
    context: AuditContext,
  ) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.FEE_UPDATE,
        entityType: 'TraineeFee',
        entityId: feeId.toString(),
        oldData: this.cleanFeeData(oldFeeData),
        newData: this.cleanFeeData(newFeeData),
        description: `تم تحديث الرسوم: ${newFeeData.name}`,
        amount: newFeeData.amount,
        currency: 'EGP',
        relatedEntityType: 'TrainingProgram',
        relatedEntityId: newFeeData.programId?.toString(),
        isReversible: false,
      },
      context,
    );
  }

  /**
   * تسجيل حذف رسوم المتدربين
   */
  async logFeeDelete(
    feeId: number,
    feeData: any,
    context: AuditContext,
  ) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.FEE_DELETE,
        entityType: 'TraineeFee',
        entityId: feeId.toString(),
        oldData: this.cleanFeeData(feeData),
        description: `تم حذف الرسوم: ${feeData.name}`,
        amount: feeData.amount,
        currency: 'EGP',
        relatedEntityType: 'TrainingProgram',
        relatedEntityId: feeData.programId?.toString(),
        isReversible: false,
      },
      context,
    );
  }

  /**
   * تسجيل دفعة جديدة
   */
  async logPaymentCreation(paymentData: any, traineeData: any, feeData: any, context: AuditContext) {
    const actualPaid = paymentData._actualPaidAmount || paymentData.paidAmount || paymentData.amount;
    const statusAr: Record<string, string> = { PENDING: 'معلق', PAID: 'مدفوع', PARTIALLY_PAID: 'مدفوع جزئياً', CANCELLED: 'ملغي' };

    const cleanData: any = {
      'اسم المتدرب': traineeData.nameAr,
      'الرسوم': feeData.name,
      'المبلغ المدفوع': `${actualPaid.toLocaleString()} ج.م`,
      'إجمالي الرسوم': `${feeData.amount?.toLocaleString()} ج.م`,
      'إجمالي المسدد': `${paymentData.paidAmount?.toLocaleString()} ج.م`,
      'الحالة': statusAr[paymentData.status] || paymentData.status,
    };
    if (paymentData._safeName) cleanData['الخزينة المستقبلة'] = paymentData._safeName;
    if (paymentData._feeSafeName) cleanData['خزينة الرسوم'] = paymentData._feeSafeName;
    if (paymentData.notes) cleanData['ملاحظات'] = paymentData.notes;

    return this.logFinancialOperation(
      {
        action: FinancialAction.PAYMENT_CREATE,
        entityType: 'TraineePayment',
        entityId: paymentData.id.toString(),
        newData: cleanData,
        description: `سداد رسوم: ${traineeData.nameAr} - ${feeData.name} - مبلغ ${actualPaid.toLocaleString()} ج.م${paymentData._safeName ? ` - في خزينة "${paymentData._safeName}"` : ''}`,
        amount: actualPaid,
        currency: 'EGP',
        relatedEntityType: 'Trainee',
        relatedEntityId: paymentData.traineeId?.toString(),
        notes: paymentData.notes,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل تغيير حالة الدفع
   */
  async logPaymentStatusChange(
    paymentId: number,
    oldStatus: string,
    newStatus: string,
    traineeInfo: string,
    context: AuditContext,
  ) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.PAYMENT_STATUS_CHANGE,
        entityType: 'TraineePayment',
        entityId: paymentId.toString(),
        oldData: { 'الحالة': this.getStatusArabic(oldStatus) },
        newData: { 'الحالة': this.getStatusArabic(newStatus) },
        description: `تغيير حالة الدفع: ${traineeInfo} من ${this.getStatusArabic(oldStatus)} إلى ${this.getStatusArabic(newStatus)}`,
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل حذف مديونية متدرب
   */
  async logDebtDeletion(
    traineeId: number,
    traineeName: string,
    deletionDetails: {
      deletedPayments: number;
      deletedTransactions: number;
      affectedSafes: Array<{ id: string; name: string; balanceChange: number; feeReversals: number; paymentReversals: number }>;
      totalAmount?: number;
    },
    context: AuditContext,
  ) {
    return this.logFinancialOperation(
      {
        action: FinancialAction.PAYMENT_DELETE,
        entityType: 'TraineePayment',
        entityId: traineeId.toString(),
        oldData: {
          'اسم المتدرب': traineeName,
          'عدد المدفوعات المحذوفة': deletionDetails.deletedPayments,
          'عدد المعاملات المحذوفة': deletionDetails.deletedTransactions,
          'المبلغ الإجمالي': deletionDetails.totalAmount,
          'الخزائن المتأثرة': deletionDetails.affectedSafes.map(s => ({
            'اسم الخزينة': s.name,
            'تغيير الرصيد': s.balanceChange,
            'استرداد الرسوم': s.feeReversals,
            'استرداد المدفوعات': s.paymentReversals,
          })),
        },
        description: `تم حذف مديونية المتدرب: ${traineeName} - ${deletionDetails.deletedPayments} دفعة و ${deletionDetails.deletedTransactions} معاملة`,
        amount: deletionDetails.totalAmount,
        currency: 'EGP',
        relatedEntityType: 'Trainee',
        relatedEntityId: traineeId.toString(),
        notes: `الخزائن المتأثرة: ${deletionDetails.affectedSafes.map(s => `${s.name} (${s.balanceChange > 0 ? '+' : ''}${s.balanceChange})`).join(', ')}`,
        isReversible: false,
      },
      context,
    );
  }

  /**
   * تسجيل تحميل رسوم على متدرب (أساسية أو إضافية)
   */
  async logFeeLoadingOnTrainee(
    traineeId: number,
    traineeName: string,
    programName: string,
    appliedFees: Array<{ feeName: string; amount: number; type?: string }>,
    totalAmount: number,
    isAdditional: boolean,
    context: AuditContext,
  ) {
    const feeTypeAr: Record<string, string> = { TUITION: 'رسوم دراسية', SERVICES: 'رسوم خدمات', TRAINING: 'رسوم تدريب', ADDITIONAL: 'رسوم إضافية' };
    const feeTypeLabel = isAdditional ? 'إضافية' : 'أساسية (دراسية)';
    
    return this.logFinancialOperation(
      {
        action: FinancialAction.FEE_APPLY,
        entityType: 'TraineePayment',
        entityId: traineeId.toString(),
        newData: {
          'اسم المتدرب': traineeName,
          'البرنامج': programName,
          'نوع الرسوم': feeTypeLabel,
          'عدد الرسوم المطبقة': appliedFees.length,
          'إجمالي المبلغ': totalAmount,
          'الرسوم المطبقة': appliedFees.map(f => ({
            'اسم الرسوم': f.feeName,
            'المبلغ': f.amount,
            'النوع': f.type ? (feeTypeAr[f.type] || f.type) : feeTypeLabel,
          })),
        },
        description: `تم تحميل ${appliedFees.length} رسوم ${feeTypeLabel} على المتدرب: ${traineeName} - البرنامج: ${programName} - إجمالي ${totalAmount.toLocaleString()} ج.م`,
        amount: totalAmount,
        currency: 'EGP',
        relatedEntityType: 'Trainee',
        relatedEntityId: traineeId.toString(),
        isReversible: true,
      },
      context,
    );
  }

  /**
   * تسجيل عملية سداد ذكي (دفع مبلغ موزع على عدة رسوم)
   */
  async logSmartPayment(
    traineeId: number,
    traineeName: string,
    totalAmount: number,
    safeName: string,
    paymentDetails: Array<{ feeName: string; appliedAmount: number; newStatus: string; isFullyPaid: boolean }>,
    context: AuditContext,
  ) {
    const statusAr: Record<string, string> = { PENDING: 'معلق', PAID: 'مدفوع', PARTIALLY_PAID: 'مدفوع جزئياً', CANCELLED: 'ملغي' };
    
    return this.logFinancialOperation(
      {
        action: FinancialAction.PAYMENT_CREATE,
        entityType: 'TraineePayment',
        entityId: traineeId.toString(),
        newData: {
          'اسم المتدرب': traineeName,
          'المبلغ الإجمالي': `${totalAmount.toLocaleString()} ج.م`,
          'الخزينة المستقبلة': safeName,
          'عدد الرسوم المسددة': paymentDetails.length,
          'مدفوعة كاملة': paymentDetails.filter(p => p.isFullyPaid).length,
          'مدفوعة جزئياً': paymentDetails.filter(p => !p.isFullyPaid).length,
          'تفاصيل السداد': paymentDetails.map(p => ({
            'الرسوم': p.feeName,
            'المبلغ المسدد': `${p.appliedAmount.toLocaleString()} ج.م`,
            'الحالة': statusAr[p.newStatus] || p.newStatus,
          })),
        },
        description: `سداد ذكي: ${traineeName} - مبلغ ${totalAmount.toLocaleString()} ج.م - تم توزيعه على ${paymentDetails.length} رسوم في خزينة "${safeName}"`,
        amount: totalAmount,
        currency: 'EGP',
        relatedEntityType: 'Trainee',
        relatedEntityId: traineeId.toString(),
        isReversible: false,
      },
      context,
    );
  }

  // ترجمة نوع المعاملة إلى العربية
  private getTransactionTypeArabic(type: string): string {
    const types: Record<string, string> = {
      DEPOSIT: 'إيداع',
      WITHDRAW: 'سحب',
      TRANSFER: 'تحويل بين الخزائن',
      TRANSFER_IN: 'تحويل وارد',
      TRANSFER_OUT: 'تحويل صادر',
      FEE: 'رسوم',
      PAYMENT: 'دفعة',
    };
    return types[type] || type;
  }

  /**
   * تسجيل إنشاء قيد مالي جديد
   */
  async logTransactionCreation(transactionData: any, context: AuditContext) {
    const typeAr = this.getTransactionTypeArabic(transactionData.type);
    
    // بناء وصف واضح بالعربية
    let description = `تم إنشاء قيد مالي: ${typeAr}`;
    if (transactionData.sourceSafeName && transactionData.targetSafeName) {
      description += ` - من "${transactionData.sourceSafeName}" إلى "${transactionData.targetSafeName}"`;
    } else if (transactionData.targetSafeName) {
      description += ` - إلى "${transactionData.targetSafeName}"`;
    } else if (transactionData.sourceSafeName) {
      description += ` - من "${transactionData.sourceSafeName}"`;
    }
    if (transactionData.amount) {
      description += ` - مبلغ ${transactionData.amount.toLocaleString()} ج.م`;
    }

    // تنظيف البيانات المخزنة بأسماء عربية (بدون معرفات تقنية)
    const cleanData: any = {};
    if (transactionData.type) cleanData['النوع'] = typeAr;
    if (transactionData.amount != null) cleanData['المبلغ'] = `${transactionData.amount.toLocaleString()} ج.م`;
    if (transactionData.description) cleanData['الوصف'] = transactionData.description;
    if (transactionData.sourceSafeName) cleanData['الخزينة المصدر'] = transactionData.sourceSafeName;
    if (transactionData.targetSafeName) cleanData['الخزينة الهدف'] = transactionData.targetSafeName;

    return this.logFinancialOperation(
      {
        action: FinancialAction.TRANSACTION_CREATE,
        entityType: 'Transaction',
        entityId: transactionData.id,
        newData: cleanData,
        description,
        amount: transactionData.amount,
        currency: 'EGP',
        isReversible: true,
      },
      context,
    );
  }

  /**
   * الحصول على سجل التدقيق مع الفلترة
   */
  async getAuditLogs(filters: {
    action?: FinancialAction;
    entityType?: string;
    entityId?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...filterConditions } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filterConditions.action) {
      where.action = filterConditions.action;
    }

    if (filterConditions.entityType) {
      where.entityType = filterConditions.entityType;
    }

    if (filterConditions.entityId) {
      where.entityId = filterConditions.entityId;
    }

    if (filterConditions.userId) {
      where.userId = filterConditions.userId;
    }

    if (filterConditions.dateFrom || filterConditions.dateTo) {
      where.createdAt = {};
      if (filterConditions.dateFrom) {
        where.createdAt.gte = filterConditions.dateFrom;
      }
      if (filterConditions.dateTo) {
        where.createdAt.lte = filterConditions.dateTo;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.financialAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.financialAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * الحصول على إحصائيات سجل التدقيق
   */
  async getAuditStatistics() {
    const [
      totalLogs,
      todayLogs,
      weekLogs,
      monthLogs,
      actionStats,
      userStats,
    ] = await Promise.all([
      // إجمالي السجلات
      this.prisma.financialAuditLog.count(),
      
      // سجلات اليوم
      this.prisma.financialAuditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      
      // سجلات الأسبوع
      this.prisma.financialAuditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // سجلات الشهر
      this.prisma.financialAuditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // إحصائيات حسب نوع العملية
      this.prisma.financialAuditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      
      // إحصائيات حسب المستخدم
      this.prisma.financialAuditLog.groupBy({
        by: ['userId', 'userName'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      weekLogs,
      monthLogs,
      actionStats,
      userStats,
    };
  }

  /**
   * حساب التغييرات بين البيانات القديمة والجديدة
   */
  private calculateChanges(oldData: any, newData: any): any {
    if (!oldData || !newData) return null;

    const changes: any = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
