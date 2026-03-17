'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  QrCodeIcon,
  HashtagIcon,
  ClockIcon,
  AcademicCapIcon,
  VideoCameraIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { fetchTraineeAPI } from '@/lib/trainee-api';
import { toast } from 'react-hot-toast';

type Mode = 'code' | 'camera';

export default function CheckInPage() {
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const submittingRef = useRef(false);

  // التركيز على أول خانة عند فتح الصفحة (بدون سكرول)
  useEffect(() => {
    if (mode === 'code') {
      // تأخير بسيط ثم تركيز بدون سكرول لمنع القفز للمنتصف
      setTimeout(() => {
        inputRefs.current[0]?.focus({ preventScroll: true });
      }, 100);
    }
  }, [mode]);

  // التأكد من بدء الصفحة من الأعلى
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Camera management
  useEffect(() => {
    if (mode === 'camera' && !result) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, facingMode, result]);

  const startCamera = async () => {
    if (cameraActive || !videoRef.current) {
      // retry after a short delay if video element is not ready
      if (!videoRef.current) {
        setTimeout(() => startCamera(), 100);
        return;
      }
      return;
    }

    try {
      setCameraError(null);

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});

        await new Promise<void>(resolve => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            resolve();
          } else {
            videoRef.current?.addEventListener('loadeddata', () => resolve(), { once: true });
          }
        });
      }

      setCameraActive(true);
      scanLoop();
    } catch (err: any) {
      let msg = 'فشل في تشغيل الكاميرا';
      if (err.name === 'NotAllowedError') msg = 'تم رفض الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح';
      else if (err.name === 'NotFoundError') msg = 'لم يتم العثور على كاميرا';
      else if (err.name === 'NotReadableError') msg = 'الكاميرا قيد الاستخدام من تطبيق آخر';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (qrCode && qrCode.data) {
        handleQrScan(qrCode.data);
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop);
  };

  const handleQrScan = (data: string) => {
    // prevent duplicate scans
    if (cooldownRef.current || submittingRef.current) return;

    // validate 6-digit code
    const cleaned = data.trim();
    if (!/^\d{6}$/.test(cleaned)) return;

    // cooldown
    cooldownRef.current = setTimeout(() => {
      cooldownRef.current = null;
    }, 4000);

    // play success sound
    try {
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}

    submitCode(cleaned);
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleDigitChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);
    setResult(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        submitCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (fullCode: string) => {
    if (submitting || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetchTraineeAPI('trainee-auth/verify-attendance-code', {
        method: 'POST',
        body: JSON.stringify({ code: fullCode }),
      });

      setResult(res);
      if (res.alreadyRecorded) {
        toast('تم تسجيل حضورك مسبقاً لهذه المحاضرة', { icon: 'ℹ️' });
      } else {
        toast.success('تم تسجيل حضورك بنجاح! ✅');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في التحقق من الكود');
      toast.error(err.message || 'كود غير صحيح');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const resetForm = () => {
    setCode(['', '', '', '', '', '']);
    setResult(null);
    setError(null);
    if (mode === 'code') {
      inputRefs.current[0]?.focus();
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-emerald-600 text-white pt-8 pb-16 px-4 sm:px-6 rounded-b-[2.5rem] shadow-sm">
        <div className="max-w-2xl mx-auto">
          <Link href="/trainee-dashboard" className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white text-sm mb-6 transition-colors font-medium">
            <ArrowLeftIcon className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm">
              <QrCodeIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">تسجيل الحضور</h1>
              <p className="text-emerald-100 text-sm mt-1 font-medium">أدخل كود الحضور أو امسح الكيو آر كود</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 space-y-6 relative z-10">
        {/* Warning Alert */}
        <div className="bg-white border-l-4 border-rose-500 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
            <ExclamationCircleIcon className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">تنبيه مهم</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              أي محاولة تحايل على نظام الحضور أو تسجيل حضور من خارج مكان المحاضرة <strong className="text-rose-600">لن يتم قبولها</strong> وسيتم <strong className="text-rose-600">حظر المتدرب</strong> واتخاذ الإجراءات العقابية اللازمة بحقه.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tabs */}
          {!result && (
            <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50">
              <button
                onClick={() => switchMode('code')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  mode === 'code'
                    ? 'text-emerald-700 bg-white shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <HashtagIcon className="w-5 h-5" />
                إدخال الكود
              </button>
              <button
                onClick={() => switchMode('camera')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  mode === 'camera'
                    ? 'text-emerald-700 bg-white shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <VideoCameraIcon className="w-5 h-5" />
                مسح QR Code
              </button>
            </div>
          )}

          <div className="p-4 sm:p-8">
            {!result ? (
              <>
                {/* Code Mode */}
                {mode === 'code' && (
                  <div className="max-w-sm mx-auto">
                    <div className="text-center mb-6 sm:mb-10">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-5">
                        <HashtagIcon className="w-7 h-7 sm:w-10 sm:h-10 text-emerald-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">أدخل كود الحضور</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">أدخل الكود المكون من 6 أرقام المعروض أمامك</p>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-10" dir="ltr">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleDigitChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          onPaste={i === 0 ? handlePaste : undefined}
                          onFocus={e => e.target.select()}
                          disabled={submitting}
                          className={`w-full h-12 sm:h-14 text-center text-lg sm:text-2xl font-black rounded-xl border-2 outline-none transition-all duration-200 ${
                            error
                              ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                              : digit
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                              : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10'
                          } ${submitting ? 'opacity-50' : ''}`}
                        />
                      ))}
                    </div>

                    {error && (
                      <div className="flex items-center justify-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mb-5 sm:mb-8">
                        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const fullCode = code.join('');
                        if (fullCode.length === 6) {
                          submitCode(fullCode);
                        } else {
                          setError('يرجى إدخال الكود كاملاً (6 أرقام)');
                        }
                      }}
                      disabled={submitting || code.join('').length < 6}
                      className="w-full h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>جاري التحقق...</span>
                        </>
                      ) : (
                        'تسجيل الحضور'
                      )}
                    </button>
                  </div>
                )}

              {/* Camera Mode */}
              {mode === 'camera' && (
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <VideoCameraIcon className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">مسح كيو آر كود</h2>
                    <p className="text-sm text-slate-500 mt-1">وجّه الكاميرا نحو كود الحضور</p>
                  </div>

                  {/* Camera viewport */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 mb-6 shadow-inner" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scan overlay */}
                    {cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-white/40 rounded-2xl relative">
                          <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
                          <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
                          {/* Scan line animation */}
                          <div className="absolute left-2 right-2 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" style={{ top: '50%' }} />
                        </div>
                      </div>
                    )}

                    {/* Camera toggle button */}
                    {cameraActive && (
                      <button
                        onClick={toggleCamera}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                        title="تبديل الكاميرا"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                    )}

                    {/* Loading state */}
                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80 backdrop-blur-sm">
                        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm font-medium">جاري تشغيل الكاميرا...</p>
                      </div>
                    )}

                    {/* Error state */}
                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 p-6 backdrop-blur-sm">
                        <ExclamationCircleIcon className="w-12 h-12 text-rose-500 mb-4" />
                        <p className="text-sm text-center mb-6 text-slate-200">{cameraError}</p>
                        <button
                          onClick={() => {
                            setCameraError(null);
                            startCamera();
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-semibold transition-colors"
                        >
                          إعادة المحاولة
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submitting state for camera */}
                  {submitting && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">جاري تسجيل الحضور...</span>
                    </div>
                  )}

                  {/* Error message for camera */}
                  {error && (
                    <div className="flex items-center justify-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
                      <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <p className="text-center text-sm text-slate-500">
                    وجّه الكاميرا نحو QR Code الحضور المعروض من المحاضر
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Result State */
            <div className="text-center py-8 max-w-sm mx-auto">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                result.alreadyRecorded ? 'bg-emerald-50' : 'bg-teal-50'
              }`}>
                <CheckCircleIcon className={`w-12 h-12 ${
                  result.alreadyRecorded ? 'text-emerald-600' : 'text-teal-600'
                }`} />
              </div>

              <h2 className={`text-2xl font-bold mb-3 ${
                result.alreadyRecorded ? 'text-emerald-900' : 'text-teal-900'
              }`}>
                {result.alreadyRecorded ? 'مسجل مسبقاً' : 'تم تسجيل حضورك بنجاح! ✅'}
              </h2>
              <p className="text-slate-600 mb-8">{result.message}</p>

              {result.session && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-sm space-y-3 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <AcademicCapIcon className="w-4 h-4" />
                      المادة
                    </span>
                    <span className="font-semibold text-slate-900">{result.session.content}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      الوقت
                    </span>
                    <span className="font-semibold text-slate-900" dir="ltr">
                      {result.session.startTime} - {result.session.endTime}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={resetForm}
                className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                إدخال كود آخر
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ExclamationCircleIcon className="w-5 h-5 text-emerald-600" />
          تعليمات تسجيل الحضور
        </h3>
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</span>
            <span className="leading-relaxed">احصل على كود الحضور المكون من 6 أرقام أو QR Code من المحاضر</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</span>
            <span className="leading-relaxed">أدخل الكود يدوياً أو امسح QR Code بالكاميرا</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</span>
            <span className="leading-relaxed">سيتم تسجيل حضورك تلقائياً</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">!</span>
            <span className="leading-relaxed">يجب أن تكون مدرجاً في توزيعة المحاضرة لتسجيل الحضور</span>
          </li>
        </ul>
      </div>
      </div>
    </div>
  );
}
