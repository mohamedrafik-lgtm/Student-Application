'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface Program {
  id: number;
  nameAr: string;
}

interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  programId: number;
  type?: string;
}

interface FeeSetting {
  id: string;
  programId: number;
  feeId: number;
  submissionDeadline: string;
  isRequestsOpen: boolean;
  isActive: boolean;
  notes?: string | null;
  updatedAt: string;
  isDeadlinePassed?: boolean;
  program?: {
    id: number;
    nameAr: string;
  };
  fee?: {
    id: number;
    name: string;
    amount: number;
    type?: string;
  };
}

interface FormState {
  id: string | null;
  programId: string;
  feeId: string;
  submissionDeadline: string;
  isRequestsOpen: boolean;
  isActive: boolean;
  notes: string;
}

const initialForm: FormState = {
  id: null,
  programId: '',
  feeId: '',
  submissionDeadline: '',
  isRequestsOpen: false,
  isActive: true,
  notes: '',
};

function unwrapPayload<T = any>(value: any): T {
  return ((value as any)?.data ?? value) as T;
}

function formatMoney(amount?: number) {
  return Number(amount || 0).toLocaleString('ar-EG');
}

function toDateInput(isoDate?: string) {
  if (!isoDate) return '';
  return new Date(isoDate).toISOString().split('T')[0];
}

function normalizeDateLabel(dateValue?: string) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('ar-EG');
}

export default function MinistryExamFeesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.ministry-exam-fees', action: 'view' }}>
      <MinistryExamFeesContent />
    </ProtectedPage>
  );
}

