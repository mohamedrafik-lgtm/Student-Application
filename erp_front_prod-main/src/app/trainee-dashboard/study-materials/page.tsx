'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import LoadingScreen from '../components/LoadingScreen';

type Delivery = { status: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST'; quantity: number; deliveryDate: string | null; returnDate: string | null; notes: string | null } | null;
type Material = { id: string; name: string; nameEn: string | null; description: string | null; linkedFee: { name: string; amount: number } | null; delivery: Delivery };

const stateMap = {
  PENDING: { text: 'لم يتم الاستلام', icon: ClockIcon, style: 'bg-amber-50 text-amber-700 ring-amber-200' },
  DELIVERED: { text: 'تم الاستلام', icon: CheckCircleIcon, style: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RETURNED: { text: 'تم الإرجاع', icon: ArrowUturnLeftIcon, style: 'bg-slate-100 text-slate-700 ring-slate-200' },
  LOST: { text: 'مسجل كمفقود', icon: ExclamationTriangleIcon, style: 'bg-rose-50 text-rose-700 ring-rose-200' },
} as const;

export default function TraineeStudyMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAPI('/study-materials/trainee/me')
      .then((data) => setMaterials(Array.isArray(data) ? data : []))
      .catch((err) => setError(err?.message || 'تعذر تحميل الأدوات الدراسية'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const received = materials.filter((m) => m.delivery?.status === 'DELIVERED').length;
  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="rounded-3xl bg-gradient-to-l from-emerald-700 to-emerald-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-white/15 p-3"><BookOpenIcon className="h-7 w-7" /></span>
          <div><h1 className="text-2xl font-black">الأدوات الدراسية</h1><p className="mt-1 text-sm text-emerald-100">تابع الأدوات المخصصة لبرنامجك وحالة استلام كل أداة.</p></div>
        </div>
        <div className="mt-5 flex gap-3 text-sm"><span className="rounded-full bg-white/15 px-4 py-2">إجمالي الأدوات: {materials.length}</span><span className="rounded-full bg-white/15 px-4 py-2">تم استلام: {received}</span></div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
      {!error && materials.length === 0 && <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">لا توجد أدوات دراسية مخصصة لبرنامجك حاليًا.</section>}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => {
          const status = material.delivery?.status || 'PENDING';
          const badge = stateMap[status];
          const Icon = badge.icon;
          return <article key={material.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">{material.name}</h2><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${badge.style}`}><Icon className="h-4 w-4" />{badge.text}</span></div>
            {material.description && <p className="mt-3 text-sm leading-6 text-slate-600">{material.description}</p>}
            {material.linkedFee && <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">الرسم المرتبط: {material.linkedFee.name} · {material.linkedFee.amount.toLocaleString('ar-EG')} ج.م</p>}
            {material.delivery?.status === 'DELIVERED' && <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600"><p>الكمية المستلمة: {material.delivery.quantity}</p>{material.delivery.deliveryDate && <p className="mt-1">تاريخ الاستلام: {new Date(material.delivery.deliveryDate).toLocaleDateString('ar-EG')}</p>}</div>}
            {material.delivery?.status === 'RETURNED' && material.delivery.returnDate && <p className="mt-3 text-sm text-slate-500">تاريخ الإرجاع: {new Date(material.delivery.returnDate).toLocaleDateString('ar-EG')}</p>}
          </article>;
        })}
      </section>
    </main>
  );
}
