'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Pagination, type PaginationInfo } from '@/components/ui/Pagination';
import { fetchAPI } from '@/lib/api';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

type SubmissionStatus = 'NEW' | 'CURRENT' | 'GRADUATE' | 'WITHDRAWN';
type PayoutStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

interface MySubmissionsData {
  employee: { id: number; name: string };
  year: number;
  years: number[];
  summary: {
    applicationsCount: number;
    enrolledCount: number;
    statusCounts: Record<string, number>;
    commissionsCount: number;
    commissionsAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paidCount: number;
    pendingCount: number;
    partialCount: number;
  };
  monthly: Array<{ month: number; applications: number; commissions: number; paid: number }>;
  applications: Array<{
    id: number;
    applicantName: string;
    applicantPhone: string;
    applicantEmail: string | null;
    programInterest: string | null;
    source: string | null;
    status: SubmissionStatus;
    createdAt: string;
  }>;
  commissions: Array<{
    id: number;
    traineeId: number | null;
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    payoutStatus: PayoutStatus;
    description: string | null;
    createdAt: string;
    paidAt: string | null;
    trainee: { nameAr: string; program: { nameAr: string } } | null;
  }>;
}

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const SUBMISSION_STATUSES: Record<SubmissionStatus, { label: string; className: string }> = {
  NEW: { label: 'مستجد', className: 'bg-blue-50 text-blue-700' },
  CURRENT: { label: 'مستمر', className: 'bg-emerald-50 text-emerald-700' },
  GRADUATE: { label: 'خريج', className: 'bg-violet-50 text-violet-700' },
  WITHDRAWN: { label: 'منسحب', className: 'bg-rose-50 text-rose-700' },
};

const PAYOUT_STATUSES: Record<PayoutStatus, { label: string; className: string }> = {
  PENDING: { label: 'لم يُصرف', className: 'bg-amber-50 text-amber-800' },
  PARTIALLY_PAID: { label: 'صُرف جزئياً', className: 'bg-blue-50 text-blue-700' },
  PAID: { label: 'تم الصرف', className: 'bg-emerald-50 text-emerald-700' },
};

