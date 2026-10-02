'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/api';
import { AcademicCapIcon, MagnifyingGlassPlusIcon, XMarkIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

// ============================================================
// TraineeAvatar — الصورة المصغرة الدائرية للمتدرب
// ============================================================

export interface TraineeAvatarProps {
  /** رابط الصورة (نسبي من السيرفر) */
  photoUrl?: string | null;
  /** اسم المتدرب */
  name: string;
  /** الرقم القومي */
  nationalId?: string;
  /** الحجم */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** إظهار أيقونة التكبير عند التمرير */
  showZoomHint?: boolean;
  /** عند الضغط يفتح اللايت بوكس تلقائياً (إذا لم يتم تمرير onOpenPhoto) */
  enableLightbox?: boolean;
  /** callback خارجي عند الضغط على الصورة */
  onOpenPhoto?: (photoUrl: string, name: string, nationalId: string) => void;
  /** className إضافي */
  className?: string;
}

const SIZES = {
  xs: { container: 'w-8 h-8', icon: 'h-4 w-4', zoom: 'w-3 h-3' },
  sm: { container: 'w-10 h-10', icon: 'h-5 w-5', zoom: 'w-4 h-4' },
  md: { container: 'w-12 h-12', icon: 'h-6 w-6', zoom: 'w-5 h-5' },
  lg: { container: 'w-16 h-16', icon: 'h-7 w-7', zoom: 'w-5 h-5' },
  xl: { container: 'w-20 h-20', icon: 'h-8 w-8', zoom: 'w-6 h-6' },
};

const BLUR_PLACEHOLDER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Sh6Ap4dGLH9POtXRb2F5cGKMql0hXS9fIykHSfQmEGJ+h0mHjKalqpBV';

export function TraineeAvatar({
  photoUrl,
  name,
  nationalId = 'غير محدد',
  size = 'md',
  showZoomHint = true,
  enableLightbox = false,
  onOpenPhoto,
  className = '',
}: TraineeAvatarProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const s = SIZES[size];
  const hasPhoto = !!photoUrl;
  const isClickable = hasPhoto && (!!onOpenPhoto || enableLightbox);

  const handleClick = useCallback(() => {
    if (!hasPhoto) return;
    if (onOpenPhoto) {
      onOpenPhoto(photoUrl!, name, nationalId);
    } else if (enableLightbox) {
      setLightboxOpen(true);
    }
  }, [hasPhoto, photoUrl, name, nationalId, onOpenPhoto, enableLightbox]);

  return (
    <>
      <div
        className={`relative ${s.container} overflow-hidden rounded-full flex-shrink-0 ${
          isClickable ? 'cursor-pointer group ring-2 ring-transparent hover:ring-tiba-primary-400 transition-all duration-200' : ''
        } ${className}`}
        onClick={handleClick}
        title={isClickable ? 'اضغط لعرض الصورة بحجم كامل' : name}
      >
        {hasPhoto ? (
          <>
            <Image
              src={getImageUrl(photoUrl!)}
              alt={name}
              fill
              style={{ objectFit: 'cover' }}
              loading="lazy"
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
              quality={75}
              className={isClickable ? 'group-hover:scale-110 transition-transform duration-200' : ''}
            />
            {isClickable && showZoomHint && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-200">
                <MagnifyingGlassPlusIcon className={`${s.zoom} text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-tiba-primary-100 flex items-center justify-center">
            <AcademicCapIcon className={`${s.icon} text-tiba-primary-600`} />
          </div>
        )}
      </div>

      {/* لايت بوكس مدمج (فقط إذا enableLightbox) */}
      {enableLightbox && lightboxOpen && hasPhoto && (
        <TraineePhotoLightbox
          photoUrl={photoUrl!}
          name={name}
          nationalId={nationalId}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// ============================================================
// TraineePhotoLightbox — عرض الصورة بشكل جميل (ديسكتوب + هاتف)
// ============================================================

export interface TraineePhotoLightboxProps {
  /** رابط الصورة */
  photoUrl: string;
  /** اسم المتدرب */
  name: string;
  /** الرقم القومي */
  nationalId?: string;
  /** عند الإغلاق */
  onClose: () => void;
}

export function TraineePhotoLightbox({ photoUrl, name, nationalId = 'غير محدد', onClose }: TraineePhotoLightboxProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [closing, setClosing] = useState(false);

  // إغلاق بـ Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  const fullUrl = getImageUrl(photoUrl);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(fullUrl, '_blank');
    }
  }, [fullUrl, name]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ direction: 'rtl' }}
    >
      {/* خلفية معتمة */}
      <div
        className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* ===== تخطيط الهاتف: يملأ الشاشة بالكامل ===== */}
      <div className={`md:hidden fixed inset-0 z-10 flex flex-col bg-black transition-transform duration-300 ${
        closing ? 'translate-y-full' : 'translate-y-0'
      }`}>
        {/* هيدر الهاتف */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm safe-top">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base truncate">{name}</h3>
            <p className="text-white/60 text-xs">{nationalId}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors mr-3"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* الصورة - تملأ باقي المساحة */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <img
            src={fullUrl}
            alt={name}
            className={`max-w-full max-h-full object-contain transition-all duration-500 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* أزرار الهاتف */}
        <div className="flex items-center gap-3 px-4 py-4 bg-black/80 backdrop-blur-sm safe-bottom">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium text-sm transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            تحميل
          </button>
          <button
            onClick={() => window.open(fullUrl, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0A2647] hover:bg-[#1e3a52] active:bg-[#0A2647] text-white font-medium text-sm transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            فتح خارجياً
          </button>
        </div>
      </div>

      {/* ===== تخطيط الديسكتوب: بطاقة أنيقة وسط الشاشة ===== */}
      <div className={`hidden md:flex relative z-10 flex-col max-w-3xl w-full mx-6 transition-all duration-300 ${
        closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* زر الإغلاق العائم */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-20 bg-white hover:bg-slate-100 rounded-full p-2.5 shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 ring-1 ring-black/5"
        >
          <XMarkIcon className="w-5 h-5 text-slate-700" />
        </button>

        {/* البطاقة */}
        <div className="rounded-2xl shadow-2xl overflow-hidden bg-white ring-1 ring-white/20">
          {/* هيدر - معلومات المتدرب */}
          <div className="bg-gradient-to-l from-[#0A2647] to-[#143d65] px-6 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
              <AcademicCapIcon className="w-6 h-6 text-white/90" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-lg truncate">{name}</h3>
              <p className="text-white/60 text-sm font-mono tracking-wide">{nationalId}</p>
            </div>
          </div>

          {/* الصورة */}
          <div className="relative bg-slate-900/5 flex items-center justify-center" style={{ minHeight: 300, maxHeight: 'calc(80vh - 160px)' }}>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-slate-200 border-t-[#0A2647] rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">جاري تحميل الصورة...</span>
                </div>
              </div>
            )}
            <img
              src={fullUrl}
              alt={name}
              className={`max-w-full object-contain transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ maxHeight: 'calc(80vh - 160px)' }}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* أزرار */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-sm transition-all shadow-sm hover:shadow"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              تحميل الصورة
            </button>
            <button
              onClick={() => window.open(fullUrl, '_blank')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2647] hover:bg-[#1e3a52] text-white font-medium text-sm transition-all shadow-sm hover:shadow-md"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              فتح في نافذة جديدة
            </button>
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* أنماط Safe Area */}
      <style jsx global>{`
        .safe-top { padding-top: max(12px, env(safe-area-inset-top)); }
        .safe-bottom { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
}

export default TraineeAvatar;
