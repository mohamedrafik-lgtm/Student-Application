'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { SearchableSelect } from '@/app/components/ui/Select';
import { updateQuiz, UpdateQuizDto, getQuizById, Quiz } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, TrashIcon, Bars3Icon, ClipboardDocumentListIcon, ClockIcon, CogIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
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

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'edit' }}>
      <EditQuizContent params={params} />
    </ProtectedPage>
  );
}

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

function EditQuizContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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

  useEffect(() => {
    loadPrograms();
    loadQuizData();
  }, []);

  useEffect(() => {
    if (programId) {
      loadTrainingContents(programId);
    }
  }, [programId]);

  useEffect(() => {
    if (trainingContentId) {
      loadQuestions(trainingContentId);
    }
  }, [trainingContentId]);

  const loadQuizData = async () => {
    try {
      setLoadingData(true);
      const quiz: Quiz = await getQuizById(parseInt(resolvedParams.id));
      
      // Fill form with existing data
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setInstructions(quiz.instructions || '');
      setStartDate(quiz.startDate.slice(0, 16)); // Format for datetime-local
      setEndDate(quiz.endDate.slice(0, 16));
      setDuration(quiz.duration);
      setPassingScore(quiz.passingScore);
      setMaxAttempts(quiz.maxAttempts);
      setShuffleQuestions(quiz.shuffleQuestions);
      setShuffleAnswers(quiz.shuffleAnswers);
      setShowResults(quiz.showResults);
      setShowCorrectAnswers(quiz.showCorrectAnswers);
      setIsPublished(quiz.isPublished);
      
      // Set content and program
      setTrainingContentId(quiz.trainingContent.id);
      
      // Load program from training content (we need to fetch this)
      const content = await fetchAPI(`/training-contents/${quiz.trainingContent.id}`);
      setProgramId(content.programId);

      // Map existing questions
      if (quiz.questions && quiz.questions.length > 0) {
        const mappedQuestions = quiz.questions.map((q: any) => ({
          questionId: q.question.id,
          question: {
            id: q.question.id,
            text: q.question.content,
            type: q.question.type,
            skill: q.question.skill || '',
            difficulty: q.question.difficulty || '',
            chapter: q.question.chapter || 1,
            options: q.question.options || [],
          },
          points: q.points,
          order: q.order,
        }));
        setSelectedQuestions(mappedQuestions);
      }
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل بيانات الاختبار');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

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

    const dto: UpdateQuizDto = {
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
      await updateQuiz(parseInt(resolvedParams.id), dto);
      toast.success('تم تحديث الاختبار بنجاح');
      router.push('/dashboard/quizzes');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحديث الاختبار');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تعديل الاختبار"
        description="تحديث بيانات الاختبار الإلكتروني"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات المصغرة', href: '/dashboard/quizzes' },
          { label: 'تعديل' }
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                عدد المحاولات المسموح بها
              </label>
              <input
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
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
              {/* Add Question */}
              <div className="mb-5 p-4 bg-slate-50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  إضافة سؤال من بنك الأسئلة
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
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </div>
  );
}

