'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getFinancialAuditLogs,
  getAuditStatistics,
  getActionDisplayName,
  getEntityTypeDisplayName,
} from '@/app/lib/api/financial-audit';
import {
  FinancialAuditLog,
  AuditStatistics,
  AuditFilters,
  FinancialAction,
} from '@/app/types/financial-audit';
import { formatCurrency } from '@/app/lib/utils';
import { toast } from 'sonner';
import {
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { SimpleSelect } from '@/app/components/ui/Select';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';
import PageGuard from '@/components/permissions/PageGuard';

// ========== أيقونات العمليات ==========
const getActionIcon = (action: string) => {
  if (action.includes('CREATE')) return <PlusCircleIcon className="w-4 h-4" />;
  if (action.includes('UPDATE') || action.includes('CHANGE')) return <PencilSquareIcon className="w-4 h-4" />;
  if (action.includes('DELETE')) return <TrashIcon className="w-4 h-4" />;
  if (action.includes('REVERSE')) return <ArrowPathIcon className="w-4 h-4" />;
  if (action.includes('APPLY') || action.includes('CANCEL')) return <CheckCircleIcon className="w-4 h-4" />;
  return <DocumentTextIcon className="w-4 h-4" />;
};

const getActionBadgeStyle = (action: string): string => {
  if (action.includes('CREATE') || action.includes('APPLY')) 
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('BALANCE')) 
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (action.includes('DELETE') || action.includes('REVERSE') || action.includes('CANCEL')) 
    return 'bg-red-50 text-red-700 border border-red-200';
  if (action.includes('BULK') || action.includes('SYSTEM')) 
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-slate-50 text-slate-700 border border-slate-200';
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'Safe': return <BuildingLibraryIcon className="w-4 h-4" />;
    case 'TraineeFee': return <CreditCardIcon className="w-4 h-4" />;
    case 'TraineePayment': return <BanknotesIcon className="w-4 h-4" />;
    case 'Transaction': return <ArrowsRightLeftIcon className="w-4 h-4" />;
    default: return <DocumentTextIcon className="w-4 h-4" />;
  }
};

const getEntityBadgeStyle = (entityType: string): string => {
  switch (entityType) {
    case 'Safe': return 'bg-violet-50 text-violet-700';
    case 'TraineeFee': return 'bg-orange-50 text-orange-700';
    case 'TraineePayment': return 'bg-teal-50 text-teal-700';
    case 'Transaction': return 'bg-indigo-50 text-indigo-700';
    default: return 'bg-slate-50 text-slate-700';
  }
};

// خيارات نوع العملية مجمعة
const actionGroups = [
  {
    label: 'عمليات الخزائن',
    actions: [
      FinancialAction.SAFE_CREATE,
      FinancialAction.SAFE_UPDATE,
      FinancialAction.SAFE_DELETE,
      FinancialAction.SAFE_BALANCE_UPDATE,
    ]
  },
  {
    label: 'عمليات الرسوم',
    actions: [
      FinancialAction.FEE_CREATE,
      FinancialAction.FEE_UPDATE,
      FinancialAction.FEE_DELETE,
      FinancialAction.FEE_APPLY,
      FinancialAction.FEE_CANCEL,
    ]
  },
  {
    label: 'عمليات المدفوعات',
    actions: [
      FinancialAction.PAYMENT_CREATE,
      FinancialAction.PAYMENT_UPDATE,
      FinancialAction.PAYMENT_DELETE,
      FinancialAction.PAYMENT_STATUS_CHANGE,
      FinancialAction.PAYMENT_REVERSE,
    ]
  },
  {
    label: 'عمليات المعاملات',
    actions: [
      FinancialAction.TRANSACTION_CREATE,
      FinancialAction.TRANSACTION_UPDATE,
      FinancialAction.TRANSACTION_DELETE,
      FinancialAction.TRANSACTION_REVERSE,
    ]
  },
  {
    label: 'عمليات النظام',
    actions: [
      FinancialAction.BULK_OPERATION,
      FinancialAction.DATA_IMPORT,
      FinancialAction.DATA_EXPORT,
      FinancialAction.SYSTEM_ADJUSTMENT,
    ]
  },
];

