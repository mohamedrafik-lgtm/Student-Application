'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function PayrollPrintContent() {
  const params = useParams<{ periodId: string }>();
  const periodId = params.periodId;
  const [period, setPeriod] = useState<any>(null);
  const [selectedSlipId, setSelectedSlipId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const print = useCallback(() => window.print(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelectedSlipId(new URLSearchParams(window.location.search).get('slipId') || '');
    fetchAPI(`/payroll/periods/${periodId}`)
      .then((data) => { if (active) setPeriod(data); })
      .catch((reason: any) => { if (active) setError(reason?.message || 'تعذر تحميل بيانات مسير الرواتب'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodId]);

  const slips = (period?.slips || []).filter((slip: any) => !selectedSlipId || slip.id === selectedSlipId);
  const totalNet = slips.reduce((sum: number, slip: any) => sum + slip.netAmount, 0);
  const totalPaid = slips.reduce((sum: number, slip: any) => sum + slip.paidAmount, 0);
  const totalRemaining = slips.reduce((sum: number, slip: any) => sum + Math.max(0, slip.netAmount - slip.paidAmount), 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">جارٍ تجهيز تفاصيل الطباعة...</div>;
  if (error || !period) return <div className="p-8 text-center text-sm text-rose-700">{error || 'مسير الرواتب غير موجود'}</div>;
  if (selectedSlipId && !slips.length) return <div className="p-8 text-center text-sm text-rose-700">مفردات الموظف غير موجودة في هذا المسير.</div>;

  const status = period.status === 'APPROVED' ? 'معتمد ومتاح للصرف' : period.status === 'CLOSED' ? 'مغلق' : 'مسودة';

  return <main className="payroll-print-root min-h-screen bg-slate-100 p-4 text-slate-900" dir="rtl">
    <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div><b className="text-sm">{selectedSlipId ? 'طباعة مفردات راتب موظف' : 'طباعة مسير الرواتب بالكامل'}</b><p className="mt-1 text-xs text-slate-500">{monthNames[period.month - 1]} {period.year} · {status}</p></div>
      <div className="flex gap-2"><Link href="/dashboard/hr/payroll" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">العودة إلى نظام الرواتب</Link><button type="button" onClick={print} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">طباعة</button></div>
    </div>

    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-black sm:text-2xl">مفردات الرواتب</h1>
        <p className="mt-1 text-sm font-semibold text-slate-700">{monthNames[period.month - 1]} {period.year}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>حالة المسير: {status}</span>{period.approvedAt && <span>تاريخ الاعتماد: {new Date(period.approvedAt).toLocaleDateString('ar-EG')}</span>}{period.approvedBy?.name && <span>اعتمده: {period.approvedBy.name}</span>}</div>
      </header>

      {!selectedSlipId && <section className="my-4 grid grid-cols-3 gap-2 text-center text-xs sm:gap-3"><div className="rounded-lg bg-blue-50 p-3 text-blue-800">إجمالي المستحق<b className="mt-1 block text-sm">{money(totalNet)}</b></div><div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">إجمالي المصروف<b className="mt-1 block text-sm">{money(totalPaid)}</b></div><div className="rounded-lg bg-amber-50 p-3 text-amber-800">إجمالي المتبقي<b className="mt-1 block text-sm">{money(totalRemaining)}</b></div></section>}

      <div className="mt-4 space-y-5 print:mt-3 print:space-y-0">{slips.map((slip: any, index: number) => <article key={slip.id} className={`payroll-slip border border-slate-200 p-4 sm:rounded-xl sm:p-5 print:rounded-none print:border-0 print:p-0 ${index > 0 ? 'print:break-before-page' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div><h2 className="text-lg font-black">{slip.user.name}</h2><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{slip.user.email}</span>{slip.user.phone && <span>{slip.user.phone}</span>}</div></div>
          <div className="text-left text-xs text-slate-500"><div>معامل الحضور: <b className="text-slate-800">{(slip.attendanceFactor * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%</b></div><div className="mt-1">أيام الحضور: <b className="text-slate-800">{slip.attendedWorkDays} من {slip.expectedWorkDays}</b></div></div>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 print:rounded-none">
          <table className="w-full text-right text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">البند</th><th className="px-3 py-2">النسبة</th><th className="px-3 py-2">القيمة الاسمية</th><th className="px-3 py-2">المستحق</th></tr></thead><tbody className="divide-y divide-slate-100">
            {slip.items.map((item: any) => <tr key={item.id}><td className="px-3 py-2">{item.name}{item.attendanceBased && <small className="mr-1 text-blue-700">(مرتبط بالحضور)</small>}</td><td className="px-3 py-2">{item.percentage}%</td><td className="px-3 py-2">{money(item.nominalAmount)}</td><td className="px-3 py-2 font-semibold">{money(item.payableAmount)}</td></tr>)}
            {slip.profile?.kpiEnabled && <tr><td className="px-3 py-2 font-semibold text-violet-800">KPI (الافتراضي {money(slip.kpiDefaultAmount ?? slip.profile?.kpiAmount ?? 0)})</td><td className="px-3 py-2">—</td><td className="px-3 py-2">—</td><td className="px-3 py-2 font-semibold text-violet-800">{money(slip.kpiAmount)}</td></tr>}
          </tbody></table>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <section className="rounded-lg border border-slate-200 p-3"><h3 className="mb-2 text-xs font-bold">الحضور والاستثناءات</h3><div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600"><span>أيام العمل المحتسبة: {slip.expectedWorkDays}</span><span>أيام الحضور: {slip.attendedWorkDays}</span><span>العطلات المستثناة: {slip.attendanceDetails?.excluded?.holidays || 0}</span><span>الإجازات المعتمدة: {slip.attendanceDetails?.excluded?.approvedLeaves || 0}</span><span>أيام الراحة: {slip.attendanceDetails?.excluded?.weeklyOffDays || 0}</span><span>معامل الحضور: {(slip.attendanceFactor * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%</span></div></section>
          <section className="rounded-lg border border-slate-200 p-3"><h3 className="mb-2 text-xs font-bold">ملخص المستحق</h3><div className="space-y-1.5 text-xs"><div className="flex justify-between"><span>أجزاء الراتب</span><b>{money(slip.componentTotal)}</b></div><div className="flex justify-between"><span>KPI الافتراضي / قيمة الشهر</span><b>{money(slip.kpiDefaultAmount ?? slip.profile?.kpiAmount ?? 0)} / {money(slip.kpiAmount)}</b></div><div className="flex justify-between text-emerald-700"><span>الإضافات</span><b>{money(slip.additions)}</b></div><div className="flex justify-between text-rose-700"><span>الخصومات</span><b>{money(slip.deductions)}</b></div><div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>الإجمالي</span><b>{money(slip.grossAmount)}</b></div><div className="flex justify-between font-black text-blue-800"><span>صافي المستحق</span><b>{money(slip.netAmount)}</b></div><div className="flex justify-between text-emerald-700"><span>المصروف</span><b>{money(slip.paidAmount)}</b></div><div className="flex justify-between text-amber-700"><span>المتبقي</span><b>{money(Math.max(0, slip.netAmount - slip.paidAmount))}</b></div></div></section>
        </div>

        {slip.adjustments?.length > 0 && <section className="mt-3 rounded-lg border border-slate-200 p-3"><h3 className="mb-2 text-xs font-bold">تفاصيل الإضافات والخصومات</h3><div className="space-y-1.5">{slip.adjustments.map((item: any) => <div key={item.id} className="flex justify-between gap-3 text-[11px]"><span>{item.type === 'ADDITION' ? 'إضافة' : 'خصم'} · {item.reason}</span><b>{money(item.amount)}</b></div>)}</div></section>}
        {slip.payouts?.length > 0 && <section className="mt-3 rounded-lg border border-slate-200 p-3"><h3 className="mb-2 text-xs font-bold">سجل الصرف</h3><div className="space-y-1.5">{slip.payouts.map((item: any) => <div key={item.id} className="flex flex-wrap justify-between gap-2 text-[11px]"><span>{new Date(item.createdAt).toLocaleString('ar-EG')} · تحويل من {item.safe.name} إلى {item.transaction?.targetSafe?.name || 'الخزينة الوجهة'} · {item.createdBy?.name}</span><b>{money(item.amount)}</b></div>)}</div></section>}
      </article>)}</div>
      <footer className="mt-5 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">تم إنشاء هذا التقرير من نظام الرواتب · {new Date().toLocaleDateString('ar-EG')}</footer>
    </div>

    <style jsx global>{`@page { size: A4; margin: 12mm; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: white !important; } .payroll-print-root { min-height: 0 !important; padding: 0 !important; background: white !important; } .no-print { display: none !important; } .payroll-slip { break-inside: auto; } .payroll-slip table tr, .payroll-slip section { break-inside: avoid; } }`}</style>
  </main>;
}

export default function PayrollPrintPage() {
  return <ProtectedPage requiredPermission={{ resource: 'hr.payroll', action: 'view' }}><PayrollPrintContent /></ProtectedPage>;
}
