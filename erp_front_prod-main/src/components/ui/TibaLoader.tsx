'use client';

import { useEffect, useState } from 'react';

/**
 * TibaLoader — المكوّن الموحد لشاشات التحميل في نظام تيبا
 * Beautiful, animated, responsive loading component matching the tiba design system
 *
 * @param variant - نوع التحميل: fullscreen (شاشة كاملة) | inline (داخل المحتوى) | overlay (طبقة فوقية)
 * @param type - غرض التحميل: system | data | permissions | financial | upload | processing
 * @param size - الحجم: sm | md | lg
 * @param message - رسالة التحميل
 * @param submessage - رسالة ثانوية
 * @param progress - شريط التقدم (0-100)
 * @param showTips - إظهار نصائح عشوائية
 */

interface TibaLoaderProps {
  variant?: 'fullscreen' | 'inline' | 'overlay' | 'minimal';
  type?: 'system' | 'data' | 'permissions' | 'financial' | 'upload' | 'processing';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  submessage?: string;
  progress?: number;
  showTips?: boolean;
}

const TYPE_CONFIG = {
  system: {
    gradient: 'from-tiba-primary-500 to-tiba-primary-700',
    glow: 'shadow-tiba-primary-500/30',
    bg: 'from-tiba-primary-50 via-white to-tiba-primary-50/50',
    ring: 'border-tiba-primary-500',
    ringFaded: 'border-tiba-primary-200',
    dot: 'bg-tiba-primary-500',
    dotFaded: 'bg-tiba-primary-200',
    text: 'text-tiba-primary-700',
    progressBg: 'bg-tiba-primary-100',
    progressFill: 'from-tiba-primary-500 to-tiba-primary-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    defaultMessage: 'جاري تحضير النظام',
    defaultSubmessage: 'يرجى الانتظار لحظات...',
  },
  data: {
    gradient: 'from-tiba-secondary-500 to-tiba-secondary-700',
    glow: 'shadow-tiba-secondary-500/30',
    bg: 'from-tiba-secondary-50 via-white to-tiba-secondary-50/50',
    ring: 'border-tiba-secondary-500',
    ringFaded: 'border-tiba-secondary-200',
    dot: 'bg-tiba-secondary-500',
    dotFaded: 'bg-tiba-secondary-200',
    text: 'text-tiba-secondary-700',
    progressBg: 'bg-tiba-secondary-100',
    progressFill: 'from-tiba-secondary-500 to-tiba-secondary-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7v10c0 2.21 3.79 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.79 4 8 4s8-1.79 8-4M4 7c0-2.21 3.79-4 8-4s8 1.79 8 4m0 5c0 2.21-3.79 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    defaultMessage: 'جاري تحميل البيانات',
    defaultSubmessage: 'نقوم بجلب البيانات المطلوبة...',
  },
  permissions: {
    gradient: 'from-tiba-primary-600 to-indigo-700',
    glow: 'shadow-indigo-500/30',
    bg: 'from-indigo-50 via-white to-tiba-primary-50/50',
    ring: 'border-indigo-500',
    ringFaded: 'border-indigo-200',
    dot: 'bg-indigo-500',
    dotFaded: 'bg-indigo-200',
    text: 'text-indigo-700',
    progressBg: 'bg-indigo-100',
    progressFill: 'from-indigo-500 to-tiba-primary-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    defaultMessage: 'جاري التحقق من الصلاحيات',
    defaultSubmessage: 'نتأكد من صلاحياتك للوصول...',
  },
  financial: {
    gradient: 'from-tiba-secondary-600 to-emerald-700',
    glow: 'shadow-emerald-500/30',
    bg: 'from-emerald-50 via-white to-tiba-secondary-50/50',
    ring: 'border-emerald-500',
    ringFaded: 'border-emerald-200',
    dot: 'bg-emerald-500',
    dotFaded: 'bg-emerald-200',
    text: 'text-emerald-700',
    progressBg: 'bg-emerald-100',
    progressFill: 'from-emerald-500 to-tiba-secondary-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    defaultMessage: 'جاري التحقق من الصلاحيات المالية',
    defaultSubmessage: 'نتأكد من صلاحياتك المالية...',
  },
  upload: {
    gradient: 'from-tiba-warning-500 to-orange-600',
    glow: 'shadow-orange-500/30',
    bg: 'from-orange-50 via-white to-tiba-warning-50/50',
    ring: 'border-orange-500',
    ringFaded: 'border-orange-200',
    dot: 'bg-orange-500',
    dotFaded: 'bg-orange-200',
    text: 'text-orange-700',
    progressBg: 'bg-orange-100',
    progressFill: 'from-orange-500 to-tiba-warning-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    defaultMessage: 'جاري رفع الملفات',
    defaultSubmessage: 'يتم رفع الملفات إلى الخادم...',
  },
  processing: {
    gradient: 'from-violet-500 to-purple-700',
    glow: 'shadow-violet-500/30',
    bg: 'from-violet-50 via-white to-purple-50/50',
    ring: 'border-violet-500',
    ringFaded: 'border-violet-200',
    dot: 'bg-violet-500',
    dotFaded: 'bg-violet-200',
    text: 'text-violet-700',
    progressBg: 'bg-violet-100',
    progressFill: 'from-violet-500 to-purple-600',
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    defaultMessage: 'جاري المعالجة',
    defaultSubmessage: 'نقوم بمعالجة البيانات...',
  },
};

