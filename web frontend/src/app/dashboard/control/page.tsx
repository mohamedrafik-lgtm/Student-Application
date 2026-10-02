'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { fetchAPI } from '@/lib/api';
import { downloadGradesTemplate, uploadGradesExcel } from '@/lib/paper-exams-api';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface PaperExam {
  id: number;
  title: string;
  examDate: string;
  totalMarks: number;
  gradeType: string;
  status: string;
  trainingContent: {
    id: number;
    name: string;
    code: string;
    classroom: {
      name: string;
      program: {
        name: string;
      };
    };
  };
  _count: {
    answerSheets: number;
  };
  answerSheets: any[];
}

export default function ControlSystemPage() {
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [exams, setExams] = useState<PaperExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<PaperExam | null>(null);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterText, setFilterText] = useState('');

  // التحقق من الصلاحية
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('dashboard.control', 'view')) {
      toast.error('ليس لديك صلاحية الوصول لنظام الكونترول');
      router.push('/dashboard');
    }
  }, [permissionsLoading, hasPermission, router]);

  useEffect(() => {
    if (!permissionsLoading && hasPermission('dashboard.control', 'view')) {
      loadExams();
    }
  }, [permissionsLoading, hasPermission]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/paper-exams');
      
      // تحميل بيانات إضافية لكل اختبار
      const examsWithDetails = await Promise.all(
        (data || []).map(async (exam: any) => {
          try {
            const details = await fetchAPI(`/paper-exams/${exam.id}`);
            return details;
          } catch (error) {
            console.error(`Error loading exam ${exam.id}:`, error);
            return exam;
          }
        })
      );
      
      setExams(examsWithDetails);
    } catch (error: any) {
      toast.error('فشل تحميل الاختبارات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (examId: number, examTitle: string) => {
    try {
      toast.loading('جاري تحضير الملف...', { id: 'download' });
      const blob = await downloadGradesTemplate(examId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exam-${examId}-grades-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الملف بنجاح!', { id: 'download' });
    } catch (error: any) {
      toast.error(error.message || 'فشل تحميل الملف', { id: 'download' });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, examId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('يجب اختيار ملف Excel (.xlsx أو .xls)');
      return;
    }

    try {
      setUploadingExcel(true);
      toast.loading('جاري رفع الملف ومعالجة الدرجات...', { id: 'upload' });

      const result = await uploadGradesExcel(examId, file);
      
      toast.success(
        `✓ ${result.success} متدرب تم تحديث درجاتهم\n${result.failed > 0 ? `⚠ ${result.failed} فشل` : ''}`,
        { 
          id: 'upload',
          duration: 5000
        }
      );

      if (result.errors && result.errors.length > 0) {
        console.error('أخطاء معالجة Excel:', result.errors);
      }

      loadExams();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل رفع الملف', { id: 'upload' });
    } finally {
      setUploadingExcel(false);
    }
  };

  const handleViewGrades = (exam: PaperExam) => {
    setSelectedExam(exam);
    setShowGradesModal(true);
  };

  const getGradeTypeLabel = (gradeType: string) => {
    const types: { [key: string]: string } = {
      YEAR_WORK: 'أعمال السنة',
      PRACTICAL: 'العملي',
      WRITTEN: 'التحريري',
      FINAL_EXAM: 'الميد تيرم',
    };
    return types[gradeType] || gradeType;
  };

  const getStatusLabel = (status: string) => {
    const statuses: { [key: string]: { label: string; color: string } } = {
      DRAFT: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
      PUBLISHED: { label: 'منشور', color: 'bg-blue-100 text-blue-700' },
      IN_PROGRESS: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700' },
      COMPLETED: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
      ARCHIVED: { label: 'مؤرشف', color: 'bg-purple-100 text-purple-700' },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(filterText.toLowerCase()) ||
    exam.trainingContent.name.toLowerCase().includes(filterText.toLowerCase()) ||
    exam.trainingContent.code.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalExams = filteredExams.length;
  const completedExams = filteredExams.filter(e => e.status === 'COMPLETED').length;
  const totalSheets = filteredExams.reduce((sum, e) => sum + (e._count?.answerSheets || 0), 0);
  const gradedSheets = filteredExams.reduce(
    (sum, e) => sum + (e.answerSheets?.filter((s: any) => s.status === 'GRADED').length || 0),
    0
  );

  if (permissionsLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-56 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!hasPermission('dashboard.control', 'view')) {
    return null; // سيتم إعادة التوجيه في useEffect
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="نظام الكونترول"
        description="إدارة درجات المتدربين في الاختبارات الورقية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'نظام الكونترول' }
        ]}
      />

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">إجمالي الاختبارات</p>
            <p className="text-2xl font-bold text-slate-800">{totalExams}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">اختبارات مكتملة</p>
            <p className="text-2xl font-bold text-slate-800">{completedExams}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-violet-50 rounded-lg">
            <UsersIcon className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">إجمالي أوراق الإجابة</p>
            <p className="text-2xl font-bold text-slate-800">{totalSheets}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">أوراق مُصححة</p>
            <p className="text-2xl font-bold text-slate-800">{gradedSheets}</p>
          </div>
        </div>
      </div>

      {/* فلتر البحث */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن اختبار (العنوان، المادة، الكود...)"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* شرح النظام */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">كيفية استخدام نظام الكونترول</h3>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
            <span>اضغط <strong className="text-slate-800">&quot;تحميل شيت الدرجات&quot;</strong> لتحميل ملف Excel يحتوي على قائمة جميع المتدربين</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
            <span>افتح الملف وأدخل درجات المتدربين في عمود <strong className="text-slate-800">&quot;الدرجة&quot;</strong></span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
            <span>احفظ الملف ثم اضغط <strong className="text-slate-800">&quot;رفع الدرجات&quot;</strong> لإدخال الدرجات تلقائياً</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
            <span>اضغط <strong className="text-slate-800">&quot;عرض الدرجات&quot;</strong> لعرض تفاصيل درجات المتدربين</span>
          </div>
        </div>
      </div>

      {/* قائمة الاختبارات - Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <DocumentTextIcon className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">
            الاختبارات الورقية ({filteredExams.length})
          </h3>
        </div>

        {filteredExams.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">لا توجد اختبارات {filterText && 'مطابقة لبحثك'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الاختبار</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">المادة / البرنامج</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">التاريخ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الدرجة / النوع</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">التصحيح</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExams.map((exam) => {
                const statusInfo = getStatusLabel(exam.status);
                const gradedCount = exam.answerSheets?.filter((s: any) => s.status === 'GRADED').length || 0;
                const totalCount = exam._count?.answerSheets || 0;
                const progressPct = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

                return (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{exam.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{exam.trainingContent?.code} - {exam.trainingContent?.name}</p>
                      {exam.trainingContent?.classroom && (
                        <p className="text-xs text-slate-500 mt-0.5">{exam.trainingContent.classroom.program?.name} - {exam.trainingContent.classroom.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                      {new Date(exam.examDate).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-slate-800">{exam.totalMarks} درجة</p>
                      <p className="text-xs text-slate-500">{getGradeTypeLabel(exam.gradeType)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-slate-500">{gradedCount}/{totalCount}</span>
                        {totalCount > 0 && (
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<ArrowDownTrayIcon className="w-3.5 h-3.5" />}
                          onClick={() => handleDownloadTemplate(exam.id, exam.title)}
                        >
                          تحميل
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          leftIcon={<ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                          isLoading={uploadingExcel}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.xlsx,.xls';
                            input.onchange = (e: any) => handleFileSelect(e, exam.id);
                            input.click();
                          }}
                        >
                          رفع
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<ChartBarIcon className="w-3.5 h-3.5" />}
                          onClick={() => handleViewGrades(exam)}
                        >
                          الدرجات
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

      {/* قائمة الاختبارات - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">لا توجد اختبارات {filterText && 'مطابقة لبحثك'}</p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const statusInfo = getStatusLabel(exam.status);
            const gradedCount = exam.answerSheets?.filter((s: any) => s.status === 'GRADED').length || 0;
            const totalCount = exam._count?.answerSheets || 0;
            const progressPct = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

            return (
              <div key={exam.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{exam.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {exam.trainingContent?.code} - {exam.trainingContent?.name}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-slate-700">{new Date(exam.examDate).toLocaleDateString('ar-EG')}</p>
                    <p className="text-[10px] text-slate-500">التاريخ</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-slate-700">{exam.totalMarks}</p>
                    <p className="text-[10px] text-slate-500">الدرجة</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-slate-700">{gradedCount}/{totalCount}</p>
                    <p className="text-[10px] text-slate-500">التصحيح</p>
                  </div>
                </div>

                {totalCount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>نسبة التصحيح</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    fullWidth
                    leftIcon={<ArrowDownTrayIcon className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadTemplate(exam.id, exam.title)}
                  >
                    تحميل
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    fullWidth
                    leftIcon={<ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                    isLoading={uploadingExcel}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls';
                      input.onchange = (e: any) => handleFileSelect(e, exam.id);
                      input.click();
                    }}
                  >
                    رفع
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    fullWidth
                    leftIcon={<ChartBarIcon className="w-3.5 h-3.5" />}
                    onClick={() => handleViewGrades(exam)}
                  >
                    الدرجات
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal عرض الدرجات */}
      <TibaModal
        open={showGradesModal && !!selectedExam}
        onClose={() => setShowGradesModal(false)}
        title={selectedExam?.title || 'الدرجات'}
        subtitle={selectedExam ? `${selectedExam.trainingContent?.name} - ${getGradeTypeLabel(selectedExam.gradeType)}` : ''}
        variant="primary"
        size="2xl"
      >
        {selectedExam && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">م</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">النموذج</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الدرجة</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">النسبة</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedExam.answerSheets
                    ?.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                    .map((sheet: any, index: number) => (
                      <tr key={sheet.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {sheet.trainee?.nameAr || 'غير معروف'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          {sheet.model?.modelCode || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sheet.score !== null && sheet.score !== undefined ? (
                            <span className="font-bold text-blue-700 text-sm">
                              {sheet.score} / {selectedExam.totalMarks}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sheet.percentage !== null && sheet.percentage !== undefined ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              sheet.percentage >= 90 ? 'bg-emerald-50 text-emerald-700' :
                              sheet.percentage >= 75 ? 'bg-blue-50 text-blue-700' :
                              sheet.percentage >= 50 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {sheet.percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sheet.status === 'GRADED' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <CheckCircleIcon className="w-4 h-4" /> مُصحح
                            </span>
                          ) : sheet.status === 'SUBMITTED' ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                              <ClockIcon className="w-4 h-4" /> تم التسليم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                              <ClockIcon className="w-4 h-4" /> لم يُسلم
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {selectedExam.answerSheets
                ?.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                .map((sheet: any, index: number) => (
                  <div key={sheet.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-800 text-sm">
                        {index + 1}. {sheet.trainee?.nameAr || 'غير معروف'}
                      </span>
                      {sheet.status === 'GRADED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> مُصحح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                          <ClockIcon className="w-3.5 h-3.5" /> {sheet.status === 'SUBMITTED' ? 'تم التسليم' : 'لم يُسلم'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      {sheet.model?.modelCode && <span>النموذج: {sheet.model.modelCode}</span>}
                      {sheet.score !== null && sheet.score !== undefined && (
                        <span className="font-bold text-blue-700">{sheet.score}/{selectedExam.totalMarks}</span>
                      )}
                      {sheet.percentage !== null && sheet.percentage !== undefined && (
                        <span className={`font-semibold ${
                          sheet.percentage >= 90 ? 'text-emerald-700' :
                          sheet.percentage >= 75 ? 'text-blue-700' :
                          sheet.percentage >= 50 ? 'text-amber-700' :
                          'text-red-700'
                        }`}>
                          {sheet.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {(!selectedExam.answerSheets || selectedExam.answerSheets.length === 0) && (
              <div className="text-center py-12">
                <UsersIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">لا توجد أوراق إجابة لهذا الاختبار</p>
              </div>
            )}
          </>
        )}
      </TibaModal>
    </div>
  );
}
