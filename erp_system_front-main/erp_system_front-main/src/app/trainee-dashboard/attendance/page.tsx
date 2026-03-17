'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import LoadingScreen from '../components/LoadingScreen';
import { traineeAttendanceAPI, type TraineeAttendanceData, type ClassroomGroup } from '@/lib/trainee-attendance-api';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const dayOfWeekMap: Record<string, string> = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

const sessionTypeMap: Record<string, string> = {
  THEORETICAL: 'نظري',
  PRACTICAL: 'عملي',
};

// Strictly adhering to NEW_DESIGN_SYSTEM.md
const statusMap: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PRESENT: {
    label: 'حاضر',
    color: 'text-[#134E4A]', // teal-900
    bgColor: 'bg-[#CCFBF1]', // teal-100
    icon: CheckCircleIcon,
  },
  ABSENT: {
    label: 'غائب',
    color: 'text-[#881337]', // rose-900
    bgColor: 'bg-[#FFE4E6]', // rose-100
    icon: XCircleIcon,
  },
  LATE: {
    label: 'متأخر',
    color: 'text-[#78350F]', // amber-900
    bgColor: 'bg-[#FEF3C7]', // amber-100
    icon: ClockIcon,
  },
  EXCUSED: {
    label: 'بعذر',
    color: 'text-[#1E3A8A]', // blue-900
    bgColor: 'bg-[#DBEAFE]', // blue-100
    icon: ExclamationCircleIcon,
  },
};

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TraineeAttendanceData | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [activeClassroomId, setActiveClassroomId] = useState<number | null>(null);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const result = await traineeAttendanceAPI.getMyAttendanceRecords();
      setData(result);
      
      if (result.classroomGroups && result.classroomGroups.length > 0) {
        const now = new Date();
        const currentClassroom = result.classroomGroups.find((cg: ClassroomGroup) => {
          const start = cg.classroom.startDate ? new Date(cg.classroom.startDate) : null;
          const end = cg.classroom.endDate ? new Date(cg.classroom.endDate) : null;
          return start && end && now >= start && now <= end;
        });
        const selected = currentClassroom || result.classroomGroups[0];
        setActiveClassroomId(selected.classroom.id);
        if (selected.contentGroups.length > 0) {
          setExpandedContent(selected.contentGroups[0].content.id);
        }
      } else if (result.contentGroups.length > 0) {
        setExpandedContent(result.contentGroups[0].content.id);
      }
    } catch (error: unknown) {
      console.error('Error fetching attendance:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'فشل تحميل سجلات الحضور');
    } finally {
      setLoading(false);
    }
  };

  const activeClassroomGroup = data?.classroomGroups?.find(
    (g) => g.classroom.id === activeClassroomId
  );

  const hasClassroomGroups = data?.classroomGroups && data.classroomGroups.length > 0;

  const displayContentGroups = hasClassroomGroups
    ? (activeClassroomGroup?.contentGroups || [])
    : (data?.contentGroups || []);

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحضير سجل الحضور..." 
        submessage="نجهز لك بيانات المحاضرات"
      />
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircleIcon className="w-16 h-16 text-rose-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">حدث خطأ في تحميل البيانات</h3>
          <button
            onClick={fetchAttendanceData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const hasAttendance = data.stats.total > 0;
  const attendancePercentage = data.stats.attendanceRate;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/trainee-dashboard" 
              className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">سجل الحضور</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">متابعة حضورك في المحاضرات التدريبية</p>
            </div>
          </div>
          <Badge className="hidden sm:flex bg-blue-50 text-blue-700 border-0 px-3 py-1.5 rounded-lg font-semibold gap-1.5">
            <CalendarDaysIcon className="w-4 h-4" />
            سجل محدث
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Compact Stats Card */}
        {hasAttendance && (
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                
                {/* Circular Progress - Compact */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * attendancePercentage) / 100} 
                      className={
                        attendancePercentage >= 80 ? 'text-teal-500' :
                        attendancePercentage >= 70 ? 'text-amber-500' : 'text-rose-500'
                      } 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900">{attendancePercentage}%</span>
                  </div>
                </div>

                {/* Stats Grid - 2x2 on mobile, 1x4 on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center transition-colors hover:border-slate-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ChartBarIcon className="w-4 h-4 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-500">إجمالي المحاضرات</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{data.stats.total}</p>
                  </div>
                  <div className="bg-[#F0FDFA] p-4 rounded-2xl border border-[#CCFBF1] flex flex-col justify-center transition-colors hover:border-[#99F6E4]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#0D9488]" />
                      <p className="text-xs font-semibold text-[#0D9488]">حضور</p>
                    </div>
                    <p className="text-2xl font-black text-[#134E4A]">{data.stats.present}</p>
                  </div>
                  <div className="bg-[#FFF1F2] p-4 rounded-2xl border border-[#FECDD3] flex flex-col justify-center transition-colors hover:border-[#FDA4AF]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <XCircleIcon className="w-4 h-4 text-[#E11D48]" />
                      <p className="text-xs font-semibold text-[#E11D48]">غياب</p>
                    </div>
                    <p className="text-2xl font-black text-[#881337]">{data.stats.absent}</p>
                  </div>
                  <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#FDE68A] flex flex-col justify-center transition-colors hover:border-[#FCD34D]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ClockIcon className="w-4 h-4 text-[#D97706]" />
                      <p className="text-xs font-semibold text-[#D97706]">تأخير</p>
                    </div>
                    <p className="text-2xl font-black text-[#78350F]">{data.stats.late}</p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* Classroom Tabs */}
        {hasClassroomGroups && data.classroomGroups!.length > 1 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {data.classroomGroups!.map((cg) => {
                const isActive = cg.classroom.id === activeClassroomId;
                return (
                  <button
                    key={cg.classroom.id}
                    onClick={() => {
                      setActiveClassroomId(cg.classroom.id);
                      setExpandedContent(cg.contentGroups.length > 0 ? cg.contentGroups[0].content.id : null);
                    }}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                      isActive 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {cg.classroom.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Groups (Subjects) */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
            <AcademicCapIcon className="w-5 h-5 text-blue-600" />
            سجل المواد
          </h2>

          {displayContentGroups.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <CalendarDaysIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد سجلات حضور لهذا الفصل الدراسي</p>
            </div>
          ) : (
            displayContentGroups.map((group) => (
              <div 
                key={group.content.id} 
                className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
                  expandedContent === group.content.id ? 'border-blue-200 shadow-sm' : 'border-slate-200'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedContent(expandedContent === group.content.id ? null : group.content.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      expandedContent === group.content.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {group.content.nameAr.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5">{group.content.nameAr}</h4>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{group.stats.total} محاضرة</span>
                        <span className={`px-2 py-0.5 rounded-md ${
                          group.stats.attendanceRate >= 80 ? 'bg-[#F0FDFA] text-[#0D9488]' :
                          group.stats.attendanceRate >= 70 ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#FFF1F2] text-[#E11D48]'
                        }`}>
                          {group.stats.attendanceRate}% حضور
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-center">
                      <div>
                        <p className="text-sm font-bold text-teal-600">{group.stats.present}</p>
                        <p className="text-[10px] text-slate-400">حضور</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-rose-600">{group.stats.absent}</p>
                        <p className="text-[10px] text-slate-400">غياب</p>
                      </div>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${expandedContent === group.content.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {/* Accordion Body (Sessions) */}
                {expandedContent === group.content.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4 space-y-2">
                    {group.sessions.map((session) => {
                      const statusInfo = statusMap[session.status];
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div 
                          key={session.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm gap-3 sm:gap-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${statusInfo.bgColor}`}>
                              <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                {dayOfWeekMap[session.dayOfWeek]}
                                <span className="text-slate-300 font-normal">•</span>
                                <span className="text-slate-500 font-medium text-xs">
                                  {new Date(session.date).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {sessionTypeMap[session.sessionType]}
                                </span>
                                {session.notes && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                    {session.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                            {session.isCancelled && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md flex items-center gap-1">
                                <ExclamationCircleIcon className="w-3 h-3" />
                                ملغاة
                              </span>
                            )}
                            <span className={`text-xs font-bold px-3 py-1 rounded-md border ${statusInfo.bgColor} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
