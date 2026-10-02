'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { Input } from '@/components/ui/input';
import PageHeader from '@/app/components/PageHeader';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  UserIcon,
  BookOpenIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';

interface Program {
  id: number;
  nameAr: string;
}

interface Classroom {
  id: number;
  name: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroomId: number;
  classroom?: { id: number; name: string };
}

interface PreviewItem {
  gradeId: number;
  traineeId: number;
  traineeName: string;
  nationalId: string;
  contentId: number;
  contentName: string;
  classroomName: string;
  componentValue: number;
  currentTotal: number;
  projectedTotal: number;
}

interface PreviewResult {
  component: string;
  threshold: number;
  totalAffected: number;
  contents: { id: number; name: string; code: string }[];
  preview: PreviewItem[];
}

interface ApplyDetail {
  traineeId: number;
  traineeName: string;
  contentName: string;
  oldValue: number;
  oldTotal: number;
  newTotal: number;
}

interface ApplyResult {
  component: string;
  threshold: number;
  totalUpdated: number;
  totalErrors: number;
  details: ApplyDetail[];
  errors: string[];
}

const componentOptions = [
  { value: 'yearWorkMarks', label: 'أعمال السنة' },
  { value: 'practicalMarks', label: 'العملي' },
  { value: 'writtenMarks', label: 'التحريري' },
  { value: 'attendanceMarks', label: 'الحضور' },
  { value: 'quizzesMarks', label: 'اختبارات اونلاين' },
  { value: 'finalExamMarks', label: 'الميد تيرم' },
];

export default function ResetComponentPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades.reset-component', action: 'manage' }}>
      <ResetComponentContent />
    </ProtectedPage>
  );
}

