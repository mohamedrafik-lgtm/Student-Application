'use client';

import {
  AcademicCapIcon,
  SparklesIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

export default function TraineeLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-4 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="w-full max-w-4xl mx-auto relative z-10 text-center">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-8 border border-gray-100">
            <AcademicCapIcon className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent leading-tight py-4 mb-8">
            منصة التعلم
          </h1>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-3xl p-12 border-2 border-gray-100 shadow-2xl mb-16">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <RocketLaunchIcon className="w-12 h-12 text-white animate-bounce" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center animate-ping">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-blue-100 px-6 py-3 rounded-full mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
            </div>
            <span className="text-gray-700 font-semibold">قادم قريباً</span>
            <RocketLaunchIcon className="w-5 h-5 text-emerald-600" />
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            تجربة تعليمية استثنائية
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            نعمل بجد لتطوير منصة تعليمية متطورة ستغير طريقة تعلمك إلى الأبد
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">تقنية متطورة</h3>
              <p className="text-gray-600 text-sm">أحدث التقنيات في خدمة التعليم</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">محتوى تفاعلي</h3>
              <p className="text-gray-600 text-sm">مواد تعليمية متطورة ومحدثة</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <RocketLaunchIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">إطلاق مميز</h3>
              <p className="text-gray-600 text-sm">استعد لتجربة تعليمية رائعة</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-emerald-600 font-bold text-lg">قريباً جداً</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
            <p className="text-gray-600 text-sm">الانتظار يستحق العناء</p>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <p className="text-xs text-gray-400 font-medium">
              تم التطوير بواسطة فريق سمارت كوديكس
            </p>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </main>
  );
}