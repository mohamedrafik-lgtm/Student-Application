'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { Pagination, type PaginationInfo } from '@/components/ui/Pagination';
import { ArrowPathIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, ChevronLeftIcon, ExclamationCircleIcon, WalletIcon } from '@heroicons/react/24/outline';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ReportKind = 'income' | 'expense';
interface FlowReport {
  summary: { totalAmount: number; count: number; averageAmount: number; largestAmount: number; smallestAmount: number };
  bySafe: Array<{ id: string; name: string; amount: number; count: number }>;
  byType: Array<{ id: string; name: string; amount: number; count: number }>;
  byCreator: Array<{ id: string; name: string; amount: number; count: number }>;
  byDay: Array<{ date: string; amount: number; count: number }>;
  transactions: Array<{ id: string; amount: number; type: string; description: string | null; reference: string | null; createdAt: string; sourceSafe: string | null; targetSafe: string | null; creator: string; trainee: string | null; nationalId: string | null; fee: string | null; academicYear: string | null }>;
  pagination: PaginationInfo;
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function currency(value: number) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
}

export default function FinancialFlowReport({ kind }: { kind: ReportKind }) {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(() => dateValue(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateTo, setDateTo] = useState(() => dateValue(today));
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<FlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isIncome = kind === 'income';
  const title = isIncome ? 'تقرير الإيرادات' : 'تقرير المصروفات';

  const loadReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ kind, dateFrom, dateTo, page: String(page), limit: '20' });
      const result = await fetchAPI(`/finances/reports/flow-details?${query}`);
      setReport(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل التقرير المالي');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, kind, page]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const comparisonData = useMemo(() => report?.byDay.map((day) => ({ ...day, label: new Date(`${day.date}T00:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) })) || [], [report?.byDay]);
  const pageStart = report?.pagination.total ? (report.pagination.page - 1) * report.pagination.limit + 1 : 0;
  const pageEnd = report ? Math.min(report.pagination.page * report.pagination.limit, report.pagination.total) : 0;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        title={title}
        description={isIncome ? 'تحليل عمليات سداد الرسوم والإيداعات حسب الفترة والخزينة ومُسجل العملية.' : 'تحليل التحويلات من خزائن الدخل إلى خزائن المصروفات ومراجعة تفاصيل كل عملية.'}
        breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المالية', href: '/dashboard/finances/safes' }, { label: 'التقارير المالية', href: '/dashboard/finances/reports' }, { label: title }]}
        actions={<Link href="/dashboard/finances/reports" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"><ChevronLeftIcon className="h-4 w-4" /> كل التقارير</Link>}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><CalendarDaysIcon className="h-5 w-5 text-blue-600" />الفترة الزمنية</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-semibold text-slate-500">من تاريخ<input type="date" value={dateFrom} max={dateTo} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="block text-xs font-semibold text-slate-500">إلى تاريخ<input type="date" value={dateTo} min={dateFrom} max={dateValue(today)} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <button type="button" onClick={() => void loadReport()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800"><ArrowPathIcon className="h-4 w-4" />تحديث التقرير</button>
        </div>
      </section>

      {error ? <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700"><ExclamationCircleIcon className="h-5 w-5" />{error}</div> : null}

      {loading && !report ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-200" />)}</div> : report && (
        <div className={loading ? 'space-y-5 opacity-60' : 'space-y-5'}>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: isIncome ? 'إجمالي الإيرادات' : 'إجمالي المصروفات', value: currency(report.summary.totalAmount), sub: `${report.summary.count.toLocaleString('ar-EG')} عملية`, icon: isIncome ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />, iconClass: isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600' },
              { label: 'متوسط قيمة العملية', value: currency(report.summary.averageAmount), sub: 'متوسط خلال الفترة المحددة', icon: <BanknotesIcon className="h-5 w-5" />, iconClass: 'bg-blue-50 text-blue-600' },
              { label: 'أعلى عملية', value: currency(report.summary.largestAmount), sub: 'أكبر قيمة مسجلة', icon: <ArrowTrendingUpIcon className="h-5 w-5" />, iconClass: 'bg-amber-50 text-amber-600' },
              { label: 'عدد الخزائن المستخدمة', value: report.bySafe.length.toLocaleString('ar-EG'), sub: 'خزائن ضمن التقرير', icon: <WalletIcon className="h-5 w-5" />, iconClass: 'bg-violet-50 text-violet-600' },
            ].map((metric) => (
              <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{metric.label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.iconClass}`}>{metric.icon}</span></div>
                <div className="mt-3 truncate text-xl font-black tabular-nums text-slate-900">{metric.value}</div>
                <div className="mt-1 text-xs text-slate-500">{metric.sub}</div>
              </article>
            ))}
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4"><h2 className="font-bold text-slate-900">الحركة اليومية</h2><p className="mt-1 text-xs text-slate-500">قيمة العمليات وعددها لكل يوم</p></div>
              {comparisonData.length ? <ResponsiveContainer width="100%" height={260}><AreaChart data={comparisonData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}><defs><linearGradient id="flowReportGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isIncome ? '#059669' : '#e11d48'} stopOpacity={0.25} /><stop offset="95%" stopColor={isIncome ? '#059669' : '#e11d48'} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)} ألف` : value} /><Tooltip formatter={(value: number, name: string) => [name === 'amount' ? currency(value) : value, name === 'amount' ? 'القيمة' : 'عدد العمليات']} /><Area type="monotone" dataKey="amount" stroke={isIncome ? '#059669' : '#e11d48'} strokeWidth={2} fill="url(#flowReportGradient)" /></AreaChart></ResponsiveContainer> : <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">لا توجد حركة خلال الفترة</div>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-bold text-slate-900">{isIncome ? 'توزيع الإيرادات حسب الخزينة' : 'توزيع المصروفات حسب خزينة المصروفات'}</h2>
              <div className="mt-4 space-y-4">{report.bySafe.length ? report.bySafe.slice(0, 7).map((safe) => <div key={safe.id}><div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="truncate font-medium text-slate-700">{safe.name}</span><span className="shrink-0 font-bold tabular-nums text-slate-900">{currency(safe.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${report.summary.totalAmount ? Math.min(100, safe.amount / report.summary.totalAmount * 100) : 0}%` }} /></div><div className="mt-1 text-[11px] text-slate-400">{safe.count.toLocaleString('ar-EG')} عملية</div></div>) : <div className="py-12 text-center text-sm text-slate-400">لا توجد بيانات</div>}</div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="font-bold text-slate-900">تفاصيل العمليات</h2><p className="mt-1 text-xs text-slate-500">{isIncome ? 'تشمل بيانات المتدرب والرسم والخزينة ومُسجل العملية عند توفرها.' : 'تشمل الخزائن المحول منها وإليها وسبب التحويل ومُسجل العملية.'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{report.pagination.total.toLocaleString('ar-EG')} عملية</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-semibold">التاريخ</th><th className="px-4 py-3 font-semibold">التفاصيل</th><th className="px-4 py-3 font-semibold">الخزينة</th><th className="px-4 py-3 font-semibold">مُسجل العملية</th><th className="px-4 py-3 font-semibold">المبلغ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{report.transactions.map((transaction) => <tr key={transaction.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{new Date(transaction.createdAt).toLocaleString('ar-EG')}</td><td className="px-4 py-3"><div className="font-semibold text-slate-800">{transaction.description || (isIncome ? transaction.type === 'PAYMENT' ? 'سداد رسوم' : 'إيداع' : transaction.type === 'WITHDRAW' ? 'صرف راتب / سحب من خزينة دخل' : 'تحويل للمصروفات')}</div><div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">{transaction.trainee && <span>المتدرب: {transaction.trainee}</span>}{transaction.nationalId && <span>الرقم القومي: {transaction.nationalId}</span>}{transaction.fee && <span>الرسم: {transaction.fee}</span>}{transaction.reference && <span>مرجع: {transaction.reference}</span>}</div></td><td className="px-4 py-3 text-xs text-slate-600">{isIncome ? transaction.targetSafe || '—' : transaction.type === 'WITHDRAW' ? `سحب من ${transaction.sourceSafe || '—'}` : `${transaction.sourceSafe || '—'} ← ${transaction.targetSafe || '—'}`}</td><td className="px-4 py-3 text-xs text-slate-600">{transaction.creator}</td><td className={`whitespace-nowrap px-4 py-3 font-bold tabular-nums ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(transaction.amount)}</td></tr>)}{report.transactions.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">لا توجد عمليات مطابقة للفترة المحددة</td></tr>}</tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-3"><div className="mb-2 text-center text-xs text-slate-500">عرض {pageStart}–{pageEnd} من {report.pagination.total.toLocaleString('ar-EG')}</div><Pagination pagination={{ ...report.pagination, hasNext: report.pagination.page < report.pagination.totalPages, hasPrev: report.pagination.page > 1 }} onPageChange={setPage} isLoading={loading} /></div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold text-slate-900">{isIncome ? 'نوع الإيراد' : 'بيانات التحويلات'}</h2><div className="mt-3 divide-y divide-slate-100">{report.byType.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-slate-600">{item.name}</span><span className="text-left"><b className="text-slate-900">{currency(item.amount)}</b><small className="mr-2 text-slate-400">({item.count})</small></span></div>)}</div>{!report.byType.length && <p className="py-5 text-sm text-slate-400">لا توجد بيانات</p>}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold text-slate-900">أعلى مُسجلي العمليات</h2><div className="mt-3 divide-y divide-slate-100">{report.byCreator.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="truncate text-slate-600">{item.name}</span><span className="shrink-0 text-left"><b className="text-slate-900">{currency(item.amount)}</b><small className="mr-2 text-slate-400">({item.count} عملية)</small></span></div>)}</div>{!report.byCreator.length && <p className="py-5 text-sm text-slate-400">لا توجد بيانات</p>}</div>
          </section>
        </div>
      )}
    </div>
  );
}
