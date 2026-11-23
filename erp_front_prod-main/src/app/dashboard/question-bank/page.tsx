'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaSelect } from '@/app/components/ui/Select';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  semester: 'FIRST' | 'SECOND';
  year: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH';
  chaptersCount: number;
  program: {
    nameAr: string;
  };
  _count?: {
    questions: number;
  };
}

function QuestionBankPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

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
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('جاري تحميل بيانات المحتوى التدريبي...');
      
      // Obtener contenidos de formación con recuento de preguntas
      const contentsData = await fetchAPI('/training-contents?includeQuestionCount=true');
      
      console.log('تم تحميل البيانات بنجاح:', contentsData?.length || 0, 'عنصر');
      setTrainingContents(contentsData || []);
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = trainingContents.filter(content => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      content.name.toLowerCase().includes(searchLower) ||
      content.code.toLowerCase().includes(searchLower);
    
    const matchesSemester = filterSemester === 'ALL' || content.semester === filterSemester;
    const matchesYear = filterYear === 'ALL' || content.year === filterYear;
    
    return matchesSearch && matchesSemester && matchesYear;
  });
  
  const semesterOptions = [
    { value: 'ALL', label: 'كل الفصول الدراسية' },
    { value: 'FIRST', label: 'الفصل الدراسي الأول' },
    { value: 'SECOND', label: 'الفصل الدراسي الثاني' },
  ];
  
  const yearOptions = [
    { value: 'ALL', label: 'كل الفرق الدراسية' },
    { value: 'FIRST', label: 'الفرقة الأولى' },
    { value: 'SECOND', label: 'الفرقة الثانية' },
    { value: 'THIRD', label: 'الفرقة الثالثة' },
    { value: 'FOURTH', label: 'الفرقة الرابعة' },
  ];

  const yearLabels: Record<string, string> = {
    'FIRST': 'الفرقة الأولى',
    'SECOND': 'الفرقة الثانية',
    'THIRD': 'الفرقة الثالثة',
    'FOURTH': 'الفرقة الرابعة',
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const totalContents = trainingContents.length;
  const totalQuestions = trainingContents.reduce((sum, content) => sum + (content._count?.questions || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="بنك الأسئلة"
        description="إدارة أسئلة المحتويات التدريبية المختلفة"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'بنك الأسئلة' }
        ]}
        actions={
          <Button
            onClick={() => window.open('/print/question-bank/overview', '_blank')}
            leftIcon={<PrinterIcon className="w-4 h-4" />}
            variant="outline"
          >
            طباعة التقرير العام
          </Button>
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
            <p className="text-sm text-slate-500">إجمالي المحتويات التدريبية</p>
            <p className="text-2xl font-bold text-slate-800">{totalContents}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <QuestionMarkCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">إجمالي الأسئلة</p>
            <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              placeholder="بحث بالاسم أو الكود..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <TibaSelect
            options={semesterOptions}
            value={filterSemester}
            onChange={(val) => setFilterSemester(val || 'ALL')}
            instanceId="semester-filter-select"
          />
          <TibaSelect
            options={yearOptions}
            value={filterYear}
            onChange={(val) => setFilterYear(val || 'ALL')}
            instanceId="year-filter-select"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الكود</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">اسم المحتوى</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الفصل الدراسي</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الفرقة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الأبواب</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الأسئلة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContents.length > 0 ? filteredContents.map(content => (
              <tr key={content.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-slate-600">{content.code}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{content.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${content.semester === 'FIRST' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {content.semester === 'FIRST' ? 'الأول' : 'الثاني'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {yearLabels[content.year]}
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{content.chaptersCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {content._count?.questions || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1.5">
                    <Link href={`/dashboard/question-bank/${content.id}`}>
                      <Button size="sm" variant="outline" leftIcon={<EyeIcon className="w-3.5 h-3.5" />}>عرض</Button>
                    </Link>
                    <Link href={`/dashboard/question-bank/${content.id}/new`}>
                      <Button size="sm" variant="default" leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>إضافة</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}
                      onClick={() => window.open(`/print/question-bank/${content.id}`, '_blank')}
                    >
                      طباعة
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  <BookOpenIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  لا يوجد محتويات تدريبية لعرضها
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredContents.length > 0 ? filteredContents.map(content => (
          <div key={content.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-800">{content.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{content.code}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${content.semester === 'FIRST' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {content.semester === 'FIRST' ? 'الأول' : 'الثاني'}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>{yearLabels[content.year]}</span>
              <span>•</span>
              <span>{content.chaptersCount} أبواب</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{content._count?.questions || 0} سؤال</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Link href={`/dashboard/question-bank/${content.id}`} className="flex-1">
                <Button size="sm" variant="outline" fullWidth leftIcon={<EyeIcon className="w-3.5 h-3.5" />}>عرض</Button>
              </Link>
              <Link href={`/dashboard/question-bank/${content.id}/new`} className="flex-1">
                <Button size="sm" variant="default" fullWidth leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>إضافة</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}
                onClick={() => window.open(`/print/question-bank/${content.id}`, '_blank')}
              >
                طباعة
              </Button>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpenIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">لا يوجد محتويات تدريبية لعرضها</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionBankPage() {
  return (
    <ProtectedPage>
      <QuestionBankPageContent />
    </ProtectedPage>
  );
}