const formatMoney = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value || 0);
const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function MyMarketingSubmissionsPage() {
  const [data, setData] = useState<MySubmissionsData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionLimit, setCommissionLimit] = useState(10);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAPI(`/marketing/my-submissions?year=${year}`)
      .then((result: MySubmissionsData) => {
        if (!active) return;
        setData(result);
        if (result.year !== year) setYear(result.year);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل تقديماتك');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year]);

  useEffect(() => {
    setCommissionPage(1);
  }, [year]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(event.target as Node)) setYearMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const maxMonthlyApplications = useMemo(() => Math.max(1, ...(data?.monthly.map(item => item.applications) || [])), [data]);
  const commissionPagination = useMemo<PaginationInfo>(() => {
    const total = data?.commissions.length || 0;
    const totalPages = Math.ceil(total / commissionLimit);
    return {
      page: Math.min(commissionPage, Math.max(1, totalPages)),
      limit: commissionLimit,
      total,
      totalPages,
      hasNext: commissionPage < totalPages,
      hasPrev: commissionPage > 1,
    };
  }, [commissionLimit, commissionPage, data?.commissions.length]);
  const visibleCommissions = useMemo(() => {
    const start = (commissionPagination.page - 1) * commissionLimit;
    return (data?.commissions || []).slice(start, start + commissionLimit);
  }, [commissionLimit, commissionPagination.page, data?.commissions]);
  const enrollmentRate = data?.summary.applicationsCount
    ? Math.round((data.summary.enrolledCount / data.summary.applicationsCount) * 100)
    : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        title="تقديماتي"
        description="تابع تقديماتك السنوية وعمولاتك وحالة صرفها"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الموارد البشرية' },
          { label: 'تقديماتي' },
        ]}
      />

      {loading && !data ? (
        <div className="space-y-5 animate-pulse">
          <div className="h-36 rounded-3xl bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100" />)}</div>
          <div className="h-72 rounded-2xl bg-slate-100" />
        </div>
      ) : error && !data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-bold text-rose-800">{error}</p>
          <p className="mt-2 text-sm text-rose-700">تأكد من ربط حسابك بموظف تسويق ثم أعد تحميل الصفحة.</p>
        </div>
      ) : data ? (
        <>
          <section className="relative rounded-3xl bg-gradient-to-l from-[#102a43] via-[#164e78] to-[#2563a6] p-6 text-white shadow-lg sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -left-10 -top-20 h-64 w-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-cyan-300/10" />
            </div>
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  <BriefcaseIcon className="h-4 w-4" /> مساحة العمل التسويقية
                </div>
                <h1 className="text-2xl font-black sm:text-3xl">مرحباً، {data.employee.name}</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">هنا تجد سجل تقديماتك ومتابعة العمولات المستحقة والمبالغ التي تم صرفها.</p>
              </div>
              <div ref={yearMenuRef} className="relative flex min-w-52 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <CalendarDaysIcon className="h-5 w-5 text-cyan-100" />
                <span className="text-xs font-semibold text-blue-100">السنة</span>
                <button type="button" aria-label="اختر السنة" aria-expanded={yearMenuOpen} onClick={() => setYearMenuOpen(open => !open)} className="mr-auto inline-flex min-w-[92px] items-center justify-between gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-200">
                  <span>{year}</span><ChevronDownIcon className={`h-4 w-4 transition-transform ${yearMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {yearMenuOpen && <div role="listbox" aria-label="السنوات المتاحة" className="marketing-year-menu absolute left-3 top-full z-30 mt-2 max-h-64 min-w-[130px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {(data.years.length ? data.years : [year]).map(item => <button key={item} type="button" role="option" aria-selected={item === year} onClick={() => { setYear(item); setYearMenuOpen(false); }} className={`marketing-year-option flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${item === year ? 'font-bold' : 'hover:bg-slate-50'}`}><span>{item}</span>{item === year && <CheckCircleIcon className="h-4 w-4" />}</button>)}
                </div>}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            <MetricCard title="المتدربون المضافون" value={data.summary.applicationsCount} hint={`${data.summary.enrolledCount} مستجد أو مستمر`} icon={<UserGroupIcon className="h-5 w-5" />} tone="blue" />
            <MetricCard title="نسبة المستجدين والمستمرين" value={`${enrollmentRate}%`} hint="من المتدربين المضافين هذا العام" icon={<ChartBarIcon className="h-5 w-5" />} tone="violet" />
            <MetricCard title="إجمالي العمولات" value={`${formatMoney(data.summary.commissionsAmount)} ج.م`} hint={`${data.summary.commissionsCount} عمولة`} icon={<BanknotesIcon className="h-5 w-5" />} tone="indigo" />
            <MetricCard title="المصروف" value={`${formatMoney(data.summary.paidAmount)} ج.م`} hint={`${data.summary.paidCount} مكتملة الصرف`} icon={<ArrowDownTrayIcon className="h-5 w-5" />} tone="emerald" />
            <MetricCard title="المتبقي" value={`${formatMoney(data.summary.remainingAmount)} ج.م`} hint={`${data.summary.pendingCount + data.summary.partialCount} بانتظار الاستكمال`} icon={<ClockIcon className="h-5 w-5" />} tone="amber" />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">حركة التقديمات خلال العام</h2>
                  <p className="mt-1 text-xs text-slate-500">عدد المتدربين المضافين في كل شهر</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{year}</span>
              </div>
              {data.summary.applicationsCount > 0 ? (
                <div className="grid h-48 grid-cols-6 items-end gap-2 border-b border-slate-100 pb-2 sm:grid-cols-12 sm:gap-3">
                  {data.monthly.map(item => (
                    <div key={item.month} className="flex h-full flex-col items-center justify-end gap-2">
                      <span className="text-[10px] font-bold text-slate-700">{item.applications || ''}</span>
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div className={`w-full max-w-7 rounded-t-lg transition-all ${item.applications ? 'bg-gradient-to-t from-blue-700 to-cyan-400' : 'bg-slate-100'}`} style={{ height: `${Math.max(8, (item.applications / maxMonthlyApplications) * 100)}%` }} />
                      </div>
                      <span className="text-[9px] font-medium text-slate-600 sm:text-[10px]">{MONTH_NAMES[item.month - 1]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-center">
                  <div className="mb-3 rounded-xl bg-white p-3 text-blue-600 shadow-sm"><ChartBarIcon className="h-6 w-6" /></div>
                  <p className="text-sm font-bold text-slate-700">لا توجد تقديمات خلال {year}</p>
                  <p className="mt-1 text-xs text-slate-500">ستظهر حركة الإضافات هنا عند تسجيل أول متدرب.</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(data.summary.statusCounts).map(([status, count]) => {
                  const statusInfo = SUBMISSION_STATUSES[status as SubmissionStatus];
                  if (!statusInfo) return null;
                  return <span key={status} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${statusInfo.className}`}>{statusInfo.label}: {count}</span>;
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-black text-slate-900">ملخص العمولات</h2>
              <p className="mt-1 text-xs text-slate-500">حالة الصرف حسب السجلات المالية الفعلية</p>
              <div className="mt-6 space-y-4">
                <CommissionBreakdown label="تم صرفها بالكامل" count={data.summary.paidCount} amount={data.commissions.filter(item => item.payoutStatus === 'PAID').reduce((sum, item) => sum + item.paidAmount, 0)} color="bg-emerald-500" />
                <CommissionBreakdown label="صُرفت جزئياً" count={data.summary.partialCount} amount={data.commissions.filter(item => item.payoutStatus === 'PARTIALLY_PAID').reduce((sum, item) => sum + item.paidAmount, 0)} color="bg-blue-500" />
                <CommissionBreakdown label="لم تُصرف بعد" count={data.summary.pendingCount} amount={data.commissions.filter(item => item.payoutStatus === 'PENDING').reduce((sum, item) => sum + item.remainingAmount, 0)} color="bg-amber-500" />
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">إجمالي المستحق</span>
                  <span className="font-black text-slate-900">{formatMoney(data.summary.commissionsAmount)} ج.م</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400" style={{ width: `${data.summary.commissionsAmount ? Math.min(100, (data.summary.paidAmount / data.summary.commissionsAmount) * 100) : 0}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>مصروف {formatMoney(data.summary.paidAmount)} ج.م</span><span>متبقٍ {formatMoney(data.summary.remainingAmount)} ج.م</span></div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><h2 className="font-black text-slate-900">عمولاتي ({data.commissions.length})</h2><p className="mt-1 text-xs text-slate-500">قيمة العمولة والمصروف والمتبقي لكل سجل</p></div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><CurrencyDollarIcon className="h-4 w-4" /> المبالغ بالجنيه المصري</div>
            </div>
            {data.commissions.length ? (
              <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500"><tr><th className="px-5 py-3">المتدرب</th><th className="px-5 py-3">نوع العمولة</th><th className="px-5 py-3">قيمة العمولة</th><th className="px-5 py-3">حالة الصرف</th><th className="px-5 py-3">المصروف</th><th className="px-5 py-3">المتبقي</th><th className="px-5 py-3">التاريخ</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleCommissions.map(commission => {
                      const status = PAYOUT_STATUSES[commission.payoutStatus];
                      return <tr key={commission.id} className="text-sm hover:bg-slate-50/70">
                        <td className="px-5 py-4"><div className="font-bold text-slate-800">{commission.trainee?.nameAr || 'تقديم غير مرتبط بمتدرب'}</div>{commission.trainee?.program?.nameAr && <div className="mt-1 text-xs text-slate-400">{commission.trainee.program.nameAr}</div>}</td>
                        <td className="px-5 py-4 text-slate-600">{commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثانٍ'}</td>
                        <td className="px-5 py-4 font-bold text-slate-800">{formatMoney(commission.amount)} ج.م</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span></td>
                        <td className="px-5 py-4 font-semibold text-emerald-700">{formatMoney(commission.paidAmount)} ج.م</td>
                        <td className="px-5 py-4 font-semibold text-amber-700">{formatMoney(commission.remainingAmount)} ج.م</td>
                        <td className="px-5 py-4 text-xs text-slate-500">{formatDate(commission.createdAt)}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-4 sm:px-5">
                <Pagination
                  pagination={commissionPagination}
                  onPageChange={setCommissionPage}
                  onLimitChange={limit => { setCommissionLimit(limit); setCommissionPage(1); }}
                  isLoading={loading}
                />
              </div>
              </>
            ) : <EmptyState text="لا توجد عمولات مسجلة لهذا العام." />}
          </section>
          {error && <p role="status" className="text-center text-xs text-rose-600">تعذر تحديث البيانات للسنة المختارة. {error}</p>}
          {loading && <p className="text-center text-xs text-slate-400">جارٍ تحديث بيانات السنة...</p>}
        </>
      ) : null}
      <style jsx global>{`
        .marketing-year-menu .marketing-year-option,
        .marketing-year-menu .marketing-year-option span,
        .marketing-year-menu .marketing-year-option svg {
          color: #475569 !important;
        }
        .marketing-year-menu .marketing-year-option[aria-selected="true"],
        .marketing-year-menu .marketing-year-option[aria-selected="true"] span,
        .marketing-year-menu .marketing-year-option[aria-selected="true"] svg {
          color: #1d4ed8 !important;
        }
        .marketing-year-menu .marketing-year-option[aria-selected="true"] {
          background-color: #eff6ff !important;
        }
      `}</style>
    </div>
  );
}

function MetricCard({ title, value, hint, icon, tone }: { title: string; value: string | number; hint: string; icon: ReactNode; tone: 'blue' | 'violet' | 'indigo' | 'emerald' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{title}</span><span className={`rounded-xl p-2 ${tones[tone]}`}>{icon}</span></div>
    <div className="mt-3 min-h-7 break-words text-sm font-black leading-6 text-slate-900 sm:text-base xl:text-lg">{value}</div>
    <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">{hint}</p>
  </div>;
}

function CommissionBreakdown({ label, count, amount, color }: { label: string; count: number; amount: number; color: string }) {
  return <div className="flex items-center gap-3">
    <span className={`h-10 w-1.5 rounded-full ${color}`} />
    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800">{label}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{count}</span></div><p className="mt-1 text-xs font-semibold text-slate-600">{formatMoney(amount)} ج.م</p></div>
  </div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-500"><ArrowPathIcon className="h-6 w-6" /></div><p className="text-sm font-semibold text-slate-600">{text}</p></div>;
}
