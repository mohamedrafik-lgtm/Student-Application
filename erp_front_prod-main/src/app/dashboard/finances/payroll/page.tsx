'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import PageHeader from '@/app/components/PageHeader';
import { BanknotesIcon, CheckCircleIcon, ExclamationTriangleIcon, PrinterIcon } from '@heroicons/react/24/outline';
import PayrollPayoutModal from './PayrollPayoutModal';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function PayrollPayoutPageContent() {
  const { hasPermission } = usePermissions();
  const canPay = hasPermission('dashboard.financial.payroll', 'pay');
  const [periods, setPeriods] = useState<any[]>([]);
  const [safes, setSafes] = useState<any[]>([]);
  const [destinationSafes, setDestinationSafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingSlipId, setPayingSlipId] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [payoutSlip, setPayoutSlip] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [periodResult, safeResult] = await Promise.all([fetchAPI('/payroll/finance/periods'), fetchAPI('/finances/safes')]);
      setPeriods(Array.isArray(periodResult) ? periodResult : []);
      const allSafes = Array.isArray(safeResult) ? safeResult : safeResult?.safes || [];
      const incomeSafes = allSafes.filter((safe: any) => safe.category === 'INCOME' && safe.isActive);
      const expenseSafes = allSafes.filter((safe: any) => safe.isActive);
      setSafes(incomeSafes);
      setDestinationSafes(expenseSafes);
    } catch (error: any) { toast.error(error?.message || 'تعذر تحميل الرواتب الجاهزة للصرف'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pay = async (slip: any, data: { amount: number; safeId: string; targetSafeId: string; description: string }) => {
    setPayingSlipId(slip.id);
    try {
      await fetchAPI(`/payroll/finance/slips/${slip.id}/payouts`, { method: 'POST', body: JSON.stringify(data) });
      toast.success(`تم تحويل ${money(data.amount)} للموظف`);
      setPayoutSlip(null);
      if (selectedSlip?.id === slip.id) setSelectedSlip(null);
      await load();
    } catch (error: any) { toast.error(error?.message || 'تعذر صرف الراتب'); }
    finally { setPayingSlipId(''); }
  };

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <PageHeader title="صرف الرواتب" description="تظهر هنا مفردات الموظفين التي اعتمدتها الإدارة، حتى إن بقي اعتماد بقية موظفي المسير لاحقاً. يمكن تسجيل الصرف كاملاً أو على دفعات من خزينة دخل." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'النظام المالي' }, { label: 'صرف الرواتب' }]} />
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><BanknotesIcon className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" /><div><b className="text-sm text-blue-950">تفاصيل التحويل لكل موظف</b><p className="mt-1 text-xs leading-5 text-blue-800">اختر خزينة دخل مصدرًا وأي خزينة نشطة أخرى وجهةً للتحويل، ثم راجع وصف العملية. يسجل النظام تحويلًا مستقلًا بين الخزينتين لكل دفعة راتب، ولا يتم الصرف دون استكمال البيانات.</p></div></div>
    {safes.length === 0 && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ExclamationTriangleIcon className="h-5 w-5 shrink-0" />لا توجد خزائن دخل نشطة. أضف أو فعّل خزينة دخل قبل الصرف.</div>}
    {destinationSafes.length < 2 && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ExclamationTriangleIcon className="h-5 w-5 shrink-0" />يلزم وجود خزينة نشطة أخرى غير خزينة الدخل لاستقبال تحويل الراتب.</div>}
    {loading ? <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-200" />)}</div> : periods.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><CheckCircleIcon className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">لا توجد رواتب معتمدة متبقية للصرف</p><p className="mt-1 text-sm text-slate-500">ستظهر المسيرات هنا بعد اعتمادها من مدير النظام.</p></div> : <div className="space-y-5">{periods.map((period) => <section key={period.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4"><div><h2 className="font-bold text-slate-900">مسير {monthNames[period.month - 1]} {period.year}</h2><p className="mt-1 text-xs text-slate-500">{period.slips.length} موظف متبقٍ له رصيد · إجمالي المتبقي {money(period.totalRemaining)}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">معتمد للصرف</span></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{period.slips.map((slip: any) => <article key={slip.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-slate-900">{slip.user.name}</b><small className="mt-1 block truncate text-xs text-slate-500">{slip.user.email}</small></div><span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">المتبقي {money(slip.remainingAmount)}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2.5 text-slate-500">صافي المستحق<b className="mt-1 block text-slate-800">{money(slip.netAmount)}</b></div><div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">تم تحويله<b className="mt-1 block">{money(slip.paidAmount)}</b></div></div><div className="mt-4 flex gap-2"><button disabled={!canPay || safes.length === 0 || destinationSafes.length < 2 || payingSlipId === slip.id} onClick={() => setPayoutSlip(slip)} className="h-10 flex-1 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">{payingSlipId === slip.id ? 'جارٍ التحويل...' : 'صرف الراتب'}</button><button onClick={() => setSelectedSlip({ ...slip, period: slip.period || { month: period.month, year: period.year } })} className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">التفاصيل</button></div></article>)}</div>
    </section>)}</div>}

    {payoutSlip && <PayrollPayoutModal slip={payoutSlip} incomeSafes={safes} destinationSafes={destinationSafes} isLoading={payingSlipId === payoutSlip.id} onClose={() => setPayoutSlip(null)} onSubmit={(data) => pay(payoutSlip, data)} />}
    {selectedSlip && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" onClick={() => setSelectedSlip(null)}><section className="payroll-slip-print max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-lg font-black text-slate-900">مفردات راتب الموظف</h2><p className="mt-1 text-sm text-slate-500">{selectedSlip.user?.name || 'الموظف'} · {selectedSlip.period?.month ? `${monthNames[selectedSlip.period.month - 1]} ${selectedSlip.period.year}` : 'الفترة غير محددة'}</p></div><button className="print:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setSelectedSlip(null)}>×</button></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">الراتب الأساسي<b className="mt-1 block text-slate-900">{money(selectedSlip.baseSalary)}</b></div><div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-700">KPI الافتراضي<b className="mt-1 block">{money(selectedSlip.kpiDefaultAmount ?? selectedSlip.profile?.kpiAmount ?? 0)}</b><span className="mt-2 block text-slate-500">المراد صرفه هذا الشهر</span><b className="mt-1 block text-violet-900">{money(selectedSlip.kpiAmount)}</b></div><div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">معامل الحضور<b className="mt-1 block">{(selectedSlip.attendanceFactor * 100).toLocaleString('ar-EG')}%</b></div><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">الحضور<b className="mt-1 block text-slate-900">{selectedSlip.attendedWorkDays}/{selectedSlip.expectedWorkDays}</b></div></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[500px] text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">مكون الراتب</th><th className="p-3">النسبة</th><th className="p-3">المبلغ المحتسب</th></tr></thead><tbody className="divide-y divide-slate-100">{(Array.isArray(selectedSlip.items) ? selectedSlip.items : []).map((item: any) => <tr key={item.id}><td className="p-3">{item.name}{item.attendanceBased ? ' (مرتبط بالحضور)' : ''}</td><td className="p-3">{item.percentage}%</td><td className="p-3">{money(item.payableAmount)}</td></tr>)}{selectedSlip.profile?.kpiEnabled && <tr><td className="p-3">KPI (الافتراضي {money(selectedSlip.kpiDefaultAmount ?? selectedSlip.profile?.kpiAmount ?? 0)})</td><td className="p-3">—</td><td className="p-3">{money(selectedSlip.kpiAmount)}</td></tr>}</tbody></table></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">إضافات: {money(selectedSlip.additions)}</div><div className="rounded-lg bg-rose-50 p-3 text-rose-800">خصومات: {money(selectedSlip.deductions)}</div><div className="rounded-lg bg-blue-50 p-3 font-bold text-blue-800">صافي المستحق: {money(selectedSlip.netAmount)}</div><div className="rounded-lg bg-amber-50 p-3 font-bold text-amber-800">المتبقي: {money(selectedSlip.remainingAmount)}</div></div><div className="mt-4 space-y-2"><h3 className="text-sm font-bold text-slate-800">سجل الصرف</h3>{(Array.isArray(selectedSlip.payouts) ? selectedSlip.payouts : []).map((payout: any, index: number) => <div key={index} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>{new Date(payout.transaction.createdAt).toLocaleString('ar-EG')} · من {payout.safe.name} إلى {payout.transaction?.targetSafe?.name || 'الخزينة الوجهة'} · بواسطة {payout.createdBy.name}</span><b>{money(payout.amount)}</b></div>)}</div><button onClick={() => window.print()} className="print:hidden mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"><PrinterIcon className="h-4 w-4" />طباعة مفردات الموظف</button></section></div>}
    <style jsx global>{`@media print { body * { visibility: hidden !important; } .payroll-slip-print, .payroll-slip-print * { visibility: visible !important; } .payroll-slip-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; } }`}</style>
  </div>;
}

export default function PayrollPayoutPage() {
  return <ProtectedPage requiredPermission={{ resource: 'dashboard.financial.payroll', action: 'view' }}><PayrollPayoutPageContent /></ProtectedPage>;
}
