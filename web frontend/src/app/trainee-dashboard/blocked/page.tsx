'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LockClosedIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useTraineePaymentStatus } from '@/hooks/useTraineePaymentStatus';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PlatformBlockedPage() {
  const router = useRouter();
  const { status, loading, refetch } = useTraineePaymentStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeData, setPostponeData] = useState({
    feeId: '',
    reason: '',
    requestedExtensionDays: 7
  });
  const [submittingPostpone, setSubmittingPostpone] = useState(false);

  useEffect(() => {
    if (!loading && status?.canAccess) {
      router.push('/trainee-dashboard');
    }
  }, [status, loading, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSubmitPostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postponeData.feeId || !postponeData.reason || !postponeData.requestedExtensionDays) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmittingPostpone(true);
    try {
      const token = localStorage.getItem('trainee_token');
      const response = await fetch(`${API_BASE_URL}/deferral-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feeId: parseInt(postponeData.feeId),
          reason: postponeData.reason,
          requestedExtensionDays: postponeData.requestedExtensionDays
        })
      });

      if (!response.ok) {
        throw new Error('فشل إرسال الطلب');
      }

      toast.success('تم إرسال طلب التأجيل بنجاح! سيتم مراجعته قريباً');
      setShowPostponeModal(false);
      setPostponeData({ feeId: '', reason: '', requestedExtensionDays: 7 });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إرسال الطلب');
    } finally {
      setSubmittingPostpone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-sm">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  const blockInfo = status?.blockInfo;
  const blockReason = blockInfo?.blockReason;
  const overduePayments = blockInfo?.overduePayments || [];
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.remainingAmount, 0);

  // تحديد نوع الحجب
  const isPaymentBlock = blockReason === 'PAYMENT_OVERDUE';
  const isTemporarySuspension = blockReason === 'TEMPORARY_SUSPENSION';
  const isPermanentExpulsion = blockReason === 'PERMANENT_EXPULSION';
  
  // الألوان والأيقونات حسب النوع
  const blockConfig = isPaymentBlock
    ? { color: 'red', icon: '💰', title: 'إيقاف بسبب الرسوم' }
    : isTemporarySuspension
    ? { color: 'orange', icon: '⏸️', title: 'فصل مؤقت' }
    : { color: 'purple', icon: '🚫', title: 'فصل نهائي' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-white flex items-center justify-center p-3 sm:p-4 md:p-6">
      
      <div className="w-full max-w-2xl">
        
        {/* البطاقة الرئيسية */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          
          {/* الرأس - ألوان متغيرة حسب النوع */}
          <div className={`text-white p-6 sm:p-8 text-center relative overflow-hidden ${
            isPaymentBlock
              ? 'bg-gradient-to-r from-red-600 to-rose-600'
              : isTemporarySuspension
              ? 'bg-gradient-to-r from-orange-600 to-amber-600'
              : 'bg-gradient-to-r from-purple-600 to-violet-600'
          }`}>
            
            {/* خلفية متحركة خفيفة */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            
            <div className="relative">
              {/* الأيقونة */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <LockClosedIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-base sm:text-lg">⚠️</span>
                  </div>
                </div>
              </div>

              {/* العنوان */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                {blockConfig.icon} {blockConfig.title}
              </h1>
              <p className={`text-sm sm:text-base ${
                isPaymentBlock ? 'text-red-100' : isTemporarySuspension ? 'text-orange-100' : 'text-purple-100'
              }`}>
                {isPaymentBlock
                  ? 'عزيزي المتدرب، تم تعليق وصولك للمنصة بسبب تأخر في سداد الرسوم'
                  : isTemporarySuspension
                  ? 'عزيزي المتدرب، تم فصلك مؤقتاً بقرار إداري'
                  : 'عزيزي المتدرب، تم فصلك نهائياً من البرنامج التدريبي'}
              </p>
            </div>
          </div>

          {/* المحتوى */}
          <div className="p-4 sm:p-6 md:p-8 space-y-5">
            
            {/* محتوى الفصل النهائي */}
            {isPermanentExpulsion && (
              <>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-purple-900">قرار الفصل النهائي</h3>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                      تم اتخاذ قرار إداري بفصلك نهائياً من البرنامج التدريبي. لا يمكنك الوصول للمنصة أو حضور الجلسات.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">للاستفسار</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      📞 للاستفسار عن تفاصيل القرار، يرجى التواصل مع إدارة المركز خلال مواعيد العمل الرسمية.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* محتوى الفصل المؤقت */}
            {isTemporarySuspension && (
              <>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-orange-900">قرار الفصل المؤقت</h3>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-orange-200">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-3">
                      تم اتخاذ قرار إداري بفصلك مؤقتاً من البرنامج التدريبي. لا يمكنك الوصول للمنصة أو حضور الجلسات خلال فترة الفصل.
                    </p>
                    {blockInfo?.message && (
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <p className="text-sm text-orange-800 font-medium">{blockInfo.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">إعادة التفعيل</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      سيتم إعادة تفعيل حسابك تلقائياً بعد انتهاء فترة الفصل. للاستفسار عن مدة الفصل، يرجى التواصل مع إدارة المركز.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {refreshing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>🔄 التحقق من انتهاء الفصل</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* محتوى عدم السداد (الكود الأصلي) */}
            {isPaymentBlock && (
              <>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-red-900">سبب الإيقاف</h3>
                  </div>
              
              <div className="space-y-3">
                {overduePayments.map((payment) => (
                  <div key={payment.feeId} className="bg-white rounded-xl p-4 border border-red-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">💰</span>
                        <div className="min-w-0">
                          <p className="font-bold text-base sm:text-lg text-gray-900 break-words">{payment.feeName}</p>
                          <p className="text-xs sm:text-sm text-gray-600">رسوم متأخرة عن السداد</p>
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold border border-red-200 whitespace-nowrap">
                        متأخر {payment.daysOverdue} يوم
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 mb-1">المبلغ المتبقي</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-700">
                          {payment.remainingAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-red-600">جنيه</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">كان الموعد في</p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">
                          {new Date(payment.deadline).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(payment.deadline).getFullYear()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* إجمالي */}
                {overduePayments.length > 1 && (
                  <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-bold">إجمالي المتأخر:</span>
                      <div className="text-right">
                        <span className="text-2xl sm:text-3xl font-black block">
                          {totalOverdue.toLocaleString()}
                        </span>
                        <span className="text-xs sm:text-sm">جنيه مصري</span>
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                </div>

                {/* خطوات إعادة التفعيل */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">خطوات إعادة التفعيل</h3>
              </div>
              
              <ol className="space-y-3">
                <li className="flex gap-3 bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">قم بسداد الرسوم في المركز</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">توجه إلى المركز وقم بالسداد</p>
                  </div>
                </li>
                
                <li className="flex gap-3 bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">احتفظ بإيصال الدفع</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">الإيصال دليلك على السداد</p>
                  </div>
                </li>
                
                <li className="flex gap-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900">التفعيل تلقائياً</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">سيتم التفعيل بعد تسجيل الدفع (خلال دقائق)</p>
                  </div>
                </li>
                  </ol>
                </div>

                {/* معلومات المركز */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <BuildingLibraryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">مركز التدريب</h3>
              </div>

              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3">
                  📍 توجه إلى مركز التدريب خلال مواعيد العمل الرسمية للقيام بعملية السداد.
                  فريقنا جاهز لمساعدتك.
                </p>
                
                <div className="pt-3 border-t border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CalendarIcon className="w-4 h-4" />
                    <p className="text-xs sm:text-sm font-bold">السبت - الخميس (9 ص - 5 م)</p>
                  </div>
                </div>
                  </div>
                </div>

                {/* زر طلب تأجيل موعد السداد */}
                <button
                  onClick={() => setShowPostponeModal(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>📅 طلب تأجيل موعد السداد</span>
                </button>

                {/* زر تحديث */}
                <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>🔄 تحديث حالة الحساب</span>
                </>
                  )}
                </button>

                {/* ملاحظة */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-amber-800 text-center leading-relaxed">
                    💡 بعد السداد، انتظر دقائق قليلة ثم اضغط &quot;تحديث حالة الحساب&quot;
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* رسالة تشجيعية */}
        <div className="mt-4 sm:mt-6 text-center">
          <div className="inline-block bg-white/90 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg">
            <p className="text-gray-800 font-bold text-xs sm:text-sm">
              <span className="text-lg sm:text-xl mr-1">🌟</span>
              نحن بانتظار عودتك!
              <span className="text-lg sm:text-xl ml-1">✨</span>
            </p>
          </div>
        </div>
      </div>

      {/* Modal طلب تأجيل موعد السداد */}
      {showPostponeModal && isPaymentBlock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ClockIcon className="w-7 h-7" />
                📅 طلب تأجيل موعد السداد
              </h2>
              <p className="text-blue-100 text-sm mt-2">
                قدم طلب لتأجيل موعد سداد الرسوم المتأخرة
              </p>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitPostpone} className="p-6 space-y-5">
              {/* اختيار الرسم */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اختر الرسم المتأخر <span className="text-red-500">*</span>
                </label>
                <select
                  value={postponeData.feeId}
                  onChange={(e) => setPostponeData({ ...postponeData, feeId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                >
                  <option value="">اختر رسم...</option>
                  {overduePayments.map((payment) => (
                    <option key={payment.feeId} value={payment.feeId}>
                      {payment.feeName} - {payment.remainingAmount.toLocaleString()} جنيه
                    </option>
                  ))}
                </select>
              </div>

              {/* عدد أيام التأجيل */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  عدد أيام التأجيل المطلوبة <span className="text-red-500">*</span>
                </label>
                <select
                  value={postponeData.requestedExtensionDays}
                  onChange={(e) => setPostponeData({ ...postponeData, requestedExtensionDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                >
                  <option value={7}>7 أيام (أسبوع)</option>
                  <option value={14}>14 يوم (أسبوعين)</option>
                  <option value={21}>21 يوم (3 أسابيع)</option>
                  <option value={30}>30 يوم (شهر)</option>
                  <option value={45}>45 يوم (شهر ونصف)</option>
                  <option value={60}>60 يوم (شهرين)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  📌 اختر المدة المناسبة لإتمام السداد
                </p>
              </div>

              {/* سبب التأجيل */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  سبب طلب التأجيل <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={postponeData.reason}
                  onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
                  rows={4}
                  placeholder="اشرح سبب طلب تأجيل موعد السداد..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 كن واضحاً في توضيح سببك لزيادة فرص الموافقة
                </p>
              </div>

              {/* ملاحظة مهمة */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 leading-relaxed">
                  ⚠️ <strong>ملاحظة:</strong> سيتم مراجعة طلبك من قبل الإدارة. 
                  في حال الموافقة، ستتمكن من الوصول للمنصة حتى الموعد الجديد المحدد.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostponeModal(false);
                    setPostponeData({ feeId: '', reason: '', requestedExtensionDays: 7 });
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  disabled={submittingPostpone}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPostpone}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingPostpone ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>إرسال الطلب</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}