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
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  tabDepartureCount?: number;
  integrityBlockedAt?: string | null;
  integrityBlockReason?: string | null;
  integrityEvents?: { id: number; platform: string; occurredAt: string; details?: string | null }[];
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ في تحميل التفاصيل');
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
  const answeredCount = attempt.answers.length;
  const incorrectAnswersCount = attempt.answers.filter(a => !a.isCorrect).length;
  const totalQuestions = attempt.questions.length;
  const isSubmitted = attempt.status === 'SUBMITTED';
  const isPassed = isSubmitted && attempt.passed === true;
  const scoreTone = !isSubmitted ? 'amber' : isPassed ? 'emerald' : 'red';
  const scoreToneClasses = scoreTone === 'amber'
    ? { border: 'border-amber-200', iconBg: 'bg-amber-50', icon: 'text-amber-600', title: 'text-amber-700', text: 'text-amber-700' }
    : scoreTone === 'emerald'
    ? { border: 'border-emerald-200', iconBg: 'bg-emerald-50', icon: 'text-emerald-600', title: 'text-emerald-700', text: 'text-emerald-700' }
    : { border: 'border-red-200', iconBg: 'bg-red-50', icon: 'text-red-600', title: 'text-red-700', text: 'text-red-700' };
  const eventDescription = (event: NonNullable<AttemptDetails['integrityEvents']>[number]) => {
    if (event.platform === 'MOBILE') return 'غادر المتدرب تطبيق الاختبار أو انتقل إلى تطبيق آخر.';
    if (event.details === 'pagehide') return 'غادر المتدرب صفحة الاختبار أو أغلقها.';
    if (event.details === 'visibilitychange:hidden') return 'انتقل المتصفح إلى صفحة أو تبويب آخر.';
    return 'رصد النظام خروجًا من شاشة الاختبار.';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`تفاصيل محاولة الاختبار: ${attempt.trainee.nameAr}`}
        description={attempt.quiz.title}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات الإلكترونية', href: '/dashboard/quizzes' },
          { label: 'تقرير الاختبار', href: `/dashboard/quizzes/${resolvedParams.id}/report` },
          { label: 'تفاصيل المحاولة' }
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
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${scoreToneClasses.border}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-lg ${scoreToneClasses.iconBg}`}>
              {!isSubmitted ? <ExclamationTriangleIcon className={`w-5 h-5 ${scoreToneClasses.icon}`} /> : isPassed ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> : <XCircleIcon className="w-5 h-5 text-red-600" />}
            </div>
            <h3 className={`font-semibold ${scoreToneClasses.title}`}>
            {!isSubmitted ? (attempt.integrityBlockedAt ? 'موقوفة بانتظار المراجعة' : 'الاختبار جارٍ') : isPassed ? 'ناجح' : 'غير مجتاز'}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">الدرجة</span>
              <span className={`text-2xl font-bold ${scoreToneClasses.text}`}>{attempt.score == null ? '—' : attempt.score.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">نسبة الدرجة</span>
              <span className={`text-2xl font-bold ${scoreToneClasses.text}`}>{attempt.percentage == null ? '—' : `${attempt.percentage.toFixed(2)}%`}</span>
            </div>
            {!isSubmitted && <p className="text-xs text-slate-500">لم تُحتسب نتيجة نهائية لهذه المحاولة بعد.</p>}
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
              <span className="text-xl font-bold text-red-600">{incorrectAnswersCount}</span>
            </div>
            {!isSubmitted && <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">دون إجابة</span>
              <span className="text-xl font-bold text-amber-600">{totalQuestions - answeredCount}</span>
            </div>
            }
            {attempt.submittedAt && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">تاريخ التسليم</p>
                <p className="text-sm font-medium text-slate-700">{format(new Date(attempt.submittedAt), 'dd/MM/yyyy - HH:mm', { locale: ar })}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {attempt.integrityBlockedAt && <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h3 className="font-bold text-rose-900">سبب إيقاف المحاولة وسجل الخروج</h3>
        <p className="mt-1 text-sm text-rose-800">{attempt.integrityBlockReason || 'أوقف النظام المحاولة بعد تجاوز الحد المسموح للخروج من شاشة الاختبار.'} · مرات الخروج المرصودة: {attempt.tabDepartureCount || 0}</p>
        <ul className="mt-3 space-y-2 text-xs text-rose-800">{[...(attempt.integrityEvents || [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).map(event => <li key={event.id} className="rounded-lg bg-white/70 p-2">{format(new Date(event.occurredAt), 'dd/MM/yyyy - hh:mm:ss a', { locale: ar })} · {event.platform === 'MOBILE' ? 'تطبيق الهاتف' : 'المتصفح'} · {eventDescription(event)}</li>)}</ul>
      </section>}

      {/* Questions and Answers */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg"><ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" /></div>
          <h3 className="font-semibold text-slate-800">إجابات المتدرب عن الأسئلة</h3>
        </div>
        {attempt.questions
          .sort((a, b) => a.order - b.order)
          .map((quizQuestion, index) => {
            const answer = attempt.answers.find(a => a.questionId === quizQuestion.question.id);
            const isAnswered = !!answer;
            const isCorrect = answer?.isCorrect || false;
            const stateColor = !isAnswered ? 'amber' : isCorrect ? 'emerald' : 'red';
            const questionCardClasses = stateColor === 'amber'
              ? { border: 'border-amber-200', header: 'bg-amber-50/50 border-amber-100', index: 'bg-amber-500 text-white', title: 'text-amber-800', icon: 'text-amber-500' }
              : stateColor === 'emerald'
              ? { border: 'border-emerald-200', header: 'bg-emerald-50/50 border-emerald-100', index: 'bg-emerald-600 text-white', title: 'text-emerald-800', icon: 'text-emerald-500' }
              : { border: 'border-red-200', header: 'bg-red-50/50 border-red-100', index: 'bg-red-600 text-white', title: 'text-red-800', icon: 'text-red-500' };

            return (
              <div key={quizQuestion.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${questionCardClasses.border}`}>
                {/* Question Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${questionCardClasses.header}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${questionCardClasses.index}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${questionCardClasses.title}`}>
                        {!isAnswered ? 'لم تتم الإجابة' : isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                      </p>
                      <p className="text-xs text-slate-500">النقاط: {answer?.earnedPoints || 0} / {quizQuestion.points}</p>
                    </div>
                  </div>
                  {!isAnswered ? <ExclamationTriangleIcon className={`w-6 h-6 ${questionCardClasses.icon}`} /> : isCorrect ? <CheckCircleIcon className="w-6 h-6 text-emerald-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
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
                    <p className="text-xs text-slate-500 mb-3">الإجابات المتاحة:</p>
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

