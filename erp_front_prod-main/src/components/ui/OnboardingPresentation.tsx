'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CalendarDaysIcon,
  FingerPrintIcon,
  ChartBarIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface OnboardingPresentationProps {
  onComplete: () => void;
}

// ============ Animated Background Particles ============
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 animate-float"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            background: `hsl(${210 + Math.random() * 40}, 80%, ${70 + Math.random() * 20}%)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 8 + 4}s`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============ Slide 1: Welcome ============
function WelcomeSlide({ isActive }: { isActive: boolean }) {
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showVersion, setShowVersion] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowTitle(false); setShowSubtitle(false); setShowFeatures(false); setShowVersion(false);
      const t1 = setTimeout(() => setShowTitle(true), 300);
      const t2 = setTimeout(() => setShowSubtitle(true), 800);
      const t3 = setTimeout(() => setShowFeatures(true), 1300);
      const t4 = setTimeout(() => setShowVersion(true), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }
  }, [isActive]);

  const features = [
    { icon: ShieldCheckIcon, text: 'نظام متكامل وآمن', color: 'from-tiba-primary-500 to-blue-600' },
    { icon: AcademicCapIcon, text: 'إدارة شاملة للتدريب', color: 'from-tiba-secondary-500 to-emerald-600' },
    { icon: ChartBarIcon, text: 'تقارير وإحصائيات متقدمة', color: 'from-violet-500 to-purple-600' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center relative">
      {/* Big animated logo */}
      <div className={`mb-6 sm:mb-8 transition-all duration-1000 ${isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-tiba-primary-500 to-tiba-secondary-500 animate-pulse opacity-30 blur-xl" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-tiba-primary-500 via-tiba-primary-600 to-tiba-secondary-500 flex items-center justify-center shadow-2xl">
            <SparklesIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
          </div>
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-tiba-primary-400 shadow-lg" />
          </div>
          <div className="absolute inset-0 animate-spin-slow-reverse">
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-tiba-secondary-400 shadow-lg" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className={`transition-all duration-700 ${showTitle ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-2 leading-tight">
          مرحباً بك في
          <span className="block mt-1 bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-tiba-secondary-500 bg-clip-text text-transparent">
            الجيل الثاني
          </span>
        </h1>
      </div>

      {/* Subtitle */}
      <div className={`transition-all duration-700 delay-100 ${showSubtitle ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <p className="text-base sm:text-lg text-slate-500 font-medium mt-2 mb-6 sm:mb-8">
          من نظام إدارة التدريب
        </p>
      </div>

      {/* Features cards */}
      <div className={`w-full max-w-sm space-y-3 transition-all duration-700 ${showFeatures ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {features.map((f, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
              <f.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{f.text}</span>
            <CheckCircleIcon className="w-5 h-5 text-tiba-secondary-500 mr-auto flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Version badge */}
      <div className={`mt-6 sm:mt-8 transition-all duration-500 ${showVersion ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-l from-tiba-primary-50 to-tiba-secondary-50 border border-tiba-primary-200 text-tiba-primary-700 text-sm font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-tiba-secondary-500 animate-pulse" />
          الإصدار 2.0
        </span>
      </div>
    </div>
  );
}

// ============ Slide 2: Profile Photo ============
function PhotoSlide({ isActive }: { isActive: boolean }) {
  const { user, updateUserPhoto } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowContent(false);
      const t = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  // Pre-set if user already has a photo
  useEffect(() => {
    if (user?.photoUrl) {
      setPhotoPreview(user.photoUrl.startsWith('http') ? user.photoUrl : `${API_BASE_URL.replace('/api', '')}${user.photoUrl}`);
      setUploadDone(true);
    }
  }, [user?.photoUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار ملف صورة صالح'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت'); return; }

    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);

    try {
      setUploading(true);
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_BASE_URL}/users/${user.id}/profile-photo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      updateUserPhoto(result.photoUrl);
      setUploadDone(true);
      toast.success('تم تحديث الصورة بنجاح');
    } catch {
      toast.error('فشل في رفع الصورة');
      setPhotoPreview(null);
      setUploadDone(false);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);
    }
  };

  const displayName = user?.name || 'المستخدم';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center relative">
      <div className={`w-full max-w-sm transition-all duration-700 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* Icon */}
        <div className="mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <CameraIcon className="w-7 h-7 text-white" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">أضف صورتك الشخصية</h2>
        <p className="text-sm text-slate-500 mb-6">اجعل حسابك مميزاً بصورة شخصية</p>

        {/* Photo circle */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto mb-6">
          {/* Outer ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            uploadDone
              ? 'bg-gradient-to-br from-tiba-secondary-400 to-emerald-500 p-1'
              : 'bg-gradient-to-br from-tiba-primary-400 to-violet-500 p-1 animate-pulse'
          }`}>
            <div className="w-full h-full rounded-full bg-white p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="صورة" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-slate-300">{initials}</span>
                )}
              </div>
            </div>
          </div>

          {/* Upload overlay button */}
          {!uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-gradient-to-br from-tiba-primary-500 to-tiba-primary-600 flex items-center justify-center shadow-lg border-3 border-white hover:scale-110 transition-transform"
            >
              <PhotoIcon className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Uploading spinner */}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Success check */}
          {uploadDone && !uploading && (
            <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-tiba-secondary-500 flex items-center justify-center shadow-lg border-2 border-white animate-bounce-once">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 bg-gradient-to-l from-tiba-primary-600 to-violet-600 hover:from-tiba-primary-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 mb-3"
        >
          {uploading ? 'جارٍ الرفع...' : uploadDone ? 'تغيير الصورة' : 'اختيار صورة'}
        </button>

        {uploadDone && (
          <p className="text-xs text-tiba-secondary-600 font-medium flex items-center justify-center gap-1">
            <CheckCircleIcon className="w-4 h-4" />
            تم رفع الصورة بنجاح
          </p>
        )}
      </div>
    </div>
  );
}

// ============ Slide 3: Attendance System ============
function AttendanceSlide({ isActive }: { isActive: boolean }) {
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowItems(false);
      const t = setTimeout(() => setShowItems(true), 400);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  const features = [
    { icon: FingerPrintIcon, title: 'تسجيل الحضور والانصراف', desc: 'بالبصمة الرقمية والموقع الجغرافي', color: 'from-tiba-primary-500 to-blue-600' },
    { icon: CalendarDaysIcon, title: 'طلبات الإجازات', desc: 'تقديم ومتابعة طلبات الإجازة', color: 'from-amber-500 to-orange-600' },
    { icon: ClockIcon, title: 'تتبع ساعات العمل', desc: 'إحصائيات دقيقة لساعات الحضور', color: 'from-tiba-secondary-500 to-emerald-600' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center relative">
      <div className={`transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        {/* Badge */}
        <div className="mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-tiba-secondary-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <CheckCircleIcon className="w-7 h-7 text-white" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">تم تفعيل نظام الحضور</h2>
        <p className="text-sm text-slate-500 mb-6">نظام متكامل لإدارة الحضور والإجازات</p>
      </div>

      {/* Feature cards */}
      <div className="w-full max-w-sm space-y-3">
        {features.map((f, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 shadow-sm transition-all duration-500 ${
              showItems ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
            style={{ transitionDelay: `${idx * 200}ms` }}
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
              <f.icon className="w-5.5 h-5.5 text-white" />
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-bold text-slate-800">{f.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activated badge */}
      <div className={`mt-6 transition-all duration-700 delay-700 ${showItems ? 'scale-100 opacity-100' : 'scale-80 opacity-0'}`}>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tiba-secondary-50 border border-tiba-secondary-200 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tiba-secondary-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tiba-secondary-500" />
          </span>
          <span className="text-sm font-bold text-tiba-secondary-700">النظام مفعّل وجاهز</span>
        </div>
      </div>
    </div>
  );
}

// ============ Slide 4: Launch ============
function LaunchSlide({ isActive, onFinish }: { isActive: boolean; onFinish: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) { setPhase('loading'); setProgress(0); return; }

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 2;
      });
    }, 40);

    // Phase transitions
    const t1 = setTimeout(() => setPhase('ready'), 2200);
    const t2 = setTimeout(() => { setPhase('done'); onFinish(); }, 3200);

    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); };
  }, [isActive, onFinish]);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center relative">
      {/* Rocket animation */}
      <div className={`mb-8 transition-all duration-1000 ${
        phase === 'done' ? '-translate-y-20 opacity-0 scale-50' : 
        phase === 'ready' ? 'scale-110' : 'scale-100'
      }`}>
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto">
          {/* Glow */}
          <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${
            phase === 'ready' ? 'bg-tiba-secondary-400/40 scale-150' : 'bg-tiba-primary-400/20 scale-100'
          }`} />
          <div className={`relative w-full h-full rounded-3xl flex items-center justify-center transition-all duration-500 ${
            phase === 'ready'
              ? 'bg-gradient-to-br from-tiba-secondary-500 to-emerald-600 shadow-2xl shadow-tiba-secondary-500/30'
              : 'bg-gradient-to-br from-tiba-primary-500 to-indigo-600 shadow-xl'
          }`}>
            {phase === 'ready' ? (
              <CheckCircleIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-bounce-once" />
            ) : (
              <RocketLaunchIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Text */}
      <div className={`transition-all duration-700 ${phase === 'done' ? 'opacity-0' : 'opacity-100'}`}>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          {phase === 'ready' ? 'جاهز للانطلاق!' : 'جارٍ الانطلاق...'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {phase === 'ready' ? 'تم تجهيز النظام بنجاح' : 'نُجهّز لوحة التحكم الخاصة بك'}
        </p>
      </div>

      {/* Progress bar */}
      <div className={`w-full max-w-xs transition-all duration-500 ${phase === 'done' ? 'opacity-0 scale-95' : 'opacity-100'}`}>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-200 ease-out ${
              phase === 'ready' ? 'bg-gradient-to-l from-tiba-secondary-500 to-emerald-500' : 'bg-gradient-to-l from-tiba-primary-500 to-indigo-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 tabular-nums">{Math.min(progress, 100)}%</p>
      </div>
    </div>
  );
}

// ============ Main Onboarding Component ============
export default function OnboardingPresentation({ onComplete }: OnboardingPresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const totalSlides = 4; // Welcome, Photo, Attendance, Launch

  const handleFinishLaunch = useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 600);
  }, [onComplete]);

  const goNext = () => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(prev => prev + 1);
  };

  const goPrev = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const isLastContentSlide = currentSlide === totalSlides - 2; // Attendance slide
  const isLaunchSlide = currentSlide === totalSlides - 1;

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-tiba-primary-50 to-tiba-secondary-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-tiba-primary-100/40 via-transparent to-tiba-secondary-100/30" />
      <FloatingParticles />

      {/* Main container */}
      <div className="relative h-full flex flex-col">
        {/* Progress bar top */}
        {!isLaunchSlide && (
          <div className="flex-shrink-0 px-6 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 max-w-md mx-auto">
              {Array.from({ length: totalSlides - 1 }).map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      i < currentSlide ? 'w-full bg-tiba-primary-500' :
                      i === currentSlide ? 'w-1/2 bg-tiba-primary-400' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>
            {/* Skip button */}
            {currentSlide < totalSlides - 1 && (
              <div className="flex justify-end max-w-md mx-auto mt-2">
                <button
                  onClick={() => setCurrentSlide(totalSlides - 1)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium py-1 px-2"
                >
                  تخطي
                </button>
              </div>
            )}
          </div>
        )}

        {/* Slide content */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-lg mx-auto h-full">
              {/* Welcome slide */}
              <div className={`absolute inset-0 transition-all duration-500 ease-out ${
                currentSlide === 0 ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
              }`}>
                <WelcomeSlide isActive={currentSlide === 0} />
              </div>

              {/* Photo slide */}
              <div className={`absolute inset-0 transition-all duration-500 ease-out ${
                currentSlide === 1 ? 'translate-x-0 opacity-100' :
                currentSlide < 1 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'
              }`}>
                <PhotoSlide isActive={currentSlide === 1} />
              </div>

              {/* Attendance slide */}
              <div className={`absolute inset-0 transition-all duration-500 ease-out ${
                currentSlide === 2 ? 'translate-x-0 opacity-100' :
                currentSlide < 2 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'
              }`}>
                <AttendanceSlide isActive={currentSlide === 2} />
              </div>

              {/* Launch slide */}
              <div className={`absolute inset-0 transition-all duration-500 ease-out ${
                currentSlide === 3 ? 'translate-x-0 opacity-100' :
                currentSlide < 3 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'
              }`}>
                <LaunchSlide isActive={currentSlide === 3} onFinish={handleFinishLaunch} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom navigation */}
        {!isLaunchSlide && (
          <div className="flex-shrink-0 px-6 pb-6 sm:pb-8">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {/* Back button */}
              <button
                onClick={goPrev}
                disabled={currentSlide === 0}
                className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  currentSlide === 0
                    ? 'opacity-0 pointer-events-none'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowRightIcon className="w-4 h-4" />
                السابق
              </button>

              {/* Dots indicator */}
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSlides - 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === currentSlide ? 'w-6 h-2.5 bg-tiba-primary-500' : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Next / Finish button */}
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-tiba-primary-600 to-tiba-primary-500 hover:from-tiba-primary-700 hover:to-tiba-primary-600 shadow-lg shadow-tiba-primary-500/25 transition-all active:scale-[0.97]"
              >
                {isLastContentSlide ? 'انطلق!' : 'التالي'}
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
