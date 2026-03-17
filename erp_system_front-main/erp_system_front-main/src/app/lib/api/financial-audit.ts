import { apiClient } from './client';
import {
  FinancialAuditLog,
  AuditLogsResponse,
  AuditStatistics,
  AuditFilters,
  FinancialAction,
} from '../../types/financial-audit';

// ======== سجل العمليات المالية ========

export const getFinancialAuditLogs = async (filters: AuditFilters = {}): Promise<AuditLogsResponse> => {
  const params = new URLSearchParams();
  
  if (filters.action) params.append('action', filters.action);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.entityId) params.append('entityId', filters.entityId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
  if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await apiClient.get(`/finances/audit-logs?${params.toString()}`);
  return response.data;
};

export const getAuditStatistics = async (): Promise<AuditStatistics> => {
  const response = await apiClient.get('/finances/audit-statistics');
  return response.data;
};

// ======== مساعدات لتفسير البيانات ========

export const getActionDisplayName = (action: FinancialAction): string => {
  const actionNames: Record<FinancialAction, string> = {
    [FinancialAction.SAFE_CREATE]: 'إنشاء خزينة',
    [FinancialAction.SAFE_UPDATE]: 'تحديث خزينة',
    [FinancialAction.SAFE_DELETE]: 'حذف خزينة',
    [FinancialAction.SAFE_BALANCE_UPDATE]: 'تحديث رصيد خزينة',
    
    [FinancialAction.FEE_CREATE]: 'إنشاء رسوم',
    [FinancialAction.FEE_UPDATE]: 'تحديث رسوم',
    [FinancialAction.FEE_DELETE]: 'حذف رسوم',
    [FinancialAction.FEE_APPLY]: 'تطبيق رسوم',
    [FinancialAction.FEE_CANCEL]: 'إلغاء رسوم',
    
    [FinancialAction.PAYMENT_CREATE]: 'تسجيل دفعة',
    [FinancialAction.PAYMENT_UPDATE]: 'تحديث دفعة',
    [FinancialAction.PAYMENT_DELETE]: 'حذف دفعة',
    [FinancialAction.PAYMENT_STATUS_CHANGE]: 'تغيير حالة دفعة',
    [FinancialAction.PAYMENT_REVERSE]: 'التراجع عن دفعة',
    
    [FinancialAction.TRANSACTION_CREATE]: 'إنشاء معاملة',
    [FinancialAction.TRANSACTION_UPDATE]: 'تحديث معاملة',
    [FinancialAction.TRANSACTION_DELETE]: 'حذف معاملة',
    [FinancialAction.TRANSACTION_REVERSE]: 'التراجع عن معاملة',
    
    [FinancialAction.BULK_OPERATION]: 'عملية مجمعة',
    [FinancialAction.DATA_IMPORT]: 'استيراد بيانات',
    [FinancialAction.DATA_EXPORT]: 'تصدير بيانات',
    [FinancialAction.SYSTEM_ADJUSTMENT]: 'تعديل نظام',
  };

  return actionNames[action] || action;
};

export const getEntityTypeDisplayName = (entityType: string): string => {
  const entityNames: Record<string, string> = {
    Safe: 'خزينة',
    TraineeFee: 'رسوم متدربين',
    TraineePayment: 'مدفوعات متدربين',
    Transaction: 'معاملة مالية',
    Trainee: 'متدرب',
    TrainingProgram: 'برنامج تدريبي',
  };

  return entityNames[entityType] || entityType;
};

export const getActionColor = (action: FinancialAction): string => {
  // لم نعد نحتاج هذه الدالة مع استخدام variant في Badge
  return '';
};