// ========== ترجمة أسماء الحقول ==========
const fieldNameTranslations: Record<string, string> = {
  // حقول عامة
  id: 'المعرف',
  name: 'الاسم',
  description: 'الوصف',
  balance: 'الرصيد',
  currency: 'العملة',
  isActive: 'نشط',
  category: 'التصنيف',
  type: 'النوع',
  status: 'الحالة',
  amount: 'المبلغ',
  notes: 'ملاحظات',
  reference: 'المرجع',
  createdAt: 'تاريخ الإنشاء',
  updatedAt: 'تاريخ التحديث',

  // حقول الخزينة
  'Safe': 'خزينة',

  // حقول الرسوم
  feeName: 'اسم الرسوم',
  feeId: 'معرف الرسوم',
  feeAmount: 'مبلغ الرسوم',
  academicYear: 'العام الدراسي',
  programId: 'معرف البرنامج',
  safeId: 'معرف الخزينة',
  isApplied: 'تم التطبيق',
  appliedAt: 'تاريخ التطبيق',
  appliedById: 'طُبق بواسطة',
  allowMultipleApply: 'السماح بتطبيق متعدد',

  // حقول المدفوعات
  traineeId: 'معرف المتدرب',
  paidAmount: 'المبلغ المدفوع',
  paidAt: 'تاريخ الدفع',
  paidById: 'سُدد بواسطة',

  // حقول المعاملات
  sourceId: 'الخزينة المصدر',
  targetId: 'الخزينة الهدف',
  sourceSafeName: 'الخزينة المصدر',
  targetSafeName: 'الخزينة الهدف',
  traineeFeeId: 'معرف الرسوم',
  traineePaymentId: 'معرف الدفعة',
  createdById: 'أُنشئ بواسطة',

  // حقول إضافية من عمليات مختلفة
  program: 'البرنامج',
  safe: 'الخزينة',
  fee: 'الرسوم',
  trainee: 'المتدرب',
  traineePayments: 'مدفوعات المتدرب',
  transactions: 'المعاملات',
  nameAr: 'الاسم بالعربية',
  nameEn: 'الاسم بالإنجليزية',
  traineeName: 'اسم المتدرب',
  deletedPayments: 'المدفوعات المحذوفة',
  deletedTransactions: 'المعاملات المحذوفة',
  affectedSafes: 'الخزائن المتأثرة',
  totalAmount: 'المبلغ الإجمالي',
  balanceChange: 'تغيير الرصيد',
  feeReversals: 'استرداد الرسوم',
  paymentReversals: 'استرداد المدفوعات',
  message: 'الرسالة',

  // مفاتيح عربية من البيانات المنظفة (تُعاد كما هي)
  'النوع': 'النوع',
  'المبلغ': 'المبلغ',
  'الوصف': 'الوصف',
  'الخزينة المصدر': 'الخزينة المصدر',
  'الخزينة الهدف': 'الخزينة الهدف',
  'اسم الخزينة': 'اسم الخزينة',
  'التصنيف': 'التصنيف',
  'الرصيد': 'الرصيد',
  'العملة': 'العملة',
  'نشط': 'نشط',
  'اسم الرسوم': 'اسم الرسوم',
  'العام الدراسي': 'العام الدراسي',
  'تم التطبيق': 'تم التطبيق',
  'البرنامج': 'البرنامج',
  'الخزينة': 'الخزينة',
  'اسم المتدرب': 'اسم المتدرب',
  'حالة الدفع': 'حالة الدفع',
  'الرسالة': 'الرسالة',
  'المبلغ الإجمالي': 'المبلغ الإجمالي',
  'الخزائن المتأثرة': 'الخزائن المتأثرة',
  'المدفوعات المحذوفة': 'المدفوعات المحذوفة',
  'المعاملات المحذوفة': 'المعاملات المحذوفة',
  'الخزينة المستقبلة': 'الخزينة المستقبلة',
  'خزينة الرسوم': 'خزينة الرسوم',
  'المبلغ المدفوع': 'المبلغ المدفوع',
  'إجمالي الرسوم': 'إجمالي الرسوم',
  'إجمالي المسدد': 'إجمالي المسدد',
  'الرسوم': 'الرسوم',
  'المبلغ المسدد': 'المبلغ المسدد',
  'الحالة': 'الحالة',
  'عدد الرسوم المسددة': 'عدد الرسوم المسددة',
  'مدفوعة كاملة': 'مدفوعة كاملة',
  'مدفوعة جزئياً': 'مدفوعة جزئياً',
  'تفاصيل السداد': 'تفاصيل السداد',
  'ملاحظات': 'ملاحظات',
  'عدد المدفوعات المحذوفة': 'عدد المدفوعات المحذوفة',
  'عدد المعاملات المحذوفة': 'عدد المعاملات المحذوفة',
};

