'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import { Button } from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import { MapPinIcon, XMarkIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface UserLog {
  id: string;
  date: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workedMinutes: number | null;
  overtimeMinutes: number | null;
  isLate: boolean;
  isEarlyLeave: boolean;
  notes: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
}

interface UserData {
  user: { id: string; name: string; email: string; photoUrl?: string | null };
  logs: UserLog[];
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    excusedDays: number;
    avgWorkedMinutes: number;
    attendanceRate: number;
    totalOvertimeMinutes?: number;
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; cls: string }> = {
    PRESENT: { label: 'حاضر', dot: 'bg-tiba-secondary-500', cls: 'bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-secondary-200/60' },
    ABSENT_UNEXCUSED: { label: 'غائب بدون إذن', dot: 'bg-tiba-danger-500', cls: 'bg-tiba-danger-50 text-tiba-danger-700 border border-tiba-danger-200/60' },
    ABSENT: { label: 'غائب', dot: 'bg-tiba-danger-500', cls: 'bg-tiba-danger-50 text-tiba-danger-700 border border-tiba-danger-200/60' },
    LATE: { label: 'متأخر', dot: 'bg-tiba-warning-500', cls: 'bg-tiba-warning-50 text-tiba-warning-700 border border-tiba-warning-200/60' },
    EARLY_LEAVE: { label: 'انصراف مبكر', dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-700 border border-orange-200/60' },
    ABSENT_EXCUSED: { label: 'إذن', dot: 'bg-teal-500', cls: 'bg-teal-50 text-teal-700 border border-teal-200/60' },
    LEAVE: { label: 'إذن', dot: 'bg-teal-500', cls: 'bg-teal-50 text-teal-700 border border-teal-200/60' },
    HOLIDAY: { label: 'عطلة', dot: 'bg-purple-500', cls: 'bg-purple-50 text-purple-700 border border-purple-200/60' },
    DAY_OFF: { label: 'يوم إجازة', dot: 'bg-tiba-gray-400', cls: 'bg-tiba-gray-50 text-tiba-gray-700 border border-tiba-gray-200/60' },
  };
  const s = map[status] || { label: status, dot: 'bg-tiba-gray-400', cls: 'bg-tiba-gray-50 text-tiba-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}

function formatMinutes(min: number | null) {
  if (min === null || min === undefined) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} دقيقة`;
  return `${h}س ${m > 0 ? `${m}د` : ''}`;
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-4 hover:shadow-md transition-shadow">
      <p className="text-xs text-tiba-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmployeeDetailContent() {
  const params = useParams();
  const userId = params?.id as string;
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mapLog, setMapLog] = useState<UserLog | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetchAPI(`/staff-attendance/logs/user/${userId}?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل بيانات الموظف');
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="text-center py-16">
      <CalendarDaysIcon className="w-16 h-16 mx-auto text-tiba-gray-200 mb-3" />
      <p className="text-tiba-gray-400 font-medium">لم يتم العثور على بيانات</p>
    </div>
  );

  const { user, logs, stats } = data;

  return (
    <div>
      {/* Employee Header Card */}
      <div className="bg-white rounded-2xl border border-tiba-gray-200 shadow-card mb-6 overflow-hidden">
        <div className="bg-gradient-to-l from-tiba-primary-500 to-indigo-600 px-6 py-8 text-center">
          <div className="flex justify-center mb-3">
            <StaffAvatar name={user.name} photoUrl={user.photoUrl} size="xl" />
          </div>
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="text-sm text-white/70 mt-0.5">{user.email}</p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
            <span className="text-xs font-semibold text-white">نسبة الحضور: {stats.attendanceRate}%</span>
          </div>
        </div>
      </div>

      <PageHeader
        title={`سجل حضور: ${user.name}`}
        description={user.email}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين', href: '/dashboard/staff-attendance' },
          { label: 'الموظفين', href: '/dashboard/staff-attendance/employees' },
          { label: user.name },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
        <StatBox label="إجمالي الأيام" value={stats.totalDays} color="text-tiba-gray-900" />
        <StatBox label="حاضر" value={stats.presentDays} color="text-tiba-secondary-600" />
        <StatBox label="غائب" value={stats.absentDays} color="text-tiba-danger-600" />
        <StatBox label="متأخر" value={stats.lateDays} color="text-tiba-warning-600" />
        <StatBox label="انصراف مبكر" value={stats.earlyLeaveDays} color="text-orange-600" />
        <StatBox label="إذن" value={stats.excusedDays} color="text-teal-600" />
        <StatBox label="متوسط العمل" value={formatMinutes(stats.avgWorkedMinutes)} color="text-tiba-primary-600" />
        <StatBox label="وقت إضافي" value={formatMinutes(stats.totalOvertimeMinutes ?? 0)} color="text-indigo-600" />
        <StatBox label="نسبة الحضور" value={`${stats.attendanceRate}%`} color="text-tiba-secondary-600" />
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-tiba-gray-500 block mb-1">من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
          </div>
          <div>
            <label className="text-xs text-tiba-gray-500 block mb-1">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>مسح</Button>
        </div>
      </div>

      {/* Logs - Desktop Table */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-tiba-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-tiba-gray-600">التاريخ</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">الحالة</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">الحضور</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">الانصراف</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">المدة</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">وقت إضافي</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">الموقع</th>
                <th className="text-center px-4 py-3 font-medium text-tiba-gray-600">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tiba-gray-100">
              {logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <CalendarDaysIcon className="w-12 h-12 mx-auto text-tiba-gray-200 mb-2" />
                  <p className="text-tiba-gray-400">لا توجد سجلات</p>
                </td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-tiba-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-tiba-gray-700 text-xs">{formatDate(log.date)}</td>
                    <td className="text-center px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="text-center px-4 py-3 text-tiba-gray-700 tabular-nums">{formatTime(log.checkInTime)}</td>
                    <td className="text-center px-4 py-3 text-tiba-gray-700 tabular-nums">{formatTime(log.checkOutTime)}</td>
                    <td className="text-center px-4 py-3 text-tiba-gray-700">{formatMinutes(log.workedMinutes)}</td>
                    <td className="text-center px-4 py-3">
                      {log.overtimeMinutes && log.overtimeMinutes > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          +{formatMinutes(log.overtimeMinutes)}
                        </span>
                      ) : (
                        <span className="text-xs text-tiba-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {(log.checkInLatitude || log.checkOutLatitude) ? (
                        <button
                          onClick={() => setMapLog(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-tiba-primary-600 bg-tiba-primary-50 hover:bg-tiba-primary-100 rounded-lg transition-colors"
                        >
                          <MapPinIcon className="w-3.5 h-3.5" />
                          الخريطة
                        </button>
                      ) : (
                        <span className="text-xs text-tiba-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3 text-xs text-tiba-gray-400 max-w-[200px] truncate">{log.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-8 text-center">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-tiba-gray-200 mb-2" />
            <p className="text-tiba-gray-400">لا توجد سجلات</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-tiba-gray-200 shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-tiba-gray-900">{formatDate(log.date)}</p>
                <StatusBadge status={log.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-tiba-secondary-50 rounded-lg p-2.5">
                  <p className="text-tiba-secondary-500 mb-0.5">الحضور</p>
                  <p className="font-semibold text-tiba-secondary-700 tabular-nums">{formatTime(log.checkInTime)}</p>
                </div>
                <div className="bg-tiba-danger-50 rounded-lg p-2.5">
                  <p className="text-tiba-danger-500 mb-0.5">الانصراف</p>
                  <p className="font-semibold text-tiba-danger-700 tabular-nums">{formatTime(log.checkOutTime)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-tiba-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-tiba-primary-600">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span className="font-medium">{formatMinutes(log.workedMinutes)}</span>
                  </div>
                  {log.overtimeMinutes && log.overtimeMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      +{formatMinutes(log.overtimeMinutes)} إضافي
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {log.notes && <span className="text-[10px] text-tiba-gray-400 max-w-[120px] truncate">{log.notes}</span>}
                  {(log.checkInLatitude || log.checkOutLatitude) && (
                    <button
                      onClick={() => setMapLog(log)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-tiba-primary-600 bg-tiba-primary-50 hover:bg-tiba-primary-100 rounded-lg transition-colors"
                    >
                      <MapPinIcon className="w-3.5 h-3.5" />
                      الخريطة
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Location Map Modal */}
      {mapLog && (mapLog.checkInLatitude || mapLog.checkOutLatitude) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setMapLog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-tiba-gray-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-tiba-gray-900 flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-tiba-primary-600" />
                  موقع الحضور — {formatDate(mapLog.date)}
                </h3>
              </div>
              <button onClick={() => setMapLog(null)} className="p-1.5 hover:bg-tiba-gray-100 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-tiba-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {mapLog.checkInLatitude && mapLog.checkInLongitude && (
                  <div className="bg-tiba-secondary-50 rounded-xl border border-tiba-secondary-100 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-tiba-secondary-500 text-white flex items-center justify-center text-[9px] font-bold">حـ</div>
                      <p className="text-xs font-bold text-tiba-secondary-700">موقع الحضور</p>
                    </div>
                    <p className="text-[11px] text-tiba-secondary-600 tabular-nums" dir="ltr">{mapLog.checkInLatitude.toFixed(6)}, {mapLog.checkInLongitude.toFixed(6)}</p>
                    {mapLog.checkInTime && <p className="text-[10px] text-tiba-secondary-500 mt-1">الوقت: {formatTime(mapLog.checkInTime)}</p>}
                  </div>
                )}
                {mapLog.checkOutLatitude && mapLog.checkOutLongitude && (
                  <div className="bg-tiba-primary-50 rounded-xl border border-tiba-primary-100 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-tiba-primary-500 text-white flex items-center justify-center text-[9px] font-bold">ن</div>
                      <p className="text-xs font-bold text-tiba-primary-700">موقع الانصراف</p>
                    </div>
                    <p className="text-[11px] text-tiba-primary-600 tabular-nums" dir="ltr">{mapLog.checkOutLatitude.toFixed(6)}, {mapLog.checkOutLongitude.toFixed(6)}</p>
                    {mapLog.checkOutTime && <p className="text-[10px] text-tiba-primary-500 mt-1">الوقت: {formatTime(mapLog.checkOutTime)}</p>}
                  </div>
                )}
              </div>
              {(() => {
                const lat = mapLog.checkInLatitude || mapLog.checkOutLatitude;
                const lng = mapLog.checkInLongitude || mapLog.checkOutLongitude;
                if (!lat || !lng) return null;
                return (
                  <div className="rounded-xl overflow-hidden border border-tiba-gray-200 shadow-card">
                    <iframe
                      width="100%"
                      height="350"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
                    />
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-t border-tiba-gray-200">
                      <p className="text-[11px] text-tiba-gray-500 flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> موقع تسجيل الحضور الجغرافي</p>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-tiba-primary-600 hover:text-tiba-primary-700 hover:underline"
                      >
                        فتح في Google Maps
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance', action: 'view' }}>
      <EmployeeDetailContent />
    </PageGuard>
  );
}
