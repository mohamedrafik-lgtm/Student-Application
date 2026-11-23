'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';
import { IdCardDesign } from '@/types/id-card-design';
import IdCardPreview from '@/components/id-card-designer/IdCardPreview';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import { 
  PrinterIcon, 
  EyeIcon, 
  ClockIcon, 
  CheckBadgeIcon,
  IdentificationIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface IdCardPrint {
  id: number;
  printedAt: string;
  printedBy: {
    name: string;
    email: string;
  };
}

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

export default function TraineeIdCardPage() {
  const { id } = useParams();
  const traineeId = Array.isArray(id) ? id[0] : id;
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [idCardDesign, setIdCardDesign] = useState<IdCardDesign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printRecords, setPrintRecords] = useState<IdCardPrint[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && traineeId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [traineeData, settingsData, printsData, designData] = await Promise.all([
            fetchAPI(`/trainees/${traineeId}`),
            fetchAPI('/settings'),
            fetchAPI(`/id-cards/trainee/${traineeId}/prints`),
            idCardDesignsAPI.getDefault()
          ]);
          
          console.log('Trainee Data:', traineeData);
          console.log('Settings Data:', settingsData);
          console.log('Prints Data:', printsData);
          console.log('Design Data:', designData);
          console.log('Design Elements:', designData?.designData?.elements);
          
          setTrainee(traineeData);
          setSettings(settingsData.settings);
          setPrintRecords(printsData);
          setIdCardDesign(designData);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('فشل في تحميل البيانات');
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isAuthenticated, traineeId]);

  // توليد QR Code عند تحميل بيانات المتدرب
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

  const handlePrint = async () => {
    if (!trainee || isPrinting) return;

    // رسالة تأكيد
    const confirmed = window.confirm(
      `هل تريد طباعة كارنيه الطالب: ${trainee.nameAr}؟\n\nسيتم تسجيل عملية الطباعة وفتح نافذة جديدة للطباعة.`
    );

    if (!confirmed) return;

    setIsPrinting(true);
    try {
      await fetchAPI('/id-cards/print', {
        method: 'POST',
        body: JSON.stringify({ 
          traineeId: trainee.id,
          designId: idCardDesign?.id 
        }),
      });
      toast.success('تم تسجيل طباعة الكارنيه بنجاح');
      
      // إعادة تحميل سجلات الطباعة
      const printsData = await fetchAPI(`/id-cards/trainee/${traineeId}/prints`);
      setPrintRecords(printsData);
      
      // فتح صفحة جديدة للطباعة
      openPrintPage();
    } catch (error) {
      console.error('Error printing ID card:', error);
      toast.error('حدث خطأ أثناء طباعة الكارنيه');
    } finally {
      setIsPrinting(false);
    }
  };

  const openPrintPage = () => {
    // إنشاء URL لصفحة الطباعة البسيطة
    const printUrl = `/print/id-card/${traineeId}/simple?designId=${idCardDesign?.id || ''}`;
    
    // فتح نافذة جديدة
    const printWindow = window.open(printUrl, '_blank', 'width=900,height=700,scrollbars=no,resizable=yes,toolbar=no,menubar=no,location=no');
    
    if (printWindow) {
      // التركيز على النافذة الجديدة
      printWindow.focus();
    } else {
      toast.error('تعذر فتح نافذة الطباعة. تأكد من السماح للنوافذ المنبثقة.');
    }
  };

  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <IdentificationIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!trainee) {
    return (
      <div className="text-center py-12">
        <IdentificationIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">لم يتم العثور على المتدرب</h2>
        <p className="text-gray-600">المتدرب المطلوب غير موجود أو تم حذفه</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
        <PageHeader
        title={`كارنيه المتدرب: ${trainee.nameAr}`}
        description="معاينة وطباعة كارنيه المتدرب"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: trainee.nameAr, href: `/dashboard/trainees/${trainee.id}` },
          { label: 'الكارنيه' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* بطاقة الكارنيه */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <IdentificationIcon className="w-5 h-5 ml-2 text-blue-600" />
                  كارنيه المتدرب
                </h3>
                <div className="flex gap-2">
                  <Link 
                    href="/dashboard/settings/id-card-designs"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Cog6ToothIcon className="w-4 h-4 ml-1" />
                    تعديل التصميم
                  </Link>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    leftIcon={<EyeIcon className="w-4 h-4" />}
                    onClick={togglePreviewMode}
                    className="shadow-sm"
                  >
                    معاينة
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    leftIcon={<PrinterIcon className="w-4 h-4" />}
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center items-center bg-gray-50 rounded-lg p-6 border border-dashed border-gray-300">
                {idCardDesign && trainee && settings ? (
                  <IdCardPreview
                    design={idCardDesign}
                    traineeData={{
                      nameAr: trainee.nameAr,
                      nationalId: trainee.nationalId,
                      photoUrl: trainee.photoUrl,
                      program: { nameAr: trainee.program.nameAr }
                    }}
                    centerData={{
                      centerName: settings.centerName,
                      centerLogo: settings.centerLogo
                    }}
                    qrCodeDataUrl={qrCodeDataUrl || undefined}
                    scale={1}
                    className="shadow-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center text-gray-500 bg-white rounded-lg border-2 border-gray-300 p-8">
                    <div className="text-center">
                      <IdentificationIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p>جاري تحميل التصميم...</p>
                    </div>
                    </div>
                  )}
              </div>

              {/* تنويه */}
              <div className="mt-4 text-sm text-gray-500 p-3 bg-blue-50 border border-blue-100 rounded-md">
                📌 يمكنك تعديل تصميم الكارنيه ومواضع العناصر من خلال 
                <Link href="/dashboard/settings/id-card-designs" className="text-blue-600 hover:underline mx-1">
                  مصمم الكارنيهات المتطور
                </Link>
                في إعدادات النظام.
              </div>
            </div>
          </Card>
        </div>

        {/* معلومات المتدرب وسجل الطباعة */}
        <div className="space-y-6">
          {/* معلومات المتدرب */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات المتدرب</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">الاسم</label>
                  <p className="text-gray-900">{trainee.nameAr}</p>
              </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">الرقم القومي</label>
                  <p className="text-gray-900 font-mono">{trainee.nationalId}</p>
                    </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">البرنامج التدريبي</label>
                  <p className="text-gray-900">{trainee.program.nameAr}</p>
                  </div>
                  {trainee.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">رقم الهاتف</label>
                    <p className="text-gray-900 font-mono">{trainee.phone}</p>
                    </div>
                  )}
                </div>
              </div>
          </Card>

          {/* سجل طباعة الكارنيه */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="w-5 h-5 ml-2 text-gray-600" />
                  سجل الطباعة
                </h3>
              
              {printRecords.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لم يتم طباعة الكارنيه بعد</p>
              ) : (
                <div className="space-y-3">
                  {printRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <CheckBadgeIcon className="w-4 h-4 text-green-600 ml-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            طُبع بواسطة {record.printedBy.name}
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(record.printedAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      </div>
                    ))}
                  
                  {printRecords.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      و {printRecords.length - 5} عملية طباعة أخرى
                    </p>
                  )}
                  </div>
                )}
            </div>
          </Card>
        </div>
            </div>

      {/* نافذة معاينة للطباعة */}
      {isPreviewMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">معاينة الكارنيه للطباعة</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={togglePreviewMode}
              >
                إغلاق
              </Button>
            </div>
            
            <div className="flex justify-center">
              {idCardDesign && trainee && settings && (
                <IdCardPreview
                  design={idCardDesign}
                  traineeData={{
                    nameAr: trainee.nameAr,
                    nationalId: trainee.nationalId,
                    photoUrl: trainee.photoUrl,
                    program: { nameAr: trainee.program.nameAr }
                  }}
                  centerData={{
                    centerName: settings.centerName,
                    centerLogo: settings.centerLogo
                  }}
                  qrCodeDataUrl={qrCodeDataUrl || undefined}
                  scale={1.5}
                  className="shadow-xl"
                />
              )}
      </div>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="secondary"
                onClick={togglePreviewMode}
              >
                إغلاق المعاينة
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={isPrinting}
                leftIcon={<PrinterIcon className="w-4 h-4" />}
              >
                {isPrinting ? 'جاري الطباعة...' : 'طباعة الآن'}
              </Button>
            </div>
            </div>
        </div>
      )}
    </div>
  );
} 
