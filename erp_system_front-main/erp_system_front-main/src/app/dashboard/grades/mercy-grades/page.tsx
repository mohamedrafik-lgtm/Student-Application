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
  InformationCircleIcon,
  AcademicCapIcon,
  UsersIcon,
  BookOpenIcon,
  ChartBarIcon,
  ArrowUpIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { RequirePermission } from '@/components/permissions/PermissionGate';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';

interface Program {
  id: number;
  nameAr: string;
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

interface PreviewItem {
  traineeId: number;
  traineeName: string;
  nationalId: string;
  contentName: string;
  contentId: number;
  currentTotal: number;
  projectedTotal: number;
  addedPoints: number;
}

interface PreviewResult {
  classroomId: number;
  classroomName: string;
  programName: string;
  bonusPoints: number;
  threshold: number;
  totalAffected: number;
  preview: PreviewItem[];
}

interface ApplyDetail {
  traineeId: number;
  traineeName: string;
  contentName: string;
  oldTotal: number;
  newTotal: number;
  addedPoints: number;
  distribution: Record<string, { old: number; added: number; new: number; max: number }>;
}

interface ApplyResult {
  classroomId: number;
  classroomName: string;
  programName: string;
  bonusPoints: number;
  threshold: number;
  totalUpdated: number;
  totalErrors: number;
  details: ApplyDetail[];
  errors: string[];
}

interface GroupedTrainee<T> {
  traineeId: number;
  traineeName: string;
  nationalId?: string;
  subjects: T[];
}

const componentLabels: Record<string, string> = {
  yearWorkMarks: 'أعمال السنة',
  practicalMarks: 'العملي',
  writtenMarks: 'التحريري',
  attendanceMarks: 'الحضور',
  quizzesMarks: 'اختبارات اونلاين',
  finalExamMarks: 'الميد تيرم',
};

export default function MercyGradesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades.mercy', action: 'manage' }}>
      <MercyGradesContent />
    </ProtectedPage>
  );
}

