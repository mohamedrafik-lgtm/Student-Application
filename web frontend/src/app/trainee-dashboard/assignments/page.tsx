'use client';

import { ClipboardDocumentCheckIcon, InformationCircleIcon, PaperAirplaneIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function TraineeAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<'required' | 'submitted'>('required');

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100">
            <ClipboardDocumentCheckIcon className="w-6 h-6 text-emerald-600" />
          </div>
          المهام والتكليفات
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => setActiveTab('required')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold transition-all duration-300 ${
                activeTab === 'required'
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <ClockIcon className="w-5 h-5" />
              المهام المطلوبة
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold transition-all duration-300 ${
                activeTab === 'submitted'
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              المهام المسلمة
            </button>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'required' ? (
        /* Required Assignments */
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
                    <ClockIcon className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm border border-emerald-200 animate-bounce">
                    <span className="text-emerald-700 text-sm font-black">!</span>
                  </div>
                </div>
                
                {/* Main Message */}
                <div className="space-y-6 sm:space-y-8 mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-relaxed pb-2">
                    لا يوجد مهام مطلوبة
                  </h2>
                  <div className="w-16 h-1.5 bg-emerald-500 rounded-full mx-auto"></div>
                  <p className="text-slate-500 text-base sm:text-lg font-bold leading-relaxed max-w-2xl mx-auto px-4">
                    لم يتم تكليفك بأي مهام أو تكليفات حتى الآن. ستظهر جميع المهام المطلوبة هنا عند إضافتها من قبل المدربين.
                  </p>
                </div>

                {/* Information Box */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm text-right">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0">
                      <InformationCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <div className="flex-1 w-full">
                      <h3 className="text-xl font-black text-slate-800 mb-6">نصائح لإنجاز المهام</h3>
                      <div className="grid gap-4 sm:gap-5">
                        <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">التخطيط المسبق</h4>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                              اقرأ المهمة بعناية واكتب خطة عمل قبل البدء في التنفيذ
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">إدارة الوقت</h4>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                              قسم المهمة إلى أجزاء صغيرة واعمل عليها تدريجياً قبل الموعد النهائي
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
      ) : (
        /* Submitted Assignments */
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mx-4 sm:mx-0">
          <div className="relative">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 bg-slate-50/50 opacity-60">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.03'%3E%3Cpath d='M25 25m-20 0a20 20 0 1 1 40 0a20 20 0 1 1 -40 0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                    <PaperAirplaneIcon className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm border border-emerald-200 animate-bounce">
                    <span className="text-emerald-700 text-sm font-black">✓</span>
                  </div>
                </div>
                
                {/* Main Message */}
                <div className="space-y-6 sm:space-y-8 mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-relaxed pb-2">
                    لا يوجد مهام مسلمة
                  </h2>
                  <div className="w-16 h-1.5 bg-emerald-500 rounded-full mx-auto"></div>
                  <p className="text-slate-500 text-base sm:text-lg font-bold leading-relaxed max-w-2xl mx-auto px-4">
                    لم تقم بتسليم أي مهام حتى الآن. ستظهر هنا جميع المهام التي تم تسليمها مع حالة التصحيح والدرجات.
                  </p>
                </div>

                {/* Information Box */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm text-right">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0">
                      <InformationCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <div className="flex-1 w-full">
                      <h3 className="text-xl font-black text-slate-800 mb-6">معلومات التسليم</h3>
                      <div className="grid gap-4 sm:gap-5">
                        <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">حالة التصحيح</h4>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                              ستظهر حالة تصحيح كل مهمة (قيد المراجعة، مصححة، تحتاج تعديل)
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 transition-colors group">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform"></div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">الدرجات والملاحظات</h4>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                              ستحصل على الدرجة وملاحظات المدرب عند تصحيح المهمة
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
      )}
    </div>
  );
}
