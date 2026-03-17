'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // تسجيل الخطأ في وحدة التحكم أو خدمة المراقبة
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg w-full space-y-8">
            {/* الأيقونة الرئيسية */}
            <div className="text-center">
              <div className="relative">
                {/* دائرة خلفية متحركة */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-red-400 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
                </div>
                
                {/* أيقونة التحذير */}
                <div className="relative z-10 flex justify-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                    <ExclamationTriangleIcon className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* المحتوى الرئيسي */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                حدث خطأ غير متوقع
              </h1>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                نعتذر، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-right">
                <p className="text-sm text-red-800 font-medium mb-2">
                  تفاصيل الخطأ:
                </p>
                <p className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                  {error.message || 'خطأ غير معروف'}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-500 mt-2">
                    معرف الخطأ: {error.digest}
                  </p>
                )}
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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

            {/* معلومات الدعم */}
            <div className="text-center">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  هل تحتاج مساعدة؟
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  إذا استمر هذا الخطأ، يرجى التواصل مع فريق الدعم الفني
                </p>
                <div className="flex justify-center space-x-reverse space-x-4">
                  <a
                    href="mailto:support@example.com"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    البريد الإلكتروني
                  </a>
                  <span className="text-gray-300">|</span>
                  <a
                    href="tel:+201234567890"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    الهاتف
                  </a>
                </div>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>تم تسجيل هذا الخطأ تلقائياً لمراجعته</p>
              <p>الوقت: {new Date().toLocaleString('ar-EG')}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