function ResetComponentContent() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | ''>('');
  const [selectedClassroom, setSelectedClassroom] = useState<number | ''>('');
  const [selectedContents, setSelectedContents] = useState<number[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(10);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadClassrooms(selectedProgram as number);
    } else {
      setClassrooms([]);
      setSelectedClassroom('');
      setContents([]);
      setSelectedContents([]);
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedClassroom) {
      loadContents(selectedClassroom as number);
    } else {
      setContents([]);
      setSelectedContents([]);
    }
  }, [selectedClassroom]);

  const loadPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const data = await fetchAPI('/training-programs');
      setPrograms(Array.isArray(data) ? data : data?.programs || []);
    } catch {
      toast.error('فشل في تحميل البرامج التدريبية');
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      setLoadingClassrooms(true);
      setSelectedClassroom('');
      setContents([]);
      setSelectedContents([]);
      setPreview(null);
      setApplyResult(null);
      const data = await fetchAPI(`/programs/${programId}`);
      setClassrooms(data?.classrooms || []);
    } catch {
      toast.error('فشل في تحميل الفصول الدراسية');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const loadContents = async (classroomId: number) => {
    try {
      setLoadingContents(true);
      setSelectedContents([]);
      setPreview(null);
      setApplyResult(null);
      const data = await fetchAPI(`/training-contents?classroomId=${classroomId}`);
      const contentsArray = Array.isArray(data) ? data : data?.contents || data?.data || [];
      setContents(contentsArray);
    } catch {
      toast.error('فشل في تحميل المواد التدريبية');
    } finally {
      setLoadingContents(false);
    }
  };

  const toggleContent = (contentId: number) => {
    setSelectedContents((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId]
    );
    setPreview(null);
    setApplyResult(null);
  };

  const selectAllContents = () => {
    if (selectedContents.length === contents.length) {
      setSelectedContents([]);
    } else {
      setSelectedContents(contents.map((c) => c.id));
    }
    setPreview(null);
    setApplyResult(null);
  };

  const handlePreview = async () => {
    if (selectedContents.length === 0 || !selectedComponent) {
      toast.error('يرجى اختيار المواد ومكون الدرجة');
      return;
    }
    try {
      setLoadingPreview(true);
      setPreview(null);
      setApplyResult(null);
      const ids = selectedContents.join(',');
      const data: PreviewResult = await fetchAPI(
        `/grades/reset-component/preview?contentIds=${ids}&component=${selectedComponent}&threshold=${threshold}`
      );
      setPreview(data);
      if (data.totalAffected === 0) {
        toast.info('لا يوجد متدربون تنطبق عليهم الشروط');
      } else {
        toast.success(`تم العثور على ${data.totalAffected} سجل`);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء المعاينة');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (selectedContents.length === 0 || !selectedComponent) return;
    try {
      setLoadingApply(true);
      setShowConfirm(false);
      const data: ApplyResult = await fetchAPI('/grades/reset-component/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIds: selectedContents,
          component: selectedComponent,
          threshold,
        }),
      });
      setApplyResult(data);
      setPreview(null);
      if (data.totalUpdated > 0) {
        toast.success(`تم تصفير ${getComponentLabel(selectedComponent)} لـ ${data.totalUpdated} سجل بنجاح`);
      } else {
        toast.info('لا توجد سجلات تحتاج تحديث');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التطبيق');
    } finally {
      setLoadingApply(false);
    }
  };

  const getComponentLabel = (value: string) => {
    return componentOptions.find((c) => c.value === value)?.label || value;
  };

  // تجميع المعاينة حسب المادة
  const groupedByContent = preview
    ? preview.preview.reduce((acc, item) => {
        if (!acc[item.contentName]) acc[item.contentName] = [];
        acc[item.contentName].push(item);
        return acc;
      }, {} as Record<string, PreviewItem[]>)
    : {};

  // تجميع نتائج التطبيق حسب المادة
  const groupedApplyByContent = applyResult
    ? applyResult.details.reduce((acc, item) => {
        if (!acc[item.contentName]) acc[item.contentName] = [];
        acc[item.contentName].push(item);
        return acc;
      }, {} as Record<string, ApplyDetail[]>)
    : {};

  return (
    <div className="space-y-6 relative">
      {/* شاشة التحميل أثناء التطبيق */}
      {loadingApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="w-14 h-14 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-red-800">جاري التصفير...</h3>
            <p className="text-sm text-slate-500">يتم الآن تصفير الدرجات، يرجى الانتظار</p>
          </div>
        </div>
      )}

      <PageHeader
        title="تصفير مكون درجة"
        description="تصفير درجة مكون معين (تحريري، عملي، إلخ) للمتدربين الذين درجتهم أقل من أو يساوي حد معين"
      />

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* تحذير */}
      <div className="p-5 bg-red-50 rounded-xl border border-red-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-red-900">تنبيه مهم</h3>
            <div className="text-sm text-red-800 space-y-1">
              <p>هذه الأداة تقوم <strong>بتصفير</strong> درجة مكون معين للمتدربين المستهدفين.</p>
              <p>• يتم استهداف فقط المتدربين الذين درجتهم في المكون المختار <strong>أكبر من 0 وأقل من أو يساوي</strong> الحد المحدد.</p>
              <p>• <strong>هذا الإجراء لا يمكن التراجع عنه بسهولة!</strong> يرجى المعاينة أولاً.</p>
            </div>
          </div>
        </div>
      </div>

      {/* إعدادات التصفير */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrashIcon className="w-5 h-5 text-red-600" />
          إعدادات التصفير
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* اختيار البرنامج */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">البرنامج التدريبي</label>
            {loadingPrograms ? (
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <TibaSelect
                value={selectedProgram === '' ? '' : String(selectedProgram)}
                onChange={(val) => {
                  setSelectedProgram(val ? parseInt(val) : '');
                  setPreview(null);
                  setApplyResult(null);
                }}
                options={programs.map((p) => ({ value: String(p.id), label: p.nameAr }))}
                placeholder="اختر البرنامج..."
              />
            )}
          </div>

          {/* اختيار الفصل */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">الفصل الدراسي</label>
            {loadingClassrooms ? (
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <TibaSelect
                value={selectedClassroom === '' ? '' : String(selectedClassroom)}
                onChange={(val) => {
                  setSelectedClassroom(val ? parseInt(val) : '');
                  setPreview(null);
                  setApplyResult(null);
                }}
                options={classrooms.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder={selectedProgram ? 'اختر الفصل...' : 'اختر البرنامج أولاً'}
                disabled={!selectedProgram}
              />
            )}
          </div>
        </div>

        {/* اختيار المواد */}
        {selectedClassroom && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-600">المواد التدريبية</label>
              {contents.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllContents}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  {selectedContents.length === contents.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              )}
            </div>
            {loadingContents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : contents.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">لا توجد مواد في هذا الفصل</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {contents.map((content) => (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => toggleContent(content.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-right transition-all text-sm ${
                      selectedContents.includes(content.id)
                        ? 'border-red-400 bg-red-50 text-red-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      selectedContents.includes(content.id) ? 'bg-red-500' : 'border-2 border-slate-300'
                    }`}>
                      {selectedContents.includes(content.id) && (
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-medium truncate">{content.name}</p>
                      {content.code && <p className="text-xs text-slate-500">{content.code}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* مكون الدرجة */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">مكون الدرجة المراد تصفيره</label>
            <TibaSelect
              value={selectedComponent}
              onChange={(val) => {
                setSelectedComponent(val);
                setPreview(null);
                setApplyResult(null);
              }}
              options={componentOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              placeholder="اختر المكون..."
            />
          </div>

          {/* الحد */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              الحد الأقصى (≤)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              className="focus:ring-red-200 focus:border-red-400"
              placeholder="10"
            />
            <p className="text-xs text-slate-500 mt-1">سيتم تصفير درجة المتدربين الذين حصلوا على ≤ {threshold} في المكون المختار</p>
          </div>
        </div>

        {/* أزرار */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handlePreview}
            disabled={selectedContents.length === 0 || !selectedComponent}
            isLoading={loadingPreview}
          >
            <span className="flex items-center gap-2">
              <MagnifyingGlassIcon className="w-4 h-4" />
              {loadingPreview ? 'جاري المعاينة...' : 'معاينة المتدربين المستهدفين'}
            </span>
          </Button>

          {preview && preview.totalAffected > 0 && (
            <Button
              onClick={() => setShowConfirm(true)}
              variant="danger"
            >
              <TrashIcon className="w-4 h-4 ml-2" />
              تصفير الدرجات ({preview.totalAffected} سجل)
            </Button>
          )}
        </div>
      </div>

      {/* مربع حوار التأكيد */}
      {showConfirm && (
        <div className="p-6 rounded-xl border-2 border-red-300 bg-red-50 shadow-sm">
          <div className="text-center space-y-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-red-800">تأكيد تصفير الدرجات</h3>
            <p className="text-red-700">
              سيتم تصفير <strong>{getComponentLabel(selectedComponent)}</strong> لـ <strong>{preview?.totalAffected}</strong> سجل
              <br />
              (المتدربين الذين درجتهم ≤ {threshold} في هذا المكون)
              <br />
              <span className="text-sm font-bold">هذا الإجراء لا يمكن التراجع عنه!</span>
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleApply}
                disabled={loadingApply}
                variant="danger"
                isLoading={loadingApply}
              >
                {loadingApply ? 'جاري التصفير...' : 'نعم، تصفير الدرجات'}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loadingApply}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نتائج المعاينة */}
      {preview && preview.totalAffected > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
              المتدربون المستهدفون
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-medium">
                <UsersIcon className="inline ml-1 w-3 h-3" />
                {preview.totalAffected} سجل
              </span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                {getComponentLabel(selectedComponent)} ≤ {threshold}
              </span>
            </div>
          </div>

          {Object.entries(groupedByContent).map(([contentName, items]) => (
            <div key={contentName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4 text-slate-400" />
                    <h4 className="font-bold text-slate-800">{contentName}</h4>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {items.length} متدرب
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600">#</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600">المتدرب</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">الرقم القومي</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">الفصل</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">
                        {getComponentLabel(selectedComponent)}
                      </th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">المجموع الحالي</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">المجموع بعد التصفير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                      <tr key={item.gradeId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-800">{item.traineeName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{item.nationalId}</td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{item.classroomName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                            {item.componentValue}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium text-slate-800">{item.currentTotal}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="text-orange-700 font-bold">{item.projectedTotal}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نتائج التطبيق */}
      {applyResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-green-50 rounded-xl border border-green-200 shadow-sm text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600 font-medium">تم تصفيرها</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{applyResult.totalUpdated}</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrashIcon className="w-4 h-4 text-slate-500" />
                <p className="text-sm text-slate-600 font-medium">المكون</p>
              </div>
              <p className="text-lg font-bold text-slate-700">{getComponentLabel(applyResult.component)}</p>
            </div>

            {applyResult.totalErrors > 0 && (
              <div className="p-5 bg-red-50 rounded-xl border border-red-200 shadow-sm text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">أخطاء</p>
                </div>
                <p className="text-3xl font-bold text-red-700">{applyResult.totalErrors}</p>
              </div>
            )}
          </div>

          {/* تفاصيل */}
          {Object.entries(groupedApplyByContent).map(([contentName, items]) => (
            <div key={contentName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <h4 className="font-bold text-slate-800">{contentName}</h4>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {items.length} متدرب
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600">#</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600">المتدرب</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">القيمة السابقة</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">المجموع السابق</th>
                      <th className="text-center py-2.5 px-4 font-medium text-slate-600">المجموع الجديد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                      <tr key={`${item.traineeId}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{item.traineeName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold line-through">
                            {item.oldValue}
                          </span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">0</span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{item.oldTotal}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-green-700">{item.newTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* أخطاء */}
          {applyResult.errors.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 shadow-sm">
              <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                أخطاء ({applyResult.errors.length}):
              </h4>
              <div className="space-y-1 text-sm text-red-600">
                {applyResult.errors.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
