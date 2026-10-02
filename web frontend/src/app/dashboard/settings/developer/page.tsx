'use client';

import { useEffect, useState, useCallback } from 'react';
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
  CloudIcon,
  ServerIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
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

  // ==================== حالة إعدادات التخزين ====================
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('cloud');
  const [cloudName, setCloudName] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudApiSecret, setCloudApiSecret] = useState('');
  const [showCloudSecret, setShowCloudSecret] = useState(false);
  const [hasCloudCredentials, setHasCloudCredentials] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [storageSuccess, setStorageSuccess] = useState('');
  const [storageError, setStorageError] = useState('');
  // تحليل
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ total: number; models: { model: string; field: string; count: number }[] } | null>(null);
  // نقل
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{
    status: string; total: number; done: number; failed: number; errors: string[];
  } | null>(null);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);

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

        // جلب إعدادات التخزين
        try {
          const storageConfig = await fetchAPI('/storage-settings');
          setStorageMode(storageConfig.storageMode || 'local');
          setCloudName(storageConfig.cloudName || '');
          setCloudApiKey(storageConfig.apiKey || '');
          setCloudApiSecret(storageConfig.apiSecret || '');
          setHasCloudCredentials(storageConfig.hasCloudCredentials || false);
        } catch {
          // إعدادات التخزين غير موجودة بعد
        }
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

  // ==================== حفظ إعدادات التخزين ====================
  const handleSaveStorage = async () => {
    setSavingStorage(true);
    setStorageError('');
    setStorageSuccess('');
    try {
      await fetchAPI('/storage-settings', {
        method: 'PUT',
        body: JSON.stringify({
          storageMode,
          cloudName,
          apiKey: cloudApiKey,
          apiSecret: cloudApiSecret,
        }),
      });
      setStorageSuccess('تم حفظ إعدادات التخزين بنجاح ✓');
      setTimeout(() => setStorageSuccess(''), 4000);
    } catch (err: any) {
      setStorageError(err.message || 'فشل في حفظ إعدادات التخزين');
    } finally {
      setSavingStorage(false);
    }
  };

  // تحليل الملفات
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setStorageError('');
    try {
      // تحليل حسب الوضع الحالي: سحابي → تحليل سحابي، محلي → تحليل محلي
      const endpoint = storageMode === 'local' ? '/storage-settings/analyze' : '/storage-settings/analyze-local';
      const result = await fetchAPI(endpoint);
      setAnalysisResult(result);
    } catch (err: any) {
      setStorageError(err.message || 'فشل في تحليل الملفات');
    } finally {
      setAnalyzing(false);
    }
  };

  // بدء عملية النقل
  const handleMigrate = async () => {
    setShowMigrateConfirm(false);
    setMigrating(true);
    setStorageError('');
    setStorageSuccess('');
    try {
      const endpoint = storageMode === 'local' ? '/storage-settings/migrate-to-local' : '/storage-settings/migrate-to-cloud';
      const result = await fetchAPI(endpoint, { method: 'POST' });
      setStorageSuccess(result.message);
      pollMigrationProgress();
    } catch (err: any) {
      setStorageError(err.message || 'فشل في بدء عملية النقل');
      setMigrating(false);
    }
  };

  // متابعة تقدم النقل
  const pollMigrationProgress = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const progress = await fetchAPI('/storage-settings/migration-progress');
        setMigrationProgress(progress);
        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(interval);
          setMigrating(false);
          if (progress.status === 'completed') {
            setStorageMode('local');
            setStorageSuccess(`تم النقل بنجاح! تم نقل ${progress.done} ملف إلى التخزين المحلي.`);
          } else {
            setStorageError(`فشل النقل: ${progress.failed} ملفات فشلت من أصل ${progress.total}`);
          }
        }
      } catch {
        clearInterval(interval);
        setMigrating(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

      {/* ==================== بطاقة إعدادات التخزين ==================== */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-purple-50 rounded-lg ml-4">
              <CloudIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">إعدادات التخزين</h2>
              <p className="text-sm text-gray-500 mt-1">
                إدارة وضع تخزين الملفات والصور — سحابي (Cloudinary) أو محلي
              </p>
            </div>
            <div className="flex items-center gap-2">
              {storageMode === 'cloud' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700">
                  <CloudIcon className="h-4 w-4" /> سحابي
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700">
                  <ServerIcon className="h-4 w-4" /> محلي
                </span>
              )}
            </div>
          </div>

          {/* رسائل حالة التخزين */}
          {storageError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{storageError}</p>
            </div>
          )}
          {storageSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">{storageSuccess}</p>
            </div>
          )}

          {/* اختيار وضع التخزين */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">وضع التخزين</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setStorageMode('cloud'); setAnalysisResult(null); }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  storageMode === 'cloud'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CloudIcon className={`h-8 w-8 mx-auto mb-2 ${storageMode === 'cloud' ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className={`font-semibold ${storageMode === 'cloud' ? 'text-blue-800' : 'text-gray-700'}`}>تخزين سحابي</p>
                <p className="text-xs text-gray-500 mt-1">Cloudinary CDN — سريع وموثوق</p>
              </button>
              <button
                type="button"
                onClick={() => { setStorageMode('local'); setAnalysisResult(null); }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  storageMode === 'local'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ServerIcon className={`h-8 w-8 mx-auto mb-2 ${storageMode === 'local' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className={`font-semibold ${storageMode === 'local' ? 'text-emerald-800' : 'text-gray-700'}`}>تخزين محلي</p>
                <p className="text-xs text-gray-500 mt-1">على السيرفر مباشرة — بدون اشتراكات</p>
              </button>
            </div>
          </div>

          {/* بيانات Cloudinary */}
          {storageMode === 'cloud' && (
            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">بيانات Cloudinary</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cloud Name</label>
                <input
                  type="text"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="your-cloud-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <input
                  type="text"
                  value={cloudApiKey}
                  onChange={(e) => setCloudApiKey(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Secret</label>
                <div className="relative">
                  <input
                    type={showCloudSecret ? 'text' : 'password'}
                    value={cloudApiSecret}
                    onChange={(e) => setCloudApiSecret(e.target.value)}
                    placeholder="أدخل كلمة السر"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudSecret(!showCloudSecret)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCloudSecret ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                سيتم تشفير API Key و API Secret تلقائياً باستخدام AES-256-CBC
              </p>
            </div>
          )}

          {/* زر حفظ إعدادات التخزين */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleSaveStorage}
              disabled={savingStorage}
              className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {savingStorage ? 'جاري الحفظ...' : 'حفظ إعدادات التخزين'}
            </button>
          </div>

          {/* قسم نقل الملفات */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowDownTrayIcon className="h-5 w-5 text-orange-600" />
              <h3 className="text-md font-bold text-gray-900">
                {storageMode === 'local'
                  ? 'نقل الملفات من السحابة إلى التخزين المحلي'
                  : 'رفع الملفات المحلية إلى التخزين السحابي'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {storageMode === 'local'
                ? 'تحليل ونقل جميع الصور المخزنة على Cloudinary إلى السيرفر المحلي. سيتم تحميل كل ملف والتحقق من سلامته قبل تحديث الروابط.'
                : 'تحليل ورفع جميع الملفات المحلية إلى Cloudinary. سيتم رفع كل ملف وتحديث الروابط في قاعدة البيانات.'}
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || migrating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 font-medium rounded-lg border border-orange-200 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
                {storageMode === 'local' ? 'تحليل الملفات السحابية' : 'تحليل الملفات المحلية'}
              </button>

              {analysisResult && analysisResult.total > 0 && (
                <button
                  onClick={() => setShowMigrateConfirm(true)}
                  disabled={migrating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 font-medium rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {storageMode === 'local' ? 'بدء النقل للمحلي' : 'بدء الرفع للسحابة'}
                </button>
              )}
            </div>

            {/* نتائج التحليل */}
            {analysisResult && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-sm font-semibold text-orange-800 mb-2">
                  إجمالي الملفات: <span className="text-lg">{analysisResult.total}</span>
                </p>
                {analysisResult.total === 0 ? (
                  <p className="text-sm text-green-700">
                    {storageMode === 'local'
                      ? 'لا توجد ملفات سحابية — جميع الملفات محلية بالفعل ✓'
                      : 'لا توجد ملفات محلية — جميع الملفات على السحابة بالفعل ✓'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {analysisResult.models.map((m, i) => (
                      <div key={i} className="flex justify-between text-xs text-orange-700 bg-white/50 rounded px-3 py-1.5">
                        <span>{m.model}.{m.field}</span>
                        <span className="font-semibold">{m.count} ملف</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* تقدم النقل */}
            {migrationProgress && migrationProgress.status !== 'idle' && (
              <div className={`p-4 rounded-xl border ${
                migrationProgress.status === 'completed' ? 'bg-green-50 border-green-200' :
                migrationProgress.status === 'failed' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {migrationProgress.status === 'running' && <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />}
                  {migrationProgress.status === 'completed' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                  {migrationProgress.status === 'failed' && <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
                  <span className={`text-sm font-semibold ${
                    migrationProgress.status === 'completed' ? 'text-green-800' :
                    migrationProgress.status === 'failed' ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {migrationProgress.status === 'running' ? 'جاري النقل...' :
                     migrationProgress.status === 'completed' ? 'تم النقل بنجاح!' : 'فشل النقل'}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        migrationProgress.status === 'completed' ? 'bg-green-500' :
                        migrationProgress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${migrationProgress.total > 0 ? ((migrationProgress.done + migrationProgress.failed) / migrationProgress.total * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {migrationProgress.done} نجح / {migrationProgress.failed} فشل / {migrationProgress.total} إجمالي
                </p>
                {migrationProgress.errors.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    {migrationProgress.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-red-600">• {err}</p>
                    ))}
                    {migrationProgress.errors.length > 5 && (
                      <p className="text-xs text-red-500 mt-1">و {migrationProgress.errors.length - 5} أخطاء أخرى...</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* تأكيد النقل */}
            {showMigrateConfirm && (
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
                <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ تأكيد عملية النقل</p>
                <p className="text-sm text-yellow-700 mb-3">
                  {storageMode === 'local'
                    ? `سيتم تحميل جميع الملفات (${analysisResult?.total || 0}) من Cloudinary إلى السيرفر المحلي، والتحقق من سلامة كل ملف، ثم تحديث الروابط في قاعدة البيانات.`
                    : `سيتم رفع جميع الملفات (${analysisResult?.total || 0}) من السيرفر المحلي إلى Cloudinary، ثم تحديث الروابط في قاعدة البيانات.`}
                  <br />
                  <strong>هذه العملية لا يمكن التراجع عنها بسهولة.</strong>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleMigrate}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 text-sm"
                  >
                    نعم، ابدأ النقل
                  </button>
                  <button
                    onClick={() => setShowMigrateConfirm(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
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
