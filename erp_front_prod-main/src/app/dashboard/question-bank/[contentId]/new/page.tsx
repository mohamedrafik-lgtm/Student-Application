'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { 
  ArrowLeftIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import { QuestionDifficulty, QuestionSkill, QuestionType } from '@/types/questions';

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  semester: 'FIRST' | 'SECOND';
  year: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH';
  chaptersCount: number;
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface QuestionFormData {
  text: string;
  type: QuestionType;
  skill: QuestionSkill;
  difficulty: QuestionDifficulty;
  chapter: number;
  contentId: number;
  options: QuestionOption[];
}

export default function NewQuestionPage({ params }: { params: { contentId: string } }) {
  const resolvedParams = use(params);
  const contentId = parseInt(resolvedParams.contentId);
  
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState<TrainingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<QuestionFormData>({
    text: '',
    type: QuestionType.MULTIPLE_CHOICE,
    skill: QuestionSkill.RECALL,
    difficulty: QuestionDifficulty.MEDIUM,
    chapter: 1,
    contentId: contentId,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContent();
    }
  }, [isAuthenticated, contentId]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const contentData = await fetchAPI(`/training-contents/${contentId}`);
      setContent(contentData);
      
      // Inicializar el capítulo a 1 o al primer capítulo disponible
      if (contentData && contentData.chaptersCount > 0) {
        setFormData(prev => ({
          ...prev,
          chapter: 1,
        }));
      }
    } catch (err) {
      console.error('خطأ في تحميل بيانات المحتوى:', err);
      setError('حدث خطأ أثناء تحميل بيانات المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: QuestionType) => {
    let newOptions: QuestionOption[];
    
    if (type === QuestionType.TRUE_FALSE) {
      // Para preguntas de verdadero/falso, solo necesitamos dos opciones
      newOptions = [
        { text: 'صحيح', isCorrect: true },
        { text: 'خطأ', isCorrect: false },
      ];
    } else {
      // Para preguntas de opción múltiple, mantenemos las opciones actuales o creamos nuevas
      if (formData.type === QuestionType.TRUE_FALSE) {
        // Si cambiamos de verdadero/falso a opción múltiple, creamos nuevas opciones
        newOptions = [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ];
      } else {
        // Si ya estamos en opción múltiple, mantenemos las opciones actuales
        newOptions = [...formData.options];
      }
    }
    
    setFormData({
      ...formData,
      type,
      options: newOptions,
    });
  };

  const handleOptionChange = (index: number, field: keyof QuestionOption, value: string | boolean) => {
    const newOptions = [...formData.options];
    
    // Si estamos cambiando la opción correcta, debemos asegurarnos de que solo una opción sea correcta
    if (field === 'isCorrect' && value === true) {
      // Marcar todas las opciones como incorrectas
      newOptions.forEach(option => option.isCorrect = false);
    }
    
    // Actualizar la opción específica
    newOptions[index] = {
      ...newOptions[index],
      [field]: value,
    };
    
    setFormData({
      ...formData,
      options: newOptions,
    });
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
    if (formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.length > 2) {
      // No podemos eliminar la opción correcta
      if (formData.options[index].isCorrect) {
        toast.error('لا يمكن حذف الإجابة الصحيحة');
        return;
      }
      
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        options: newOptions,
      });
    }
  };

  const validateForm = () => {
    // Validar texto de la pregunta
    if (!formData.text.trim()) {
      toast.error('يرجى إدخال نص السؤال');
      return false;
    }
    
    // Validar opciones
    if (formData.type === QuestionType.MULTIPLE_CHOICE) {
      // Verificar que todas las opciones tienen texto
      const emptyOptions = formData.options.some(option => !option.text.trim());
      if (emptyOptions) {
        toast.error('يرجى إدخال نص لجميع الخيارات');
        return false;
      }
      
      // Verificar que hay al menos una opción correcta
      const hasCorrectOption = formData.options.some(option => option.isCorrect);
      if (!hasCorrectOption) {
        toast.error('يرجى تحديد الإجابة الصحيحة');
        return false;
      }
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
      
      // Enviar la pregunta al servidor
      await fetchAPI('/questions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      toast.success('تم إضافة السؤال بنجاح');
      
      // Redireccionar a la página de preguntas del contenido
      router.push(`/dashboard/question-bank/${contentId}`);
    } catch (error) {
      console.error('خطأ في إضافة السؤال:', error);
      toast.error('فشل إضافة السؤال. يرجى المحاولة مرة أخرى.');
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

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto text-center p-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">المحتوى غير موجود</h2>
          <p className="text-slate-500 mb-4">لم يتم العثور على المحتوى التدريبي المطلوب.</p>
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

  // Generar opciones para los capítulos
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
        title="إضافة سؤال جديد"
        description={`إضافة سؤال جديد للمحتوى التدريبي: ${content.name}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'بنك الأسئلة', href: '/dashboard/question-bank' },
          { label: content.name, href: `/dashboard/question-bank/${contentId}` },
          { label: 'إضافة سؤال' },
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
                  onChange={(val) => setFormData({ ...formData, difficulty: (val as QuestionDifficulty) || QuestionDifficulty.MEDIUM })}
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
              <h3 className="font-bold text-slate-800">خيارات السؤال</h3>
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
                    <label className="text-sm font-medium text-slate-700">
                      {formData.type === QuestionType.TRUE_FALSE
                        ? option.text
                        : `الخيار ${index + 1}`}
                    </label>
                    {formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.length > 2 && !option.isCorrect && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <MinusCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {formData.type === QuestionType.MULTIPLE_CHOICE && (
                    <input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      placeholder={`أدخل نص الخيار ${index + 1}`}
                      required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  )}
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
            حفظ السؤال
          </Button>
        </div>
      </form>
    </div>
  );
}