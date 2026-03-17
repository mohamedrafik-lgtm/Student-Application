'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  CalendarDaysIcon, CheckCircleIcon, XCircleIcon,
  ClockIcon, PlusIcon, DocumentTextIcon,
  ChatBubbleLeftRightIcon, SunIcon,
  HeartIcon, UserIcon, BoltIcon,
  ClipboardDocumentIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewedBy: { name: string } | null;
  reviewNotes: string | null;
  createdAt: string;
}

const LEAVE_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  ANNUAL: { label: 'إجازة سنوية', icon: <SunIcon className="w-5 h-5" /> },
  SICK: { label: 'إجازة مرضية', icon: <HeartIcon className="w-5 h-5" /> },
  PERSONAL: { label: 'إجازة شخصية', icon: <UserIcon className="w-5 h-5" /> },
  EMERGENCY: { label: 'إجازة طارئة', icon: <BoltIcon className="w-5 h-5" /> },
  UNPAID: { label: 'إجازة بدون راتب', icon: <ClipboardDocumentIcon className="w-5 h-5" /> },
  OTHER: { label: 'أخرى', icon: <PencilSquareIcon className="w-5 h-5" /> },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; bgCls: string; borderCls: string; dot: string }> = {
  PENDING: { label: 'قيد المراجعة', cls: 'text-tiba-warning-700', bgCls: 'bg-tiba-warning-50', borderCls: 'border-tiba-warning-200', dot: 'bg-tiba-warning-500' },
  APPROVED: { label: 'موافق عليها', cls: 'text-tiba-secondary-700', bgCls: 'bg-tiba-secondary-50', borderCls: 'border-tiba-secondary-200', dot: 'bg-tiba-secondary-500' },
  REJECTED: { label: 'مرفوضة', cls: 'text-tiba-danger-700', bgCls: 'bg-tiba-danger-50', borderCls: 'border-tiba-danger-200', dot: 'bg-tiba-danger-500' },
};

