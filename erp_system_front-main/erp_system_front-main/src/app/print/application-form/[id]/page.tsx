"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { AdditionalPages } from "../../../dashboard/trainees/application-form/[id]/additional-pages";
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

export default function PrintApplicationFormPage() {
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

  // طباعة تلقائية عند تحميل الصفحة
  useEffect(() => {
    if (!isLoading && trainee) {
      // انتظار قليل لضمان تحميل جميع البيانات والصور
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, trainee]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحضير الاستمارة للطباعة...</p>
        </div>
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">المتدرب غير موجود</h2>
          <p className="text-gray-600">لم يتم العثور على بيانات المتدرب المطلوب</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* محتوى النموذج - للطباعة فقط */}
      <div className="print-container">
        {/* الصفحة الأولى - البيانات الشخصية */}
        <div className="page">
          {/* رأس النموذج */}
          <div className="header">
            <div className="header-content">
              <h1 className="main-title">ملف تقديم البرنامج المهني</h1>
            </div>
            <div className="logo">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                width={80}
                height={80}
                className="logo-image"
              />
            </div>
          </div>

          {/* اسم مركز التدريب */}
          <div className="section-row">
            <div className="field">
              <label className="field-label">المحافظة:</label>
              <div className="field-value">
                <span>{getGovernorateLabel(trainee.governorate)}</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label">اسم مركز التدريب:</label>
              <div className="field-value">
                <span>{settings?.centerName || 'مركز تدريب مهني'}</span>
              </div>
            </div>
          </div>

          {/* أنواع البرامج */}
          <div className="program-types">
            <div className="checkbox-item">
              <input type="checkbox" checked={trainee.programType === 'SUMMER'} readOnly />
              <label>البرنامج الصيفي</label>
            </div>
            <div className="checkbox-item">
              <input type="checkbox" checked={trainee.programType === 'WINTER'} readOnly />
              <label>البرنامج الشتوي</label>
            </div>
          </div>

          {/* البيانات الشخصية */}
          <div className="section">
            <h2 className="section-title">البيانات الشخصية:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">كود المتدرب:</label>
                <div className="field-value">
                  <span>{trainee.id}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">تاريخ الالتحاق:</label>
                <div className="field-value">
                  <span>{formatJoinDate(trainee.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">اسم المتدرب:</label>
                <div className="field-value">
                  <span>{trainee.nameAr}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">الجنسية:</label>
                <div className="field-value">
                  <span>{getNationalityLabel(trainee.nationality)}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">محل الميلاد:</label>
                <div className="field-value"></div>
              </div>
              <div className="field">
                <label className="field-label">تاريخ الميلاد:</label>
                <div className="field-value">
                  <span>{new Date(trainee.birthDate).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>

            {/* الرقم القومي - صفوف */}
            <div className="national-id-section">
              <label className="field-label">رقم قومي:</label>
              <div className="national-id">
                {trainee.nationalId.split('').map((digit, index) => (
                  <div key={index} className="digit-box">
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">تاريخ الإصدار:</label>
                <div className="field-value">
                  <span>{formatDate(trainee.idIssueDate)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">تاريخ الانتهاء:</label>
                <div className="field-value">
                  <span>{formatDate(trainee.idExpiryDate)}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">المحافظة:</label>
                <div className="field-value">
                  <span>{getGovernorateLabel(trainee.governorate)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">المركز / المدينة:</label>
                <div className="field-value">
                  <span>{getCityLabel(trainee.city)}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">القرية / المنطقة:</label>
                <div className="field-value"></div>
              </div>
              <div className="field">
                <label className="field-label">العنوان التفصيلي:</label>
                <div className="field-value">
                  <span>{trainee.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* بيانات التواصل */}
          <div className="section">
            <h2 className="section-title">بيانات التواصل:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">البريد الالكتروني:</label>
                <div className="field-value">
                  <span>{trainee.email || ''}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">رقم الهاتف:</label>
                <div className="field-value">
                  <span>{trainee.phone}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">التليفون الأرضي:</label>
                <div className="field-value">
                  <span>{trainee.landline || ''}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">الواتساب:</label>
                <div className="field-value">
                  <span>{trainee.whatsapp || ''}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">الفيسبوك:</label>
                <div className="field-value facebook-qr">
                  {trainee.facebook && facebookQR ? (
                    <img src={facebookQR} alt="Facebook QR Code" className="qr-code" />
                  ) : (
                    <span></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* بيانات ولي الأمر */}
          <div className="section">
            <h2 className="section-title">بيانات ولي الأمر:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">اسم ولي الأمر:</label>
                <div className="field-value">
                  <span></span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">البريد الالكتروني لولي الامر:</label>
                <div className="field-value">
                  <span>{trainee.guardianEmail || ''}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">رقم الهاتف:</label>
                <div className="field-value">
                  <span>{trainee.guardianPhone}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">صلة القرابة:</label>
                <div className="field-value">
                  <span>{trainee.guardianRelation}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">الرقم القومي لولي الأمر:</label>
                <div className="field-value">
                  <span>{trainee.guardianNationalId || ''}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">وظيفة ولي الأمر:</label>
                <div className="field-value">
                  <span>{trainee.guardianJob || ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* المؤهل العلمي للمتدربين */}
          <div className="section">
            <h2 className="section-title">المؤهل العلمي:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">نوع المؤهل:</label>
                <div className="field-value">
                  <span>{getEducationTypeLabel(trainee.educationType)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">اسم المدرسة/المعهد:</label>
                <div className="field-value">
                  <span>{trainee.schoolName || ''}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">تاريخ التخرج:</label>
                <div className="field-value">
                  <span>{formatDate(trainee.graduationDate)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">المجموع الكلي:</label>
                <div className="field-value">
                  <span>{trainee.totalGrade || ''}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">النسبة المئوية:</label>
                <div className="field-value">
                  <span>{trainee.gradePercentage ? `${trainee.gradePercentage}%` : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الصفحة الثانية - بيانات البرنامج المراد الالتحاق به */}
        <div className="page">
          {/* رأس النموذج */}
          <div className="header">
            <div className="header-content">
              <h1 className="main-title">استمارة طلب الالتحاق البرنامج التدريبي</h1>
            </div>
            <div className="logo">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                width={80}
                height={80}
                className="logo-image"
              />
            </div>
          </div>

          {/* بيانات البرنامج المراد الالتحاق به */}
          <div className="section">
            <h2 className="section-title">بيانات البرنامج المراد الالتحاق به:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">المجال الرئيسي:</label>
                <div className="field-value">
                  <span>{trainee.program?.nameAr || ''}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">البرنامج التدريبي:</label>
                <div className="field-value">
                  <span>{trainee.program?.nameAr || ''}</span>
                </div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">تاريخ البدء:</label>
                <div className="field-value">
                  <span>{getStartDate(trainee.programType)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">وسائل التعارف بـ:</label>
                <div className="contact-methods">
                  <div className="method-row">
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>مركز التدريب</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>مديريات العمل</span>
                    </div>
                  </div>
                  <div className="method-row">
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>وسائل التواصل الاجتماعي</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>الموقع الالكتروني للمركز</span>
                    </div>
                  </div>
                  <div className="method-row">
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>متدرب / صديق / موظف ( يكتب الاسم ورقم التليفون )</span>
                      <div className="underline-field"></div>
                    </div>
                  </div>
                  <div className="method-row">
                    <div className="checkbox-item">
                      <input type="checkbox" />
                      <span>أخرى (كتابة الوسيلة )</span>
                      <div className="underline-field"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* معلومات البرامج التدريبية */}
          <div className="section">
            <p className="text-center info-text">
              يتم فتح باب التسجيل للالتحاق بالبرامج التدريبية طويلة المدى مرتين بالعام وفقا لتاريخ البدء علي أن يتم كتابتها :
            </p>
            
            <div className="program-info">
              <div className="info-item">
                <span className="bullet">•</span>
                <span>البرنامج الصيفي : يبدأ التسجيل فيه من 01 يونية حتى 01 أكتوبر / بداية التدريب .</span>
              </div>
              <div className="info-item">
                <span className="bullet">•</span>
                <span>البرنامج الشتوي : يبدأ التسجيل فيه من 02 أكتوبر حتى 01 فبراير / بداية التدريب .</span>
              </div>
              <div className="info-item">
                <span className="bullet">•</span>
                <span>برنامج سنة العقد : يبدأ التسجيل فيه من ( 05 فبراير - 05 مارس 2024 ) علي أن ينتهي التدريب بعد أقصي 01 أكتوبر 2024 .</span>
              </div>
            </div>
          </div>

          {/* المقررة فيها */}
          <div className="section">
            <h2 className="section-title">المقررة فيها:</h2>
            
            <div className="section-row">
              <div className="field">
                <label className="field-label">الاسم:</label>
                <div className="field-value">
                  <span>{trainee.nameAr}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">التوقيع:</label>
                <div className="field-value"></div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">تاريخ التقديم:</label>
                <div className="field-value">
                  <span>{formatJoinDate(trainee.createdAt)}</span>
                </div>
              </div>
              <div className="field">
                <label className="field-label">شؤون المتدربين:</label>
                <div className="field-value"></div>
              </div>
            </div>

            <div className="section-row">
              <div className="field">
                <label className="field-label">التوقيع:</label>
                <div className="field-value"></div>
              </div>
              <div className="field">
                <label className="field-label">الرقم القومي:</label>
                <div className="field-value">
                  <span>{trainee.nationalId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الصفحة الثالثة - الاشتراطات الإدارية والمالية */}
        <div className="page">
          {/* رأس النموذج */}
          <div className="header">
            <div className="header-content">
              <h1 className="main-title">استمارة طلب الالتحاق البرنامج التدريبي</h1>
            </div>
            <div className="logo">
              <Image
                src="/images/wzara.png"
                alt="وزارة العمل"
                width={80}
                height={80}
                className="logo-image"
              />
            </div>
          </div>

          {/* الاشتراطات الإدارية والمالية */}
          <div className="section">
            <h2 className="main-section-title">الاشتراطات الإدارية والمالية</h2>
            
            <div className="requirements">
              <p className="requirement">
                <span className="requirement-number">-1</span> على المتدرب الالتزام بالحضور حسب الجدول الزمني للمتدرب وفقاً للبرنامج التدريبي المهني ومجموعته وعدم تجاوز نسبة الغياب المحددة في المحاضرات العملية والنظرية وهي <span className="bold">%20</span> وإخطار الإدارة في حالة الغياب بسبب المرض أو أي عذر مقبول مع تقديم الشهادات الدالة على ذلك وفي حالة تجاوز هذه النسبة أعتبر منفصلاً لتجاوزي نسبة الغياب المقررة ولا يعرض المتدرب نفسه للفصل مع عدم استرداد مصروفاته التدريبية.
              </p>

              <p className="requirement">
                <span className="requirement-number">-2</span> جميع المراسلات بين الإدارة والمتدرب تكون من خلال البيانات المسجلة في هذه الاستمارة وعند تغير محل الإقامة أو عنوان المتدرب أو رقم التليفون يجب إخطار إدارة شؤون المتدربين بالبيانات الجديدة.
              </p>

              <p className="requirement">
                <span className="requirement-number">-3</span> على المتدرب الالتزام بالدخول لمركز التدريب من خلال بطاقة تعريفية للبرنامج التدريبي (كارنيه الالتحاق) وفي حالة فقده عليه إخطار الإدارة بذلك مع تقديم طلب إصدار بدل فاقد للبطاقة ويسدد رسوم ذلك للإدارة طبقاً للوائح المالية.
              </p>

              <p className="requirement">
                <span className="requirement-number">-4</span> على المتدرب الالتزام بالإجراءات الاحترازية في حالة الأوبئة (من لبس الكمامة والقفازات .........) وفي حالة عدم الالتزام يتم إنذاره مرتين متتاليتين ثم الفصل.
              </p>

              <p className="requirement">
                <span className="requirement-number">-5</span> على المتدرب الالتزام بأقساط البرنامج التدريبي في المواعيد المحددة طبقاً للائحة المالية وفي حالة التأخر دون طلب مسبب بموافقة الإدارة تزيد عن 15 يوم (خمسة عشر يوماً) يتم فصل المتدرب على أن يثبت إنذاره مرتين متتاليتين خلال المهلة المحددة مع عدم استرداد مصروفاته التدريبية.
              </p>

              <p className="requirement">
                <span className="requirement-number">-6</span> في حالة طلب المتدرب للرجوع للبرنامج التدريبي بعد فصله أو انقطاعه عن التدريب يتم تقديم طلب للإدارة مع دفع رسوم إعادة القيد طبقاً للوائح المالية.
              </p>

              <p className="requirement">
                <span className="requirement-number">-7</span> في حالة قرارات الفصل أو السحب أو التحويل للمتدرب من البرنامج التدريبي إلى برنامج آخر وبعد موافقة اللجنة التنفيذية على هذه القرارات يتم تنفيذ التالي:
              </p>
            </div>

            {/* حالات السحب */}
            <div className="withdrawal-cases">
              <h3 className="subsection-title">حالات السحب</h3>
              
              <div className="withdrawal-rules">
                <p className="withdrawal-rule">
                  <span className="rule-number">.1</span> إذا تم تقديم طلب السحب قبل بدء التدريب يسترد المتدرب <span className="bold">% 100</span> من قيمة ما قام بدفعه كاملاً.
                </p>
                
                <p className="withdrawal-rule">
                  <span className="rule-number">.2</span> إذا تم تقديم طلب السحب بعد بدء التدريب بشهر واحد على الأكثر يلتزم المتدرب بسداد <span className="bold">%20</span> من مصروفات البرنامج التدريبي، ويسترد المتدرب أية مبالغ أخرى قام بسدادها تزيد عن هذه القيمة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* باقي الصفحات */}
        <AdditionalPages trainee={trainee} settings={settings} />
      </div>

      {/* أنماط الطباعة */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: 'Arial', sans-serif;
          color: black;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        .print-container {
          width: 100%;
          background: white;
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0;
          background: white;
          page-break-after: always;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .page:last-child {
          page-break-after: avoid;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #ddd;
        }

        .header-content {
          flex: 1;
          text-align: center;
        }

        .main-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: black;
        }

        .logo {
          width: 80px;
          height: 80px;
          position: relative;
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #333;
          color: black;
        }

        .main-section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
          text-decoration: underline;
          color: black;
        }

        .section-row {
          display: flex;
          gap: 30px;
          margin-bottom: 15px;
        }

        .field {
          flex: 1;
        }

        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: black;
        }

        .field-value {
          border-bottom: 1px dotted #666;
          padding-bottom: 4px;
          min-height: 20px;
          display: flex;
          align-items: end;
          justify-content: center;
          text-align: center;
        }

        .field-value span {
          font-size: 14px;
          color: black;
          font-weight: 500;
        }

        .program-types {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 30px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin: 0;
        }

        .checkbox-item label,
        .checkbox-item span {
          font-size: 14px;
          color: black;
        }

        .national-id-section {
          margin-bottom: 20px;
        }

        .national-id {
          display: flex;
          gap: 4px;
          justify-content: center;
          margin-top: 10px;
        }

        .digit-box {
          width: 32px;
          height: 32px;
          border: 1px solid #666;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          color: black;
        }

        .facebook-qr {
          height: 60px !important;
          min-height: 60px !important;
        }

        .qr-code {
          width: 50px;
          height: 50px;
        }

        .contact-methods {
          padding: 10px 0;
        }

        .method-row {
          display: flex;
          gap: 20px;
          margin-bottom: 8px;
        }

        .method-row .checkbox-item {
          flex: 1;
        }

        .underline-field {
          flex: 1;
          border-bottom: 1px dotted #666;
          margin-left: 10px;
          min-height: 20px;
        }

        .info-text {
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          margin-bottom: 20px;
          color: black;
        }

        .program-info {
          margin-top: 15px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
          font-size: 14px;
          line-height: 1.4;
          color: black;
        }

        .bullet {
          margin-right: 8px;
          font-weight: bold;
          margin-top: 2px;
        }

        .requirements {
          margin-top: 20px;
        }

        .requirement {
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 15px;
          text-align: justify;
          color: black;
        }

        .requirement-number {
          font-weight: bold;
          color: black;
        }

        .bold {
          font-weight: bold;
        }

        .withdrawal-cases {
          margin-top: 25px;
        }

        .subsection-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          text-align: center;
          text-decoration: underline;
          color: black;
        }

        .withdrawal-rules {
          margin-top: 15px;
        }

        .withdrawal-rule {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 12px;
          color: black;
        }

        .rule-number {
          font-weight: bold;
          color: black;
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-container {
            margin: 0 !important;
            padding: 0 !important;
          }

          .page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 20mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          .page:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </>
  );
}
