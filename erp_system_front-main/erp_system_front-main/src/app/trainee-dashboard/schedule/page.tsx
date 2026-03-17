'use client';

import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  InformationCircleIcon, 
  ClockIcon,
  AcademicCapIcon,
  BeakerIcon,
  MapPinIcon,
  MoonIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { traineeAPI } from '@/lib/trainee-api';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import QRCodeDisplay from '../components/QRCodeDisplay';

interface ScheduleSlot {
  id: number;
  content: {
    id: number;
    code: string;
    name: string;
    instructor: {
      id: number;
      name: string;
    } | null;
  };
  startTime: string;
  endTime: string;
  type: 'THEORY' | 'PRACTICAL';
  location: string | null;
  distributionRoom: {
    id: string;
    roomName: string;
    roomNumber: string;
  } | null;
  nextActiveSession: {
    date: string;
  } | null;
  nextCancelledSession: {
    date: string;
    cancellationReason: string | null;
  } | null;
}

interface WeekSchedule {
  SUNDAY: ScheduleSlot[];
  MONDAY: ScheduleSlot[];
  TUESDAY: ScheduleSlot[];
  WEDNESDAY: ScheduleSlot[];
  THURSDAY: ScheduleSlot[];
  FRIDAY: ScheduleSlot[];
  SATURDAY: ScheduleSlot[];
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate: string | null;
  endDate: string | null;
}

const dayNames: Record<keyof WeekSchedule, string> = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

