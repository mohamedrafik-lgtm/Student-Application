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
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  contextLength: number | null;
  inputModalities: string[];
}

interface OpenRouterModelTest {
  modelId: string;
  valid: boolean;
  expected: string[];
  actual: string[] | null;
  message: string;
}

function DeveloperSettingsPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterApiKeyId, setOpenRouterApiKeyId] = useState<string | null>(null);
  const [hasOpenRouterApiKey, setHasOpenRouterApiKey] = useState(false);
  const [openRouterModel, setOpenRouterModel] = useState<string | null>(null);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [openRouterCandidates, setOpenRouterCandidates] = useState<OpenRouterModel[]>([]);
  const [openRouterQuery, setOpenRouterQuery] = useState('');
  const [openRouterLoading, setOpenRouterLoading] = useState(false);
  const [openRouterSaving, setOpenRouterSaving] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [selectingModel, setSelectingModel] = useState<string | null>(null);
  const [modelTest, setModelTest] = useState<OpenRouterModelTest | null>(null);
  const [openRouterMessage, setOpenRouterMessage] = useState('');
  const [openRouterError, setOpenRouterError] = useState('');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

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
        const config = await fetchAPI('/developer-settings/openrouter/config');
        setOpenRouterApiKeyId(config.apiKeySettingId || null);
        setHasOpenRouterApiKey(config.hasApiKey || false);
        setOpenRouterModel(config.model || null);

        try {
          const [models, candidates] = await Promise.all([
            fetchAPI('/developer-settings/openrouter/models'),
            fetchAPI('/developer-settings/openrouter/model-candidates'),
          ]);
          setOpenRouterModels(Array.isArray(models) ? models : []);
          setOpenRouterCandidates(Array.isArray(candidates) ? candidates : []);
        } catch (modelError) {
          console.error('Error fetching OpenRouter models:', modelError);
        }

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

  const loadOpenRouterModels = async () => {
    setOpenRouterLoading(true);
    setOpenRouterError('');
    try {
      const [models, candidates] = await Promise.all([
        fetchAPI('/developer-settings/openrouter/models'),
        fetchAPI('/developer-settings/openrouter/model-candidates'),
      ]);
      setOpenRouterModels(Array.isArray(models) ? models : []);
      setOpenRouterCandidates(Array.isArray(candidates) ? candidates : []);
    } catch (err: any) {
      setOpenRouterError(err.message || 'تعذر جلب النماذج المجانية');
    } finally {
      setOpenRouterLoading(false);
    }
  };

  const handleSaveOpenRouterKey = async () => {
    if (!openRouterApiKey.trim()) {
      setOpenRouterError('أدخل مفتاح OpenRouter أولاً');
      return;
    }

    setOpenRouterSaving(true);
    setOpenRouterError('');
    setOpenRouterMessage('');
    try {
      if (openRouterApiKeyId) {
        await fetchAPI(`/developer-settings/${openRouterApiKeyId}`, {
          method: 'PUT',
          body: JSON.stringify({ value: openRouterApiKey, isEncrypted: true, isActive: true, updatedBy: user?.email }),
        });
      } else {
        const saved = await fetchAPI('/developer-settings', {
          method: 'POST',
          body: JSON.stringify({
            key: 'OPENROUTER_API_KEY',
            value: openRouterApiKey,
            description: 'مفتاح API لخدمة OpenRouter للشات وتصحيح الاختبارات',
            category: 'ai',
            isEncrypted: true,
            isActive: true,
            updatedBy: user?.email,
          }),
        });
        setOpenRouterApiKeyId(saved.id);
      }
      setOpenRouterMessage('تم حفظ مفتاح OpenRouter مشفراً بنجاح');
      setHasOpenRouterApiKey(true);
      await loadOpenRouterModels();
    } catch (err: any) {
      setOpenRouterError(err.message || 'فشل حفظ مفتاح OpenRouter');
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const handleTestOpenRouterModel = async (modelId: string) => {
    setTestingModel(modelId);
    setModelTest(null);
    setOpenRouterError('');
    setOpenRouterMessage('');
    try {
      const result = await fetchAPI('/developer-settings/openrouter/test-model', {
        method: 'POST',
        body: JSON.stringify({ model: modelId }),
      });
      setModelTest(result);
      if (result.valid) {
        const models = await fetchAPI('/developer-settings/openrouter/models');
        setOpenRouterModels(Array.isArray(models) ? models : []);
      }
      if (!result.valid) setOpenRouterError(result.message || 'لم يجتز النموذج اختبار OMR');
    } catch (err: any) {
      setOpenRouterError(err.message || 'فشل اختبار النموذج؛ تحقق من المفتاح وحاول مجدداً');
    } finally {
      setTestingModel(null);
    }
  };

  const handleSelectOpenRouterModel = async (modelId: string) => {
    setSelectingModel(modelId);
    setOpenRouterError('');
    setOpenRouterMessage('');
    try {
      const result = await fetchAPI('/developer-settings/openrouter/select-model', {
        method: 'POST',
        body: JSON.stringify({ model: modelId }),
      });
      setOpenRouterModel(result.model);
      setModelTest(result.validation);
      setOpenRouterMessage('تم اعتماد النموذج للشات وتصحيح الاختبارات بعد إعادة اجتيازه اختبار OMR');
    } catch (err: any) {
      setOpenRouterError(err.message || 'تعذر اعتماد النموذج');
    } finally {
      setSelectingModel(null);
    }
  };

  if (isLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const filteredOpenRouterModels = openRouterModels.filter((model) =>
    `${model.name} ${model.id} ${model.description}`.toLowerCase().includes(openRouterQuery.toLowerCase()),
  );
  const filteredOpenRouterCandidates = openRouterCandidates.filter((model) =>
    `${model.name} ${model.id} ${model.description}`.toLowerCase().includes(openRouterQuery.toLowerCase()),
  );

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

      {openRouterError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{openRouterError}</div>
      )}
      {openRouterMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{openRouterMessage}</div>
      )}

      <Card>
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <KeyIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900">OpenRouter للشات وتصحيح الاختبارات</h2>
              <p className="mt-1 text-sm text-slate-500">احفظ المفتاح، ثم اختبر النماذج المجانية الداعمة للصور. ستظهر في القائمة الرئيسية النماذج التي اجتازت اختبار OMR فقط.</p>
            </div>
            {openRouterModel && (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" dir="ltr">
                {openRouterModel}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                type={showOpenRouterKey ? 'text' : 'password'}
                value={openRouterApiKey}
                onChange={(event) => setOpenRouterApiKey(event.target.value)}
                placeholder={hasOpenRouterApiKey ? 'المفتاح الحالي محفوظ — أدخل مفتاحاً جديداً لاستبداله' : 'أدخل مفتاح OpenRouter API'}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pl-12 font-mono text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                dir="ltr"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowOpenRouterKey((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showOpenRouterKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}>
                {showOpenRouterKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            <button type="button" onClick={handleSaveOpenRouterKey} disabled={openRouterSaving || !openRouterApiKey.trim()} className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
              {openRouterSaving ? 'جاري الحفظ...' : hasOpenRouterApiKey ? 'استبدال المفتاح' : 'حفظ المفتاح المشفر'}
            </button>
          </div>
          <p className="text-xs text-slate-500">يُحفظ المفتاح مشفراً على الخادم. يرسل النظام الصور والنصوص إلى OpenRouter لمعالجتها بالنموذج المعتمد.</p>

          <div className="border-t border-slate-100 pt-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">النماذج المجانية المجتازة لاختبار OMR</h3>
                <p className="mt-1 text-xs text-slate-500">يعرض هذا القسم النماذج التي قرأت عينة OMR التجريبية بشكل صحيح فقط.</p>
              </div>
              <button type="button" onClick={loadOpenRouterModels} disabled={openRouterLoading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                {openRouterLoading ? 'جاري التحديث...' : 'تحديث النماذج'}
              </button>
            </div>

            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={openRouterQuery} onChange={(event) => setOpenRouterQuery(event.target.value)} placeholder="ابحث بالاسم أو المعرّف..." className="w-full rounded-lg border border-slate-200 py-2.5 pr-9 pl-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>

            {openRouterModels.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {openRouterLoading ? 'جاري تحميل النماذج...' : 'لا توجد نماذج اجتازت الاختبار بعد. اختبر النماذج المرشحة أدناه.'}
              </div>
            ) : filteredOpenRouterModels.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">لا توجد نماذج مطابقة للبحث.</div>
            ) : (
              <div className="grid max-h-[560px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {filteredOpenRouterModels.map((model) => {
                  return (
                    <div key={model.id} className={`rounded-xl border p-4 ${openRouterModel === model.id ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold text-slate-800">{model.name}</h4>
                          <p className="mt-1 break-all font-mono text-[10px] text-slate-500" dir="ltr">{model.id}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">مجاني</span>
                      </div>
                      <p className="line-clamp-2 min-h-8 text-xs leading-5 text-slate-500">{model.description || 'نموذج يدعم المحادثة وإدخال الصور'}</p>
                      <p className="mt-2 text-[10px] text-emerald-700">اجتاز اختبار قراءة OMR · سياق {model.contextLength ? model.contextLength.toLocaleString() : 'غير محدد'} رمز</p>
                      {modelTest?.modelId === model.id && (
                        <p className={`mt-2 text-xs ${modelTest.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                          {modelTest.message}{modelTest.actual ? ` (${modelTest.actual.join('، ')})` : ''}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleSelectOpenRouterModel(model.id)} disabled={!hasOpenRouterApiKey || !!selectingModel} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                          {selectingModel === model.id ? 'إعادة الفحص والاعتماد...' : openRouterModel === model.id ? 'إعادة اعتماد' : 'اعتماد للشات والتصحيح'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">فحص نماذج مجانية أخرى ({openRouterCandidates.length})</summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">هذه النماذج تدعم الصور والنص مجاناً لكنها لم تجتز اختبار OMR بعد. لن تظهر في القائمة الرئيسية إلا بعد نجاح الاختبار.</p>
            <div className="mt-3 space-y-2">
              {filteredOpenRouterCandidates.map((model) => {
                return (
                  <div key={model.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{model.name}</p>
                      <p className="break-all font-mono text-[10px] text-slate-400" dir="ltr">{model.id}</p>
                      {modelTest?.modelId === model.id && <p className={`mt-1 text-xs ${modelTest.valid ? 'text-emerald-700' : 'text-red-700'}`}>{modelTest.message}</p>}
                    </div>
                    <button type="button" onClick={() => handleTestOpenRouterModel(model.id)} disabled={!hasOpenRouterApiKey || !!testingModel || !!selectingModel || openRouterModels.some((validModel) => validModel.id === model.id)} className="shrink-0 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
                      {testingModel === model.id ? 'جاري الاختبار...' : openRouterModels.some((validModel) => validModel.id === model.id) ? 'اجتاز الاختبار' : 'اختبار OMR'}
                    </button>
                  </div>
                );
              })}
              {filteredOpenRouterCandidates.length === 0 && <p className="py-4 text-center text-xs text-slate-400">لا توجد نماذج مرشحة مطابقة للبحث.</p>}
            </div>
          </details>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            يرسل النظام صورة ورقة الإجابة كاملة إلى OpenRouter لاستخراج الإجابات والرقم القومي، كما يرسل نصوص الأسئلة عند استخراجها. تحقق من سياسات الخصوصية والاحتفاظ بالبيانات لدى المزود.
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
              <span>تستخدم خدمات المحادثة واستخراج الأسئلة والرقم القومي وتصحيح OMR نموذج OpenRouter المعتمد</span>
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
