'use client';

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import LoadingScreen from "@/app/components/LoadingScreen";
import SettingsForm from "./components/SettingsForm";
import { fetchAPI } from "@/lib/api";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/app/components/ui/Card";
import { 
  Cog6ToothIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import PageGuard from '@/components/permissions/PageGuard';

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
  createdAt: Date;
  updatedAt: Date;
}

function SettingsPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await fetchAPI('/settings');
        if (data.success) {
          setSettings(data.settings);
        } else {
          setError("فشل في تحميل إعدادات النظام");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setError("حدث خطأ أثناء تحميل إعدادات النظام");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">
                  خطأ في تحميل الإعدادات
                </h3>
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* محتوى الصفحة */}
      <SettingsForm settings={settings} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PageGuard>
      <SettingsPageContent />
    </PageGuard>
  );
}
 