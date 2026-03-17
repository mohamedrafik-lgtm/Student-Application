"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PrinterIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { AdditionalPages } from "./additional-pages";
import Image from "next/image";
import QRCode from "qrcode";

interface Trainee {
  id: number;
  nameAr: string;
  nameEn?: string;
  nationalId: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  birthDate: string;
  gender: string;
  nationality: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  governorate?: string;
  landline?: string;
  whatsapp?: string;
  facebook?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianName?: string;
  guardianJob?: string;
  guardianRelation?: string;
  educationType?: string;
  schoolName?: string;
  graduationDate?: string;
  totalGrade?: number;
  gradePercentage?: number;
  programType: string;
  photoUrl?: string;
  createdAt: string;
  program?: {
    id: number;
    nameAr: string;
    nameEn?: string;
    price?: number;
  };
}

interface SystemSettings {
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  centerLogo?: string;
}

// دالة لحساب تاريخ البدء بناءً على نوع البرنامج
const getStartDate = (programType: string): string => {
  switch (programType) {
    case 'SUMMER':
      return 'شهر فبراير';
    case 'WINTER':
      return 'شهر أكتوبر';
    default:
      return '....../....../................';
  }
};

// دالة لتنسيق تاريخ الانضمام
const formatJoinDate = (createdAt: string): string => {
  try {
    const date = new Date(createdAt);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return '....../....../................';
  }
};

// دالة لتنسيق التواريخ العامة
const formatDate = (dateString?: string): string => {
  if (!dateString) return '....../....../................';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return '....../....../................';
  }
};

// دالة لتحويل نوع التعليم إلى نص عربي
const getEducationTypeLabel = (educationType?: string): string => {
  const educationTypes: Record<string, string> = {
    'PREPARATORY': 'إعدادي',
    'INDUSTRIAL_SECONDARY': 'ثانوي فني صناعي',
    'COMMERCIAL_SECONDARY': 'ثانوي فني تجاري',
    'AGRICULTURAL_SECONDARY': 'ثانوي فني زراعي',
    'AZHAR_SECONDARY': 'ثانوي أزهري',
    'GENERAL_SECONDARY': 'ثانوي عام',
    'UNIVERSITY': 'بكالوريوس - ليسانس',
    'INDUSTRIAL_APPRENTICESHIP': 'تلمذة صناعية'
  };
  return educationTypes[educationType || ''] || educationType || '';
};

// دالة لتحويل كود الجنسية إلى نص عربي
const getNationalityLabel = (nationalityCode?: string): string => {
  const nationalities: Record<string, string> = {
    'EG': 'مصر',
    'SA': 'السعودية',
    'AE': 'الإمارات العربية المتحدة',
    'JO': 'الأردن',
    'LB': 'لبنان',
    'SY': 'سوريا',
    'IQ': 'العراق',
    'KW': 'الكويت',
    'QA': 'قطر',
    'BH': 'البحرين',
    'OM': 'عمان',
    'YE': 'اليمن',
    'PS': 'فلسطين',
    'LY': 'ليبيا',
    'TN': 'تونس',
    'DZ': 'الجزائر',
    'MA': 'المغرب',
    'SD': 'السودان'
  };
  return nationalities[nationalityCode || ''] || nationalityCode || '';
};

// دالة لتحويل كود المحافظة إلى نص عربي
const getGovernorateLabel = (governorateCode?: string): string => {
  const governorates: Record<string, string> = {
    'cairo': 'القاهرة',
    'giza': 'الجيزة',
    'alexandria': 'الإسكندرية',
    'luxor': 'الأقصر',
    'aswan': 'أسوان',
    'port_said': 'بورسعيد',
    'suez': 'السويس',
    'damietta': 'دمياط',
    'dakahlia': 'الدقهلية',
    'sharqia': 'الشرقية',
    'qaliubiya': 'القليوبية',
    'kafr_el_sheikh': 'كفر الشيخ',
    'gharbia': 'الغربية',
    'menoufia': 'المنوفية',
    'beheira': 'البحيرة',
    'ismailia': 'الإسماعيلية',
    'fayyum': 'الفيوم',
    'beni_suef': 'بني سويف',
    'minya': 'المنيا',
    'asyut': 'أسيوط',
    'sohag': 'سوهاج',
    'qena': 'قنا',
    'red_sea': 'البحر الأحمر',
    'new_valley': 'الوادي الجديد',
    'matrouh': 'مطروح',
    'north_sinai': 'شمال سيناء',
    'south_sinai': 'جنوب سيناء'
  };
  return governorates[governorateCode || ''] || governorateCode || '';
};