export default function TraineeSchedulePage() {
  const { profile: traineeData } = useTraineeProfile();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await traineeAPI.getMySchedule();
      
      if (!response.success) {
        setError(response.message);
        return;
      }

      setSchedule(response.schedule);
      setClassroom(response.classroom);
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      setError('فشل تحميل الجدول الدراسي');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: 'THEORY' | 'PRACTICAL') => {
    return type === 'THEORY'
      ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
      : 'bg-gradient-to-r from-emerald-500 to-teal-600';
  };

  const getTypeName = (type: 'THEORY' | 'PRACTICAL') => {
    return type === 'THEORY' ? 'نظري' : 'عملي';
  };

  const getTypeIcon = (type: 'THEORY' | 'PRACTICAL') => {
    return type === 'THEORY' ? (
      <AcademicCapIcon className="w-5 h-5" />
    ) : (
      <BeakerIcon className="w-5 h-5" />
    );
  };

  // تحويل الوقت من 24 ساعة إلى 12 ساعة مع صباحاً/مساءً
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse">جاري تحميل الجدول الدراسي...</p>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <CalendarDaysIcon className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {error || 'الجدول الدراسي غير معلن بعد'}
        </h2>
        <p className="text-slate-500 max-w-md mb-8">
          {error === 'لم يتم تسجيلك في أي فصل دراسي بعد'
            ? 'يرجى التواصل مع إدارة البرنامج التدريبي للتسجيل في فصل دراسي'
            : 'سيتم نشر الجدول هنا فور اعتماده رسمياً'}
        </p>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full text-right shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5 text-emerald-600" />
            معلومات مهمة
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
              <span>سيتم الإعلان عن الجدول الدراسي قبل بدء الفصل التدريبي بوقت كافي</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
              <span>يمكنك مراجعة هذه الصفحة دورياً للاطلاع على آخر التحديثات</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const daysOfWeek: (keyof WeekSchedule)[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4">
              <CalendarDaysIcon className="w-4 h-4" />
              الجدول الدراسي الأسبوعي
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {classroom ? classroom.name : 'جدول المحاضرات'}
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base max-w-xl">
              اطلع على مواعيد المحاضرات والأنشطة الخاصة بك طوال الأسبوع.
            </p>
          </div>

          {/* QR Code */}
          {traineeData?.nationalId && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeDisplay 
                  nationalId={traineeData.nationalId}
                  size={70}
                  className="rounded-lg"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-100 mb-1">كود الهوية</p>
                <p className="font-bold tracking-wider">{traineeData.nationalId}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Days */}
      <div className="space-y-4">
        {daysOfWeek.map((day) => {
          const daySlots = schedule[day];
          const hasSlots = daySlots && daySlots.length > 0;
          const isWeekend = day === 'FRIDAY' || day === 'SATURDAY';

          return (
            <div key={day} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
              {/* Day Header */}
              <div className={`md:w-48 p-6 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-l border-slate-100 ${
                isWeekend ? 'bg-slate-50' : 'bg-emerald-50/30'
              }`}>
                <h3 className={`text-xl font-bold mb-1 ${isWeekend ? 'text-slate-500' : 'text-emerald-900'}`}>
                  {dayNames[day]}
                </h3>
                {hasSlots ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    {daySlots.length} محاضرة
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 font-medium">يوم راحة</span>
                )}
              </div>

              {/* Slots */}
              <div className="flex-1 p-6">
                {!hasSlots ? (
                  <div className="h-full flex items-center justify-center py-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <MoonIcon className="w-6 h-6" />
                      <span className="font-medium">لا توجد محاضرات في هذا اليوم</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {daySlots
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((slot, slotIndex) => (
                        <div
                          key={slot.id}
                          className={`relative rounded-2xl p-5 border transition-all duration-200 ${
                            slot.nextCancelledSession
                              ? 'border-rose-200 bg-rose-50/50'
                              : slot.type === 'THEORY'
                              ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                              : 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-md'
                          }`}
                        >
                          {/* Cancelled Badge */}
                          {slot.nextCancelledSession && (
                            <div className="absolute top-4 left-4 bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                              <InformationCircleIcon className="w-4 h-4" />
                              ملغاة
                            </div>
                          )}

                          <div className="flex gap-4">
                            {/* Time Column */}
                            <div className="flex flex-col items-center justify-center min-w-[80px] text-center border-l border-slate-100 pl-4">
                              <span className={`text-sm font-bold ${slot.nextCancelledSession ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {formatTime(slot.startTime).split(' ')[0]}
                              </span>
                              <span className="text-xs text-slate-500 mb-1">{formatTime(slot.startTime).split(' ')[1]}</span>
                              <div className="w-1 h-4 bg-slate-200 rounded-full my-1"></div>
                              <span className={`text-sm font-bold ${slot.nextCancelledSession ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {formatTime(slot.endTime).split(' ')[0]}
                              </span>
                              <span className="text-xs text-slate-500">{formatTime(slot.endTime).split(' ')[1]}</span>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ${
                                  slot.type === 'THEORY' 
                                    ? 'bg-slate-100 text-slate-600' 
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {getTypeName(slot.type)}
                                </span>
                                {!slot.nextCancelledSession && slot.nextActiveSession && (
                                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600">
                                    {new Date(slot.nextActiveSession.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>

                              <h4 className={`font-bold text-base mb-3 ${slot.nextCancelledSession ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                {slot.content.name}
                              </h4>

                              <div className="space-y-2">
                                {slot.content.instructor && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <AcademicCapIcon className="w-4 h-4 text-slate-400" />
                                    <span>{slot.content.instructor.name}</span>
                                  </div>
                                )}
                                {(slot.location || slot.distributionRoom) && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <MapPinIcon className="w-4 h-4 text-slate-400" />
                                    <span>
                                      {slot.distributionRoom
                                        ? `${slot.distributionRoom.roomName} ${slot.distributionRoom.roomNumber}`
                                        : slot.location}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Cancellation Reason */}
                              {slot.nextCancelledSession?.cancellationReason && (
                                <div className="mt-3 p-2.5 bg-rose-100/50 rounded-lg text-xs text-rose-700 border border-rose-100">
                                  <span className="font-bold">سبب الإلغاء: </span>
                                  {slot.nextCancelledSession.cancellationReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border-2 border-slate-200"></div>
          <span className="text-slate-600 font-medium">محاضرة نظرية</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-50 border-2 border-emerald-200"></div>
          <span className="text-slate-600 font-medium">محاضرة عملية</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-50 border-2 border-rose-200"></div>
          <span className="text-slate-600 font-medium">محاضرة ملغاة</span>
        </div>
      </div>
    </div>
  );
}
