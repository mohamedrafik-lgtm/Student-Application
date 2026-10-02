'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ArrowRightIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { getTraineeAttendanceDetails } from '@/lib/attendance-records-api';

const STATUS_LABELS: Record<string, { label: string; color: string; bgClass: string; textClass: string; borderClass: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  PRESENT: { label: 'حاضر', color: 'emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200', icon: CheckCircleIcon },
  ABSENT: { label: 'غائب', color: 'rose', bgClass: 'bg-rose-50', textClass: 'text-rose-700', borderClass: 'border-rose-200', icon: XCircleIcon },
  LATE: { label: 'متأخر', color: 'amber', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200', icon: ClockIcon },
  EXCUSED: { label: 'بعذر', color: 'blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200', icon: ExclamationCircleIcon },
};

export default function TraineeAttendanceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const traineeId = parseInt(params.traineeId as string);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [traineeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getTraineeAttendanceDetails(traineeId);
      setData(response);
    } catch (error) {
      console.error('Error loading trainee attendance:', error);
      toast.error('فشل تحميل سجلات الحضور');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance.records', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader title="سجل الحضور" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'سجلات الحضور', href: '/dashboard/attendance-records' }, { label: '...' }]} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (!data) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance.records', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader title="المتدرب غير موجود" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'سجلات الحضور', href: '/dashboard/attendance-records' }]} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-3">المتدرب غير موجود</h3>
              <Button onClick={() => router.push('/dashboard/attendance-records')} variant="outline" size="sm">العودة</Button>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const { trainee, stats, byContent, allRecords } = data;
  const displayRecords = selectedContent
    ? byContent.find((c: any) => c.content.id === selectedContent)?.records || []
    : allRecords;

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance.records', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={`سجل حضور: ${trainee.nameAr}`}
          description={`الرقم القومي: ${trainee.nationalId} | البرنامج: ${trainee.program.nameAr}`}
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'سجلات الحضور', href: '/dashboard/attendance-records' },
            { label: trainee.nameAr },
          ]}
          actions={
            <Button onClick={() => router.push('/dashboard/attendance-records')} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
              العودة
            </Button>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Trainee Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {trainee.photoUrl ? (
                  <img src={trainee.photoUrl} alt={trainee.nameAr} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <UserIcon className="w-7 h-7 text-blue-500" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">الاسم بالعربي</p>
                  <p className="text-sm font-bold text-slate-900">{trainee.nameAr}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">الرقم القومي</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">{trainee.nationalId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">الهاتف</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">{trainee.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">البريد الإلكتروني</p>
                  <p className="text-sm font-bold text-slate-900">{trainee.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: 'إجمالي السجلات', value: stats.total, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', valueColor: 'text-slate-900', Icon: CalendarDaysIcon },
              { label: 'حاضر', value: stats.present, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600', Icon: CheckCircleIcon },
              { label: 'غائب', value: stats.absent, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', valueColor: 'text-rose-600', Icon: XCircleIcon },
              { label: 'متأخر', value: stats.late, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-amber-600', Icon: ClockIcon },
              { label: 'بعذر', value: stats.excused, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-blue-600', Icon: ExclamationCircleIcon },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${s.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <s.Icon className={`w-[18px] h-[18px] ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${s.valueColor} tabular-nums`}>{s.value}</p>
                    <p className="text-[11px] text-slate-500">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance by Training Content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpenIcon className="w-[18px] h-[18px] text-blue-600" />
                الحضور حسب المادة التدريبية
              </h3>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {byContent.map((item: any) => {
                  const attendanceRate = item.stats.total > 0 ? Math.round((item.stats.present / item.stats.total) * 100) : 0;
                  const isSelected = selectedContent === item.content.id;
                  return (
                    <div
                      key={item.content.id}
                      onClick={() => setSelectedContent(item.content.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-sm font-bold text-slate-900">{item.content.name}</h4>
                        <span className="text-[10px] font-medium bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-100">{item.content.code}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{item.classroom.name}</p>
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div><p className="text-base font-bold text-emerald-600">{item.stats.present}</p><p className="text-[10px] text-slate-500">حاضر</p></div>
                        <div><p className="text-base font-bold text-rose-600">{item.stats.absent}</p><p className="text-[10px] text-slate-500">غائب</p></div>
                        <div><p className="text-base font-bold text-amber-600">{item.stats.late}</p><p className="text-[10px] text-slate-500">متأخر</p></div>
                        <div><p className="text-base font-bold text-blue-600">{item.stats.excused}</p><p className="text-[10px] text-slate-500">بعذر</p></div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-600">نسبة الحضور</span>
                          <span className="text-[11px] font-bold text-slate-700">{attendanceRate}%</span>
                        </div>
                        <div className="overflow-hidden h-1.5 rounded-full bg-slate-100">
                          <div
                            style={{ width: `${attendanceRate}%` }}
                            className={`h-full rounded-full transition-all ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedContent && (
                <div className="mt-4 text-center">
                  <Button onClick={() => setSelectedContent(null)} variant="ghost" size="sm">عرض جميع السجلات</Button>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-[18px] h-[18px] text-blue-600" />
                {selectedContent
                  ? `سجلات ${byContent.find((c: any) => c.content.id === selectedContent)?.content.name}`
                  : 'جميع السجلات'
                }
                <span className="text-xs font-normal text-slate-400">({displayRecords.length} سجل)</span>
              </h3>
            </div>
            <div className="p-4 sm:p-5">
              {displayRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">لا توجد سجلات حضور</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayRecords.map((record: any) => {
                    const statusInfo = STATUS_LABELS[record.status] || STATUS_LABELS.PRESENT;
                    const StatusIcon = statusInfo.icon;
                    const sessionDate = new Date(record.session.date);

                    return (
                      <div key={record.id} className={`p-3.5 rounded-lg border transition-all ${statusInfo.borderClass} ${statusInfo.bgClass}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${statusInfo.bgClass} ${statusInfo.textClass} border ${statusInfo.borderClass}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </span>
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                              {sessionDate.toLocaleDateString('ar-EG')}
                            </span>
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                              {record.session.scheduleSlot.startTime} - {record.session.scheduleSlot.endTime}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{record.session.scheduleSlot.content.name}</p>
                            <p className="text-xs text-slate-500">{record.session.scheduleSlot.classroom.name} | {record.session.scheduleSlot.content.code}</p>
                          </div>
                        </div>

                        {record.notes && (
                          <div className="mt-2 p-2 bg-white/70 rounded border border-slate-200/80">
                            <p className="text-xs text-slate-700 flex items-center gap-1.5">
                              <ChatBubbleLeftIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">ملاحظات:</span> {record.notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-2 text-[11px] text-slate-400">
                          سجّله: {record.recordedByUser.name} | {new Date(record.recordedAt).toLocaleString('ar-EG')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>        </div>
      </div>
    </ProtectedPage>
  );
}