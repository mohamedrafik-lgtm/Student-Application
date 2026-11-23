'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiChevronDown, FiSearch, FiTrendingUp, FiUsers } from 'react-icons/fi';

interface FineReportRow {
  id: string;
  sourceDescription: string;
  sourceFeeId: number | null;
  recurrence: 'ONCE' | 'MONTHLY';
  amount: number;
  appliedAt: string;
  schedule?: { feeId?: number; fee?: { id?: number; name?: string; program?: { nameAr?: string } } };
  traineePayment?: { trainee?: { nameAr?: string; nationalId?: string } };
}

interface FineGroup {
  key: string;
  feeName: string;
  programName: string;
  rows: FineReportRow[];
  total: number;
  traineeCount: number;
}

export default function FineReportsPage() {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission('dashboard.financial.fine-reports', 'view');
  const [rows, setRows] = useState<FineReportRow[]>([]);
  const [query, setQuery] = useState('');
  const [groupQueries, setGroupQueries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    fetchAPI('/payment-schedules/fines/report')
      .then((data: unknown) => setRows(Array.isArray(data) ? data as FineReportRow[] : []))
      .catch(() => toast.error('تعذر تحميل تقرير الغرامات'))
      .finally(() => setLoading(false));
  }, [allowed]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ar');
    if (!term) return rows;
    return rows.filter(row => [
      row.traineePayment?.trainee?.nameAr,
      row.traineePayment?.trainee?.nationalId,
      row.schedule?.fee?.name,
      row.schedule?.fee?.program?.nameAr,
      row.sourceDescription,
    ].join(' ').toLocaleLowerCase('ar').includes(term));
  }, [rows, query]);

  const groups = useMemo<FineGroup[]>(() => {
    const map = new Map<string, FineGroup>();
    for (const row of filteredRows) {
      const key = String(row.schedule?.fee?.id ?? row.schedule?.feeId ?? `unknown-${row.id}`);
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          feeName: row.schedule?.fee?.name || 'رسم غير محدد',
          programName: row.schedule?.fee?.program?.nameAr || 'برنامج غير محدد',
          rows: [],
          total: 0,
          traineeCount: 0,
        };
        map.set(key, group);
      }
      group.rows.push(row);
      group.total += Number(row.amount || 0);
    }
    return [...map.values()].map(group => ({
      ...group,
      traineeCount: new Set(group.rows.map(row => row.traineePayment?.trainee?.nationalId || row.traineePayment?.trainee?.nameAr).filter(Boolean)).size,
    })).sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  if (!allowed) return <div className="p-8 text-center text-gray-600">ليس لديك صلاحية عرض تقارير الغرامات.</div>;

  const money = (amount: number) => `${Number(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
  const totalAmount = filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalTrainees = new Set(filteredRows.map(row => row.traineePayment?.trainee?.nationalId || row.traineePayment?.trainee?.nameAr).filter(Boolean)).size;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-l from-amber-50 via-white to-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <span className="rounded-2xl bg-amber-100 p-3 text-amber-700"><FiAlertCircle className="h-7 w-7" /></span>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">تقارير الغرامات</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">تعرض هذه الصفحة الرسوم المالية التي طُبقت عليها غرامات فعلًا، مع إحصائيات كل رسم وتفاصيل المتدربين والغرامات المسجلة عليه.</p>
                </div>
              </div>
              <label className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
                <FiSearch className="shrink-0 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="ابحث بالمتدرب أو الرسم أو البرنامج" aria-label="البحث في تقرير الغرامات" />
              </label>
            </div>
          </div>
          <div className="grid gap-3 border-t border-slate-100 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-5">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">الرسوم التي طُبقت عليها غرامات</p><p className="mt-1 text-xl font-extrabold text-slate-900">{loading ? '…' : groups.length.toLocaleString('ar-EG')}</p></div>
            <div className="rounded-2xl bg-orange-50 p-4"><p className="text-xs font-medium text-orange-800">عدد الغرامات المطبقة</p><p className="mt-1 text-xl font-extrabold text-orange-900">{loading ? '…' : filteredRows.length.toLocaleString('ar-EG')}</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><p className="flex items-center gap-2 text-xs font-medium text-amber-800"><FiTrendingUp /> إجمالي مبالغ الغرامات</p><p className="mt-1 text-xl font-extrabold text-amber-900">{loading ? '…' : money(totalAmount)}</p></div>
            <div className="rounded-2xl bg-sky-50 p-4"><p className="flex items-center gap-2 text-xs font-medium text-sky-800"><FiUsers /> المتدربون المتأثرون</p><p className="mt-1 text-xl font-extrabold text-sky-900">{loading ? '…' : totalTrainees.toLocaleString('ar-EG')}</p></div>
          </div>
        </header>

        {loading ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">جاري تحميل التقرير...</div> : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">لا توجد غرامات مطابقة لبحثك.</div>
        ) : (
          <section className="space-y-4" aria-label="الغرامات حسب الرسم المالي">
            {groups.map(group => {
              const groupTerm = (groupQueries[group.key] || '').trim().toLocaleLowerCase('ar');
              const groupRows = group.rows.filter(row => !groupTerm || [
                row.traineePayment?.trainee?.nameAr,
                row.traineePayment?.trainee?.nationalId,
                row.sourceDescription,
                row.amount,
                row.recurrence === 'MONTHLY' ? 'شهرية شهري' : 'مرة واحدة',
                new Date(row.appliedAt).toLocaleDateString('ar-EG'),
              ].join(' ').toLocaleLowerCase('ar').includes(groupTerm));
              return (
              <details key={group.key} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-amber-200">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50 md:p-6 [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="rounded-xl bg-amber-50 p-3 text-amber-700"><FiAlertCircle className="h-5 w-5" /></span>
                    <div className="min-w-0"><p className="truncate font-bold text-slate-900">{group.feeName}</p><p className="mt-1 truncate text-sm text-slate-500">{group.programName}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-7">
                    <div className="text-left"><p className="text-xs text-slate-500">الغرامات المطبقة</p><p className="mt-1 font-bold text-slate-800">{group.rows.length.toLocaleString('ar-EG')}</p></div>
                    <div className="text-left"><p className="text-xs text-slate-500">المتدربون</p><p className="mt-1 font-bold text-slate-800">{group.traineeCount.toLocaleString('ar-EG')}</p></div>
                    <div className="text-left"><p className="text-xs text-slate-500">إجمالي المبلغ</p><p className="mt-1 font-extrabold text-amber-700">{money(group.total)}</p></div>
                    <FiChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
                  </div>
                </summary>
                <div className="border-t border-slate-100">
                  <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 sm:max-w-lg">
                      <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        value={groupQueries[group.key] || ''}
                        onChange={event => setGroupQueries(current => ({ ...current, [group.key]: event.target.value }))}
                        className="w-full bg-transparent py-2.5 text-sm outline-none"
                        placeholder="ابحث داخل هذا الرسم باسم المتدرب أو الرقم القومي"
                        aria-label={`البحث داخل غرامات ${group.feeName}`}
                      />
                      {groupQueries[group.key] && <button type="button" onClick={() => setGroupQueries(current => ({ ...current, [group.key]: '' }))} className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">مسح</button>}
                    </label>
                    <span className="text-xs text-slate-500">عرض {groupRows.length.toLocaleString('ar-EG')} من {group.rows.length.toLocaleString('ar-EG')} غرامة</span>
                  </div>
                  {groupRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">لا توجد نتائج داخل هذا الرسم.</p> :
                  <>
                  <div className="space-y-3 p-3 sm:p-4 lg:hidden">
                    {groupRows.map(row => (
                      <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-bold leading-6 text-slate-900">{row.traineePayment?.trainee?.nameAr || 'متدرب غير محدد'}</h3>
                            <p className="mt-1 text-xs text-slate-500">الرقم القومي: {row.traineePayment?.trainee?.nationalId || '—'}</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-extrabold text-amber-800">{money(row.amount)}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3 text-xs">
                          <div className="min-w-0"><p className="text-slate-500">مصدر الغرامة</p><p className="mt-1 break-words font-semibold text-slate-800">{row.sourceDescription || 'رسم مالي'}{row.sourceFeeId ? ` · رسم رقم ${row.sourceFeeId}` : ''}</p></div>
                          <div><p className="text-slate-500">التكرار</p><p className="mt-1 font-semibold text-slate-800">{row.recurrence === 'MONTHLY' ? 'شهريًا' : 'مرة واحدة'}</p></div>
                          <div className="col-span-2"><p className="text-slate-500">تاريخ التطبيق</p><p className="mt-1 font-semibold text-slate-800">{new Date(row.appliedAt).toLocaleString('ar-EG')}</p></div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['المتدرب','مصدر الغرامة','التكرار','المبلغ','تاريخ التطبيق'].map(label => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
                      <tbody>{groupRows.map(row => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-5 py-4 font-semibold text-slate-800">{row.traineePayment?.trainee?.nameAr || 'متدرب غير محدد'}<div className="mt-1 text-xs font-normal text-slate-500">{row.traineePayment?.trainee?.nationalId || '—'}</div></td>
                          <td className="px-5 py-4 text-slate-700">{row.sourceDescription || 'رسم مالي'}<div className="mt-1 text-xs text-slate-500">{row.sourceFeeId ? `رسم رقم ${row.sourceFeeId}` : 'مصدر تاريخي'}</div></td>
                          <td className="px-5 py-4 text-slate-700">{row.recurrence === 'MONTHLY' ? 'شهرية' : 'مرة واحدة'}</td>
                          <td className="px-5 py-4 font-bold text-slate-900">{money(row.amount)}</td>
                          <td className="px-5 py-4 text-slate-600">{new Date(row.appliedAt).toLocaleString('ar-EG')}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  </>
                  }
                </div>
              </details>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
