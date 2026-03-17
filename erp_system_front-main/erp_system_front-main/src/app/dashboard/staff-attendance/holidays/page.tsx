'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import {
  CalendarDaysIcon, PlusIcon, PencilIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';

interface Holiday {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  isRecurring: boolean;
  createdAt: string;
}

function HolidaysPageContent() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    date: '',
    endDate: '',
    isRecurring: false,
  });

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/staff-attendance/holidays');
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل العطلات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', date: '', endDate: '', isRecurring: false });
    setShowModal(true);
  };

  const openEdit = (h: Holiday) => {
    setEditId(h.id);
    setForm({
      name: h.name,
      date: h.date?.split('T')[0] || '',
      endDate: h.endDate?.split('T')[0] || '',
      isRecurring: h.isRecurring,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.date) {
      toast.error('يرجى ملء الاسم والتاريخ');
      return;
    }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        name: form.name,
        date: form.date,
        isRecurring: form.isRecurring,
      };
      if (form.endDate) body.endDate = form.endDate;

      if (editId) {
        await fetchAPI(`/staff-attendance/holidays/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('تم تحديث العطلة');
      } else {
        await fetchAPI('/staff-attendance/holidays', { method: 'POST', body: JSON.stringify(body) });
        toast.success('تم إضافة العطلة');
      }
      setShowModal(false);
      loadHolidays();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetchAPI(`/staff-attendance/holidays/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('تم حذف العطلة');
      loadHolidays();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-tiba-gray-500">جارٍ التحميل...</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="العطلات الرسمية"
        description="إدارة أيام العطل الرسمية والمناسبات"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين', href: '/dashboard/staff-attendance' },
          { label: 'العطلات' },
        ]}
        actions={
          <Button
            onClick={openCreate}
            size="sm"
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            إضافة عطلة
          </Button>
        }
      />

      {holidays.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-8 text-center shadow-card">
          <CalendarDaysIcon className="w-12 h-12 text-tiba-gray-200 mx-auto mb-3" />
          <p className="text-sm text-tiba-gray-400">لا توجد عطلات مسجلة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.map(h => (
            <div key={h.id} className="bg-white rounded-xl border border-tiba-gray-200 p-5 hover:shadow-md hover:border-tiba-primary-200 transition-all shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <CalendarDaysIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{h.name}</h4>
                    {h.isRecurring && (
                      <span className="text-xs text-purple-600 font-medium">متكررة سنوياً</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(h)} className="p-1.5 text-tiba-gray-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(h.id, h.name)} className="p-1.5 text-tiba-gray-400 hover:text-tiba-danger-600 hover:bg-tiba-danger-50 rounded-lg transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-tiba-gray-500 space-y-1">
                <p>التاريخ: <span className="font-medium text-slate-700">{new Date(h.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                {h.endDate && (
                  <p>حتى: <span className="font-medium text-slate-700">{new Date(h.endDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TibaModal
        open={showModal}
        onClose={() => setShowModal(false)}
        variant="primary"
        size="md"
        title={editId ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
        subtitle="حدد تفاصيل العطلة الرسمية"
        icon={<CalendarDaysIcon className="w-6 h-6" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              leftIcon={submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
            >
              {editId ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">اسم العطلة</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
              placeholder="مثال: عيد الفطر"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">تاريخ البداية</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">تاريخ النهاية (اختياري)</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
              className="w-4 h-4 text-tiba-primary-600 border-tiba-gray-300 rounded focus:ring-tiba-primary-500"
            />
            <span className="text-sm text-slate-700">عطلة متكررة كل سنة</span>
          </label>
        </div>
      </TibaModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="حذف العطلة"
        message={`هل أنت متأكد من حذف العطلة "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        type="danger"
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}

export default function HolidaysPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance.holidays', action: 'manage' }}>
      <HolidaysPageContent />
    </PageGuard>
  );
}
