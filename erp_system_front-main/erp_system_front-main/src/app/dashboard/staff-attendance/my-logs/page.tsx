'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon,
  MapPinIcon, XMarkIcon,
  ClockIcon, CalendarDaysIcon, DocumentTextIcon,
  CheckCircleIcon, XCircleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';

interface LogEntry {
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

interface MapData {
  date: string;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInTime: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutTime: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; bgCls: string; icon: React.ReactNode; dot: string }> = {
  PRESENT: { label: 'حاضر', cls: 'text-tiba-secondary-700', bgCls: 'bg-tiba-secondary-50 border-tiba-secondary-200', icon: <CheckCircleIcon className="w-5 h-5 text-tiba-secondary-600" />, dot: 'bg-tiba-secondary-500' },
  ABSENT_UNEXCUSED: { label: 'غائب بدون إذن', cls: 'text-red-700', bgCls: 'bg-red-50 border-red-200', icon: <XCircleIcon className="w-5 h-5 text-red-600" />, dot: 'bg-red-500' },
  ABSENT: { label: 'غائب', cls: 'text-red-700', bgCls: 'bg-red-50 border-red-200', icon: <XCircleIcon className="w-5 h-5 text-red-600" />, dot: 'bg-red-500' },
  LATE: { label: 'متأخر', cls: 'text-amber-700', bgCls: 'bg-amber-50 border-amber-200', icon: <ClockIcon className="w-5 h-5 text-amber-600" />, dot: 'bg-amber-500' },
  EARLY_LEAVE: { label: 'انصراف مبكر', cls: 'text-orange-700', bgCls: 'bg-orange-50 border-orange-200', icon: <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />, dot: 'bg-orange-500' },
  ABSENT_EXCUSED: { label: 'إذن', cls: 'text-teal-700', bgCls: 'bg-teal-50 border-teal-200', icon: <DocumentTextIcon className="w-5 h-5 text-teal-600" />, dot: 'bg-teal-500' },
  LEAVE: { label: 'إذن', cls: 'text-teal-700', bgCls: 'bg-teal-50 border-teal-200', icon: <DocumentTextIcon className="w-5 h-5 text-teal-600" />, dot: 'bg-teal-500' },
  HOLIDAY: { label: 'عطلة', cls: 'text-purple-700', bgCls: 'bg-purple-50 border-purple-200', icon: <CalendarDaysIcon className="w-5 h-5 text-purple-600" />, dot: 'bg-purple-500' },
  DAY_OFF: { label: 'يوم إجازة', cls: 'text-slate-600', bgCls: 'bg-slate-50 border-slate-200', icon: <NoSymbolIcon className="w-5 h-5 text-slate-400" />, dot: 'bg-slate-400' },
};

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

export default function MyLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mapData, setMapData] = useState<MapData | null>(null);
  const limit = 20;

  // Check enrollment
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI('/staff-attendance/my-status');
        if (data?.isEnrolled) {
          setIsEnrolled(true);
        } else {
          setIsEnrolled(false);
          router.replace('/dashboard');
        }
      } catch {
        setIsEnrolled(false);
        router.replace('/dashboard');
      }
    })();
  }, [router]);

  const loadLogs = useCallback(async () => {
    if (!isEnrolled) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const data = await fetchAPI(`/staff-attendance/my-logs?${params.toString()}`);
      if (data?.logs) {
        setLogs(data.logs);
        setTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
      }
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, startDate, endDate, isEnrolled]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / limit);

  // Stats from current page
  const stats = {
    present: logs.filter(l => l.status === 'PRESENT').length,
    absent: logs.filter(l => l.status === 'ABSENT_UNEXCUSED' || l.status === 'ABSENT').length,
    late: logs.filter(l => l.status === 'LATE').length,
    totalHours: Math.round(logs.reduce((sum, l) => sum + (l.workedMinutes || 0), 0) / 60),
    totalOvertime: logs.reduce((sum, l) => sum + (l.overtimeMinutes || 0), 0),
  };

  if (isEnrolled === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tiba-gray-500">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">سجل حضوري</h1>
            <p className="text-sm text-tiba-gray-500 mt-1">عرض سجلات حضورك وانصرافك اليومية</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            تحديث
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-secondary-50 flex items-center justify-center">
              <CheckCircleIcon className="w-4.5 h-4.5 text-tiba-secondary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.present}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">أيام حضور</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-danger-50 flex items-center justify-center">
              <XCircleIcon className="w-4.5 h-4.5 text-tiba-danger-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.absent}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">أيام غياب</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-warning-50 flex items-center justify-center">
              <ClockIcon className="w-4.5 h-4.5 text-tiba-warning-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.late}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">أيام تأخير</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
              <CalendarDaysIcon className="w-4.5 h-4.5 text-tiba-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalHours}<span className="text-base font-medium text-tiba-gray-400">س</span></p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">ساعات العمل</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ClockIcon className="w-4.5 h-4.5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMinutes(stats.totalOvertime)}</p>
          <p className="text-xs text-tiba-gray-500 mt-0.5">وقت إضافي</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 p-3 sm:p-4 mb-5 shadow-card">
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { value: '', label: 'الكل' },
            { value: 'PRESENT', label: 'حاضر' },
            { value: 'ABSENT_UNEXCUSED', label: 'غائب بدون إذن' },
            { value: 'LATE', label: 'متأخر' },
            { value: 'EARLY_LEAVE', label: 'انصراف مبكر' },
            { value: 'LEAVE', label: 'إذن' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                statusFilter === s.value
                  ? 'bg-tiba-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Logs Cards */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-tiba-gray-500">جارٍ تحميل السجلات...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-12 text-center shadow-card">
          <DocumentTextIcon className="w-16 h-16 text-tiba-gray-200 mx-auto mb-4" />
          <p className="text-base font-semibold text-tiba-gray-400">لا توجد سجلات حضور</p>
          <p className="text-sm text-tiba-gray-300 mt-1">سجلات حضورك ستظهر هنا بمجرد تسجيل الحضور</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.DAY_OFF;
            return (
              <div key={log.id} className={`bg-white rounded-xl border ${log.isLate ? 'border-tiba-warning-200' : 'border-tiba-gray-200'} p-4 shadow-card hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${config.bgCls} border flex items-center justify-center`}>
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(log.date)}</p>
                      <p className={`text-xs font-medium ${config.cls}`}>{config.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(log.checkInLatitude || log.checkOutLatitude) && (
                      <button
                        onClick={() => setMapData({
                          date: formatDate(log.date),
                          checkInLat: log.checkInLatitude,
                          checkInLng: log.checkInLongitude,
                          checkInTime: log.checkInTime,
                          checkOutLat: log.checkOutLatitude,
                          checkOutLng: log.checkOutLongitude,
                          checkOutTime: log.checkOutTime,
                        })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-tiba-primary-600 bg-tiba-primary-50 hover:bg-tiba-primary-100 rounded-lg transition-colors"
                      >
                        <MapPinIcon className="w-3.5 h-3.5" />
                        الموقع
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ArrowRightOnRectangleIcon className="w-3.5 h-3.5 text-tiba-secondary-500" />
                      <span className="text-[10px] text-slate-500 font-medium">الحضور</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{formatTime(log.checkInTime)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5 text-tiba-danger-400" />
                      <span className="text-[10px] text-slate-500 font-medium">الانصراف</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{formatTime(log.checkOutTime)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ClockIcon className="w-3.5 h-3.5 text-tiba-primary-500" />
                      <span className="text-[10px] text-slate-500 font-medium">المدة</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{formatMinutes(log.workedMinutes)}</p>
                  </div>
                </div>

                {log.overtimeMinutes != null && log.overtimeMinutes > 0 && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200/60">
                    <ClockIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-700">وقت إضافي: +{formatMinutes(log.overtimeMinutes)}</span>
                  </div>
                )}

                {log.notes && (
                  <div className="mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-tiba-gray-100">
                    <p className="text-xs text-slate-500">{log.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 bg-white rounded-xl border border-tiba-gray-200 px-4 py-3 shadow-card">
          <p className="text-xs text-tiba-gray-500 hidden sm:block">
            عرض {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} من {total}
          </p>
          <p className="text-xs text-tiba-gray-500 sm:hidden">
            {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-medium px-3 py-1 bg-slate-50 border border-tiba-gray-200 rounded-lg">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all">
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Location Map Modal */}
      {mapData && (
        <TibaModal
          open={!!mapData}
          onClose={() => setMapData(null)}
          variant="primary"
          size="md"
          title="موقع التسجيل"
          subtitle={mapData.date}
          icon={<MapPinIcon className="w-6 h-6" />}
        >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mapData.checkInLat && mapData.checkInLng && (
                  <div className="bg-tiba-secondary-50 rounded-xl border border-tiba-secondary-100 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRightOnRectangleIcon className="w-4 h-4 text-tiba-secondary-600" />
                      <p className="text-xs font-bold text-tiba-secondary-700">موقع الحضور</p>
                    </div>
                    <p className="text-[11px] text-tiba-secondary-600 tabular-nums" dir="ltr">{mapData.checkInLat.toFixed(6)}, {mapData.checkInLng.toFixed(6)}</p>
                    {mapData.checkInTime && <p className="text-[10px] text-tiba-secondary-500 mt-1">الوقت: {formatTime(mapData.checkInTime)}</p>}
                  </div>
                )}
                {mapData.checkOutLat && mapData.checkOutLng && (
                  <div className="bg-red-50 rounded-xl border border-red-100 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowLeftOnRectangleIcon className="w-4 h-4 text-red-600" />
                      <p className="text-xs font-bold text-red-700">موقع الانصراف</p>
                    </div>
                    <p className="text-[11px] text-red-600 tabular-nums" dir="ltr">{mapData.checkOutLat.toFixed(6)}, {mapData.checkOutLng.toFixed(6)}</p>
                    {mapData.checkOutTime && <p className="text-[10px] text-red-500 mt-1">الوقت: {formatTime(mapData.checkOutTime)}</p>}
                  </div>
                )}
              </div>
              {(() => {
                const lat = mapData.checkInLat || mapData.checkOutLat;
                const lng = mapData.checkInLng || mapData.checkOutLng;
                if (!lat || !lng) return null;
                return (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <iframe
                      width="100%"
                      height="280"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
                    />
                    <div className="flex items-center justify-center bg-slate-50 px-3 py-2 border-t border-slate-200">
                      <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-tiba-primary-600 hover:text-tiba-primary-700 hover:underline">
                        فتح في Google Maps ↗
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
        </TibaModal>
      )}
    </div>
  );
}
