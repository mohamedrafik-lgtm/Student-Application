'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';
import {
  fetchNewTraineesByDate,
  fetchNewTraineesDays,
  getImageUrl,
} from '@/lib/api';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface NewTraineeRow {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  phone: string;
  photoUrl: string | null;
  status: string;
  programName: string;
  createdAt: string;
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
}

interface NewTraineesResponse {
  date: string;
  summary: {
    count: number;
    totalFees: number;
    totalPaid: number;
    totalRemaining: number;
  };
  trainees: NewTraineeRow[];
}

interface DayCount {
  date: string;
  count: number;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: 'مستجد', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  CURRENT: { label: 'مستمر', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  GRADUATE: { label: 'خريج', className: 'bg-violet-50 text-violet-700 border-violet-100' },
  WITHDRAWN: { label: 'منسحب', className: 'bg-rose-50 text-rose-700 border-rose-100' },
};

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

function shiftDay(value: string, delta: number): string {
  const d = parseDateInput(value);
  d.setDate(d.getDate() + delta);
  return toDateInputValue(d);
}

function formatMoney(amount: number): string {
  return `${Number(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`;
}

function formatMoneyShort(amount: number): string {
  const value = Number(amount || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} مليون`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} ألف`;
  return Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

function formatLongDate(value: string): string {
  if (!value) return '';
  return parseDateInput(value).toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function TraineeAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials =
    (name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('') || 'م';

  if (!photoUrl || failed) {
    return (
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getImageUrl(photoUrl)}
      alt={name}
      onError={() => setFailed(true)}
      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-50"
    />
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{icon}</span>
        </div>
        <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">{label}</p>
      </div>
      <p className="mt-1.5 text-base sm:text-2xl font-bold text-slate-900 tabular-nums truncate leading-6">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400 truncate hidden sm:block">{hint}</p>}
    </div>
  );
}

function MoneyCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'emerald' | 'rose';
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
  };

  return (
    <div className="min-w-0 text-center sm:text-right">
      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{label}</p>
      <p className={`text-[11px] sm:text-sm font-bold tabular-nums truncate ${tones[tone]}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="p-3 sm:p-4 flex items-center gap-3 animate-pulse">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-40 max-w-full bg-slate-200 rounded" />
        <div className="h-3 w-64 max-w-full bg-slate-100 rounded" />
      </div>
      <div className="hidden sm:flex gap-4">
        <div className="h-8 w-16 bg-slate-100 rounded" />
        <div className="h-8 w-16 bg-slate-100 rounded" />
        <div className="h-8 w-16 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export default function NewTraineesPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [date, setDate] = useState('');
  const [today, setToday] = useState('');
  const [data, setData] = useState<NewTraineesResponse | null>(null);
  const [days, setDays] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dayRequestRef = useRef(0);

  // نفس شروط ظهور كارت "متدربين جدد اليوم" في لوحة التحكم
  const canView =
    !permissionsLoading &&
    hasPermission('dashboard.statistics', 'view') &&
    hasPermission('marketing.applications', 'view');

  useEffect(() => {
    const value = toDateInputValue(new Date());
    setToday(value);
    setDate(value);
  }, []);

  const loadDay = useCallback(async (day: string) => {
    if (!day) return;
    const requestId = ++dayRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNewTraineesByDate(day);
      if (requestId !== dayRequestRef.current) return; // تم اختيار يوم آخر
      setData(result);
    } catch (err: any) {
      if (requestId !== dayRequestRef.current) return;
      console.error('Error loading new trainees:', err);
      setData(null);
      setError(err?.message || 'تعذر تحميل بيانات المتدربين لهذا اليوم');
      toast.error('تعذر تحميل بيانات المتدربين لهذا اليوم');
    } finally {
      if (requestId === dayRequestRef.current) setLoading(false);
    }
  }, []);

  const loadDays = useCallback(async (month: string) => {
    if (!month) return;
    setDaysLoading(true);
    try {
      const result = await fetchNewTraineesDays(month);
      setDays(Array.isArray(result?.days) ? result.days : []);
    } catch (err) {
      console.error('Error loading days:', err);
      setDays([]);
    } finally {
      setDaysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView || !date) return;
    loadDay(date);
  }, [canView, date, loadDay]);

  const month = date ? date.slice(0, 7) : '';

  useEffect(() => {
    if (!canView || !month) return;
    loadDays(month);
  }, [canView, month, loadDays]);

  // تمرير شريط الأيام إلى اليوم المحدد
  useEffect(() => {
    if (!date || days.length === 0) return;
    const el = document.getElementById(`day-${date}`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [date, days.length]);

  const refresh = () => {
    if (!date) return;
    loadDay(date);
    loadDays(date.slice(0, 7));
  };

  const goToDay = (value: string) => {
    dayRequestRef.current += 1; // إلغاء أي طلب قديم
    setDate(value);
  };

  if (permissionsLoading) {
    return (
      <div className="w-full max-w-full space-y-4 sm:space-y-6">
        <PageHeader title="المتدربون الجدد حسب اليوم" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربون الجدد' }]} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="w-full max-w-full space-y-4 sm:space-y-6">
        <PageHeader
          title="المتدربون الجدد حسب اليوم"
          breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربون الجدد' }]}
        />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
            <ShieldExclamationIcon className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">ليس لديك صلاحية لعرض هذه الصفحة</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            تحتاج إلى صلاحية <span className="font-semibold">عرض إحصائيات الصفحة الرئيسية</span> و
            <span className="font-semibold"> عرض تقديمات التسويق</span> — وهي نفس الصلاحيات المطلوبة لظهور
            كارت «متدربين جدد اليوم» في لوحة التحكم.
          </p>
          <Link href="/dashboard" className="inline-block mt-5">
            <Button variant="primary" size="sm">العودة إلى لوحة التحكم</Button>
          </Link>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const trainees = data?.trainees || [];

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 overflow-x-hidden">
      <PageHeader
        title="المتدربون الجدد حسب اليوم"
        description="قائمة المتدربين الذين أُنشئت ملفاتهم في يوم محدد، مرتبة بالاسم، مع المبالغ المالية وصور المتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربون الجدد' },
        ]}
        actions={
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            leftIcon={<ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            تحديث
          </Button>
        }
      />

      {/* شريط التنقل بين الأيام */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">اختيار اليوم</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              تنقّل بين الأيام أو اختر تاريخاً محدداً
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => today && goToDay(today)}
            className="sm:hidden shrink-0"
          >
            اليوم
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => date && goToDay(shiftDay(date, -1))}
            title="اليوم السابق"
            aria-label="اليوم السابق"
            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center justify-center"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          <input
            id="new-trainees-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && goToDay(e.target.value)}
            aria-label="التاريخ"
            className="h-10 flex-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 text-sm text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => date && goToDay(shiftDay(date, 1))}
            disabled={!date || !today || date >= today}
            title="اليوم التالي"
            aria-label="اليوم التالي"
            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center justify-center disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => today && goToDay(today)}
            className="hidden sm:inline-flex h-10 shrink-0"
          >
            اليوم
          </Button>
        </div>

        <div className="border-t border-slate-100 pt-3">
          {daysLoading ? (
            <div className="flex gap-1.5 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[58px] w-14 rounded-lg bg-slate-100 animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x">
              {days.map((d) => {
                const selected = d.date === date;
                const dayDate = parseDateInput(d.date);
                const weekday = dayDate.toLocaleDateString('ar-EG', { weekday: 'short' });
                const dayNumber = dayDate.toLocaleDateString('ar-EG', { day: 'numeric' });

                return (
                  <button
                    key={d.date}
                    id={`day-${d.date}`}
                    type="button"
                    onClick={() => goToDay(d.date)}
                    title={`${formatLongDate(d.date)} — ${d.count} متدرب`}
                    className={`shrink-0 snap-start w-14 sm:w-16 rounded-lg border px-1 py-1.5 text-center transition-colors ${
                      selected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : d.count > 0
                          ? 'bg-blue-50/60 border-blue-100 text-slate-700 hover:border-blue-300'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className={`block text-[9px] sm:text-[10px] leading-4 truncate ${selected ? 'text-white/80' : 'text-slate-400'}`}>
                      {weekday}
                    </span>
                    <span className="block text-xs sm:text-sm font-bold leading-5 tabular-nums">{dayNumber}</span>
                    <span
                      className={`block text-[9px] sm:text-[10px] leading-4 tabular-nums font-semibold ${
                        selected ? 'text-white' : d.count > 0 ? 'text-blue-600' : 'text-slate-300'
                      }`}
                    >
                      {d.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ملخص اليوم */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <SummaryCard
          label="عدد المتدربين"
          value={loading ? '—' : Number(summary?.count || 0).toLocaleString('ar-EG')}
          hint={formatLongDate(date)}
          icon={<UsersIcon />}
          tone="blue"
        />
        <SummaryCard
          label="إجمالي المدفوع"
          value={loading ? '—' : `${formatMoneyShort(summary?.totalPaid || 0)} ج.م`}
          hint="المبالغ المسددة فعلياً"
          icon={<BanknotesIcon />}
          tone="emerald"
        />
        <SummaryCard
          label="إجمالي الرسوم"
          value={loading ? '—' : `${formatMoneyShort(summary?.totalFees || 0)} ج.م`}
          hint="الرسوم المستحقة على المتدربين"
          icon={<ReceiptPercentIcon />}
          tone="amber"
        />
        <SummaryCard
          label="إجمالي المتبقي"
          value={loading ? '—' : `${formatMoneyShort(summary?.totalRemaining || 0)} ج.م`}
          hint="الرسوم غير المسددة"
          icon={<ExclamationTriangleIcon />}
          tone="rose"
        />
      </div>

      {/* قائمة المتدربين */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">المتدربون الجدد</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">{formatLongDate(date)}</p>
          </div>
          <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 sm:px-3 py-1 shrink-0">
            <UserPlusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {Number(summary?.count || 0).toLocaleString('ar-EG')}
            <span className="hidden sm:inline">متدرب</span>
          </span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="py-12 sm:py-14 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-3">
              <ExclamationTriangleIcon className="w-7 h-7 text-rose-500" />
            </div>
            <p className="font-semibold text-slate-800">تعذر تحميل البيانات</p>
            <p className="text-xs text-slate-400 mt-1 mb-4 break-words">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              إعادة المحاولة
            </Button>
          </div>
        ) : trainees.length === 0 ? (
          <div className="py-12 sm:py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <UserPlusIcon className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700">لا يوجد متدربون جدد في هذا اليوم</p>
            <p className="text-xs text-slate-400 mt-1">جرّب اختيار يوم آخر من شريط الأيام أو من حقل التاريخ.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trainees.map((t) => {
              const status = STATUS_META[t.status] || {
                label: t.status || '—',
                className: 'bg-slate-50 text-slate-600 border-slate-200',
              };

              return (
                <div key={t.id} className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                    {/* الصورة والاسم */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TraineeAvatar photoUrl={t.photoUrl} name={t.nameAr} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900 text-sm sm:text-base truncate min-w-0">
                            {t.nameAr}
                          </p>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                          {t.programName || 'بدون برنامج'}
                          <span className="text-slate-300"> · </span>
                          ملف: <span className="tabular-nums font-medium text-slate-600">{t.id}</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                          {t.nationalId}
                          <span className="text-slate-300"> · </span>
                          {t.phone}
                          {formatTime(t.createdAt) && (
                            <>
                              <span className="text-slate-300"> · </span>
                              {formatTime(t.createdAt)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* القيم المالية */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-5 w-full sm:w-[320px] shrink-0 min-w-0 rounded-lg bg-slate-50/80 sm:bg-transparent p-2 sm:p-0">
                      <MoneyCell label="الرسوم" value={t.totalFees} tone="slate" />
                      <MoneyCell label="المدفوع" value={t.totalPaid} tone="emerald" />
                      <MoneyCell
                        label="المتبقي"
                        value={t.totalRemaining}
                        tone={t.totalRemaining > 0 ? 'rose' : 'slate'}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && trainees.length > 0 && (
          <div className="px-3 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
            المبالغ محسوبة من مدفوعات المتدرب غير الملغاة. ترتيب المتدربين أبجدي حسب الاسم.
          </div>
        )}
      </div>
    </div>
  );
}