'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { SearchableSelect } from '@/app/components/ui/Select';
import { createQuiz, CreateQuizDto } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, TrashIcon, Bars3Icon, ClipboardDocumentListIcon, ClockIcon, CogIcon, BoltIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  chaptersCount: number;
}

interface Question {
  id: number;
  text: string;
  type: string;
  skill: string;
  difficulty: string;
  chapter: number;
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
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);

  // Form state
  const [programId, setProgramId] = useState<number | null>(null);
  const [trainingContentId, setTrainingContentId] = useState<number | null>(null);
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

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (programId) {
      loadTrainingContents(programId);
      // Reset content selection when program changes
      setTrainingContentId(null);
      setAvailableQuestions([]);
      setSelectedQuestions([]);
    }
  }, [programId]);

  useEffect(() => {
    if (trainingContentId) {
      loadQuestions(trainingContentId);
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
      const data = await fetchAPI(`/questions/content/${contentId}`);
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

    if (availableQuestions.length === 0) {
      toast.error('لا توجد أسئلة متاحة في بنك الأسئلة');
      return;
    }

    if (autoSelectCount <= 0) {
      toast.error('يرجى إدخال عدد صحيح من الأسئلة');
      return;
    }

    if (autoSelectCount > availableQuestions.length) {
      toast.error(`العدد المتاح: ${availableQuestions.length} سؤال فقط`);
      return;
    }

    try {
      setIsAutoSelecting(true);
      
      // تصفية الأسئلة غير المضافة
      const unselectedQuestions = availableQuestions.filter(
        q => !selectedQuestions.some(sq => sq.questionId === q.id)
      );

      if (unselectedQuestions.length === 0) {
        toast.error('جميع الأسئلة مضافة بالفعل');
        return;
      }

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

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    const dto: CreateQuizDto = {
      trainingContentId,
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
                  إجمالي الدرجات: <span className="font-semibold text-blue-600">{totalPoints}</span>
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
              {/* Auto-Select Questions */}
              <div className="mb-5 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BoltIcon className="w-5 h-5 text-violet-600" />
                  <h4 className="text-sm font-bold text-violet-900">اختيار تلقائي للأسئلة</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  يمكنك اختيار عدد معين من الأسئلة تلقائياً من بنك الأسئلة بشكل عشوائي
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      max={availableQuestions.length}
                      value={autoSelectCount}
                      onChange={(e) => setAutoSelectCount(parseInt(e.target.value) || 1)}
                      placeholder="عدد الأسئلة"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      المتاح: {availableQuestions.filter(q => !selectedQuestions.some(sq => sq.questionId === q.id)).length} سؤال
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAutoSelectQuestions}
                    disabled={isAutoSelecting || availableQuestions.length === 0}
                    isLoading={isAutoSelecting}
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    اختيار تلقائي
                  </Button>
                </div>
              </div>

              {/* Add Question Manually */}
              <div className="mb-5 p-4 bg-slate-50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  أو إضافة سؤال يدوياً من بنك الأسئلة
                </label>
                <SearchableSelect
                  options={availableQuestions
                    .filter(q => !selectedQuestions.some(sq => sq.questionId === q.id))
                    .map(q => ({
                      value: q.id.toString(),
                      label: `${q.text.substring(0, 80)}...`
                    }))}
                  value=""
                  onChange={(value) => {
                    const question = availableQuestions.find(q => q.id.toString() === value);
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

