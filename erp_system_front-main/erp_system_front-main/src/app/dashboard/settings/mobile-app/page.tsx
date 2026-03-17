'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import {
  DevicePhoneMobileIcon,
  LinkIcon,
  CheckCircleIcon,
  SignalIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface MobileAppSettings {
  enabled: boolean;
  googlePlayUrl: string;
  appStoreUrl: string;
  status: 'published' | 'pre_registration';
}

const SETTINGS_KEYS = {
  enabled: 'MOBILE_APP_ENABLED',
  googlePlayUrl: 'MOBILE_APP_GOOGLE_PLAY_URL',
  appStoreUrl: 'MOBILE_APP_APPSTORE_URL',
  status: 'MOBILE_APP_STATUS',
};

function MobileAppSettingsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MobileAppSettings>({
    enabled: false,
    googlePlayUrl: '',
    appStoreUrl: '',
    status: 'pre_registration',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/developer-settings?includeValues=true');
      const settingsMap = new Map<string, string>();
      if (Array.isArray(data)) {
        data.forEach((s: any) => settingsMap.set(s.key, s.value || ''));
      }

      setSettings({
        enabled: settingsMap.get(SETTINGS_KEYS.enabled) === 'true',
        googlePlayUrl: settingsMap.get(SETTINGS_KEYS.googlePlayUrl) || '',
        appStoreUrl: settingsMap.get(SETTINGS_KEYS.appStoreUrl) || '',
        status: (settingsMap.get(SETTINGS_KEYS.status) as 'published' | 'pre_registration') || 'pre_registration',
      });
    } catch (error) {
      console.error('Error loading mobile app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string, description: string) => {
    try {
      const allSettings = await fetchAPI('/developer-settings?includeValues=true');
      const existing = Array.isArray(allSettings) ? allSettings.find((s: any) => s.key === key) : null;

      if (existing) {
        await fetchAPI(`/developer-settings/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ value }),
        });
      } else {
        await fetchAPI('/developer-settings', {
          method: 'POST',
          body: JSON.stringify({
            key,
            value,
            description,
            category: 'mobile_app',
            isEncrypted: false,
            isActive: true,
          }),
        });
      }
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      throw error;
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await Promise.all([
        saveSetting(SETTINGS_KEYS.enabled, String(settings.enabled), 'تفعيل/تعطيل عرض التطبيق في منصة المتدربين'),
        saveSetting(SETTINGS_KEYS.googlePlayUrl, settings.googlePlayUrl, 'رابط التطبيق على Google Play'),
        saveSetting(SETTINGS_KEYS.appStoreUrl, settings.appStoreUrl, 'رابط التطبيق على App Store'),
        saveSetting(SETTINGS_KEYS.status, settings.status, 'حالة التطبيق: منشور أو تسجيل مسبق'),
      ]);

      // حفظ نسخة محلية لمنصة المتدربين (بدون حاجة لمصادقة)
      try {
        await fetch('/api/developer-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            MOBILE_APP_ENABLED: String(settings.enabled),
            MOBILE_APP_GOOGLE_PLAY_URL: settings.googlePlayUrl,
            MOBILE_APP_APPSTORE_URL: settings.appStoreUrl,
            MOBILE_APP_STATUS: settings.status,
          }),
        });
      } catch {
        // لا يهم إذا فشل - الإعدادات محفوظة في الباك إند
      }

      toast.success('تم حفظ إعدادات التطبيق بنجاح');
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <PageHeader title="إعدادات تطبيق الجوال" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الإعدادات', href: '/dashboard/settings' }, { label: 'تطبيق الجوال' }]} />
        <div className="max-w-4xl mx-auto space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="h-5 bg-slate-200 rounded w-40" />
              </div>
              <div className="h-11 bg-slate-100 rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="إعدادات تطبيق الجوال"
        description="إدارة روابط التطبيق على المتاجر وإعدادات العرض في منصة المتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الإعدادات', href: '/dashboard/settings' },
          { label: 'تطبيق الجوال' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            onClick={handleSave}
            isLoading={saving}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
          >
            حفظ الإعدادات
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Toggle Enable/Disable Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
                  <SignalIcon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">تفعيل عرض التطبيق</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-400 mb-4">عند التفعيل، سيظهر للمتدربين بانر لتحميل التطبيق مع روابط المتاجر</p>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    settings.enabled
                      ? 'bg-gradient-to-br from-tiba-secondary-400 to-tiba-secondary-600 shadow-md shadow-tiba-secondary-500/20'
                      : 'bg-slate-200'
                  }`}>
                    {settings.enabled ? (
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    ) : (
                      <DevicePhoneMobileIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${settings.enabled ? 'text-tiba-secondary-700' : 'text-slate-600'}`}>
                      {settings.enabled ? 'مفعّل — يظهر للمتدربين' : 'غير مفعّل'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.enabled ? 'bg-tiba-secondary-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* App Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-br from-tiba-warning-500 to-amber-600 rounded-lg shadow-sm">
                  <ClockIcon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">حالة التطبيق</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-400 mb-4">حدد هل التطبيق متاح للتحميل أو في مرحلة التسجيل المسبق</p>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, status: 'published' }))}
                  className={`p-3.5 rounded-lg border-2 text-right transition-all duration-200 ${
                    settings.status === 'published'
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      settings.status === 'published' ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm' : 'bg-slate-100'
                    }`}>
                      <CheckCircleIcon className={`w-4.5 h-4.5 ${settings.status === 'published' ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${settings.status === 'published' ? 'text-blue-800' : 'text-slate-700'}`}>منشور ومتاح للتحميل</p>
                      <p className="text-xs text-slate-400 mt-0.5">التطبيق متوفر على المتاجر الآن</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, status: 'pre_registration' }))}
                  className={`p-3.5 rounded-lg border-2 text-right transition-all duration-200 ${
                    settings.status === 'pre_registration'
                      ? 'border-tiba-warning-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      settings.status === 'pre_registration' ? 'bg-gradient-to-br from-tiba-warning-500 to-amber-600 shadow-sm' : 'bg-slate-100'
                    }`}>
                      <ClockIcon className={`w-4.5 h-4.5 ${settings.status === 'pre_registration' ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${settings.status === 'pre_registration' ? 'text-amber-800' : 'text-slate-700'}`}>تسجيل مسبق</p>
                      <p className="text-xs text-slate-400 mt-0.5">التطبيق قريباً — سجّل اهتمامك</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Links Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-300">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                <LinkIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">روابط المتاجر</h3>
                <p className="text-xs text-slate-400 mt-0.5">أدخل روابط صفحة التطبيق على كل متجر</p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Google Play */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="#34A853"/>
                  </svg>
                  رابط Google Play
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={settings.googlePlayUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, googlePlayUrl: e.target.value }))}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                />
                {settings.googlePlayUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-tiba-secondary-700">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    تم إدخال الرابط
                  </div>
                )}
              </div>

              {/* App Store */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="#555"/>
                  </svg>
                  رابط App Store
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={settings.appStoreUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, appStoreUrl: e.target.value }))}
                  placeholder="https://apps.apple.com/app/..."
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                />
                {settings.appStoreUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-tiba-secondary-700">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    تم إدخال الرابط
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {settings.enabled && (settings.googlePlayUrl || settings.appStoreUrl) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-br from-tiba-secondary-500 to-emerald-600 rounded-lg shadow-sm">
                  <EyeIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">معاينة مباشرة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">هكذا سيظهر البانر للمتدربين في المنصة</p>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {/* Preview Card */}
              <div className="relative overflow-hidden bg-white rounded-xl shadow-md border border-slate-100">
                <div className="h-1 bg-gradient-to-l from-blue-500 via-blue-600 to-blue-700" />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <DevicePhoneMobileIcon className="w-7 h-7 text-blue-700" />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                        <h4 className="text-base font-bold text-slate-800">
                          {settings.status === 'published' ? 'حمّل تطبيقنا الآن!' : 'التطبيق قادم قريباً!'}
                        </h4>
                        {settings.status === 'pre_registration' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100">
                            <ClockIcon className="w-3 h-3" />
                            تسجيل مسبق
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        {settings.status === 'published'
                          ? 'تابع جدولك وسجّل حضورك من التطبيق — كل شيء في مكان واحد!'
                          : 'سجّل مسبقاً وكن أول من يجربه!'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        {settings.googlePlayUrl && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                            </svg>
                            <div className="text-right">
                              <div className="text-[9px] font-medium opacity-70 leading-none">{settings.status === 'published' ? 'متاح على' : 'سجّل على'}</div>
                              <div className="text-xs font-bold leading-tight">Google Play</div>
                            </div>
                          </span>
                        )}
                        {settings.appStoreUrl && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                            </svg>
                            <div className="text-right">
                              <div className="text-[9px] font-medium opacity-70 leading-none">{settings.status === 'published' ? 'متاح على' : 'سجّل على'}</div>
                              <div className="text-xs font-bold leading-tight">App Store</div>
                            </div>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Button */}
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<CheckCircleIcon className="w-5 h-5" />}
            onClick={handleSave}
            isLoading={saving}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-10"
          >
            حفظ إعدادات التطبيق
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MobileAppSettingsPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'dashboard.settings.mobile-app', action: 'manage' }}>
      <MobileAppSettingsContent />
    </PageGuard>
  );
}
