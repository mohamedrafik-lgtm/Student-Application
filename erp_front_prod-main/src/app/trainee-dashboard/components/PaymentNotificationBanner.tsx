'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BellAlertIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { UpcomingPaymentInfo } from '@/types/payment-status';

interface PaymentNotificationBannerProps {
  upcomingPayments?: UpcomingPaymentInfo[];
  overduePayments?: any[];
}

export default function PaymentNotificationBanner({ 
  upcomingPayments = [], 
  overduePayments = [] 
}: PaymentNotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

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
    <div className={`rounded-2xl border-2 p-6 shadow-xl transition-all duration-300 ${
      isCritical
        ? 'bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border-red-300 animate-pulse'
        : isUrgent
        ? 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-300'
        : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300'
    }`}>
      
      {/* الرأس */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            isCritical
              ? 'bg-gradient-to-br from-red-500 to-rose-600'
              : isUrgent
              ? 'bg-gradient-to-br from-orange-500 to-amber-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            <BellAlertIcon className={`w-7 h-7 text-white ${isCritical ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${
              isCritical
                ? 'text-red-900'
                : isUrgent
                ? 'text-orange-900'
                : 'text-blue-900'
            }`}>
              {isCritical && '🚨 '}
              {isOverdue ? 'تنبيه: رسوم متأخرة!' : isUrgent ? '⚠️ تنبيه عاجل!' : '📢 تذكير بالدفع'}
            </h3>
            <p className={`text-sm ${
              isCritical
                ? 'text-red-700'
                : isUrgent
                ? 'text-orange-700'
                : 'text-blue-700'
            }`}>
              {isOverdue 
                ? 'لديك رسوم متأخرة - يرجى السداد فوراً'
                : 'لديك رسوم مستحقة قريبة من موعد الدفع'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      
      {/* معلومات الرسوم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* الرسوم */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DocumentIcon className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-600 font-medium">الرسوم المطلوبة</p>
          </div>
          <p className="font-bold text-lg text-gray-900 truncate">{payment.feeName}</p>
        </div>
        
        {/* المبلغ */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-600 font-medium">المبلغ المتبقي</p>
          </div>
          <p className={`font-bold text-2xl ${
            isCritical ? 'text-red-600' : 'text-gray-900'
          }`}>
            {payment.remainingAmount.toLocaleString()} ج.م
          </p>
        </div>
        
        {/* الموعد */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-600 font-medium">الموعد النهائي</p>
          </div>
          <p className="font-medium text-gray-900">
            {new Date(payment.finalDeadline || payment.deadline).toLocaleDateString('ar-EG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
        
        {/* الوقت المتبقي */}
        <div className={`rounded-xl p-4 border shadow-sm ${
          isCritical
            ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300'
            : isUrgent
            ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300'
            : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className={`w-4 h-4 ${
              isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
            }`} />
            <p className={`text-xs font-medium ${
              isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
            }`}>
              {isOverdue ? 'متأخر' : 'متبقي'}
            </p>
          </div>
          <p className={`font-bold text-2xl ${
            isCritical ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-blue-700'
          }`}>
            {Math.abs(daysCount)} يوم
          </p>
        </div>
      </div>

      {/* رسائل تحذيرية */}
      {isCritical && (
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-800 leading-relaxed">
              <p className="font-bold mb-2">⚠️ تحذير عاجل!</p>
              {isOverdue ? (
                <p>
                  تجاوزت الموعد النهائي للسداد بـ <strong>{daysCount} يوم</strong>. 
                  قد يتم تطبيق إجراءات تقييدية على حسابك قريباً إذا لم يتم السداد.
                </p>
              ) : (
                <p>
                  لم يتبق سوى <strong>{daysCount} يوم</strong> على الموعد النهائي! 
                  يرجى الإسراع بالسداد لتجنب أي إجراءات تقييدية.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* معلومات إضافية */}
      {allPayments.length > 1 && (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700">
            <InformationCircleIcon className="w-5 h-5" />
            <p className="text-sm font-medium">
              لديك أيضاً {allPayments.length - 1} رسوم أخرى. 
              <Link href="/trainee-dashboard/payments" className="text-blue-600 hover:text-blue-700 underline mr-1">
                عرض الكل
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* زر الانتقال للمدفوعات */}
      <Link
        href="/trainee-dashboard/payments"
        className={`block w-full text-center py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all ${
          isCritical
            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
            : isUrgent
            ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5" />
          💳 عرض التفاصيل الكاملة والدفع
        </div>
      </Link>
    </div>
  );
}

// أيقونة Document بسيطة
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}