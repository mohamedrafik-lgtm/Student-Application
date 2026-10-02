'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormData } from '../schema';
import { useRouter } from 'next/navigation';
import {
  CheckIcon,
  UserIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  IdentificationIcon,
  HomeIcon,
  UserGroupIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Label } from '@/components/ui/label';
import DatePicker from "@/components/ui/date-picker";
import { countries } from '@/app/lib/countries';
import { getLocationsTree } from '@/lib/locations-api';
import { transliterateArabicToEnglish, debounce } from '@/lib/transliteration-api';

interface Program {
  id: number;
  nameAr: string;
}

interface NewTraineeFormProps {
  initialData?: Partial<FormData>;
  programs: Program[];
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  mode: 'add' | 'edit';
}

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
  <div className="flex items-center mb-6 border-b border-tiba-gray-200 pb-4">
    <div className="text-tiba-primary-600">{icon}</div>
    <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">
      {title}
    </h3>
  </div>
);

const RequiredAsterisk = () => (
  <span className="text-red-500 ml-1 font-bold" title="حقل إجباري">*</span>
);

const FormField = ({ label, error, children, required = false }: { label: string, error?: string, children: React.ReactNode, required?: boolean }) => (
    <div className="flex flex-col space-y-2">
        <Label className="flex items-center">
          {label}
          {required && <RequiredAsterisk />}
        </Label>
        {children}
        {error && <p className="text-sm text-tiba-danger-500 mt-1">{error}</p>}
    </div>
);

