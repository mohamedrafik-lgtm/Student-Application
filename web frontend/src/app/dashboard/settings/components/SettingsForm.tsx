"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI, uploadFile, getImageUrl } from "@/lib/api";
import { toast } from "react-hot-toast";
import { 
  BuildingOffice2Icon, 
  UserIcon, 
  MapPinIcon, 
  PhoneIcon, 
  LinkIcon,
  PhotoIcon, 
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  EyeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BoltIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

interface Position {
  x: number;
  y: number;
}

interface SystemSettings {
  id: number;
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  centerLogo?: string | null;
  facebookPageUrl?: string | null;
  licenseNumber?: string | null;
  loginUrl?: string | null;
  managerPhoneNumber?: string | null;
  showTraineeDebtsToTraineeAffairs: boolean;
  printingAmount: number;
  timezone?: string;
  idCardBackgroundImage?: string | null;
  idCardLogoPosition?: Position;
  idCardNamePosition?: Position;
  idCardPhotoPosition?: Position;
  idCardNationalIdPosition?: Position;
  idCardProgramPosition?: Position;
  idCardCenterNamePosition?: Position;
  idCardAdditionalText?: string | null;
  idCardAdditionalTextPosition?: Position;
  idCardWidth?: number;
  idCardHeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

const formSchema = z.object({
  centerName: z.string().min(3, "يجب أن يكون اسم المركز 3 أحرف على الأقل"),
  centerManagerName: z.string().min(3, "يجب أن يكون اسم المدير 3 أحرف على الأقل"),
  centerAddress: z.string().min(10, "العنوان قصير جداً"),
  centerLogo: z.string().optional(),
  facebookPageUrl: z.string().url("رابط الفيسبوك غير صالح").optional().or(z.literal("")),
  licenseNumber: z.string().optional(),
  loginUrl: z.string().url("رابط تسجيل الدخول غير صالح").optional().or(z.literal("")),
  managerPhoneNumber: z.string().optional(),
  showTraineeDebtsToTraineeAffairs: z.boolean(),
  printingAmount: z.number().min(0, "مبلغ المطبوعات يجب أن يكون 0 أو أكثر"),
  timezone: z.string().optional().default("Africa/Cairo"),
  idCardBackgroundImage: z.string().optional(),
  idCardLogoPosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 20, y: 20 }),
  idCardNamePosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 100, y: 60 }),
  idCardPhotoPosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 20, y: 60 }),
  idCardNationalIdPosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 100, y: 90 }),
  idCardProgramPosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 100, y: 120 }),
  idCardCenterNamePosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 100, y: 150 }),
  idCardAdditionalText: z.string().optional(),
  idCardAdditionalTextPosition: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 100, y: 180 }),
  idCardWidth: z.number().min(200, "عرض الكارنيه يجب أن يكون 200 بكسل على الأقل").default(320),
  idCardHeight: z.number().min(100, "ارتفاع الكارنيه يجب أن يكون 100 بكسل على الأقل").default(200),
});

type FormData = z.infer<typeof formSchema>;

