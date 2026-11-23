'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { getAllPaperExams, deletePaperExam, PaperExam } from '@/lib/paper-exams-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, DocumentTextIcon, FunnelIcon, EyeIcon, PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function PaperExamsPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.paper-exams', action: 'view' }}>
      <PaperExamsContent />
    </ProtectedPage>
  );
}

function PaperExamsContent() {
  const router = useRouter();
  const [exams, setExams] = useState<PaperExam[]>([]);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState('');
  const [examToDelete, setExamToDelete] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [selectedContent]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsData, contentsData] = await Promise.all([
        getAllPaperExams(selectedContent ? parseInt(selectedContent) : undefined),
        fetchAPI('/training-contents'),
      ]);
      setExams(examsData);
      setTrainingContents(contentsData);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (exam: PaperExam) => {
    setExamToDelete(exam);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    try {
      await deletePaperExam(examToDelete.id);
      toast.success('تم حذف الاختبار بنجاح');
      setExamToDelete(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في حذف الاختبار');
    }
  };

  const getStatusBadge = (exam: PaperExam) => {
    const statusConfig = {
      DRAFT: { text: 'مسودة', color: 'bg-slate-100 text-slate-700' },
      PUBLISHED: { text: 'منشور', color: 'bg-blue-100 text-blue-700' },
      IN_PROGRESS: { text: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700' },
      COMPLETED: { text: 'مكتمل', color: 'bg-green-100 text-green-700' },
      ARCHIVED: { text: 'مؤرشف', color: 'bg-slate-100 text-slate-600' },
    };

    const config = statusConfig[exam.status] || statusConfig.DRAFT;
    return config;
  };

  const getGradeTypeLabel = (gradeType: string) => {
    const labels: { [key: string]: string } = {
      YEAR_WORK: 'أعمال السنة',
      PRACTICAL: 'العملي',
      WRITTEN: 'التحريري',
      FINAL_EXAM: 'الميد تيرم',
    };
    return labels[gradeType] || gradeType;
  };

  const contentFilterOptions = [{value: '', label: 'كل المواد التدريبية'}, ...trainingContents.map(c => ({value: c.id.toString(), label: c.name}))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الاختبارات الورقية"
        description="إدارة الاختبارات الورقية ونماذج الأسئلة وأوراق الإجابة"
        breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الاختبارات الورقية' }]}
      />

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-3 min-w-[280px]">
            <FunnelIcon className="w-5 h-5 text-slate-500 shrink-0" />
            <TibaSelect
              options={contentFilterOptions}
              value={selectedContent}
              onChange={(val: string) => setSelectedContent(val)}
              placeholder="كل المواد التدريبية"
              isClearable
              instanceId="content-filter"
            />
          </div>

          <Button
            onClick={() => router.push('/dashboard/paper-exams/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            إنشاء اختبار ورقي جديد
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">إجمالي الاختبارات</p>
              <p className="text-2xl font-bold text-slate-800">{exams.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">منشورة</p>
              <p className="text-2xl font-bold text-slate-800">
                {exams.filter(e => e.isPublished).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">نماذج الأسئلة</p>
              <p className="text-2xl font-bold text-slate-800">
                {exams.reduce((sum, e) => sum + (e._count?.models || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">أوراق الإجابة</p>
              <p className="text-2xl font-bold text-slate-800">
                {exams.reduce((sum, e) => sum + (e._count?.answerSheets || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">لا توجد اختبارات ورقية حتى الآن</p>
            <Button
              onClick={() => router.push('/dashboard/paper-exams/new')}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              إنشاء أول اختبار ورقي
            </Button>
          </div>
        ) : (
          <>
          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">الاختبار</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">المادة</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">النوع</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">الدرجات</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">التاريخ</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">النماذج</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">الحالة</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => {
                  const status = getStatusBadge(exam);
                  return (
                    <tr key={exam.id} className="hover:bg-slate-50 transition-all duration-200">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{exam.title}</p>
                          {exam.description && (
                            <p className="text-sm text-slate-500 truncate max-w-xs mt-1">{exam.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div>
                          <p className="text-sm font-bold text-blue-700">{exam.trainingContent?.code}</p>
                          <p className="text-xs text-slate-500">{exam.trainingContent?.name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          {getGradeTypeLabel(exam.gradeType)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-lg font-bold text-slate-900">{exam.totalMarks}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-slate-700">
                          {format(new Date(exam.examDate), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                          {exam._count?.models || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/paper-exams/${exam.id}`)}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/paper-exams/${exam.id}/edit`)}
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(exam)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden p-4 space-y-4">
            {exams.map((exam) => {
              const status = getStatusBadge(exam);
              return (
                <div key={exam.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{exam.title}</h3>
                      <p className="text-sm text-slate-600">{exam.trainingContent?.code} - {exam.trainingContent?.name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-slate-500">النوع:</span>
                      <span className="font-bold text-purple-700 mr-2">{getGradeTypeLabel(exam.gradeType)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">الدرجات:</span>
                      <span className="font-bold text-slate-900 mr-2">{exam.totalMarks}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">التاريخ:</span>
                      <span className="font-bold mr-2">{format(new Date(exam.examDate), 'dd/MM/yyyy')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">النماذج:</span>
                      <span className="font-bold text-blue-700 mr-2">{exam._count?.models || 0}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/paper-exams/${exam.id}`)}
                      leftIcon={<EyeIcon className="w-4 h-4" />}
                    >
                      عرض
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/paper-exams/${exam.id}/edit`)}
                      leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                    >
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(exam)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <TibaModal
        open={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        title="تأكيد الحذف"
        variant="danger"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setExamToDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={confirmDelete}>حذف</Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">هل أنت متأكد من حذف هذا الاختبار؟</p>
      </TibaModal>
    </div>
  );
}