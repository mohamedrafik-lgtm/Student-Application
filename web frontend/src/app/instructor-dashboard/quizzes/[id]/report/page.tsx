'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiArrowRight, FiCheckCircle, FiXCircle, FiEye, FiUsers, FiUserX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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

export default function InstructorQuizReportPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">لم يتم العثور على التقرير</p>
      </div>
    );
  }

  const completedAttempts = report.attempts.filter(a => a.status === 'SUBMITTED');
  const passedAttempts = completedAttempts.filter(a => a.passed);
  const failedAttempts = completedAttempts.filter(a => !a.passed);
  const passedCount = passedAttempts.length;
  const failedCount = failedAttempts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/instructor-dashboard/quizzes')}
        >
          <FiArrowRight className="ml-2" />
          العودة
        </Button>
        <PageHeader
          title={`تقرير: ${report.quiz.title}`}
          description={`${report.quiz.trainingContent.code} - ${report.quiz.trainingContent.name}`}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold mb-1">إجمالي المتدربين</p>
              <p className="text-3xl font-bold text-blue-700">
                {completedAttempts.length + report.traineesWhoDidNotTakeQuiz.length}
              </p>
            </div>
            <FiUsers className="w-12 h-12 text-blue-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-semibold mb-1">ناجحون</p>
              <p className="text-3xl font-bold text-green-700">{passedCount}</p>
            </div>
            <FiCheckCircle className="w-12 h-12 text-green-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-semibold mb-1">راسبون</p>
              <p className="text-3xl font-bold text-red-700">{failedCount}</p>
            </div>
            <FiXCircle className="w-12 h-12 text-red-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-semibold mb-1">لم يختبروا</p>
              <p className="text-3xl font-bold text-orange-700">
                {report.traineesWhoDidNotTakeQuiz.length}
              </p>
            </div>
            <FiUserX className="w-12 h-12 text-orange-300" />
          </div>
        </Card>
      </div>

      {/* Passed Students - Collapsible */}
      {passedCount > 0 && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-colors border-b-2 border-green-200"
          >
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
              <div className="text-right">
                <h3 className="text-lg font-bold text-green-900">المتدربون الناجحون</h3>
                <p className="text-sm text-green-700">({passedCount} متدرب)</p>
              </div>
            </div>
            {showPassed ? (
              <FiChevronUp className="w-6 h-6 text-green-600" />
            ) : (
              <FiChevronDown className="w-6 h-6 text-green-600" />
            )}
          </button>
          
          {showPassed && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">اسم المتدرب</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الرقم الوطني</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الدرجة</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">النسبة المئوية</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">تاريخ التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {passedAttempts
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((attempt, index) => (
                      <tr key={attempt.id} className="hover:bg-green-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {attempt.trainee.nameAr}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">
                          {attempt.trainee.nationalId}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {attempt.score?.toFixed(1) || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-bold text-green-600">
                            {attempt.percentage?.toFixed(1) || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">
                          {attempt.submittedAt
                            ? format(new Date(attempt.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ar })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Failed Students - Collapsible */}
      {failedCount > 0 && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 transition-colors border-b-2 border-red-200"
          >
            <div className="flex items-center gap-3">
              <FiXCircle className="w-6 h-6 text-red-600" />
              <div className="text-right">
                <h3 className="text-lg font-bold text-red-900">المتدربون الراسبون</h3>
                <p className="text-sm text-red-700">({failedCount} متدرب)</p>
              </div>
            </div>
            {showFailed ? (
              <FiChevronUp className="w-6 h-6 text-red-600" />
            ) : (
              <FiChevronDown className="w-6 h-6 text-red-600" />
            )}
          </button>
          
          {showFailed && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">اسم المتدرب</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الرقم الوطني</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الدرجة</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">النسبة المئوية</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">تاريخ التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {failedAttempts
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((attempt, index) => (
                      <tr key={attempt.id} className="hover:bg-red-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {attempt.trainee.nameAr}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">
                          {attempt.trainee.nationalId}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {attempt.score?.toFixed(1) || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-bold text-red-600">
                            {attempt.percentage?.toFixed(1) || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">
                          {attempt.submittedAt
                            ? format(new Date(attempt.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ar })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Did Not Take Quiz - Collapsible */}
      {report.traineesWhoDidNotTakeQuiz.length > 0 && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowNotTaken(!showNotTaken)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-colors border-b-2 border-orange-200"
          >
            <div className="flex items-center gap-3">
              <FiUserX className="w-6 h-6 text-orange-600" />
              <div className="text-right">
                <h3 className="text-lg font-bold text-orange-900">المتدربون الذين لم يختبروا</h3>
                <p className="text-sm text-orange-700">({report.traineesWhoDidNotTakeQuiz.length} متدرب)</p>
              </div>
            </div>
            {showNotTaken ? (
              <FiChevronUp className="w-6 h-6 text-orange-600" />
            ) : (
              <FiChevronDown className="w-6 h-6 text-orange-600" />
            )}
          </button>
          
          {showNotTaken && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">اسم المتدرب</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الرقم الوطني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.traineesWhoDidNotTakeQuiz.map((trainee, index) => (
                    <tr key={trainee.id} className="hover:bg-orange-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{trainee.nameAr}</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-700">{trainee.nationalId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

