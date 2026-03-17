'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getAttemptResult, QuizAttempt } from '@/lib/quizzes-api';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiClock, FiAward, FiHome } from 'react-icons/fi';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function QuizResultPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, [resolvedParams.attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await getAttemptResult(resolvedParams.attemptId);
      setAttempt(data);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحميل النتيجة');
      router.push('/trainee-dashboard/quizzes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse border border-emerald-200">
            <FiAward className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-100 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل النتيجة...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !attempt.quiz) {
    return null;
  }

  const passed = attempt.passed || false;
  const percentage = attempt.percentage || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Result Header */}
      <div className={`rounded-2xl shadow-sm p-8 sm:p-12 relative overflow-hidden ${
        passed
          ? 'bg-teal-600'
          : 'bg-rose-600'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 text-center text-white">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/10">
            {passed ? (
              <FiCheckCircle className="w-12 h-12 text-white" />
            ) : (
              <FiXCircle className="w-12 h-12 text-white" />
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {passed ? '🎉 مبروك! لقد نجحت' : '😔 للأسف، لم تنجح'}
          </h1>
          
          <p className="text-lg sm:text-xl font-medium text-white/90 mb-8">
            {attempt.quiz.title}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-sm">
              <p className="text-sm font-medium text-white/80 mb-2">درجتك</p>
              <p className="text-3xl font-bold">
                {attempt.score?.toFixed(1)} <span className="text-lg font-medium text-white/70">/ {attempt.totalPoints?.toFixed(1)}</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-sm">
              <p className="text-sm font-medium text-white/80 mb-2">النسبة المئوية</p>
              <p className="text-3xl font-bold">{percentage.toFixed(1)}%</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-sm">
              <p className="text-sm font-medium text-white/80 mb-2">الوقت المستغرق</p>
              <p className="text-3xl font-bold tabular-nums">
                {Math.floor((attempt.duration || 0) / 60)}:{((attempt.duration || 0) % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
              <FiClock className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">وقت التسليم</p>
              <p className="font-bold text-slate-900">
                {attempt.submittedAt && format(new Date(attempt.submittedAt), 'dd MMM yyyy - HH:mm', { locale: ar })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Review (if enabled) */}
      {attempt.quiz.showCorrectAnswers && attempt.answers && attempt.answers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
              <FiCheckCircle className="w-5 h-5 text-slate-600" />
            </div>
            مراجعة الإجابات
          </h2>
          
          <div className="space-y-6">
            {attempt.answers.map((answer, idx) => {
              const question = answer.question;
              if (!question) return null;

              const selectedOption = question.options.find(
                opt => opt.id.toString() === answer.selectedAnswer
              );
              const correctOption = question.options.find(opt => opt.isCorrect);

              return (
                <div
                  key={answer.id}
                  className={`p-5 sm:p-6 rounded-xl border ${
                    answer.isCorrect
                      ? 'border-teal-200 bg-teal-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      answer.isCorrect ? 'bg-teal-100' : 'bg-rose-100'
                    }`}>
                      {answer.isCorrect ? (
                        <FiCheckCircle className="w-6 h-6 text-teal-600" />
                      ) : (
                        <FiXCircle className="w-6 h-6 text-rose-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold shadow-sm">
                          السؤال {idx + 1}
                        </span>
                        <span className={`px-3 py-1.5 rounded-md text-xs font-bold border shadow-sm ${
                          answer.isCorrect
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {answer.points?.toFixed(1) || (answer.isCorrect ? '1.0' : '0.0')} من {question.options.find(opt => opt.isCorrect) ? (question.points || 1) : '0'} درجة
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-4 leading-relaxed">
                        {question.text}
                      </p>

                      <div className="space-y-2.5">
                        {question.options.map((option) => {
                          const isSelected = selectedOption?.id === option.id;
                          const isCorrect = correctOption?.id === option.id;

                          return (
                            <div
                              key={option.id}
                              className={`p-4 rounded-lg border transition-all ${
                                isCorrect
                                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                                  : isSelected
                                  ? 'border-rose-500 bg-rose-50 shadow-sm'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                  isCorrect ? 'border-teal-500 bg-teal-500' :
                                  isSelected ? 'border-rose-500 bg-rose-500' :
                                  'border-slate-300'
                                }`}>
                                  {isCorrect && (
                                    <FiCheckCircle className="w-4 h-4 text-white" />
                                  )}
                                  {isSelected && !isCorrect && (
                                    <FiXCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                                <span className={`text-base ${
                                  isCorrect
                                    ? 'font-bold text-teal-900'
                                    : isSelected
                                    ? 'font-bold text-rose-900'
                                    : 'font-medium text-slate-700'
                                }`}>
                                  {option.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center pb-8">
        <button
          onClick={() => router.push('/trainee-dashboard/quizzes')}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <FiHome className="w-5 h-5" />
          العودة إلى الاختبارات
        </button>
      </div>
    </div>
  );
}

