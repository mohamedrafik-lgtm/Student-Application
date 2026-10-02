'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon, BoltIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';

interface BatchGradingSession {
  id: string;
  paperExamId: string;
  fileName: string;
  totalPages: number;
  completedCount: number;
  skippedCount: number;
  alreadyGradedCount: number;
  failedCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startTime: string;
  endTime: string | null;
}

interface BatchGradingResult {
  id: string;
  sessionId: string;
  pageNumber: number;
  sheetId: string;
  studentName: string | null;
  nationalId: string;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  answersDetail: any;
  createdAt: string;
}

interface BatchGradingSkipped {
  id: string;
  sessionId: string;
  pageNumber: number;
  reason: string;
  nationalId: string | null;
  createdAt: string;
}

interface BatchGradingAlreadyGraded {
  id: string;
  sessionId: string;
  pageNumber: number;
  nationalId: string;
  studentName: string;
  previousScore: number;
  createdAt: string;
}

interface BatchGradingFailure {
  id: string;
  sessionId: string;
  pageNumber: number;
  error: string;
  nationalId: string | null;
  createdAt: string;
}

interface SessionDetails {
  session: BatchGradingSession;
  results: BatchGradingResult[];
  skipped: BatchGradingSkipped[];
  alreadyGraded: BatchGradingAlreadyGraded[];
  failures: BatchGradingFailure[];
}