function MinistryExamFeesContent() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('dashboard.ministry-exam-fees', 'manage');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [fees, setFees] = useState<TraineeFee[]>([]);
  const [settings, setSettings] = useState<FeeSetting[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [programsRes, feesRes, settingsRes] = await Promise.all([
        fetchAPI('/programs'),
        fetchAPI('/finances/trainee-fees'),
        fetchAPI('/ministry-exam-declarations/fees/configs'),
      ]);

      setPrograms(unwrapPayload<Program[]>(programsRes) || []);
      setFees(unwrapPayload<TraineeFee[]>(feesRes) || []);
      setSettings(unwrapPayload<FeeSetting[]>(settingsRes) || []);
    } catch (error: any) {
      toast.error(error.message || 'تعذر تحميل إعدادات رسوم اختبار وزارة العمل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const programFeeOptions = useMemo(() => {
    if (!form.programId) return [];
    const selectedProgramId = Number(form.programId);
    return fees.filter((fee) => fee.programId === selectedProgramId);
  }, [fees, form.programId]);

  useEffect(() => {
    if (!form.programId) return;
    const selectedProgramId = Number(form.programId);
    const feeStillValid = fees.some(
      (fee) => fee.id === Number(form.feeId) && fee.programId === selectedProgramId,
    );

    if (!feeStillValid && form.feeId) {
      setForm((prev) => ({ ...prev, feeId: '' }));
    }
  }, [form.programId, form.feeId, fees]);

  const onEdit = (item: FeeSetting) => {
    setForm({
      id: item.id,
      programId: String(item.programId),
      feeId: String(item.feeId),
      submissionDeadline: toDateInput(item.submissionDeadline),
      isRequestsOpen: item.isRequestsOpen,
      isActive: item.isActive,
      notes: item.notes || '',
    });
  };

  const onCreateNew = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManage) {
      toast.error('ليس لديك صلاحية الإدارة');
      return;
    }

    if (!form.programId || !form.feeId || !form.submissionDeadline) {
      toast.error('يرجى اختيار البرنامج والرسم وتحديد الموعد النهائي');
      return;
    }

    const payload = {
      programId: Number(form.programId),
      feeId: Number(form.feeId),
      submissionDeadline: form.submissionDeadline,
      isRequestsOpen: form.isRequestsOpen,
      isActive: form.isActive,
      notes: form.notes.trim() || undefined,
    };

    try {
      setSaving(true);
      if (form.id) {
        await fetchAPI(`/ministry-exam-declarations/fees/configs/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('تم تحديث إعداد رسوم اختبار وزارة العمل');
      } else {
        await fetchAPI('/ministry-exam-declarations/fees/configs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('تم إنشاء إعداد رسوم اختبار وزارة العمل');
      }

      setForm(initialForm);
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'تعذر حفظ الإعداد');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOpen = async (item: FeeSetting) => {
    if (!canManage) {
      toast.error('ليس لديك صلاحية الإدارة');
      return;
    }

    try {
      await fetchAPI(`/ministry-exam-declarations/fees/configs/${item.id}/toggle-open`, {
        method: 'POST',
        body: JSON.stringify({ isRequestsOpen: !item.isRequestsOpen }),
      });
      toast.success(item.isRequestsOpen ? 'تم غلق استقبال الطلبات' : 'تم فتح استقبال الطلبات');
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'تعذر تحديث حالة استقبال الطلبات');
    }
  };

  const handleDelete = async (item: FeeSetting) => {
    if (!canManage) {
      toast.error('ليس لديك صلاحية الإدارة');
      return;
    }

    if (!confirm(`هل تريد حذف إعداد برنامج ${item.program?.nameAr || item.programId}؟`)) {
      return;
    }

    try {
      await fetchAPI(`/ministry-exam-declarations/fees/configs/${item.id}`, {
        method: 'DELETE',
      });
      toast.success('تم حذف الإعداد بنجاح');
      if (form.id === item.id) {
        setForm(initialForm);
      }
      await loadAll();
    } catch (error: any) {
      toast.error(error.message || 'تعذر حذف الإعداد');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">جاري تحميل إعدادات رسوم اختبار وزارة العمل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CurrencyDollarIcon className="w-7 h-7 text-emerald-600" />
              رسوم اختبار وزارة العمل
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-7">
              صفحة مستقلة لضبط الرسم المالي والموعد النهائي لكل برنامج، مع التحكم في فتح/غلق استقبال
              طلبات إقرار اختبار وزارة العمل.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
            >
              <PlusIcon className="w-4 h-4" />
              إعداد جديد
            </button>
          )}
        </div>

        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-7">
          افتراضيًا، استقبال الطلبات مغلق حتى يتم فتحه يدويًا لكل برنامج. بعد تجاوز الموعد النهائي،
          سيتم منع الطباعة والتقديم تلقائيًا إذا لم يتم سداد الرسم المحدد بالكامل.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {form.id ? 'تعديل إعداد البرنامج' : 'إعداد برنامج جديد'}
          </h2>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">البرنامج التدريبي</label>
            <select
              value={form.programId}
              onChange={(e) => setForm((prev) => ({ ...prev, programId: e.target.value }))}
              disabled={!canManage || !!form.id}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-100"
            >
              <option value="">اختر البرنامج</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.nameAr}
                </option>
              ))}
            </select>
            {form.id && (
              <p className="text-xs text-slate-500 mt-1">لا يمكن تغيير البرنامج في وضع التعديل، أنشئ إعدادًا جديدًا بدلًا من ذلك.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">الرسم المطلوب</label>
            <select
              value={form.feeId}
              onChange={(e) => setForm((prev) => ({ ...prev, feeId: e.target.value }))}
              disabled={!canManage || !form.programId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-100"
            >
              <option value="">اختر الرسم</option>
              {programFeeOptions.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.name} - {formatMoney(fee.amount)} ج.م
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">آخر موعد للتقديم</label>
            <input
              type="date"
              value={form.submissionDeadline}
              onChange={(e) => setForm((prev) => ({ ...prev, submissionDeadline: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-100"
            />
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isRequestsOpen}
                onChange={(e) => setForm((prev) => ({ ...prev, isRequestsOpen: e.target.checked }))}
                disabled={!canManage}
                className="rounded border-slate-300"
              />
              فتح استقبال الطلبات لهذا البرنامج
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                disabled={!canManage}
                className="rounded border-slate-300"
              />
              الإعداد مفعل
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canManage || saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : form.id ? 'حفظ التعديل' : 'إنشاء الإعداد'}
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold"
            >
              إعادة ضبط
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">الإعدادات الحالية</h2>

          {settings.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 text-sm">
              لا توجد إعدادات بعد. قم بإنشاء إعداد لكل برنامج تريد تفعيله.
            </div>
          ) : (
            <div className="space-y-3">
              {settings.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-bold text-slate-900">{item.program?.nameAr || `برنامج #${item.programId}`}</p>
                      <p className="text-sm text-slate-600">
                        الرسم: <span className="font-bold text-slate-800">{item.fee?.name || `#${item.feeId}`}</span>
                        {' - '}
                        {formatMoney(item.fee?.amount)} ج.م
                      </p>
                      <p className="text-sm text-slate-600 inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-4 h-4" />
                        الموعد النهائي: {normalizeDateLabel(item.submissionDeadline)}
                        {item.isDeadlinePassed && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            انتهى الموعد
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        آخر تحديث: {new Date(item.updatedAt).toLocaleString('ar-EG')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold ${
                          item.isRequestsOpen
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.isRequestsOpen ? (
                          <LockOpenIcon className="w-3.5 h-3.5" />
                        ) : (
                          <LockClosedIcon className="w-3.5 h-3.5" />
                        )}
                        {item.isRequestsOpen ? 'الطلبات مفتوحة' : 'الطلبات مغلقة'}
                      </span>

                      {!item.isActive && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200">
                          غير مفعل
                        </span>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleOpen(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-700"
                          >
                            {item.isRequestsOpen ? <LockClosedIcon className="w-3.5 h-3.5" /> : <LockOpenIcon className="w-3.5 h-3.5" />}
                            {item.isRequestsOpen ? 'غلق الطلبات' : 'فتح الطلبات'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            حذف
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-6">
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
