'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { SimpleSelect } from '@/app/components/ui/Select';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import PremiumLoader from '@/components/ui/PremiumLoader';
import {
  CalendarDaysIcon,
  PrinterIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  UserCircleIcon,
  EyeSlashIcon,
  ArrowLongLeftIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';

interface Safe {
  id: string;
  name: string;
  type?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  category?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  balance: number;
  description?: string;
}

interface FinancialEntry {
  id: number;
  amount: number;
  description: string;
  fromSafeId: number;
  toSafeId: number;
  fromSafe: Safe;
  toSafe: Safe;
  createdAt: string;
  createdBy: { id: string; name: string; };
  type: 'TRANSFER';
}

const SAFE_TYPE_LABELS: Record<string, string> = {
  DEBT: 'خزينة الديون',
  INCOME: 'خزينة الدخل',
  EXPENSE: 'خزينة المصروفات',
  ASSET: 'خزينة الأصول'
};

const SAFE_TYPE_COLORS: Record<string, { dot: string }> = {
  DEBT: { dot: 'bg-red-500' },
  INCOME: { dot: 'bg-emerald-500' },
  EXPENSE: { dot: 'bg-amber-500' },
  ASSET: { dot: 'bg-blue-500' },
};

export default function FinancialEntriesReportPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canViewBalances = hasPermission('finances.safes.balances', 'view');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'today' | 'custom'>('today');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      let apiUrl = '/finances/entries?limit=1000';
      if (reportType === 'today') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        apiUrl += `&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}`;
      } else if (reportType === 'custom' && dateFrom && dateTo) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        apiUrl += `&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`;
      }
      const response = await fetchAPI(apiUrl);
      if (response.success && response.data) { setEntries(response.data); } else { setEntries([]); }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
      setEntries([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  const formatCurrency = (amount: number) => amount.toLocaleString('ar-EG') + ' جنيه';

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.id.toString().includes(query) ||
      entry.description?.toLowerCase().includes(query) ||
      entry.fromSafe?.name?.toLowerCase().includes(query) ||
      entry.toSafe?.name?.toLowerCase().includes(query) ||
      SAFE_TYPE_LABELS[(entry.fromSafe?.type || entry.fromSafe?.category) as string]?.toLowerCase().includes(query) ||
      SAFE_TYPE_LABELS[(entry.toSafe?.type || entry.toSafe?.category) as string]?.toLowerCase().includes(query) ||
      entry.amount.toString().includes(query) ||
      entry.createdBy?.name?.toLowerCase().includes(query) ||
      formatDate(entry.createdAt).includes(query)
    );
  });

  const stats = {
    totalEntries: filteredEntries.length,
    totalAmount: filteredEntries.reduce((sum, e) => sum + e.amount, 0),
    averageAmount: filteredEntries.length > 0 ? filteredEntries.reduce((sum, e) => sum + e.amount, 0) / filteredEntries.length : 0,
  };

  const getSafeTypeInfo = (safe: Safe) => {
    const type = (safe.type || safe.category) as string;
    return { label: SAFE_TYPE_LABELS[type] || 'غير محدد', dot: SAFE_TYPE_COLORS[type]?.dot || 'bg-slate-400' };
  };

  const handlePrint = () => {
    const queryParams = new URLSearchParams();
    if (reportType === 'today') { queryParams.set('type', 'today'); }
    else if (reportType === 'custom' && dateFrom && dateTo) { queryParams.set('type', 'custom'); queryParams.set('dateFrom', dateFrom); queryParams.set('dateTo', dateTo); }
    else { toast.error('يرجى تحديد الفترة الزمنية'); return; }
    window.open(`/print/financial-entries?${queryParams.toString()}`, '_blank');
  };

  return (
    <ProtectedPage requiredPermission={{ resource: 'finances.entries.reports', action: 'view' }}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="تقارير القيود المالية"
          description="عرض وطباعة تقارير القيود المالية"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'المالية', href: '/dashboard/finances/safes' },
            { label: 'القيود المالية', href: '/dashboard/finances/entries' },
            { label: 'التقارير' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              {searchQuery && (
                <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                  {filteredEntries.length} نتيجة
                </span>
              )}
              <Button variant="default" size="sm" leftIcon={<PrinterIcon className="w-4 h-4" />}
                onClick={handlePrint} disabled={entries.length === 0}>
                <span className="hidden sm:inline">طباعة التقرير</span>
                <span className="sm:hidden">طباعة</span>
              </Button>
            </div>
          }
        />

        {/* Filters Card */}
        <Card hover={false} className="!p-4 sm:!p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <FunnelIcon className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">فلترة التقرير</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع التقرير</label>
              <SimpleSelect
                options={[{ value: 'today', label: 'قيود اليوم' }, { value: 'custom', label: 'فترة مخصصة' }]}
                value={reportType}
                onChange={(value) => setReportType(value as 'today' | 'custom')}
                instanceId="report-type-select"
              />
            </div>
            {reportType === 'custom' && (
              <>
                <div>
                  <TibaDatePicker label="من تاريخ" value={dateFrom} onChange={(v: string) => setDateFrom(v)} size="sm" clearable />
                </div>
                <div>
                  <TibaDatePicker label="إلى تاريخ" value={dateTo} onChange={(v: string) => setDateTo(v)} size="sm" clearable />
                </div>
              </>
            )}
            <div>
              <Button variant="default" size="md" fullWidth isLoading={loading}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />} onClick={loadData}>
                عرض التقرير
              </Button>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card hover={false} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">إجمالي القيود</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalEntries}</p>
                  {searchQuery && entries.length !== filteredEntries.length && (
                    <p className="text-[10px] text-slate-400">من أصل {entries.length}</p>
                  )}
                </div>
              </div>
            </Card>
            <Card hover={false} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">إجمالي المبالغ</p>
                  {canViewBalances ? (
                    <p className="text-xl font-black text-emerald-600 truncate">{formatCurrency(stats.totalAmount)}</p>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><EyeSlashIcon className="w-3.5 h-3.5" /> لا توجد صلاحية</span>
                  )}
                </div>
              </div>
            </Card>
            <Card hover={false} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <CalculatorIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">متوسط القيد</p>
                  {canViewBalances ? (
                    <p className="text-xl font-black text-amber-600 truncate">{formatCurrency(stats.averageAmount)}</p>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><EyeSlashIcon className="w-3.5 h-3.5" /> لا توجد صلاحية</span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Search + Table */}
        <Card hover={false} className="!p-0 overflow-hidden">
          {/* Header with search */}
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DocumentChartBarIcon className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">القيود المالية</h2>
              </div>
              {!loading && entries.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث في القيود..."
                      className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" />
                  </div>
                  {searchQuery && (
                    <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="!w-8 !h-8">
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-[11px] text-slate-400">عرض {filteredEntries.length} من أصل {entries.length} قيد</p>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <PremiumLoader type="data" size="sm" message="جاري تحميل البيانات..." />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDaysIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">لا توجد قيود في الفترة المحددة</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center">
              <MagnifyingGlassIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">لا توجد نتائج تطابق البحث</p>
              <p className="text-xs text-slate-300 mt-1">جرب كلمات بحث أخرى</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">من خزينة</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">إلى خزينة</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">المبلغ</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">الوصف</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">المستخدم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEntries.map((entry, index) => {
                      const fromInfo = getSafeTypeInfo(entry.fromSafe);
                      const toInfo = getSafeTypeInfo(entry.toSafe);
                      return (
                        <tr key={`entry-${entry.id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5"><span className="text-xs font-bold text-slate-500">#{entry.id}</span></td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${fromInfo.dot}`} />
                              <div>
                                <p className="text-xs font-bold text-slate-700">{entry.fromSafe?.name}</p>
                                <p className="text-[10px] text-slate-400">{fromInfo.label}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${toInfo.dot}`} />
                              <div>
                                <p className="text-xs font-bold text-slate-700">{entry.toSafe?.name}</p>
                                <p className="text-[10px] text-slate-400">{toInfo.label}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5"><span className="text-xs font-black text-emerald-600">{formatCurrency(entry.amount)}</span></td>
                          <td className="px-4 py-3.5"><ExpandableDescription text={entry.description} variant="table" /></td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <CalendarDaysIcon className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{formatDate(entry.createdAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <UserCircleIcon className="w-4 h-4 text-slate-300" />
                              <span className="text-xs text-slate-600">{entry.createdBy?.name}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredEntries.map((entry, index) => {
                  const fromInfo = getSafeTypeInfo(entry.fromSafe);
                  const toInfo = getSafeTypeInfo(entry.toSafe);
                  return (
                    <div key={`entry-${entry.id}-${index}`} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400">#{entry.id}</span>
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(entry.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${fromInfo.dot}`} />
                            <span className="text-[10px] text-slate-400">من</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate">{entry.fromSafe?.name}</p>
                        </div>
                        <ArrowLongLeftIcon className="w-5 h-5 text-slate-300 shrink-0" />
                        <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${toInfo.dot}`} />
                            <span className="text-[10px] text-slate-400">إلى</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate">{entry.toSafe?.name}</p>
                        </div>
                      </div>
                      {entry.description && <ExpandableDescription text={entry.description} variant="card" className="mb-2" />}
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" /><span>{formatDate(entry.createdAt)}</span></div>
                        <div className="flex items-center gap-1"><UserCircleIcon className="w-3 h-3" /><span>{entry.createdBy?.name}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </ProtectedPage>
  );
}
