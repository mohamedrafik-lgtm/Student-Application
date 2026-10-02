'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchTrainingContents, deleteTrainingContent } from '@/lib/api';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  programId: number;
  program?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  classroomId: number;
  classroom?: {
    id: number;
    name: string;
    classNumber: number;
  };
  instructorId: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  chaptersCount: number;
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
  theoryAttendanceRecorderId?: string;
  theoryAttendanceRecorder?: {
    id: string;
    name: string;
    email: string;
  };
  practicalAttendanceRecorderId?: string;
  practicalAttendanceRecorder?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    questions: number;
  };
}

function TrainingContentsPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');
  
  const [contentToDelete, setContentToDelete] = useState<TrainingContent | null>(null);

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
      const contentsData = await fetchTrainingContents();
      setTrainingContents(contentsData || []);
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!contentToDelete) return;
    try {
      await deleteTrainingContent(contentToDelete.id.toString());
      setTrainingContents(prev => prev.filter(c => c.id !== contentToDelete.id));
      toast.success('تم حذف المحتوى التدريبي بنجاح');
      setContentToDelete(null);
    } catch (error) {
      console.error('خطأ في حذف المحتوى التدريبي:', error);
      toast.error('فشل حذف المحتوى التدريبي. يرجى المحاولة مرة أخرى.');
    }
  };

  const filteredContents = useMemo(() => {
    return trainingContents.filter(content => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        content.name.toLowerCase().includes(searchLower) ||
        content.code.toLowerCase().includes(searchLower) ||
        content.instructor?.name?.toLowerCase().includes(searchLower) ||
        content.program?.nameAr?.toLowerCase().includes(searchLower) ||
        content.classroom?.name?.toLowerCase().includes(searchLower);
      
      const matchesProgram = !filterProgram || content.programId === parseInt(filterProgram);
      const matchesClassroom = !filterClassroom || content.classroomId === parseInt(filterClassroom);
      
      return matchesSearch && matchesProgram && matchesClassroom;
    });
  }, [searchQuery, filterProgram, filterClassroom, trainingContents]);
  
  const uniquePrograms = Array.from(new Map(trainingContents.filter(c => c.program).map(c => [c.program!.id, c.program!])).values());
  const programOptions = uniquePrograms.map((program) => ({
    value: program.id.toString(),
    label: program.nameAr
  }));
  
  const uniqueClassrooms = Array.from(new Map(trainingContents.filter(c => c.classroom).map(c => [c.classroom!.id, c.classroom!])).values());
  const classroomOptions = uniqueClassrooms.map((classroom) => ({
    value: classroom.id.toString(),
    label: classroom.name
  }));

  const totalContents = trainingContents.length;
  const uniqueProgramsCount = new Set(trainingContents.map(c => c.programId)).size;
  const uniqueClassroomsCount = new Set(trainingContents.map(c => c.classroomId)).size;
  const totalQuestions = trainingContents.reduce((sum, content) => sum + (content._count?.questions || 0), 0);

  // Skeleton loader
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
              <div className="h-7 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="إدارة المحتوى التدريبي"
        description="عرض وإدارة جميع المحتويات التدريبية المتاحة في البرامج المختلفة."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المحتوى التدريبي' }
        ]}
        actions={
          <Link href="/dashboard/training-contents/new">
            <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
              إضافة محتوى تدريبي جديد
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">إجمالي المحتويات</p>
              <p className="text-xl font-bold text-slate-800">{totalContents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">البرامج التدريبية</p>
              <p className="text-xl font-bold text-slate-800">{uniqueProgramsCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">الفصول الدراسية</p>
              <p className="text-xl font-bold text-slate-800">{uniqueClassroomsCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <QuestionMarkCircleIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">الأسئلة</p>
              <p className="text-xl font-bold text-slate-800">{totalQuestions}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="بحث بالاسم، الكود، الأستاذ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <TibaSelect
            options={programOptions}
            value={filterProgram}
            onChange={(val) => setFilterProgram(val)}
            placeholder="كل البرامج التدريبية"
            isClearable
            instanceId="program-filter-select"
          />
          <TibaSelect
            options={classroomOptions}
            value={filterClassroom}
            onChange={(val) => setFilterClassroom(val)}
            placeholder="كل الفصول الدراسية"
            isClearable
            instanceId="classroom-filter-select"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الكود</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">اسم المحتوى</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">البرنامج</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الفصل</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الأستاذ</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">الأسئلة</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <BookOpenIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium">لا يوجد محتويات تدريبية</p>
                  </td>
                </tr>
              ) : (
                filteredContents.map((content) => (
                  <tr key={content.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{content.code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{content.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {content.program?.nameAr || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {content.classroom?.name || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{content.instructor?.name || 'غير محدد'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {content._count?.questions || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Link href={`/dashboard/training-contents/${content.id}/edit`}>
                          <Button variant="outline" size="sm" leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}>
                            تعديل
                          </Button>
                        </Link>
                        <Link href={`/dashboard/training-contents/${content.id}/lectures`}>
                          <Button variant="success" size="sm" leftIcon={<BookOpenIcon className="h-3.5 w-3.5" />}>
                            المحاضرات
                          </Button>
                        </Link>
                        {authUser && (
                          <>
                            <Link href={`/dashboard/question-bank/${content.id}`}>
                              <Button variant="secondary" size="sm" leftIcon={<QuestionMarkCircleIcon className="h-3.5 w-3.5" />}>
                                الأسئلة ({content._count?.questions || 0})
                              </Button>
                            </Link>
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={<TrashIcon className="h-3.5 w-3.5" />}
                              onClick={() => setContentToDelete(content)}
                            >
                              حذف
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredContents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <BookOpenIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">لا يوجد محتويات تدريبية</p>
          </div>
        ) : (
          filteredContents.map((content) => (
            <div key={content.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{content.name}</p>
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{content.code}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 flex-shrink-0">
                  {content._count?.questions || 0} سؤال
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                  {content.program?.nameAr || 'غير محدد'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                  {content.classroom?.name || 'غير محدد'}
                </span>
              </div>
              <p className="text-xs text-slate-500">الأستاذ: {content.instructor?.name || 'غير محدد'}</p>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                <Link href={`/dashboard/training-contents/${content.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}>تعديل</Button>
                </Link>
                <Link href={`/dashboard/training-contents/${content.id}/lectures`} className="flex-1">
                  <Button variant="success" size="sm" fullWidth leftIcon={<BookOpenIcon className="h-3.5 w-3.5" />}>المحاضرات</Button>
                </Link>
                {authUser && (
                  <>
                    <Link href={`/dashboard/question-bank/${content.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" fullWidth leftIcon={<QuestionMarkCircleIcon className="h-3.5 w-3.5" />}>الأسئلة</Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<TrashIcon className="h-3.5 w-3.5" />}
                      onClick={() => setContentToDelete(content)}
                    >
                      حذف
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <TibaModal
        open={!!contentToDelete}
        onClose={() => setContentToDelete(null)}
        title="تأكيد الحذف"
        subtitle={`هل أنت متأكد أنك تريد حذف المحتوى التدريبي "${contentToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        variant="danger"
        size="sm"
        icon={<ExclamationTriangleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setContentToDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={handleDelete}>نعم، قم بالحذف</Button>
          </div>
        }
      />
    </div>
  );
}

export default function TrainingContentsPage() {
  return (
    <ProtectedPage>
      <TrainingContentsPageContent />
    </ProtectedPage>
  );
}