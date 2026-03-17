"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import IdCardDesigner from "../components/IdCardDesigner";
import { IdentificationIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";
import { Card } from "@/app/components/ui/Card";

interface Position {
  x: number;
  y: number;
}

interface ElementSize {
  width: number;
  height: number;
}

interface SystemSettings {
  id: number;
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  centerLogo?: string | null;
  facebookPageUrl?: string | null;
  licenseNumber?: string | null;
  showTraineeDebtsToTraineeAffairs: boolean;
  printingAmount: number;
  idCardBackgroundImage?: string | null;
  idCardLogoPosition?: Position;
  idCardNamePosition?: Position;
  idCardPhotoPosition?: Position;
  idCardNationalIdPosition?: Position;
  idCardProgramPosition?: Position;
  idCardCenterNamePosition?: Position;
  idCardAdditionalText?: string | null;
  idCardAdditionalTextPosition?: Position;
  idCardQrCodePosition?: Position;
  idCardWidth?: number;
  idCardHeight?: number;
  
  // إعدادات حجم العناصر
  idCardLogoSize?: ElementSize;
  idCardPhotoSize?: ElementSize;
  idCardNameSize?: number;
  idCardNationalIdSize?: number;
  idCardProgramSize?: number;
  idCardCenterNameSize?: number;
  idCardAdditionalTextSize?: number;
  idCardQrCodeSize?: ElementSize;
  
  // إعدادات ظهور العناصر
  idCardLogoVisible?: boolean;
  idCardPhotoVisible?: boolean;
  idCardNameVisible?: boolean;
  idCardNationalIdVisible?: boolean;
  idCardProgramVisible?: boolean;
  idCardCenterNameVisible?: boolean;
  idCardAdditionalTextVisible?: boolean;
  idCardQrCodeVisible?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export default function IdCardSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // جلب إعدادات النظام
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetchAPI("/settings");
        setSettings(response.settings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("حدث خطأ أثناء تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // تحديث إعدادات الكارنيه
  const handleIdCardSettingsChange = (newSettings: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      ...newSettings,
    });
  };

  // حفظ الإعدادات
  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      // إرسال جميع البيانات المطلوبة مع إعدادات الكارنيه
      const updatedSettings = {
        // الحقول الإلزامية
        centerName: settings.centerName,
        centerManagerName: settings.centerManagerName,
        centerAddress: settings.centerAddress,
        showTraineeDebtsToTraineeAffairs: settings.showTraineeDebtsToTraineeAffairs,
        printingAmount: settings.printingAmount,
        // حقول اختيارية إضافية
        centerLogo: settings.centerLogo,
        facebookPageUrl: settings.facebookPageUrl,
        licenseNumber: settings.licenseNumber,
        // إعدادات الكارنيه
        idCardBackgroundImage: settings.idCardBackgroundImage,
        idCardLogoPosition: settings.idCardLogoPosition,
        idCardNamePosition: settings.idCardNamePosition,
        idCardPhotoPosition: settings.idCardPhotoPosition,
        idCardNationalIdPosition: settings.idCardNationalIdPosition,
        idCardProgramPosition: settings.idCardProgramPosition,
        idCardCenterNamePosition: settings.idCardCenterNamePosition,
        idCardAdditionalText: settings.idCardAdditionalText,
        idCardAdditionalTextPosition: settings.idCardAdditionalTextPosition,
        idCardWidth: settings.idCardWidth,
        idCardHeight: settings.idCardHeight,
        // إعدادات حجم العناصر
        idCardLogoSize: settings.idCardLogoSize,
        idCardPhotoSize: settings.idCardPhotoSize,
        idCardNameSize: settings.idCardNameSize,
        idCardNationalIdSize: settings.idCardNationalIdSize,
        idCardProgramSize: settings.idCardProgramSize,
        idCardCenterNameSize: settings.idCardCenterNameSize,
        idCardAdditionalTextSize: settings.idCardAdditionalTextSize,
        // إعدادات ظهور العناصر
        idCardLogoVisible: settings.idCardLogoVisible,
        idCardPhotoVisible: settings.idCardPhotoVisible,
        idCardNameVisible: settings.idCardNameVisible,
        idCardNationalIdVisible: settings.idCardNationalIdVisible,
        idCardProgramVisible: settings.idCardProgramVisible,
        idCardCenterNameVisible: settings.idCardCenterNameVisible,
        idCardAdditionalTextVisible: settings.idCardAdditionalTextVisible,
      };
      
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
      
      toast.success("تم حفظ إعدادات الكارنيه بنجاح");
    } catch (error) {
      console.error("Error saving ID card settings:", error);
      toast.error("حدث خطأ أثناء حفظ إعدادات الكارنيه");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-tiba-primary-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <IdentificationIcon className="h-8 w-8 text-tiba-primary-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="إعدادات كارنيه الطالب" 
        description="تخصيص تصميم وإعدادات كارنيه الطالب"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إعدادات النظام', href: '/dashboard/settings' },
          { label: 'كارنيه الطالب' }
        ]}
      />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/settings" className="inline-flex items-center px-4 py-2 rounded-xl text-tiba-primary-600 hover:bg-tiba-primary-50 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>العودة إلى الإعدادات العامة</span>
          </Link>
        </div>
        
        {settings && (
          <>
            <Card className="overflow-hidden shadow-xl border-0 bg-white mb-8">
              <div className="bg-gradient-to-r from-tiba-primary-600 to-tiba-secondary-600 p-6 text-white">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ml-6 shadow-lg border border-white/30">
                    <IdentificationIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">تصميم كارنيه الطالب</h2>
                    <p className="text-white/80">
                      قم بتخصيص تصميم كارنيه الطالب من خلال تحديد المواضع والأحجام وإظهار أو إخفاء العناصر المختلفة
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <IdCardDesigner 
                  settings={{
                    idCardBackgroundImage: settings.idCardBackgroundImage,
                    idCardLogoPosition: settings.idCardLogoPosition,
                    idCardNamePosition: settings.idCardNamePosition,
                    idCardPhotoPosition: settings.idCardPhotoPosition,
                    idCardNationalIdPosition: settings.idCardNationalIdPosition,
                    idCardProgramPosition: settings.idCardProgramPosition,
                    idCardCenterNamePosition: settings.idCardCenterNamePosition,
                    idCardAdditionalText: settings.idCardAdditionalText,
                    idCardAdditionalTextPosition: settings.idCardAdditionalTextPosition,
                    idCardWidth: settings.idCardWidth || 320,
                    idCardHeight: settings.idCardHeight || 200,
                    centerName: settings.centerName,
                    centerLogo: settings.centerLogo,
                    idCardLogoSize: settings.idCardLogoSize,
                    idCardPhotoSize: settings.idCardPhotoSize,
                    idCardNameSize: settings.idCardNameSize,
                    idCardNationalIdSize: settings.idCardNationalIdSize,
                    idCardProgramSize: settings.idCardProgramSize,
                    idCardCenterNameSize: settings.idCardCenterNameSize,
                    idCardAdditionalTextSize: settings.idCardAdditionalTextSize,
                    idCardLogoVisible: settings.idCardLogoVisible,
                    idCardPhotoVisible: settings.idCardPhotoVisible,
                    idCardNameVisible: settings.idCardNameVisible,
                    idCardNationalIdVisible: settings.idCardNationalIdVisible,
                    idCardProgramVisible: settings.idCardProgramVisible,
                    idCardCenterNameVisible: settings.idCardCenterNameVisible,
                    idCardAdditionalTextVisible: settings.idCardAdditionalTextVisible,
                  }}
                  onSettingsChange={handleIdCardSettingsChange}
                />
              </div>
            </Card>
            
            {/* زر الحفظ */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10">
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="bg-gradient-to-r from-tiba-primary-600 to-tiba-secondary-600 hover:from-tiba-primary-700 hover:to-tiba-secondary-700 text-white px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 min-w-64"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white ml-3"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    حفظ إعدادات الكارنيه
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 