'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { usePermissions } from '@/hooks/usePermissions';
import {
  CalendarDaysIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PrinterIcon,
  BookOpenIcon,
  UserIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';

interface ScheduledSession {
  id: number;
  date: string;
  isCancelled: boolean;
  scheduleSlotId: number;
  scheduleSlot: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    type: string;
    location?: string;
    distributionRoom?: {
      roomName: string;
    };
  };
  _count: {
    attendance: number;
  };
}

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  instructor: {
    name: string;
  };
  classroom: {
    id: number;
    name: string;
  };
  program: {
    id: number;
    nameAr: string;
  };
}

const DAYS_AR: { [key: string]: string } = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

export default function ContentSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const classroomId = params.classroomId as string;
  const contentId = params.contentId as string;
  const { hasPermission } = usePermissions();

  const [content, setContent] = useState<TrainingContent | null>(null);
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    loadData();
  }, [contentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب تفاصيل المادة
      const contentData = await fetchAPI(`/training-contents/${contentId}`);
      setContent(contentData);

      // جلب الحصص من الجدول
      const slots = await fetchAPI(`/schedule/classroom/${classroomId}`);
      
      // تصفية الحصص الخاصة بهذه المادة فقط
      const contentSlots = slots.filter((slot: any) => slot.content.id === parseInt(contentId));
      
      // جلب المحاضرات لكل حصة
      const allSessions: ScheduledSession[] = [];
      for (const slot of contentSlots) {
        const slotSessions = await fetchAPI(`/schedule/slots/${slot.id}/sessions`);
        allSessions.push(...slotSessions);
      }

      // ترتيب من الأقدم للأحدث
      allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();
    
    if (filter === 'upcoming') {
      return sessions.filter(s => !s.isCancelled && new Date(s.date) > now);
    } else if (filter === 'past') {
      return sessions.filter(s => new Date(s.date) <= now);
    }
    return sessions;
  };

  const filteredSessions = getFilteredSessions();

  const filterTabs = [
    { key: 'all' as const, label: 'الكل', count: sessions.length },
    { key: 'upcoming' as const, label: 'القادمة', count: sessions.filter(s => !s.isCancelled && new Date(s.date) > new Date()).length },
    { key: 'past' as const, label: 'السابقة', count: sessions.filter(s => new Date(s.date) <= new Date()).length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="..." description="جاري التحميل..." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }, { label: '...' }]} />
        {/* Info skeleton */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (<div key={i}><div className="h-3 bg-slate-100 rounded w-20 mb-2" /><div className="h-4 bg-slate-200 rounded w-32" /></div>))}
          </div>
        </div>
        {/* Sessions skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3"><div className="h-5 bg-slate-200 rounded-full w-24" /><div className="h-5 bg-slate-100 rounded-full w-16" /></div>
              <div className="flex items-center gap-6"><div className="h-4 bg-slate-100 rounded w-40" /><div className="h-4 bg-slate-100 rounded w-28" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="space-y-6">
        <PageHeader title="المادة غير موجودة" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }]} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><BookOpenIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-3">المادة غير موجودة</h3>
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/attendance/${programId}/${classroomId}`)} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>العودة للمواد</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={content.name}
          description="اختر المحاضرة لتسجيل الحضور والغياب"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور', href: '/dashboard/attendance' },
            { label: content.program.nameAr, href: `/dashboard/attendance/${programId}` },
            { label: content.classroom.name, href: `/dashboard/attendance/${programId}/${classroomId}` },
            { label: content.name }
          ]}
        />

        {/* Content Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-violet-500">
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0"><AcademicCapIcon className="w-[18px] h-[18px] text-violet-600" /></div>
                <div><p className="text-[11px] text-slate-500">كود المادة</p><p className="text-sm font-bold text-slate-900">{content.code}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><UserIcon className="w-[18px] h-[18px] text-blue-600" /></div>
                <div><p className="text-[11px] text-slate-500">المحاضر</p><p className="text-sm font-bold text-slate-900">{content.instructor.name}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0"><CalendarDaysIcon className="w-[18px] h-[18px] text-emerald-600" /></div>
                <div><p className="text-[11px] text-slate-500">عدد المحاضرات</p><p className="text-sm font-bold text-slate-900">{sessions.length} محاضرة</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-3">
            <div className="flex gap-1.5 flex-wrap">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    filter === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label} <span className={`mr-1 ${filter === tab.key ? 'text-blue-100' : 'text-slate-400'}`}>({tab.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarDaysIcon className="w-7 h-7 text-slate-400" /></div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد محاضرات</h3>
              <p className="text-sm text-slate-500">لا توجد محاضرات {filter === 'upcoming' ? 'قادمة' : filter === 'past' ? 'سابقة' : ''}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const sessionDate = new Date(session.date);
              const now = new Date();
              const isPast = sessionDate <= now;
              
              // المحاضرات الملغاة لا يمكن الوصول إليها
              let canAccess = false;
              let lockReason = '';
              let canAccessPast = hasPermission('dashboard.attendance', 'record_past');
              
              if (session.isCancelled) {
                canAccess = false;
                lockReason = 'cancelled';
              } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const sessionDateOnly = new Date(sessionDate);
                sessionDateOnly.setHours(0, 0, 0, 0);
                
                if (sessionDateOnly.getTime() !== today.getTime()) {
                  if (sessionDateOnly > today) {
                    canAccess = false;
                    lockReason = 'future';
                  } else {
                    if (canAccessPast) {
                      canAccess = true;
                      lockReason = 'past_allowed';
                    } else {
                      canAccess = false;
                      lockReason = 'past';
                    }
                  }
                } else {
                  canAccess = true;
                }
              }
              
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all ${
                    session.isCancelled ? 'opacity-50' : ''
                  } ${!canAccess ? 'opacity-50' : 'hover:shadow-md cursor-pointer'}`}
                  onClick={() => {
                    if (lockReason === 'cancelled') {
                      toast.error('لا يمكن تسجيل حضور محاضرة ملغاة', { duration: 3000 });
                    } else if (lockReason === 'future') {
                      toast.error('لا يمكن تسجيل الحضور إلا في يوم المحاضرة', { duration: 3000 });
                    } else if (lockReason === 'past') {
                      toast.error('انتهى موعد تسجيل الحضور لهذه المحاضرة', { duration: 3000 });
                    } else if (lockReason === 'past_allowed') {
                      router.push(`/dashboard/attendance/session/${session.id}`);
                    } else if (lockReason === 'previous') {
                      toast.error('يجب تسجيل حضور جميع المحاضرات السابقة أولاً', { duration: 4000 });
                    } else if (canAccess) {
                      router.push(`/dashboard/attendance/session/${session.id}`);
                    }
                  }}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {lockReason === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
                              <XCircleIcon className="w-3.5 h-3.5" />
                              محاضرة ملغاة
                            </span>
                          )}
                          
                          {lockReason === 'future' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                              <ClockIcon className="w-3.5 h-3.5" />
                              لم يحن موعدها - يوم {sessionDate.toLocaleDateString('ar-EG')}
                            </span>
                          )}
                          
                          {lockReason === 'past' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold">
                              <ExclamationCircleIcon className="w-3.5 h-3.5" />
                              انتهى موعد التسجيل - كان يوم {sessionDate.toLocaleDateString('ar-EG')}
                            </span>
                          )}
                          
                          {lockReason === 'past_allowed' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold">
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                              يمكن تسجيل الحضور - كان يوم {sessionDate.toLocaleDateString('ar-EG')}
                            </span>
                          )}
                          
                          {lockReason === 'previous' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold">
                              <LockClosedIcon className="w-3.5 h-3.5" />
                              مقفلة - يجب تسجيل السابقة أولاً
                            </span>
                          )}
                          
                          {canAccess && !session.isCancelled && (
                            <>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isPast
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {isPast ? '✓ مرت' : '⏰ قادمة'}
                              </span>

                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                session.scheduleSlot.type === 'THEORY'
                                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {session.scheduleSlot.type === 'THEORY' ? '📖 نظري' : '🔬 عملي'}
                              </span>

                              {session.scheduleSlot.distributionRoom && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-bold">
                                  👥 {session.scheduleSlot.distributionRoom.roomName}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-5 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">
                              {DAYS_AR[session.scheduleSlot.dayOfWeek]} - {sessionDate.toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-4 h-4 text-blue-500" />
                            <span>
                              {session.scheduleSlot.startTime} - {session.scheduleSlot.endTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Status and Print Button */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          {(session._count?.attendance || 0) > 0 ? (
                            <>
                              <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                              <div className="text-center">
                                <p className="text-sm font-bold text-slate-900">{session._count?.attendance || 0}</p>
                                <p className="text-[10px] text-slate-500">سجل</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <ExclamationCircleIcon className="w-6 h-6 text-amber-500" />
                              <div className="text-center">
                                <p className="text-xs font-bold text-amber-600">لم يُسجل</p>
                                <p className="text-[10px] text-slate-500">الحضور</p>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {(session._count?.attendance || 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/print/session-attendance/${session.id}`, '_blank');
                            }}
                            leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}
                          >
                            <span className="hidden sm:inline">طباعة</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

