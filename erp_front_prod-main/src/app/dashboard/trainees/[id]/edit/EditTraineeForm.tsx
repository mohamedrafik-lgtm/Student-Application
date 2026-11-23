"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormData } from "../../schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUpload } from "@/components/ui/photo-upload";
import DatePicker from "@/components/ui/date-picker";
import TraineeEditHistoryModal from "@/components/ui/TraineeEditHistoryModal";
import { ClockIcon } from "@heroicons/react/24/outline";

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

type EnrollmentType = "REGULAR" | "DISTANCE" | "BOTH";
type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
type ProgramType = "SUMMER" | "WINTER" | "ANNUAL";
type Gender = "MALE" | "FEMALE";
type Religion = "ISLAM" | "CHRISTIANITY" | "JUDAISM";
type EducationType = "PREPARATORY" | "INDUSTRIAL_SECONDARY" | "COMMERCIAL_SECONDARY" | "AGRICULTURAL_SECONDARY" | "AZHAR_SECONDARY" | "GENERAL_SECONDARY" | "UNIVERSITY" | "INDUSTRIAL_APPRENTICESHIP";

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  enrollmentType: EnrollmentType;
  maritalStatus: MaritalStatus;
  nationalId: string;
  idIssueDate: Date;
  idExpiryDate: Date;
  programType: ProgramType;
  nationality: string;
  gender: Gender;
  birthDate: Date;
  residenceAddress: string;
  photoUrl: string | null;
  religion: Religion;
  programId: number;
  country: string;
  governorate: string | null;
  city: string;
  address: string;
  phone: string;
  email: string;
  guardianPhone: string;
  guardianEmail: string | null;
  guardianJob: string;
  guardianRelation: string;
  guardianName: string;
  landline: string | null;
  whatsapp: string | null;
  facebook: string | null;
  educationType: EducationType;
  schoolName: string;
  educationalAdministration: string | null;
  graduationDate: Date;
  totalGrade: number | null;
  gradePercentage: number | null;
  sportsActivity: string | null;
  culturalActivity: string | null;
  educationalActivity: string | null;
  notes: string | null;
  program: TrainingProgram;
}

interface EditTraineeFormProps {
  trainee: Trainee;
  programs: TrainingProgram[];
}

