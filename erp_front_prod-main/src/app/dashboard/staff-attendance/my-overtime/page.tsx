'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  ClockIcon, CheckCircleIcon, XCircleIcon,
  PlayIcon, StopIcon, DocumentTextIcon, TrashIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';

interface OvertimeRequest {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  totalMinutes: number;
  reason: string | null;
  status: string;
  endedBy: string | null;
  reviewedByUser: { name: string } | null;
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

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MyOvertimePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live overtime tracking
  const [activeSession, setActiveSession] = useState<OvertimeRequest | null>(null);
  const [overtimeElapsed, setOvertimeElapsed] = useState(0);
  const overtimeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadRequests = useCallback(async () => {
    if (!isEnrolled) return;
    try {
      setLoading(true);
      const [reqs, active] = await Promise.all([
        fetchAPI('/staff-attendance/my-overtime'),
        fetchAPI('/staff-attendance/overtime/active').catch(() => null),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      if (active && active.id && active.startTime && !active.endTime) {
        setActiveSession(active);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل طلبات الأوقات الإضافية');
    } finally {
      setLoading(false);
    }
  }, [isEnrolled]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Overtime timer
  useEffect(() => {
    if (activeSession?.startTime) {
      const startMs = new Date(activeSession.startTime).getTime();
      const calc = () => Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setOvertimeElapsed(calc());
      overtimeTimerRef.current = setInterval(() => setOvertimeElapsed(calc()), 1000);
      return () => { if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current); };
    } else {
      setOvertimeElapsed(0);
      if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
      return undefined;
    }
  }, [activeSession]);

  // Start overtime
  const handleStart = async () => {
    if (!overtimeReason.trim()) {
      toast.error('يرجى إدخال سبب الوقت الإضافي أولاً');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetchAPI('/staff-attendance/overtime/start', {
        method: 'POST',
        body: JSON.stringify({ reason: overtimeReason.trim() }),
      });
      setActiveSession(res);
      setShowReasonInput(false);
      setOvertimeReason('');
      toast.success('تم بدء تتبع الوقت الإضافي ⏱️');
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في بدء الوقت الإضافي');
    } finally {
      setSubmitting(false);
    }
  };

  // End overtime
  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      setSubmitting(true);
      await fetchAPI(`/staff-attendance/overtime/${activeSession.id}/end`, {
        method: 'POST',
      });
      toast.success('تم إنهاء وحفظ الوقت الإضافي بنجاح! ✅');
      setActiveSession(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في إنهاء الوقت الإضافي');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteId) return;
    try {
      setDeleting(true);
      await fetchAPI(`/staff-attendance/overtime/${showDeleteId}`, { method: 'DELETE' });
      toast.success('تم حذف الطلب');
      setShowDeleteId(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const completedRequests = requests.filter(r => r.endTime != null);
  const filteredRequests = statusFilter
    ? completedRequests.filter(r => r.status === statusFilter)
    : completedRequests;

  const stats = {
    total: completedRequests.length,
    pending: completedRequests.filter(r => r.status === 'PENDING').length,
    approved: completedRequests.filter(r => r.status === 'APPROVED').length,
    rejected: completedRequests.filter(r => r.status === 'REJECTED').length,
    totalApprovedMinutes: completedRequests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.totalMinutes, 0),
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">أوقاتي الإضافية</h1>
        <p className="text-sm text-tiba-gray-500 mt-1">تتبع وعرض سجل الأوقات الإضافية الخاصة بك</p>
      </div>

      {/* ===== Live Overtime Tracking Card ===== */}
      <div className="bg-white rounded-xl border-2 border-amber-200 p-5 sm:p-6 mb-6 shadow-card">
        {activeSession ? (
          /* Active session — show live timer */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                <h3 className="text-base font-bold text-amber-800">جلسة وقت إضافي جارية</h3>
              </div>
              <span className="text-xs text-slate-400">
                بدأ الساعة {new Date(activeSession.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-center py-5 bg-gradient-to-b from-amber-50 to-white rounded-xl border border-amber-100">
              <p className="text-4xl sm:text-5xl font-mono font-bold text-amber-600 tracking-wider" dir="ltr">
                {formatElapsed(overtimeElapsed)}
              </p>
              <p className="text-sm text-slate-500 mt-2">الوقت الإضافي المنقضي</p>
            </div>

            {activeSession.reason && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-[10px] text-amber-500 font-medium mb-0.5">السبب</p>
                <p className="text-sm text-amber-800">{activeSession.reason}</p>
              </div>
            )}

            <Button
              onClick={handleEnd}
              disabled={submitting}
              className="w-full"
              variant="danger"
              size="lg"
              leftIcon={submitting
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <StopIcon className="w-5 h-5" />}
            >
              {submitting ? 'جارٍ الحفظ...' : 'إنهاء الوقت الإضافي'}
            </Button>
          </div>
        ) : showReasonInput ? (
          /* Step 1: Enter reason before starting */
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-amber-600" />
              بدء وقت إضافي جديد
            </h3>
            <div>
              <label className="text-xs text-tiba-gray-600 font-medium block mb-1.5">سبب الوقت الإضافي <span className="text-tiba-danger-400">*</span></label>
              <textarea
                value={overtimeReason}
                onChange={e => setOvertimeReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none transition-all"
                placeholder="اكتب سبب الوقت الإضافي..."
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                disabled={submitting}
                className="flex-1"
                leftIcon={submitting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <PlayIcon className="w-4 h-4" />}
              >
                {submitting ? 'جارٍ البدء...' : 'بدء التتبع'}
              </Button>
              <Button variant="outline" onClick={() => { setShowReasonInput(false); setOvertimeReason(''); }}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          /* Default: Start overtime button */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ClockIcon className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">الوقت الإضافي</h3>
            <p className="text-sm text-tiba-gray-400 mb-5">اضغط على الزر لبدء تتبع وقت إضافي جديد</p>
            <Button
              onClick={() => setShowReasonInput(true)}
              size="lg"
              leftIcon={<PlayIcon className="w-5 h-5" />}
              className="bg-gradient-to-l from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 border-0"
            >
              بدء وقت إضافي
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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

      {/* Approved hours banner */}
      {stats.totalApprovedMinutes > 0 && (
        <div className="bg-tiba-secondary-50 border border-tiba-secondary-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-tiba-secondary-100 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-tiba-secondary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-tiba-secondary-800">إجمالي أوقاتك الإضافية المعتمدة</p>
            <p className="text-lg font-bold text-tiba-secondary-700">{formatMinutes(stats.totalApprovedMinutes)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
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

      {/* Requests list */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-tiba-gray-500">جارٍ تحميل الطلبات...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-12 text-center shadow-card">
          <ClockIcon className="w-16 h-16 text-tiba-gray-200 mx-auto mb-4" />
          <p className="text-base font-semibold text-tiba-gray-400">لا توجد طلبات أوقات إضافية مكتملة</p>
          <p className="text-sm text-tiba-gray-300 mt-1">ابدأ وقتاً إضافياً من الزر أعلاه</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            return (
              <div key={req.id} className={`bg-white rounded-xl border ${req.status === 'PENDING' ? 'border-tiba-warning-200' : 'border-tiba-gray-200'} p-4 sm:p-5 shadow-card hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${statusCfg.bgCls} border ${statusCfg.borderCls} flex items-center justify-center ${statusCfg.cls}`}>
                      <ClockIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">وقت إضافي</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => setShowDeleteId(req.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-tiba-danger-50 hover:bg-tiba-danger-100 text-tiba-danger-600 transition-all"
                        title="حذف الطلب"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.bgCls} ${statusCfg.cls} ${statusCfg.borderCls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-tiba-gray-100">
                    <p className="text-[10px] text-tiba-gray-500 font-medium mb-1">التاريخ</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(req.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-tiba-gray-100">
                    <p className="text-[10px] text-tiba-gray-500 font-medium mb-1">الفترة</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{formatTime(req.startTime)} — {req.endTime ? formatTime(req.endTime) : <span className="text-amber-600">جارية...</span>}</p>
                  </div>
                  <div className="bg-tiba-primary-50 rounded-lg p-3 text-center border border-tiba-primary-100">
                    <p className="text-[10px] text-tiba-primary-500 font-medium mb-1">المدة</p>
                    <p className="text-sm font-bold text-tiba-primary-700">{formatMinutes(req.totalMinutes)}</p>
                  </div>
                </div>

                {req.reason && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-tiba-gray-100 mb-3">
                    <p className="text-[10px] text-tiba-gray-400 font-medium mb-1">السبب</p>
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
                  <div className={`flex items-start gap-2 rounded-lg p-3 border ${
                    req.status === 'APPROVED' ? 'bg-tiba-secondary-50 border-tiba-secondary-100' : req.status === 'REJECTED' ? 'bg-tiba-danger-50 border-tiba-danger-100' : 'bg-tiba-primary-50 border-tiba-primary-100'
                  }`}>
                    <ChatBubbleLeftRightIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      req.status === 'APPROVED' ? 'text-tiba-secondary-500' : req.status === 'REJECTED' ? 'text-tiba-danger-500' : 'text-tiba-primary-500'
                    }`} />
                    <div>
                      <p className={`text-xs font-medium ${
                        req.status === 'APPROVED' ? 'text-tiba-secondary-700' : req.status === 'REJECTED' ? 'text-tiba-danger-700' : 'text-tiba-primary-700'
                      }`}>رد المسؤول</p>
                      <p className={`text-xs mt-0.5 ${
                        req.status === 'APPROVED' ? 'text-tiba-secondary-600' : req.status === 'REJECTED' ? 'text-tiba-danger-600' : 'text-tiba-primary-600'
                      }`}>{req.reviewNotes}</p>
                      {req.reviewedByUser && <p className="text-[10px] text-slate-400 mt-1">— {req.reviewedByUser.name}</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteId && (
        <TibaModal
          open={!!showDeleteId}
          onClose={() => setShowDeleteId(null)}
          variant="danger"
          size="sm"
          title="حذف الطلب"
          subtitle="هل أنت متأكد من حذف هذا الطلب؟"
          icon={<TrashIcon className="w-6 h-6" />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteId(null)}>إلغاء</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                leftIcon={deleting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
              >
                حذف
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">سيتم حذف هذا الطلب نهائياً ولن يمكن استرجاعه.</p>
        </TibaModal>
      )}
    </div>
  );
}
