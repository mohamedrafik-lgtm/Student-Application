'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';
import { IdCardDesign, calculateCreditCardScale } from '@/types/id-card-design';
import IdCardPreview from '@/components/id-card-designer/IdCardPreview';
import QRCode from 'qrcode';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photoUrl?: string;
  phone?: string;
  program: {
    nameAr: string;
  };
}

interface SystemSettings {
  centerName: string;
  centerLogo?: string;
}

export default function PrintIdCardPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const traineeId = Array.isArray(id) ? id[0] : id;
  const designId = searchParams?.get('designId');

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [idCardDesign, setIdCardDesign] = useState<IdCardDesign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [traineeData, settingsData] = await Promise.all([
          fetchAPI(`/trainees/${traineeId}`),
          fetchAPI('/settings'),
        ]);

        // جلب التصميم المناسب
        let designData;
        if (designId) {
          // إذا تم تحديد تصميم معين، استخدمه
          try {
            designData = await idCardDesignsAPI.getById(designId);
          } catch (error) {
            console.error('Error fetching specific design, using appropriate design:', error);
            designData = await idCardDesignsAPI.getDesignForTrainee(parseInt(traineeId));
          }
        } else {
          // اختيار التصميم المناسب للمتدرب حسب برنامجه
          designData = await idCardDesignsAPI.getDesignForTrainee(parseInt(traineeId));
        }

        setTrainee(traineeData);
        setSettings(settingsData.settings);
        setIdCardDesign(designData);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('حدث خطأ في تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    if (traineeId) {
      fetchData();
    }
  }, [traineeId, designId]);

  // توليد QR Code
  useEffect(() => {
    if (trainee?.nationalId) {
      const generateQR = async () => {
        try {
          const qrDataURL = await QRCode.toDataURL(trainee.nationalId, {
            width: 200,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(qrDataURL);
        } catch (error) {
          console.error('خطأ في توليد QR Code:', error);
        }
      };
      generateQR();
    }
  }, [trainee]);

  // طباعة تلقائية عند تحميل الصفحة
  useEffect(() => {
    if (!isLoading && trainee && idCardDesign && settings) {
      // انتظار قليل للتأكد من تحميل جميع العناصر
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, trainee, idCardDesign, settings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الكارنيه...</p>
        </div>
      </div>
    );
  }

  if (!trainee || !idCardDesign || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">⚠️ خطأ في تحميل البيانات</p>
          <button 
            onClick={() => window.close()} 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 323px !important;
            height: 204px !important;
          }
          
          .print-area img {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        }
        
        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: Arial, sans-serif;
        }
        
        .print-only {
          background: white !important;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* شريط التحكم - لا يُطبع */}
        <div className="no-print bg-white shadow-sm border-b p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              طباعة كارنيه: {trainee.nameAr}
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                🖨️ طباعة
              </button>
              <button
                onClick={() => window.close()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                ✖️ إغلاق
              </button>
            </div>
          </div>
        </div>

        {/* منطقة الكارنيه - تُطبع */}
        <div className="flex-1 print-only">
          <div className="print-area">
            <IdCardPreview
              design={idCardDesign}
            traineeData={{
              nameAr: trainee.nameAr,
              nationalId: trainee.nationalId,
              photoUrl: trainee.photoUrl,
              program: { nameAr: trainee.program.nameAr },
              id: trainee.id // رقم المتدرب
            }}
              centerData={{
                centerName: settings.centerName,
                centerLogo: settings.centerLogo
              }}
              qrCodeDataUrl={qrCodeDataUrl || undefined}
              scale={idCardDesign ? calculateCreditCardScale(idCardDesign.width) : 1.0} // مقياس صحيح للكريديت كارد
              className="shadow-none border-none"
            />
          </div>
        </div>

        {/* معلومات إضافية - لا تُطبع */}
        <div className="no-print bg-white border-t p-4">
          <div className="max-w-4xl mx-auto text-center text-sm text-gray-600">
            <p>💡 تلميح: استخدم Ctrl+P (أو Cmd+P على Mac) للطباعة مباشرة</p>
            <p>📄 سيتم طباعة الكارنيه فقط بدون هذه العناصر الإضافية</p>
          </div>
        </div>
      </div>
    </>
  );
}