function getDaysDiff(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export default function MyLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Check enrollment
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI('/staff-attendance/my-status');
        if (data?.isEnrolled) {
          setIsEnrolled(true);
        } else {
          setIsEnrolled(false);
          router.replace('/dashboard');
        }
      } catch {
        setIsEnrolled(false);
        router.replace('/dashboard');
      }
    })();
  }, [router]);

  const loadLeaves = useCallback(async () => {
    if (!isEnrolled) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const data = await fetchAPI(`/staff-attendance/my-leaves?${params.toString()}`);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل طلبات الإجازات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isEnrolled]);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const handleCreate = async () => {
    if (!createForm.startDate || !createForm.endDate || !createForm.reason.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    try {
      setCreating(true);
      await fetchAPI('/staff-attendance/leaves', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.success('تم تقديم طلب الإجازة بنجاح');
      setShowCreateModal(false);
      setCreateForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في تقديم الطلب');
    } finally {
      setCreating(false);
    }
  };

  // Stats
  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'PENDING').length,
    approved: leaves.filter(l => l.status === 'APPROVED').length,
    rejected: leaves.filter(l => l.status === 'REJECTED').length,
  };

  if (isEnrolled === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tiba-gray-500">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">طلبات إجازاتي</h1>
            <p className="text-sm text-tiba-gray-500 mt-1">عرض وتقديم طلبات الإجازات الخاصة بك</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            طلب إجازة جديد
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
              <DocumentTextIcon className="w-4.5 h-4.5 text-tiba-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">إجمالي الطلبات</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-warning-50 flex items-center justify-center">
              <ClockIcon className="w-4.5 h-4.5 text-tiba-warning-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">قيد المراجعة</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-secondary-50 flex items-center justify-center">
              <CheckCircleIcon className="w-4.5 h-4.5 text-tiba-secondary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">موافق عليها</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-danger-50 flex items-center justify-center">
              <XCircleIcon className="w-4.5 h-4.5 text-tiba-danger-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">مرفوضة</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 p-3 sm:p-4 mb-5 shadow-card">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'الكل' },
            { value: 'PENDING', label: 'قيد المراجعة' },
            { value: 'APPROVED', label: 'موافق عليها' },
            { value: 'REJECTED', label: 'مرفوضة' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all ${
                statusFilter === s.value
                  ? 'bg-tiba-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaves List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-tiba-gray-500">جارٍ تحميل الطلبات...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-12 text-center shadow-card">
          <CalendarDaysIcon className="w-16 h-16 text-tiba-gray-200 mx-auto mb-4" />
          <p className="text-base font-semibold text-tiba-gray-400">لا توجد طلبات إجازات</p>
          <p className="text-sm text-tiba-gray-300 mt-1">يمكنك تقديم طلب إجازة جديد من الزر أعلاه</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-5"
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            طلب إجازة جديد
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => {
            const statusCfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING;
            const leaveTypeCfg = LEAVE_TYPES[leave.leaveType] || { label: leave.leaveType, icon: <DocumentTextIcon className="w-5 h-5" /> };
            const days = getDaysDiff(leave.startDate, leave.endDate);

            return (
              <div key={leave.id} className={`bg-white rounded-xl border ${leave.status === 'PENDING' ? 'border-tiba-warning-200' : 'border-tiba-gray-200'} p-4 sm:p-5 shadow-card hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${statusCfg.bgCls} border ${statusCfg.borderCls} flex items-center justify-center ${statusCfg.cls}`}>
                      {leaveTypeCfg.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{leaveTypeCfg.label}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(leave.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.bgCls} ${statusCfg.cls} ${statusCfg.borderCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-tiba-gray-100">
                    <p className="text-[10px] text-tiba-gray-500 font-medium mb-1">من</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(leave.startDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-tiba-gray-100">
                    <p className="text-[10px] text-tiba-gray-500 font-medium mb-1">إلى</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(leave.endDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="bg-tiba-primary-50 rounded-lg p-3 text-center border border-tiba-primary-100">
                    <p className="text-[10px] text-tiba-primary-500 font-medium mb-1">المدة</p>
                    <p className="text-sm font-bold text-tiba-primary-700">{days} {days === 1 ? 'يوم' : days === 2 ? 'يومان' : days <= 10 ? 'أيام' : 'يوم'}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-slate-50 rounded-lg p-3 border border-tiba-gray-100 mb-3">
                  <p className="text-[10px] text-tiba-gray-400 font-medium mb-1">السبب</p>
                  <p className="text-sm text-slate-600">{leave.reason}</p>
                </div>

                {/* Review notes */}
                {leave.reviewNotes && (
                  <div className={`flex items-start gap-2 rounded-lg p-3 border ${
                    leave.status === 'APPROVED' ? 'bg-tiba-secondary-50 border-tiba-secondary-100' : leave.status === 'REJECTED' ? 'bg-tiba-danger-50 border-tiba-danger-100' : 'bg-tiba-primary-50 border-tiba-primary-100'
                  }`}>
                    <ChatBubbleLeftRightIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      leave.status === 'APPROVED' ? 'text-tiba-secondary-500' : leave.status === 'REJECTED' ? 'text-tiba-danger-500' : 'text-tiba-primary-500'
                    }`} />
                    <div>
                      <p className={`text-xs font-medium ${
                        leave.status === 'APPROVED' ? 'text-tiba-secondary-700' : leave.status === 'REJECTED' ? 'text-tiba-danger-700' : 'text-tiba-primary-700'
                      }`}>رد المسؤول</p>
                      <p className={`text-xs mt-0.5 ${
                        leave.status === 'APPROVED' ? 'text-tiba-secondary-600' : leave.status === 'REJECTED' ? 'text-tiba-danger-600' : 'text-tiba-primary-600'
                      }`}>{leave.reviewNotes}</p>
                      {leave.reviewedBy && <p className="text-[10px] text-slate-400 mt-1">— {leave.reviewedBy.name}</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <TibaModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        variant="primary"
        size="md"
        title="طلب إجازة جديد"
        subtitle="قم بملء البيانات التالية لتقديم طلب الإجازة"
        icon={<CalendarDaysIcon className="w-6 h-6" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>إلغاء</Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              leftIcon={creating ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
            >
              تقديم الطلب
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">نوع الإجازة</label>
            <select
              value={createForm.leaveType}
              onChange={e => setCreateForm(f => ({ ...f, leaveType: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none bg-white transition-all"
            >
              {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">من تاريخ</label>
              <input
                type="date"
                value={createForm.startDate}
                onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">إلى تاريخ</label>
              <input
                type="date"
                value={createForm.endDate}
                onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
              />
            </div>
          </div>
          {createForm.startDate && createForm.endDate && (
            <div className="bg-tiba-primary-50 rounded-lg p-2.5 text-center border border-tiba-primary-100">
              <p className="text-xs text-tiba-primary-600 font-medium">
                مدة الإجازة: {getDaysDiff(createForm.startDate, createForm.endDate)} يوم
              </p>
            </div>
          )}
          <div>
            <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">السبب <span className="text-tiba-danger-400">*</span></label>
            <textarea
              value={createForm.reason}
              onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none resize-none transition-all"
              placeholder="اكتب سبب الإجازة..."
            />
          </div>
        </div>
      </TibaModal>
    </div>
  );
}
