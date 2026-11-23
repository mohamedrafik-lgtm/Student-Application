'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  XCircleIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  BoltIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/Select';

interface UnassignedTrainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  phone: string;
  photoUrl: string | null;
  program: { id: number; nameAr: string };
}

interface Program {
  id: number;
  nameAr: string;
}

interface UnassignedStats {
  totalTrainees: number;
  withAccount: number;
  withoutAccount: number;
  perProgram: { programId: number; programName: string; count: number }[];
}

interface CreateResult {
  success: boolean;
  message: string;
  totalRequested: number;
  created: number;
  updated: number;
  failed: number;
  results: {
    traineeId: number;
    nameAr: string;
    nationalId: string;
    password: string;
    action: 'created' | 'updated';
  }[];
  failedItems: { traineeId: number; nameAr: string; reason: string }[];
}

type TabMode = 'single' | 'bulk-program' | 'bulk-all';

interface CreateAccountsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProgramId?: string;
}

export default function CreateAccountsModal({
  open,
  onClose,
  onSuccess,
  initialProgramId,
}: CreateAccountsModalProps) {
  const [mode, setMode] = useState<TabMode>('single');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [stats, setStats] = useState<UnassignedStats | null>(null);

  // قائمة المتدربين غير المسجلين
  const [trainees, setTrainees] = useState<UnassignedTrainee[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>(initialProgramId || 'ALL');
  const [loadingList, setLoadingList] = useState(false);

  // الإعدادات
  const [passwordMode, setPasswordMode] = useState<'nationalId' | 'random'>('nationalId');

  // الإنشاء
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  // جلب البرامج
  const fetchPrograms = useCallback(async () => {
    try {
      const response = await fetchAPI('/programs');
      setPrograms(response.data || response || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]);
    }
  }, []);

  // جلب الإحصائيات
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetchAPI('/trainee-platform/accounts/unassigned/stats');
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // جلب المتدربين غير المسجلين
  const fetchUnassigned = useCallback(
    async (page = 1, search = '', programId?: string) => {
      setLoadingList(true);
      try {
        const params: any = { page, limit: 100 };
        if (search) params.search = search;
        if (programId && programId !== 'ALL') params.programId = programId;

        const response = await fetchAPI(
          `/trainee-platform/accounts/unassigned?${new URLSearchParams(params).toString()}`,
        );
        setTrainees(response.data || []);
      } catch (error: any) {
        console.error('Error fetching unassigned trainees:', error);
        toast.error(error.message || 'فشل جلب المتدربين');
        setTrainees([]);
      } finally {
        setLoadingList(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSelectedIds(new Set());
    setSearchInput('');
    setSearchQuery('');
    if (initialProgramId) setSelectedProgram(initialProgramId);
    fetchPrograms();
    fetchStats();
  }, [open, initialProgramId, fetchPrograms, fetchStats]);

  useEffect(() => {
    if (!open) return;
    fetchUnassigned(1, searchQuery, selectedProgram);
  }, [open, searchQuery, selectedProgram, fetchUnassigned]);

  // تطبيع الأرقام العربية في البحث
  const normalizeDigits = (value: string) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return value
      .split('')
      .map((ch) => {
        const idx = arabicDigits.indexOf(ch);
        return idx >= 0 ? String(idx) : ch;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleSearch = () => {
    const normalized = normalizeDigits(searchInput);
    setSearchInput(normalized);
    setSearchQuery(normalized);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLoaded = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      trainees.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ================= إنشاء فردي / متعدد محدد =================
  const handleCreateSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('اختر متدرباً واحداً على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchAPI('/trainee-platform/accounts', {
        method: 'POST',
        body: JSON.stringify({
          traineeIds: Array.from(selectedIds),
          passwordMode,
        }),
      });
      setResult(response);
      toast.success(response.message);
      fetchStats();
      if (response.created > 0) fetchUnassigned(1, searchQuery, selectedProgram);
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء الحسابات');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= إنشاء برنامج كامل =================
  const handleCreateForProgram = async () => {
    if (selectedProgram === 'ALL') {
      toast.error('اختر برنامجاً تدريبياً');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchAPI('/trainee-platform/accounts/bulk', {
        method: 'POST',
        body: JSON.stringify({
          programId: Number(selectedProgram),
          scope: 'missing-in-program',
          passwordMode,
        }),
      });
      setResult(response);
      toast.success(response.message);
      fetchStats();
      fetchUnassigned(1, searchQuery, selectedProgram);
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء الحسابات');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= إنشاء الكل =================
  const handleCreateAll = async () => {
    setSubmitting(true);
    try {
      const response = await fetchAPI('/trainee-platform/accounts/bulk', {
        method: 'POST',
        body: JSON.stringify({
          scope: 'missing-only',
          passwordMode,
        }),
      });
      setResult(response);
      toast.success(response.message);
      fetchStats();
      fetchUnassigned(1, searchQuery, selectedProgram);
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء الحسابات');
    } finally {
      setSubmitting(false);
    }
  };

  // نسخ النتائج كجدول CSV
  const copyResultsAsTable = useCallback(() => {
    if (!result?.results?.length) return;

    const header = 'الاسم\tالرقم القومي\tكلمة المرور\tالحالة';
    const rows = result.results.map((r) =>
      [
        r.nameAr,
        r.nationalId,
        r.password,
        r.action === 'created' ? 'تم الإنشاء' : 'تم التحديث',
      ].join('\t'),
    );

    const table = [header, ...rows].join('\n');
    navigator.clipboard.writeText(table).then(() => {
      setCopied(true);
      toast.success('تم نسخ البيانات إلى الحافظة');
      setTimeout(() => setCopied(false), 2500);
    });
  }, [result]);

  // إحصائيات البرنامج المحدد
  const programStats = useMemo(() => {
    if (!stats || selectedProgram === 'ALL') return null;
    const pid = Number(selectedProgram);
    return stats.perProgram.find((p) => p.programId === pid) || null;
  }, [stats, selectedProgram]);

  if (!open) return null;

  const tabs: { id: TabMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'single',
      label: 'اختيار متدربين',
      icon: <UserPlusIcon className="w-5 h-5" />,
      description: 'ابحث عن أشخاص محددين وأنشئ لهم حسابات',
    },
    {
      id: 'bulk-program',
      label: 'برنامج كامل',
      icon: <BoltIcon className="w-5 h-5" />,
      description: 'أنشئ حسابات كل المتدربين غير المسجلين في برنامج',
    },
    {
      id: 'bulk-all',
      label: 'كل المتدربين',
      icon: <UserGroupIcon className="w-5 h-5" />,
      description: 'أنشئ حسابات كل المتدربين غير المسجلين دفعة واحدة',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* الهيدر */}
        <div className="bg-gradient-to-r from-tiba-primary-600 to-tiba-primary-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
              <UserPlusIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">إنشاء حسابات منصة المتدربين</h3>
              <p className="text-sm text-white/80">
                {stats
                  ? `${stats.withoutAccount} متدرب بدون حساب من أصل ${stats.totalTrainees}`
                  : 'جارِ تحميل الإحصائيات...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors disabled:opacity-50"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* وضع كلمة المرور */}
          <div className="bg-tiba-primary-50 border-2 border-tiba-primary-200 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-tiba-primary-900 mb-1">طريقة توليد كلمة المرور</p>
                <p className="text-sm text-tiba-primary-700">
                  كلمة المرور الافتراضية هي نفس الرقم القومي للمتدرب
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPasswordMode('nationalId')}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    passwordMode === 'nationalId'
                      ? 'bg-tiba-primary-600 text-white shadow-md'
                      : 'bg-white text-tiba-primary-700 border border-tiba-primary-300 hover:bg-tiba-primary-50'
                  }`}
                >
                  نفس الرقم القومي
                </button>
                <button
                  onClick={() => setPasswordMode('random')}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    passwordMode === 'random'
                      ? 'bg-tiba-primary-600 text-white shadow-md'
                      : 'bg-white text-tiba-primary-700 border border-tiba-primary-300 hover:bg-tiba-primary-50'
                  }`}
                >
                  كلمة مرور عشوائية
                </button>
              </div>
            </div>
          </div>

          {/* التبويبات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                disabled={submitting}
                className={`text-right p-4 rounded-xl border-2 transition-all disabled:opacity-50 ${
                  mode === tab.id
                    ? 'border-tiba-primary-500 bg-tiba-primary-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-tiba-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-tiba-primary-600">{tab.icon}</span>
                  <span
                    className={`font-semibold ${mode === tab.id ? 'text-tiba-primary-900' : 'text-gray-700'}`}
                  >
                    {tab.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{tab.description}</p>
              </button>
            ))}
          </div>

          {/* محتوى الوضع: اختيار متدربين */}
          {mode === 'single' && (
            <div className="space-y-4">
              {/* البحث */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="ابحث بالاسم، رقم الملف، أو الرقم القومي أو الهاتف..."
                    className="pr-10"
                    disabled={submitting}
                  />
                </div>
                <Button onClick={handleSearch} variant="primary" disabled={loadingList || submitting}>
                  <MagnifyingGlassIcon className="w-4 h-4 ml-1" />
                  بحث
                </Button>
                <div className="w-full md:w-[220px]">
                  <SearchableSelect
                    value={selectedProgram}
                    onChange={(v) => setSelectedProgram(String(v))}
                    placeholder="جميع البرامج"
                    isDisabled={submitting}
                    options={[
                      { value: 'ALL', label: 'جميع البرامج' },
                      ...programs.map((p) => ({ value: String(p.id), label: p.nameAr })),
                    ]}
                  />
                </div>
              </div>

              {/* شريط التحديد */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">
                    محدد: <strong className="text-tiba-primary-700">{selectedIds.size}</strong> من{' '}
                    {trainees.length}
                  </span>
                  <button
                    onClick={selectAllLoaded}
                    disabled={trainees.length === 0 || submitting}
                    className="text-xs text-tiba-primary-700 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    تحديد الكل
                  </button>
                  <button
                    onClick={clearSelection}
                    disabled={selectedIds.size === 0 || submitting}
                    className="text-xs text-gray-600 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    إلغاء التحديد
                  </button>
                </div>
                <Button
                  onClick={handleCreateSelected}
                  variant="primary"
                  size="sm"
                  disabled={selectedIds.size === 0 || submitting}
                  isLoading={submitting}
                >
                  <UserPlusIcon className="w-4 h-4 ml-1" />
                  إنشاء {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </Button>
              </div>

              {/* قائمة المتدربين */}
              {loadingList ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiba-primary-600" />
                </div>
              ) : trainees.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl">
                  <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">لا يوجد متدربون بدون حساب</p>
                  <p className="text-sm text-gray-500 mt-1">
                    كل المتدربين المطابقين يملكون حسابات منصة
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {trainees.map((t) => {
                    const isSelected = selectedIds.has(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleSelection(t.id)}
                        disabled={submitting}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-right transition-all disabled:opacity-60 ${
                          isSelected
                            ? 'border-tiba-primary-500 bg-tiba-primary-50'
                            : 'border-gray-200 bg-white hover:border-tiba-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-tiba-primary-600 border-tiba-primary-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                        {t.photoUrl ? (
                          <img
                            src={t.photoUrl}
                            alt={t.nameAr}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                            {t.nameAr.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate text-sm">{t.nameAr}</p>
                          <p className="text-xs text-gray-500 truncate">{t.nationalId}</p>
                          <p className="text-xs text-tiba-primary-600 truncate">{t.program.nameAr}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* محتوى الوضع: برنامج كامل */}
          {mode === 'bulk-program' && (
            <div className="space-y-4">
              <div className="bg-tiba-warning-50 border-2 border-tiba-warning-200 rounded-xl p-4 flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-tiba-warning-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-tiba-warning-900">
                  <p className="font-semibold mb-1">سيتم إنشاء حسابات لكل متدرب في البرنامج</p>
                  <p>
                    المتدربون الذين يملكون حسابات بالفعل سيتم تخطيهم. كلمة المرور ستكون{' '}
                    {passwordMode === 'nationalId' ? 'نفس الرقم القومي' : 'عشوائية'}.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اختر البرنامج التدريبي
                </label>
                <SearchableSelect
                  value={selectedProgram}
                  onChange={(v) => setSelectedProgram(String(v))}
                  placeholder="اختر برنامجاً"
                  options={programs.map((p) => ({ value: String(p.id), label: p.nameAr }))}
                  isDisabled={submitting}
                />
              </div>

              {programStats && (
                <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-xl p-4">
                  <p className="text-sm text-tiba-primary-900">
                    <strong>{programStats.programName}</strong>: يوجد{' '}
                    <strong className="text-lg">{programStats.count}</strong> متدرب بدون حساب
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateForProgram}
                variant="primary"
                className="w-full"
                disabled={selectedProgram === 'ALL' || submitting}
                isLoading={submitting}
              >
                <BoltIcon className="w-5 h-5 ml-2" />
                إنشاء حسابات البرنامج
                {programStats ? ` (${programStats.count} متدرب)` : ''}
              </Button>
            </div>
          )}

          {/* محتوى الوضع: كل المتدربين */}
          {mode === 'bulk-all' && (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-semibold mb-1">تنبيه: سيتم إنشاء حسابات لكل المتدربين</p>
                  <p>
                    جميع المتدربين في كل البرامج الذين لا يملكون حسابات. عددهم الحالي:{' '}
                    <strong>{stats?.withoutAccount ?? '...'}</strong> متدرب.
                  </p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">إجمالي المتدربين</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalTrainees}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600">لديهم حسابات</p>
                    <p className="text-2xl font-bold text-green-700">{stats.withAccount}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-600">بدون حسابات</p>
                    <p className="text-2xl font-bold text-orange-700">{stats.withoutAccount}</p>
                  </div>
                </div>
              )}

              {stats && stats.perProgram.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <p className="px-4 py-2 bg-gray-50 text-sm font-semibold text-gray-700 border-b border-gray-200">
                    المتدربون بدون حسابات حسب البرنامج
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {stats.perProgram.map((p) => (
                      <div
                        key={p.programId}
                        className="flex justify-between items-center px-4 py-2 text-sm"
                      >
                        <span className="text-gray-700">{p.programName}</span>
                        <span className="font-semibold text-orange-600">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreateAll}
                variant="primary"
                className="w-full"
                disabled={submitting || (stats?.withoutAccount ?? 0) === 0}
                isLoading={submitting}
              >
                <UserGroupIcon className="w-5 h-5 ml-2" />
                إنشاء حسابات كل المتدربين
                {stats ? ` (${stats.withoutAccount} متدرب)` : ''}
              </Button>
            </div>
          )}

          {/* النتائج */}
          {result && (
            <div className="border-t border-gray-200 pt-5 space-y-3">
              <div
                className={`rounded-xl p-4 ${
                  result.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    {result.failed > 0 ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                    نتائج الإنشاء
                  </h4>
                  {result.results.length > 0 && (
                    <Button onClick={copyResultsAsTable} variant="outline" size="sm">
                      {copied ? (
                        <CheckCircleIcon className="w-4 h-4 ml-1 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4 ml-1" />
                      )}
                      {copied ? 'تم النسخ' : 'نسخ الجدول'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">طلب</p>
                    <p className="text-lg font-bold text-gray-800">{result.totalRequested}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-2">
                    <p className="text-xs text-green-700">إنشاء</p>
                    <p className="text-lg font-bold text-green-800">{result.created}</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-2">
                    <p className="text-xs text-blue-700">تحديث</p>
                    <p className="text-lg font-bold text-blue-800">{result.updated}</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-2">
                    <p className="text-xs text-red-700">فشل</p>
                    <p className="text-lg font-bold text-red-800">{result.failed}</p>
                  </div>
                </div>

                {result.results.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">الاسم</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">الرقم القومي</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">كلمة المرور</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.results.map((r) => (
                          <tr key={r.traineeId}>
                            <td className="px-3 py-2 text-gray-800">{r.nameAr}</td>
                            <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.nationalId}</td>
                            <td className="px-3 py-2 text-gray-800 font-mono text-xs">{r.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {result.failedItems.length > 0 && (
                  <div className="mt-2 bg-white rounded-lg border border-red-200 p-3">
                    <p className="text-sm font-semibold text-red-800 mb-1">لم يتم الإنشاء:</p>
                    <ul className="text-xs text-red-700 space-y-0.5 max-h-20 overflow-y-auto">
                      {result.failedItems.map((f) => (
                        <li key={f.traineeId}>
                          • {f.nameAr}: {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* الفوتر */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500">
            كلمة المرور تُشفّر بـ bcrypt ولا تظهر مرة أخرى بعد الإغلاق
          </p>
          <div className="flex gap-2">
            {result && (
              <Button
                onClick={() => {
                  fetchStats();
                  fetchUnassigned(1, searchQuery, selectedProgram);
                  setSelectedIds(new Set());
                }}
                variant="outline"
                disabled={submitting}
              >
                <ArrowPathIcon className="w-4 h-4 ml-1" />
                إنشاء المزيد
              </Button>
            )}
            <Button onClick={onClose} variant="primary" disabled={submitting}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}