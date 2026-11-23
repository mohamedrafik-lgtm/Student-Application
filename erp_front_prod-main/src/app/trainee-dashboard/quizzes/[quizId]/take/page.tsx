'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startQuiz, submitAnswer, submitQuiz, recordQuizDeparture, getAvailableQuizzes, QuizAttempt } from '@/lib/quizzes-api';
import { toast } from 'react-hot-toast';
import {
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  AcademicCapIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export default function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const quizId = parseInt(resolvedParams.quizId);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showIntegrityNotice, setShowIntegrityNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [integrityBlocked, setIntegrityBlocked] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [departureWarning, setDepartureWarning] = useState<{ blocked: boolean } | null>(null);
  const departureSentWhileHidden = useRef(false);

  useEffect(() => {
    initializeQuiz();
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (!attempt || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, timeLeft]);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      const availableQuizzes = await getAvailableQuizzes();
      const quizInfo = availableQuizzes.find(item => item.id === quizId);
      if (quizInfo?.integrityMonitoringEnabled) {
        setShowIntegrityNotice(true);
        return;
      }
      await loadAttempt();
    } catch (error: unknown) {
      handleInitializeError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttempt = async () => {
      const attemptData = await startQuiz(quizId);
      setAttempt(attemptData);
      setTimeLeft(attemptData.quiz.duration * 60);
      setIntegrityBlocked(!!attemptData.integrityBlockedAt);
      // Existing departure events are historical. Only show this warning for a
      // departure detected during the current attempt session (recordQuizDeparture).
      setDepartureWarning(null);

      if (attemptData.answers && attemptData.answers.length > 0) {
        const answersMap = new Map();
        attemptData.answers.forEach(answer => {
          answersMap.set(answer.questionId, answer.selectedAnswer || '');
        });
        setAnswers(answersMap);
      }
  };

  const handleInitializeError = (error: unknown) => {
    console.error('Error initializing quiz:', error);
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في تحميل الاختبار';
    toast.error(errorMessage);
    setTimeout(() => {
      router.push('/trainee-dashboard/quizzes');
    }, 2000);
  };

  const handleContinueAfterNotice = async () => {
    setShowIntegrityNotice(false);
    setLoading(true);
    try {
      await loadAttempt();
    } catch (error) {
      handleInitializeError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pageVisible || !departureWarning) return;
    if (departureWarning.blocked) {
      toast.error('تم رصد تكرار محاولة مغادرة شاشة الاختبار، لذلك حُظر استكمال المحاولة. يمكنك تقديم طلب مراجعة من صفحة الاختبارات.', { duration: 9000 });
    } else {
      toast('تحذير: تم رصد محاولة لمغادرة شاشة الاختبار. لا تخرج من الاختبار ولا تنتقل إلى تطبيق آخر؛ تكرار ذلك يعرّضك للحظر من استكماله.', { icon: '⚠️', duration: 9000 });
    }
    setDepartureWarning(null);
  }, [pageVisible, departureWarning]);

  useEffect(() => {
    if (!attempt?.quiz.integrityMonitoringEnabled || integrityBlocked) return;
    const recordDeparture = (details: string) => {
      if (departureSentWhileHidden.current) return;
      departureSentWhileHidden.current = true;
      const clientEventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${attempt.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      recordQuizDeparture(attempt.id, { platform: 'WEB', clientEventId, details })
        .then(result => {
          setDepartureWarning({ blocked: result.blocked });
          if (result.blocked) {
            setIntegrityBlocked(true);
          }
        })
        .catch(error => console.error('Failed to record quiz tab departure:', error));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        departureSentWhileHidden.current = false;
        setPageVisible(true);
        return;
      }
      setPageVisible(false);
      if (document.visibilityState === 'hidden') recordDeparture('visibilitychange:hidden');
    };
    const onPageHide = () => recordDeparture('pagehide');
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [attempt?.id, attempt?.quiz.integrityMonitoringEnabled, integrityBlocked]);

  const handleAnswerChange = async (questionId: number, answer: string) => {
    if (!attempt) return;

    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    setAnswers(newAnswers);

    try {
      await submitAnswer(attempt.id, questionId, answer);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt) return;
    toast.error('انتهى الوقت! سيتم تسليم الاختبار تلقائياً');
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!attempt) return;

    const unanswered = attempt.quiz.questions?.filter(
      q => !answers.has(q.questionId)
    );

    if (unanswered && unanswered.length > 0) {
      if (!confirm(`لديك ${unanswered.length} أسئلة لم تُجب عليها. هل تريد التسليم؟`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      const result = await submitQuiz(attempt.id);
      toast.success('تم تسليم الاختبار بنجاح!');
      
      if (result.quiz?.showResults) {
        router.push(`/trainee-dashboard/quizzes/${quizId}/result/${attempt.id}`);
      } else {
        router.push('/trainee-dashboard/quizzes');
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تسليم الاختبار');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerState = () => {
    const totalSeconds = (attempt?.quiz.duration || 1) * 60;
    const percentage = (timeLeft / totalSeconds) * 100;
    if (percentage > 50) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', barColor: 'from-emerald-500 to-emerald-600' };
    if (percentage > 20) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', barColor: 'from-amber-500 to-orange-500' };
    return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', barColor: 'from-rose-500 to-rose-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse border border-emerald-200">
            <AcademicCapIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-100 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل الاختبار...</p>
        </div>
      </div>
    );
  }

  if (showIntegrityNotice) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="integrity-notice-title">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <div className="bg-gradient-to-l from-indigo-700 via-indigo-600 to-emerald-600 px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:h-14 sm:w-14"><ExclamationTriangleIcon className="h-7 w-7" /></div>
            <div><p className="text-xs font-semibold text-white/75 sm:text-sm">تنبيه قبل البدء</p><h1 id="integrity-notice-title" className="mt-1 text-xl font-black sm:text-2xl">إرشادات نزاهة الاختبار</h1></div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-7">
          <p className="text-sm leading-7 text-slate-700 sm:text-base">مغادرة شاشة الاختبار أو الانتقال إلى تطبيق آخر تُسجَّل كمخالفة، وقد تعرّضك للحظر من استكمال الاختبار. ابقَ في شاشة الاختبار حتى تنتهي. إذا أُوقفت المحاولة، يمكنك تقديم طلب مراجعة من المنصة.</p>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900 sm:text-sm"><InformationCircleIcon className="mt-1 h-5 w-5 shrink-0" /><p>قد تظهر إشعارات الهاتف أو قفل الشاشة للنظام كمغادرة. أبقِ شاشة الاختبار مفتوحة حتى تنتهي.</p></div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
            <button onClick={() => router.replace('/trainee-dashboard/quizzes')} className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">العودة للاختبارات</button>
            <button onClick={handleContinueAfterNotice} className="min-h-11 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200">أوافق، ابدأ الاختبار</button>
          </div>
        </div>
      </div>
    </div>;
  }

  if (!attempt || !attempt.quiz.questions) {
    return null;
  }

  if (integrityBlocked || attempt.integrityBlockedAt) {
    return <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-rose-600" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">تم إيقاف محاولة الاختبار</h1>
      <p className="mt-2 text-sm text-slate-600">رصد النظام تكرار محاولات مغادرة شاشة الاختبار، لذلك حُظر استكمال المحاولة. حُفظت إجاباتك وسجل الرصد، ويمكنك تقديم طلب مراجعة من صفحة الاختبارات الإلكترونية.</p>
      <button onClick={() => router.replace('/trainee-dashboard/quizzes')} className="mt-6 rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white">الانتقال إلى طلب المراجعة</button>
    </div>;
  }

  const currentQuestion = attempt.quiz.questions[currentQuestionIndex];
  const totalQuestions = attempt.quiz.questions.length;
  const answeredCount = answers.size;
  const timerState = getTimerState();
  const progressPercent = (answeredCount / totalQuestions) * 100;

  return (
    <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 flex flex-col min-h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
                <AcademicCapIcon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate mb-1">{attempt.quiz.title}</h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                    {attempt.quiz.trainingContent.name}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Timer moved to header */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${timerState.bg} ${timerState.border}`}>
              <ClockIcon className={`w-5 h-5 ${timerState.color}`} />
              <span className={`text-base sm:text-lg font-bold tabular-nums ${timerState.color}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap min-w-[3rem] text-center">
              {answeredCount} / {totalQuestions}
            </span>
            <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6 sm:py-8 flex-1">

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 sm:mb-8">
          {/* Question Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-8 py-4 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-md text-sm font-bold">
                  {currentQuestionIndex + 1}
                </span>
                <span className="text-slate-500 font-medium text-sm">من {totalQuestions} أسئلة</span>
              </div>
              <span className="px-3 py-1.5 bg-white text-slate-600 rounded-md text-sm font-medium border border-slate-200 shadow-sm flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                {currentQuestion.points || 1} {(currentQuestion.points || 1) === 1 ? 'درجة' : 'درجات'}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-relaxed">
              {currentQuestion.question.text}
            </h2>
          </div>

          {/* Options */}
          <div className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-3 sm:space-y-4">
            {currentQuestion.question.options.map((option) => {
              const isSelected = answers.get(currentQuestion.questionId) === option.id.toString();
              return (
                <button
                  key={option.id}
                  onClick={() => handleAnswerChange(currentQuestion.questionId, option.id.toString())}
                  className={`w-full text-right p-4 sm:p-5 rounded-xl border transition-all duration-150 group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'border-slate-300 group-hover:border-emerald-300'
                    }`}>
                      {isSelected && (
                        <CheckCircleSolid className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className={`text-base sm:text-lg leading-relaxed flex-1 ${
                      isSelected ? 'font-bold text-emerald-900' : 'font-medium text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Dots Navigator (Mobile) */}
        <div className="sm:hidden mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">تصفح الأسئلة</span>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{answeredCount} مجاب</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attempt.quiz.questions.map((q, idx) => {
                const isAnswered = answers.has(q.questionId);
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-md text-sm font-bold transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-2'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Numbers (Desktop) */}
        <div className="hidden sm:block mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">تصفح الأسئلة</span>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">{answeredCount} مجاب</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {attempt.quiz.questions.map((q, idx) => {
                const isAnswered = answers.has(q.questionId);
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-12 h-12 rounded-md text-base font-bold transition-all duration-150 flex items-center justify-center ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-2 scale-105'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {attempt.quiz.instructions && (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-md flex items-center justify-center flex-shrink-0">
                <InformationCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 mb-1">تعليمات الاختبار</p>
                <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed font-medium">{attempt.quiz.instructions}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-200 shadow-sm sticky bottom-0 z-10 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Previous */}
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-slate-700 transition-all text-sm sm:text-base border border-slate-200 shadow-sm min-w-[100px] sm:min-w-[140px]"
            >
              <ChevronRightIcon className="w-5 h-5" />
              <span className="hidden sm:inline">السؤال السابق</span>
              <span className="sm:hidden">السابق</span>
            </button>

            {/* Center: Submit or Question count */}
            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-10 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm sm:text-base"
              >
                <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
                {submitting ? 'جاري التسليم...' : 'تسليم الاختبار'}
              </button>
            ) : (
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-sm font-bold text-slate-900">
                  السؤال {currentQuestionIndex + 1}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  من {totalQuestions}
                </span>
              </div>
            )}

            {/* Next */}
            {currentQuestionIndex < totalQuestions - 1 && (
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md text-sm sm:text-base min-w-[100px] sm:min-w-[140px]"
              >
                <span className="hidden sm:inline">السؤال التالي</span>
                <span className="sm:hidden">التالي</span>
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

