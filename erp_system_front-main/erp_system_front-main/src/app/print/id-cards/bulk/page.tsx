'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';
import { IdCardDesign, calculateCreditCardScale } from '@/types/id-card-design';
import IdCardPreview from '@/components/id-card-designer/IdCardPreview';
import { Button } from '@/app/components/ui/Button';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
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
  design?: IdCardDesign; // التصميم المخصص لهذا المتدرب
}

interface SystemSettings {
  centerName: string;
  centerLogo: string;
}

export default function BulkIdCardPrintPage() {
  const searchParams = useSearchParams();
  const traineeIdsParam = searchParams.get('traineeIds');
  const designId = searchParams.get('designId');

  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [defaultDesign, setDefaultDesign] = useState<IdCardDesign | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!traineeIdsParam) return;
      
      setIsLoading(true);
      try {
        const traineeIds = traineeIdsParam.split(',').map(id => parseInt(id));
        
        const settingsResponse = await fetchAPI('/settings');

        // جلب بيانات المتدربين
        const traineePromises = traineeIds.map(id => fetchAPI(`/trainees/${id}`));
        const traineeResponses = await Promise.all(traineePromises);

        // تحميل التصميم المناسب لكل متدرب
        const traineesWithDesigns = await Promise.all(
          traineeResponses.map(async (trainee: Trainee) => {
            try {
              let design;
              if (designId) {
                // إذا تم تحديد تصميم معين، استخدمه لجميع المتدربين
                design = await idCardDesignsAPI.getById(designId);
              } else {
                // تحميل التصميم المناسب لكل متدرب حسب برنامجه
                design = await idCardDesignsAPI.getDesignForTrainee(trainee.id);
              }
              return { ...trainee, design };
            } catch (error) {
              console.error(`Error loading design for trainee ${trainee.id}:`, error);
              // في حالة فشل تحميل التصميم، سنحدد التصميم لاحقاً
              return trainee;
            }
          })
        );

        // تحميل التصميم الافتراضي للمتدربين الذين لم يتم تحميل تصميمهم
        const defaultDesignResponse = await idCardDesignsAPI.getDefault();
        
        setSettings(settingsResponse.settings);
        setDefaultDesign(defaultDesignResponse);
        setTrainees(traineesWithDesigns);

        // توليد QR Codes لجميع المتدربين
        const qrCodePromises = traineeResponses.map(async (trainee: Trainee) => {
          if (trainee.nationalId) {
            try {
              const qrDataURL = await QRCode.toDataURL(trainee.nationalId, {
                width: 200,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
              });
              return { id: trainee.id, qrCode: qrDataURL };
            } catch (error) {
              console.error(`Error generating QR for trainee ${trainee.id}:`, error);
              return { id: trainee.id, qrCode: null };
            }
          }
          return { id: trainee.id, qrCode: null };
        });

        const qrResults = await Promise.all(qrCodePromises);
        const qrCodesMap: Record<number, string> = {};
        qrResults.forEach(result => {
          if (result.qrCode) {
            qrCodesMap[result.id] = result.qrCode;
          }
        });
        setQrCodes(qrCodesMap);

        // طباعة تلقائية بعد تحميل البيانات
        setTimeout(() => {
          window.print();
        }, 2000);

      } catch (error) {
        console.error('Error fetching bulk print data:', error);
        toast.error('فشل في تحميل بيانات الطباعة الجماعية');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [traineeIdsParam, designId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الكارنيهات للطباعة...</p>
        </div>
      </div>
    );
  }

  if (!settings || trainees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-red-600">تعذر تحميل بيانات الكارنيهات.</p>
      </div>
    );
  }

  // الحصول على التصميم المرجعي لحساب الأبعاد (أول تصميم متاح أو الافتراضي)
  const referenceDesign = trainees.find(t => t.design)?.design || defaultDesign;
  
  // حساب scale المناسب حسب حجم التصميم المحفوظ
  const cardScale = referenceDesign ? calculateCreditCardScale(referenceDesign.width) : 1.0;

  // حساب عدد الكارنيهات في الصفحة حسب حجم التصميم
  const designWidth = referenceDesign?.width || 323;
  const designHeight = referenceDesign?.height || 204;
  
  // حساب عدد الكارنيهات المناسب للصفحة A4 (190mm x 277mm مساحة فعلية)
  const pageWidthMM = 190;
  const pageHeightMM = 277;
  const cardWidthMM = designWidth * 0.264583; // تحويل من بكسل إلى مم
  const cardHeightMM = designHeight * 0.264583;
  
  const cardsPerRow = Math.floor(pageWidthMM / (cardWidthMM + 5)); // +5mm للهامش
  const rowsPerPage = Math.floor(pageHeightMM / (cardHeightMM + 5)); // +5mm للهامش
  const cardsPerPage = Math.max(1, cardsPerRow * rowsPerPage);

  // تقسيم المتدربين إلى مجموعات حسب العدد المحسوب
  const traineePages = [];
  for (let i = 0; i < trainees.length; i += cardsPerPage) {
    traineePages.push(trainees.slice(i, i + cardsPerPage));
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
            background: white;
            padding: 20px;
          }
          
          .page-break {
            margin: 40px 0;
            border-top: 2px dashed #ccc;
            padding-top: 40px;
          }
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-cards, .print-cards * {
            visibility: visible;
          }
          
          .container {
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .page-break {
            page-break-before: always;
            margin: 0;
            padding: 0;
          }
          
          .page-content {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 10mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(var(--cards-per-row), 1fr);
            grid-template-rows: repeat(var(--rows-per-page), 1fr);
            gap: 5mm;
            width: 190mm;
            height: 277mm;
            justify-content: center;
            align-content: center;
            margin: 0 auto;
          }
          
          .card-container {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow: visible !important;
            box-sizing: border-box !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
        }
        
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(var(--cards-per-row), 1fr);
          grid-template-rows: repeat(var(--rows-per-page), 1fr);
          gap: 20px;
          min-height: 800px;
          width: 100%;
        }
        
        .card-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>

      <div className="container">
        {/* أزرار التحكم - لا تُطبع */}
        <div className="no-print bg-white shadow-sm border-b p-4 mb-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">طباعة جماعية للكارنيهات</h1>
              <p className="text-sm text-gray-600">
                {trainees.length} كارنيه في {traineePages.length} صفحة
              </p>
              <p className="text-xs text-gray-500">
                أبعاد الكارنيه: {referenceDesign?.width || 323} × {referenceDesign?.height || 204} بكسل (مقياس: {(cardScale * 100).toFixed(0)}%)
              </p>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => window.print()} leftIcon={<PrinterIcon className="w-4 h-4" />}>
                طباعة مرة أخرى
              </Button>
              <Button onClick={() => window.close()} variant="secondary" leftIcon={<XMarkIcon className="w-4 h-4" />}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>

        {/* صفحات الكارنيهات */}
        {traineePages.map((pageTrainees, pageIndex) => (
          <div 
            key={pageIndex} 
            className={`print-cards ${pageIndex > 0 ? 'page-break' : ''}`}
            style={{
              '--cards-per-row': cardsPerRow,
              '--rows-per-page': rowsPerPage
            } as React.CSSProperties}
          >
            <div className="page-content">
              <div className="cards-grid">
                {pageTrainees.map((trainee) => {
                  // استخدام التصميم المخصص للمتدرب أو التصميم الافتراضي
                  const traineeDesign = trainee.design || defaultDesign;
                  
                  if (!traineeDesign) {
                    return (
                      <div key={trainee.id} className="card-container">
                        <div className="bg-red-100 p-4 rounded border text-red-600 text-center">
                          <p>خطأ: لا يوجد تصميم</p>
                          <p className="text-xs">{trainee.nameAr}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={trainee.id} className="card-container">
                      <IdCardPreview
                        design={traineeDesign}
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
                        qrCodeDataUrl={qrCodes[trainee.id]}
                        scale={cardScale} // حجم محسوب يحترم أبعاد التصميم ويتناسب مع الطباعة الجماعية
                        className="shadow-none border-none"
                      />
                    </div>
                  );
                })}
                
                {/* إضافة خلايا فارغة لملء الشبكة إذا لزم الأمر */}
                {Array.from({ length: cardsPerPage - pageTrainees.length }, (_, index) => (
                  <div key={`empty-${index}`} className="card-container">
                    {/* خلية فارغة */}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* معلومات إضافية - لا تُطبع */}
        <div className="no-print bg-gray-50 border-t p-4 mt-6">
          <div className="max-w-4xl mx-auto text-center text-sm text-gray-600">
            <p>💡 تلميح: كل صفحة A4 تحتوي على {cardsPerPage} كارنيه ({cardsPerRow} عرضي × {rowsPerPage} طولي)</p>
            <p className="mt-1">إجمالي الكارنيهات: {trainees.length} | عدد الصفحات: {traineePages.length}</p>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <p>أبعاد الكارنيه: {referenceDesign?.width || 323} × {referenceDesign?.height || 204} بكسل ({cardWidthMM.toFixed(1)} × {cardHeightMM.toFixed(1)} مم)</p>
              <p>مقياس الطباعة: {(cardScale * 100).toFixed(0)}% - محسوب تلقائياً حسب أبعاد التصميم</p>
              <p>ملاحظة: كل متدرب يحصل على التصميم المناسب لبرنامجه التدريبي</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
