'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CheckCircleIcon, XCircleIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface ZXingQRScannerProps {
  onScan: (nationalId: string) => void;
  isActive?: boolean;
  className?: string;
}

export default function ZXingQRScanner({ onScan, isActive = true, className = '' }: ZXingQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isActive, facingMode]);

  const startScanner = async () => {
    if (isScanning || !videoRef.current) return;

    try {
      setError(null);
      console.log('🎥 Starting camera...');

      // طلب الوصول للكاميرا
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log('✅ Camera opened:', stream.getVideoTracks()[0].label);

      // ربط stream بالفيديو
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Play (dev mode):', e.name));
        
        // انتظار جهوزية الفيديو
        await new Promise(resolve => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            resolve(true);
          } else {
            videoRef.current?.addEventListener('loadeddata', () => resolve(true), { once: true });
          }
        });
        
        console.log('▶️ Video ready:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
      }

      setIsScanning(true);

      // بدء المسح المستمر بـ requestAnimationFrame
      scanLoop();

      console.log('✅ Scanner started!');
    } catch (err: any) {
      console.error('❌ Error:', err);
      let errorMsg = 'فشل في تشغيل الكاميرا';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'تم رفض الوصول للكاميرا';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'لم يتم العثور على كاميرا';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'الكاميرا قيد الاستخدام';
      }
      
      setError(errorMsg);
      setIsScanning(false);
    }
  };

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      // تعيين حجم canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // رسم الفيديو على canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // الحصول على بيانات الصورة
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // مسح QR code بـ jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        console.log('🔍 QR detected:', code.data);
        handleScanSuccess(code.data);
      }
    }

    // استمرار المسح
    animationRef.current = requestAnimationFrame(scanLoop);
  };

  const stopScanner = () => {
    console.log('⏹️ Stopping scanner...');
    
    // إيقاف animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // إيقاف stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // تنظيف
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
    
    setIsScanning(false);
  };

  const toggleCamera = async () => {
    console.log('🔄 Switching camera...');
    stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    // سيتم إعادة تشغيل الكاميرا تلقائياً بواسطة useEffect
  };

  const handleScanSuccess = (decodedText: string) => {
    // منع التكرار
    if (cooldownRef.current || decodedText === lastScanned) {
      return;
    }

    // التحقق من الرقم القومي (14 رقم)
    if (!/^\d{14}$/.test(decodedText)) {
      console.log('❌ Invalid:', decodedText);
      setScanStatus('error');
      playErrorSound();
      setTimeout(() => setScanStatus('idle'), 1000);
      return;
    }

    console.log('✅ Valid QR:', decodedText);
    
    // cooldown 3 ثوانٍ
    cooldownRef.current = setTimeout(() => {
      cooldownRef.current = null;
      setLastScanned(null);
      setScanStatus('idle');
    }, 3000);

    setLastScanned(decodedText);
    setScanStatus('success');
    playSuccessSound();
    
    console.log('📤 Sending:', decodedText);
    onScan(decodedText);
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      osc1.frequency.value = 587.33;
      osc2.frequency.value = 783.99;
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      osc1.start(audioContext.currentTime);
      osc2.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.15);
    } catch (err) {
      console.warn('Sound error');
    }
  };

  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 220;
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.warn('Sound error');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* الكاميرا */}
      <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-black mx-auto shadow-xl sm:shadow-2xl border-2 sm:border-4 border-blue-500">
        <video 
          ref={videoRef}
          className="w-full"
          style={{ 
            minHeight: '50vh',
            maxHeight: '70vh',
            objectFit: 'cover',
            display: 'block'
          }}
          playsInline
          autoPlay
          muted
        />
        
        {/* Canvas مخفي للمسح */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* رسالة التحميل */}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
            <div className="text-center px-4">
              <VideoCameraIcon className="w-12 h-12 sm:w-20 sm:h-20 text-blue-500 mx-auto mb-3 sm:mb-4 animate-pulse" />
              <p className="text-white text-base sm:text-xl font-bold">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}

        {/* حالة المسح */}
        {isScanning && (
          <>
            {/* زر تبديل الكاميرا */}
            <button
              onClick={toggleCamera}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl shadow-2xl border-2 border-white transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 sm:gap-2"
              title="تبديل الكاميرا"
            >
              <svg 
                className="w-5 h-5 sm:w-6 sm:h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span className="text-xs sm:text-sm font-bold whitespace-nowrap hidden sm:inline">
                تبديل الكاميرا
              </span>
            </button>

            <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-20 px-2 w-[calc(100%-1rem)] sm:w-auto">
              <div className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full shadow-xl sm:shadow-2xl transition-all duration-300 ${
                scanStatus === 'success' 
                  ? 'bg-green-500 text-white scale-105 sm:scale-110' 
                  : scanStatus === 'error'
                  ? 'bg-red-500 text-white scale-105 sm:scale-110'
                  : 'bg-blue-500 text-white'
              }`}>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {scanStatus === 'success' ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-base">تم المسح بنجاح! ✓</span>
                    </>
                  ) : scanStatus === 'error' ? (
                    <>
                      <XCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-base">رمز غير صالح ✗</span>
                    </>
                  ) : (
                    <>
                      <VideoCameraIcon className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-base">جاري المسح...</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* مربع المسح */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="qr-box"></div>
            </div>
            
            {/* نصيحة */}
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-20 px-3 sm:px-4 w-[calc(100%-1.5rem)] sm:max-w-md">
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl text-xs sm:text-base text-center font-bold">
                💡 قرّب الكاميرا واثبت يدك
              </div>
            </div>
          </>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-30">
            <div className="text-center px-4 sm:px-6 py-6 sm:py-8 max-w-sm sm:max-w-md">
              <XCircleIcon className="w-16 h-16 sm:w-24 sm:h-24 text-red-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-white text-lg sm:text-2xl font-bold mb-2 sm:mb-3">⚠️ خطأ</p>
              <p className="text-gray-300 text-sm sm:text-lg mb-4 sm:mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startScanner();
                }}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors font-bold text-base sm:text-lg shadow-lg"
              >
                🔄 إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* تعليمات */}
      <div className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 sm:border-2 sm:border-blue-300 rounded-lg sm:rounded-xl shadow-sm sm:shadow-md">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-600 rounded-md sm:rounded-lg flex-shrink-0">
              <VideoCameraIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-lg">📱 كيفية الاستخدام</p>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-blue-800">
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  <span>ضع QR في المربع الأخضر</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  <span>قرّب (15-20 سم)</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  <span>اثبت اليد</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 sm:border-2 sm:border-green-300 rounded-lg sm:rounded-xl shadow-sm sm:shadow-md">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-600 rounded-md sm:rounded-lg flex-shrink-0">
              <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-green-900 mb-1 sm:mb-2 text-sm sm:text-lg">💡 نصائح</p>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-green-800">
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                  <span>إضاءة جيدة = مسح أسرع</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                  <span>QR واضح وغير مشوش</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                  <span>المسح تلقائي فوري</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .qr-box {
          width: min(70vw, 240px);
          height: min(70vw, 240px);
          border: 3px solid #10b981;
          border-radius: 16px;
          box-shadow: 
            0 0 0 9999px rgba(0, 0, 0, 0.5),
            inset 0 0 30px rgba(16, 185, 129, 0.4),
            0 0 50px rgba(16, 185, 129, 0.7);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            border-color: #10b981;
            transform: scale(1);
          }
          50% {
            border-color: #34d399;
            transform: scale(1.02);
          }
        }

        @media (min-width: 640px) {
          .qr-box {
            width: 300px;
            height: 300px;
            border: 4px solid #10b981;
            border-radius: 20px;
          }
        }

        @media (min-width: 768px) {
          .qr-box {
            width: 320px;
            height: 320px;
            border-radius: 24px;
          }
        }
      `}</style>
    </div>
  );
}