function MercyGradesContent() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | ''>('');
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<number | ''>('');
  const [bonusPoints, setBonusPoints] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(50);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedTrainees, setExpandedTrainees] = useState<Set<number>>(new Set());
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [selectedContents, setSelectedContents] = useState<number[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [minThreshold, setMinThreshold] = useState<number>(0);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadClassrooms(selectedProgram as number);
    } else {
      setClassrooms([]);
      setSelectedClassroom('');
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
    } catch (err: any) {
      toast.error('فشل في تحميل البرامج التدريبية');
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      setLoadingClassrooms(true);
      setSelectedClassroom('');
      setPreview(null);
      setApplyResult(null);
      const data = await fetchAPI(`/programs/${programId}`);
      setClassrooms(data?.classrooms || []);
    } catch (err: any) {
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
      const list = Array.isArray(data) ? data : data?.contents || [];
      setContents(list);
    } catch (err: any) {
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
  };

  const selectAllContents = () => {
    if (selectedContents.length === contents.length) {
      setSelectedContents([]);
    } else {
      setSelectedContents(contents.map((c) => c.id));
    }
  };

  const handlePreview = async () => {
    if (!selectedClassroom || bonusPoints <= 0) {
      toast.error('يرجى اختيار الفصل الدراسي وتحديد درجات الرأفة');
      return;
    }
    try {
      setLoadingPreview(true);
      setPreview(null);
      setApplyResult(null);

      let url = `/grades/mercy-grades/preview?classroomId=${selectedClassroom}&bonusPoints=${bonusPoints}&threshold=${threshold}&minThreshold=${minThreshold}`;
      if (selectedContents.length > 0) {
        url += `&contentIds=${selectedContents.join(',')}`;
      }
      const data: PreviewResult = await fetchAPI(url);
      setPreview(data);

      if (data.totalAffected === 0) {
        toast.info('لا يوجد متدربون يحتاجون درجات رأفة بهذه المعايير');
      } else {
        toast.success(`تم العثور على ${data.totalAffected} سجل يحتاج رأفة`);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء المعاينة');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (!selectedClassroom || bonusPoints <= 0) return;
    try {
      setLoadingApply(true);
      setShowConfirm(false);

      const data: ApplyResult = await fetchAPI('/grades/mercy-grades/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroom,
          bonusPoints,
          threshold,
          minThreshold,
          ...(selectedContents.length > 0 && { contentIds: selectedContents }),
        }),
      });
      setApplyResult(data);
      setPreview(null);

      if (data.totalUpdated > 0) {
        toast.success(`تم تطبيق درجات الرأفة على ${data.totalUpdated} سجل بنجاح`);
      } else {
        toast.info('لا توجد سجلات تحتاج تحديث');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التطبيق');
    } finally {
      setLoadingApply(false);
    }
  };

  const toggleTrainee = (traineeId: number) => {
    setExpandedTrainees((prev) => {
      const next = new Set(prev);
      if (next.has(traineeId)) next.delete(traineeId);
      else next.add(traineeId);
      return next;
    });
  };

  // تجميع المعاينة حسب المتدرب
  const groupedPreview: GroupedTrainee<PreviewItem>[] = preview
    ? Object.values(
        preview.preview.reduce((acc, item) => {
          if (!acc[item.traineeId]) {
            acc[item.traineeId] = {
              traineeId: item.traineeId,
              traineeName: item.traineeName,
              nationalId: item.nationalId,
              subjects: [],
            };
          }
          acc[item.traineeId].subjects.push(item);
          return acc;
        }, {} as Record<number, GroupedTrainee<PreviewItem>>)
      )
    : [];

  // تجميع نتائج التطبيق حسب المتدرب
  const groupedApply: GroupedTrainee<ApplyDetail>[] = applyResult
    ? Object.values(
        applyResult.details.reduce((acc, item) => {
          if (!acc[item.traineeId]) {
            acc[item.traineeId] = {
              traineeId: item.traineeId,
              traineeName: item.traineeName,
              subjects: [],
            };
          }
          acc[item.traineeId].subjects.push(item);
          return acc;
        }, {} as Record<number, GroupedTrainee<ApplyDetail>>)
      )
    : [];

  return (
    <RequirePermission
      resource="dashboard.grades.mercy"
      action="manage"
      fallback={
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-red-700">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        </div>
      }
    >
      <div className="space-y-6 relative">
        {/* شاشة التحميل أثناء التطبيق */}
        {loadingApply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4 min-w-[280px]">
              <div className="space-y-3 w-full">
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-3/4 mx-auto" />
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-1/2 mx-auto" />
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-2/3 mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">جاري التحميل...</h3>
              <p className="text-sm text-slate-500">يتم الآن تطبيق درجات الرأفة، يرجى الانتظار</p>
            </div>
          </div>
        )}

        <PageHeader
          title="درجات الرأفة"
          description="إضافة درجات تعويضية للمتدربين الذين لديهم مواد أقل من الحد المطلوب"
        />

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 ml-2" />
            رجوع
          </Button>
        </div>

        {/* معلومات توضيحية */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <InformationCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800">كيف تعمل درجات الرأفة؟</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  تقوم هذه الأداة بإضافة درجات تعويضية (رأفة) للمتدربين الذين حصلوا على درجات
                  <strong> أقل من الحد المحدد</strong> في مواد الفصل الدراسي المختار.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="font-bold">آلية التوزيع:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>يتم اختيار المتدربين الذين مجموع درجاتهم أقل من الحد المحدد (مثلاً 50%)</li>
                    <li>يتم توزيع الدرجات المضافة على <strong>المكونات المفعلة</strong> فقط بالتناسب</li>
                    <li>لا يتم تجاوز الحد الأقصى لأي مكون من مكونات الدرجة</li>
                    <li>يمكنك معاينة النتائج قبل التطبيق الفعلي</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* إعدادات الرأفة */}
        <div className="p-6 rounded-xl border-2 border-blue-200 bg-white shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <AcademicCapIcon className="w-5 h-5 text-blue-600" />
            إعدادات درجات الرأفة
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* اختيار البرنامج التدريبي */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">البرنامج التدريبي</label>
              {loadingPrograms ? (
                <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
              ) : (
                <TibaSelect
                  instanceId="mercy-program"
                  options={programs.map((prog) => ({ value: String(prog.id), label: prog.nameAr }))}
                  value={selectedProgram === '' ? '' : String(selectedProgram)}
                  onChange={(val) => {
                    setSelectedProgram(val ? parseInt(val) : '');
                    setPreview(null);
                    setApplyResult(null);
                  }}
                  placeholder="اختر البرنامج..."
                />
              )}
            </div>

            {/* اختيار الفصل الدراسي */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">الفصل الدراسي</label>
              {loadingClassrooms ? (
                <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
              ) : (
                <TibaSelect
                  instanceId="mercy-classroom"
                  options={classrooms.map((cls) => ({ value: String(cls.id), label: cls.name }))}
                  value={selectedClassroom === '' ? '' : String(selectedClassroom)}
                  onChange={(val) => {
                    setSelectedClassroom(val ? parseInt(val) : '');
                    setPreview(null);
                    setApplyResult(null);
                  }}
                  disabled={!selectedProgram}
                  placeholder={selectedProgram ? 'اختر الفصل...' : 'اختر البرنامج أولاً'}
                />
              )}
            </div>

            {/* درجات الرأفة */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                عدد الدرجات المضافة
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={bonusPoints}
                onChange={(e) => setBonusPoints(parseFloat(e.target.value) || 0)}
                className="focus:ring-blue-200 focus:border-blue-500"
                placeholder="مثال: 5"
              />
              <p className="text-xs text-slate-500 mt-1">الحد الأقصى 20 درجة</p>
            </div>

            {/* الحد الأدنى للدرجة */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                الحد الأدنى للدرجة
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                className="focus:ring-blue-200 focus:border-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">الأقل من هذا الحد لا يحصلون على رأفة</p>
            </div>

            {/* الحد الأعلى للدرجة */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                الحد الأعلى (%)
              </label>
              <Input
                type="number"
                min={10}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 50)}
                className="focus:ring-blue-200 focus:border-blue-500"
                placeholder="50"
              />
              <p className="text-xs text-slate-500 mt-1">الرأفة للدرجات بين {minThreshold} و {threshold}</p>
            </div>
          </div>

          {/* اختيار المواد المستهدفة */}
          {selectedClassroom && (
            <div className="mt-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-teal-500" />
                  المواد المستهدفة
                  {selectedContents.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {selectedContents.length} من {contents.length}
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={selectAllContents}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  {selectedContents.length === contents.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>

              {loadingContents ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              ) : contents.length === 0 ? (
                <p className="text-sm text-slate-400">لا توجد مواد في هذا الفصل</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contents.map((content) => {
                    const isSelected = selectedContents.includes(content.id);
                    return (
                      <button
                        key={content.id}
                        type="button"
                        onClick={() => toggleContent(content.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          isSelected
                            ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {isSelected && <CheckCircleIcon className="inline ml-1 w-3 h-3 text-blue-600" />}
                        {content.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedContents.length === 0 && contents.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 inline" /> لم يتم اختيار مواد — سيتم تطبيق الرأفة على جميع المواد
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handlePreview}
              disabled={!selectedClassroom || bonusPoints <= 0 || loadingPreview}
            >
              {loadingPreview ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري المعاينة...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  معاينة النتائج
                </span>
              )}
            </Button>

            {preview && preview.totalAffected > 0 && (
              <Button
                onClick={() => setShowConfirm(true)}
                variant="success"
              >
                <CheckCircleIcon className="w-4 h-4 ml-2" />
                تطبيق درجات الرأفة ({preview.totalAffected} سجل)
              </Button>
            )}
          </div>
        </div>

        {/* مربع حوار التأكيد */}
        {showConfirm && (
          <div className="bg-white rounded-xl border-2 border-blue-300 shadow-sm p-6">
            <div className="text-center space-y-4">
              <ExclamationTriangleIcon className="w-12 h-12 text-blue-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">تأكيد تطبيق درجات الرأفة</h3>
              <p className="text-slate-600">
                سيتم إضافة حتى <strong>{bonusPoints}</strong> درجة لـ <strong>{preview?.totalAffected}</strong> سجل
                في الفصل <strong>{preview?.classroomName}</strong>.
                <br />
                <span className="text-sm text-slate-500">هذا الإجراء لا يمكن التراجع عنه بسهولة!</span>
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handleApply}
                  disabled={loadingApply}
                >
                  {loadingApply ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التطبيق...
                    </span>
                  ) : (
                    'نعم، تطبيق الرأفة'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loadingApply}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* نتائج المعاينة — مجمعة حسب المتدرب */}
        {preview && preview.totalAffected > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                معاينة النتائج
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                  <UsersIcon className="inline ml-1 w-3 h-3" />
                  {groupedPreview.length} متدرب
                </span>
                <span className="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-medium">
                  <BookOpenIcon className="inline ml-1 w-3 h-3" />
                  {preview.totalAffected} مادة
                </span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                  {preview.programName}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {groupedPreview.map((trainee, tIdx) => (
                <div key={trainee.traineeId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* رأس بطاقة المتدرب */}
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{tIdx + 1}. {trainee.traineeName}</h4>
                          {trainee.nationalId && (
                            <p className="text-xs text-slate-500">{trainee.nationalId}</p>
                          )}
                        </div>
                      </div>
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {trainee.subjects.length} {trainee.subjects.length === 1 ? 'مادة' : 'مواد'}
                      </span>
                    </div>
                  </div>

                  {/* مواد المتدرب */}
                  <div className="divide-y divide-slate-100">
                    {trainee.subjects.map((subj) => (
                      <div key={subj.contentId} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <BookOpenIcon className="w-3.5 h-3.5 text-teal-500" />
                          <span className="font-medium text-slate-800 text-sm">{subj.contentName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                              {subj.currentTotal}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">الحالية</p>
                          </div>
                          <div className="text-center">
                            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                              <ArrowUpIcon className="w-2.5 h-2.5" />
                              +{subj.addedPoints}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">مضافة</p>
                          </div>
                          <div className="text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              subj.projectedTotal >= threshold
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {subj.projectedTotal}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">بعد الرأفة</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* نتائج التطبيق — مجمعة حسب المتدرب */}
        {applyResult && (
          <div className="space-y-4">
            {/* إحصائيات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border-2 border-green-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">سجلات تم تحديثها</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{applyResult.totalUpdated}</p>
              </div>

              <div className="bg-white rounded-xl border-2 border-teal-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <UsersIcon className="w-4 h-4 text-teal-600" />
                  <p className="text-sm text-teal-600 font-medium">متدرب مستفيد</p>
                </div>
                <p className="text-3xl font-bold text-teal-700">{groupedApply.length}</p>
              </div>

              <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">درجات الرأفة</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{applyResult.bonusPoints}</p>
              </div>

              {applyResult.totalErrors > 0 && (
                <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-600 font-medium">أخطاء</p>
                  </div>
                  <p className="text-3xl font-bold text-red-700">{applyResult.totalErrors}</p>
                </div>
              )}
            </div>

            {/* تفاصيل التطبيق مجمعة حسب المتدرب */}
            {groupedApply.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <BookOpenIcon className="w-5 h-5 text-teal-600" />
                  تفاصيل التطبيق
                </h3>

                {groupedApply.map((trainee, tIdx) => (
                  <div key={trainee.traineeId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* رأس بطاقة المتدرب — قابل للنقر */}
                    <button
                      onClick={() => toggleTrainee(trainee.traineeId)}
                      className="w-full px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-slate-800">{tIdx + 1}. {trainee.traineeName}</h4>
                          <p className="text-xs text-slate-500">
                            {trainee.subjects.length} {trainee.subjects.length === 1 ? 'مادة' : 'مواد'}
                            {' — '}
                            إجمالي المضاف: +{trainee.subjects.reduce((s, d) => s + d.addedPoints, 0).toFixed(1)} درجة
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        {expandedTrainees.has(trainee.traineeId) ? (
                          <ChevronUpIcon className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* مواد المتدرب — تظهر عند التوسيع */}
                    {expandedTrainees.has(trainee.traineeId) && (
                      <div className="divide-y divide-slate-100">
                        {trainee.subjects.map((subj) => (
                          <div key={subj.contentName} className="px-5 py-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <BookOpenIcon className="w-3.5 h-3.5 text-teal-500" />
                                <span className="font-medium text-slate-800 text-sm">{subj.contentName}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                    {subj.oldTotal}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">قبل</p>
                                </div>
                                <div className="text-center">
                                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                    +{subj.addedPoints}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">مضاف</p>
                                </div>
                                <div className="text-center">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    subj.newTotal >= threshold
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {subj.newTotal}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">بعد</p>
                                </div>
                              </div>
                            </div>
                            {/* توزيع الدرجات على المكونات */}
                            {subj.distribution && (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mr-7">
                                {Object.entries(subj.distribution).map(([key, val]) => (
                                  val.added > 0 && (
                                    <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-slate-500 font-medium mb-0.5">
                                        {componentLabels[key] || key}
                                      </p>
                                      <p className="text-xs font-bold text-slate-800">
                                        {val.old} <span className="text-green-600">+{val.added}</span> = {val.new}
                                      </p>
                                      <p className="text-[9px] text-slate-400">من {val.max}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* الأخطاء */}
            {applyResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl border-2 border-red-200 shadow-sm p-4">
                <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
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
    </RequirePermission>
  );
}
