'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  nationalId: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ nationalId, size = 120, className = '' }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (!nationalId) {
        setError('الرقم القومي غير متوفر');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const qrDataURL = await QRCode.toDataURL(nationalId, {
          width: size * 2, // ضعف الحجم لجودة أعلى
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        setQrDataUrl(qrDataURL);
        setError(null);
      } catch (err) {
        console.error('خطأ في توليد QR Code:', err);
        setError('فشل في توليد الكود');
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [nationalId, size]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
      </div>
    );
  }

  if (error || !qrDataUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center p-2">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 13.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs text-gray-500">فشل في التحميل</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border-2 border-gray-200 bg-white ${className}`}>
      <img 
        src={qrDataUrl} 
        alt={`QR Code للرقم القومي: ${nationalId}`}
        style={{ width: size, height: size }}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
