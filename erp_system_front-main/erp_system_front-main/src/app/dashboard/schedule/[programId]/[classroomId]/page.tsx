'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { TibaSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  BookOpenIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  BoltIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  getScheduleByClassroom,
  createScheduleSlot,
  deleteScheduleSlot,
  getSessionsBySlot,
  cancelSession,
  regenerateSessions,
  getDistributionRooms,
  type ScheduleSlot,
  type ScheduledSession,
  type CreateScheduleSlotDto,
  type DistributionRoom,
} from '@/lib/schedule-api';

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate?: string;
  endDate?: string;
  program: {
    id: number;
    nameAr: string;
  };
}

interface TrainingContent {
  id: number;
  code: string;
  name: string;
}

const DAYS_AR = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

const DAYS_ORDER = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function ClassroomSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const classroomId = params.classroomId as string;
  const programId = params.programId as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [allSessions, setAllSessions] = useState<ScheduledSession[]>([]);
  const [trainingContents, setTrainingContents] = useState<TrainingContent[]>([]);
  const [availableRooms, setAvailableRooms] = useState<DistributionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);
  const [confirmCancelModal, setConfirmCancelModal] = useState<{
    show: boolean;
    sessionId: number | null;
    slotId: number | null;
    isCancelled: boolean;
    date: string;
  }>({
    show: false,
    sessionId: null,
    slotId: null,
    isCancelled: false,
    date: '',
  });
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<number | null>(null);

  const [formData, setFormData] = useState<CreateScheduleSlotDto>({
    contentId: 0,
    classroomId: 0,
    distributionRoomId: '',
    dayOfWeek: 'SUNDAY',
    startTime: '09:00',
    endTime: '11:00',
    type: 'THEORY',
    location: '',
  });

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classroomData = await fetchAPI(`/programs/classroom/${classroomId}`);
      setClassroom(classroomData);
      
      const [slotsData, contentsData] = await Promise.all([
        getScheduleByClassroom(parseInt(classroomId)),
        fetchAPI(`/training-contents?classroomId=${classroomId}`)
      ]);
      
      setScheduleSlots(slotsData || []);
      setTrainingContents(contentsData || []);

      if (slotsData && slotsData.length > 0) {
        const sessionsPromises = slotsData.map((slot: ScheduleSlot) => getSessionsBySlot(slot.id));
        const sessionsArrays = await Promise.all(sessionsPromises);
        setAllSessions(sessionsArrays.flat());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadDistributionRooms = async (contentId: number, type: 'THEORY' | 'PRACTICAL') => {
    try {
      const data = await getDistributionRooms(contentId, type);
      setAvailableRooms(data || []);
    } catch (error) {
      setAvailableRooms([]);
    }
  };

  const handleAddSlot = async () => {
    if (!formData.contentId) {
      toast.error('يرجى اختيار المادة');
      return;
    }

    try {
      await createScheduleSlot({
        ...formData,
        classroomId: parseInt(classroomId),
        distributionRoomId: formData.distributionRoomId || undefined,
      });
      toast.success('تم إضافة اليوم وتوليد المحاضرات!');
      setShowAddModal(false);
      loadData();
      setFormData({
        contentId: 0,
        classroomId: 0,
        distributionRoomId: '',
        dayOfWeek: 'SUNDAY',
        startTime: '09:00',
        endTime: '11:00',
        type: 'THEORY',
        location: '',
      });
    } catch (error: any) {
      toast.error(error.data?.message || 'فشل الإضافة');
    }
  };

  const handleDeleteSlot = async () => {
    if (!confirmDeleteSlotId) return;
    try {
      await deleteScheduleSlot(confirmDeleteSlotId);
      toast.success('تم الحذف');
      setConfirmDeleteSlotId(null);
      loadData();
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const handleToggleSession = async (sessionId: number, slotId: number) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Show confirmation modal
    setConfirmCancelModal({
      show: true,
      sessionId,
      slotId,
      isCancelled: !session.isCancelled,
      date: session.date,
    });
  };

  const confirmToggleSession = async () => {
    if (!confirmCancelModal.sessionId || !confirmCancelModal.slotId) return;
    
    try {
      await cancelSession(confirmCancelModal.sessionId, {
        isCancelled: confirmCancelModal.isCancelled,
        cancellationReason: confirmCancelModal.isCancelled && cancellationReason ? cancellationReason : undefined
      });
      toast.success(confirmCancelModal.isCancelled ? 'تم إلغاء المحاضرة' : 'تم تفعيل المحاضرة');
      loadData();
      setConfirmCancelModal({
        show: false,
        sessionId: null,
        slotId: null,
        isCancelled: false,
        date: '',
      });
      setCancellationReason('');
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

  const handleRegenerate = async (slotId: number) => {
    if (!confirm('إعادة توليد المحاضرات؟')) return;
    try {
      await regenerateSessions(slotId);
      toast.success('تم إعادة التوليد');
      loadData();
    } catch (error) {
      toast.error('فشل إعادة التوليد');
    }
  };

  const getNextSession = () => {
    const now = new Date();
    return allSessions
      .filter(s => !s.isCancelled && new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  };

  const nextSession = getNextSession();

  const slotsByDay = DAYS_ORDER.map(day => ({
    day,
    dayAr: DAYS_AR[day as keyof typeof DAYS_AR],
    slots: scheduleSlots.filter(s => s.dayOfWeek === day)
  })).filter(d => d.slots.length > 0);

  if (loading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader
            title="الجدول الدراسي"
            description="جاري التحميل..."
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
              { label: '...' },
            ]}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                  <div className="space-y-2 flex-1"><div className="h-4 w-24 bg-slate-200 rounded" /><div className="h-3 w-40 bg-slate-100 rounded" /></div>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-3">{[1, 2].map(j => <div key={j} className="h-20 bg-slate-50 rounded-lg border border-slate-100" />)}</div>
              </div>
            ))}
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (!classroom) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader
            title="الفصل غير موجود"
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
            ]}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">الفصل غير موجود</h3>
              <Link href={`/dashboard/schedule/${programId}`}>
                <Button variant="outline" className="mt-4">العودة للفصول</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={`${classroom.program.nameAr} - ${classroom.name}`}
          description="إدارة الجدول الدراسي والمحاضرات"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
            { label: classroom.program.nameAr, href: `/dashboard/schedule/${programId}` },
            { label: classroom.name },
          ]}
          actions={
            <Link href={`/dashboard/schedule/${programId}`}>
              <Button variant="outline" leftIcon={<ArrowRightIcon className="h-4 w-4" />}>
                العودة للفصول
              </Button>
            </Link>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Date range info */}
          {classroom.startDate && classroom.endDate && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  من: {new Date(classroom.startDate).toLocaleDateString('ar-EG')}
                </span>
                <div className="h-4 w-px bg-slate-200" />
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  إلى: {new Date(classroom.endDate).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          )}

          {/* Next session alert */}
          {nextSession && (
            <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-100 mb-0.5">المحاضرة القادمة</p>
                  <p className="text-sm font-bold text-white truncate">
                    {new Date(nextSession.date).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add button */}
          <div>
            <Button onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
              إضافة يوم حضور جديد
            </Button>
          </div>

          {/* Weekly schedule */}
          {slotsByDay.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDaysIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد أيام حضور</h3>
                <p className="text-sm text-slate-500 mb-5">ابدأ بإضافة أول يوم حضور لإنشاء الجدول</p>
                <Button onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                  إضافة يوم الآن
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {slotsByDay.map(({ day, dayAr, slots }) => (
                <div key={day} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  {/* Day header */}
                  <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{dayAr.substring(0, 2)}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{dayAr}</h3>
                      <p className="text-xs text-slate-400">{slots.length} حصة دراسية</p>
                    </div>
                  </div>

                  {/* Slots */}
                  <div className="divide-y divide-slate-100">
                    {slots.map(slot => {
                      const slotSessions = allSessions.filter(s => s.scheduleSlotId === slot.id);
                      const now = new Date();
                      const upcomingSessions = slotSessions.filter(s => !s.isCancelled && new Date(s.date) > now);
                      const pastSessions = slotSessions.filter(s => new Date(s.date) <= now);
                      const isExpanded = expandedSlotId === slot.id;

                      return (
                        <div key={slot.id} className="p-4">
                          {/* Slot info row */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <BookOpenIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-sm font-bold text-slate-900">{slot.content.name}</span>
                                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                  slot.type === 'THEORY'
                                    ? 'bg-violet-50 text-violet-700 border border-violet-100'
                                    : 'bg-orange-50 text-orange-700 border border-orange-100'
                                }`}>
                                  {slot.type === 'THEORY' ? 'نظري' : 'عملي'}
                                </span>
                                {(slot as any).distributionRoom && (
                                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {(slot as any).distributionRoom.roomName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5 text-blue-500" />
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {slot.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                                    {slot.location}
                                  </span>
                                )}
                                <span className="text-emerald-600 font-medium">{upcomingSessions.length} قادمة</span>
                                <span className="text-slate-400">{pastSessions.length} مرت</span>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => setExpandedSlotId(isExpanded ? null : slot.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
                              >
                                {isExpanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                                {isExpanded ? 'إخفاء' : 'عرض'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSlotId(slot.id)}
                                className="inline-flex items-center text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg p-1.5 transition-colors"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded sessions */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <h5 className="text-xs font-bold text-slate-700 mb-3">جميع المحاضرات:</h5>
                              <div className="flex flex-wrap gap-2">
                                {slotSessions
                                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                  .map(session => {
                                    const sessionDate = new Date(session.date);
                                    const isPast = sessionDate <= now;
                                    const isNext = nextSession?.id === session.id;

                                    return (
                                      <button
                                        key={session.id}
                                        onClick={() => handleToggleSession(session.id, slot.id)}
                                        className={`relative w-16 h-16 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-105 border ${
                                          isNext
                                            ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300 scale-105'
                                            : session.isCancelled
                                            ? 'bg-red-50 border-red-200 text-red-400 line-through'
                                            : isPast
                                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                        }`}
                                      >
                                        {isNext && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                            <BoltIcon className="w-2.5 h-2.5 text-white" />
                                          </div>
                                        )}
                                        <span className="text-lg font-extrabold leading-none">{sessionDate.getDate()}</span>
                                        <span className="text-[10px] opacity-70 mt-0.5">
                                          {sessionDate.toLocaleDateString('ar-EG', { month: 'short' })}
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>

                              {/* Legend */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded" />القادمة الآن</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded" />قادمة</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded" />مرت</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded" />ملغاة</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel/Activate Session Modal ── */}
      <TibaModal
        open={confirmCancelModal.show}
        onClose={() => {
          setConfirmCancelModal({ show: false, sessionId: null, slotId: null, isCancelled: false, date: '' });
          setCancellationReason('');
        }}
        variant={confirmCancelModal.isCancelled ? 'danger' : 'primary'}
        size="sm"
        title={confirmCancelModal.isCancelled ? 'إلغاء المحاضرة' : 'تفعيل المحاضرة'}
        subtitle={confirmCancelModal.isCancelled ? 'هل أنت متأكد من إلغاء هذه المحاضرة؟' : 'هل أنت متأكد من تفعيل هذه المحاضرة؟'}
        icon={confirmCancelModal.isCancelled ? <XMarkIcon className="w-6 h-6" /> : <CheckIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setConfirmCancelModal({ show: false, sessionId: null, slotId: null, isCancelled: false, date: '' });
                setCancellationReason('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant={confirmCancelModal.isCancelled ? 'danger' : 'primary'}
              className="flex-1"
              onClick={confirmToggleSession}
            >
              {confirmCancelModal.isCancelled ? 'نعم، إلغاء المحاضرة' : 'نعم، تفعيل المحاضرة'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-3 border border-slate-200">
            <CalendarDaysIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-slate-800">
              {confirmCancelModal.date && new Date(confirmCancelModal.date).toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {confirmCancelModal.isCancelled && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">سبب الإلغاء (اختياري)</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="اكتب سبب إلغاء المحاضرة..."
                className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-slate-50"
                rows={3}
              />
              <p className="text-[11px] text-slate-400 mt-1">السبب سيظهر للمتدربين في المنصة الإلكترونية</p>
            </div>
          )}
        </div>
      </TibaModal>

      {/* ── Add Slot Modal ── */}
      <TibaModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        size="lg"
        title="إضافة يوم حضور جديد"
        icon={<PlusIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" onClick={handleAddSlot} leftIcon={<CheckIcon className="w-4 h-4" />}>
              حفظ
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* المادة */}
          <div className="sm:col-span-2">
            <TibaSelect
              label="المادة التدريبية"
              options={trainingContents.map(c => ({ value: String(c.id), label: c.name }))}
              value={String(formData.contentId || '')}
              onChange={(val) => {
                const contentId = parseInt(val) || 0;
                setFormData({ ...formData, contentId, distributionRoomId: '' });
                if (contentId) loadDistributionRooms(contentId, formData.type);
              }}
              placeholder="اختر المادة"
              icon={<BookOpenIcon className="h-5 w-5" />}
              isSearchable={false}
              isClearable={false}
              instanceId="add-slot-content"
            />
          </div>

          {/* النوع */}
          <div>
            <TibaSelect
              label="النوع"
              options={[
                { value: 'THEORY', label: 'نظري' },
                { value: 'PRACTICAL', label: 'عملي' },
              ]}
              value={formData.type}
              onChange={(val) => {
                const type = val as 'THEORY' | 'PRACTICAL';
                setFormData({ ...formData, type, distributionRoomId: '' });
                if (formData.contentId) loadDistributionRooms(formData.contentId, type);
              }}
              placeholder="اختر النوع"
              isSearchable={false}
              isClearable={false}
              instanceId="add-slot-type"
            />
          </div>

          {/* المجموعة */}
          <div>
            <TibaSelect
              label="المجموعة"
              options={[
                { value: '', label: 'الكل' },
                ...availableRooms.map(r => ({ value: String(r.id), label: `${r.roomName} (${r._count.assignments})` })),
              ]}
              value={formData.distributionRoomId}
              onChange={(val) => setFormData({ ...formData, distributionRoomId: val })}
              placeholder="اختر المجموعة"
              disabled={availableRooms.length === 0}
              isSearchable={false}
              isClearable={false}
              instanceId="add-slot-room"
            />
          </div>

          {/* اليوم */}
          <div className="sm:col-span-2">
            <TibaSelect
              label="اليوم"
              options={DAYS_ORDER.map(d => ({ value: d, label: DAYS_AR[d as keyof typeof DAYS_AR] }))}
              value={formData.dayOfWeek}
              onChange={(val) => setFormData({ ...formData, dayOfWeek: val })}
              placeholder="اختر اليوم"
              icon={<CalendarDaysIcon className="h-5 w-5" />}
              isSearchable={false}
              isClearable={false}
              instanceId="add-slot-day"
            />
          </div>

          {/* الوقت */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">من الساعة</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-10">
                <ClockIcon className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full py-3 pr-10 pl-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">إلى الساعة</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-10">
                <ClockIcon className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full py-3 pr-10 pl-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* المكان */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">المكان (اختياري)</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-10">
                <MapPinIcon className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="مثال: قاعة 101"
                className="w-full py-3 pr-10 pl-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </TibaModal>

      {/* ── Delete Slot Confirmation Modal ── */}
      <TibaModal
        open={confirmDeleteSlotId !== null}
        onClose={() => setConfirmDeleteSlotId(null)}
        variant="danger"
        size="sm"
        title="حذف يوم الحضور"
        subtitle="هل أنت متأكد من حذف هذا اليوم؟ سيتم حذف جميع المحاضرات المرتبطة به."
        icon={<TrashIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteSlotId(null)}>
              إلغاء
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteSlot}>
              نعم، حذف
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-2 text-sm bg-red-50 rounded-lg p-3 border border-red-100">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700">هذا الإجراء لا يمكن التراجع عنه</span>
        </div>
      </TibaModal>
    </ProtectedPage>
  );
}
