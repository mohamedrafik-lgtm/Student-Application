'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  FolderOpenIcon,
  PrinterIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface CreatedTraineeInfo {
  id: number;
  nameAr: string;
  nationalId: string;
  platformAccountCreated: boolean;
}

interface TraineeCreatedOverlayProps {
  trainee: CreatedTraineeInfo;
  onClose: () => void;
}

export default function TraineeCreatedOverlay({ trainee, onClose }: TraineeCreatedOverlayProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.open(`/print/application-form/${trainee.id}`, '_blank');
  };

  const handleArchive = () => {
    router.push(`/dashboard/trainees/${trainee.id}/archive`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trainee.nationalId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto p-4 sm:p-6 tco-backdrop"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainee-created-title"
    >
      <style jsx global>{`
        @keyframes tco-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tco-pop {
          0% { opacity: 0; transform: translateY(28px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tco-rise {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tco-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes tco-ring {
          0% { transform: scale(0.75); opacity: 0.55; }
          80% { transform: scale(1.65); opacity: 0; }
          100% { transform: scale(1.65); opacity: 0; }
        }
        @keyframes tco-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -22px, 0) scale(1.06); }
        }
        @keyframes tco-spin {
          to { transform: rotate(360deg); }
        }
        .tco-backdrop { animation: tco-fade 0.3s ease-out both; }
        .tco-card { animation: tco-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .tco-item { animation: tco-rise 0.5s ease-out both; }
        .tco-circle {
          stroke-dasharray: 176;
          stroke-dashoffset: 176;
          animation: tco-draw 0.85s ease-out 0.15s forwards;
        }
        .tco-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: tco-draw 0.55s ease-out 0.75s forwards;
        }
        .tco-ring { animation: tco-ring 2.2s ease-out 0.5s infinite; }
        .tco-ring-delay { animation-delay: 1.3s; }
        .tco-blob { animation: tco-float 10s ease-in-out infinite; }
        .tco-blob-slow { animation-duration: 14s; animation-delay: 1.5s; }
        @media (prefers-reduced-motion: reduce) {
          .tco-backdrop, .tco-card, .tco-item, .tco-circle, .tco-check, .tco-ring, .tco-blob {
            animation: none !important;
          }
          .tco-circle, .tco-check { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-tiba-primary-900 to-slate-900" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tco-blob absolute -top-24 -right-16 h-72 w-72 rounded-full bg-tiba-primary-500/30 blur-3xl" />
        <div className="tco-blob tco-blob-slow absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="tco-blob absolute top-1/3 left-1/2 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
      </div>

      {/* بطاقة النجاح */}
      <div className="tco-card relative w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <button
          type="button"
          onClick={onClose}
          aria-label="العودة إلى صفحة المتدربين"
          className="absolute left-3 top-3 z-10 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8">
          {/* علامة النجاح المتحركة */}
          <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
            <span className="tco-ring absolute inset-0 rounded-full border-2 border-emerald-400/60" />
            <span className="tco-ring tco-ring-delay absolute inset-0 rounded-full border-2 border-emerald-300/40" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
              <svg viewBox="0 0 64 64" className="h-11 w-11" fill="none">
                <circle className="tco-circle" cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                <path
                  className="tco-check"
                  d="M19 33.5 27.5 42 45 23.5"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h2 id="trainee-created-title" className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
            تمت إضافة المتدرب بنجاح
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-600">{trainee.nameAr}</p>
          <p className="mt-1 text-center text-xs text-slate-400">
            رقم الملف: <span className="font-semibold tabular-nums text-slate-500">{trainee.id}</span>
          </p>

          {/* قائمة الإنجازات */}
          <div className="mt-6 space-y-2.5">
            <div
              className="tco-item flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3"
              style={{ animationDelay: '0.35s' }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">تم إنشاء ملف المتدرب</p>
                <p className="text-[11px] text-emerald-700">البيانات والرسوم الأساسية جاهزة في النظام</p>
              </div>
            </div>

            <div
              className="tco-item rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                    trainee.platformAccountCreated ? 'bg-blue-600' : 'bg-amber-500'
                  }`}
                >
                  {trainee.platformAccountCreated ? (
                    <ShieldCheckIcon className="h-4 w-4" />
                  ) : (
                    <UserPlusIcon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-900">
                    {trainee.platformAccountCreated
                      ? 'تم إنشاء حساب على منصة المتدربين الإلكترونية'
                      : 'تعذر إنشاء حساب المنصة تلقائياً'}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {trainee.platformAccountCreated
                      ? 'يمكن للمتدرب الدخول للمنصة فوراً'
                      : 'يمكنك إنشاؤه من صفحة حسابات المنصة'}
                  </p>
                </div>
              </div>

              {trainee.platformAccountCreated && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white/70 px-2.5 py-2 text-[11px] text-slate-600">
                  <span>
                    اسم المستخدم: <span className="font-semibold tabular-nums">{trainee.nationalId}</span>
                  </span>
                  <span>
                    كلمة المرور: <span className="font-semibold tabular-nums">{trainee.nationalId}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ms-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" /> تم النسخ
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" /> نسخ
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* الأزرار */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handlePrint}
              className="tco-item inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-tiba-primary-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
              style={{ animationDelay: '0.62s' }}
            >
              <PrinterIcon className="h-4 w-4" />
              طباعة استمارة التقديم
            </button>

            <button
              type="button"
              onClick={handleArchive}
              className="tco-item inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-tiba-primary-300 hover:bg-tiba-primary-50 hover:text-tiba-primary-700"
              style={{ animationDelay: '0.72s' }}
            >
              <FolderOpenIcon className="h-4 w-4" />
              استكمال أرشيف المتدرب
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tco-item mx-auto mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            style={{ animationDelay: '0.82s' }}
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            العودة إلى صفحة المتدربين
          </button>
        </div>
      </div>
    </div>
  );
}