// دالة لتحويل كود المدينة إلى نص عربي
const getCityLabel = (cityCode?: string): string => {
  const cities: Record<string, string> = {
    // القاهرة
    'nasr_city': 'مدينة نصر',
    'heliopolis': 'مصر الجديدة',
    'maadi': 'المعادي',
    'zamalek': 'الزمالك',
    'downtown': 'وسط البلد',
    'shubra': 'شبرا',
    'abbasia': 'العباسية',
    'helwan': 'حلوان',
    'ain_shams': 'عين شمس',
    'manshiet_nasser': 'منشية ناصر',
    'new_cairo': 'القاهرة الجديدة',
    'old_cairo': 'مصر القديمة',
    'mokattam': 'المقطم',
    // الجيزة
    'giza_city': 'مدينة الجيزة',
    '6th_october': 'مدينة 6 أكتوبر',
    'sheikh_zayed': 'الشيخ زايد',
    'haram': 'الهرم',
    'faisal': 'فيصل',
    'dokki': 'الدقي',
    'mohandessin': 'المهندسين',
    'agouza': 'العجوزة',
    'imbaba': 'إمبابة',
    'bulaq_el_dakrour': 'بولاق الدكرور',
    'kit_kat': 'كيت كات',
    'badrashin': 'البدرشين',
    'atfih': 'أطفيح',
    // الإسكندرية
    'alexandria_center': 'وسط الإسكندرية',
    'montaza': 'المنتزه',
    'east_alexandria': 'شرق الإسكندرية',
    'west_alexandria': 'غرب الإسكندرية',
    'gomrok': 'الجمرك',
    'labban': 'اللبان',
    'dekhela': 'الدخيلة',
    'ameria': 'العامرية',
    'max': 'مكس',
    'agami': 'العجمي',
    'hannoville': 'هانوفيل',
    'king_mariout': 'الملك مريوط'
  };
  return cities[cityCode || ''] || cityCode || '';
};