export default function NewTraineeForm({
  initialData,
  programs,
  onSubmit,
  isSubmitting,
  mode
}: NewTraineeFormProps) {
  const router = useRouter();
  const { control, handleSubmit, register, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {},
  });

  // حالة تفعيل الترجمة التلقائية (معطلة افتراضياً)
  const [autoTransliterate, setAutoTransliterate] = useState(false);
  const [isTransliterating, setIsTransliterating] = useState(false);

  // تتبع الرقم القومي الأصلي في وضع التعديل لتجنب تحديث البيانات عند فتح الصفحة
  const initialNationalIdRef = useRef<string | null>(mode === 'edit' ? (initialData?.nationalId || null) : null);
  const hasNationalIdBeenEdited = useRef(false);

  // مراقبة تاريخ إصدار البطاقة لحساب تاريخ الانتهاء تلقائياً
  const idIssueDate = watch('idIssueDate');
  
  // مراقبة تاريخ الميلاد لحساب العمر
  const birthDate = watch('birthDate');
  
  // مراقبة الرقم القومي لاستخراج البيانات
  const nationalId = watch('nationalId');
  
  // مراقبة حالة الطالب
  const studentStatus = watch('status');
  
  // مراقبة تغييرات الدولة والمحافظة لتحديث القوائم
  const selectedCountry = watch('country');
  const selectedGovernorate = watch('governorate');

  // مراقبة الاسم العربي للترجمة التلقائية
  const arabicName = watch('nameAr');

  // State للمواقع من API
  const [locationsData, setLocationsData] = useState<any[]>([]);
  const [governoratesList, setGovernoratesList] = useState<any[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]);

  // تحميل المواقع من API
  useEffect(() => {
    const loadLocations = async () => {
      const data = await getLocationsTree();
      setLocationsData(data.countries || []);
    };
    loadLocations();
  }, []);

  // تحديث المحافظات عند تغيير الدولة
  useEffect(() => {
    if (selectedCountry && locationsData.length > 0) {
      const country = locationsData.find(c => c.code === selectedCountry);
      setGovernoratesList(country?.governorates || []);
      setCitiesList([]);
    }
  }, [selectedCountry, locationsData]);

  // تحديث المدن عند تغيير المحافظة
  useEffect(() => {
    if (selectedGovernorate && governoratesList.length > 0) {
      const gov = governoratesList.find(g => g.code === selectedGovernorate);
      setCitiesList(gov?.cities || []);
    }
  }, [selectedGovernorate, governoratesList]);

  useEffect(() => {
    if (initialData) {
      const dataToReset = {
        ...initialData,
        programId: initialData.programId || null,
        totalGrade: initialData.totalGrade || null,
        gradePercentage: initialData.gradePercentage || null,
      };
      reset(dataToReset);
    } else {
      // Set default values if adding a new trainee
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const defaultAcademicYear = `${currentYear}/${nextYear}`;
      reset({
        ...initialData,
        academicYear: defaultAcademicYear,
        nationality: 'EG', // جعل مصر الجنسية الافتراضية
        country: 'EG', // جعل مصر الدولة الافتراضية
        guardianName: '', // إضافة حقل اسم ولي الأمر الفارغ
        status: 'FRESHMAN' // القيمة الافتراضية: مستجد
      });
    }
  }, [initialData, reset]);

  // حساب تاريخ انتهاء البطاقة تلقائياً عند تغيير تاريخ الإصدار
  useEffect(() => {
    if (idIssueDate && !initialData?.idExpiryDate) {
      const issueDate = new Date(idIssueDate);
      const expiryDate = new Date(issueDate);
      expiryDate.setFullYear(issueDate.getFullYear() + 7); // إضافة 7 سنوات
      
      // تحويل التاريخ إلى تنسيق YYYY-MM-DD للـ input
      const formattedExpiryDate = expiryDate.toISOString().split('T')[0];
      setValue('idExpiryDate', formattedExpiryDate);
    }
  }, [idIssueDate, setValue, initialData?.idExpiryDate]);

  // تفريغ المحافظة والمدينة عند تغيير الدولة
  useEffect(() => {
    if (selectedCountry && !initialData?.governorate) {
      setValue('governorate', '');
      setValue('city', '');
    }
  }, [selectedCountry, setValue, initialData?.governorate]);

  // تفريغ المدينة عند تغيير المحافظة
  useEffect(() => {
    if (selectedGovernorate && !initialData?.city) {
      setValue('city', '');
    }
  }, [selectedGovernorate, setValue, initialData?.city]);
  
  // استخراج البيانات من الرقم القومي عند تغييره (مع تأخير بسيط)
  // في وضع التعديل: يتم الاستخراج فقط عند تعديل الرقم القومي فعلياً من قبل المستخدم
  useEffect(() => {
    // في وضع التعديل، نتجاهل التشغيل الأول (عند تحميل البيانات)
    if (mode === 'edit' && !hasNationalIdBeenEdited.current) {
      // تحقق هل الرقم القومي تغير فعلاً عن القيمة الأصلية
      if (nationalId === initialNationalIdRef.current) {
        return; // لم يتم التعديل — تخطي
      }
      // المستخدم غيّر الرقم القومي فعلاً
      hasNationalIdBeenEdited.current = true;
    }

    const timer = setTimeout(() => {
      if (nationalId && nationalId.length >= 7) {
        const extractedData = extractDataFromNationalId(nationalId);
        
        if (extractedData && extractedData.isExtracted) {
          // تعبئة تاريخ الميلاد دائماً عند تغيير الرقم القومي
          setValue('birthDate', extractedData.birthDate);
          
          // تعبئة النوع دائماً عند تغيير الرقم القومي
          setValue('gender', extractedData.gender as 'MALE' | 'FEMALE');
          
          // تعبئة المحافظة إذا كانت مصر هي الدولة المختارة
          if (selectedCountry === 'EG' && extractedData.governorateValue) {
            setValue('governorate', extractedData.governorateValue);
          }
          
          // إظهار رسالة نجاح مع تأثير بصري
          toast.success(`✨ تم تحديث البيانات تلقائياً!`, {
            duration: 2500,
            position: 'top-center',
            style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            },
            icon: '🔄' // رمز التحديث
          });
        }
      }
    }, 300); // تأخير 300 ملي ثانية

    return () => clearTimeout(timer);
  }, [nationalId, setValue, selectedCountry, mode]);

  // دالة الترجمة التلقائية مع debounce
  const handleAutoTransliteration = useCallback(
    debounce(async (arabicText: string) => {
      if (!arabicText || !arabicText.trim() || !autoTransliterate) {
        return;
      }

      setIsTransliterating(true);
      
      try {
        const result = await transliterateArabicToEnglish(arabicText);
        
        if (result.success && result.text) {
          setValue('nameEn', result.text, { shouldValidate: true });
          
          toast.success('✨ تم ترجمة الاسم تلقائياً', {
            duration: 2000,
            position: 'top-center',
            style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            },
            icon: '🌐'
          });
        } else if (result.error) {
          console.error('Transliteration error:', result.error);
        }
      } catch (error) {
        console.error('Transliteration failed:', error);
      } finally {
        setIsTransliterating(false);
      }
    }, 800),
    [autoTransliterate, setValue]
  );

  // تفعيل الترجمة التلقائية عند تغيير الاسم العربي
  useEffect(() => {
    if (arabicName && autoTransliterate) {
      handleAutoTransliteration(arabicName);
    }
  }, [arabicName, autoTransliterate, handleAutoTransliteration]);
  
  const programOptions = programs.map(p => ({ value: String(p.id), label: p.nameAr }));

  const genderOptions = [ { value: 'MALE', label: 'ذكر' }, { value: 'FEMALE', label: 'أنثى' } ];
  const maritalStatusOptions = [ { value: 'SINGLE', label: 'أعزب' }, { value: 'MARRIED', label: 'متزوج' }, { value: 'DIVORCED', label: 'مطلق' }, { value: 'WIDOWED', label: 'أرمل' } ];
  const religionOptions = [ { value: 'ISLAM', label: 'الإسلام' }, { value: 'CHRISTIANITY', label: 'المسيحية' }, { value: 'JUDAISM', label: 'اليهودية' } ];
  const statusOptions = [ { value: 'FRESHMAN', label: 'مستجد' }, { value: 'GRADUATE', label: 'خريج' } ];
  const educationTypeOptions = [ { value: "PREPARATORY", label: "اعدادي" }, { value: "INDUSTRIAL_SECONDARY", label: "ثانوي فني صناعي" }, { value: "COMMERCIAL_SECONDARY", label: "ثانوي فني تجاري" }, { value: "AGRICULTURAL_SECONDARY", label: "ثانوي فني زراعي" }, { value: "AZHAR_SECONDARY", label: "ثانوي أزهري" }, { value: "GENERAL_SECONDARY", label: "ثانوي عام" }, { value: "UNIVERSITY", label: "بكالوريوس - ليسانس" }, { value: "INDUSTRIAL_APPRENTICESHIP", label: "تلمذة صناعية" } ];
  const enrollmentTypeOptions = [ { value: 'REGULAR', label: 'انتظام' }, { value: 'DISTANCE', label: 'انتساب' }, { value: 'BOTH', label: 'الكل' } ];
  const programTypeOptions = [ { value: 'SUMMER', label: 'صيفي (فبراير)' }, { value: 'WINTER', label: 'شتوي (اكتوبر)' }, { value: 'ANNUAL', label: 'سنوي' } ];
  
  // توليد خيارات العام الدراسي للسنوات الثلاث القادمة
  const generateAcademicYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    
    for (let i = 0; i < 5; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      options.push({
        value: `${startYear}/${endYear}`,
        label: `${startYear}/${endYear}`
      });
    }
    
    return options;
  };
  
  const academicYearOptions = generateAcademicYearOptions();

  // وظائف استخراج البيانات من الرقم القومي
  
  // قاموس المحافظات المصرية (كود الرقم القومي -> كود النظام)
  const egyptianGovernorates: { [key: string]: string } = {
    '01': 'cairo',
    '02': 'alexandria',
    '03': 'port_said',
    '04': 'suez',
    '11': 'damietta',
    '12': 'dakahlia',
    '13': 'sharqia',
    '14': 'qalyubia',
    '15': 'kafr_sheikh',
    '16': 'gharbia',
    '17': 'monufia',
    '18': 'beheira',
    '19': 'ismailia',
    '21': 'giza',
    '22': 'beni_suef',
    '23': 'fayoum',
    '24': 'minya',
    '25': 'asyut',
    '26': 'sohag',
    '27': 'qena',
    '28': 'aswan',
    '29': 'luxor',
    '31': 'red_sea',
    '32': 'new_valley',
    '33': 'matrouh',
    '34': 'north_sinai',
    '35': 'south_sinai',
    '88': 'overseas'
  };

  // قاموس أسماء المحافظات للعرض
  const governorateDisplayNames: { [key: string]: string } = {
    'cairo': 'القاهرة',
    'alexandria': 'الإسكندرية',
    'port_said': 'بورسعيد',
    'suez': 'السويس',
    'damietta': 'دمياط',
    'dakahlia': 'الدقهلية',
    'sharqia': 'الشرقية',
    'qalyubia': 'القليوبية',
    'kafr_sheikh': 'كفر الشيخ',
    'gharbia': 'الغربية',
    'monufia': 'المنوفية',
    'beheira': 'البحيرة',
    'ismailia': 'الإسماعيلية',
    'giza': 'الجيزة',
    'beni_suef': 'بني سويف',
    'fayoum': 'الفيوم',
    'minya': 'المنيا',
    'asyut': 'أسيوط',
    'sohag': 'سوهاج',
    'qena': 'قنا',
    'aswan': 'أسوان',
    'luxor': 'الأقصر',
    'red_sea': 'البحر الأحمر',
    'new_valley': 'الوادي الجديد',
    'matrouh': 'مطروح',
    'north_sinai': 'شمال سيناء',
    'south_sinai': 'جنوب سيناء',
    'overseas': 'خارج مصر'
  };

  // استخراج البيانات من الرقم القومي (بدون تحقق من الصحة)
  const extractDataFromNationalId = (id: string) => {
    if (!id || id.length < 14) {
      return null;
    }

    // استخراج تاريخ الميلاد
    const century = parseInt(id.substring(0, 1)) || 2; // افتراض 2000s إذا لم يكن واضح
    const year = parseInt(id.substring(1, 3)) || 0;
    const month = parseInt(id.substring(3, 5)) || 1;
    const day = parseInt(id.substring(5, 7)) || 1;
    
    // تحديد القرن
    const fullYear = century === 2 ? 1900 + year : 2000 + year;
    
    // تصحيح القيم إذا كانت خارج النطاق
    const validMonth = Math.max(1, Math.min(12, month));
    const validDay = Math.max(1, Math.min(31, day));
    
    const birthDate = `${fullYear}-${validMonth.toString().padStart(2, '0')}-${validDay.toString().padStart(2, '0')}`;
    
    // استخراج المحافظة
    const governorateCode = id.substring(7, 9);
    const governorateValue = egyptianGovernorates[governorateCode] || null;
    const governorateDisplay = governorateValue ? governorateDisplayNames[governorateValue] : null;
    
    // استخراج النوع
    const genderDigit = parseInt(id.substring(12, 13)) || 1;
    const gender = genderDigit % 2 === 1 ? 'MALE' : 'FEMALE';
    
    return {
      birthDate,
      governorateValue, // كود المحافظة للنظام
      governorateDisplay, // اسم المحافظة للعرض
      gender,
      isExtracted: true
    };
  };

  // حساب العمر من تاريخ الميلاد بالسنوات والشهور
  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return null;
    
    const birth = new Date(birthDateString);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    // إذا كان الشهر الحالي أقل من شهر الميلاد، أو نفس الشهر ولكن اليوم أقل
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    
    // إذا كان اليوم الحالي أقل من يوم الميلاد، نقص شهر
    if (today.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        months = 11;
        years--;
      }
    }
    
    return { years, months };
  };

  const currentAge = calculateAge(birthDate);

  // خيارات الدول من API
  const countryOptions = locationsData.map(c => ({ value: c.code, label: c.nameAr }));

  // خيارات المحافظات من الدولة المختارة
  const governorateOptions = governoratesList.map(g => ({ value: g.code, label: g.nameAr }));

  // خيارات المدن من المحافظة المختارة
  const cityOptions = citiesList.map(c => ({ value: c.code, label: c.nameAr }));

  // خيارات سنوات التخرج (من السنة الحالية إلى 1950)
  const currentYear = new Date().getFullYear();
  const graduationYearOptions = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleFormSubmit = (data: any) => {
    const processedData = {
        ...data,
        // تحويل سنة التخرج إلى تاريخ (أول يناير من السنة المختارة)
        graduationDate: data.graduationDate ? `${data.graduationDate}-01-01` : data.graduationDate,
        // إضافة الحالة الافتراضية (مستجد) في وضع الإضافة
        status: data.status || 'FRESHMAN',
        
        // معالجة الحقول الرقمية الاختيارية
        totalGrade: data.totalGrade || null,
        gradePercentage: data.gradePercentage || null,
        
        // معالجة الحقول النصية الاختيارية (تحويل النصوص الفارغة إلى null)
        email: data.email?.trim() || null,
        guardianEmail: data.guardianEmail?.trim() || null,
        guardianJob: data.guardianJob?.trim() || null,
        landline: data.landline?.trim() || null,
        // whatsapp الآن حقل إجباري - لا نحوله لـ null
        whatsapp: data.whatsapp?.trim(),
        facebook: data.facebook?.trim() || null,
        photoUrl: data.photoUrl?.trim() || null,
        governorate: data.governorate?.trim() || null,
        academicYear: data.academicYear?.trim() || null,
    };
    
    console.log('Original form data:', data);
    console.log('Processed data before submit:', processedData);
    
    try {
      onSubmit(processedData);
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات.');
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit, (errors) => {
        console.error('Validation errors:', errors);
        
        // عرض أخطاء محددة إذا وجدت
        if (Object.keys(errors).length > 0) {
          const errorMessages = Object.values(errors).map(error => error?.message).filter(Boolean);
          console.error('Error messages:', errorMessages);
          
          if (errorMessages.length > 0) {
            // عرض كل خطأ في toast منفصل لوضوح أكبر
            errorMessages.forEach((message, index) => {
              setTimeout(() => {
                toast.error(`📝 ${message}`, {
                  duration: 5000,
                  position: 'top-center',
                  style: {
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '14px',
                    fontWeight: '500',
                  }
                });
              }, index * 500); // تأخير بسيط بين الرسائل
            });
            
            // رسالة إجمالية
            toast.error(`⚠️ يرجى إصلاح ${errorMessages.length} أخطاء في النموذج`, {
              duration: 6000,
              position: 'top-center',
              style: {
                background: '#7f1d1d',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
              }
            });
          } else {
            toast.error('يرجى مراجعة الحقول، هناك بيانات غير صحيحة.');
          }
        } else {
          toast.error('حدث خطأ في إرسال النموذج، يرجى المحاولة مرة أخرى.');
        }
    })}>
        {/* عرض حالة الطالب في وضع التعديل فقط */}
        {mode === 'edit' && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">حالة الطالب الحالية</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold ${
                      (studentStatus || 'FRESHMAN') === 'FRESHMAN'
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                    }`}>
                      {(studentStatus || 'FRESHMAN') === 'FRESHMAN' ? '🎓 مستجد' : '👨‍🎓 خريج'}
                    </span>
                    <span className="text-xs text-gray-500">(للتغيير يرجى التواصل مع الإدارة)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<IdentificationIcon className="h-6 w-6"/>} title="بيانات الهوية"/>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField label="الرقم القومي" error={errors.nationalId?.message} required>
                                <div className="relative">
                                    <Input 
                                        {...register('nationalId')} 
                                        placeholder="أدخل الرقم القومي 14 رقم"
                                        maxLength={14}
                                        className={nationalId && nationalId.length >= 7 ? 
                                            'border-blue-400 focus:border-blue-500 bg-blue-50/30' : ''
                                        }
                                    />
                                    {nationalId && nationalId.length >= 7 && (
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                                <div className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                            </div>
                                        </div>
                                    )}
                                    {nationalId && nationalId.length >= 7 && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                                {nationalId && nationalId.length >= 7 && (() => {
                                    const extracted = extractDataFromNationalId(nationalId);
                                    if (extracted) {
                                        return (
                                            <div className="mt-4 transform transition-all duration-500 ease-out animate-in slide-in-from-top-2">
                                                <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900">تم استخراج البيانات بنجاح</h4>
                                                            <p className="text-xs text-gray-500">البيانات التالية تم استخراجها من الرقم القومي</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                                                            <span className="text-sm text-gray-600">تاريخ الميلاد</span>
                                                            <span className="text-sm font-medium text-gray-900">{extracted.birthDate}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                                                            <span className="text-sm text-gray-600">النوع</span>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {extracted.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                                                            </span>
                                                        </div>
                                                        
                                                        {extracted.governorateDisplay && (
                                                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                                                                <span className="text-sm text-gray-600">محافظة الميلاد</span>
                                                                <span className="text-sm font-medium text-gray-900">{extracted.governorateDisplay}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </FormField>
                            <FormField label="تاريخ إصدار البطاقة" error={errors.idIssueDate?.message} required>
                                <Controller
                                    name="idIssueDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="اختر تاريخ إصدار البطاقة"
                                            required
                                            error={errors.idIssueDate?.message}
                                        />
                                    )}
                                />
                            </FormField>
                            <FormField label="تاريخ انتهاء البطاقة" error={errors.idExpiryDate?.message} required>
                                <Controller
                                    name="idExpiryDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="اختر تاريخ انتهاء البطاقة"
                                            required
                                            error={errors.idExpiryDate?.message}
                                        />
                                    )}
                                />
                            </FormField>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="mb-6 border-b border-tiba-gray-200 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="text-tiba-primary-600"><UserIcon className="h-6 w-6"/></div>
                                    <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">البيانات الشخصية</h3>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <span className="text-xs text-gray-600 whitespace-nowrap">ترجمة تلقائية {isTransliterating && <span className="text-emerald-600">●</span>}</span>
                                    <div className="relative w-11 h-6 flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={autoTransliterate}
                                            onChange={(e) => setAutoTransliterate(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
                                        <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FormField label="الاسم (بالعربية)" error={errors.nameAr?.message} required>
                                <Input {...register('nameAr')} placeholder="أدخل الاسم بالعربية" />
                            </FormField>
                            <FormField label="الاسم (بالانجليزية)" error={errors.nameEn?.message} required>
                                <Input
                                    {...register('nameEn')}
                                    placeholder={autoTransliterate ? "سيتم التعبئة تلقائياً..." : "أدخل الاسم بالإنجليزية"}
                                />
                            </FormField>
                            <Controller name="nationality" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        الجنسية
                                        <RequiredAsterisk />
                                    </Label>
                                    <SearchableSelect options={countries} error={errors.nationality?.message} {...field} />
                                    {errors.nationality && <p className="text-sm text-tiba-danger-500 mt-1">{errors.nationality.message}</p>}
                                </div>
                            )} />
                            <FormField label="تاريخ الميلاد" error={errors.birthDate?.message} required>
                                <Controller
                                    name="birthDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="اختر تاريخ الميلاد"
                                            required
                                            error={errors.birthDate?.message}
                                        />
                                    )}
                                />
                                {currentAge && birthDate && (
                                    <div className="mt-3 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 opacity-10 rounded-xl"></div>
                                        <div className="relative bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-xl p-4 shadow-lg">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-md">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-700">العمر الحالي</h4>
                                            </div>
                                            
                                            <div className="flex items-center justify-center gap-4">
                                                {/* السنوات */}
                                                <div className="text-center">
                                                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg px-3 py-2 shadow-md">
                                                        <div className="text-xl font-bold">{currentAge.years}</div>
                                                        <div className="text-xs font-medium opacity-90">
                                                            {currentAge.years === 1 ? 'سنة' : currentAge.years === 2 ? 'سنتان' : 'سنوات'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* فاصل */}
                                                <div className="text-gray-400 font-bold text-lg">و</div>
                                                
                                                {/* الشهور */}
                                                <div className="text-center">
                                                    <div className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-lg px-3 py-2 shadow-md">
                                                        <div className="text-xl font-bold">{currentAge.months}</div>
                                                        <div className="text-xs font-medium opacity-90">
                                                            {currentAge.months === 1 ? 'شهر' : currentAge.months === 2 ? 'شهران' : 'أشهر'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* رسالة إضافية للأطفال */}
                                            {currentAge.years < 18 && (
                                                <div className="mt-3 text-center">
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        قاصر (أقل من 18 سنة)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </FormField>
                            <Controller name="gender" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        النوع
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={genderOptions} error={errors.gender?.message} {...field} />
                                    {errors.gender && <p className="text-sm text-tiba-danger-500 mt-1">{errors.gender.message}</p>}
                                </div>
                            )} />
                            <Controller name="maritalStatus" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        الحالة الاجتماعية
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={maritalStatusOptions} error={errors.maritalStatus?.message} {...field} />
                                    {errors.maritalStatus && <p className="text-sm text-tiba-danger-500 mt-1">{errors.maritalStatus.message}</p>}
                                </div>
                            )} />
                            <Controller name="religion" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        الديانة
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={religionOptions} error={errors.religion?.message} {...field} />
                                    {errors.religion && <p className="text-sm text-tiba-danger-500 mt-1">{errors.religion.message}</p>}
                                </div>
                            )} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<HomeIcon className="h-6 w-6"/>} title="بيانات السكن"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Controller name="country" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        الدولة
                                        <RequiredAsterisk />
                                    </Label>
                                    <SearchableSelect options={countryOptions} error={errors.country?.message} {...field} />
                                    {errors.country && <p className="text-sm text-tiba-danger-500 mt-1">{errors.country.message}</p>}
                                </div>
                            )} />
                            <Controller 
                                name="governorate" 
                                control={control} 
                                render={({ field }) => (
                                    <SearchableSelect 
                                        label="المحافظة" 
                                        options={governorateOptions} 
                                        error={errors.governorate?.message} 
                                        disabled={!selectedCountry || governorateOptions.length === 0}
                                        placeholder={selectedCountry ? "اختر المحافظة" : "اختر الدولة أولاً"}
                                        {...field} 
                                    />
                                )} 
                            />
                            <Controller 
                                name="city" 
                                control={control} 
                                render={({ field }) => (
                                    <div className="flex flex-col space-y-2">
                                        <Label className="flex items-center">
                                            المدينة
                                            <RequiredAsterisk />
                                        </Label>
                                        <SearchableSelect 
                                            options={cityOptions} 
                                            error={errors.city?.message} 
                                            disabled={!selectedGovernorate || cityOptions.length === 0}
                                            placeholder={selectedGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"}
                                            {...field} 
                                        />
                                        {errors.city && <p className="text-sm text-tiba-danger-500 mt-1">{errors.city.message}</p>}
                                    </div>
                                )} 
                            />
                            <div className="lg:col-span-2">
                                <FormField label="العنوان" error={errors.address?.message} required>
                                    <Input {...register('address')} />
                                </FormField>
                            </div>
                            <FormField label="محل الإقامة" error={errors.residenceAddress?.message} required>
                                <Input {...register('residenceAddress')} />
                            </FormField>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<PhoneIcon className="h-6 w-6"/>} title="بيانات الاتصال"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FormField label="رقم الهاتف" error={errors.phone?.message} required>
                                <Input {...register('phone')} />
                            </FormField>
                            <FormField label="البريد الإلكتروني" error={errors.email?.message}>
                                <Input type="email" {...register('email')}/>
                            </FormField>
                            <FormField label="الهاتف الأرضي" error={errors.landline?.message}>
                                <Input {...register('landline')} />
                            </FormField>
                            <FormField label="واتساب" error={errors.whatsapp?.message} required>
                                <Input {...register('whatsapp')} placeholder="رقم واتساب (مطلوب)" />
                            </FormField>
                            <FormField label="فيسبوك" error={errors.facebook?.message}>
                                <Input {...register('facebook')} />
                            </FormField>
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<UserGroupIcon className="h-6 w-6"/>} title="بيانات ولي الأمر"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FormField label="اسم ولي الأمر" error={errors.guardianName?.message} required>
                                <Input {...register('guardianName')} placeholder="أدخل اسم ولي الأمر" />
                            </FormField>
                            <FormField label="صلة القرابة" error={errors.guardianRelation?.message} required>
                                <Input {...register('guardianRelation')} />
                            </FormField>
                            <FormField label="وظيفة ولي الأمر" error={errors.guardianJob?.message}>
                                <Input {...register('guardianJob')} />
                            </FormField>
                            <FormField label="رقم هاتف ولي الأمر" error={errors.guardianPhone?.message} required>
                                <Input {...register('guardianPhone')} />
                            </FormField>
                            <FormField label="البريد الإلكتروني لولي الأمر" error={errors.guardianEmail?.message}>
                                <Input type="email" {...register('guardianEmail')}/>
                            </FormField>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<BookOpenIcon className="h-6 w-6"/>} title="البيانات التعليمية"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Controller name="educationType" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        نوع المؤهل
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={educationTypeOptions} error={errors.educationType?.message} {...field} />
                                    {errors.educationType && <p className="text-sm text-tiba-danger-500 mt-1">{errors.educationType.message}</p>}
                                </div>
                            )} />
                            <FormField label="اسم المدرسة/المعهد" error={errors.schoolName?.message} required>
                                <Input {...register('schoolName')} />
                            </FormField>
                            <FormField label="الإدارة التعليمية" error={errors.educationalAdministration?.message}>
                                <Input {...register('educationalAdministration')} placeholder="اختياري" />
                            </FormField>
                            <Controller name="graduationDate" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        سنة الحصول على آخر مؤهل
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect 
                                        options={graduationYearOptions} 
                                        error={errors.graduationDate?.message} 
                                        placeholder="اختر سنة الحصول على آخر مؤهل"
                                        {...field} 
                                        value={field.value ? new Date(field.value).getFullYear().toString() : field.value}
                                    />
                                    {errors.graduationDate && <p className="text-sm text-tiba-danger-500 mt-1">{errors.graduationDate.message}</p>}
                                </div>
                            )} />
                            <FormField label="المجموع الكلي" error={errors.totalGrade?.message}>
                                <Input type="number" {...register('totalGrade', { setValueAs: v => (v === '' ? null : Number(v)) })} />
                            </FormField>
                            <FormField label="النسبة المئوية" error={errors.gradePercentage?.message}>
                                <Input type="number" step="0.01" {...register('gradePercentage', { setValueAs: v => (v === '' ? null : Number(v)) })} />
                            </FormField>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <SectionHeader icon={<ClipboardDocumentListIcon className="h-6 w-6"/>} title="بيانات البرنامج"/>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Controller name="programId" control={control} render={({ field }) => <SearchableSelect label="البرنامج" options={programOptions} error={errors.programId?.message} value={field.value ? String(field.value) : ''} onChange={(val) => field.onChange(val ? Number(val) : null)} disabled={mode === 'edit'} />} />
                            <Controller name="enrollmentType" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        نوع الالتحاق
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={enrollmentTypeOptions} error={errors.enrollmentType?.message} {...field} />
                                    {errors.enrollmentType && <p className="text-sm text-tiba-danger-500 mt-1">{errors.enrollmentType.message}</p>}
                                </div>
                            )} />
                            <Controller name="programType" control={control} render={({ field }) => (
                                <div className="flex flex-col space-y-2">
                                    <Label className="flex items-center">
                                        نوع البرنامج
                                        <RequiredAsterisk />
                                    </Label>
                                    <SimpleSelect options={programTypeOptions} error={errors.programType?.message} {...field} />
                                    {errors.programType && <p className="text-sm text-tiba-danger-500 mt-1">{errors.programType.message}</p>}
                                </div>
                            )} />
                            <Controller 
                                name="academicYear" 
                                control={control} 
                                render={({ field }) => (
                                    <SimpleSelect 
                                        label="العام الدراسي" 
                                        options={academicYearOptions} 
                                        error={errors.academicYear?.message}
                                        {...field}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </Card>


            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <div className="p-6">
                         <SectionHeader icon={<UserIcon className="h-6 w-6"/>} title="صورة المتدرب"/>
                         <Controller
                            name="photoUrl"
                            control={control}
                            render={({ field }) => (
                                <PhotoUpload
                                    folder="trainees"
                                    onUploadComplete={(url: string) => field.onChange(url)}
                                    currentPhotoUrl={field.value}
                                />
                            )}
                        />
                    </div>
                </Card>
            </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-tiba-gray-200 flex justify-end gap-3 sticky bottom-0 mt-6">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/trainees')}>
                إلغاء
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<CheckIcon className="h-5 w-5" />}>
                {isSubmitting
                ? (mode === 'add' ? 'جاري الإضافة...' : 'جاري الحفظ...')
                : (mode === 'add' ? 'إضافة متدرب' : 'حفظ التعديلات')}
            </Button>
        </div>
    </form>
  );
} 