export default function BatchLogPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [sessions, setSessions] = useState<BatchGradingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions`);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('فشل في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      setRefreshing(true);
      const data = await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/details`);
      setSelectedSession(data);
    } catch (error) {
      console.error('Error loading session details:', error);
      toast.error('فشل في تحميل تفاصيل السجل');
    } finally {
      setRefreshing(false);
    }
  };

  const exportToExcel = async () => {
    if (!selectedSession) return;

    try {
      // تحميل مكتبة xlsx ديناميكياً
      const XLSX = await import('xlsx');

      const data: any[] = [];

      selectedSession.results.forEach(r => {
        data.push({
          'الحالة': 'نجح',
          'رقم الصفحة': r.pageNumber,
          'اسم الطالب': r.studentName || '-',
          'الرقم القومي': r.nationalId,
          'الدرجة': r.score,
          'إجمالي الأسئلة': r.totalQuestions,
          'الإجابات الصحيحة': r.correctAnswers,
          'الإجابات الخاطئة': r.wrongAnswers,
          'السبب': '-',
        });
      });

      selectedSession.alreadyGraded.forEach(a => {
        data.push({
          'الحالة': 'مصحح سابقاً',
          'رقم الصفحة': a.pageNumber,
          'اسم الطالب': a.studentName,
          'الرقم القومي': a.nationalId,
          'الدرجة': a.previousScore,
          'إجمالي الأسئلة': '-',
          'الإجابات الصحيحة': '-',
          'الإجابات الخاطئة': '-',
          'السبب': 'تم تصحيحها سابقاً',
        });
      });

      selectedSession.skipped.forEach(s => {
        data.push({
          'الحالة': 'متجاهل',
          'رقم الصفحة': s.pageNumber,
          'اسم الطالب': '-',
          'الرقم القومي': s.nationalId || '-',
          'الدرجة': '-',
          'إجمالي الأسئلة': '-',
          'الإجابات الصحيحة': '-',
          'الإجابات الخاطئة': '-',
          'السبب': s.reason,
        });
      });

      selectedSession.failures.forEach(f => {
        data.push({
          'الحالة': 'فشل',
          'رقم الصفحة': f.pageNumber,
          'اسم الطالب': '-',
          'الرقم القومي': f.nationalId || '-',
          'الدرجة': '-',
          'إجمالي الأسئلة': '-',
          'الإجابات الصحيحة': '-',
          'الإجابات الخاطئة': '-',
          'السبب': f.error,
        });
      });

      // إنشاء ملف Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير التصحيح');

      // تعديل عرض الأعمدة
      worksheet['!cols'] = [
        { wch: 15 }, // الحالة
        { wch: 12 }, // رقم الصفحة
        { wch: 25 }, // اسم الطالب
        { wch: 18 }, // الرقم القومي
        { wch: 10 }, // الدرجة
        { wch: 15 }, // إجمالي الأسئلة
        { wch: 18 }, // الإجابات الصحيحة
        { wch: 18 }, // الإجابات الخاطئة
        { wch: 30 }, // السبب
      ];

      // تحميل الملف
      XLSX.writeFile(workbook, `تقرير-التصحيح-${selectedSession?.session?.fileName || selectedSession?.fileName || 'batch'}.xlsx`);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('فشل في تصدير التقرير');
    }
  };

  useEffect(() => {
    loadSessions();
  }, [examId]);

  // تحديث تلقائي منفصل
  useEffect(() => {
    const interval = setInterval(() => {
      // التحقق من وجود جلسات نشطة بشكل مباشر
      const hasActiveSessions = sessions.some(s => s.status === 'IN_PROGRESS');
      if (hasActiveSessions) {
        loadSessions();
        if (selectedSession?.session && selectedSession.session.status === 'IN_PROGRESS') {
          loadSessionDetails(selectedSession.session.id);
        }
      }
    }, 10000); // كل 10 ثواني بدلاً من 5 لتقليل الطلبات
    return () => clearInterval(interval);
  }, [sessions.length, selectedSession?.session?.id, selectedSession?.session?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <PageHeader
          title="السجل الكامل للتصحيح التلقائي"
          description="عرض تفاصيل جميع عمليات التصحيح الدفعي"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
            { label: 'سجل التصحيح' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                leftIcon={<ArrowRightIcon className="w-4 h-4" />}
              >
                رجوع
              </Button>
              <Button
                onClick={() => {
                  loadSessions();
                  if (selectedSession?.session?.id) loadSessionDetails(selectedSession.session.id);
                }}
                variant="outline"
                size="sm"
                leftIcon={<ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
                disabled={refreshing}
              >
                تحديث
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قائمة الجلسات */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                العمليات ({sessions.length})
              </h2>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">لا توجد عمليات بعد</p>
                ) : (
                  sessions.map((session) => {
                    const totalProcessed = session.completedCount + session.alreadyGradedCount + session.skippedCount + session.failedCount;
                    const progress = (totalProcessed / session.totalPages) * 100;
                    const isActive = session.status === 'IN_PROGRESS';
                    const isSelected = selectedSession?.session?.id === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => loadSessionDetails(session.id)}
                        className={`
                          rounded-xl p-4 border cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:shadow-sm'
                          }
                          ${isActive ? 'animate-pulse' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isActive ? (
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                          ) : session.status === 'COMPLETED' ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-600" />
                          )}
                          <p className="text-sm font-bold text-slate-900 truncate flex-1">
                            {session.fileName}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {new Date(session.startTime).toLocaleString('ar-EG')}
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                          <div
                            className="h-2 bg-blue-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-700">{session.completedCount} نجح</span>
                          <span className="text-blue-700">{session.alreadyGradedCount} سابق</span>
                          <span className="text-yellow-700">{session.skippedCount} تخطي</span>
                          <span className="text-red-700">{session.failedCount} فشل</span>
                          <span className="text-slate-600 mr-auto">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* تفاصيل الجلسة المحددة */}
          <div className="lg:col-span-2">
            {!selectedSession ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <div className="p-3 bg-slate-50 rounded-lg inline-block mb-4">
                  <ArrowDownTrayIcon className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg text-slate-600">اختر عملية لعرض التفاصيل</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ملخص العملية */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      ملخص العملية
                    </h2>
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    >
                      تصدير Excel
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
                      <div className="p-3 bg-green-50 rounded-lg inline-block mb-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">نجح</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedSession.results.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
                      <div className="p-3 bg-blue-50 rounded-lg inline-block mb-2">
                        <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">مصحح سابقاً</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedSession.alreadyGraded.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
                      <div className="p-3 bg-yellow-50 rounded-lg inline-block mb-2">
                        <BoltIcon className="w-5 h-5 text-yellow-600" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">متجاهل</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedSession.skipped.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
                      <div className="p-3 bg-red-50 rounded-lg inline-block mb-2">
                        <XCircleIcon className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">فشل</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedSession.failures.length}</p>
                    </div>
                  </div>
                </div>

                {/* النجاح */}
                {selectedSession.results.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      الأوراق الناجحة ({selectedSession.results.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSession.results.map((result) => (
                        <div key={result.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-900">
                              صفحة {result.pageNumber}
                            </p>
                            <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-bold">
                              {result.score}/{result.totalQuestions}
                            </span>
                          </div>
                          <p className="text-base font-bold text-slate-900 mb-1">
                            {result.studentName || 'طالب غير محدد'}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            {result.nationalId}
                          </p>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>صحيحة: {result.correctAnswers}</span>
                            <span>خاطئة: {result.wrongAnswers}</span>
                            <span>مجاوبة: {result.answeredQuestions}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المصححة سابقاً */}
                {selectedSession.alreadyGraded.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                      أوراق مصححة سابقاً ({selectedSession.alreadyGraded.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSession.alreadyGraded.map((item) => (
                        <div key={item.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-900">
                              صفحة {item.pageNumber}
                            </p>
                            <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                              {item.previousScore} درجة
                            </span>
                          </div>
                          <p className="text-base font-bold text-slate-900 mb-1">
                            {item.studentName}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            {item.nationalId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المتجاهلة */}
                {selectedSession.skipped.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <BoltIcon className="w-5 h-5 text-yellow-600" />
                      أوراق متجاهلة ({selectedSession.skipped.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSession.skipped.map((item) => (
                        <div key={item.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <p className="text-sm font-bold text-slate-900 mb-2">
                            صفحة {item.pageNumber}
                          </p>
                          <p className="text-sm text-yellow-800 mb-2">
                            {item.reason}
                          </p>
                          {item.nationalId && (
                            <p className="text-xs text-slate-500">
                              {item.nationalId}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* الفشل */}
                {selectedSession.failures.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                      فشل التصحيح ({selectedSession.failures.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSession.failures.map((item) => (
                        <div key={item.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <p className="text-sm font-bold text-slate-900 mb-2">
                            صفحة {item.pageNumber}
                          </p>
                          <p className="text-sm text-red-800 mb-2">
                            {item.error}
                          </p>
                          {item.nationalId && (
                            <p className="text-xs text-slate-500">
                              {item.nationalId}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
