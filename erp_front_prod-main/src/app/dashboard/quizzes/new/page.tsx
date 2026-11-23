'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { SearchableSelect } from '@/app/components/ui/Select';
import { createQuiz, CreateQuizDto, getAllQuizzes, Quiz } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, TrashIcon, Bars3Icon, ClipboardDocumentListIcon, ClockIcon, CogIcon, BoltIcon, QuestionMarkCircleIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, CalendarDaysIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  programId: number;
  chaptersCount: number;
  yearWorkMarks: number; practicalMarks: number; writtenMarks: number; attendanceMarks: number; quizzesMarks: number; finalExamMarks: number;
  yearWorkMarksLabel?: string; practicalMarksLabel?: string; writtenMarksLabel?: string; attendanceMarksLabel?: string; quizzesMarksLabel?: string; finalExamMarksLabel?: string;
}

interface ProgramFee {
  id: number;
  name: string;
  amount: number;
  type: string;
  academicYear: string;
}

interface Question {
  id: number;
  text: string;
  type: string;
  skill: string;
  difficulty: string;
  chapter: number;
  createdAt?: string;
  quizQuestions?: { quizId: number }[];
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
  }[];
}

interface SelectedQuestion {
  questionId: number;
  question: Question;
  points: number;
  order: number;
}

export default function NewQuizPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'create' }}>
      <NewQuizContent />
    </ProtectedPage>
  );
}

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

function NewQuizContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [programFees, setProgramFees] = useState<ProgramFee[]>([]);
  const [mobileAppEnabled, setMobileAppEnabled] = useState(false);
  const [mobileAppLinks, setMobileAppLinks] = useState({ googlePlayUrl: '', appStoreUrl: '' });
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);

  // Form state
  const [programId, setProgramId] = useState<number | null>(null);
  const [trainingContentId, setTrainingContentId] = useState<number | null>(null);
  const [gradeComponentKey, setGradeComponentKey] = useState('quizzesMarks');
  const [gradeAllocation, setGradeAllocation] = useState(1);
  const [usedAllocations, setUsedAllocations] = useState<Record<string, number>>({});
  const [feeRequirementEnabled, setFeeRequirementEnabled] = useState(false);
  const [requiredFeeId, setRequiredFeeId] = useState<number | null>(null);
  const [deliveryPlatform, setDeliveryPlatform] = useState<'WEB' | 'MOBILE' | 'BOTH'>('WEB');
  const [integrityMonitoringEnabled, setIntegrityMonitoringEnabled] = useState(false);
  const [maxTabDepartures, setMaxTabDepartures] = useState(3);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [autoSelectCount, setAutoSelectCount] = useState(10);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [excludeUsedInQuizzes, setExcludeUsedInQuizzes] = useState(false);
  const [questionAddedOn, setQuestionAddedOn] = useState('');

  const usedInOtherQuizzesCount = availableQuestions.filter(question => (question.quizQuestions?.length || 0) > 0).length;
  const questionDateCounts = new Map<string, number>();
  availableQuestions.forEach(question => {
    if (!question.createdAt) return;
    const createdAt = new Date(question.createdAt);
    const localDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
    questionDateCounts.set(localDate, (questionDateCounts.get(localDate) || 0) + 1);
  });
  const questionDates = [...questionDateCounts.entries()]
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, count]) => ({
      date,
      count,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
    }));
  const dateFilteredQuestions = questionAddedOn
    ? availableQuestions.filter(question => {
        if (!question.createdAt) return false;
        const createdAt = new Date(question.createdAt);
        const localDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
        return localDate === questionAddedOn;
      })
    : availableQuestions;
  const filteredQuestions = dateFilteredQuestions.filter(question => !excludeUsedInQuizzes || !(question.quizQuestions?.length));
  const unselectedAvailableQuestions = filteredQuestions.filter(question => !selectedQuestions.some(selected => selected.questionId === question.id));

  // Keep the question points aligned with the quiz's allocated component grade.
  // Work in hundredths so fractional marks still add up to the exact target.
  useEffect(() => {
    if (selectedQuestions.length === 0 || !Number.isFinite(gradeAllocation)) return;
    const targetCents = Math.round(gradeAllocation * 100);
    const baseCents = Math.floor(targetCents / selectedQuestions.length);
    const remainderCents = targetCents % selectedQuestions.length;
    setSelectedQuestions(current => current.map((question, index) => ({
      ...question,
      points: (baseCents + (index < remainderCents ? 1 : 0)) / 100,
    })));
  }, [gradeAllocation, selectedQuestions.length]);

  useEffect(() => {
    loadPrograms();
    fetchAPI('/developer-settings?includeValues=true').then((settings: Array<{ key: string; value?: string }>) => {
      const values = new Map((Array.isArray(settings) ? settings : []).map(item => [item.key, item.value || '']));
      setMobileAppEnabled(values.get('MOBILE_APP_ENABLED') === 'true');
      setMobileAppLinks({ googlePlayUrl: values.get('MOBILE_APP_GOOGLE_PLAY_URL') || '', appStoreUrl: values.get('MOBILE_APP_APPSTORE_URL') || '' });
    }).catch(() => setMobileAppEnabled(false));
  }, []);

  useEffect(() => {
    if (programId) {
      loadTrainingContents(programId);
      fetchAPI(`/finances/trainee-fees?programId=${programId}`).then((fees: ProgramFee[]) => setProgramFees(Array.isArray(fees) ? fees : [])).catch(() => setProgramFees([]));
      // Reset content selection when program changes
      setTrainingContentId(null);
      setAvailableQuestions([]);
      setSelectedQuestions([]);
      setQuestionAddedOn('');
      setFeeRequirementEnabled(false);
      setRequiredFeeId(null);
    } else {
      setProgramFees([]);
    }
  }, [programId]);

  useEffect(() => {
    if (trainingContentId) {
      loadQuestions(trainingContentId);
      getAllQuizzes(trainingContentId).then((items: Quiz[]) => {
        const totals: Record<string, number> = {};
        (Array.isArray(items) ? items : []).forEach(item => {
          if (item.gradeAllocation != null && item.gradeComponentKey) totals[item.gradeComponentKey] = (totals[item.gradeComponentKey] || 0) + Number(item.gradeAllocation);
        });
        setUsedAllocations(totals);
      }).catch(() => setUsedAllocations({}));
    } else {
      setUsedAllocations({});
    }
  }, [trainingContentId]);

  const loadPrograms = async () => {
    try {
      const response = await fetchAPI('/programs');
      const data = response?.programs || response || [];
      setPrograms(data);
    } catch (error) {
      toast.error('حدث خطأ في تحميل البرامج التدريبية');
    }
  };

  const loadTrainingContents = async (programId: number) => {
    try {
      const data = await fetchAPI(`/training-contents?programId=${programId}`);
      setTrainingContents(data);
    } catch (error) {
      toast.error('حدث خطأ في تحميل المواد التدريبية');
    }
  };

  const loadQuestions = async (contentId: number) => {
    try {
      const data = await fetchAPI(`/questions/content/${contentId}?includeQuizUsage=true`);
      setAvailableQuestions(data);
    } catch (error) {
      toast.error('حدث خطأ في تحميل الأسئلة');
    }
  };

  const addQuestion = (question: Question) => {
    if (selectedQuestions.some(q => q.questionId === question.id)) {
      toast.error('هذا السؤال مضاف مسبقاً');
      return;
    }

    setSelectedQuestions([
      ...selectedQuestions,
      {
        questionId: question.id,
        question,
        points: 1,
        order: selectedQuestions.length,
      },
    ]);
  };

  const removeQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.questionId !== questionId));
  };

  const updatePoints = (questionId: number, points: number) => {
    setSelectedQuestions(
      selectedQuestions.map(q =>
        q.questionId === questionId ? { ...q, points } : q
      )
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedQuestions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reordered = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    setSelectedQuestions(reordered);
  };

  const handleAutoSelectQuestions = async () => {
    if (!trainingContentId) {
      toast.error('يرجى اختيار المادة التدريبية أولاً');
      return;
    }

    if (unselectedAvailableQuestions.length === 0) {
      toast.error('لا توجد أسئلة متاحة في بنك الأسئلة');
      return;
    }

    if (autoSelectCount <= 0) {
      toast.error('يرجى إدخال عدد صحيح من الأسئلة');
      return;
    }

    if (autoSelectCount > unselectedAvailableQuestions.length) {
      toast.error(`العدد المتاح بعد تطبيق الفلاتر: ${unselectedAvailableQuestions.length} سؤال فقط`);
      return;
    }

    try {
      setIsAutoSelecting(true);
      
      // تصفية الأسئلة غير المضافة
      const unselectedQuestions = unselectedAvailableQuestions;
      const countToSelect = Math.min(autoSelectCount, unselectedQuestions.length);

      // خلط الأسئلة واختيار عدد عشوائي
      const shuffled = [...unselectedQuestions].sort(() => Math.random() - 0.5);
      const questionsToAdd = shuffled.slice(0, countToSelect);

      // إضافة الأسئلة
      const newQuestions = questionsToAdd.map((q, index) => ({
        questionId: q.id,
        question: q,
        points: 1,
        order: selectedQuestions.length + index,
      }));

      setSelectedQuestions([...selectedQuestions, ...newQuestions]);
      toast.success(`✅ تم إضافة ${countToSelect} سؤال تلقائياً`);
    } catch (error) {
      toast.error('حدث خطأ في الاختيار التلقائي');
    } finally {
      setIsAutoSelecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!programId) {
      toast.error('يرجى اختيار البرنامج التدريبي');
      return;
    }

    if (!trainingContentId) {
      toast.error('يرجى اختيار المادة التدريبية');
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error('يرجى إضافة أسئلة للاختبار');
      return;
    }

    const questionPointsTotal = selectedQuestions.reduce((sum, question) => sum + question.points, 0);
    if (Math.round(questionPointsTotal * 100) !== Math.round(gradeAllocation * 100)) {
      toast.error(`مجموع درجات الأسئلة (${questionPointsTotal.toFixed(2)}) يجب أن يساوي درجة الاختبار (${gradeAllocation.toFixed(2)})`);
      return;
    }

    const chosenContent = trainingContents.find(content => content.id === trainingContentId);
    const componentCap = Number(chosenContent?.[gradeComponentKey as keyof TrainingContent] || 0);
    const availableGradeAllocation = Math.max(0, componentCap - (usedAllocations[gradeComponentKey] || 0));
    const safeGradeAllocation = Math.min(gradeAllocation, availableGradeAllocation);
    if (!chosenContent || safeGradeAllocation <= 0) {
      toast.error('درجة الاختبار يجب أن تكون ضمن الحد الأقصى للجزء المختار');
      return;
    }
    setGradeAllocation(safeGradeAllocation);

    if (feeRequirementEnabled && !requiredFeeId) {
      toast.error('اختر الرسم المطلوب سداده بالكامل');
      return;
    }

    if (deliveryPlatform !== 'WEB' && !mobileAppEnabled) {
      toast.error('فعّل تطبيق الهاتف من إعدادات تطبيق الجوال أولاً');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    const dto: CreateQuizDto = {
      trainingContentId,
      gradeComponentKey,
      gradeAllocation: safeGradeAllocation,
      feeRequirementEnabled,
      requiredFeeId: feeRequirementEnabled ? requiredFeeId : null,
      deliveryPlatform,
      integrityMonitoringEnabled,
      maxTabDepartures,
      title,
      description,
      instructions,
      startDate,
      endDate,
      duration,
      passingScore,
      maxAttempts,
      shuffleQuestions,
      shuffleAnswers,
      showResults,
      showCorrectAnswers,
      isActive: true,
      isPublished,
      questions: selectedQuestions.map(q => ({
        questionId: q.questionId,
        order: q.order,
        points: q.points,
      })),
    };

    try {
      setLoading(true);
      await createQuiz(dto);
      toast.success('تم إنشاء الاختبار بنجاح');
      router.push('/dashboard/quizzes');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إنشاء الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
  const getGradeAllocationLimit = (key: string) => {
    const content = trainingContents.find(item => item.id === trainingContentId);
    return Math.max(0, Number(content?.[key as keyof TrainingContent] || 0) - (usedAllocations[key] || 0));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء اختبار مصغر جديد"
        description="إنشاء اختبار إلكتروني للمادة التدريبية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات المصغرة', href: '/dashboard/quizzes' },
          { label: 'إنشاء اختبار' }
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" /></div>
            <h3 className="font-semibold text-slate-800">المعلومات الأساسية</h3>
          </div>
          <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                البرنامج التدريبي *
              </label>
              <SearchableSelect
                options={programs.map(p => ({ value: p.id.toString(), label: p.nameAr }))}
                value={programId?.toString() || ''}
                onChange={(value) => setProgramId(parseInt(value))}
                placeholder="اختر البرنامج التدريبي أولاً"
                instanceId="program-select"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600" /> إتاحة الاختبار على المنصات</div>
              <p className="mb-3 text-xs text-slate-600">اختر أين يمكن للمتدرب أداء الاختبار. الاختبار المتاح للهاتف سيظهر في الويب مع قفل وروابط التحميل.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([{ value: 'WEB', label: 'نسخة الويب', icon: ComputerDesktopIcon }, { value: 'MOBILE', label: 'تطبيق Android و iPhone', icon: DevicePhoneMobileIcon }, { value: 'BOTH', label: 'الويب والتطبيق معاً', icon: ClipboardDocumentListIcon }] as const).map(option => {
                  const disabled = option.value !== 'WEB' && !mobileAppEnabled;
                  const Icon = option.icon;
                  return <button type="button" key={option.value} disabled={disabled} onClick={() => setDeliveryPlatform(option.value)} className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition ${deliveryPlatform === option.value ? 'border-indigo-500 bg-white text-indigo-700 ring-1 ring-indigo-200' : 'border-slate-200 bg-white text-slate-700'} ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:border-indigo-300'}`}><Icon className="h-5 w-5" />{option.label}</button>;
                })}
              </div>
              {!mobileAppEnabled ? <p className="mt-3 text-xs text-amber-700">خيارات التطبيق غير متاحة؛ فعّل التطبيق من <a className="underline" href="/dashboard/settings/mobile-app" target="_blank" rel="noreferrer">إعدادات تطبيق الجوال</a>.</p> : <div className="mt-3 flex flex-wrap gap-3 text-xs">{mobileAppLinks.googlePlayUrl && <a className="text-indigo-700 underline" href={mobileAppLinks.googlePlayUrl} target="_blank" rel="noreferrer">رابط Google Play</a>}{mobileAppLinks.appStoreUrl && <a className="text-indigo-700 underline" href={mobileAppLinks.appStoreUrl} target="_blank" rel="noreferrer">رابط App Store</a>}</div>}
            </div>

            <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <label className="flex cursor-pointer items-center gap-3 font-semibold text-slate-800">
                <input type="checkbox" checked={integrityMonitoringEnabled} onChange={event => setIntegrityMonitoringEnabled(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                تفعيل تسجيل مغادرات صفحة الاختبار
              </label>
              <p className="mt-1 text-sm text-slate-700">يسجل النظام انتقال المتصفح إلى تبويب آخر أو خروج التطبيق إلى الخلفية أثناء المحاولة. إذا تجاوز المتدرب الحد أدناه، يوقف الاختبار ويحفظ وقت كل مغادرة والمنصة، ويمكنه تقديم طلب مراجعة من المنصة. قد تسجل إشعارات الهاتف أو قفل الشاشة مغادرة؛ لذلك تظهر الوقائع للمراجعة ولا تعد وحدها إثباتاً قاطعاً للغش.</p>
              <div className="mt-3 max-w-xs">
                <label className="mb-1 block text-sm font-medium text-slate-700">عدد المغادرات المسموح بها</label>
                <input type="number" min={0} max={100} step={1} value={maxTabDepartures} onChange={event => setMaxTabDepartures(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} disabled={!integrityMonitoringEnabled} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100" />
                <p className="mt-1 text-xs text-slate-500">يُوقف الاختبار عند المغادرة التالية بعد استنفاد العدد. مثال: الحد 3 يعني الإيقاف عند المغادرة الرابعة.</p>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                المادة التدريبية *
              </label>
              <SearchableSelect
                options={trainingContents.map(c => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }))}
                value={trainingContentId?.toString() || ''}
                onChange={(value) => setTrainingContentId(parseInt(value))}
                placeholder={programId ? "اختر المادة التدريبية" : "اختر البرنامج أولاً"}
                instanceId="content-select"
                isDisabled={!programId}
              />
              {!programId && (
                <p className="text-xs text-slate-500 mt-1">يجب اختيار البرنامج التدريبي أولاً</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                عنوان الاختبار *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار الباب الأول"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">جزء الدرجة *</label>
              <select value={gradeComponentKey} onChange={e => { const key = e.target.value; setGradeComponentKey(key); setGradeAllocation(current => Math.min(current, getGradeAllocationLimit(key))); }} disabled={!trainingContentId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {(['yearWorkMarks','practicalMarks','writtenMarks','attendanceMarks','quizzesMarks','finalExamMarks'] as const).map(key => {
                  const content = trainingContents.find(item => item.id === trainingContentId);
                  const available = Math.max(0, Number(content?.[key] || 0) - (usedAllocations[key] || 0));
                  return <option key={key} value={key} disabled={available <= 0}>{content?.[`${key}Label` as keyof TrainingContent] as string || ({yearWorkMarks:'أعمال السنة',practicalMarks:'العملي',writtenMarks:'التحريري',attendanceMarks:'الحضور',quizzesMarks:'اختبارات أونلاين',finalExamMarks:'الميد تيرم'} as Record<string,string>)[key]} — المتاح {available} من {content?.[key] || 0}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">درجة الاختبار من هذا الجزء *</label>
              <input type="number" min="0.01" step="0.01" max={getGradeAllocationLimit(gradeComponentKey)} value={Math.min(gradeAllocation, getGradeAllocationLimit(gradeComponentKey))} onChange={e => { const value = e.target.valueAsNumber; if (Number.isFinite(value)) setGradeAllocation(Math.min(value, getGradeAllocationLimit(gradeComponentKey))); }} required disabled={!trainingContentId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-slate-500">الحد الأقصى للمكون يظهر باسمه الحالي، ويُحفظ الاسم وقت تخصيص الدرجة.</p>
            </div>

            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="flex cursor-pointer items-center gap-3 font-medium text-slate-800">
                <input type="checkbox" checked={feeRequirementEnabled} onChange={e => setFeeRequirementEnabled(e.target.checked)} disabled={!trainingContentId} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                اشتراط سداد رسم محدد بالكامل قبل أداء الاختبار
              </label>
              <p className="mt-1 text-xs text-slate-600">اختياري. عند تفعيله سيظهر قفل للمتدرب ويمنعه النظام من بدء الاختبار أو متابعة إجاباته حتى إتمام السداد.</p>
              {feeRequirementEnabled && <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-slate-700">الرسم المطلوب من رسوم البرنامج *</label>
                <select value={requiredFeeId?.toString() || ''} onChange={e => setRequiredFeeId(e.target.value ? Number(e.target.value) : null)} required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">اختر الرسم المطلوب</option>
                  {programFees.map(fee => <option key={fee.id} value={fee.id}>{fee.name} — {fee.amount.toLocaleString('ar-EG')} ج.م ({fee.academicYear})</option>)}
                </select>
                {programFees.length === 0 && <p className="mt-1 text-xs text-rose-600">لا توجد رسوم معرفة لهذا البرنامج.</p>}
              </div>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الوصف
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للاختبار"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                التعليمات
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="تعليمات الاختبار للمتدربين"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                rows={3}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Timing */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><ClockIcon className="w-5 h-5 text-amber-600" /></div>
            <h3 className="font-semibold text-slate-800">إعدادات التوقيت</h3>
          </div>
          <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                تاريخ البدء *
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                تاريخ الانتهاء *
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                المدة (دقائق) *
              </label>
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
          </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg"><CogIcon className="w-5 h-5 text-violet-600" /></div>
            <h3 className="font-semibold text-slate-800">إعدادات الاختبار</h3>
          </div>
          <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                درجة النجاح (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-800 block">خلط ترتيب الأسئلة</span>
                    <p className="text-xs text-slate-500 mt-1">
                      تظهر الأسئلة بترتيب مختلف لكل متدرب، مما يقلل من الغش ويزيد من عدالة الاختبار
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleAnswers}
                    onChange={(e) => setShuffleAnswers(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-800 block">خلط ترتيب الإجابات</span>
                    <p className="text-xs text-slate-500 mt-1">
                      تظهر خيارات الإجابة بترتيب عشوائي لكل سؤال، مما يمنع حفظ ترتيب الإجابات
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResults}
                    onChange={(e) => setShowResults(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-800 block">عرض النتائج للمتدرب بعد التسليم</span>
                    <p className="text-xs text-slate-500 mt-1">
                      يرى المتدرب درجته والنسبة المئوية فوراً بعد تسليم الاختبار
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-800 block">عرض الإجابات الصحيحة</span>
                    <p className="text-xs text-slate-500 mt-1">
                      يتيح للمتدرب مراجعة إجاباته ومعرفة الإجابات الصحيحة للتعلم من أخطائه
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-blue-900 block mb-1">
                      نشر الاختبار (جعله متاحاً للمتدربين)
                    </span>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>إذا لم يتم التفعيل:</strong> سيبقى الاختبار مخفياً في لوحة الإدارة فقط ولن يظهر للمتدربين.<br/>
                      <strong>بعد التفعيل:</strong> سيظهر الاختبار للمتدربين في صفحة الاختبارات ويمكنهم إجراؤه في الموعد المحدد.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><QuestionMarkCircleIcon className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-800">الأسئلة</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إجمالي الدرجات: <span className={`font-semibold ${Math.round(totalPoints * 100) === Math.round(gradeAllocation * 100) ? 'text-blue-600' : 'text-rose-600'}`}>{totalPoints.toFixed(2)}</span>
                  <span className="text-slate-500"> / {gradeAllocation.toFixed(2)} درجة</span>
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">

          {!trainingContentId ? (
            <div className="text-center py-8 text-slate-500">
              يرجى اختيار المادة التدريبية أولاً
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><FunnelIcon className="h-5 w-5" /></span>
                  <div><h4 className="text-sm font-bold text-slate-800">تصفية بنك الأسئلة</h4><p className="mt-1 text-xs text-slate-500">حدد تاريخ إضافة الأسئلة، واستبعد ما سبق استخدامه عند الحاجة.</p></div>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,1.2fr)]">
                  <div className="lg:col-span-2">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><CalendarDaysIcon className="h-4 w-4 text-blue-600" />اختر تاريخ إضافة الأسئلة</div>
                    <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 xl:grid-cols-3">
                      <button type="button" onClick={() => setQuestionAddedOn('')} aria-pressed={!questionAddedOn} className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-right transition ${!questionAddedOn ? 'border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                        <span className="text-xs font-semibold">كل التواريخ</span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${!questionAddedOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{availableQuestions.length.toLocaleString('ar-EG')} سؤال</span>
                      </button>
                      {questionDates.map(({ date, count, label }) => {
                        const selected = questionAddedOn === date;
                        return <button key={date} type="button" onClick={() => setQuestionAddedOn(selected ? '' : date)} aria-pressed={selected} className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-right transition ${selected ? 'border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                          <span className="truncate text-xs font-semibold">{label}</span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{count.toLocaleString('ar-EG')} سؤال</span>
                        </button>;
                      })}
                      {questionDates.length === 0 && <p className="col-span-full px-3 py-4 text-center text-xs text-slate-400">لا توجد تواريخ إضافة لعرضها.</p>}
                    </div>
                  </div>
                  <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${excludeUsedInQuizzes ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-blue-200'}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <input type="checkbox" checked={excludeUsedInQuizzes} onChange={event => setExcludeUsedInQuizzes(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                      <span><span className="block text-sm font-semibold text-slate-800">استثناء الأسئلة المستخدمة في اختبارات إلكترونية</span><span className="mt-1 block text-xs text-slate-500">يتم تطبيق الاستثناء على الاختيار اليدوي والتلقائي</span></span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{usedInOtherQuizzesCount.toLocaleString('ar-EG')} سؤال مستخدم</span>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>أسئلة المادة: <b className="text-slate-700">{availableQuestions.length.toLocaleString('ar-EG')}</b></span>
                  <span>المطابقة للفلاتر: <b className="text-blue-700">{filteredQuestions.length.toLocaleString('ar-EG')}</b></span>
                  <span>المتاح للاختيار: <b className="text-emerald-700">{unselectedAvailableQuestions.length.toLocaleString('ar-EG')}</b></span>
                </div>
              </div>

              {/* Auto-Select Questions */}
              <div className="mb-5 w-full rounded-xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-2">
                  <BoltIcon className="mt-0.5 h-5 w-5 text-violet-600" />
                  <div><h4 className="text-sm font-bold text-violet-900">اختيار تلقائي للأسئلة</h4><p className="mt-1 text-xs text-slate-600">اختر عشوائياً من الأسئلة المطابقة للفلاتر أعلاه.</p></div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">عدد الأسئلة</label>
                    <input type="number" min="1" max={unselectedAvailableQuestions.length || undefined} disabled={unselectedAvailableQuestions.length === 0} value={autoSelectCount} onChange={event => {
                      const value = parseInt(event.target.value, 10);
                      setAutoSelectCount(Number.isFinite(value) ? Math.min(Math.max(value, 1), unselectedAvailableQuestions.length) : 1);
                    }} placeholder="عدد الأسئلة" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" />
                    <p className={`mt-1 text-xs ${unselectedAvailableQuestions.length === 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                      {unselectedAvailableQuestions.length === 0 ? 'لا توجد أسئلة متاحة تطابق الفلاتر الحالية.' : `المتاح حالياً: ${unselectedAvailableQuestions.length.toLocaleString('ar-EG')} سؤال`}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto sm:shrink-0 sm:pb-5">
                    <Button className="w-full sm:w-auto sm:min-w-40" type="button" variant="primary" onClick={handleAutoSelectQuestions} disabled={isAutoSelecting || unselectedAvailableQuestions.length === 0} isLoading={isAutoSelecting} leftIcon={<PlusIcon className="h-4 w-4" />}>إضافة عشوائية</Button>
                  </div>
                </div>
              </div>

              {/* Add Question Manually */}
              <div className="mb-5 p-4 bg-slate-50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  أو إضافة سؤال يدوياً من بنك الأسئلة
                </label>
                <SearchableSelect
                  options={unselectedAvailableQuestions
                    .map(q => ({
                      value: q.id.toString(),
                      label: `${q.text.substring(0, 80)}${q.text.length > 80 ? '…' : ''}`
                    }))}
                  value=""
                  onChange={(value) => {
                    const question = unselectedAvailableQuestions.find(q => q.id.toString() === value);
                    if (question) addQuestion(question);
                  }}
                  placeholder="ابحث عن سؤال وأضفه"
                  instanceId="question-select"
                />
              </div>

              {/* Selected Questions */}
              {selectedQuestions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  لم يتم إضافة أسئلة بعد
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="questions">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {selectedQuestions.map((sq, index) => (
                          <Draggable key={sq.questionId} draggableId={sq.questionId.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-all"
                              >
                                <div {...provided.dragHandleProps} className="mt-2">
                                  <Bars3Icon className="w-5 h-5 text-slate-400 cursor-move" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <p className="font-medium text-slate-800 flex-1 text-sm">
                                      {index + 1}. {sq.question.text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        value={sq.points}
                                        onChange={(e) => updatePoints(sq.questionId, parseFloat(e.target.value))}
                                        className="w-20 text-center px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                      />
                                      <span className="text-sm text-slate-500">درجة</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        onClick={() => removeQuestion(sq.questionId)}
                                        leftIcon={<TrashIcon className="w-4 h-4" />}
                                      >
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 text-xs">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                                      {sq.question.type === 'MULTIPLE_CHOICE' ? 'اختيار من متعدد' : 'صح/خطأ'}
                                    </span>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                                      الباب {sq.question.chapter}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/quizzes')}
            leftIcon={<XMarkIcon className="w-4 h-4" />}
          >
            إلغاء
          </Button>
          
          <Button
            type="submit"
            disabled={loading || !trainingContentId || selectedQuestions.length === 0}
            isLoading={loading}
          >
            إنشاء الاختبار
          </Button>
        </div>
      </form>
    </div>
  );
}