const getFieldName = (key: string): string => {
  return fieldNameTranslations[key] || key;
};

// ترجمة القيم المعروفة
const translateValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  
  // إذا كانت القيمة نص يحتوي على ج.م (مبلغ مُنسق مسبقاً) أعده كما هو
  if (typeof value === 'string' && value.includes('ج.م')) return value;
  
  // تنسيق التواريخ
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ترجمة أنواع المعاملات
  const typeTranslations: Record<string, string> = {
    DEPOSIT: 'إيداع',
    WITHDRAW: 'سحب',
    TRANSFER: 'تحويل',
    TRANSFER_IN: 'تحويل وارد',
    TRANSFER_OUT: 'تحويل صادر',
    FEE: 'رسوم',
    PAYMENT: 'دفعة',
    TUITION: 'رسوم دراسية',
    SERVICES: 'رسوم خدمات',
    TRAINING: 'رسوم تدريب',
    ADDITIONAL: 'رسوم إضافية',
    PENDING: 'معلق',
    PAID: 'مدفوع',
    PARTIALLY_PAID: 'مدفوع جزئياً',
    CANCELLED: 'ملغي',
    CASH: 'نقدي',
    BANK: 'بنكي',
    UNSPECIFIED: 'غير محدد',
  };
  if (typeof value === 'string' && typeTranslations[value]) {
    return typeTranslations[value];
  }

  // تنسيق الأرقام المالية (مفاتيح إنجليزية وعربية)
  const amountKeysEn = ['amount', 'balance', 'paidamount', 'feeamount', 'totalamount', 'balancechange'];
  const amountKeysAr = ['المبلغ', 'الرصيد', 'مبلغ الرسوم', 'المبلغ الإجمالي', 'تغيير الرصيد', 'المبلغ المدفوع'];
  if (typeof value === 'number' && (
    amountKeysEn.some(k => key.toLowerCase().includes(k)) ||
    amountKeysAr.some(k => key.includes(k)) ||
    key === 'feeReversals' || key === 'paymentReversals'
  )) {
    return `${value.toLocaleString('ar-EG')} ج.م`;
  }

  return String(value);
};

