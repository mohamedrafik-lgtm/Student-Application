'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllQuizzes, deleteQuiz, Quiz } from '@/lib/quizzes-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiClock, FiCheckCircle, FiXCircle, FiEye, FiFilter, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function InstructorQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterContentId, setFilterContentId] = useState<number | undefined>(undefined);

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

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
      return;
    }

    try {
      await deleteQuiz(id);
      toast.success('تم حذف الاختبار بنجاح');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="الاختبارات المصغرة"
        description="إدارة الاختبارات الإلكترونية للمواد التدريبية"
      />

      {/* Filters and Actions */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiFilter className="w-5 h-5 text-gray-500" />
            <select
              value={filterContentId || ''}
              onChange={(e) => setFilterContentId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">جميع المواد التدريبية</option>
              {trainingContents.map((content) => (
                <option key={content.id} value={content.id}>
                  {content.code} - {content.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => router.push('/instructor-dashboard/quizzes/new')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
          >
            <FiPlus className="ml-2" />
            إنشاء اختبار جديد
          </Button>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold mb-1">إجمالي الاختبارات</p>
              <p className="text-3xl font-bold text-blue-700">{quizzes.length}</p>
            </div>
            <FiCheckCircle className="w-12 h-12 text-blue-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-semibold mb-1">اختبارات نشطة</p>
              <p className="text-3xl font-bold text-green-700">
                {quizzes.filter(q => {
                  const now = new Date();
                  return q.isPublished && now >= new Date(q.startDate) && now <= new Date(q.endDate);
                }).length}
              </p>
            </div>
            <FiClock className="w-12 h-12 text-green-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-semibold mb-1">قريباً</p>
              <p className="text-3xl font-bold text-orange-700">
                {quizzes.filter(q => {
                  const now = new Date();
                  return q.isPublished && now < new Date(q.startDate);
                }).length}
              </p>
            </div>
            <FiEye className="w-12 h-12 text-orange-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-1">مسودات</p>
              <p className="text-3xl font-bold text-gray-700">
                {quizzes.filter(q => !q.isPublished).length}
              </p>
            </div>
            <FiXCircle className="w-12 h-12 text-gray-300" />
          </div>
        </Card>
      </div>

      {/* Quizzes Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center">
            <FiCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">لا توجد اختبارات حتى الآن</p>
            <Button
              onClick={() => router.push('/instructor-dashboard/quizzes/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiPlus className="ml-2" />
              إنشاء أول اختبار
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">عنوان الاختبار</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">البرنامج التدريبي</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">المادة التدريبية</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الفصل الدراسي</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">عدد الأسئلة</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">المدة</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">تاريخ البدء</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الحالة</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quizzes.map((quiz) => {
                  const status = getQuizStatus(quiz);
                  return (
                    <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{quiz.title}</p>
                          {quiz.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{quiz.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {quiz.trainingContent.program?.nameAr || 'غير محدد'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{quiz.trainingContent.code}</p>
                          <p className="text-xs text-gray-500">{quiz.trainingContent.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-700">{quiz.trainingContent.classroom.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                          {quiz._count?.questions || 0} سؤال
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-700">{quiz.duration} دقيقة</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-700">
                          {format(new Date(quiz.startDate), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/instructor-dashboard/quizzes/${quiz.id}/report`)}
                            className="text-green-600 hover:bg-green-50 flex items-center gap-1"
                          >
                            <FiUsers className="w-4 h-4" />
                            <span className="text-xs">التقرير</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/instructor-dashboard/quizzes/${quiz.id}/edit`)}
                            className="text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <FiEdit className="w-4 h-4" />
                            <span className="text-xs">تعديل</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(quiz.id)}
                            className="text-red-600 hover:bg-red-50 flex items-center gap-1"
                          >
                            <FiTrash2 className="w-4 h-4" />
                            <span className="text-xs">حذف</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

