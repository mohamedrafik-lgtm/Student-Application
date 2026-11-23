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

export default function SimpleIdCardPrintPage() {
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
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, trainee, idCardDesign, settings]);

  if (isLoading || !trainee || !idCardDesign || !settings) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'white',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: Arial, sans-serif;
        }
        
        html, body {
          width: 100%;
          height: 100%;
        }
        
        @media screen {
          .container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: white;
            padding: 20px;
          }
          
          .print-area {
            /* أبعاد ديناميكية حسب التصميم المحفوظ */
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
        }
        
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
            /* أبعاد ديناميكية حسب التصميم المحفوظ */
          }
          
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <div className="container">
        {/* تلميح للمستخدم - فقط على الشاشة */}
        <div className="no-print" style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '13px',
          zIndex: 1000,
          maxWidth: '300px',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎯 حجم الكريديت كارد الدقيق</div>
          💳 ضع كريديت كارد على الشاشة للمقارنة<br/>
          📏 الأبعاد: 323×204 بكسل (85.60×53.98 مم)<br/>
          ✅ <strong>الآن الحجم دقيق للعرض والطباعة!</strong><br/>
          <div style={{ fontSize: '11px', marginTop: '5px', opacity: '0.8' }}>
            * تم إصلاح جميع مشاكل الحجم السابقة
          </div>
        </div>
        
        {/* مسطرة مرجعية - فقط على الشاشة */}
        <div className="no-print" style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'white',
          border: '2px solid #333',
          padding: '5px'
        }}>
          <div style={{ fontSize: '10px', marginBottom: '2px', textAlign: 'center' }}>مسطرة مرجعية</div>
          <div style={{ 
            width: '50mm', 
            height: '10px', 
            background: 'linear-gradient(90deg, #000 0%, #000 2mm, #fff 2mm, #fff 4mm, #000 4mm, #000 6mm, #fff 6mm, #fff 8mm, #000 8mm, #000 10mm, #fff 10mm)',
            border: '1px solid #333'
          }}></div>
          <div style={{ fontSize: '8px', textAlign: 'center' }}>50mm</div>
        </div>
        
        <div
          className="print-area"
          style={{
            // أبعاد ديناميكية حسب التصميم المحفوظ
            width: `${idCardDesign.width}px`,
            height: `${idCardDesign.height}px`,
          }}
        >
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
            // مقياس ثابت للحصول على الحجم الصحيح للكريديت كارد
            scale={idCardDesign ? calculateCreditCardScale(idCardDesign.width) : 1.0}
            className="shadow-none border-none"
          />
        </div>
      </div>
    </>
  );
}
