'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';
import { reviewQuizAccessRequest } from '@/lib/quizzes-api';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserMinusIcon,
  UsersIcon,
  XMarkIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type AttemptEvent = { id: number; platform: string; details?: string | null; occurredAt: string };
type Attempt = {
  id: string;
  status: string;
  tabDepartureCount?: number;
  integrityBlockedAt?: string | null;
  integrityBlockReason?: string | null;
  trainee: { id: number; nameAr: string; nationalId: string };
  integrityEvents?: AttemptEvent[];
};
type AccessRequest = {
  id: number;
  requestType: 'INTEGRITY_REVIEW' | 'MISSED_EXAM';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string | null;
  createdAt: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  trainee: { id: number; nameAr: string; nationalId: string; phone?: string };
  attempt?: {
    id: string;
    tabDepartureCount: number;
    integrityBlockReason?: string | null;
    integrityEvents: AttemptEvent[];
  } | null;
};
type IntegrityReport = {
  quiz: { id: number; title: string; trainingContent: { name: string; code: string } };
  attempts: Attempt[];
  accessRequests: AccessRequest[];
};
type ReviewFields = { start: string; end: string; notes: string };
type FilterKey = 'all' | 'attempts' | 'integrity' | 'absence';

export default function QuizIntegrityPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedPage requiredPermission={{ resource: 'dashboard.quizzes', action: 'view' }}><QuizIntegrityContent params={params} /></ProtectedPage>;
}