const SIZE_CONFIG = {
  sm: { icon: 'w-8 h-8', ring: 'w-14 h-14', outer: 'w-18 h-18', text: 'text-sm', sub: 'text-xs', dot: 'w-1.5 h-1.5', gap: 'gap-3' },
  md: { icon: 'w-10 h-10', ring: 'w-20 h-20', outer: 'w-24 h-24', text: 'text-base', sub: 'text-sm', dot: 'w-2 h-2', gap: 'gap-4' },
  lg: { icon: 'w-14 h-14', ring: 'w-28 h-28', outer: 'w-32 h-32', text: 'text-lg', sub: 'text-base', dot: 'w-2.5 h-2.5', gap: 'gap-5' },
};

const TIPS = [
  'يمكنك استخدام اختصار Ctrl+K للبحث السريع',
  'يمكنك تخصيص الأعمدة المعروضة في الجداول',
  'يدعم النظام تصدير البيانات بصيغ متعددة',
  'يمكنك تعيين صلاحيات مختلفة لكل مستخدم',
  'استخدم الفلاتر لتسهيل الوصول للبيانات المطلوبة',
];

export default function TibaLoader({
  variant = 'inline',
  type = 'system',
  size = 'md',
  message,
  submessage,
  progress,
  showTips = false,
}: TibaLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => setDotCount(p => (p + 1) % 4), 500);
    const tipInterval = showTips ? setInterval(() => setTipIndex(p => (p + 1) % TIPS.length), 4000) : undefined;
    return () => {
      clearInterval(dotInterval);
      if (tipInterval) clearInterval(tipInterval);
    };
  }, [showTips]);

  const cfg = TYPE_CONFIG[type];
  const sz = SIZE_CONFIG[size];
  const displayMsg = message || cfg.defaultMessage;
  const displaySub = submessage || cfg.defaultSubmessage;
  const dots = '.'.repeat(dotCount);

  // The core animated spinner
  const Spinner = () => (
    <div className="relative flex items-center justify-center">
      {/* Ambient glow */}
      <div className={`absolute ${sz.outer} rounded-full bg-gradient-to-r ${cfg.gradient} opacity-[0.08] blur-xl animate-pulse`} />

      {/* Outer ring - slow rotation */}
      <div className={`absolute ${sz.ring} rounded-full border-2 ${cfg.ringFaded}`}>
        <div
          className={`absolute inset-0 rounded-full border-2 border-transparent ${cfg.ring} animate-spin`}
          style={{
            animationDuration: '3s',
            borderTopColor: 'currentColor',
            borderRightColor: 'currentColor',
          }}
        />
      </div>

      {/* Middle ring - counter rotation */}
      <div
        className="absolute rounded-full border-[1.5px] border-transparent animate-spin"
        style={{
          width: `calc(${sz.ring === 'w-14 h-14' ? '3.5rem' : sz.ring === 'w-20 h-20' ? '5rem' : '7rem'} - 0.75rem)`,
          height: `calc(${sz.ring === 'w-14 h-14' ? '3.5rem' : sz.ring === 'w-20 h-20' ? '5rem' : '7rem'} - 0.75rem)`,
          animationDirection: 'reverse',
          animationDuration: '2s',
          borderBottomColor: 'var(--ring-color)',
          borderLeftColor: 'var(--ring-color)',
        }}
      />

      {/* Orbiting dot */}
      <div
        className="absolute animate-spin"
        style={{
          width: sz.ring === 'w-14 h-14' ? '3.5rem' : sz.ring === 'w-20 h-20' ? '5rem' : '7rem',
          height: sz.ring === 'w-14 h-14' ? '3.5rem' : sz.ring === 'w-20 h-20' ? '5rem' : '7rem',
          animationDuration: '2s',
        }}
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${cfg.gradient} shadow-lg ${cfg.glow}`} />
      </div>

      {/* Center icon */}
      <div className={`relative ${sz.icon} rounded-2xl bg-gradient-to-br ${cfg.gradient} shadow-xl ${cfg.glow} flex items-center justify-center text-white p-2 animate-[tibaIconPulse_2s_ease-in-out_infinite]`}>
        {cfg.icon}
      </div>
    </div>
  );

  // Loading text with animated dots
  const LoadingText = () => (
    <div className={`text-center space-y-1.5 ${sz.gap}`}>
      <h3 className={`${sz.text} font-bold text-tiba-gray-800 tracking-tight`}>
        {displayMsg}<span className="inline-block w-6 text-right opacity-60">{dots}</span>
      </h3>
      <p className={`${sz.sub} text-tiba-gray-500 font-medium`}>
        {displaySub}
      </p>
    </div>
  );

  // Bouncing dots
  const BounceDots = () => (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`${sz.dot} rounded-full bg-gradient-to-r ${cfg.gradient} animate-[tibaBounce_1.4s_ease-in-out_infinite]`}
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );

  // Progress bar
  const ProgressBar = () => {
    if (progress === undefined) return null;
    const pct = Math.min(100, Math.max(0, progress));
    return (
      <div className="w-full max-w-xs mx-auto space-y-1.5">
        <div className={`h-1.5 ${cfg.progressBg} rounded-full overflow-hidden`}>
          <div
            className={`h-full bg-gradient-to-l ${cfg.progressFill} rounded-full transition-all duration-500 ease-out relative`}
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-[tibaShimmer_1.5s_infinite]" />
          </div>
        </div>
        <p className="text-xs text-tiba-gray-400 text-center font-medium">{Math.round(pct)}% مكتمل</p>
      </div>
    );
  };

  // Tip card
  const TipCard = () => {
    if (!showTips) return null;
    return (
      <div className="w-full max-w-sm mx-auto animate-[tibaFadeIn_0.5s_ease-out]" key={tipIndex}>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-tiba-primary-100 px-4 py-3 shadow-sm">
          <p className="text-xs text-tiba-gray-600 leading-relaxed text-center">
            <span className="inline-block w-4 h-4 bg-tiba-primary-100 rounded-md text-tiba-primary-600 text-[10px] font-bold leading-4 text-center ml-1.5">💡</span>
            {TIPS[tipIndex]}
          </p>
        </div>
      </div>
    );
  };

  // === VARIANT RENDERS ===

  // Minimal: just spinner + dots, no text
  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <style jsx global>{tibaLoaderStyles}</style>
        <Spinner />
        <BounceDots />
      </div>
    );
  }

  // Inline: fits inside a container/section
  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4" dir="rtl">
        <style jsx global>{tibaLoaderStyles}</style>
        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          <Spinner />
          <LoadingText />
          <BounceDots />
          <ProgressBar />
        </div>
      </div>
    );
  }

  // Overlay: covers parent container with semi-transparent backdrop
  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm" dir="rtl">
        <style jsx global>{tibaLoaderStyles}</style>
        <div className="flex flex-col items-center gap-6 max-w-sm w-full px-4 animate-[tibaFadeIn_0.3s_ease-out]">
          <Spinner />
          <LoadingText />
          <BounceDots />
          <ProgressBar />
        </div>
      </div>
    );
  }

  // Fullscreen: covers the full viewport
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${cfg.bg} overflow-hidden`} dir="rtl">
      <style jsx global>{tibaLoaderStyles}</style>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br ${cfg.gradient} opacity-[0.04] blur-3xl animate-[tibaFloat_8s_ease-in-out_infinite]`} />
        <div className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr ${cfg.gradient} opacity-[0.04] blur-3xl animate-[tibaFloat_8s_ease-in-out_infinite_2s]`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r ${cfg.gradient} opacity-[0.02] blur-[100px] animate-pulse`} />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6 animate-[tibaFadeIn_0.6s_ease-out]">
        <Spinner />
        <LoadingText />
        <BounceDots />
        <ProgressBar />
        <TipCard />

        {/* Footer branding */}
        <div className="text-center space-y-0.5 mt-4">
          <p className="text-[11px] text-tiba-gray-400 font-medium">نظام تيبا لإدارة المراكز التدريبية</p>
          <p className="text-[10px] text-tiba-gray-300">TIBA ERP v1.9.1</p>
        </div>
      </div>
    </div>
  );
}

// ===== Reusable sub-components for quick inline use =====

/** Mini spinner for buttons and small areas */
export function TibaSpinner({
  size = 'sm',
  type = 'system',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md';
  type?: keyof typeof TYPE_CONFIG;
  className?: string;
}) {
  const sizes = { xs: 'w-4 h-4', sm: 'w-5 h-5', md: 'w-6 h-6' };
  const cfg = TYPE_CONFIG[type];

  return (
    <>
      <style jsx global>{tibaLoaderStyles}</style>
      <div className={`relative ${sizes[size]} ${className}`}>
        <div className={`absolute inset-0 rounded-full border-2 ${cfg.ringFaded} border-t-transparent animate-spin`}
          style={{ animationDuration: '0.8s' }}
        />
      </div>
    </>
  );
}

/** Inline loading text with spinner */
export function TibaLoadingText({
  text = 'جاري التحميل...',
  type = 'system',
  className = '',
}: {
  text?: string;
  type?: keyof typeof TYPE_CONFIG;
  className?: string;
}) {
  const cfg = TYPE_CONFIG[type];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TibaSpinner size="sm" type={type} />
      <span className={`text-sm font-medium ${cfg.text}`}>{text}</span>
    </div>
  );
}

// ===== Keyframe animations =====
const tibaLoaderStyles = `
  @keyframes tibaBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes tibaIconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes tibaFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.95); }
  }
  @keyframes tibaFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes tibaShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;
