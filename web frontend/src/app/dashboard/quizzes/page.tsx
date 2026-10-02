'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { getAllQuizzes, deleteQuiz, Quiz } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FunnelIcon,
  UsersIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function QuizzesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'view' }}>
      <QuizzesContent />
    </ProtectedPage>
  );
}

function QuizzesContent() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterContentId, setFilterContentId] = useState<number | undefined>(undefined);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  useEffect(() => {
    loadData();
  }, [filterContentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizzesData, contentsData] = await Promise.all([
        getAllQuizzes(filterContentId),
        fetchAPI('/training-contents'),
      ]);
      setQuizzes(quizzesData);
      setTrainingContents(contentsData);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    setQuizToDelete(quiz);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    try {
      await deleteQuiz(quizToDelete.id);
      toast.success('تم حذف الاختبار بنجاح');
      setQuizToDelete(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في حذف الاختبار');
    }
  };

  const getQuizStatus = (quiz: Quiz) => {
    const now = new Date();
    const startDate = new Date(quiz.startDate);
    const endDate = new Date(quiz.endDate);

    if (!quiz.isPublished) {
      return { text: 'مسودة', color: 'bg-gray-100 text-gray-700' };
    }

    if (now < startDate) {
      return { text: 'قريباً', color: 'bg-blue-100 text-blue-700' };
    }

    if (now > endDate) {
      return { text: 'منتهي', color: 'bg-red-100 text-red-700' };
    }

    return { text: 'نشط', color: 'bg-green-100 text-green-700' };
  };

  const contentFilterOptions = [
    { value: '', label: 'جميع المواد التدريبية' },
    ...trainingContents.map(c => ({ value: String(c.id), label: `${c.code} - ${c.name}` })),
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-56 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الاختبارات المصغرة"
        description="إدارة الاختبارات الإلكترونية للمواد التدريبية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات المصغرة' }
        ]}
        actions={
          <Button
            onClick={() => router.push('/dashboard/quizzes/new')}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            إنشاء اختبار جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">إجمالي الاختبارات</p>
            <p className="text-2xl font-bold text-slate-800">{quizzes.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">اختبارات نشطة</p>
            <p className="text-2xl font-bold text-slate-800">
              {quizzes.filter(q => {
                const now = new Date();
                return q.isPublished && now >= new Date(q.startDate) && now <= new Date(q.endDate);
              }).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <ClockIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">قريباً</p>
            <p className="text-2xl font-bold text-slate-800">
              {quizzes.filter(q => {
                const now = new Date();
                return q.isPublished && now < new Date(q.startDate);
              }).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg">
            <XCircleIcon className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">مسودات</p>
            <p className="text-2xl font-bold text-slate-800">
              {quizzes.filter(q => !q.isPublished).length}
            </p>
          </div>
        </div>
      </div>

      {/* فلتر البحث */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <FunnelIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="flex-1">
            <TibaSelect
              options={contentFilterOptions}
              value={String(filterContentId || '')}
              onChange={(val) => setFilterContentId(val ? parseInt(val) : undefined)}
              instanceId="quiz-content-filter"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {quizzes.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 mb-4">لا توجد اختبارات حتى الآن</p>
            <Button
              onClick={() => router.push('/dashboard/quizzes/new')}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              إنشاء أول اختبار
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">عنوان الاختبار</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">البرنامج / المادة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الفصل</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الأسئلة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">المدة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">تاريخ البدء</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.map((quiz) => {
                const status = getQuizStatus(quiz);
                return (
                  <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{quiz.title}</p>
                      {quiz.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{quiz.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {quiz.trainingContent.program?.nameAr || 'غير محدد'}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">{quiz.trainingContent.code} - {quiz.trainingContent.name}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{quiz.trainingContent.classroom.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {quiz._count?.questions || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{quiz.duration} د</td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                      {format(new Date(quiz.startDate), 'dd MMM yyyy', { locale: ar })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1.5">
                        <Button size="sm" variant="outline" leftIcon={<UsersIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/report`)}>
                          التقرير
                        </Button>
                        <Button size="sm" variant="outline" leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}>
                          تعديل
                        </Button>
                        <Button size="sm" variant="danger" leftIcon={<TrashIcon className="w-3.5 h-3.5" />} onClick={() => handleDelete(quiz)}>
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 mb-4">لا توجد اختبارات حتى الآن</p>
            <Button onClick={() => router.push('/dashboard/quizzes/new')} leftIcon={<PlusIcon className="w-4 h-4" />}>
              إنشاء أول اختبار
            </Button>
          </div>
        ) : (
          quizzes.map((quiz) => {
            const status = getQuizStatus(quiz);
            return (
              <div key={quiz.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{quiz.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                    {quiz.trainingContent.program?.nameAr || 'غير محدد'}
                  </span>
                  <span className="text-slate-500">{quiz.trainingContent.code}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">{quiz.trainingContent.classroom.name}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-1.5">
                    <p className="text-xs text-blue-700 font-bold">{quiz._count?.questions || 0}</p>
                    <p className="text-[10px] text-blue-500">سؤال</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-xs text-slate-700 font-bold">{quiz.duration} د</p>
                    <p className="text-[10px] text-slate-500">المدة</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-xs text-slate-700 font-bold">{format(new Date(quiz.startDate), 'dd/MM', { locale: ar })}</p>
                    <p className="text-[10px] text-slate-500">البدء</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" fullWidth leftIcon={<UsersIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/report`)}>
                    التقرير
                  </Button>
                  <Button size="sm" variant="outline" fullWidth leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<TrashIcon className="w-3.5 h-3.5" />} onClick={() => handleDelete(quiz)}>
                    حذف
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <TibaModal
        open={!!quizToDelete}
        onClose={() => setQuizToDelete(null)}
        title="حذف الاختبار"
        subtitle={quizToDelete?.title}
        variant="danger"
        size="sm"
        icon={<TrashIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button onClick={confirmDelete} variant="danger" fullWidth>
              نعم، حذف
            </Button>
            <Button onClick={() => setQuizToDelete(null)} variant="outline" fullWidth>
              إلغاء
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء.</p>
      </TibaModal>
    </div>
  );
}

