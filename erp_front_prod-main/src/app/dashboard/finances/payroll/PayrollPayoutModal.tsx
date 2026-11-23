'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BanknotesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/app/components/ui/Select';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

type Safe = { id: string; name: string; balance: number; currency?: string };
type Slip = { id: string; user?: { name?: string; email?: string }; period?: { month?: number; year?: number }; netAmount: number; paidAmount: number; remainingAmount: number };

const periodLabel = (period?: Slip['period']) => period?.month && period?.year
  ? `${monthNames[period.month - 1]} ${period.year}`
  : 'الفترة الحالية';
const defaultDescription = (slip: Slip) => `راتب ${slip.user?.name || 'الموظف'} عن ${periodLabel(slip.period)}`;

export default function PayrollPayoutModal({
  slip,
  incomeSafes,
  destinationSafes,
  isLoading,
  onClose,
  onSubmit,
}: {
  slip: Slip;
  incomeSafes: Safe[];
  destinationSafes: Safe[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; safeId: string; targetSafeId: string; description: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(slip.remainingAmount));
  const [sourceSafeId, setSourceSafeId] = useState('');
  const [targetSafeId, setTargetSafeId] = useState('');
  const [description, setDescription] = useState(() => defaultDescription(slip));

  useEffect(() => {
    setAmount(String(slip.remainingAmount));
    setSourceSafeId('');
    setTargetSafeId('');
    setDescription(defaultDescription(slip));
  }, [slip.id, slip.remainingAmount, slip.user?.name, slip.period?.month, slip.period?.year]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > slip.remainingAmount) return;
    if (!sourceSafeId || !targetSafeId || sourceSafeId === targetSafeId || !description.trim()) return;
    const source = incomeSafes.find((safe) => safe.id === sourceSafeId);
    if (!source || source.balance < numericAmount) return;
    await onSubmit({ amount: numericAmount, safeId: sourceSafeId, targetSafeId, description: description.trim() });
  };

  const sourceOptions = incomeSafes.map((safe) => ({ value: safe.id, label: `${safe.name} — الرصيد ${money(safe.balance)}` }));
  const destinationOptions = destinationSafes.filter((safe) => safe.id !== sourceSafeId).map((safe) => ({ value: safe.id, label: `${safe.name} — الرصيد ${money(safe.balance)}` }));
  const amountValue = Number(amount) || 0;
  const selectedSource = incomeSafes.find((safe) => safe.id === sourceSafeId);
  const canSubmit = amountValue > 0 && amountValue <= slip.remainingAmount && !!sourceSafeId && !!targetSafeId && sourceSafeId !== targetSafeId && !!description.trim() && !!selectedSource && selectedSource.balance >= amountValue && !isLoading;

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoading) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="payroll-payout-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><BanknotesIcon className="h-6 w-6" /></span><div><h2 id="payroll-payout-title" className="text-lg font-black text-slate-900">صرف راتب موظف</h2><p className="mt-0.5 text-xs text-slate-500">قيد تحويل مستقل بين خزنتين</p></div></div><button type="button" aria-label="إغلاق" disabled={isLoading} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><XMarkIcon className="h-5 w-5" /></button></header>
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-3.5"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="text-sm text-slate-900">{slip.user?.name || 'الموظف'}</b><p className="mt-1 text-xs text-slate-500">{slip.user?.email || ''} · راتب {periodLabel(slip.period)}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">المتبقي {money(slip.remainingAmount)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white p-2.5 text-slate-500">إجمالي المستحق<b className="mt-1 block text-slate-900">{money(slip.netAmount)}</b></div><div className="rounded-lg bg-white p-2.5 text-slate-500">سبق صرفه<b className="mt-1 block text-emerald-700">{money(slip.paidAmount)}</b></div></div></section>
        <label className="block text-xs font-bold text-slate-700">مبلغ التحويل<input autoFocus type="number" min="0.01" max={slip.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><small className="mt-1 block font-normal text-slate-500">يمكن صرف جزء من المتبقي أو صرفه بالكامل.</small></label>
        <label className="block text-xs font-bold text-slate-700">من خزينة الدخل <span className="text-rose-600">*</span><div className="mt-1.5"><SearchableSelect options={sourceOptions} value={sourceSafeId} onChange={setSourceSafeId} placeholder="ابحث واختر خزينة الدخل" disabled={isLoading} instanceId="payroll-source-safe" /></div></label>
        <label className="block text-xs font-bold text-slate-700">إلى الخزينة الأخرى <span className="text-rose-600">*</span><div className="mt-1.5"><SearchableSelect options={destinationOptions} value={targetSafeId} onChange={setTargetSafeId} placeholder="ابحث واختر الخزينة المستقبلة" disabled={isLoading || !sourceSafeId} instanceId="payroll-destination-safe" /></div></label>
        <label className="block text-xs font-bold text-slate-700">وصف القيد المالي <span className="text-rose-600">*</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} disabled={isLoading} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        {selectedSource && amountValue > selectedSource.balance && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">رصيد الخزينة المصدر غير كافٍ. الرصيد الحالي {money(selectedSource.balance)}.</p>}
        {amountValue > slip.remainingAmount && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">مبلغ التحويل يتجاوز المتبقي {money(slip.remainingAmount)}.</p>}
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={isLoading} onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">إلغاء</button><button type="submit" disabled={!canSubmit} className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? 'جارٍ تسجيل التحويل...' : `تأكيد تحويل ${money(amountValue)}`}</button></footer>
      </form>
    </section>
  </div>;
}
