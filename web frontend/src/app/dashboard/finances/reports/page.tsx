'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import PremiumLoader from '@/components/ui/PremiumLoader';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  BoltIcon,
  TrophyIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  netIncome: number;
  totalBalance: number;
  transactionsToday: number;
  incomeTransactions: number;
  expenseTransactions: number;
}

interface SafeData {
  id: string;
  name: string;
  balance: number;
  currency: string;
  transactionsCount: number;
}

interface IncomeByType {
  type: string;
  amount: number;
  count: number;
  percentage: string;
}

interface IncomeByTarget {
  safeName: string;
  safeId: string;
  income: number;
  transactionsCount: number;
}

interface RecentTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  sourceSafe?: string;
  targetSafe?: string;
  traineeName?: string;
  feeName?: string;
  createdAt: string;
}

interface FinancialDashboard {
  summary: FinancialSummary;
  safes: SafeData[];
  incomeByType: IncomeByType[];
  incomeByTarget: IncomeByTarget[];
  recentTransactions: RecentTransaction[];
}

const TRANSACTION_TYPE_MAP: Record<string, string> = {
  DEPOSIT: 'إيداع',
  WITHDRAW: 'سحب',
  TRANSFER: 'تحويل',
  FEE: 'رسوم',
  PAYMENT: 'دفع',
};

const TRANSACTION_ICON_COLORS: Record<string, { bg: string; text: string }> = {
  DEPOSIT: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  PAYMENT: { bg: 'bg-blue-100', text: 'text-blue-600' },
  WITHDRAW: { bg: 'bg-red-100', text: 'text-red-600' },
  TRANSFER: { bg: 'bg-amber-100', text: 'text-amber-600' },
  FEE: { bg: 'bg-purple-100', text: 'text-purple-600' },
};

