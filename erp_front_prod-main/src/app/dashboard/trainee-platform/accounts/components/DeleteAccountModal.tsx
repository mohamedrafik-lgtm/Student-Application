'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  TrashIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';

/** مدة الانتظار قبل السماح بالحذف (ثوانٍ) */
const DELETE_DELAY_SECONDS = 5;

interface DeletionPreview {
  account: {
    id: string;
    nationalId: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
    programName: string;
  };
  items: { label: string; count: number; details?: string }[];
  totalRecords: number;
  statsSummary: {
    totalSessions: number;
    totalTimeSpent: number;
    totalPageVisits: number;
    firstLogin: string | null;
    lastLogin: string | null;
  } | null;
  hasActiveSessions: boolean;
  note: string;
}

interface DeleteAccountModalProps {
  open: boolean;
  accountId: string | null;
  traineeName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({
  open,
  accountId,
  traineeName,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) {
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(DELETE_DELAY_SECONDS);
  const [acknowledge, setAcknowledge] = useState(false);

  // زر الحذف يُفتح فقط بعد انتهاء العدّاد
  const isConfirmValid = countdown === 0 && acknowledge;

  const fetchPreview = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAPI(
        `/trainee-platform/accounts/${accountId}/deletion-preview`,
      );
      setPreview(response);
    } catch (err: any) {
      console.error('Error loading deletion preview:', err);
      setError(err.message || 'تعذر تحميل معاينة الحذف');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (open && accountId) {
      setForce(false);
      setAcknowledge(false);
      setCountdown(DELETE_DELAY_SECONDS);
      fetchPreview();
    }
  }, [open, accountId, fetchPreview]);

