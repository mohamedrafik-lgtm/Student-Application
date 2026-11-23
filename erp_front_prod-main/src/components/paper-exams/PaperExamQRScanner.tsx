'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { FiCamera, FiRotateCw } from 'react-icons/fi';

interface PaperExamQRScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export default function PaperExamQRScanner({ onScan, isActive }: PaperExamQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const startScanning = async () => {
      try {
        setError('');
        const codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError('لم يتم العثور على كاميرا');
          return;
        }

        // استخدام الكاميرا الخلفية إن وجدت
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        ) || videoInputDevices[0];

        setIsScanning(true);

        codeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current!,
          (result, error) => {
            if (result) {
              const text = result.getText();
              console.log('✅ QR Scanned:', text);
              onScan(text);
            }
          }
        );
      } catch (err) {
        console.error('Scanner error:', err);
        setError('فشل في تشغيل الكاميرا');
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [isActive, onScan]);

  return (
    <div className="relative">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '400px' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ minHeight: '400px' }}
        />
        
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center text-white">
              <FiCamera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-bold">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center text-white">
              <p className="text-lg font-bold mb-2">❌ {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 mx-auto"
              >
                <FiRotateCw /> إعادة المحاولة
              </button>
            </div>
          </div>
        )}
        
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* مربع المسح */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-64 h-64 border-4 border-green-500 rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
                
                {/* خط المسح المتحرك */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 animate-scan"></div>
              </div>
            </div>
            
            {/* رسالة */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <div className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
                <p className="font-bold">قرّب الكاميرا من QR Code</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}