export default function EditTraineeForm({ trainee, programs }: EditTraineeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nameAr: trainee.nameAr,
      nameEn: trainee.nameEn,
      enrollmentType: trainee.enrollmentType,
      maritalStatus: trainee.maritalStatus,
      nationalId: trainee.nationalId,
      idIssueDate: trainee.idIssueDate.toISOString().split('T')[0],
      idExpiryDate: trainee.idExpiryDate.toISOString().split('T')[0],
      programType: trainee.programType,
      nationality: trainee.nationality,
      gender: trainee.gender,
      birthDate: trainee.birthDate.toISOString().split('T')[0],
      residenceAddress: trainee.residenceAddress,
      photoUrl: trainee.photoUrl || "",
      religion: trainee.religion,
      programId: trainee.programId,
      country: trainee.country,
      governorate: trainee.governorate || "",
      city: trainee.city,
      address: trainee.address,
      phone: trainee.phone,
      email: trainee.email,
      guardianPhone: trainee.guardianPhone,
      guardianEmail: trainee.guardianEmail || "",
      guardianJob: trainee.guardianJob,
      guardianRelation: trainee.guardianRelation,
      guardianName: trainee.guardianName,
      landline: trainee.landline || "",
      whatsapp: trainee.whatsapp || "",
      facebook: trainee.facebook || "",
      educationType: trainee.educationType,
      schoolName: trainee.schoolName,
      educationalAdministration: trainee.educationalAdministration || "",
      graduationDate: new Date(trainee.graduationDate).getFullYear().toString(),
      totalGrade: trainee.totalGrade || 0,
      gradePercentage: trainee.gradePercentage || 0,
      academicYear: trainee.academicYear || "",
      status: trainee.traineeStatus === "NEW" ? "FRESHMAN" : "GRADUATE",
      sportsActivity: trainee.sportsActivity || "",
      culturalActivity: trainee.culturalActivity || "",
      educationalActivity: trainee.educationalActivity || "",
      notes: trainee.notes || "",
    },
  });

  // مراقبة الرقم القومي لاستخراج البيانات
  const nationalId = form.watch('nationalId');
  
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

  // استخراج البيانات من الرقم القومي عند تغييره مع الملء التلقائي (مع تأخير بسيط)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nationalId && nationalId.length >= 7 && nationalId !== trainee.nationalId) {
        const extractedData = extractDataFromNationalId(nationalId);
        
        if (extractedData && extractedData.isExtracted) {
          // تعبئة تاريخ الميلاد دائماً عند تغيير الرقم القومي
          form.setValue('birthDate', extractedData.birthDate);
          
          // تعبئة النوع دائماً عند تغيير الرقم القومي
          form.setValue('gender', extractedData.gender as 'MALE' | 'FEMALE');
          
          // تعبئة المحافظة إذا كانت مصر هي الدولة المختارة
          const currentCountry = form.getValues('country');
          if (currentCountry === 'EG' && extractedData.governorateValue) {
            form.setValue('governorate', extractedData.governorateValue);
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
  }, [nationalId, trainee.nationalId, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // تحويل التواريخ من النص إلى كائنات Date
      const transformedData = {
        ...data,
        birthDate: new Date(data.birthDate).toISOString(),
        idIssueDate: new Date(data.idIssueDate).toISOString(),
        idExpiryDate: new Date(data.idExpiryDate).toISOString(),
        // تحويل سنة التخرج إلى تاريخ (أول يناير من السنة المختارة)
        graduationDate: new Date(`${data.graduationDate}-01-01`).toISOString(),
        // تحويل الأرقام من النص إلى أرقام
        programId: Number(data.programId),
        totalGrade: data.totalGrade ? Number(data.totalGrade) : null,
        gradePercentage: data.gradePercentage ? Number(data.gradePercentage) : null,
        // التأكد من أن educationalAdministration يُرسل بشكل صحيح
        educationalAdministration: data.educationalAdministration || undefined,
      };

      console.log('🔍 DEBUG - graduationDate:', data.graduationDate);
      console.log('🔍 DEBUG - transformed:', transformedData.graduationDate);
      console.log('🔍 DEBUG - All data:', JSON.stringify(transformedData, null, 2));

      await fetchAPI(`/trainees/${trainee.id}`, {
        method: "PATCH",
        body: JSON.stringify(transformedData),
      });

      toast.success("تم تحديث بيانات المتدرب بنجاح");
      router.push("/dashboard/trainees");
      router.refresh();
    } catch (error) {
      console.error("Error updating trainee:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث البيانات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* صورة المتدرب */}
        <Card>
          <CardHeader>
            <CardTitle>صورة المتدرب</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhotoUpload
                      currentPhotoUrl={field.value}
                      onUploadComplete={(url) => field.onChange(url)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* بيانات الهوية */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الهوية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="nationalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الرقم القومي</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="الرقم القومي 14 رقم" 
                        {...field} 
                        maxLength={14}
                        className={field.value && field.value.length >= 7 ? 
                            'border-blue-400 focus:border-blue-500 bg-blue-50/30' : ''
                        }
                      />
                      {field.value && field.value.length >= 7 && (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      )}
                      {field.value && field.value.length >= 7 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {field.value && field.value.length >= 7 && (() => {
                    const extracted = extractDataFromNationalId(field.value);
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="idIssueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ إصدار البطاقة</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="اختر تاريخ إصدار البطاقة"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="idExpiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ انتهاء البطاقة</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="اختر تاريخ انتهاء البطاقة"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* البيانات الشخصية */}
        <Card>
          <CardHeader>
            <CardTitle>البيانات الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالعربية</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل الاسم بالعربية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالإنجليزية</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name in English" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الجنسية</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل الجنسية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الميلاد</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="اختر تاريخ الميلاد"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النوع</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">ذكر</SelectItem>
                      <SelectItem value="FEMALE">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الديانة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الديانة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ISLAM">الإسلام</SelectItem>
                      <SelectItem value="CHRISTIANITY">المسيحية</SelectItem>
                      <SelectItem value="JUDAISM">اليهودية</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة الاجتماعية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة الاجتماعية" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SINGLE">أعزب</SelectItem>
                      <SelectItem value="MARRIED">متزوج</SelectItem>
                      <SelectItem value="DIVORCED">مطلق</SelectItem>
                      <SelectItem value="WIDOWED">أرمل</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* بيانات البرنامج */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات البرنامج</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البرنامج</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر البرنامج" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enrollmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الالتحاق</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الالتحاق" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="REGULAR">انتظام</SelectItem>
                      <SelectItem value="DISTANCE">انتساب</SelectItem>
                      <SelectItem value="BOTH">الكل</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="programType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع البرنامج</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع البرنامج" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SUMMER">صيفي (فبراير)</SelectItem>
                      <SelectItem value="WINTER">شتوي (اكتوبر)</SelectItem>
                      <SelectItem value="ANNUAL">سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* بيانات الإقامة */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الإقامة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الدولة</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل الدولة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="governorate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المحافظة</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل المحافظة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المدينة</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل المدينة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل العنوان بالتفصيل" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residenceAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محل الإقامة</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل محل الإقامة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* بيانات الاتصال */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الاتصال</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="01xxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="landline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الهاتف الأرضي</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="02xxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الواتساب</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="01xxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="example@domain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حساب فيسبوك</FormLabel>
                  <FormControl>
                    <Input placeholder="رابط حساب فيسبوك" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* بيانات ولي الأمر */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات ولي الأمر</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="guardianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم ولي الأمر <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم ولي الأمر" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardianRelation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>صلة القرابة <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل صلة القرابة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardianJob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وظيفة ولي الأمر</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل وظيفة ولي الأمر" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardianPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم هاتف ولي الأمر <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="01xxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardianEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني لولي الأمر</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="example@domain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* البيانات التعليمية */}
        <Card>
          <CardHeader>
            <CardTitle>البيانات التعليمية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="educationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المؤهل</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المؤهل" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PREPARATORY">اعدادي</SelectItem>
                      <SelectItem value="INDUSTRIAL_SECONDARY">ثانوي فني صناعي</SelectItem>
                      <SelectItem value="COMMERCIAL_SECONDARY">ثانوي فني تجاري</SelectItem>
                      <SelectItem value="AGRICULTURAL_SECONDARY">ثانوي فني زراعي</SelectItem>
                      <SelectItem value="AZHAR_SECONDARY">ثانوي أزهري</SelectItem>
                      <SelectItem value="GENERAL_SECONDARY">ثانوي عام</SelectItem>
                      <SelectItem value="UNIVERSITY">بكالوريوس - ليسانس</SelectItem>
                      <SelectItem value="INDUSTRIAL_APPRENTICESHIP">تلمذة صناعية</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المدرسة/المعهد</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم المدرسة/المعهد" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="educationalAdministration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الإدارة التعليمية</FormLabel>
                  <FormControl>
                    <Input placeholder="اختياري" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="graduationDate"
              render={({ field }) => {
                // خيارات سنوات التخرج (من السنة الحالية إلى 1950)
                const currentYear = new Date().getFullYear();
                const graduationYearOptions = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => {
                  const year = currentYear - i;
                  return { value: year.toString(), label: year.toString() };
                });
                
                return (
                  <FormItem>
                    <FormLabel>سنة الحصول على آخر مؤهل</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر سنة الحصول على آخر مؤهل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {graduationYearOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="totalGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المجموع الكلي</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النسبة المئوية</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* الأنشطة */}
        <Card>
          <CardHeader>
            <CardTitle>الأنشطة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="sportsActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النشاط الرياضي</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل النشاط الرياضي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="culturalActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النشاط الثقافي</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل النشاط الثقافي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="educationalActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النشاط التعليمي</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل النشاط التعليمي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ملاحظات */}
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل أي ملاحظات إضافية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <ClockIcon className="h-5 w-5" />
            سجل التعديلات
          </Button>
          <Button type="submit" className="bg-[#D35400] hover:bg-[#D35400]/90" disabled={loading}>
            {loading ? "جاري الحفظ..." : "تحديث البيانات"}
          </Button>
        </div>
      </form>
    </Form>
    
    {/* Modal سجل التعديلات */}
    <TraineeEditHistoryModal
      traineeId={trainee.id}
      traineeName={trainee.nameAr}
      isOpen={showHistoryModal}
      onClose={() => setShowHistoryModal(false)}
    />
    </>
  );
}