interface SettingsFormProps {
  settings?: SystemSettings | null;
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const { userPermissions } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.centerLogo || null);

  // تصحيح مسارات الصور عند تحميل البيانات
  useEffect(() => {
    if (settings) {
      // تصحيح مسار خلفية الكارنيه إذا كان موجوداً
      if (settings.idCardBackgroundImage) {
        console.log('Original background image path:', settings.idCardBackgroundImage);
        
        // إذا كانت الصورة في المجلد الرئيسي وليست في مجلد idcards، نقوم بتصحيح المسار
        if (settings.idCardBackgroundImage.includes('/uploads/') && 
            !settings.idCardBackgroundImage.includes('/uploads/idcards/')) {
          const filename = settings.idCardBackgroundImage.split('/').pop();
          if (filename) {
            const correctedPath = `/uploads/idcards/${filename}`;
            console.log('Corrected background image path:', correctedPath);
            form.setValue('idCardBackgroundImage', correctedPath);
          }
        }
      }
    }
  }, [settings]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      centerName: settings?.centerName || "",
      centerManagerName: settings?.centerManagerName || "",
      centerAddress: settings?.centerAddress || "",
      centerLogo: settings?.centerLogo || "",
      facebookPageUrl: settings?.facebookPageUrl || "",
      licenseNumber: settings?.licenseNumber || "",
      loginUrl: settings?.loginUrl || "",
      managerPhoneNumber: settings?.managerPhoneNumber || "",
      showTraineeDebtsToTraineeAffairs: settings?.showTraineeDebtsToTraineeAffairs || false,
      printingAmount: settings?.printingAmount || 0,
      timezone: settings?.timezone || "Africa/Cairo",
      idCardBackgroundImage: settings?.idCardBackgroundImage || "",
      idCardLogoPosition: settings?.idCardLogoPosition || { x: 20, y: 20 },
      idCardNamePosition: settings?.idCardNamePosition || { x: 100, y: 60 },
      idCardPhotoPosition: settings?.idCardPhotoPosition || { x: 20, y: 60 },
      idCardNationalIdPosition: settings?.idCardNationalIdPosition || { x: 100, y: 90 },
      idCardProgramPosition: settings?.idCardProgramPosition || { x: 100, y: 120 },
      idCardCenterNamePosition: settings?.idCardCenterNamePosition || { x: 100, y: 150 },
      idCardAdditionalText: settings?.idCardAdditionalText || "",
      idCardAdditionalTextPosition: settings?.idCardAdditionalTextPosition || { x: 100, y: 180 },
      idCardWidth: settings?.idCardWidth || 320,
      idCardHeight: settings?.idCardHeight || 200,
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const data = await uploadFile(file, 'logos');
      // تنسيق عنوان URL للوجو بشكل صحيح
      form.setValue('centerLogo', data.url);
      setLogoPreview(data.url);
      toast.success('تم رفع اللوجو بنجاح');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('فشل في رفع اللوجو');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    form.setValue('centerLogo', '');
    setLogoPreview(null);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      
      toast.success('تم حفظ الإعدادات بنجاح');
      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -m-6 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Enhanced Hero Header */}
        <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-8 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 space-x-reverse mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <Cog6ToothIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  إعدادات النظام المتقدمة
                </h1>
                <p className="text-slate-600 mt-2">إدارة شاملة لإعدادات المركز والنظام الأساسية</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 space-x-reverse p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <BoltIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">تحديث فوري للإعدادات</span>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">حماية عالية للبيانات</span>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">تحسين مستمر للأداء</span>
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Grid Layout for Modern Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* معلومات المركز الأساسية */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3 space-x-reverse text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                      <BuildingOffice2Icon className="h-5 w-5 text-white" />
                    </div>
                    <span>معلومات المركز الأساسية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="centerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                            <BuildingOffice2Icon className="h-4 w-4 text-blue-500" />
                            <span>اسم المركز</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="أدخل اسم المركز" 
                              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="centerManagerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                            <UserIcon className="h-4 w-4 text-green-500" />
                            <span>اسم مدير المركز</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="أدخل اسم مدير المركز" 
                              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="centerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                            <MapPinIcon className="h-4 w-4 text-red-500" />
                            <span>عنوان المركز</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="أدخل عنوان المركز الكامل" 
                              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                            <CreditCardIcon className="h-4 w-4 text-purple-500" />
                            <span>رقم ترخيص المركز</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="أدخل رقم الترخيص" 
                              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                            <GlobeAltIcon className="h-4 w-4 text-indigo-500" />
                            <span>المنطقة الزمنية</span>
                          </FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="h-11 w-full rounded-md border border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 px-3"
                            >
                              <option value="Africa/Cairo">القاهرة - مصر (GMT+2)</option>
                              <option value="Asia/Riyadh">الرياض - السعودية (GMT+3)</option>
                              <option value="Asia/Dubai">دبي - الإمارات (GMT+4)</option>
                              <option value="Europe/Berlin">برلين - ألمانيا (GMT+1)</option>
                              <option value="Europe/London">لندن - بريطانيا (GMT+0)</option>
                              <option value="America/New_York">نيويورك - أمريكا (GMT-5)</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-slate-500 mt-1">
                            ⏰ يستخدم لتحديد مواعيد بدء وانتهاء الاختبارات بشكل دقيق
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* لوجو المركز */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3 space-x-reverse text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                      <PhotoIcon className="h-5 w-5 text-white" />
                    </div>
                    <span>لوجو المركز</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {logoPreview ? (
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl mx-auto">
                          <img 
                            src={logoPreview ? getImageUrl(logoPreview) : '/images/placeholder.png'} 
                            alt="لوجو المركز" 
                            className="w-full h-full object-fill"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg transition-all duration-200"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center space-x-2 space-x-reverse p-3 bg-green-50 rounded-xl border border-green-200">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">تم رفع اللوجو بنجاح</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 hover:from-blue-50 hover:to-blue-100 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <PhotoIcon className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-slate-600 mb-4 font-medium">لم يتم رفع لوجو بعد</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <span className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 font-medium">
                          {uploadingLogo ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              جاري الرفع...
                            </>
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                              رفع لوجو
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* معلومات الاتصال */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-green-50/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3 space-x-reverse text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    </div>
                    <span>معلومات الاتصال</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="managerPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                          <PhoneIcon className="h-4 w-4 text-green-500" />
                          <span>رقم هاتف مدير المركز</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="01234567890" 
                            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebookPageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                          <LinkIcon className="h-4 w-4 text-blue-500" />
                          <span>رابط صفحة الفيسبوك</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://facebook.com/..." 
                            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loginUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                          <LinkIcon className="h-4 w-4 text-purple-500" />
                          <span>رابط تسجيل الدخول</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/login" 
                            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* إعدادات النظام */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3 space-x-reverse text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                      <Cog6ToothIcon className="h-5 w-5 text-white" />
                    </div>
                    <span>إعدادات النظام</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="printingAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                          <BanknotesIcon className="h-4 w-4 text-green-500" />
                          <span>مبلغ المطبوعات</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white text-slate-900 placeholder:text-slate-500"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showTraineeDebtsToTraineeAffairs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center space-x-2 space-x-reverse">
                          <EyeIcon className="h-4 w-4 text-blue-500" />
                          <span>إظهار بنود مديونية المتدربين</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="mr-3 text-sm font-medium text-slate-700">
                              {field.value ? (
                                <span className="flex items-center space-x-2 space-x-reverse text-green-700">
                                  <CheckIcon className="h-4 w-4" />
                                  <span>مفعل</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-2 space-x-reverse text-red-700">
                                  <XMarkIcon className="h-4 w-4" />
                                  <span>غير مفعل</span>
                                </span>
                              )}
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <Link
                      href="/dashboard/settings/id-card-designs"
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Cog6ToothIcon className="w-5 h-5 ml-2" />
                      مصمم الكارنيهات المتطور
                    </Link>
                    <Link
                      href="/dashboard/settings/locations"
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <MapPinIcon className="w-5 h-5 ml-2" />
                      إدارة المواقع الجغرافية
                    </Link>
                    {userPermissions?.hasPermission('dashboard.settings.mobile-app', 'manage') && (
                      <Link
                        href="/dashboard/settings/mobile-app"
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <DevicePhoneMobileIcon className="w-5 h-5 ml-2" />
                        إعدادات التطبيق
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center pt-8">
              <Button
                type="submit"
                disabled={loading}
                className="px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-3" />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}