  // ⏱️ العدّاد التنازلي: يبدأ فور فتح النافذة
  useEffect(() => {
    if (!open || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [open, countdown]);

  const handleDelete = async () => {
    if (!accountId || !isConfirmValid) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetchAPI(`/trainee-platform/accounts/${accountId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          // ختم زمني بدل العبارة النصية
          countdownElapsed: countdown === 0,
          force,
        }),
      });

      toast.success(response.message || 'تم حذف الحساب نهائياً');
      onDeleted();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'تعذر حذف الحساب';
      setError(msg);
      toast.error(msg);

      // إذا كان السبب جلسات نشطة، اقترح خيار الإجبار
      if (msg.includes('جلسات نشطة')) {
        setForce(true);
      }
    } finally {
      setDeleting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 دقيقة';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
    return `${minutes} دقيقة`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 sm:my-8 border border-red-200">
        {/* الهيدر */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-white truncate">
                حذف حساب المنصة نهائياً
              </h3>
              <p className="text-xs sm:text-sm text-white/80 truncate">{traineeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors disabled:opacity-50 flex-shrink-0"
            aria-label="إغلاق"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* تحذير رئيسي */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold mb-1">هذا الإجراء لا يمكن التراجع عنه</p>
              <p className="text-xs sm:text-sm leading-relaxed">
                سيتم حذف حساب المنصة نهائياً مع جميع سجلات الجلسات والتتبع المرتبطة به.
                لن يستطيع المتدرب تسجيل الدخول إلى المنصة بعد الآن.
              </p>
            </div>
          </div>

          {/* حالة التحميل */}
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
            </div>
          )}

          {/* خطأ */}
          {!loading && error && !preview && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-800">{error}</p>
              <Button
                onClick={fetchPreview}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* المعاينة */}
          {!loading && preview && (
            <>
              {/* بيانات الحساب */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">بيانات الحساب</p>
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">اسم المتدرب</p>
                    <p className="text-sm font-medium text-gray-800">{preview.trainee.nameAr}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">الرقم القومي</p>
                    <p className="text-sm font-mono text-gray-800">
                      {preview.trainee.nationalId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">البرنامج</p>
                    <p className="text-sm text-gray-800">{preview.trainee.programName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">تاريخ إنشاء الحساب</p>
                    <p className="text-sm text-gray-800">{formatDate(preview.account.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">آخر دخول</p>
                    <p className="text-sm text-gray-800">{formatDate(preview.account.lastLoginAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">حالة الحساب</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        preview.account.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preview.account.isActive ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                </div>
              </div>

              {/* السجلات التي ستُحذف */}
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-3 sm:px-4 py-2 border-b border-red-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-800">
                    السجلات التي ستُحذف تلقائياً
                  </p>
                  <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    {preview.totalRecords} سجل
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {preview.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between px-3 sm:px-4 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-gray-700">{item.label}</span>
                        {item.details && (
                          <span className="block text-xs text-orange-600">{item.details}</span>
                        )}
                      </div>
                      <span
                        className={`font-bold flex-shrink-0 ml-2 ${
                          item.count > 0 ? 'text-red-600' : 'text-gray-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ملخص الإحصائيات */}
              {preview.statsSummary && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">
                      ملخص النشاط (معلومات فقط — سيُحذف)
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">إجمالي الجلسات</p>
                      <p className="text-lg font-bold text-gray-800">
                        {preview.statsSummary.totalSessions}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">وقت الاستخدام</p>
                      <p className="text-sm font-bold text-gray-800">
                        {formatDuration(preview.statsSummary.totalTimeSpent)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">زيارات الصفحات</p>
                      <p className="text-lg font-bold text-gray-800">
                        {preview.statsSummary.totalPageVisits}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* جلسات نشطة */}
              {preview.hasActiveSessions && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 sm:p-4">
                  <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                      className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0"
                    />
                    <div className="text-sm text-orange-900">
                      <p className="font-semibold flex items-center gap-1 mb-1">
                        <ClockIcon className="w-4 h-4" />
                        المتدرب متصل الآن ({preview.items.find((i) => i.details)?.details})
                      </p>
                      <p className="text-xs">
                        فعّل هذا الخيار لتأكيد الحذف وإغلاق جلساته النشطة. لن يستطيع المتدرب
                        إكمال عمله بدون تسجيل دخول جديد.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* تنبيه: سجل المتدرب لا يُحذف */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                  {preview.note}
                </p>
              </div>

              {/* تأكيد بالانتظار + إقرار الخطأ */}
              <div
                className={`border-2 rounded-xl p-3 sm:p-4 transition-colors ${
                  acknowledge
                    ? 'border-green-400 bg-green-50/60'
                    : 'border-red-300 bg-red-50/50'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={acknowledge}
                    disabled={countdown > 0 || deleting}
                    onChange={(e) => setAcknowledge(e.target.checked)}
                    className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {countdown > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4 text-orange-500 animate-pulse" />
                          انتظر {countdown} ثانية قبل تأكيد الحذف
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                          هل أنت متأكد من حذف حساب المنصة نهائياً؟
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      سيُلغى حساب <strong>{preview.trainee.nameAr}</strong> نهائياً ولن
                      يستطيع تسجيل الدخول للمنصة. سجل المتدرب وبياناته الأكاديمية والمالية
                      لن تتأثر.
                    </p>
                  </div>
                </div>

                {/* شريط العدّاد */}
                {countdown > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-linear"
                        style={{
                          width: `${((DELETE_DELAY_SECONDS - countdown) / DELETE_DELAY_SECONDS) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 text-center">
                      يُفضّل مراجعة معاينة الحذف أعلاه قبل المتابعة
                    </p>
                  </div>
                )}

                {countdown === 0 && !acknowledge && (
                  <p className="flex items-center gap-1 text-xs text-gray-600 mt-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    ضع علامة الصح للمتابعة
                  </p>
                )}

                {acknowledge && (
                  <p className="flex items-center gap-1 text-xs text-green-700 mt-2.5">
                    <CheckCircleIcon className="w-4 h-4" />
                    تم التأكيد — يمكنك الآن الضغط على زر الحذف
                  </p>
                )}
              </div>

              {/* خطأ أثناء الحذف */}
              {error && preview && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* الفوتر */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 rounded-b-2xl">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldExclamationIcon className="w-4 h-4" />
            <span>سجل المتدرب لن يُحذف</span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={deleting}
              className="flex-1 sm:flex-none"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!isConfirmValid || loading || deleting}
              isLoading={deleting}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleting ? (
                'جاري الحذف...'
              ) : countdown > 0 ? (
                <>
                  <ClockIcon className="w-4 h-4 ml-1" />
                  انتظر {countdown}
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4 ml-1" />
                  تأكيد الحذف
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}