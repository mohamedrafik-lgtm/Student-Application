'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/Select';
import { createQuiz, CreateQuizDto } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiSave, FiX, FiMenu, FiTrash2 } from 'react-icons/fi';
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

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

export default function NewInstructorQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);

  // Form state
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
    loadTrainingContents();
  }, []);

  useEffect(() => {
    if (trainingContentId) {
      loadQuestions(trainingContentId);
    }
  }, [trainingContentId]);

  const loadTrainingContents = async () => {
    try {
      // طباعة معلومات المستخدم من localStorage
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const userData = JSON.parse(authUser);
        console.log('Frontend: معلومات المستخدم من localStorage:', userData);
        console.log('Frontend: نوع الحساب:', userData.accountType);
      }
      
      // سيجلب فقط مواد المحاضر من الـ Backend
      console.log('Frontend: جلب المواد التدريبية...');
      const data = await fetchAPI('/training-contents');
      console.log('Frontend: عدد المواد المستلمة:', data?.length || 0);
      console.log('Frontend: البيانات المستلمة:', data);
      setTrainingContents(data);
    } catch (error) {
      console.error('Frontend: خطأ في جلب المواد:', error);
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
      router.push('/instructor-dashboard/quizzes');
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
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            📋 المعلومات الأساسية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المادة التدريبية *
              </label>
              <SearchableSelect
                options={trainingContents.map(c => ({ value: c.id.toString(), label: `${c.code} - ${c.name}` }))}
                value={trainingContentId?.toString() || ''}
                onChange={(value) => setTrainingContentId(parseInt(value))}
                placeholder="اختر المادة التدريبية (مواد المحاضر فقط)"
                instanceId="content-select"
              />
              {trainingContents.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ لا توجد مواد تدريبية مسندة لك</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عنوان الاختبار *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار الباب الأول"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للاختبار"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التعليمات
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="تعليمات الاختبار للمتدربين"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Timing */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            ⏰ إعدادات التوقيت
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البدء *
              </label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الانتهاء *
              </label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المدة (دقائق) *
              </label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                required
              />
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            ⚙️ إعدادات الاختبار
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                درجة النجاح (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد المحاولات المسموح بها
              </label>
              <Input
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 block">خلط ترتيب الأسئلة</span>
                    <p className="text-xs text-gray-600 mt-1">
                      🔀 تظهر الأسئلة بترتيب مختلف لكل متدرب، مما يقلل من الغش ويزيد من عدالة الاختبار
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleAnswers}
                    onChange={(e) => setShuffleAnswers(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 block">خلط ترتيب الإجابات</span>
                    <p className="text-xs text-gray-600 mt-1">
                      🔄 تظهر خيارات الإجابة بترتيب عشوائي لكل سؤال، مما يمنع حفظ ترتيب الإجابات
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResults}
                    onChange={(e) => setShowResults(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 block">عرض النتائج للمتدرب بعد التسليم</span>
                    <p className="text-xs text-gray-600 mt-1">
                      ✅ يرى المتدرب درجته والنسبة المئوية فوراً بعد تسليم الاختبار
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 block">عرض الإجابات الصحيحة</span>
                    <p className="text-xs text-gray-600 mt-1">
                      📚 يتيح للمتدرب مراجعة إجاباته ومعرفة الإجابات الصحيحة للتعلم من أخطائه
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
                      ⚠️ <strong>إذا لم يتم التفعيل:</strong> سيبقى الاختبار مخفياً في لوحة الإدارة فقط ولن يظهر للمتدربين.<br/>
                      ✅ <strong>بعد التفعيل:</strong> سيظهر الاختبار للمتدربين في صفحة الاختبارات ويمكنهم إجراؤه في الموعد المحدد.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Questions */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">❓ الأسئلة</h3>
              <p className="text-sm text-gray-600 mt-1">
                إجمالي الدرجات: <span className="font-semibold text-blue-600">{totalPoints}</span>
              </p>
            </div>
          </div>

          {!trainingContentId ? (
            <div className="text-center py-8 text-gray-500">
              يرجى اختيار المادة التدريبية أولاً
            </div>
          ) : (
            <>
              {/* Add Question */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <div className="text-center py-8 text-gray-500">
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
                                className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                              >
                                <div {...provided.dragHandleProps} className="mt-2">
                                  <FiMenu className="w-5 h-5 text-gray-400 cursor-move" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <p className="font-medium text-gray-900 flex-1">
                                      {index + 1}. {sq.question.text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        value={sq.points}
                                        onChange={(e) => updatePoints(sq.questionId, parseFloat(e.target.value))}
                                        className="w-20 text-center"
                                      />
                                      <span className="text-sm text-gray-600">درجة</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => removeQuestion(sq.questionId)}
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <FiTrash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 text-xs">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {sq.question.type === 'MULTIPLE_CHOICE' ? 'اختيار من متعدد' : 'صح/خطأ'}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
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
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/instructor-dashboard/quizzes')}
            className="flex items-center gap-2"
          >
            <FiX className="w-4 h-4" />
            إلغاء
          </Button>
          
          <Button
            type="submit"
            disabled={loading || !trainingContentId || selectedQuestions.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            {loading ? 'جاري الحفظ...' : (
              <>
                <FiSave className="w-4 h-4" />
                إنشاء الاختبار
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