function FinancialReportsPageContent() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFinancialDashboard();
    }
  }, [isAuthenticated, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFinancialDashboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const response = await fetchAPI(`/finances/reports/dashboard?${params.toString()}`);
      setDashboard(response);
    } catch (error) {
      console.error('Error loading financial dashboard:', error);
      toast.error('فشل في تحميل التقرير المالي');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialDashboard();
    setRefreshing(false);
    toast.success('تم تحديث التقرير بنجاح');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowUpIcon className="w-4 h-4" />;
      case 'PAYMENT': return <CurrencyDollarIcon className="w-4 h-4" />;
      case 'WITHDRAW': return <ArrowDownIcon className="w-4 h-4" />;
      case 'TRANSFER': return <ArrowRightIcon className="w-4 h-4" />;
      case 'FEE': return <CreditCardIcon className="w-4 h-4" />;
      default: return <BoltIcon className="w-4 h-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PremiumLoader type="data" message="جاري تحميل التقارير المالية..." />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ChartBarIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">لا توجد بيانات متاحة</p>
          <p className="text-xs text-slate-300 mt-1">حاول تغيير الفلاتر أو التحديث</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="التقارير المالية"
        description="تحليل شامل للمعاملات والأداء المالي"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المالية', href: '/dashboard/finances/safes' },
          { label: 'التقارير المالية' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={<XMarkIcon className="w-4 h-4" />}
              onClick={() => { setDateFrom(''); setDateTo(''); }}>
              مسح الفلاتر
            </Button>
            <Button variant="default" leftIcon={<ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </Button>
          </div>
        }
      />

      {/* Date Filters */}
      <Card hover={false} className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-2 mb-1 sm:mb-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">فلترة حسب التاريخ</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-1">
            <div className="flex-1">
              <TibaDatePicker
                value={dateFrom}
                onChange={(val) => setDateFrom(val)}
                label="من تاريخ"
                size="sm"
                clearable
              />
            </div>
            <div className="flex-1">
              <TibaDatePicker
                value={dateTo}
                onChange={(val) => setDateTo(val)}
                label="إلى تاريخ"
                size="sm"
                clearable
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Income */}
        <Card hover={true} className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">إجمالي الدخل {dateFrom || dateTo ? 'للفترة المحددة' : 'اليوم'}</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mb-2">
            {formatCurrency(dashboard.summary.totalIncome)}
          </p>
          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 w-fit">
            <BoltIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{dashboard.summary.incomeTransactions} معاملة دخل</span>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card hover={true} className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">إجمالي المصروفات {dateFrom || dateTo ? 'للفترة المحددة' : 'اليوم'}</h3>
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 mb-2">
            {formatCurrency(dashboard.summary.totalExpenses || 0)}
          </p>
          <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 rounded-lg px-3 py-1.5 w-fit">
            <BoltIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{dashboard.summary.expenseTransactions} معاملة مصروفات</span>
          </div>
        </Card>

        {/* Net Income */}
        <Card hover={true} className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">صافي الدخل</h3>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dashboard.summary.netIncome >= 0 ? 'bg-blue-100' : 'bg-amber-100'
            }`}>
              {dashboard.summary.netIncome >= 0
                ? <ArrowUpIcon className="w-5 h-5 text-blue-600" />
                : <ArrowDownIcon className="w-5 h-5 text-amber-600" />
              }
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-black mb-2 ${
            dashboard.summary.netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'
          }`}>
            {formatCurrency(dashboard.summary.netIncome)}
          </p>
          <div className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 w-fit ${
            dashboard.summary.netIncome >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
          }`}>
            <BoltIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{dashboard.summary.netIncome >= 0 ? 'ربح صافي' : 'خسارة صافية'}</span>
          </div>
        </Card>
      </div>

      {/* Income by Safes */}
      <Card hover={false} className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <TrophyIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">دفع الرسوم حسب الخزائن</h2>
              <p className="text-[11px] text-slate-400">ترتيب الخزائن حسب إجمالي الدخل</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          {dashboard.incomeByTarget.length === 0 ? (
            <div className="text-center py-10">
              <WalletIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">لا توجد بيانات</p>
            </div>
          ) : (
            dashboard.incomeByTarget.slice(0, 5).map((item, index) => {
              const percent = dashboard.summary.totalIncome > 0
                ? (item.income / dashboard.summary.totalIncome * 100)
                : 0;
              const rankColors = [
                'bg-amber-500 text-white',
                'bg-slate-400 text-white',
                'bg-orange-400 text-white',
                'bg-blue-400 text-white',
                'bg-slate-300 text-slate-700',
              ];
              return (
                <div key={item.safeId} className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${rankColors[index] || rankColors[4]}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.safeName}</p>
                    <p className="text-[11px] text-slate-400">{item.transactionsCount} معاملة</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-black text-slate-800">{formatCurrency(item.income)}</p>
                    <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card hover={false} className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">أحدث المعاملات المالية</h2>
              <p className="text-[11px] text-slate-400">آخر المعاملات المسجلة في النظام</p>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">النوع</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">الوصف</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">الخزينة / المتدرب</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">المبلغ</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dashboard.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <BanknotesIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">لا توجد معاملات</p>
                  </td>
                </tr>
              ) : (
                dashboard.recentTransactions.map((tx) => {
                  const colors = TRANSACTION_ICON_COLORS[tx.type] || { bg: 'bg-slate-100', text: 'text-slate-600' };
                  const isPositive = tx.type === 'DEPOSIT' || tx.type === 'PAYMENT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
                            {getTransactionIcon(tx.type)}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{TRANSACTION_TYPE_MAP[tx.type] || tx.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ExpandableDescription text={tx.description} variant="table" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tx.targetSafe && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {tx.targetSafe}
                            </span>
                          )}
                          {tx.traineeName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {tx.traineeName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {dashboard.recentTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <BanknotesIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">لا توجد معاملات</p>
            </div>
          ) : (
            dashboard.recentTransactions.map((tx) => {
              const colors = TRANSACTION_ICON_COLORS[tx.type] || { bg: 'bg-slate-100', text: 'text-slate-600' };
              const isPositive = tx.type === 'DEPOSIT' || tx.type === 'PAYMENT';
              return (
                <div key={tx.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text} shrink-0`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{TRANSACTION_TYPE_MAP[tx.type] || tx.type}</span>
                        <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <ExpandableDescription text={tx.description} variant="card" className="mb-2" />
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tx.targetSafe && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
                            {tx.targetSafe}
                          </span>
                        )}
                        {tx.traineeName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {tx.traineeName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <CalendarDaysIcon className="w-3 h-3" />
                        <span>{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

export default function FinancialReportsPage() {
  return (
    <FinancialPageGuard>
      <FinancialReportsPageContent />
    </FinancialPageGuard>
  );
}