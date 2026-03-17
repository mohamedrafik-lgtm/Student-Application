'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';

const STORAGE_KEY = 'deferral_requests_enabled';

export default function DeferralRequestsSettingsPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.deferral-requests.settings', action: 'view' }}>
      <SettingsContent />
    </ProtectedPage>
  );
}

function SettingsContent() {
  const [acceptRequests, setAcceptRequests] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // تحميل من localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setAcceptRequests(stored === 'true');
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // حفظ في localStorage
      localStorage.setItem(STORAGE_KEY, String(acceptRequests));
      
      // تأخير بسيط للتأثير
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('✅ تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tiba Gradient Header */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <CogIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">إعدادات الطلبات</h1>
            <p className="text-white/70 text-sm mt-0.5">التحكم في استقبال طلبات تأجيل السداد</p>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-tiba-primary-100 flex items-center justify-center">
            <CogIcon className="w-4 h-4 text-tiba-primary-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-700">استقبال الطلبات الجديدة</h2>
            <p className="text-[11px] text-slate-400">التحكم في إمكانية إنشاء طلبات جديدة من قبل المتدربين</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          
          {/* Toggle Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setAcceptRequests(true)}
              className={`p-5 rounded-2xl border-2 transition-all ${
                acceptRequests
                  ? 'bg-emerald-50/50 border-emerald-300 shadow-md ring-2 ring-emerald-100'
                  : 'bg-white border-slate-200 hover:border-emerald-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  acceptRequests ? 'bg-emerald-600' : 'bg-slate-200'
                }`}>
                  <CheckCircleIcon className={`w-6 h-6 ${acceptRequests ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="text-right flex-1">
                  <p className={`font-bold text-lg ${acceptRequests ? 'text-emerald-800' : 'text-slate-600'}`}>
                    مفعل ✓
                  </p>
                  <p className="text-sm text-slate-500">قبول الطلبات</p>
                </div>
              </div>
              {acceptRequests && (
                <div className="bg-emerald-100 rounded-xl p-2.5 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ يمكن للمتدربين تقديم طلبات جديدة
                  </p>
                </div>
              )}
            </button>

            <button
              onClick={() => setAcceptRequests(false)}
              className={`p-5 rounded-2xl border-2 transition-all ${
                !acceptRequests
                  ? 'bg-red-50/50 border-red-300 shadow-md ring-2 ring-red-100'
                  : 'bg-white border-slate-200 hover:border-red-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  !acceptRequests ? 'bg-red-600' : 'bg-slate-200'
                }`}>
                  <XCircleIcon className={`w-6 h-6 ${!acceptRequests ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="text-right flex-1">
                  <p className={`font-bold text-lg ${!acceptRequests ? 'text-red-800' : 'text-slate-600'}`}>
                    معطل ⛔
                  </p>
                  <p className="text-sm text-slate-500">إيقاف الطلبات</p>
                </div>
              </div>
              {!acceptRequests && (
                <div className="bg-red-100 rounded-xl p-2.5 border border-red-200">
                  <p className="text-xs text-red-700 font-semibold">
                    ⚠️ لا يمكن تقديم طلبات جديدة
                  </p>
                </div>
              )}
            </button>
          </div>

          {/* Status Info */}
          <div className={`rounded-xl p-4 border ${
            acceptRequests 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            {acceptRequests ? (
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 mb-1.5 text-sm">الطلبات مفعلة</p>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                      يمكن للمتدربين إنشاء طلبات تأجيل جديدة
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                      ستصل الطلبات للمراجعة الإدارية
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                      يمكن قبول أو رفض الطلبات
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 mb-1.5 text-sm">الطلبات معطلة</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                      لا يمكن للمتدربين إنشاء طلبات جديدة
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                      سيظهر للمتدرب: "لا يمكن تقديم طلبات حالياً"
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                      الطلبات الموجودة يمكن مراجعتها
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-tiba-primary-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl hover:from-tiba-primary-700 hover:to-indigo-700 transition-all shadow-md font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/30 border-t-white"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  💾 حفظ الإعدادات
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-xl p-4">
        <p className="text-xs text-tiba-primary-800 leading-relaxed">
          <strong className="font-bold">💡 ملاحظة:</strong> عند تعطيل الطلبات، لن يتمكن المتدربون من إنشاء طلبات جديدة، 
          لكن يمكنهم مشاهدة طلباتهم السابقة. الطلبات الموجودة يمكن للإدارة مراجعتها وقبولها أو رفضها في أي وقت.
        </p>
      </div>
    </div>
  );
}