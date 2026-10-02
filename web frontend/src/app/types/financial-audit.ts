// أنواع العمليات المالية للتدقيق
export enum FinancialAction {
  // عمليات الخزائن
  SAFE_CREATE = 'SAFE_CREATE',
  SAFE_UPDATE = 'SAFE_UPDATE', 
  SAFE_DELETE = 'SAFE_DELETE',
  SAFE_BALANCE_UPDATE = 'SAFE_BALANCE_UPDATE',
  
  // عمليات الرسوم
  FEE_CREATE = 'FEE_CREATE',
  FEE_UPDATE = 'FEE_UPDATE',
  FEE_DELETE = 'FEE_DELETE',
  FEE_APPLY = 'FEE_APPLY',
  FEE_CANCEL = 'FEE_CANCEL',
  
  // عمليات المدفوعات
  PAYMENT_CREATE = 'PAYMENT_CREATE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  PAYMENT_DELETE = 'PAYMENT_DELETE',
  PAYMENT_STATUS_CHANGE = 'PAYMENT_STATUS_CHANGE',
  PAYMENT_REVERSE = 'PAYMENT_REVERSE',
  
  // عمليات المعاملات
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  TRANSACTION_UPDATE = 'TRANSACTION_UPDATE',
  TRANSACTION_DELETE = 'TRANSACTION_DELETE',
  TRANSACTION_REVERSE = 'TRANSACTION_REVERSE',
  
  // عمليات خاصة
  BULK_OPERATION = 'BULK_OPERATION',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_EXPORT = 'DATA_EXPORT',
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT',
}

// نموذج سجل التدقيق المالي
export interface FinancialAuditLog {
  id: string;
  action: FinancialAction;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  changes?: any;
  description?: string;
  amount?: number;
  currency?: string;
  
  // معلومات المستخدم
  userId: string;
  userName: string;
  userRole?: string;
  
  // معلومات تقنية
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // معلومات إضافية
  relatedEntityType?: string;
  relatedEntityId?: string;
  notes?: string;
  
  // معلومات المراجعة
  isReversible: boolean;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string;
  
  createdAt: string;
}

// استجابة سجل التدقيق مع الفلترة
export interface AuditLogsResponse {
  logs: FinancialAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// إحصائيات سجل التدقيق
export interface AuditStatistics {
  totalLogs: number;
  todayLogs: number;
  weekLogs: number;
  monthLogs: number;
  actionStats: Array<{
    action: FinancialAction;
    _count: number;
  }>;
  userStats: Array<{
    userId: string;
    userName: string;
    _count: number;
  }>;
}

// فلاتر البحث في سجل التدقيق
export interface AuditFilters {
  action?: FinancialAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}