function QuizIntegrityContent({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  const router = useRouter();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [reviewFields, setReviewFields] = useState<Record<number, ReviewFields>>({});

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setReport(await fetchAPI(`/quizzes/${resolved.id}/report`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات الاختبار');
    } finally {
      setLoading(false);
    }
  }, [resolved.id]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const handleReview = async (requestId: number, decision: 'APPROVED' | 'REJECTED') => {
    const fields = reviewFields[requestId] || { start: '', end: '', notes: '' };
    if (decision === 'APPROVED' && (!fields.start || !fields.end)) {
      toast.error('يرجى تحديد بداية الموعد ونهايته');
      return;
    }
    try {
      await reviewQuizAccessRequest(requestId, {
        decision,
        reviewNotes: fields.notes,
        scheduledStartAt: fields.start ? new Date(fields.start).toISOString() : undefined,
        scheduledEndAt: fields.end ? new Date(fields.end).toISOString() : undefined,
      });
      toast.success(decision === 'APPROVED' ? 'تمت الموافقة وتحديد موعد الأداء' : 'تم رفض الطلب');
      await loadReport();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذرت مراجعة الطلب');
    }
  };

  if (loading) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200" /><div className="h-32 animate-pulse rounded-xl bg-slate-100" /><div className="h-56 animate-pulse rounded-xl bg-slate-100" /></div>;
  if (!report) return <div className="py-12 text-center text-slate-500">لم يتم العثور على بيانات الاختبار.</div>;

  const searchTerm = search.trim().toLocaleLowerCase('ar');
  const matchesSearch = (...values: (string | number | null | undefined)[]) => !searchTerm || values.some(value => String(value ?? '').toLocaleLowerCase('ar').includes(searchTerm));
  const latestEventTime = (attempt: Attempt) => Math.max(0, ...(attempt.integrityEvents || []).map(event => new Date(event.occurredAt).getTime()));
  const suspiciousAttempts = report.attempts
    .filter(attempt => attempt.integrityBlockedAt || (attempt.tabDepartureCount || 0) > 0)
    .filter(attempt => matchesSearch(attempt.trainee.nameAr, attempt.trainee.nationalId, attempt.integrityBlockReason, attempt.tabDepartureCount))
    .sort((a, b) => Number(!!b.integrityBlockedAt) - Number(!!a.integrityBlockedAt)
      || (b.tabDepartureCount || 0) - (a.tabDepartureCount || 0)
      || latestEventTime(b) - latestEventTime(a)
      || a.trainee.nameAr.localeCompare(b.trainee.nameAr, 'ar'));
  const integrityRequests = report.accessRequests
    .filter(request => request.requestType === 'INTEGRITY_REVIEW')
    .filter(request => matchesSearch(request.trainee.nameAr, request.trainee.nationalId, request.trainee.phone, request.reason, request.reviewNotes))
    .sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const absenceRequests = report.accessRequests
    .filter(request => request.requestType === 'MISSED_EXAM')
    .filter(request => matchesSearch(request.trainee.nameAr, request.trainee.nationalId, request.trainee.phone, request.reason, request.reviewNotes))
    .sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingCount = report.accessRequests.filter(request => request.status === 'PENDING').length;
  const showAttempts = filter === 'all' || filter === 'attempts';
  const showIntegrityRequests = filter === 'all' || filter === 'integrity';
  const showAbsenceRequests = filter === 'all' || filter === 'absence';

  const eventDescription = (event: AttemptEvent) => {
    if (event.platform === 'MOBILE') return 'انتقل تطبيق الهاتف إلى الخلفية أو غادره المتدرب.';
    if (event.details === 'pagehide') return 'غادر المتدرب صفحة الاختبار أو أغلقها.';
    if (event.details === 'visibilitychange:hidden') return 'انتقل المتصفح إلى صفحة أو تبويب آخر.';
    return 'رصد النظام خروجًا من شاشة الاختبار.';
  };

  const statusBadge = (status: AccessRequest['status']) => status === 'PENDING'
    ? { label: 'بانتظار المراجعة', style: 'bg-amber-100 text-amber-800', icon: ClockIcon }
    : status === 'APPROVED'
      ? { label: 'تمت الموافقة', style: 'bg-emerald-100 text-emerald-800', icon: CheckCircleIcon }
      : { label: 'تم الرفض', style: 'bg-rose-100 text-rose-800', icon: XCircleIcon };

  const renderRequestCard = (request: AccessRequest) => {
    const fields = reviewFields[request.id] || { start: '', end: '', notes: '' };
    const badge = statusBadge(request.status);
    const StatusIcon = badge.icon;
    return <article key={request.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{request.trainee.nameAr}</h3>
          <p className="mt-1 text-xs text-slate-500">الرقم الوطني: {request.trainee.nationalId}{request.trainee.phone ? ` · الهاتف: ${request.trainee.phone}` : ''}</p>
          <p className="mt-1 text-xs text-slate-500">تاريخ تقديم الطلب: {format(new Date(request.createdAt), 'dd/MM/yyyy - hh:mm a', { locale: ar })}</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${badge.style}`}><StatusIcon className="h-4 w-4" />{badge.label}</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-1 text-xs font-bold text-slate-500">تفاصيل الطلب</p>
          <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-800">{request.reason}</p>
        </div>

        {request.attempt && <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold text-rose-900">سجل الخروج من شاشة الاختبار</p><p className="mt-1 text-xs text-rose-800">مرات الخروج المرصودة: {request.attempt.tabDepartureCount}{request.attempt.integrityBlockReason ? ` · سبب الإيقاف: ${request.attempt.integrityBlockReason}` : ''}</p></div>
            <Button size="sm" variant="outline" leftIcon={<EyeIcon className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${resolved.id}/attempts/${request.attempt?.id}`)}>عرض إجابات المحاولة</Button>
          </div>
        <ul className="mt-3 space-y-2">{[...(request.attempt.integrityEvents || [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).map(event => <li key={event.id} className="rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-700">
            <span className="font-semibold">{format(new Date(event.occurredAt), 'dd/MM/yyyy - hh:mm:ss a', { locale: ar })}</span><span className="mx-1.5 text-slate-400">·</span>{eventDescription(event)}
          </li>)}</ul>
        </div>}

        {request.status === 'PENDING' ? <>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 sm:p-4">
            <p className="mb-3 text-sm font-bold text-indigo-900">عند الموافقة، حدد الفترة التي يمكن للمتدرب أداء الاختبار خلالها</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">بداية موعد الأداء<input type="datetime-local" lang="ar-EG" value={fields.start} onChange={event => setReviewFields(current => ({ ...current, [request.id]: { ...fields, start: event.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">نهاية موعد الأداء<input type="datetime-local" lang="ar-EG" value={fields.end} onChange={event => setReviewFields(current => ({ ...current, [request.id]: { ...fields, end: event.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-700">ملاحظات القرار<textarea value={fields.notes} onChange={event => setReviewFields(current => ({ ...current, [request.id]: { ...fields, notes: event.target.value } }))} placeholder="اكتب ملاحظة توضح القرار للمتدرب" rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal" /></label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => handleReview(request.id, 'REJECTED')}>رفض الطلب</Button><Button onClick={() => handleReview(request.id, 'APPROVED')}>موافقة وتحديد الموعد</Button></div>
        </> : <div className={`rounded-xl p-3 text-sm ${request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
          {request.reviewNotes && <p>{request.reviewNotes}</p>}
          {request.status === 'APPROVED' && request.scheduledStartAt && <p className="mt-1 font-semibold">موعد الأداء: {format(new Date(request.scheduledStartAt), 'dd/MM/yyyy - hh:mm a', { locale: ar })}{request.scheduledEndAt ? ` حتى ${format(new Date(request.scheduledEndAt), 'dd/MM/yyyy - hh:mm a', { locale: ar })}` : ''}</p>}
          {request.status === 'REJECTED' && !request.reviewNotes && <p>لم تُضف ملاحظات على قرار الرفض.</p>}
        </div>}
      </div>
    </article>;
  };

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'كل السجلات', count: suspiciousAttempts.length + report.accessRequests.length },
    { key: 'attempts', label: 'حالات الخروج المرصودة', count: suspiciousAttempts.length },
    { key: 'integrity', label: 'طلبات استكمال الاختبار', count: integrityRequests.length },
    { key: 'absence', label: 'طلبات الاختبار البديل', count: absenceRequests.length },
  ];

  return <div className="mx-auto max-w-6xl space-y-5">
    <PageHeader
      title="مراجعة محاولات الاختبار وطلباته"
      description={`${report.quiz.title} · ${report.quiz.trainingContent.code} - ${report.quiz.trainingContent.name}`}
      breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الاختبارات الإلكترونية', href: '/dashboard/quizzes' }, { label: 'تقرير الاختبار', href: `/dashboard/quizzes/${resolved.id}/report` }, { label: 'مراجعة المحاولات والطلبات' }]}
      actions={<Button variant="outline" onClick={() => router.push(`/dashboard/quizzes/${resolved.id}/report`)} leftIcon={<ArrowRightIcon className="h-4 w-4" />}>العودة إلى التقرير</Button>}
    />

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"><div className="rounded-xl bg-rose-50 p-2.5"><ExclamationTriangleIcon className="h-5 w-5 text-rose-600" /></div><div><p className="text-xs text-slate-500">حالات رُصد فيها خروج من الاختبار</p><p className="text-xl font-black text-slate-900">{suspiciousAttempts.length}</p></div></div>
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"><div className="rounded-xl bg-indigo-50 p-2.5"><UsersIcon className="h-5 w-5 text-indigo-600" /></div><div><p className="text-xs text-slate-500">طلبات استكمال اختبار موقوف</p><p className="text-xl font-black text-slate-900">{integrityRequests.length}</p></div></div>
      <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><div className="rounded-xl bg-amber-50 p-2.5"><UserMinusIcon className="h-5 w-5 text-amber-600" /></div><div><p className="text-xs text-slate-500">طلبات اختبار بديل للمتغيبين</p><p className="text-xl font-black text-slate-900">{absenceRequests.length}</p></div></div>
    </div>

    <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <MagnifyingGlassIcon className="pointer-events-none absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="ابحث باسم المتدرب أو الرقم الوطني أو الهاتف أو تفاصيل الطلب"
        aria-label="البحث في المحاولات والطلبات"
        className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-12 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
      />
      {search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث" className="absolute left-6 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XMarkIcon className="h-4 w-4" /></button>}
      {searchTerm && <p className="mt-2 px-1 text-xs text-slate-500">تُعرض النتائج المطابقة لعبارة البحث في المحاولات والطلبات.</p>}
    </div>

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {filters.map(item => <button key={item.key} onClick={() => setFilter(item.key)} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${filter === item.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}<span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] ${filter === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.count}</span></button>)}
    </div>

    {showAttempts && <section className="space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">حالات رُصد فيها خروج من شاشة الاختبار</h2><p className="mt-1 text-sm text-slate-500">راجع أوقات الخروج والجهاز المستخدم لكل محاولة.</p></div></div>
      {suspiciousAttempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{searchTerm ? 'لا توجد محاولات مطابقة لعبارة البحث.' : 'لا توجد حالات خروج مسجلة لهذا الاختبار.'}</div> : suspiciousAttempts.map(attempt => <article key={attempt.id} className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${attempt.integrityBlockedAt ? 'border-rose-200' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-bold text-slate-900">{attempt.trainee.nameAr}</h3><p className="mt-1 text-xs text-slate-500">الرقم الوطني: {attempt.trainee.nationalId} · مرات الخروج المرصودة: {attempt.tabDepartureCount || 0}</p>{attempt.integrityBlockReason && <p className="mt-1 text-xs font-semibold text-rose-700">{attempt.integrityBlockReason}</p>}</div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${attempt.integrityBlockedAt ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{attempt.integrityBlockedAt ? 'المحاولة موقوفة' : 'خروج مرصود'}</span><Button size="sm" variant="outline" leftIcon={<EyeIcon className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/quizzes/${resolved.id}/attempts/${attempt.id}`)}>تفاصيل المحاولة</Button></div>
        </div>
        <ul className="mt-4 space-y-2">{[...(attempt.integrityEvents || [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).map(event => <li key={event.id} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>{eventDescription(event)}</span><span className="shrink-0 text-slate-500">{format(new Date(event.occurredAt), 'dd/MM/yyyy - hh:mm:ss a', { locale: ar })}</span></li>)}</ul>
      </article>)}
    </section>}

    {showIntegrityRequests && <section className="space-y-3">
      <div><h2 className="text-lg font-black text-slate-900">طلبات استكمال الاختبارات الموقوفة</h2><p className="mt-1 text-sm text-slate-500">راجع سبب الطلب وسجل الخروج، ثم حدد موعدًا عند الموافقة.</p></div>
      {integrityRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{searchTerm ? 'لا توجد طلبات مراجعة مطابقة لعبارة البحث.' : 'لا توجد طلبات مراجعة للمحاولات.'}</div> : integrityRequests.map(renderRequestCard)}
    </section>}

    {showAbsenceRequests && <section className="space-y-3">
      <div><h2 className="text-lg font-black text-slate-900">طلبات أداء اختبار بديل بسبب الغياب</h2><p className="mt-1 text-sm text-slate-500">راجع سبب الغياب، ثم حدد موعدًا بديلًا عند الموافقة.</p></div>
      {absenceRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{searchTerm ? 'لا توجد طلبات متغيبين مطابقة لعبارة البحث.' : 'لا توجد طلبات من متغيبين عن الاختبار.'}</div> : absenceRequests.map(renderRequestCard)}
    </section>}

    {pendingCount > 0 && <p className="pb-2 text-center text-xs text-slate-500">يوجد {pendingCount} طلب بانتظار المراجعة.</p>}
  </div>;
}