// تقديم بيانات كجدول مفهوم
const renderDataTable = (data: any, colorScheme: 'red' | 'green' | 'amber' = 'green') => {
  if (!data || typeof data !== 'object') return null;

  const colors = {
    red: { bg: 'bg-red-50/30', text: 'text-red-700', label: 'text-red-500', border: 'border-red-100' },
    green: { bg: 'bg-emerald-50/30', text: 'text-emerald-700', label: 'text-emerald-500', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50/30', text: 'text-amber-700', label: 'text-amber-500', border: 'border-amber-100' },
  };
  const c = colors[colorScheme];

  // فصل الحقول البسيطة عن الكائنات المعقدة (مع إخفاء المعرفات التقنية)
  const simpleFields: [string, any][] = [];
  const complexFields: [string, any][] = [];

  // المفاتيح التي تحتوي على معرفات تقنية (UUIDs) يجب إخفاؤها
  const technicalIdKeys = new Set(['id', 'sourceId', 'targetId', 'safeId', 'programId', 'traineeId', 'feeId', 'traineeFeeId', 'traineePaymentId', 'createdById', 'appliedById', 'paidById', 'المعرف', 'معرف المصدر', 'معرف الهدف', 'معرف الخزينة', 'معرف البرنامج', 'معرف المتدرب', 'معرف الرسوم', 'معرف الدفعة']);
  // دالة للتحقق من أن القيمة هي CUID/UUID تقنية
  const isTechnicalId = (key: string, value: any): boolean => {
    if (technicalIdKeys.has(key)) return true;
    if (typeof value === 'string' && /^c[a-z0-9]{20,}$/i.test(value) && !key.includes('Name') && !key.includes('name') && !key.includes('اسم')) return true;
    return false;
  };

  Object.entries(data).forEach(([key, value]) => {
    // إخفاء المعرفات التقنية من العرض
    if (isTechnicalId(key, value)) return;
    
    // تجاهل الحقول التقنية غير المهمة
    if (['createdAt', 'updatedAt', 'id'].includes(key) && typeof value === 'string' && value.length > 20) {
      simpleFields.push([key, value]);
      return;
    }
    if (Array.isArray(value)) {
      complexFields.push([key, value]);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      complexFields.push([key, value]);
    } else {
      simpleFields.push([key, value]);
    }
  });

  return (
    <div className="space-y-2">
      {/* الحقول البسيطة كجدول */}
      {simpleFields.length > 0 && (
        <div className="space-y-1">
          {simpleFields.map(([key, value]) => (
            <div key={key} className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg ${c.bg}`}>
              <span className={`text-[11px] font-medium ${c.label} min-w-[100px]`}>{getFieldName(key)}</span>
              <span className={`text-[11px] ${c.text} font-medium text-left`} dir="auto">{translateValue(key, value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* الكائنات المعقدة */}
      {complexFields.map(([key, value]) => (
        <div key={key} className={`rounded-lg border ${c.border} p-2.5 mt-2`}>
          <p className={`text-[11px] font-bold ${c.label} mb-1.5`}>{getFieldName(key)}</p>
          {Array.isArray(value) ? (
            <div className="space-y-1.5">
              {value.map((item, idx) => (
                <div key={idx} className={`rounded-md ${c.bg} p-2`}>
                  {typeof item === 'object' && item !== null ? (
                    <div className="space-y-1">
                      {Object.entries(item).map(([subKey, subValue]) => (
                        <div key={subKey} className="flex items-center justify-between">
                          <span className={`text-[10px] ${c.label}`}>{getFieldName(subKey)}</span>
                          <span className={`text-[10px] ${c.text} font-medium`} dir="auto">
                            {typeof subValue === 'object' ? JSON.stringify(subValue) : translateValue(subKey, subValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={`text-[10px] ${c.text}`}>{translateValue(key, item)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : typeof value === 'object' && value !== null ? (
            <div className="space-y-1">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey} className={`flex items-center justify-between py-1 px-2 rounded ${c.bg}`}>
                  <span className={`text-[10px] ${c.label}`}>{getFieldName(subKey)}</span>
                  <span className={`text-[10px] ${c.text} font-medium`} dir="auto">
                    {typeof subValue === 'object' ? JSON.stringify(subValue) : translateValue(subKey, subValue)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

// تنسيق التاريخ بالعربي
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleString('ar-EG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFullDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ========== الصفحة الرئيسية ==========
function FinancialAuditLogsPageContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FinancialAuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<FinancialAuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // الفلاتر
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // الترقيم
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // جلب السجلات
  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: AuditFilters = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filterAction) filters.action = filterAction as FinancialAction;
      if (filterEntityType) filters.entityType = filterEntityType;
      if (filterUser) filters.userId = filterUser;
      if (filterDateFrom) filters.dateFrom = new Date(filterDateFrom);
      if (filterDateTo) filters.dateTo = new Date(filterDateTo);

      const response = await getFinancialAuditLogs(filters);
      setLogs(response.logs);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
        hasNext: response.page < response.totalPages,
        hasPrev: response.page > 1,
      }));
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب سجل العمليات');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterAction, filterEntityType, filterUser, filterDateFrom, filterDateTo]);

  // جلب الإحصائيات
  const fetchStatistics = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const stats = await getAuditStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // قائمة المستخدمين الفريدين من الإحصائيات
  const uniqueUsers = useMemo(() => {
    return statistics?.userStats?.map(u => ({
      value: u.userId,
      label: `${u.userName} (${u._count})`,
    })) || [];
  }, [statistics]);

  // عدد الفلاتر النشطة
  const activeFiltersCount = [filterAction, filterEntityType, filterUser, filterDateFrom, filterDateTo].filter(Boolean).length;

  // تصفير الفلاتر
  const resetFilters = () => {
    setFilterAction('');
    setFilterEntityType('');
    setFilterUser('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // عرض تفاصيل السجل
  const handleViewDetails = (log: FinancialAuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // أكثر العمليات شيوعاً
  const topAction = statistics?.actionStats?.[0];

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <PageHeader
        title="سجل العمليات المالية"
        description="تتبع شامل لجميع العمليات والتغييرات المالية في النظام"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'النظام المالي', href: '/dashboard/finances/safes' },
          { label: 'سجل العمليات المالية' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchAuditLogs(); fetchStatistics(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              تحديث
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FunnelIcon className="w-3.5 h-3.5" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card size="sm" hover={false}>
          <CardStat
            icon={<ShieldCheckIcon className="w-5 h-5" />}
            title="إجمالي العمليات"
            value={isStatsLoading ? '...' : (statistics?.totalLogs?.toLocaleString() || '0')}
            variant="primary"
          />
        </Card>
        <Card size="sm" hover={false}>
          <CardStat
            icon={<ClockIcon className="w-5 h-5" />}
            title="عمليات اليوم"
            value={isStatsLoading ? '...' : (statistics?.todayLogs?.toString() || '0')}
            variant="secondary"
          />
        </Card>
        <Card size="sm" hover={false}>
          <CardStat
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            title="هذا الأسبوع"
            value={isStatsLoading ? '...' : (statistics?.weekLogs?.toString() || '0')}
            variant="warning"
          />
        </Card>
        <Card size="sm" hover={false}>
          <CardStat
            icon={<ChartBarIcon className="w-5 h-5" />}
            title="هذا الشهر"
            value={isStatsLoading ? '...' : (statistics?.monthLogs?.toString() || '0')}
            variant="danger"
          />
        </Card>
      </div>

      {/* الفلاتر */}
      {showFilters && (
        <Card size="md" hover={false} className="!shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">تصفية النتائج</h3>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* نوع العملية */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">نوع العملية</label>
              <SimpleSelect
                value={filterAction}
                onChange={(val) => { setFilterAction(val); setPagination(p => ({ ...p, page: 1 })); }}
                options={[
                  { value: '', label: 'جميع العمليات' },
                  ...actionGroups.flatMap(group => [
                    { value: `__group_${group.label}`, label: `── ${group.label} ──`, disabled: true },
                    ...group.actions.map(a => ({ value: a, label: getActionDisplayName(a) })),
                  ]),
                ]}
                placeholder="جميع العمليات"
              />
            </div>

            {/* نوع الكيان */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">نوع الكيان</label>
              <SimpleSelect
                value={filterEntityType}
                onChange={(val) => { setFilterEntityType(val); setPagination(p => ({ ...p, page: 1 })); }}
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'Safe', label: 'خزينة' },
                  { value: 'TraineeFee', label: 'رسوم متدربين' },
                  { value: 'TraineePayment', label: 'مدفوعات متدربين' },
                  { value: 'Transaction', label: 'معاملة مالية' },
                ]}
                placeholder="جميع الأنواع"
              />
            </div>

            {/* المستخدم */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">المستخدم</label>
              <SimpleSelect
                value={filterUser}
                onChange={(val) => { setFilterUser(val); setPagination(p => ({ ...p, page: 1 })); }}
                options={[
                  { value: '', label: 'جميع المستخدمين' },
                  ...uniqueUsers,
                ]}
                placeholder="جميع المستخدمين"
              />
            </div>

            {/* من تاريخ */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
              <TibaDatePicker
                value={filterDateFrom}
                onChange={(val) => { setFilterDateFrom(val); setPagination(p => ({ ...p, page: 1 })); }}
                placeholder="من تاريخ"
              />
            </div>

            {/* إلى تاريخ */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
              <TibaDatePicker
                value={filterDateTo}
                onChange={(val) => { setFilterDateTo(val); setPagination(p => ({ ...p, page: 1 })); }}
                placeholder="إلى تاريخ"
              />
            </div>
          </div>
        </Card>
      )}

      {/* جدول السجلات - سطح المكتب */}
      <Card size="sm" hover={false} className="!p-0 !shadow-sm hidden md:block">
        {/* رأس الجدول */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4.5 h-4.5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">سجل العمليات</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {pagination.total.toLocaleString()} عملية
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-50 rounded w-1/3" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <DocumentMagnifyingGlassIcon className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-sm font-semibold text-slate-600 mb-1">لا توجد عمليات</h4>
            <p className="text-xs text-slate-400 text-center">
              {activeFiltersCount > 0 ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لم يتم تسجيل أي عمليات مالية بعد'}
            </p>
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                مسح جميع الفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">الوقت</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">العملية</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">الكيان</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">الوصف</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">المبلغ</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">المستخدم</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16">تفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    onClick={() => handleViewDetails(log)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-xs text-slate-600 font-medium">{formatDateShort(log.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md ${getActionBadgeStyle(log.action)}`}>
                        {getActionIcon(log.action)}
                        {getActionDisplayName(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${getEntityBadgeStyle(log.entityType)}`}>
                        {getEntityIcon(log.entityType)}
                        {getEntityTypeDisplayName(log.entityType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-700 truncate" title={log.description}>
                        {log.description || 'بدون وصف'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.amount ? (
                        <span className="text-xs font-bold text-slate-800">
                          {formatCurrency(log.amount, log.currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {log.userName?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(log); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ترقيم الصفحات */}
        {pagination.total > 0 && (
          <div className="border-t border-slate-100">
            <Pagination
              pagination={pagination}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              onLimitChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
              showLimitSelector
              limitOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </Card>

      {/* بطاقات الموبايل */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">سجل العمليات</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {pagination.total.toLocaleString()}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} size="sm" hover={false}>
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-slate-100 rounded" />
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                  </div>
                  <div className="h-3 bg-slate-50 rounded w-3/4" />
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-slate-100 rounded" />
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card size="md" hover={false}>
            <div className="flex flex-col items-center justify-center py-8">
              <DocumentMagnifyingGlassIcon className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">لا توجد عمليات</p>
            </div>
          </Card>
        ) : (
          <>
            {logs.map((log) => (
              <Card
                key={log.id}
                size="sm"
                hover={true}
                onClick={() => handleViewDetails(log)}
                className="!cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="space-y-2.5">
                  {/* الصف العلوي: العملية + الوقت */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md ${getActionBadgeStyle(log.action)}`}>
                      {getActionIcon(log.action)}
                      {getActionDisplayName(log.action)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDateShort(log.createdAt)}</span>
                  </div>

                  {/* الوصف */}
                  <p className="text-xs text-slate-600 line-clamp-2">{log.description || 'بدون وصف'}</p>

                  {/* الصف السفلي: المستخدم + المبلغ + الكيان */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {log.userName?.charAt(0) || '?'}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">{log.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${getEntityBadgeStyle(log.entityType)}`}>
                        {getEntityTypeDisplayName(log.entityType)}
                      </span>
                      {log.amount && (
                        <span className="text-xs font-bold text-slate-700">
                          {formatCurrency(log.amount, log.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* ترقيم الموبايل */}
            {pagination.total > 0 && (
              <Pagination
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                onLimitChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
                showLimitSelector
                limitOptions={[10, 20, 50]}
              />
            )}
          </>
        )}
      </div>

      {/* ====== نافذة التفاصيل ====== */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* الخلفية المظللة */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDetailsModal(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* رأس النافذة */}
              <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ShieldCheckIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">تفاصيل العملية المالية</h3>
                      <p className="text-xs text-blue-100 mt-0.5">{formatFullDate(selectedLog.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* المحتوى */}
              <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 space-y-5">
                {/* معلومات العملية */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-1">نوع العملية</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md ${getActionBadgeStyle(selectedLog.action)}`}>
                      {getActionIcon(selectedLog.action)}
                      {getActionDisplayName(selectedLog.action)}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-1">نوع الكيان</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${getEntityBadgeStyle(selectedLog.entityType)}`}>
                      {getEntityIcon(selectedLog.entityType)}
                      {getEntityTypeDisplayName(selectedLog.entityType)}
                    </span>
                  </div>
                  {selectedLog.amount != null && selectedLog.amount > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[11px] text-slate-400 mb-1">المبلغ</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(selectedLog.amount, selectedLog.currency)}
                      </p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-1">معرف الكيان</p>
                    <p className="text-xs font-mono text-slate-600 break-all">{selectedLog.entityId || '-'}</p>
                  </div>
                </div>

                {/* الوصف */}
                {selectedLog.description && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                      <p className="text-xs font-semibold text-blue-700">وصف العملية</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedLog.description}</p>
                  </div>
                )}

                {/* معلومات المستخدم */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <UserCircleIcon className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-700">معلومات المستخدم</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-slate-400">الاسم</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                          {selectedLog.userName?.charAt(0) || '?'}
                        </div>
                        <p className="text-xs font-medium text-slate-700">{selectedLog.userName}</p>
                      </div>
                    </div>
                    {selectedLog.userRole && (
                      <div>
                        <p className="text-[11px] text-slate-400">الدور</p>
                        <p className="text-xs text-slate-600 mt-0.5">{selectedLog.userRole}</p>
                      </div>
                    )}
                    {selectedLog.ipAddress && (
                      <div>
                        <p className="text-[11px] text-slate-400">عنوان IP</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <GlobeAltIcon className="w-3 h-3 text-slate-400" />
                          <p className="text-xs font-mono text-slate-600">{selectedLog.ipAddress}</p>
                        </div>
                      </div>
                    )}
                    {selectedLog.userAgent && (
                      <div className="col-span-2">
                        <p className="text-[11px] text-slate-400">المتصفح</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <ComputerDesktopIcon className="w-3 h-3 text-slate-400" />
                          <p className="text-[11px] text-slate-500 truncate">{selectedLog.userAgent}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* كيان مرتبط */}
                {selectedLog.relatedEntityType && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-2">كيان مرتبط</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-slate-400">النوع</p>
                        <p className="text-xs text-slate-600 mt-0.5">{getEntityTypeDisplayName(selectedLog.relatedEntityType)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">المعرف</p>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">{selectedLog.relatedEntityId || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* البيانات القديمة والجديدة */}
                {(selectedLog.oldData || selectedLog.newData) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <DocumentTextIcon className="w-4 h-4 text-slate-500" />
                      البيانات التفصيلية
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedLog.oldData && (
                        <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                          <p className="text-[11px] font-semibold text-red-600 mb-2">البيانات القديمة</p>
                          <div className="max-h-60 overflow-y-auto">
                            {typeof selectedLog.oldData === 'string'
                              ? <p className="text-[11px] text-red-800">{selectedLog.oldData}</p>
                              : renderDataTable(selectedLog.oldData, 'red')}
                          </div>
                        </div>
                      )}
                      {selectedLog.newData && (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[11px] font-semibold text-emerald-600 mb-2">البيانات الجديدة</p>
                          <div className="max-h-60 overflow-y-auto">
                            {typeof selectedLog.newData === 'string'
                              ? <p className="text-[11px] text-emerald-800">{selectedLog.newData}</p>
                              : renderDataTable(selectedLog.newData, 'green')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* التغييرات */}
                {selectedLog.changes && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                      <ArrowsRightLeftIcon className="w-4 h-4" />
                      التغييرات
                    </p>
                    <div className="space-y-2">
                      {typeof selectedLog.changes === 'object' && selectedLog.changes !== null ? (
                        Object.entries(selectedLog.changes).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-amber-50/50">
                            <span className="font-medium text-amber-600 min-w-[100px]">{getFieldName(key)}</span>
                            {value && typeof value === 'object' && 'old' in value && 'new' in value ? (
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-red-600 line-through text-[11px]">{translateValue(key, value.old)}</span>
                                <span className="text-slate-400">←</span>
                                <span className="text-emerald-600 font-medium text-[11px]">{translateValue(key, value.new)}</span>
                              </div>
                            ) : (
                              <span className="text-amber-700 text-[11px] font-medium" dir="auto">{translateValue(key, value)}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="max-h-40 overflow-y-auto">
                          {renderDataTable(selectedLog.changes, 'amber')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ملاحظات */}
                {selectedLog.notes && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-1">ملاحظات</p>
                    <p className="text-xs text-slate-600">{selectedLog.notes}</p>
                  </div>
                )}

                {/* حالة الإلغاء */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    {selectedLog.isReversible ? (
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-slate-300" />
                    )}
                    <span className={selectedLog.isReversible ? 'text-emerald-600' : 'text-slate-400'}>
                      {selectedLog.isReversible ? 'قابلة للتراجع' : 'غير قابلة للتراجع'}
                    </span>
                  </div>
                  {selectedLog.isReversed && (
                    <div className="flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-600">تم التراجع عنها</span>
                    </div>
                  )}
                </div>
              </div>

              {/* أسفل النافذة */}
              <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialAuditLogsPage() {
  return (
    <PageGuard resource="dashboard.financial.audit-log" action="view">
      <FinancialAuditLogsPageContent />
    </PageGuard>
  );
}
