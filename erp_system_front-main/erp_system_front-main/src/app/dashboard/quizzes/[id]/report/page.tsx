'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  UsersIcon,
  UserMinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface QuizAttempt {
  id: string;
  traineeId: number;
  attemptNumber: number;
  status: string;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
  };
}

interface Trainee {
  id: number;
  nameAr: string;
  nationalId: string;
}

interface QuizReport {
  quiz: {
    id: number;
    title: string;
    trainingContent: {
      name: string;
      code: string;
      classroom: {
        name: string;
      };
    };
    duration: number;
    passingScore: number;
  };
  attempts: QuizAttempt[];
  traineesWhoDidNotTakeQuiz: Trainee[];
}

export default function QuizReportPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'view' }}>
      <QuizReportContent params={params} />
    </ProtectedPage>
  );
}

function QuizReportContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<QuizReport | null>(null);
  const [showPassed, setShowPassed] = useState(true);
  const [showFailed, setShowFailed] = useState(false);
  const [showNotTaken, setShowNotTaken] = useState(false);

  useEffect(() => {
    loadReport();
  }, [resolvedParams.id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/quizzes/${resolvedParams.id}/report`);
      setReport(data);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل التقرير');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">لم يتم العثور على التقرير</p>
      </div>
    );
  }

  const completedAttempts = report.attempts.filter(a => a.status === 'SUBMITTED');
  const passedAttempts = completedAttempts.filter(a => a.passed);
  const failedAttempts = completedAttempts.filter(a => !a.passed);
  const passedCount = passedAttempts.length;
  const failedCount = failedAttempts.length;

  const renderTable = (attempts: QuizAttempt[], hoverColor: string) => (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">#</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">اسم المتدرب</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الرقم الوطني</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الدرجة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">النسبة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">التسليم</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attempts
              .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
              .map((attempt, index) => (
                <tr key={attempt.id} className={`hover:${hoverColor} transition-colors`}>
                  <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{attempt.trainee.nameAr}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">{attempt.trainee.nationalId}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-slate-800">{attempt.score?.toFixed(1) || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      (attempt.percentage || 0) >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {attempt.percentage?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                    {attempt.submittedAt ? format(new Date(attempt.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ar }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="outline" leftIcon={<EyeIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${resolvedParams.id}/attempts/${attempt.id}`)}>
                      التفاصيل
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {attempts
          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
          .map((attempt, index) => (
            <div key={attempt.id} className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-800 text-sm">{index + 1}. {attempt.trainee.nameAr}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  (attempt.percentage || 0) >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {attempt.percentage?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span>{attempt.trainee.nationalId}</span>
                <span>الدرجة: {attempt.score?.toFixed(1) || 0}</span>
              </div>
              <Button size="sm" variant="outline" fullWidth leftIcon={<EyeIcon className="w-3.5 h-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${resolvedParams.id}/attempts/${attempt.id}`)}>
                التفاصيل
              </Button>
            </div>
          ))}
      </div>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`تقرير: ${report.quiz.title}`}
        description={`${report.quiz.trainingContent.code} - ${report.quiz.trainingContent.name}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات المصغرة', href: '/dashboard/quizzes' },
          { label: 'التقرير' }
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/dashboard/quizzes')} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            العودة
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><UsersIcon className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-sm text-slate-500">إجمالي المتدربين</p>
            <p className="text-2xl font-bold text-slate-800">{completedAttempts.length + report.traineesWhoDidNotTakeQuiz.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg"><CheckCircleIcon className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <p className="text-sm text-slate-500">ناجحون</p>
            <p className="text-2xl font-bold text-slate-800">{passedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg"><XCircleIcon className="w-6 h-6 text-red-600" /></div>
          <div>
            <p className="text-sm text-slate-500">راسبون</p>
            <p className="text-2xl font-bold text-slate-800">{failedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><UserMinusIcon className="w-6 h-6 text-amber-600" /></div>
          <div>
            <p className="text-sm text-slate-500">لم يختبروا</p>
            <p className="text-2xl font-bold text-slate-800">{report.traineesWhoDidNotTakeQuiz.length}</p>
          </div>
        </div>
      </div>

      {/* Passed Students */}
      {passedCount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircleIcon className="w-5 h-5 text-emerald-600" /></div>
              <div className="text-right">
                <h3 className="font-semibold text-slate-800">المتدربون الناجحون</h3>
                <p className="text-xs text-slate-500">({passedCount} متدرب)</p>
              </div>
            </div>
            {showPassed ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
          </button>
          {showPassed && renderTable(passedAttempts, 'bg-emerald-50/50')}
        </div>
      )}

      {/* Failed Students */}
      {failedCount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg"><XCircleIcon className="w-5 h-5 text-red-600" /></div>
              <div className="text-right">
                <h3 className="font-semibold text-slate-800">المتدربون الراسبون</h3>
                <p className="text-xs text-slate-500">({failedCount} متدرب)</p>
              </div>
            </div>
            {showFailed ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
          </button>
          {showFailed && renderTable(failedAttempts, 'bg-red-50/50')}
        </div>
      )}

      {/* Did Not Take */}
      {report.traineesWhoDidNotTakeQuiz.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowNotTaken(!showNotTaken)}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg"><UserMinusIcon className="w-5 h-5 text-amber-600" /></div>
              <div className="text-right">
                <h3 className="font-semibold text-slate-800">المتدربون الذين لم يختبروا</h3>
                <p className="text-xs text-slate-500">({report.traineesWhoDidNotTakeQuiz.length} متدرب)</p>
              </div>
            </div>
            {showNotTaken ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
          </button>
          {showNotTaken && (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">#</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">اسم المتدرب</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الرقم الوطني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.traineesWhoDidNotTakeQuiz.map((trainee, index) => (
                      <tr key={trainee.id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{trainee.nameAr}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{trainee.nationalId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {report.traineesWhoDidNotTakeQuiz.map((trainee, index) => (
                  <div key={trainee.id} className="p-4 flex justify-between items-center">
                    <span className="font-medium text-slate-800 text-sm">{index + 1}. {trainee.nameAr}</span>
                    <span className="text-xs text-slate-500">{trainee.nationalId}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

