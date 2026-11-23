'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAvailableQuizzes, AvailableQuiz, createQuizAccessRequest } from '@/lib/quizzes-api';
import { getSystemSettings } from '@/lib/settings-cache';
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
  LockClosedIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

function formatQuizDateInTimezone(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

export default function TraineeQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<AvailableQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'ended' | 'locked'>('all');
  const [systemTimezone, setSystemTimezone] = useState('Africa/Cairo');
  const [requestReasons, setRequestReasons] = useState<Record<number, string>>({});

  useEffect(() => {
    loadQuizzes();
    getSystemSettings().then(settings => setSystemTimezone(settings.timezone || 'Africa/Cairo')).catch(() => {});
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
      if (filter === 'locked') return quiz.status !== 'completed' && ((quiz.feeRequirement?.required === true && !(quiz.feeRequirement.isAccessAllowed ?? quiz.feeRequirement.isPaid)) || quiz.isMobileOnly === true || quiz.integrityBlocked === true || quiz.paymentActionBlocked === true);
      if (filter === 'available') return quiz.status === 'available' && quiz.canAttempt;
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

  const submitAccessRequest = async (quizId: number, requestType: 'INTEGRITY_REVIEW' | 'MISSED_EXAM') => {
    const reason = requestReasons[quizId]?.trim() || '';
    if (reason.length < 10) {
      toast.error('اكتب تفاصيل الطلب (10 أحرف على الأقل)');
      return;
    }
    try {
      await createQuizAccessRequest({ quizId, requestType, reason });
      toast.success('تم إرسال الطلب للمراجعة');
      setRequestReasons(current => ({ ...current, [quizId]: '' }));
      await loadQuizzes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال الطلب');
    }
  };

  const stats = {
    total: quizzes.length,
    available: quizzes.filter(q => q.status === 'available' && q.canAttempt).length,
    locked: quizzes.filter(q => q.status !== 'completed' && ((q.feeRequirement?.required === true && !(q.feeRequirement.isAccessAllowed ?? q.feeRequirement.isPaid)) || q.isMobileOnly === true || q.integrityBlocked === true || q.paymentActionBlocked === true)).length,
    completed: quizzes.filter(q => q.status === 'completed').length,
    upcoming: quizzes.filter(q => q.status === 'upcoming').length,
  };

  return (
    <div className="trainee-quizzes-page space-y-6 sm:space-y-8 max-w-7xl mx-auto">
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
            { value: 'available', label: 'متاح الآن', count: stats.available },
            { value: 'upcoming', label: 'قريباً', count: quizzes.filter(q => q.status === 'upcoming').length },
            { value: 'ended', label: 'منتهي', count: quizzes.filter(q => q.status === 'ended').length },
            { value: 'locked', label: 'مقفل لعدم السداد', count: stats.locked },
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
            {filter === 'all' ? 'لا توجد اختبارات' : `لا توجد اختبارات ${filter === 'locked' ? 'مقفلة بسبب عدم سداد الرسم' : filter === 'available' ? 'متاحة' : filter === 'upcoming' ? 'قريبة' : 'منتهية'}`}
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
            const isFeeLocked = quiz.status !== 'completed' && quiz.feeRequirement?.required === true && !(quiz.feeRequirement.isAccessAllowed ?? quiz.feeRequirement.isPaid);
            const isMobileLocked = quiz.status !== 'completed' && quiz.isMobileOnly === true;
            const isIntegrityBlocked = quiz.status !== 'completed' && quiz.integrityBlocked === true;
            const isPaymentActionBlocked = quiz.status !== 'completed' && quiz.paymentActionBlocked === true;
            const badge = isIntegrityBlocked
              ? { label: 'موقوفة للمراجعة', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: LockClosedIcon }
              : isPaymentActionBlocked
              ? { label: 'موقوفة لعدم السداد', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: LockClosedIcon }
              : isMobileLocked
              ? { label: 'متاح عبر تطبيق الهاتف', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', icon: DevicePhoneMobileIcon }
              : isFeeLocked
              ? { label: 'مقفل حتى السداد', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: LockClosedIcon }
              : getStatusBadge(quiz.status);
            const BadgeIcon = badge.icon;
            const iconGradient = isIntegrityBlocked ? 'from-rose-500 to-red-600' : isPaymentActionBlocked || isFeeLocked ? 'from-amber-500 to-orange-600' : isMobileLocked ? 'from-indigo-500 to-violet-600' : getIconGradient(quiz.status);
            const requiredFees = quiz.feesRequiredToUnlock || [];
            const feePaymentNotice = isPaymentActionBlocked || isFeeLocked ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
                <div className="flex items-center justify-center gap-2 text-sm font-bold"><LockClosedIcon className="h-4 w-4" /> لا يمكن أداء الاختبار قبل سداد الرسوم المستحقة</div>
                {requiredFees.length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {requiredFees.map((fee) => (
                      <li key={fee.feeId} className="flex items-start justify-between gap-3 rounded-md bg-white/70 px-2.5 py-2">
                        <span>{fee.feeName}</span>
                        <span className="shrink-0 font-semibold">المتبقي: {fee.remainingAmount.toLocaleString('ar-EG')} ج.م</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-xs">{isPaymentActionBlocked
                    ? quiz.paymentBlockMessage || 'تعذر تحديد الرسوم المستحقة؛ يرجى مراجعة شؤون المتدربين.'
                    : `الرسم: ${quiz.feeRequirement?.feeName || 'الرسم المحدد'} · المتبقي: ${(quiz.feeRequirement?.remainingAmount || 0).toLocaleString('ar-EG')} ج.م`}</p>
                )}
              </div>
            ) : null;
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
                  {quiz.feeRequirement?.exceptionDeadline && !isFeeLocked && <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">استثناء السداد حتى {new Date(quiz.feeRequirement.exceptionDeadline).toLocaleDateString('ar-EG')}</span>}
                </div>

                {/* Date Info */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">يبدأ في</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      {formatQuizDateInTimezone(quiz.startDate, systemTimezone)}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">ينتهي في</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      {formatQuizDateInTimezone(quiz.endDate, systemTimezone)}
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
                  {quiz.accessRequest && quiz.accessRequest.status !== 'REJECTED' && <div className={`quiz-access-request-status mb-3 rounded-lg border p-3 text-xs ${quiz.accessRequest.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                    <p className="font-bold">{quiz.accessRequest.status === 'PENDING' ? 'طلبك قيد المراجعة' : 'تمت الموافقة على طلبك'}</p>
                    {quiz.accessRequest.status === 'APPROVED' && quiz.accessRequest.scheduledStartAt && <p className="mt-1">موعد الاستكمال: {new Date(quiz.accessRequest.scheduledStartAt).toLocaleString('ar-EG')} إلى {quiz.accessRequest.scheduledEndAt ? new Date(quiz.accessRequest.scheduledEndAt).toLocaleString('ar-EG') : ''}</p>}
                  </div>}
                  {/* Action Button */}
                  {isIntegrityBlocked ? (
                    <>
                      <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-rose-900">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold"><LockClosedIcon className="h-4 w-4" /> أُوقفت المحاولة بعد {quiz.tabDepartureCount} مغادرات</div>
                        {quiz.accessRequest?.status === 'PENDING' ? <p className="text-center text-xs">طلب المراجعة قيد النظر.</p> : <>
                          {quiz.accessRequest?.status === 'REJECTED' && <p className="text-center text-xs">رُفض الطلب السابق: {quiz.accessRequest.reviewNotes || 'يمكنك تقديم طلب جديد بتفاصيل إضافية.'}</p>}
                          <textarea value={requestReasons[quiz.id] || ''} onChange={event => setRequestReasons(current => ({ ...current, [quiz.id]: event.target.value }))} placeholder="اكتب سبب طلب مراجعة إيقاف المحاولة..." rows={2} className="w-full rounded-md border border-rose-200 bg-white p-2 text-xs" />
                          <button onClick={() => submitAccessRequest(quiz.id, 'INTEGRITY_REVIEW')} className="w-full rounded-md bg-rose-700 px-3 py-2 text-xs font-bold text-white">طلب مراجعة واستكمال الاختبار</button>
                        </>}
                      </div>
                      {feePaymentNotice}
                    </>
                  ) : feePaymentNotice ? (
                    feePaymentNotice
                  ) : isMobileLocked ? (
                    <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-indigo-900">
                      <div className="flex items-center justify-center gap-2 text-sm font-bold"><LockClosedIcon className="h-4 w-4" /> هذا الاختبار متاح عبر تطبيق الهاتف فقط</div>
                      <p className="text-center text-xs">{quiz.mobileApp?.enabled ? 'حمّل التطبيق لأداء الاختبار. لا يمكن الدخول إليه من نسخة الويب.' : 'تطبيق الهاتف غير متاح حالياً. لا يمكن أداء هذا الاختبار من نسخة الويب.'}</p>
                      {quiz.mobileApp?.enabled && <div className="flex flex-wrap justify-center gap-3 pt-1 text-xs font-semibold">{quiz.mobileApp.googlePlayUrl && <a className="underline" href={quiz.mobileApp.googlePlayUrl} target="_blank" rel="noopener noreferrer">تحميل Android · Google Play</a>}{quiz.mobileApp.appStoreUrl && <a className="underline" href={quiz.mobileApp.appStoreUrl} target="_blank" rel="noopener noreferrer">تحميل iPhone · App Store</a>}</div>}
                    </div>
                  ) : quiz.status === 'upcoming' ? (
                    <div className="w-full text-center py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium flex items-center justify-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      يبدأ {formatDistanceToNow(new Date(quiz.accessRequest?.status === 'APPROVED' && quiz.accessRequest.scheduledStartAt ? quiz.accessRequest.scheduledStartAt : quiz.startDate), { addSuffix: true, locale: ar })}
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
                      {quiz.accessRequest && <div className={`quiz-access-request-status rounded-lg border p-3 text-xs ${quiz.accessRequest.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : quiz.accessRequest.status === 'REJECTED' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                        {quiz.accessRequest.status === 'PENDING' ? 'طلب أداء الاختبار الفائت قيد المراجعة.' : quiz.accessRequest.status === 'REJECTED' ? `رُفض طلبك: ${quiz.accessRequest.reviewNotes || 'راجع الإدارة.'}` : `تمت الموافقة. موعدك من ${quiz.accessRequest.scheduledStartAt ? new Date(quiz.accessRequest.scheduledStartAt).toLocaleString('ar-EG') : ''} إلى ${quiz.accessRequest.scheduledEndAt ? new Date(quiz.accessRequest.scheduledEndAt).toLocaleString('ar-EG') : ''}.`}
                      </div>}
                      {quiz.missedExamRequestEligible && quiz.accessRequest?.status !== 'PENDING' && quiz.accessRequest?.status !== 'APPROVED' && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-center text-xs font-semibold text-amber-900">فاتك موعد الاختبار؟ يمكنك إرسال طلب مع توضيح السبب.</p>
                        <textarea value={requestReasons[quiz.id] || ''} onChange={event => setRequestReasons(current => ({ ...current, [quiz.id]: event.target.value }))} placeholder="اشرح سبب عدم أداء الاختبار..." rows={2} className="w-full rounded-md border border-amber-200 bg-white p-2 text-xs" />
                        <button onClick={() => submitAccessRequest(quiz.id, 'MISSED_EXAM')} className="w-full rounded-md bg-amber-700 px-3 py-2 text-xs font-bold text-white">طلب موعد بديل</button>
                      </div>}
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
