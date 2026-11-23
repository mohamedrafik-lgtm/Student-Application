'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { BanknotesIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, PrinterIcon } from '@heroicons/react/24/outline';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function MySalaryPage() {
  const router = useRouter();
  const [slips, setSlips] = useState<any[]>([]);
  const [salaryProfile, setSalaryProfile] = useState<{ baseSalary: number; effectiveFrom: string; isActive: boolean; kpiEnabled: boolean; defaultKpiAmount: number; components: Array<{ name: string; percentage: number; attendanceBased: boolean }>; latestKpi: null | { amount: number; defaultAmount: number; specified: boolean; period: { year: number; month: number; status: string } } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPayrollProfile, setHasPayrollProfile] = useState<boolean | null>(null);
  const [selectedSlipId, setSelectedSlipId] = useState('');
  useEffect(() => {
    let active = true;
    fetchAPI('/payroll/my/eligibility').then((eligibility: { hasPayrollProfile?: boolean }) => {
      const eligible = eligibility?.hasPayrollProfile === true;
      if (active) setHasPayrollProfile(eligible);
      if (!eligible) {
        router.replace('/dashboard');
        return null;
      }
      return Promise.all([fetchAPI('/payroll/my'), fetchAPI('/payroll/my/profile')]);
    }).then((result) => {
      if (active && result) {
        setSlips(Array.isArray(result[0]) ? result[0] : []);
        setSalaryProfile(result[1] || null);
      }
    })
      .catch((error: any) => toast.error(error?.message || 'تعذر تحميل مفردات راتبك'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  if (hasPayrollProfile === false) return null;

  const selectedSlip = slips.find((slip) => slip.id === selectedSlipId);
  const statusLabel = (status: string) => status === 'PAID' ? 'تم الصرف بالكامل' : status === 'PARTIALLY_PAID' ? 'تم الصرف جزئياً' : 'بانتظار الصرف';

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <PageHeader title="راتبي" description="اطلع على مفردات رواتبك المعتمدة وسجل الصرف والرصيد المتبقي." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الموارد البشرية' }, { label: 'راتبي' }]} />
    {salaryProfile && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-l from-blue-800 to-blue-600 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div><div className="text-sm font-semibold text-blue-100">الراتب الأساسي الحالي</div><div className="mt-2 text-3xl font-black tracking-tight">{money(salaryProfile.baseSalary)} <span className="text-sm font-semibold text-blue-100">شهرياً</span></div><p className="mt-2 text-xs text-blue-100">{salaryProfile.effectiveFrom ? `ساري من ${new Date(salaryProfile.effectiveFrom).toLocaleDateString('ar-EG')}` : 'حسب ملف راتبك الحالي'}</p></div>
        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-3 text-xs leading-6 text-blue-50 sm:mt-0 sm:max-w-xl">هذه مفردات الراتب المسجلة حالياً قبل اعتماد مسير الشهر. الصافي النهائي يظهر بعد اعتماد المسير.</div>
      </div>
      <div className="p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-slate-900">بنود الراتب الأساسي</h2><span className="text-xs text-slate-500">القيمة التقديرية حسب النسب المحددة</span></div>
        {salaryProfile.components.length ? <div className="grid gap-2 sm:grid-cols-2">{salaryProfile.components.map((component, index) => <div key={`${component.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="min-w-0"><b className="block truncate text-sm text-slate-800">{component.name}</b><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{component.percentage}%</span>{component.attendanceBased && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">يتأثر بالحضور</span>}</div></div><div className="shrink-0 text-left"><b className="block text-sm text-slate-900">{money(salaryProfile.baseSalary * component.percentage / 100)}</b>{component.attendanceBased && <small className="text-[10px] text-slate-500">قبل تسوية الحضور</small>}</div></div>)}</div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">لا توجد أجزاء راتب معرفة.</p>}
        {salaryProfile.kpiEnabled && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3"><div><b className="text-sm text-violet-900">مكافأة KPI {salaryProfile.latestKpi && `— ${monthNames[salaryProfile.latestKpi.period.month - 1]} ${salaryProfile.latestKpi.period.year}`}</b><p className="mt-1 text-xs text-violet-700">القيمة الافتراضية: <b>{money(salaryProfile.defaultKpiAmount)}</b></p><p className="mt-1 text-xs text-violet-700">{salaryProfile.latestKpi ? `قيمة هذا الشهر ${salaryProfile.latestKpi.specified ? 'المحددة للصرف' : 'المبدئية من الافتراضي'}: ${money(salaryProfile.latestKpi.amount)}` : 'لم يُنشأ مسير شهري لتحديد قيمة الصرف بعد.'}</p></div>{salaryProfile.latestKpi && <div className="text-left"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${salaryProfile.latestKpi.specified ? salaryProfile.latestKpi.period.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800' : 'bg-white text-violet-700'}`}>{salaryProfile.latestKpi.specified ? salaryProfile.latestKpi.period.status === 'DRAFT' ? 'مؤكدة للمسودة' : 'معتمدة' : 'بانتظار تأكيد الإدارة'}</span></div>}</div>}
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">الأجزاء المرتبطة بالحضور تعرض قيمتها قبل التسوية. الإضافات والخصومات وKPI المحدد للشهر تظهر في مفردات الراتب بعد اعتماد المسير.</p>
      </div>
    </section>}
    {loading ? <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-200" />)}</div>
      : slips.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><BanknotesIcon className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">لا توجد مفردات راتب معتمدة حتى الآن</p><p className="mt-1 text-sm text-slate-500">راتبك الأساسي ظاهر أعلاه؛ ستظهر مفردات الشهر وصافي المستحق هنا بعد اعتماد الإدارة للمسير.</p></div>
        : <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <div className="space-y-3">{slips.map((slip) => <button key={slip.id} onClick={() => setSelectedSlipId(slip.id)} className={`block w-full rounded-2xl border bg-white p-4 text-right shadow-sm transition hover:border-blue-300 hover:shadow-md ${selectedSlipId === slip.id ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">راتب {monthNames[slip.period.month - 1]} {slip.period.year}</h2><p className="mt-1 text-xs text-slate-500">أساسي {money(slip.baseSalary)} · KPI الافتراضي {money(slip.kpiDefaultAmount ?? salaryProfile?.defaultKpiAmount ?? 0)} · قيمة الشهر {money(slip.kpiAmount)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${slip.payoutStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : slip.payoutStatus === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{statusLabel(slip.payoutStatus)}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-slate-50 p-2.5"><small className="text-[11px] text-slate-500">صافي المستحق</small><b className="mt-1 block text-sm text-slate-900">{money(slip.netAmount)}</b></div><div className="rounded-lg bg-emerald-50 p-2.5"><small className="text-[11px] text-emerald-700">المصروف</small><b className="mt-1 block text-sm text-emerald-800">{money(slip.paidAmount)}</b></div><div className="rounded-lg bg-amber-50 p-2.5"><small className="text-[11px] text-amber-700">المتبقي</small><b className="mt-1 block text-sm text-amber-800">{money(slip.remainingAmount)}</b></div></div>
          </button>)}</div>
          {selectedSlip ? <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none"><div className="flex items-center justify-between gap-2"><div><h2 className="font-bold text-slate-900">تفاصيل مفردات الراتب</h2><p className="mt-1 text-xs text-slate-500">{monthNames[selectedSlip.period.month - 1]} {selectedSlip.period.year}</p></div><button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><PrinterIcon className="h-4 w-4" />طباعة</button></div>
            <div className="mt-4 divide-y divide-slate-100">{selectedSlip.items.map((item: any) => <div key={item.id} className="flex justify-between gap-2 py-3 text-sm"><span className="text-slate-700">{item.name} <small className="text-slate-400">({item.percentage}%)</small>{item.attendanceBased && <small className="mr-1 text-blue-600">حسب الحضور</small>}</span><b className="text-slate-900">{money(item.payableAmount)}</b></div>)}{selectedSlip.profile?.kpiEnabled && <div className="flex justify-between py-3 text-sm text-violet-700"><span>KPI — الافتراضي {money(selectedSlip.kpiDefaultAmount ?? salaryProfile?.defaultKpiAmount ?? 0)} · قيمة الشهر</span><b>{money(selectedSlip.kpiAmount)}</b></div>}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-3 text-slate-600">إجمالي الإضافات <b className="block mt-1 text-emerald-700">{money(selectedSlip.additions)}</b></div><div className="rounded-lg bg-slate-50 p-3 text-slate-600">إجمالي الخصومات <b className="block mt-1 text-rose-700">{money(selectedSlip.deductions)}</b></div><div className="rounded-lg bg-blue-50 p-3 text-blue-700">الحضور المحتسب <b className="block mt-1">{selectedSlip.attendedWorkDays} من {selectedSlip.expectedWorkDays} يوم عمل</b></div><div className="rounded-lg bg-slate-50 p-3 text-slate-600">معامل الحضور <b className="block mt-1">{(selectedSlip.attendanceFactor * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%</b></div></div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">تم استثناء {selectedSlip.attendanceDetails?.excluded?.holidays || 0} عطلة رسمية و{selectedSlip.attendanceDetails?.excluded?.approvedLeaves || 0} إجازة معتمدة و{selectedSlip.attendanceDetails?.excluded?.weeklyOffDays || 0} يوم عطلة أسبوعية من احتساب الغياب.</div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3"><div className="flex justify-between text-sm"><span className="text-slate-600">صافي المستحق</span><b className="text-blue-800">{money(selectedSlip.netAmount)}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-emerald-700">إجمالي ما تم صرفه</span><b className="text-emerald-800">{money(selectedSlip.paidAmount)}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-amber-700">المتبقي</span><b className="text-amber-800">{money(selectedSlip.remainingAmount)}</b></div></div>
            <h3 className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarDaysIcon className="h-4 w-4 text-blue-600" />سجل الصرف</h3>{selectedSlip.payouts.length ? <div className="mt-2 space-y-2">{selectedSlip.payouts.map((payout: any, index: number) => <div key={index} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span>من {payout.safe.name} إلى {payout.transaction?.targetSafe?.name || 'الخزينة الوجهة'} · {new Date(payout.createdAt).toLocaleDateString('ar-EG')}</span><b>{money(payout.amount)}</b></div>)}</div> : <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><ClockIcon className="h-4 w-4" />لم يتم صرف الراتب بعد.</p>}
            {selectedSlip.adjustments.length > 0 && <><h3 className="mt-5 text-sm font-bold text-slate-800">تعديلات الراتب</h3><div className="mt-2 space-y-2">{selectedSlip.adjustments.map((item: any, index: number) => <div key={index} className="rounded-lg border border-slate-100 p-3 text-xs"><b className={item.type === 'ADDITION' ? 'text-emerald-700' : 'text-rose-700'}>{item.type === 'ADDITION' ? 'إضافة' : 'خصم'} {money(item.amount)}</b><p className="mt-1 text-slate-600">{item.reason}</p></div>)}</div></>}
          </section> : <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"><CheckCircleIcon className="ml-2 h-5 w-5 text-blue-500" />اختر الشهر لعرض تفاصيل راتبك.</div>}
        </div>}
  </div>;
}
