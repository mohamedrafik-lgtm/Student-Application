'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { 
  PlusIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { toast } from 'react-hot-toast';

interface Question {
  id: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  skill: 'RECALL' | 'COMPREHENSION' | 'DEDUCTION';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  chapter: number;
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
  code: string;
  name: string;
  semester: 'FIRST' | 'SECOND';
  year: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH';
  chaptersCount: number;
}

export default function ContentQuestionsPage({ params }: { params: { contentId: string } }) {
  const resolvedParams = use(params);
  const contentId = resolvedParams.contentId;
  
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState<TrainingContent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChapter, setFilterChapter] = useState('ALL');
  const [filterSkill, setFilterSkill] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, contentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('جاري تحميل البيانات...');
      
      // Obtener el contenido de formación
      const contentData = await fetchAPI(`/training-contents/${contentId}`);
      setContent(contentData);
      
      // Obtener las preguntas del contenido
      const questionsData = await fetchAPI(`/questions/content/${contentId}`);
      setQuestions(questionsData || []);
      
      console.log('تم تحميل البيانات بنجاح:', questionsData?.length || 0, 'سؤال');
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;

    try {
      setLoading(true);
      await fetchAPI(`/questions/${questionToDelete.id}`, { method: 'DELETE' });
      
      setQuestions(questions.filter(q => q.id !== questionToDelete.id));
      
      toast.success('تم حذف السؤال بنجاح');
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('فشل حذف السؤال. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(question => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = question.text.toLowerCase().includes(searchLower);
    
    const matchesChapter = filterChapter === 'ALL' || question.chapter === parseInt(filterChapter);
    const matchesSkill = filterSkill === 'ALL' || question.skill === filterSkill;
    const matchesDifficulty = filterDifficulty === 'ALL' || question.difficulty === filterDifficulty;
    const matchesType = filterType === 'ALL' || question.type === filterType;
    
    return matchesSearch && matchesChapter && matchesSkill && matchesDifficulty && matchesType;
  });
  
  // Generar opciones para los filtros
  const chapterOptions = [
    { value: 'ALL', label: 'كل الأبواب' },
    ...(content ? Array.from({ length: content.chaptersCount }, (_, i) => ({
      value: (i + 1).toString(),
      label: `الباب ${i + 1}`
    })) : [])
  ];
  
  const skillOptions = [
    { value: 'ALL', label: 'كل المهارات' },
    { value: 'RECALL', label: 'التذكر' },
    { value: 'COMPREHENSION', label: 'الفهم' },
    { value: 'DEDUCTION', label: 'الاستنتاج' },
  ];
  
  const difficultyOptions = [
    { value: 'ALL', label: 'كل المستويات' },
    { value: 'EASY', label: 'سهل' },
    { value: 'MEDIUM', label: 'متوسط' },
    { value: 'HARD', label: 'صعب' },
    { value: 'VERY_HARD', label: 'صعب جدا' },
  ];
  
  const typeOptions = [
    { value: 'ALL', label: 'كل الأنواع' },
    { value: 'MULTIPLE_CHOICE', label: 'اختيار من متعدد' },
    { value: 'TRUE_FALSE', label: 'صح أو خطأ' },
  ];

  const skillLabels: Record<string, string> = {
    'RECALL': 'التذكر',
    'COMPREHENSION': 'الفهم',
    'DEDUCTION': 'الاستنتاج',
  };
  
  const difficultyLabels: Record<string, string> = {
    'EASY': 'سهل',
    'MEDIUM': 'متوسط',
    'HARD': 'صعب',
    'VERY_HARD': 'صعب جدا',
  };
  
  const difficultyColors: Record<string, string> = {
    'EASY': 'bg-emerald-50 text-emerald-700',
    'MEDIUM': 'bg-blue-50 text-blue-700',
    'HARD': 'bg-amber-50 text-amber-700',
    'VERY_HARD': 'bg-red-50 text-red-700',
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-14 bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />)}
        </div>
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={`أسئلة ${content.name}`}
        description={`إدارة أسئلة المحتوى التدريبي ${content.code}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'بنك الأسئلة', href: '/dashboard/question-bank' },
          { label: content.name }
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/question-bank">
              <Button variant="outline" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                العودة
              </Button>
            </Link>
            <Link href={`/dashboard/question-bank/${contentId}/new`}>
              <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
                إضافة سؤال جديد
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <BookOpenIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">عدد الأبواب</p>
            <p className="text-2xl font-bold text-slate-800">{content.chaptersCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <QuestionMarkCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">عدد الأسئلة</p>
            <p className="text-2xl font-bold text-slate-800">{questions.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              placeholder="بحث في نص السؤال..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <TibaSelect
            options={chapterOptions}
            value={filterChapter}
            onChange={(val) => setFilterChapter(val || 'ALL')}
            instanceId="chapter-filter-select"
          />
          <TibaSelect
            options={skillOptions}
            value={filterSkill}
            onChange={(val) => setFilterSkill(val || 'ALL')}
            instanceId="skill-filter-select"
          />
          <TibaSelect
            options={difficultyOptions}
            value={filterDifficulty}
            onChange={(val) => setFilterDifficulty(val || 'ALL')}
            instanceId="difficulty-filter-select"
          />
          <TibaSelect
            options={typeOptions}
            value={filterType}
            onChange={(val) => setFilterType(val || 'ALL')}
            instanceId="type-filter-select"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">السؤال</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الباب</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">المهارة</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الصعوبة</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">النوع</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الإجابة الصحيحة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredQuestions.length > 0 ? filteredQuestions.map(question => (
              <tr key={question.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-800 max-w-xs truncate">{question.text}</td>
                <td className="px-4 py-3 text-sm text-slate-600">الباب {question.chapter}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{skillLabels[question.skill]}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[question.difficulty]}`}>
                    {difficultyLabels[question.difficulty]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {question.type === 'MULTIPLE_CHOICE' ? 'اختيار من متعدد' : 'صح أو خطأ'}
                </td>
                <td className="px-4 py-3">
                  {question.type === 'TRUE_FALSE' ? (
                    (() => {
                      const correctOption = question.options.find(o => o.isCorrect);
                      return correctOption?.text === 'صحيح' ? (
                        <span className="flex items-center text-emerald-600 text-sm">
                          <CheckCircleIcon className="h-4 w-4 ml-1" /> صحيح
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm">
                          <XCircleIcon className="h-4 w-4 ml-1" /> خطأ
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-sm text-slate-600 truncate max-w-[120px] block">{question.options.find(o => o.isCorrect)?.text || ''}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1.5">
                    <Link href={`/dashboard/question-bank/${contentId}/${question.id}/edit`}>
                      <Button variant="outline" size="sm" leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />}>
                        تعديل
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setQuestionToDelete(question)}
                      leftIcon={<TrashIcon className="w-3.5 h-3.5" />}
                    >
                      حذف
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  <QuestionMarkCircleIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  لا يوجد أسئلة لعرضها
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredQuestions.length > 0 ? filteredQuestions.map(question => (
          <div key={question.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{question.text}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">الباب {question.chapter}</span>
              <span className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{skillLabels[question.skill]}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[question.difficulty]}`}>
                {difficultyLabels[question.difficulty]}
              </span>
              <span className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                {question.type === 'MULTIPLE_CHOICE' ? 'اختيار من متعدد' : 'صح أو خطأ'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              الإجابة الصحيحة: <span className="text-emerald-600 font-medium">{question.options.find(o => o.isCorrect)?.text || '-'}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Link href={`/dashboard/question-bank/${contentId}/${question.id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" fullWidth leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />}>تعديل</Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => setQuestionToDelete(question)}
                leftIcon={<TrashIcon className="w-3.5 h-3.5" />}
              >
                حذف
              </Button>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <QuestionMarkCircleIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">لا يوجد أسئلة لعرضها</p>
          </div>
        )}
      </div>
      
      {/* Delete confirmation */}
      <TibaModal
        open={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        title="تأكيد حذف السؤال"
        subtitle="هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
        size="sm"
        icon={<ExclamationTriangleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setQuestionToDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={handleDelete}>نعم، قم بالحذف</Button>
          </div>
        }
      >
        {questionToDelete && (
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700">{questionToDelete.text}</p>
          </div>
        )}
      </TibaModal>
    </div>
  );
}