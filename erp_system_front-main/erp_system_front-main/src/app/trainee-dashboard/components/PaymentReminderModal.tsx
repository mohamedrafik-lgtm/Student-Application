'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BellAlertIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { UpcomingPaymentInfo } from '@/types/payment-status';

interface PaymentReminderModalProps {
  upcomingPayments?: UpcomingPaymentInfo[];
  overduePayments?: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentReminderModal({ 
  upcomingPayments = [], 
  overduePayments = [],
  isOpen,
  onClose
}: PaymentReminderModalProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // تأخير بسيط لتفعيل الأنيميشن
      setTimeout(() => setShowAnimation(true), 100);
    } else {
      setShowAnimation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // دمج الرسوم المستحقة والمتأخرة
  const allPayments = [...upcomingPayments, ...overduePayments];
  
  if (allPayments.length === 0) return null;

  // أخذ أول رسم (الأهم)
  const payment = allPayments[0];
  const isOverdue = 'daysOverdue' in payment;
  const daysCount = isOverdue ? payment.daysOverdue : payment.daysRemaining;
  const isUrgent = !isOverdue && daysCount <= 3;
  const isCritical = isOverdue || daysCount <= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          showAnimation ? 'bg-opacity-60 backdrop-blur-sm' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all duration-500 ${
            showAnimation ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
          }`}
        >
          
          {/* الخلفية المتحركة */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl ${
              isCritical ? 'bg-red-500' : isUrgent ? 'bg-orange-500' : 'bg-blue-500'
            } animate-pulse`}></div>
            <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl ${
              isCritical ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-indigo-500'
            } animate-pulse`} style={{animationDelay: '1s'}}></div>
          </div>

          {/* زر الإغلاق */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* المحتوى */}
          <div className="relative p-8 sm:p-10">
            
            {/* الرأس */}
            <div className="text-center mb-8">
              {/* الأيقونة المتحركة */}
              <div className="relative inline-block mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
                  isCritical
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : isUrgent
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                } ${isCritical ? 'animate-bounce' : 'animate-pulse'}`}>
                  <BellAlertIcon className="w-12 h-12 text-white" />
                </div>
                
                {/* الدوائر المتحركة */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-28 h-28 border-2 rounded-full animate-ping opacity-30 ${
                    isCritical ? 'border-red-400' : isUrgent ? 'border-orange-400' : 'border-blue-400'
                  }`}></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-32 h-32 border-2 rounded-full animate-ping opacity-20 ${
                    isCritical ? 'border-red-400' : isUrgent ? 'border-orange-400' : 'border-blue-400'
                  }`} style={{animationDelay: '0.5s'}}></div>
                </div>
                
                {/* شارة الأيام */}
                <div className={`absolute -top-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                  isCritical ? 'bg-red-600' : isUrgent ? 'bg-orange-600' : 'bg-blue-600'
                }`}>
                  {Math.abs(daysCount)}
                </div>
              </div>

              {/* العنوان */}
              <h2 className={`text-3xl sm:text-4xl font-bold mb-3 ${
                isCritical
                  ? 'text-red-600'
                  : isUrgent
                  ? 'text-orange-600'
                  : 'text-blue-600'
              }`}>
                {isCritical && '🚨 '}
                {isOverdue ? 'رسوم متأخرة!' : isUrgent ? '⚠️ تنبيه عاجل!' : '📢 تذكير بالدفع'}
              </h2>
              
              <p className={`text-lg ${
                isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {isOverdue 
                  ? `تجاوزت موعد السداد بـ ${daysCount} يوم`
                  : daysCount === 1
                  ? 'آخر يوم للسداد!'
                  : `متبقي ${daysCount} يوم فقط`
                }
              </p>
            </div>

            {/* بطاقة الرسوم - تصميم جميل */}
            <div className={`relative overflow-hidden rounded-2xl border-2 p-6 mb-6 shadow-xl ${
              isCritical
                ? 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-300'
                : isUrgent
                ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-300'
                : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-300'
            }`}>
              
              {/* شريط علوي متحرك */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                isCritical
                  ? 'bg-gradient-to-r from-red-500 to-rose-500'
                  : isUrgent
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}>
                <div className="h-full bg-white opacity-40 animate-pulse"></div>
              </div>

              {/* معلومات الرسوم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* الرسوم */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCritical ? 'bg-red-100' : isUrgent ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <SparklesIcon className={`w-4 h-4 ${
                        isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">الرسوم المطلوبة</p>
                  </div>
                  <p className="font-bold text-lg text-gray-900">{payment.feeName}</p>
                </div>
                
                {/* المبلغ */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCritical ? 'bg-red-100' : isUrgent ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <CurrencyDollarIcon className={`w-4 h-4 ${
                        isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">المبلغ المتبقي</p>
                  </div>
                  <p className={`font-bold text-3xl ${
                    isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {payment.remainingAmount.toLocaleString()}
                    <span className="text-lg mr-1">ج.م</span>
                  </p>
                </div>
              </div>

              {/* التاريخ والوقت */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* الموعد النهائي */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">الموعد النهائي</p>
                  </div>
                  <p className="font-bold text-gray-900">
                    {new Date(payment.finalDeadline || payment.deadline).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                
                {/* العداد */}
                <div className={`rounded-xl p-4 border-2 ${
                  isCritical
                    ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300'
                    : isUrgent
                    ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300'
                    : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className={`w-4 h-4 ${
                      isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
                    }`} />
                    <p className={`text-xs font-medium ${
                      isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {isOverdue ? 'متأخر' : 'متبقي'}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`font-bold text-4xl ${
                      isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {Math.abs(daysCount)}
                    </p>
                    <p className={`text-lg font-medium ${
                      isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      يوم
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* رسائل تحذيرية */}
            {isCritical && (
              <div className="bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 rounded-2xl p-5 mb-6 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-red-900 mb-2 text-lg">تحذير عاجل!</p>
                    <p className="text-red-800 leading-relaxed">
                      {isOverdue ? (
                        <>
                          تجاوزت الموعد النهائي للسداد بـ <strong className="text-red-900">{daysCount} يوم</strong>. 
                          يرجى الإسراع بالسداد لتجنب تطبيق إجراءات تقييدية على حسابك.
                        </>
                      ) : (
                        <>
                          هذا هو <strong className="text-red-900">آخر يوم</strong> للسداد! 
                          يرجى الإسراع بالدفع قبل نهاية اليوم لتجنب أي إجراءات.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* معلومات إضافية */}
            {allPayments.length > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-gray-700">{allPayments.length - 1}</span>
                  </div>
                  <p className="text-sm font-medium">
                    لديك أيضاً {allPayments.length - 1} رسوم أخرى بانتظار السداد
                  </p>
                </div>
              </div>
            )}

            {/* الأزرار */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-md hover:shadow-lg"
              >
                سأتذكر لاحقاً
              </button>
              
              <Link
                href="/trainee-dashboard/payments"
                onClick={onClose}
                className={`flex-1 px-6 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-2 group ${
                  isCritical
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                    : isUrgent
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                <CurrencyDollarIcon className="w-5 h-5" />
                <span>عرض التفاصيل والدفع</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* ملاحظة سفلية */}
            <p className="text-center text-xs text-gray-500 mt-6">
              💡 يمكنك الدفع على دفعات متعددة • للاستفسار اتصل بالمركز
            </p>
          </div>

          {/* شريط زخرفي سفلي */}
          <div className={`h-2 ${
            isCritical
              ? 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500'
              : isUrgent
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500'
              : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
          }`}>
            <div className="h-full bg-white opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}