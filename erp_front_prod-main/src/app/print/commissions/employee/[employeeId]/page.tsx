'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const date = (value?: string) => value ? new Date(value).toLocaleDateString('ar-EG') : '—';

type CommissionRow = {
  id: number;
  type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
  amount: number;
  status: string;
  createdAt: string;
  trainee: null | { id: number; nameAr: string; program?: { nameAr: string } | null };
  marketingEmployee?: { id: number; name: string; phone?: string };
  payouts?: Array<{ id: number; amount: number; description?: string; createdAt: string; fromSafe?: { name: string }; toSafe?: { name: string } }>;
};

function EmployeeCommissionsReport() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = String(params.employeeId || '');
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [employeeName, setEmployeeName] = useState('موظف التسويق');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const autoPrintStarted = useRef(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setEmployeeName(query.get('name') || 'موظف التسويق');
    setPhone(query.get('phone') || '');
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    const load = async () => {
      autoPrintStarted.current = false;
      setLoading(true);
      setError('');
      try {
        const rows: CommissionRow[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const query = new URLSearchParams({ marketingEmployeeId: employeeId, page: String(page), limit: '100' });
          const result = await fetchAPI(`/commissions?${query.toString()}`);
          const pageRows = Array.isArray(result?.data) ? result.data : [];
          rows.push(...pageRows);
          totalPages = Number(result?.pagination?.totalPages || (pageRows.length === 100 ? page + 1 : page));
          page += 1;
        } while (page <= totalPages);
        if (active) {
          setCommissions(rows);
          const employee = rows[0]?.marketingEmployee;
          if (employee?.name) setEmployeeName(employee.name);
          if (employee?.phone) setPhone(employee.phone);
        }
      } catch (reason: any) {
        if (active) setError(reason?.message || 'تعذر تحميل تقديمات الموظف');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [employeeId]);

  useEffect(() => {
    if (loading || error || autoPrintStarted.current) return;
    if (new URLSearchParams(window.location.search).get('autoPrint') !== '1') return;
    autoPrintStarted.current = true;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [loading, error]);

  const totals = useMemo(() => commissions.reduce((sum, commission) => {
    const paid = (commission.payouts || []).reduce((current, payout) => current + Number(payout.amount || 0), 0);
    sum.total += Number(commission.amount || 0);
    sum.paid += paid;
    sum.remaining += Math.max(0, Number(commission.amount || 0) - paid);
    sum.paidCount += paid >= commission.amount && commission.amount > 0 ? 1 : 0;
    sum.partialCount += paid > 0 && paid < commission.amount ? 1 : 0;
    sum.pendingCount += paid <= 0 ? 1 : 0;
    return sum;
  }, { total: 0, paid: 0, remaining: 0, paidCount: 0, partialCount: 0, pendingCount: 0 }), [commissions]);

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8" dir="rtl">
    <div className="no-print mx-auto mb-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div><b className="text-sm">تقرير تقديمات موظف التسويق</b><p className="mt-1 text-xs text-slate-500">يشمل جميع التقديمات وحالة صرف كل عمولة</p></div><div className="flex gap-2"><Link href="/dashboard/finances/commissions" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">العودة للعمولات</Link><button onClick={() => window.print()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">طباعة التقرير</button></div></div>
    {loading ? <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center rounded-2xl bg-white text-sm text-slate-500">جارٍ تجهيز التقرير...</div> : error ? <div className="mx-auto max-w-6xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div> : <div className="mx-auto max-w-6xl rounded-2xl bg-white p-5 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="border-b-2 border-slate-800 pb-5 text-center"><h1 className="text-2xl font-black">تقرير تقديمات موظف التسويق</h1><p className="mt-2 text-lg font-bold">{employeeName}</p>{phone && <p className="mt-1 text-sm text-slate-500">{phone}</p>}<p className="mt-2 text-xs text-slate-500">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p></header>
      <section className="my-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">عدد التقديمات<b className="mt-1 block text-lg">{commissions.length.toLocaleString('ar-EG')}</b></div><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">إجمالي العمولات<b className="mt-1 block text-base">{money(totals.total)}</b></div><div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">إجمالي المصروف<b className="mt-1 block text-base">{money(totals.paid)}</b></div><div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">المتبقي للصرف<b className="mt-1 block text-base">{money(totals.remaining)}</b></div></section>
      <section className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">مصروفة بالكامل: {totals.paidCount}</span><span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">مصروفة جزئياً: {totals.partialCount}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">لم تصرف: {totals.pendingCount}</span></section>
      {commissions.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[850px] text-right text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">تاريخ التقديم</th><th className="p-3">المتدرب</th><th className="p-3">البرنامج التدريبي</th><th className="p-3">نوع التواصل</th><th className="p-3">قيمة العمولة</th><th className="p-3">حالة الصرف</th><th className="p-3">المصروف</th><th className="p-3">المتبقي</th></tr></thead><tbody className="divide-y divide-slate-100">{commissions.map((commission) => {
        const paid = (commission.payouts || []).reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
        const remaining = Math.max(0, Number(commission.amount || 0) - paid);
        const status = remaining <= 0.005 && paid > 0 ? 'مصروفة بالكامل' : paid > 0 ? 'مصروفة جزئياً' : 'لم تصرف';
        const statusClass = remaining <= 0.005 && paid > 0 ? 'text-emerald-700' : paid > 0 ? 'text-blue-700' : 'text-amber-700';
        return <tr key={commission.id} className="break-inside-avoid"><td className="p-3">{date(commission.createdAt)}</td><td className="p-3 font-semibold">{commission.trainee?.nameAr || 'غير محدد'}</td><td className="p-3">{commission.trainee?.program?.nameAr || '—'}</td><td className="p-3">{commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}</td><td className="p-3 font-semibold">{money(commission.amount)}</td><td className={`p-3 font-bold ${statusClass}`}>{status}</td><td className="p-3 text-emerald-700">{money(paid)}</td><td className="p-3 text-amber-700">{money(remaining)}</td></tr>;
      })}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">لا توجد تقديمات مسجلة لهذا الموظف.</div>}
      {commissions.some((commission) => (commission.payouts || []).length > 0) && <section className="mt-6"><h2 className="mb-3 text-sm font-bold">تفاصيل عمليات الصرف</h2><div className="space-y-2">{commissions.flatMap((commission) => (commission.payouts || []).map((payout) => <div key={payout.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs"><span>{commission.trainee?.nameAr || 'متدرب غير محدد'} · {date(payout.createdAt)} · من {payout.fromSafe?.name || 'خزينة مصدر غير محددة'} إلى {payout.toSafe?.name || 'خزينة وجهة غير محددة'}{payout.description ? ` · ${payout.description}` : ''}</span><b className="text-emerald-700">{money(payout.amount)}</b></div>))}</div></section>}
      <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">تم إنشاء التقرير من نظام إدارة العمولات · {new Date().toLocaleDateString('ar-EG')}</footer>
    </div>}
    <style jsx global>{`@page { size: A4 landscape; margin: 12mm; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: white !important; } main { min-height: 0 !important; padding: 0 !important; background: white !important; } .no-print { display: none !important; } tr, section { break-inside: avoid; } }`}</style>
  </main>;
}

export default function EmployeeCommissionsPrintPage() {
  return <ProtectedPage requiredPermission={{ resource: 'commissions', action: 'read' }}><EmployeeCommissionsReport /></ProtectedPage>;
}
