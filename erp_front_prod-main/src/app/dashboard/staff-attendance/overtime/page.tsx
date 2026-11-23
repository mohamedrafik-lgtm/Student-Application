'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  ClockIcon, CheckCircleIcon, XCircleIcon,
  DocumentTextIcon, FunnelIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface OvertimeRequest {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; photoUrl?: string | null };
  date: string;
  startTime: string;
  endTime: string | null;
  totalMinutes: number;
  reason: string | null;
  status: string;
  endedBy: string | null;
  reviewedBy: string | null;
  reviewedByUser: { id: string; name: string } | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; bgCls: string; borderCls: string; dot: string }> = {
  PENDING: { label: 'قيد المراجعة', cls: 'text-tiba-warning-700', bgCls: 'bg-tiba-warning-50', borderCls: 'border-tiba-warning-200', dot: 'bg-tiba-warning-500' },
  APPROVED: { label: 'موافق عليه', cls: 'text-tiba-secondary-700', bgCls: 'bg-tiba-secondary-50', borderCls: 'border-tiba-secondary-200', dot: 'bg-tiba-secondary-500' },
  REJECTED: { label: 'مرفوض', cls: 'text-tiba-danger-700', bgCls: 'bg-tiba-danger-50', borderCls: 'border-tiba-danger-200', dot: 'bg-tiba-danger-500' },
};

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min} د`;
  return min > 0 ? `${h} س ${min} د` : `${h} ساعة`;
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function AdminOvertimeContent() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<OvertimeRequest | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    reviewNotes: '',
  });

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const data = await fetchAPI(`/staff-attendance/overtime?${params.toString()}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل طلبات الأوقات الإضافية');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleReview = async () => {
    if (!showReviewModal) return;
    try {
      setReviewing(true);
      await fetchAPI(`/staff-attendance/overtime/${showReviewModal.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(reviewForm),
      });
      toast.success(reviewForm.status === 'APPROVED' ? 'تم قبول الطلب' : 'تم رفض الطلب');
      setShowReviewModal(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    } finally {
      setReviewing(false);
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    totalApprovedMinutes: requests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.totalMinutes, 0),
  };

  return (
    <div>
      <PageHeader
        title="إدارة الأوقات الإضافية"
        description="مراجعة وإدارة جميع طلبات الأوقات الإضافية للموظفين"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'الموارد البشرية', href: '/dashboard/staff-attendance' },
          { label: 'الأوقات الإضافية' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="w-8 h-8 rounded-lg bg-tiba-primary-50 flex items-center justify-center mb-2">
            <DocumentTextIcon className="w-[1.125rem] h-[1.125rem] text-tiba-primary-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">إجمالي الطلبات</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="w-8 h-8 rounded-lg bg-tiba-warning-50 flex items-center justify-center mb-2">
            <ClockIcon className="w-[1.125rem] h-[1.125rem] text-tiba-warning-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">قيد المراجعة</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="w-8 h-8 rounded-lg bg-tiba-secondary-50 flex items-center justify-center mb-2">
            <CheckCircleIcon className="w-[1.125rem] h-[1.125rem] text-tiba-secondary-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">موافق عليها</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="w-8 h-8 rounded-lg bg-tiba-danger-50 flex items-center justify-center mb-2">
            <XCircleIcon className="w-[1.125rem] h-[1.125rem] text-tiba-danger-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">مرفوضة</p>
        </div>
      </div>

      {/* Total approved hours */}
      {stats.totalApprovedMinutes > 0 && (
        <div className="bg-tiba-secondary-50 border border-tiba-secondary-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-tiba-secondary-100 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-tiba-secondary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-tiba-secondary-800">إجمالي الأوقات الإضافية المعتمدة</p>
            <p className="text-lg font-bold text-tiba-secondary-700">{formatMinutes(stats.totalApprovedMinutes)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 p-3 sm:p-4 mb-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-tiba-primary-500" />
          <h3 className="text-sm font-semibold text-slate-700">تصفية الطلبات</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
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

      {/* Requests list */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-tiba-gray-500">جارٍ تحميل الطلبات...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-12 text-center shadow-card">
          <ClockIcon className="w-16 h-16 text-tiba-gray-200 mx-auto mb-4" />
          <p className="text-base font-semibold text-tiba-gray-400">لا توجد طلبات أوقات إضافية</p>
          <p className="text-sm text-tiba-gray-300 mt-1">ستظهر طلبات الأوقات الإضافية هنا عند تقديمها من الموظفين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-tiba-gray-200 p-4 sm:p-5 shadow-card hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={req.user?.name || ''} photoUrl={req.user?.photoUrl} size="md" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{req.user?.name}</h4>
                      <p className="text-xs text-slate-400">{req.user?.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bgCls} ${statusCfg.cls} ${statusCfg.borderCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <ClockIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-medium">{new Date(req.date).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-400">من</span>
                    <span className="font-medium font-mono">{formatTime(req.startTime)}</span>
                    <span className="text-xs text-slate-400">إلى</span>
                    <span className="font-medium font-mono">{req.endTime ? formatTime(req.endTime) : <span className="text-amber-600 text-xs">جارية...</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-tiba-primary-50 text-tiba-primary-700 rounded-lg px-3 py-2 font-semibold">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    {formatMinutes(req.totalMinutes)}
                  </div>
                </div>

                {req.reason && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-tiba-gray-100">
                    <p className="text-sm text-slate-600">{req.reason}</p>
                  </div>
                )}

                {req.endedBy === 'SYSTEM' && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 mb-3 text-xs text-slate-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>تم إنهاء هذه الجلسة تلقائياً بواسطة النظام</span>
                  </div>
                )}

                {req.reviewNotes && (
                  <div className="flex items-start gap-2 bg-tiba-primary-50 rounded-lg p-3 mb-3 border border-tiba-primary-100">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-tiba-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-tiba-primary-700">ملاحظات المراجع</p>
                      <p className="text-xs text-tiba-primary-600 mt-0.5">{req.reviewNotes}</p>
                      {req.reviewedByUser && <p className="text-[10px] text-tiba-primary-400 mt-1">— {req.reviewedByUser.name}</p>}
                    </div>
                  </div>
                )}

                {req.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2 border-t border-tiba-gray-100">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => { setShowReviewModal(req); setReviewForm({ status: 'APPROVED', reviewNotes: '' }); }}
                      leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    >
                      قبول
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setShowReviewModal(req); setReviewForm({ status: 'REJECTED', reviewNotes: '' }); }}
                      leftIcon={<XCircleIcon className="w-4 h-4" />}
                    >
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <TibaModal
          open={!!showReviewModal}
          onClose={() => setShowReviewModal(null)}
          variant={reviewForm.status === 'APPROVED' ? 'secondary' : 'danger'}
          size="md"
          title={reviewForm.status === 'APPROVED' ? 'قبول الطلب' : 'رفض الطلب'}
          subtitle={`طلب أوقات إضافية — ${showReviewModal.user?.name}`}
          icon={reviewForm.status === 'APPROVED' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReviewModal(null)}>إلغاء</Button>
              <Button
                variant={reviewForm.status === 'APPROVED' ? 'success' : 'danger'}
                size="sm"
                onClick={handleReview}
                disabled={reviewing}
                leftIcon={reviewing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
              >
                تأكيد
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-tiba-gray-100 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">التاريخ:</span> <span className="font-medium text-slate-700">{new Date(showReviewModal.date).toLocaleDateString('ar-SA')}</span></div>
                <div><span className="text-slate-400">المدة:</span> <span className="font-semibold text-tiba-primary-700">{formatMinutes(showReviewModal.totalMinutes)}</span></div>
                <div><span className="text-slate-400">من:</span> <span className="font-mono font-medium text-slate-700">{formatTime(showReviewModal.startTime)}</span></div>
                <div><span className="text-slate-400">إلى:</span> <span className="font-mono font-medium text-slate-700">{showReviewModal.endTime ? formatTime(showReviewModal.endTime) : 'جارية...'}</span></div>
              </div>
              {showReviewModal.reason && (
                <div className="mt-2 pt-2 border-t border-tiba-gray-100">
                  <span className="text-slate-400">السبب:</span> <span className="text-slate-600">{showReviewModal.reason}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReviewForm(f => ({ ...f, status: 'APPROVED' }))}
                className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                  reviewForm.status === 'APPROVED' ? 'bg-tiba-secondary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircleIcon className="w-4 h-4" /> قبول
              </button>
              <button
                onClick={() => setReviewForm(f => ({ ...f, status: 'REJECTED' }))}
                className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                  reviewForm.status === 'REJECTED' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <XCircleIcon className="w-4 h-4" /> رفض
              </button>
            </div>
            <div>
              <label className="text-xs text-tiba-gray-500 font-medium block mb-1.5">ملاحظات (اختياري)</label>
              <textarea
                value={reviewForm.reviewNotes}
                onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none resize-none transition-all"
                placeholder="أضف ملاحظة..."
              />
            </div>
          </div>
        </TibaModal>
      )}
    </div>
  );
}

export default function AdminOvertimePage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance.overtime', action: 'view' }}>
      <AdminOvertimeContent />
    </PageGuard>
  );
}