export default function ApplicationFormPage() {
  const params = useParams();
  const traineeId = params.id as string;
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facebookQR, setFacebookQR] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [traineeResponse, settingsResponse] = await Promise.all([
          fetchAPI(`/trainees/${traineeId}`),
          fetchAPI('/settings')
        ]);
        
        setTrainee(traineeResponse);
        setSettings(settingsResponse.settings);
        
        // توليد QR Code للفيسبوك إذا كان متوفراً
        if (traineeResponse.facebook) {
          try {
            const qrDataURL = await QRCode.toDataURL(`https://facebook.com/${traineeResponse.facebook}`, {
              width: 150,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            setFacebookQR(qrDataURL);
          } catch (error) {
            console.error('خطأ في توليد QR Code:', error);
          }
        }
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [traineeId]);

  const handlePrint = () => {
    // فتح صفحة الطباعة في تاب جديدة
    const printUrl = `/print/application-form/${traineeId}`;
    window.open(printUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">المتدرب غير موجود</h2>
          <Link href="/dashboard/trainees">
            <Button>العودة إلى قائمة المتدربين</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التحكم - لا يُطبع */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/trainees">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </Link>
                          <h1 className="text-xl font-bold text-gray-900">
                ملف تقديم البرنامج المهني - {trainee.nameAr}
              </h1>
          </div>
          <Button 
            onClick={handlePrint} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <PrinterIcon className="h-5 w-5" />
            طباعة الاستمارة
          </Button>
        </div>
      </div>

      {/* محتوى النموذج */}
      <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none">
        {/* الصفحة الأولى - البيانات الشخصية */}
        <div className="bg-white min-h-[297mm] p-8 mb-6 print:mb-0 print:shadow-none shadow-lg print:page-break-after-always">
          {/* رأس النموذج */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold mb-2">ملف تقديم البرنامج المهني</h1>
            </div>
            <div className="w-20 h-20 relative">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* اسم مركز التدريب */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">المحافظة:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                <span className="text-gray-800">{getGovernorateLabel(trainee.governorate)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اسم مركز التدريب:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                <span className="text-gray-800">{settings?.centerName || 'مركز تدريب مهني'}</span>
              </div>
            </div>
          </div>

          {/* أنواع البرامج */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={trainee.programType === 'SUMMER'} readOnly className="w-4 h-4" />
              <label className="text-sm">البرنامج الصيفي</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={trainee.programType === 'WINTER'} readOnly className="w-4 h-4" />
              <label className="text-sm">البرنامج الشتوي</label>
            </div>
          </div>

          {/* البيانات الشخصية */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              البيانات الشخصية:
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">كود المتدرب:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.id}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ الالتحاق:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{formatJoinDate(trainee.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم المتدرب:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.nameAr}</span>
                </div>
              </div>
              <div>
                              <label className="block text-sm font-medium mb-2">الجنسية:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                <span className="text-gray-800">{getNationalityLabel(trainee.nationality)}</span>
              </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">محل الميلاد:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem]"></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ الميلاد:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{new Date(trainee.birthDate).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>

            {/* الرقم القومي - صفوف */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">رقم قومي:</label>
              <div className="flex gap-1 justify-center" dir="ltr">
                {trainee.nationalId.split('').map((digit, index) => (
                  <div key={index} className="w-8 h-8 border border-gray-400 flex items-center justify-center text-sm">
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ الإصدار:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{formatDate(trainee.idIssueDate)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ الانتهاء:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{formatDate(trainee.idExpiryDate)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                              <label className="block text-sm font-medium mb-2">المحافظة:</label>
              <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                <span className="text-gray-800">{getGovernorateLabel(trainee.governorate)}</span>
              </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">المركز / المدينة:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{getCityLabel(trainee.city)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">القرية / المنطقة:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem]"></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">العنوان التفصيلي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* بيانات التواصل */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              بيانات التواصل:
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">البريد الالكتروني:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.email || ''}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">التليفون الأرضي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.landline || ''}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الواتساب:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.whatsapp || ''}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="print:break-inside-avoid">
                <label className="block text-sm font-medium mb-2">الفيسبوك:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[4rem] flex items-center justify-center">
                  {trainee.facebook && facebookQR ? (
                    <img src={facebookQR} alt="Facebook QR Code" className="w-16 h-16" />
                  ) : (
                    <span className="text-gray-800"></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* بيانات ولي الأمر */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              بيانات ولي الأمر:
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم ولي الأمر:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800"></span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">البريد الالكتروني لولي الامر:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.guardianEmail || ''}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.guardianPhone}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">صلة القرابة:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.guardianRelation}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم ولي الأمر:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.guardianName || ''}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">وظيفة ولي الأمر:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.guardianJob || ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* المؤهل العلمي للمتدربيت */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              المؤهل العلمي :
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">نوع المؤهل:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{getEducationTypeLabel(trainee.educationType)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">اسم المدرسة/المعهد:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.schoolName || ''}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ التخرج:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{formatDate(trainee.graduationDate)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">المجموع الكلي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.totalGrade || ''}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">النسبة المئوية:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.gradePercentage ? `${trainee.gradePercentage}%` : ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* رقم الصفحة */}
          <div className="text-center text-sm text-gray-500 mt-auto print:hidden">
            Page 1 of 6
          </div>
        </div>

        {/* الصفحة الثانية - بيانات البرنامج المراد الالتحاق به */}
        <div className="bg-white min-h-[297mm] p-8 mb-6 print:mb-0 print:shadow-none shadow-lg print:page-break-after-always" style={{pageBreakBefore: 'always'}}>
          {/* رأس النموذج */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold mb-2">استمارة طلب الالتحاق البرنامج التدريبي</h1>
            </div>
            <div className="w-20 h-20 relative">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* بيانات البرنامج المراد الالتحاق به */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              بيانات البرنامج المراد الالتحاق به:
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">المجال الرئيسي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.program?.nameAr || ''}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">البرنامج التدريبي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.program?.nameAr || ''}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ البدء:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{getStartDate(trainee.programType)}</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">وسائل التعارف بـ:</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400"></div>
                      <span className="text-sm">مركز التدريب</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400"></div>
                      <span className="text-sm">مديريات العمل</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400"></div>
                      <span className="text-sm">وسائل التواصل الاجتماعي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400"></div>
                      <span className="text-sm">الموقع الالكتروني للمركز</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-400"></div>
                    <span className="text-sm">متدرب / صديق / موظف ( يكتب الاسم ورقم التليفون )</span>
                    <div className="border-b border-dotted border-gray-400 pb-1 flex-1"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-400"></div>
                    <span className="text-sm">أخرى (كتابة الوسيلة )</span>
                    <div className="border-b border-dotted border-gray-400 pb-1 flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* معلومات البرامج التدريبية */}
          <div className="mb-8">
            <p className="text-sm mb-4 text-center font-medium">
              يتم فتح باب التسجيل للالتحاق بالبرامج التدريبية طويلة المدى مرتين بالعام وفقا لتاريخ البدء علي أن يتم كتابتها :
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                <span>البرنامج الصيفي : يبدأ التسجيل فيه من 01 يونية حتى 01 أكتوبر / بداية التدريب .</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                <span>البرنامج الشتوي : يبدأ التسجيل فيه من 02 أكتوبر حتى 01 فبراير / بداية التدريب .</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                <span>برنامج سنة العقد : يبدأ التسجيل فيه من ( 05 فبراير - 05 مارس 2024 ) علي أن ينتهي التدريب بعد أقصي 01 أكتوبر 2024 .</span>
              </div>
            </div>
          </div>

          {/* المقررة فيها */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b-2 border-gray-300 pb-2">
              المقررة فيها:
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.nameAr}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">التوقيع:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem]"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">تاريخ التقديم:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{formatJoinDate(trainee.createdAt)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">شؤون المتدربين:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem]"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">التوقيع:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem]"></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الرقم القومي:</label>
                <div className="border-b border-dotted border-gray-400 pb-1 min-h-[2rem] flex items-end justify-center">
                  <span className="text-gray-800">{trainee.nationalId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* رقم الصفحة */}
          <div className="text-center text-sm text-gray-500 mt-auto print:hidden">
            Page 2 of 6
          </div>
        </div>

        {/* الصفحة الثالثة - الاشتراطات الإدارية والمالية */}
        <div className="bg-white min-h-[297mm] p-8 mb-6 print:mb-0 print:shadow-none shadow-lg print:page-break-after-always">
          {/* رأس النموذج */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold mb-2">استمارة طلب الالتحاق البرنامج التدريبي</h1>
            </div>
            <div className="w-20 h-20 relative">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* الاشتراطات الإدارية والمالية */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-6 text-center underline">
              الاشتراطات الإدارية والمالية
            </h2>
            
            <div className="space-y-4 text-sm leading-relaxed">
              <p className="text-justify">
                <span className="font-bold">-1</span> على المتدرب الالتزام بالحضور حسب الجدول الزمني للمتدرب وفقاً للبرنامج التدريبي المهني ومجموعته وعدم تجاوز نسبة الغياب المحددة في المحاضرات العملية والنظرية وهي <span className="font-bold">%20</span> وإخطار الإدارة في حالة الغياب بسبب المرض أو أي عذر مقبول مع تقديم الشهادات الدالة على ذلك وفي حالة تجاوز هذه النسبة أعتبر منفصلاً لتجاوزي نسبة الغياب المقررة ولا يعرض المتدرب نفسه للفصل مع عدم استرداد مصروفاته التدريبية.
              </p>

              <p className="text-justify">
                <span className="font-bold">-2</span> جميع المراسلات بين الإدارة والمتدرب تكون من خلال البيانات المسجلة في هذه الاستمارة وعند تغير محل الإقامة أو عنوان المتدرب أو رقم التليفون يجب إخطار إدارة شؤون المتدربين بالبيانات الجديدة.
              </p>

              <p className="text-justify">
                <span className="font-bold">-3</span> على المتدرب الالتزام بالدخول لمركز التدريب من خلال بطاقة تعريفية للبرنامج التدريبي (كارنيه الالتحاق) وفي حالة فقده عليه إخطار الإدارة بذلك مع تقديم طلب إصدار بدل فاقد للبطاقة ويسدد رسوم ذلك للإدارة طبقاً للوائح المالية.
              </p>

              <p className="text-justify">
                <span className="font-bold">-4</span> على المتدرب الالتزام بالإجراءات الاحترازية في حالة الأوبئة (من لبس الكمامة والقفازات .........) وفي حالة عدم الالتزام يتم إنذاره مرتين متتاليتين ثم الفصل.
              </p>

              <p className="text-justify">
                <span className="font-bold">-5</span> على المتدرب الالتزام بأقساط البرنامج التدريبي في المواعيد المحددة طبقاً للائحة المالية وفي حالة التأخر دون طلب مسبب بموافقة الإدارة تزيد عن 15 يوم (خمسة عشر يوماً) يتم فصل المتدرب على أن يثبت إنذاره مرتين متتاليتين خلال المهلة المحددة مع عدم استرداد مصروفاته التدريبية.
              </p>

              <p className="text-justify">
                <span className="font-bold">-6</span> في حالة طلب المتدرب للرجوع للبرنامج التدريبي بعد فصله أو انقطاعه عن التدريب يتم تقديم طلب للإدارة مع دفع رسوم إعادة القيد طبقاً للوائح المالية.
              </p>

              <p className="text-justify">
                <span className="font-bold">-7</span> في حالة قرارات الفصل أو السحب أو التحويل للمتدرب من البرنامج التدريبي إلى برنامج آخر وبعد موافقة اللجنة التنفيذية على هذه القرارات يتم تنفيذ التالي:
              </p>
            </div>

            {/* حالات السحب */}
            <div className="mt-6">
              <h3 className="text-md font-bold mb-4 underline text-center">حالات السحب</h3>
              
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-bold">.1</span> إذا تم تقديم طلب السحب قبل بدء التدريب يسترد المتدرب <span className="font-bold">% 100</span> من قيمة ما قام بدفعه كاملاً.
                </p>
                
                <p>
                  <span className="font-bold">.2</span> إذا تم تقديم طلب السحب بعد بدء التدريب بشهر واحد على الأكثر يلتزم المتدرب بسداد <span className="font-bold">%20</span> من مصروفات البرنامج التدريبي، ويسترد المتدرب أية مبالغ أخرى قام بسدادها تزيد عن هذه القيمة.
                </p>
              </div>
            </div>
          </div>

          {/* رقم الصفحة */}
          <div className="text-center text-sm text-gray-500 mt-auto print:hidden">
            Page 3 of 6
          </div>
        </div>

        {/* باقي الصفحات */}
        <AdditionalPages trainee={trainee} settings={settings} />
        
      </div>

      {/* أنماط الطباعة */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          /* إخفاء جميع العناصر أولاً */
          * {
            visibility: hidden;
          }
          
          /* إظهار محتوى الطباعة فقط */
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          
          /* تأكيد فواصل الصفحات بـ inline styles */
          [style*="pageBreakBefore"] {
            page-break-before: always !important;
            break-before: page !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          /* إخفاء العناصر غير المرغوبة تماماً */
          .print\\:hidden,
          nav, aside, header, footer,
          .sidebar, .navbar, .menu,
          [class*="sidebar"],
          [class*="navbar"],
          [class*="menu"],
          [role="navigation"],
          [role="banner"],
          [role="contentinfo"] {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* تنسيق الحاوي الرئيسي */
          .max-w-4xl {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* فواصل الصفحات */
          .print\\:page-break-after-always {
            page-break-after: always !important;
            break-after: page !important;
          }
          
          .print\\:page-break-before-always {
            page-break-before: always !important;
            break-before: page !important;
            display: block !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print\\:break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* إعدادات الصفحات */
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }
          
          /* تأكد من أن الصفحات تظهر */
          .bg-white {
            display: block !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
