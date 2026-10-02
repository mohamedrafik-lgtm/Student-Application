'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ListBulletIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import React from 'react';

// Enums para los tipos de preguntas
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
}

enum QuestionSkill {
  RECALL = 'RECALL',
  COMPREHENSION = 'COMPREHENSION',
  DEDUCTION = 'DEDUCTION',
}

enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  skill: QuestionSkill;
  difficulty: QuestionDifficulty;
  chapter: number;
  contentId: number;
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
  }[];
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  chaptersCount: number;
}

export default function EditQuestionPage({ params }: { params: { contentId: string, questionId: string } }) {
  const contentId = parseInt(React.use(params).contentId);
  const questionId = parseInt(React.use(params).questionId);
  
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();

  const [content, setContent] = useState<TrainingContent | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    text: string;
    type: QuestionType;
    skill: QuestionSkill;
    difficulty: QuestionDifficulty;
    chapter: number;
    contentId: number;
    options: {
      id?: number;
      text: string;
      isCorrect: boolean;
    }[];
  }>({
    text: '',
    type: QuestionType.MULTIPLE_CHOICE,
    skill: QuestionSkill.RECALL,
    difficulty: QuestionDifficulty.EASY,
    chapter: 1,
    contentId: contentId,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  // Cargar el contenido y la pregunta
  useEffect(() => {
    const fetchContentAndQuestion = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar el contenido
        const contentData = await fetchAPI(`/training-contents/${contentId}`);
        setContent(contentData);

        // Cargar la pregunta
        const questionData = await fetchAPI(`/questions/${questionId}`);
        setQuestion(questionData);

        // Inicializar el formulario con los datos de la pregunta
        setFormData({
          text: questionData.text,
          type: questionData.type,
          skill: questionData.skill,
          difficulty: questionData.difficulty,
          chapter: questionData.chapter,
          contentId: questionData.contentId,
          options: questionData.options,
        });
      } catch (err) {
        console.error('Error al cargar los datos:', err);
        setError('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    if (contentId && questionId) {
      fetchContentAndQuestion();
    }
  }, [contentId, questionId]);

  const handleTypeChange = (type: QuestionType) => {
    if (type === QuestionType.TRUE_FALSE) {
      setFormData({
        ...formData,
        type,
        options: [
          { text: 'صحيح', isCorrect: true },
          { text: 'خطأ', isCorrect: false },
        ],
      });
    } else if (type === QuestionType.MULTIPLE_CHOICE) {
      if (formData.options.length < 2) {
        setFormData({
          ...formData,
          type,
          options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
        });
      } else {
        setFormData({
          ...formData,
          type,
        });
      }
    }
  };

  const handleOptionChange = (index: number, field: string, value: boolean | string) => {
    const newOptions = [...formData.options];

    if (field === 'isCorrect' && value === true) {
      // Si se marca una opción como correcta, las demás deben ser incorrectas
      newOptions.forEach((option, i) => {
        if (i === index) {
          option.isCorrect = true;
        } else {
          option.isCorrect = false;
        }
      });
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }

    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.length < 6) {
      setFormData({
        ...formData,
        options: [...formData.options, { text: '', isCorrect: false }],
      });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = [...formData.options];
      newOptions.splice(index, 1);

      // Si se elimina la opción correcta, marcar la primera como correcta
      if (formData.options[index].isCorrect && newOptions.every(opt => !opt.isCorrect)) {
        newOptions[0].isCorrect = true;
      }

      setFormData({ ...formData, options: newOptions });
    }
  };

  const validateForm = () => {
    // Validar que haya texto en la pregunta
    if (!formData.text.trim()) {
      toast.error('يرجى إدخال نص السؤال');
      return false;
    }

    // Validar que todas الخيارات لجميع الخيارات
    if (formData.options.some(option => !option.text.trim())) {
      toast.error('يرجى إدخال نص لجميع الخيارات');
      return false;
    }

    // Validar أن يكون هناك خيار صحيح واحد على الأقل
    if (!formData.options.some(option => option.isCorrect)) {
      toast.error('يجب تحديد إجابة صحيحة واحدة على الأقل');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Limpiar الخصائص id و questionId من الخيارات
      const cleanedFormData = {
        ...formData,
        options: formData.options.map(option => ({
          text: option.text,
          isCorrect: option.isCorrect
        }))
      };
      
      // تحديث السؤال على الخادم
      await fetchAPI(`/questions/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanedFormData),
      });
      
      toast.success('تم تحديث السؤال بنجاح');
      
      // توجيه إلى صفحة الأسئلة في المحتوى
      router.push(`/dashboard/question-bank/${contentId}`);
    } catch (error) {
      console.error('خطأ في تحديث السؤال:', error);
      toast.error('فشل تحديث السؤال. يرجى المحاولة مرة أخرى.');
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-48 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!content || !question) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto text-center p-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">المحتوى أو السؤال غير موجود</h2>
          <p className="text-slate-500 mb-4">لم يتم العثور على المحتوى التدريبي أو السؤال المطلوب.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/question-bank')}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            العودة لبنك الأسئلة
          </Button>
        </div>
      </div>
    );
  }

  // إنشاء الخيارات للأبواب
  const chapterOptions = Array.from({ length: content.chaptersCount }, (_, i) => ({
    value: (i + 1).toString(),
    label: `الباب ${i + 1}`,
  }));

  const skillOptions = [
    { value: QuestionSkill.RECALL, label: 'التذكر' },
    { value: QuestionSkill.COMPREHENSION, label: 'الفهم' },
    { value: QuestionSkill.DEDUCTION, label: 'الاستنتاج' },
  ];

  const difficultyOptions = [
    { value: QuestionDifficulty.EASY, label: 'سهل' },
    { value: QuestionDifficulty.MEDIUM, label: 'متوسط' },
    { value: QuestionDifficulty.HARD, label: 'صعب' },
    { value: QuestionDifficulty.VERY_HARD, label: 'صعب جدا' },
  ];

  const typeOptions = [
    { value: QuestionType.MULTIPLE_CHOICE, label: 'اختيار من متعدد' },
    { value: QuestionType.TRUE_FALSE, label: 'صح أو خطأ' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="تعديل سؤال"
        description={`تعديل سؤال في المحتوى التدريبي: ${content.name}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'بنك الأسئلة', href: '/dashboard/question-bank' },
          { label: content.name, href: `/dashboard/question-bank/${contentId}` },
          { label: 'تعديل سؤال' },
        ]}
        actions={
          <Link href={`/dashboard/question-bank/${contentId}`}>
            <Button variant="outline" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
              العودة
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Question Info Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">معلومات السؤال</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">نص السؤال <span className="text-red-500">*</span></label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="أدخل نص السؤال هنا..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none min-h-[100px]"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">الباب <span className="text-red-500">*</span></label>
                <TibaSelect
                  options={chapterOptions}
                  value={formData.chapter.toString()}
                  onChange={(val) => setFormData({ ...formData, chapter: parseInt(val || '1') })}
                  instanceId="chapter-select"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">نوع السؤال <span className="text-red-500">*</span></label>
                <TibaSelect
                  options={typeOptions}
                  value={formData.type}
                  onChange={(val) => handleTypeChange((val as QuestionType) || QuestionType.MULTIPLE_CHOICE)}
                  instanceId="type-select"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">المهارة <span className="text-red-500">*</span></label>
                <TibaSelect
                  options={skillOptions}
                  value={formData.skill}
                  onChange={(val) => setFormData({ ...formData, skill: (val as QuestionSkill) || QuestionSkill.RECALL })}
                  instanceId="skill-select"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">مستوى الصعوبة <span className="text-red-500">*</span></label>
                <TibaSelect
                  options={difficultyOptions}
                  value={formData.difficulty}
                  onChange={(val) => setFormData({ ...formData, difficulty: (val as QuestionDifficulty) || QuestionDifficulty.EASY })}
                  instanceId="difficulty-select"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Options Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListBulletIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800">خيارات الإجابة</h3>
            </div>
            {formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                leftIcon={<PlusCircleIcon className="h-4 w-4" />}
              >
                إضافة خيار
              </Button>
            )}
          </div>
          <div className="p-5 space-y-4">
            {formData.options.map((option, index) => (
              <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${option.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">الخيار {index + 1}</label>
                    {formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <MinusCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`أدخل نص الخيار ${index + 1}`}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    required={formData.type !== QuestionType.TRUE_FALSE}
                    readOnly={formData.type === QuestionType.TRUE_FALSE}
                  />
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer pt-1 flex-shrink-0">
                  <input
                    type="radio"
                    name="correctOption"
                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    checked={option.isCorrect}
                    onChange={() => handleOptionChange(index, 'isCorrect', true)}
                  />
                  <span className="text-xs text-slate-600">الإجابة الصحيحة</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            isLoading={submitting}
            leftIcon={<CheckCircleIcon className="h-4 w-4" />}
          >
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </div>
  );
}