'use client';

import { DocumentTextIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function TraineeDocumentsPage() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100">
            <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
          </div>
          الوثائق والشهادات
        </h1>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mx-4 sm:mx-0">
        <div className="relative">
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 bg-slate-50/50 opacity-60">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.03'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative p-8 sm:p-12">
            <div className="text-center w-full">
              {/* Animated Icon Stack */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-8 sm:mb-10">
                {/* Background Circle with Animation */}
                <div className="absolute inset-0 bg-emerald-50 rounded-full shadow-sm animate-pulse border border-emerald-100"></div>
                
                {/* Main Icon */}
                <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-emerald-100">
                  <DocumentTextIcon className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm border border-emerald-200 animate-bounce">
                  <span className="text-emerald-700 text-sm font-black">!</span>
                </div>
              </div>
              
              {/* Main Message */}
              <div className="space-y-6 sm:space-y-8 mb-12 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-relaxed pb-2">
                  لا توجد وثائق أو شهادات متوفرة لك بعد
                </h2>
                <div className="w-16 h-1.5 bg-emerald-500 rounded-full mx-auto"></div>
                <p className="text-slate-500 text-base sm:text-lg font-bold leading-relaxed max-w-2xl mx-auto px-4">
                  لم يتم إصدار أي وثائق أو شهادات لحسابك حتى الآن. سيتم إضافة الوثائق والشهادات تلقائياً عند توفرها.
                </p>
              </div>

              {/* Information Box */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm text-right">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0">
                    <InformationCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-xl font-black text-slate-800 mb-6">معلومات مهمة</h3>
                    <div className="grid gap-4 sm:gap-5">
                      <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <p className="text-slate-600 text-sm font-bold leading-relaxed">
                          سيتم إضافة الوثائق الرسمية بعد اكتمال الإجراءات الإدارية
                        </p>
                      </div>
                      <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <p className="text-slate-600 text-sm font-bold leading-relaxed">
                          شهادات التدريب ستكون متاحة بعد إنهاء البرنامج التدريبي
                        </p>
                      </div>
                      <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <p className="text-slate-600 text-sm font-bold leading-relaxed">
                          سيتم إشعارك عبر البريد الإلكتروني عند توفر وثائق جديدة
                        </p>
                      </div>
                      <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <p className="text-slate-600 text-sm font-bold leading-relaxed">
                          يمكنك مراجعة هذه الصفحة دورياً للاطلاع على آخر المستجدات
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
