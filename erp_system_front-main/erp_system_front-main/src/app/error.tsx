'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // تسجيل الخطأ
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-pink-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* الأيقونة الرئيسية */}
        <div className="text-center">
          <div className="relative">
            {/* دائرة خلفية متحركة */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-r from-red-400 to-pink-500 rounded-full opacity-20 animate-pulse"></div>
            </div>
            
            {/* الرقم 500 */}
            <div className="relative z-10">
              <h1 className="text-7xl sm:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 animate-bounce">
                500
              </h1>
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <WrenchScrewdriverIcon className="w-8 h-8 text-red-500 mr-2" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              خطأ في الخادم
            </h2>
          </div>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            عذراً، حدث خطأ داخلي في الخادم.
          </p>
          
          <p className="text-sm text-gray-500">
            نحن نعمل على إصلاح هذه المشكلة. يرجى المحاولة مرة أخرى بعد قليل.
          </p>
        </div>

        {/* تفاصيل الخطأ (في وضع التطوير فقط) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              تفاصيل الخطأ (وضع التطوير):
            </h3>
            <p className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-500 mt-2">
                معرف الخطأ: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              إعادة المحاولة
            </button>
            
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              العودة للرئيسية
            </Link>
          </div>
        </div>

        {/* معلومات الحالة */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              حالة النظام
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">حالة الخادم:</span>
                <span className="text-red-600 font-medium">خطأ مؤقت</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">الوقت المقدر للإصلاح:</span>
                <span className="text-blue-600 font-medium">5-10 دقائق</span>
              </div>
            </div>
          </div>
        </div>

        {/* نصائح للمستخدم */}
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              ما يمكنك فعله:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 text-right">
              <li>• انتظر بضع دقائق ثم أعد المحاولة</li>
              <li>• تحقق من اتصالك بالإنترنت</li>
              <li>• امسح ذاكرة التخزين المؤقت للمتصفح</li>
              <li>• تواصل مع الدعم الفني إذا استمرت المشكلة</li>
            </ul>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>كود الخطأ: 500 - خطأ داخلي في الخادم</p>
          <p>الوقت: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}
