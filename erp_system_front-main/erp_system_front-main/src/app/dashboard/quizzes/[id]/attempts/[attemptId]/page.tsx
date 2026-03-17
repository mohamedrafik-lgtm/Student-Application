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
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface QuizQuestion {
  id: string;
  question: {
    id: number;
    text: string;
    options: Array<{
      id: number;
      text: string;
      isCorrect: boolean;
    }>;
  };
  points: number;
  order: number;
}

interface QuizAnswer {
  id: string;
  questionId: number;
  selectedOptionId: number | null;
  isCorrect: boolean;
  earnedPoints: number;
  question: {
    id: number;
    text: string;
    options: Array<{
      id: number;
      text: string;
      isCorrect: boolean;
    }>;
  };
}

interface AttemptDetails {
  id: string;
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
  };
  quiz: {
    id: number;
    title: string;
    showCorrectAnswers: boolean;
    trainingContent: {
      name: string;
      code: string;
    };
  };
  status: string;
  score: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}

export default function AttemptDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string; attemptId: string }> 
}) {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'view' }}>
      <AttemptDetailsContent params={params} />
    </ProtectedPage>
  );
}

function AttemptDetailsContent({ 
  params 
}: { 
  params: Promise<{ id: string; attemptId: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);

  useEffect(() => {
    loadAttempt();
  }, [resolvedParams.attemptId]);

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/quizzes/attempts/${resolvedParams.attemptId}/details`);
      setAttempt(data);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل التفاصيل');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">لم يتم العثور على المحاولة</p>
      </div>
    );
  }

  const correctAnswersCount = attempt.answers.filter(a => a.isCorrect).length;
  const totalQuestions = attempt.questions.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`تفاصيل إجابة: ${attempt.trainee.nameAr}`}
        description={attempt.quiz.title}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات المصغرة', href: '/dashboard/quizzes' },
          { label: 'التقرير', href: `/dashboard/quizzes/${resolvedParams.id}/report` },
          { label: 'تفاصيل الإجابة' }
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push(`/dashboard/quizzes/${resolvedParams.id}/report`)} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            العودة للتقرير
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trainee Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 rounded-lg"><UserIcon className="w-5 h-5 text-blue-600" /></div>
            <h3 className="font-semibold text-slate-800">معلومات المتدرب</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">الاسم</p>
              <p className="font-medium text-slate-800">{attempt.trainee.nameAr}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">الرقم الوطني</p>
              <p className="font-medium text-slate-700">{attempt.trainee.nationalId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">المادة التدريبية</p>
              <p className="text-sm text-slate-700">{attempt.quiz.trainingContent.code} - {attempt.quiz.trainingContent.name}</p>
            </div>
          </div>
        </div>

        {/* Score Card */}
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${attempt.passed ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-lg ${attempt.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {attempt.passed ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> : <XCircleIcon className="w-5 h-5 text-red-600" />}
            </div>
            <h3 className={`font-semibold ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>
              {attempt.passed ? 'ناجح' : 'راسب'}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">الدرجة</span>
              <span className={`text-2xl font-bold ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>{attempt.score.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">النسبة المئوية</span>
              <span className={`text-2xl font-bold ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>{attempt.percentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-violet-50 rounded-lg"><ChartBarIcon className="w-5 h-5 text-violet-600" /></div>
            <h3 className="font-semibold text-slate-800">الإحصائيات</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">إجمالي الأسئلة</span>
              <span className="text-xl font-bold text-slate-800">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">إجابات صحيحة</span>
              <span className="text-xl font-bold text-emerald-600">{correctAnswersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">إجابات خاطئة</span>
              <span className="text-xl font-bold text-red-600">{totalQuestions - correctAnswersCount}</span>
            </div>
            {attempt.submittedAt && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">تاريخ التسليم</p>
                <p className="text-sm font-medium text-slate-700">{format(new Date(attempt.submittedAt), 'dd/MM/yyyy - HH:mm', { locale: ar })}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg"><ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" /></div>
          <h3 className="font-semibold text-slate-800">الأسئلة والإجابات التفصيلية</h3>
        </div>
        {attempt.questions
          .sort((a, b) => a.order - b.order)
          .map((quizQuestion, index) => {
            const answer = attempt.answers.find(a => a.questionId === quizQuestion.question.id);
            const isCorrect = answer?.isCorrect || false;

            return (
              <div key={quizQuestion.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
                {/* Question Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                        {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                      </p>
                      <p className="text-xs text-slate-500">النقاط: {answer?.earnedPoints || 0} / {quizQuestion.points}</p>
                    </div>
                  </div>
                  {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-emerald-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                </div>

                {/* Question Content */}
                <div className="p-5">
                  <div className="mb-5">
                    <p className="text-xs text-slate-500 mb-2">السؤال:</p>
                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border-r-4 border-blue-500">
                      {quizQuestion.question.text}
                    </p>
                  </div>

                  {/* Options */}
                  <div>
                    <p className="text-xs text-slate-500 mb-3">الخيارات:</p>
                    <div className="space-y-2">
                      {quizQuestion.question.options.map((option, optIndex) => {
                        const isSelected = answer?.selectedOptionId === option.id;
                        const isCorrectOption = option.isCorrect;

                        return (
                          <div
                            key={option.id}
                            className={`relative p-3 rounded-lg border-2 transition-all ${
                              isCorrectOption
                                ? 'bg-emerald-50 border-emerald-300'
                                : isSelected
                                ? 'bg-red-50 border-red-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isCorrectOption ? 'bg-emerald-500 text-white' :
                                isSelected ? 'bg-red-500 text-white' :
                                'bg-slate-300 text-slate-700'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${isCorrectOption || isSelected ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                                  {option.text}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                    اختيار المتدرب
                                  </span>
                                )}
                                {isCorrectOption && attempt.quiz.showCorrectAnswers && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                    <CheckCircleIcon className="w-3 h-3" /> صحيحة
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!answer?.selectedOptionId && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs font-medium text-amber-800">لم يتم الإجابة على هذا السؤال</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

