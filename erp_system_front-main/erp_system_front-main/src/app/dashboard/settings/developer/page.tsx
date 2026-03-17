'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import LoadingScreen from '@/app/components/LoadingScreen';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import PageGuard from '@/components/permissions/PageGuard';
import {
  CodeBracketIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface DeveloperSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  isEncrypted: boolean;
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

function DeveloperSettingsPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<DeveloperSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiApiKeyId, setGeminiApiKeyId] = useState<string | null>(null);
  const [visionAIStats, setVisionAIStats] = useState({ totalGradedSheets: 0 });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await fetchAPI('/developer-settings?includeValues=true');
        setSettings(data);

        // البحث عن GEMINI_API_KEY
        const geminiSetting = data.find((s: DeveloperSetting) => s.key === 'GEMINI_API_KEY');
        if (geminiSetting) {
          setGeminiApiKey(geminiSetting.value);
          setGeminiApiKeyId(geminiSetting.id);
        }

        // جلب احصائيات Vision AI
        const stats = await fetchAPI('/developer-settings/stats/vision-ai');
        setVisionAIStats(stats);
      } catch (error: any) {
        console.error('Error fetching developer settings:', error);
        setError(error.message || 'فشل في تحميل إعدادات المطورين');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);

  const handleSave = async () => {
    if (!geminiApiKey.trim()) {
      setError('الرجاء إدخال مفتاح Codex Vision API');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (geminiApiKeyId) {
        // تحديث موجود
        await fetchAPI(`/developer-settings/${geminiApiKeyId}`, {
          method: 'PUT',
          body: JSON.stringify({
            value: geminiApiKey,
            updatedBy: user?.email,
          }),
        });
      } else {
        // إنشاء جديد
        const data = await fetchAPI('/developer-settings', {
          method: 'POST',
          body: JSON.stringify({
            key: 'GEMINI_API_KEY',
            value: geminiApiKey,
            description: 'مفتاح API لخدمة Google Gemini AI (Vision + OCR)',
            category: 'ai',
            isEncrypted: true,
            isActive: true,
            updatedBy: user?.email,
          }),
        });
        setGeminiApiKeyId(data.id);
      }

      setSuccess('تم حفظ الإعدادات بنجاح ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(error.message || 'فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات المطورين"
        description="إدارة المفاتيح السرية وإعدادات النظام المتقدمة"
        icon={CodeBracketIcon}
      />

      {/* رسائل الحالة */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-1">خطأ</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* بطاقة MISTRAL_API_KEY */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-indigo-50 rounded-lg ml-4">
              <KeyIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Codex Vision API Key</h2>
              <p className="text-sm text-gray-500 mt-1">
                مفتاح API لخدمة Codex Vision للتعرف الضوئي (OCR) وتحليل الصور بالذكاء الاصطناعي
              </p>
            </div>
            <div className="text-left">
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{visionAIStats.totalGradedSheets.toLocaleString()}</p>
                <p className="text-xs text-green-600">ورقة تم تصحيحها</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Codex Vision API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="أدخل مفتاح Codex Vision API"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                سيتم تشفير المفتاح تلقائياً قبل حفظه في قاعدة البيانات باستخدام AES-256-CBC
              </p>
            </div>

            {geminiApiKeyId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">آخر تحديث:</span>{' '}
                  {settings.find((s) => s.key === 'GEMINI_API_KEY')?.updatedBy || 'غير معروف'}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>

              <button
                onClick={() => router.push('/dashboard/settings')}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <div className="p-6">
          <h3 className="text-md font-bold text-gray-900 mb-4">معلومات مهمة</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-indigo-600 ml-2">•</span>
              <span>يتم تشفير جميع المفاتيح السرية باستخدام AES-256-CBC قبل حفظها</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 ml-2">•</span>
              <span>فقط المستخدمون بصلاحية "إدارة إعدادات المطورين" يمكنهم الوصول لهذه الصفحة</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 ml-2">•</span>
              <span>يتم استخدام Codex Vision API في خدمة التصحيح الآلي (OMR) وتحليل الصور</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 ml-2">•</span>
              <span>في حالة عدم وجود مفتاح في قاعدة البيانات، سيتم استخدام القيمة من ملف .env كاحتياطي</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function DeveloperSettingsPage() {
  return (
    <PageGuard requiredPermission="dashboard.developer-settings.view">
      <DeveloperSettingsPageContent />
    </PageGuard>
  );
}
