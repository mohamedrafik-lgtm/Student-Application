'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, DevicePhoneMobileIcon, ClockIcon } from '@heroicons/react/24/outline';

interface MobileAppData {
  enabled: boolean;
  googlePlayUrl: string;
  appStoreUrl: string;
  status: string;
}

interface MobileAppPromoModalProps {
  mobileApp: MobileAppData;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileAppPromoModal({ mobileApp, isOpen, onClose }: MobileAppPromoModalProps) {
  const [animateIn, setAnimateIn] = useState(false);
  const [animateContent, setAnimateContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Stagger animations
      requestAnimationFrame(() => setAnimateIn(true));
      const timer = setTimeout(() => setAnimateContent(true), 200);
      return () => clearTimeout(timer);
    }
    setAnimateIn(false);
    setAnimateContent(false);
    return undefined;
  }, [isOpen]);

  const handleClose = () => {
    setAnimateContent(false);
    setAnimateIn(false);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  const isPublished = mobileApp.status === 'published';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg mx-4 transition-all duration-500 ease-out ${
          animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Header Gradient */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 pt-10 pb-16 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute top-4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-ping" />
            <div className="absolute top-12 right-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-ping delay-500" />
            <div className="absolute bottom-8 left-1/3 w-2 h-2 bg-white/25 rounded-full animate-ping delay-1000" />

            <div className="relative text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                {isPublished ? '📱 حمّل تطبيقنا الآن!' : '🚀 التطبيق قادم قريباً!'}
              </h2>
              <p className="text-emerald-100 font-medium text-sm sm:text-base">
                {isPublished
                  ? 'تجربة أسرع وأسهل من هاتفك مباشرة'
                  : 'كن أول من يجرب التطبيق الجديد'}
              </p>
            </div>
          </div>

          {/* Phone Illustration - overlapping */}
          <div className={`flex justify-center -mt-10 transition-all duration-700 delay-200 ${
            animateContent ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}>
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-10 h-10 text-emerald-600" />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-8">
            {/* Features */}
            <div className={`space-y-3 mb-6 transition-all duration-500 delay-300 ${
              animateContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              {[
                { icon: '📅', text: 'تابع جدولك الدراسي لحظة بلحظة' },
                { icon: '✅', text: 'سجّل حضورك بسرعة وسهولة' },
                { icon: '💳', text: 'ادفع أقساطك من التطبيق مباشرة' },
                { icon: '🔔', text: 'تنبيهات فورية بكل جديد' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 transition-all duration-500`}
                  style={{ transitionDelay: `${400 + i * 100}ms` }}
                >
                  <span className="text-lg flex-shrink-0">{feature.icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Pre-registration badge */}
            {!isPublished && (
              <div className={`flex justify-center mb-5 transition-all duration-500 delay-700 ${
                animateContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  <ClockIcon className="w-4 h-4" />
                  التطبيق في مرحلة التسجيل المسبق
                </span>
              </div>
            )}

            {/* Store Buttons */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 delay-[800ms] ${
              animateContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              {mobileApp.googlePlayUrl && (
                <a
                  href={mobileApp.googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-3 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                  </svg>
                  <div className="text-right">
                    <div className="text-[10px] font-medium opacity-70 leading-none">
                      {isPublished ? 'متاح على' : 'سجّل مسبقاً على'}
                    </div>
                    <div className="text-sm font-black leading-tight">Google Play</div>
                  </div>
                </a>
              )}
              {mobileApp.appStoreUrl && (
                <a
                  href={mobileApp.appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-3 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  <div className="text-right">
                    <div className="text-[10px] font-medium opacity-70 leading-none">
                      {isPublished ? 'متاح على' : 'سجّل مسبقاً على'}
                    </div>
                    <div className="text-sm font-black leading-tight">App Store</div>
                  </div>
                </a>
              )}
            </div>

            {/* No links available */}
            {!mobileApp.googlePlayUrl && !mobileApp.appStoreUrl && (
              <p className="text-center text-sm text-slate-500 font-medium">
                {isPublished ? 'سيتم إضافة روابط التحميل قريباً' : 'سيتم الإعلان عن روابط التسجيل المسبق قريباً'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
