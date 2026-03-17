'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAvailableQuizzes, AvailableQuiz } from '@/lib/quizzes-api';
import { toast } from 'react-hot-toast';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  EyeIcon,
  ArrowLeftIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function TraineeQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<AvailableQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'ended'>('all');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getAvailableQuizzes();
      setQuizzes(data);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل الاختبارات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter then sort by newest first (startDate descending, fallback to id descending)
  const filteredQuizzes = quizzes
    .filter(quiz => {
      if (filter === 'all') return true;
      return quiz.status === filter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'متاح الآن', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: CheckCircleIcon };
      case 'upcoming':
        return { label: 'قريباً', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: ClockIcon };
      case 'ended':
        return { label: 'منتهي', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: XCircleIcon };
      case 'completed':
        return { label: 'مُنجز', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: TrophyIcon };
      default:
        return { label: '', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: ClockIcon };
    }
  };

  const getIconGradient = (status: string) => {
    switch (status) {
      case 'available':
        return 'from-teal-500 to-teal-600';
      case 'upcoming':
        return 'from-emerald-600 to-emerald-700';
      case 'ended':
        return 'from-slate-500 to-slate-600';
      case 'completed':
        return 'from-teal-500 to-teal-600';
      default:
        return 'from-emerald-600 to-emerald-700';
    }
  };

  const handleStartQuiz = (quizId: number) => {
    router.push(`/trainee-dashboard/quizzes/${quizId}/take`);
  };

  const stats = {
    total: quizzes.length,
    available: quizzes.filter(q => q.status === 'available').length,
    completed: quizzes.filter(q => q.status === 'completed').length,
    upcoming: quizzes.filter(q => q.status === 'upcoming').length,
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-4 sm:px-0">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/trainee-dashboard" className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100 hidden sm:flex">
                <AcademicCapIcon className="w-6 h-6 text-emerald-600" />
              </div>
              الاختبارات الإلكترونية
            </h1>
            <p className="text-slate-500 font-medium mt-1">اختبر معلوماتك وقيّم مستواك في المواد التدريبية</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm mx-4 sm:mx-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">ملخص الاختبارات</h2>
            <p className="text-slate-500 text-sm">نظرة عامة على اختباراتك</p>
          </div>
          <div className="hidden md:block">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <AcademicCapIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                <DocumentCheckIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-slate-600 font-medium text-sm">الإجمالي</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{stats.total}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                <PlayIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-slate-600 font-medium text-sm">متاح</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{stats.available}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                <TrophyIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-slate-600 font-medium text-sm">مُنجز</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{stats.completed}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                <ClockIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-slate-600 font-medium text-sm">قريباً</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{stats.upcoming}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-2 sm:p-3 border border-slate-200 shadow-sm mx-4 sm:mx-0 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 min-w-max">
          {[
            { value: 'all', label: 'الكل', count: quizzes.length },
            { value: 'available', label: 'متاح الآن', count: quizzes.filter(q => q.status === 'available').length },
            { value: 'upcoming', label: 'قريباً', count: quizzes.filter(q => q.status === 'upcoming').length },
            { value: 'ended', label: 'منتهي', count: quizzes.filter(q => q.status === 'ended').length },
          ].map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filter === value
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              {label}
              <span className={`flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-medium ${
                filter === value ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm mx-4 sm:mx-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-100 border-t-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">جاري تحميل الاختبارات...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredQuizzes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center mx-4 sm:mx-0">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AcademicCapIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {filter === 'all' ? 'لا توجد اختبارات' : `لا توجد اختبارات ${filter === 'available' ? 'متاحة' : filter === 'upcoming' ? 'قريبة' : 'منتهية'}`}
          </h3>
          <p className="text-slate-500 text-sm">
            {filter === 'all' 
              ? 'لم يتم نشر أي اختبارات بعد'
              : 'جرب تصفية أخرى لمشاهدة الاختبارات المتاحة'
            }
          </p>
        </div>
      )}

      {/* Quizzes Grid */}
      {!loading && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-4 sm:mx-0">
          {filteredQuizzes.map((quiz) => {
            const badge = getStatusBadge(quiz.status);
            const BadgeIcon = badge.icon;
            const iconGradient = getIconGradient(quiz.status);
            return (
              <div
                key={quiz.id}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* Top: Icon Box + Status Badge */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 bg-gradient-to-br ${iconGradient} rounded-lg flex items-center justify-center shadow-sm`}>
                    <AcademicCapIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${badge.bg} ${badge.text} px-3 py-1.5 rounded-full font-medium border ${badge.border}`}>
                    <BadgeIcon className="w-4 h-4" />
                    {badge.label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors duration-300">
                  {quiz.title}
                </h3>

                {/* Subject name */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                    <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                    {quiz.trainingContent.name}
                  </span>
                </div>

                {/* Description */}
                {quiz.description && (
                  <p className="text-sm text-slate-500 mb-5 line-clamp-2 leading-relaxed">{quiz.description}</p>
                )}

                {/* Info Tags Row */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                    {quiz.duration} دقيقة
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                    <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-slate-400" />
                    {quiz._count?.questions || 0} سؤال
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-200">
                    <ChartBarIcon className="w-3.5 h-3.5 text-emerald-500" />
                    النجاح {quiz.passingScore}%
                  </span>
                </div>

                {/* Date Info */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">يبدأ في</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(quiz.startDate), 'dd MMM yyyy', { locale: ar })}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">ينتهي في</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(quiz.endDate), 'dd MMM yyyy', { locale: ar })}
                    </span>
                  </div>
                </div>

                {/* Result Badge (if completed) */}
                {quiz.result && (
                  <div className={`flex items-center justify-between rounded-lg p-3 mb-5 border ${
                    quiz.result.passed 
                      ? 'bg-teal-50 border-teal-200' 
                      : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        quiz.result.passed ? 'bg-teal-100' : 'bg-rose-100'
                      }`}>
                        {quiz.result.passed ? (
                          <TrophyIcon className="w-4 h-4 text-teal-600" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <span className={`text-sm font-bold ${quiz.result.passed ? 'text-teal-700' : 'text-rose-700'}`}>
                        {quiz.result.passed ? 'ناجح' : 'راسب'}
                      </span>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${quiz.result.passed ? 'text-teal-700' : 'text-rose-700'}`}>
                      {quiz.result.percentage?.toFixed(1)}%
                    </span>
                  </div>
                )}

                <div className="mt-auto">
                  {/* Action Button */}
                  {quiz.status === 'upcoming' ? (
                    <div className="w-full text-center py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium flex items-center justify-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      يبدأ {formatDistanceToNow(new Date(quiz.startDate), { addSuffix: true, locale: ar })}
                    </div>
                  ) : quiz.status === 'ended' ? (
                    <div className="space-y-2.5">
                      <div className="w-full text-center py-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium flex items-center justify-center gap-2">
                        <XCircleIcon className="w-4 h-4" />
                        انتهى الموعد
                      </div>
                      {quiz.result && quiz.showResults && (
                        <button
                          onClick={() => router.push(`/trainee-dashboard/quizzes/${quiz.id}/result/${quiz.result.id}`)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all duration-150"
                        >
                          <EyeIcon className="w-4 h-4" />
                          عرض النتيجة
                        </button>
                      )}
                    </div>
                  ) : quiz.status === 'completed' ? (
                    <div className="space-y-2.5">
                      <div className="w-full text-center py-2.5 bg-teal-50 rounded-lg border border-teal-200 text-teal-700 text-sm font-medium flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-4 h-4" />
                        تم إنهاء الاختبار
                      </div>
                      {quiz.showResults && quiz.result && (
                        <button
                          onClick={() => router.push(`/trainee-dashboard/quizzes/${quiz.id}/result/${quiz.result.id}`)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all duration-150"
                        >
                          <EyeIcon className="w-4 h-4" />
                          عرض النتيجة
                        </button>
                      )}
                    </div>
                  ) : quiz.canAttempt ? (
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                      {quiz.hasInProgress ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4" />
                          استئناف الاختبار
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          بدء الاختبار
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
