'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import LoadingScreen from '@/app/components/LoadingScreen';
import toast from 'react-hot-toast';
import {
  ClockIcon, MapPinIcon, CheckCircleIcon,
  ArrowRightStartOnRectangleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CalendarDaysIcon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

interface MyStatus {
  isEnrolled: boolean;
  systemActive: boolean;
  isWeeklyOff: boolean;
  weeklyOffDay: string | null;
  todayHoliday: { id: string; name: string; date: string } | null;
  todayLog: {
    id: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workedMinutes: number | null;
    isLate: boolean;
  } | null;
  settings: {
    workStartTime: string;
    workEndTime: string;
    lateThresholdMinutes: number;
    requireLocation: boolean;
    requireCheckInLocation: boolean;
    requireCheckOutLocation: boolean;
    zones: Zone[];
  } | null;
  customSchedule?: {
    customWorkDays: string[] | null;
    customWorkStartTime: string | null;
    customWorkEndTime: string | null;
    customWorkHoursPerDay: number | null;
    customDaySchedules: Record<string, { start: string; end: string }> | null;
  } | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkLocationInZones(lat: number, lon: number, zones: Zone[]): { inside: boolean; nearestZone?: string; distance?: number } {
  if (zones.length === 0) return { inside: true };
  let minDist = Infinity;
  let nearestName = '';
  for (const zone of zones) {
    const dist = haversineDistance(lat, lon, zone.latitude, zone.longitude);
    if (dist <= zone.radius) return { inside: true, nearestZone: zone.name, distance: Math.round(dist) };
    if (dist < minDist) {
      minDist = dist;
      nearestName = zone.name;
    }
  }
  return { inside: false, nearestZone: nearestName, distance: Math.round(minDist) };
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} كم`;
  return `${meters} متر`;
}

const DAY_NAMES_AR: Record<string, string> = {
  SUNDAY: 'الأحد', MONDAY: 'الاثنين', TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء', THURSDAY: 'الخميس', FRIDAY: 'الجمعة', SATURDAY: 'السبت',
};

// ===== Beautiful Confirmation Dialog =====
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  warnings: string[];
  confirmText: string;
  icon: React.ReactNode;
  color: 'amber' | 'rose' | 'orange' | 'primary';
  loading?: boolean;
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, warnings, confirmText, icon, color, loading }: ConfirmDialogProps) {
  if (!open) return null;

  const colorClasses = {
    amber: {
      bg: 'bg-tiba-primary-50', border: 'border-tiba-primary-200', iconBg: 'bg-tiba-primary-100',
      iconText: 'text-tiba-primary-600', btn: 'bg-tiba-primary-600 hover:bg-tiba-primary-700 focus:ring-tiba-primary-500',
      warningBg: 'bg-tiba-primary-50 border-tiba-primary-100', warningText: 'text-tiba-primary-700',
    },
    rose: {
      bg: 'bg-tiba-primary-50', border: 'border-tiba-primary-200', iconBg: 'bg-tiba-primary-100',
      iconText: 'text-tiba-primary-600', btn: 'bg-tiba-primary-600 hover:bg-tiba-primary-700 focus:ring-tiba-primary-500',
      warningBg: 'bg-tiba-primary-50 border-tiba-primary-100', warningText: 'text-tiba-primary-700',
    },
    orange: {
      bg: 'bg-tiba-primary-50', border: 'border-tiba-primary-200', iconBg: 'bg-tiba-primary-100',
      iconText: 'text-tiba-primary-600', btn: 'bg-tiba-primary-600 hover:bg-tiba-primary-700 focus:ring-tiba-primary-500',
      warningBg: 'bg-tiba-primary-50 border-tiba-primary-100', warningText: 'text-tiba-primary-700',
    },
    primary: {
      bg: 'bg-tiba-primary-50', border: 'border-tiba-primary-200', iconBg: 'bg-tiba-primary-100',
      iconText: 'text-tiba-primary-600', btn: 'bg-tiba-primary-600 hover:bg-tiba-primary-700 focus:ring-tiba-primary-500',
      warningBg: 'bg-tiba-primary-50 border-tiba-primary-100', warningText: 'text-tiba-primary-700',
    },
  };
  const c = colorClasses[color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Top accent bar */}
        <div className={`h-1 ${c.btn.split(' ')[0]}`} />
        
        <div className="p-6">
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 text-tiba-gray-400 hover:text-tiba-gray-600 hover:bg-tiba-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${c.iconBg} rounded-2xl flex items-center justify-center ${c.iconText} animate-[bounceIn_0.4s_ease-out]`}>
              {icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-5">
            <h3 className="text-lg font-bold text-tiba-gray-900 mb-1.5">{title}</h3>
            <p className="text-sm text-tiba-gray-500 leading-relaxed">{description}</p>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className={`rounded-xl border ${c.warningBg} p-3.5 mb-5 space-y-2`}>
              {warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs ${c.warningText}`}>
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white ${c.btn} rounded-xl disabled:opacity-50 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircleIcon className="w-4 h-4" />
              )}
              {confirmText}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-tiba-gray-700 bg-tiba-gray-100 hover:bg-tiba-gray-200 rounded-xl transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function CheckInPageContent() {
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'holiday' | 'outsideZone' | 'both';
    action: 'checkIn' | 'checkOut';
    warnings: string[];
  }>({ open: false, type: 'holiday', action: 'checkIn', warnings: [] });

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchAPI('/staff-attendance/my-status');
      setStatus(data);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل حالة الحضور');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get geolocation
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationError('');
      },
      () => {
        setLocationError('لم يتم السماح بتحديد الموقع. يرجى تفعيل GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { loadStatus(); getLocation(); }, [loadStatus, getLocation]);

  // Timer
  useEffect(() => {
    if (status?.todayLog?.checkInTime && !status.todayLog.checkOutTime) {
      const startTime = new Date(status.todayLog.checkInTime).getTime();
      const tick = () => {
        const now = Date.now();
        setElapsed(Math.floor((now - startTime) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      setElapsed(0);
      return undefined;
    }
  }, [status?.todayLog?.checkInTime, status?.todayLog?.checkOutTime]);

  // Check if location is inside zone
  const zoneCheck = location && status?.settings?.zones
    ? checkLocationInZones(location.latitude, location.longitude, status.settings.zones)
    : null;
  const isOutsideZone = zoneCheck ? !zoneCheck.inside : false;
  const isHoliday = status?.isWeeklyOff || !!status?.todayHoliday;

  // Determine if location is required for check-in and check-out separately
  const strictCheckIn = status?.settings?.requireCheckInLocation || false; // منع كامل
  const softCheckIn = !strictCheckIn && (status?.settings?.requireLocation || false); // تنبيه مع إمكانية التجاوز
  const requireCheckInLoc = strictCheckIn || softCheckIn;
  const strictCheckOut = status?.settings?.requireCheckOutLocation || false; // منع كامل
  const requireCheckOutLoc = strictCheckOut;

  // هل الموظف محظور كلياً من التسجيل؟
  const checkInBlocked = strictCheckIn && isOutsideZone;
  const checkOutBlocked = strictCheckOut && isOutsideZone;

  const doCheckIn = async (force = false) => {
    if (requireCheckInLoc && !location) {
      toast.error('يرجى تفعيل تحديد الموقع أولاً');
      getLocation();
      return;
    }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {};
      if (location) {
        body.latitude = location.latitude;
        body.longitude = location.longitude;
        body.address = location.address || '';
      }
      if (force) body.forceCheckIn = true;
      await fetchAPI('/staff-attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('تم تسجيل الحضور بنجاح!');
      setConfirmDialog(d => ({ ...d, open: false }));
      loadStatus();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في تسجيل الحضور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = () => {
    // منع كامل — لا يمكن التجاوز
    if (checkInBlocked) {
      toast.error('أنت خارج نطاق المناطق المسموحة. يجب التواجد في منطقة العمل لتسجيل الحضور');
      return;
    }

    // Check for warnings
    const warnings: string[] = [];
    let needsConfirmation = false;

    if (isHoliday) {
      needsConfirmation = true;
      if (status?.todayHoliday) {
        warnings.push(`اليوم إجازة رسمية: ${status.todayHoliday.name}`);
      }
      if (status?.isWeeklyOff && status.weeklyOffDay) {
        warnings.push(`اليوم هو يوم ${DAY_NAMES_AR[status.weeklyOffDay] || status.weeklyOffDay} وهو يوم عطلة أسبوعية`);
      }
    }

    // softCheckIn فقط — تنبيه مع إمكانية التجاوز
    if (isOutsideZone && softCheckIn) {
      needsConfirmation = true;
      warnings.push(
        `أنت خارج نطاق المناطق المسموحة بمسافة ${formatDistance(zoneCheck?.distance || 0)} عن أقرب منطقة (${zoneCheck?.nearestZone || ''})`
      );
    }

    if (needsConfirmation) {
      const type = isHoliday && isOutsideZone ? 'both' : isHoliday ? 'holiday' : 'outsideZone';
      setConfirmDialog({ open: true, type, action: 'checkIn', warnings });
    } else {
      doCheckIn(false);
    }
  };

  const doCheckOut = async (force = false) => {
    if (requireCheckOutLoc && !location) {
      toast.error('يرجى تفعيل تحديد الموقع أولاً');
      getLocation();
      return;
    }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {};
      if (location) {
        body.latitude = location.latitude;
        body.longitude = location.longitude;
        body.address = location.address || '';
      }
      if (force) body.forceCheckOut = true;
      await fetchAPI('/staff-attendance/check-out', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('تم تسجيل الانصراف بنجاح!');
      setConfirmDialog(d => ({ ...d, open: false }));
      loadStatus();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في تسجيل الانصراف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = () => {
    // منع كامل — لا يمكن التجاوز
    if (checkOutBlocked) {
      toast.error('أنت خارج نطاق المناطق المسموحة. يجب التواجد في منطقة العمل لتسجيل الانصراف');
      return;
    }
    doCheckOut(false);
  };

  if (loading) return <LoadingScreen />;

  const isCheckedIn = status?.todayLog?.checkInTime && !status.todayLog.checkOutTime;
  const isComplete = status?.todayLog?.checkInTime && status.todayLog.checkOutTime;

  // Confirmation dialog props
  const dialogProps = (() => {
    if (confirmDialog.action === 'checkOut') {
      return {
        title: 'انصراف من خارج نطاق العمل',
        description: 'أنت خارج المناطق المسموح بتسجيل الانصراف منها. سيتم تسجيل الانصراف مع ملاحظة بذلك.',
        icon: <ShieldExclamationIcon className="w-8 h-8" />,
        color: 'primary' as const,
        confirmText: 'تسجيل الانصراف رغم الموقع',
      };
    }
    if (confirmDialog.type === 'holiday') {
      return {
        title: 'تسجيل حضور في يوم إجازة',
        description: 'أنت تحاول تسجيل الحضور في يوم إجازة. سيتم تسجيل الحضور مع ملاحظة بذلك.',
        icon: <CalendarDaysIcon className="w-8 h-8" />,
        color: 'primary' as const,
        confirmText: 'تسجيل الحضور رغم الإجازة',
      };
    }
    if (confirmDialog.type === 'outsideZone') {
      return {
        title: 'خارج نطاق العمل المسموح',
        description: 'أنت خارج المناطق المسموح بتسجيل الحضور منها. سيتم تسجيل الحضور مع ملاحظة بذلك.',
        icon: <ShieldExclamationIcon className="w-8 h-8" />,
        color: 'primary' as const,
        confirmText: 'تسجيل الحضور رغم الموقع',
      };
    }
    return {
      title: 'تنبيهات متعددة',
      description: 'يوجد أكثر من تنبيه حول تسجيل حضورك. سيتم تسجيل الحضور مع ملاحظات بذلك.',
      icon: <ExclamationTriangleIcon className="w-8 h-8" />,
      color: 'primary' as const,
      confirmText: 'تسجيل الحضور على أي حال',
    };
  })();

  return (
    <div>
      <PageHeader
        title="تسجيل الحضور والانصراف"
        description="سجل حضورك وانصرافك اليومي"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين', href: '/dashboard/staff-attendance' },
          { label: 'تسجيل الحضور' },
        ]}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={() => confirmDialog.action === 'checkOut' ? doCheckOut(true) : doCheckIn(true)}
        title={dialogProps.title}
        description={dialogProps.description}
        warnings={confirmDialog.warnings}
        confirmText={dialogProps.confirmText}
        icon={dialogProps.icon}
        color={dialogProps.color}
        loading={submitting}
      />

      {!status?.isEnrolled ? (
        <div className="bg-white rounded-2xl border border-tiba-gray-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-tiba-gray-900 mb-2">غير مسجل في نظام الحضور</h3>
          <p className="text-sm text-tiba-gray-500">تواصل مع الإدارة لتسجيلك في نظام حضور الموظفين.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-4">
          
          {/* Holiday / Off-Day Banner */}
          {isHoliday && !isComplete && !isCheckedIn && (
            <div className="bg-gradient-to-l from-tiba-primary-50 to-indigo-50 rounded-2xl border border-tiba-primary-200/80 p-4 shadow-sm animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-tiba-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CalendarDaysIcon className="w-5 h-5 text-tiba-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-tiba-primary-800">اليوم يوم إجازة</h4>
                  {status?.todayHoliday && (
                    <p className="text-xs text-tiba-primary-600 mt-0.5">إجازة رسمية: {status.todayHoliday.name}</p>
                  )}
                  {status?.isWeeklyOff && status.weeklyOffDay && (
                    <p className="text-xs text-tiba-primary-600 mt-0.5">عطلة أسبوعية: يوم {DAY_NAMES_AR[status.weeklyOffDay] || status.weeklyOffDay}</p>
                  )}
                  <p className="text-[11px] text-tiba-primary-500 mt-1.5">يمكنك تسجيل الحضور مع إضافة ملاحظة تلقائية</p>
                </div>
              </div>
            </div>
          )}

          {/* Timer Card */}
          <div className="bg-white rounded-2xl border border-tiba-gray-200 p-6 md:p-8 text-center shadow-sm">
            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 transition-colors duration-300 ${
                isComplete
                  ? 'bg-tiba-secondary-50'
                  : isCheckedIn
                  ? 'bg-tiba-primary-50'
                  : 'bg-tiba-gray-50'
              }`}>
                <ClockIcon className={`w-10 h-10 transition-colors duration-300 ${
                  isComplete
                    ? 'text-tiba-secondary-600'
                    : isCheckedIn
                    ? 'text-tiba-primary-600'
                    : 'text-tiba-gray-400'
                }`} />
              </div>

              {isCheckedIn && (
                <div className="mb-4 animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-xs text-tiba-gray-400 mb-1">مدة العمل الحالية</p>
                  <p className="text-4xl font-bold text-tiba-primary-600 tabular-nums tracking-wider" dir="ltr">
                    {formatDuration(elapsed)}
                  </p>
                </div>
              )}

              {isComplete && (
                <div className="mb-4 animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-xs text-tiba-gray-400 mb-1">إجمالي ساعات العمل</p>
                  <p className="text-2xl font-bold text-tiba-secondary-600">
                    {status.todayLog?.workedMinutes
                      ? `${Math.floor(status.todayLog.workedMinutes / 60)} ساعة و ${status.todayLog.workedMinutes % 60} دقيقة`
                      : '—'
                    }
                  </p>
                </div>
              )}

              <p className="text-sm text-tiba-gray-600">
                {isComplete
                  ? 'تم تسجيل الحضور والانصراف لليوم ✓'
                  : isCheckedIn
                  ? 'أنت مسجل حضور الآن، لا تنسَ تسجيل الانصراف'
                  : 'لم تسجل حضورك بعد اليوم'
                }
              </p>
            </div>

            {/* Time info */}
            {status.todayLog && (
              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div className="bg-tiba-gray-50 rounded-xl p-3">
                  <p className="text-xs text-tiba-gray-400 mb-0.5">وقت الحضور</p>
                  <p className="font-semibold text-tiba-gray-900 tabular-nums">{formatTime(status.todayLog.checkInTime)}</p>
                  {status.todayLog.isLate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium mt-1 bg-amber-50 px-1.5 py-0.5 rounded-md">
                      <ExclamationTriangleIcon className="w-3 h-3" /> متأخر
                    </span>
                  )}
                </div>
                <div className="bg-tiba-gray-50 rounded-xl p-3">
                  <p className="text-xs text-tiba-gray-400 mb-0.5">وقت الانصراف</p>
                  <p className="font-semibold text-tiba-gray-900 tabular-nums">{formatTime(status.todayLog.checkOutTime)}</p>
                </div>
              </div>
            )}

            {/* Work schedule info */}
            {status.settings && (() => {
              const cs = status.customSchedule;
              const hasDaySchedules = cs?.customDaySchedules && Object.keys(cs.customDaySchedules).length > 0;
              const todayDayKey = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date().getDay()];
              const todaySchedule = hasDaySchedules && cs?.customDaySchedules ? cs.customDaySchedules[todayDayKey] : null;
              const hasCustom = hasDaySchedules || cs?.customWorkDays;
              return (
                <div className="space-y-2 mb-6">
                  <div className="bg-tiba-primary-50/50 rounded-xl p-3 text-xs text-tiba-gray-600">
                    <p>مواعيد العمل: <span className="font-semibold text-tiba-primary-700">{status.settings.workStartTime}</span> — <span className="font-semibold text-tiba-primary-700">{status.settings.workEndTime}</span></p>
                    <p className="mt-1">حد التأخير المسموح: <span className="font-semibold">{status.settings.lateThresholdMinutes} دقيقة</span></p>
                    {hasCustom && (
                      <p className="mt-1 text-indigo-600 font-medium">لديك جدول عمل مخصص</p>
                    )}
                  </div>
                  {hasDaySchedules && cs?.customDaySchedules && (
                    <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100">
                      <p className="text-[11px] font-bold text-indigo-700 mb-2 flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        جدولك الأسبوعي
                      </p>
                      <div className="grid grid-cols-7 gap-1">
                        {['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].map(day => {
                          const sched = cs.customDaySchedules![day];
                          const isToday = day === todayDayKey;
                          return (
                            <div key={day} className={`text-center p-1.5 rounded-lg ${isToday ? 'bg-indigo-500 text-white shadow-sm' : sched ? 'bg-white border border-indigo-100' : 'bg-slate-100/60 opacity-50'}`}>
                              <p className={`text-[9px] font-bold ${isToday ? 'text-white' : 'text-slate-600'}`}>{DAY_NAMES_AR[day]?.slice(0, 6)}</p>
                              {sched ? (
                                <p className={`text-[8px] mt-0.5 tabular-nums ${isToday ? 'text-indigo-100' : 'text-slate-400'}`} dir="ltr">{sched.start}</p>
                              ) : (
                                <p className={`text-[8px] mt-0.5 ${isToday ? 'text-indigo-200' : 'text-slate-300'}`}>إجازة</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action buttons */}
            {!isComplete && (
              <div>
                {/* تنبيه المنع الكامل */}
                {((!isCheckedIn && checkInBlocked) || (isCheckedIn && checkOutBlocked)) && (
                  <div className="bg-red-50 rounded-xl border border-red-200 p-3.5 mb-3 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-start gap-2.5">
                      <ShieldExclamationIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700">
                          {!isCheckedIn ? 'لا يمكن تسجيل الحضور من خارج النطاق' : 'لا يمكن تسجيل الانصراف من خارج النطاق'}
                        </p>
                        <p className="text-[11px] text-red-500 mt-1">
                          يجب التواجد في إحدى مناطق العمل المحددة • أقرب منطقة: {zoneCheck?.nearestZone || '\u2014'} ({formatDistance(zoneCheck?.distance || 0)})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isCheckedIn ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={submitting || checkInBlocked || (requireCheckInLoc && !location)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white rounded-xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${
                      checkInBlocked
                        ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                        : isHoliday
                        ? 'bg-gradient-to-l from-tiba-primary-500 to-indigo-600 hover:from-tiba-primary-600 hover:to-indigo-700'
                        : isOutsideZone
                        ? 'bg-gradient-to-l from-tiba-primary-500 to-indigo-500 hover:from-tiba-primary-600 hover:to-indigo-600'
                        : 'bg-gradient-to-l from-tiba-primary-600 to-tiba-primary-700 hover:from-tiba-primary-700 hover:to-tiba-primary-800'
                    }`}
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5" />
                    )}
                    {isHoliday ? 'تسجيل الحضور (يوم إجازة)' : 'تسجيل الحضور'}
                  </button>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    disabled={submitting || checkOutBlocked || (requireCheckOutLoc && !location)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white rounded-xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${
                      checkOutBlocked
                        ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-l from-tiba-primary-600 to-indigo-600 hover:from-tiba-primary-700 hover:to-indigo-700'
                    }`}
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                    )}
                    تسجيل الانصراف
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Location card with zone validation */}
          <div className="bg-white rounded-2xl border border-tiba-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                locationError
                  ? 'bg-amber-50'
                  : location
                  ? zoneCheck?.inside
                    ? 'bg-tiba-secondary-50'
                    : 'bg-orange-50'
                  : 'bg-tiba-gray-50'
              }`}>
                <MapPinIcon className={`w-5 h-5 ${
                  locationError
                    ? 'text-amber-500'
                    : location
                    ? zoneCheck?.inside
                      ? 'text-tiba-secondary-600'
                      : 'text-orange-500'
                    : 'text-tiba-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-tiba-gray-900">الموقع الجغرافي</h3>
                {status?.settings?.requireLocation && (
                  <p className="text-[10px] text-tiba-gray-400">مطلوب لتسجيل الحضور{requireCheckOutLoc ? ' والانصراف' : ''}</p>
                )}
              </div>
            </div>

            {locationError ? (
              <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-100">
                <div className="flex items-start gap-2 text-xs text-amber-700">
                  <SignalSlashIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{locationError}</p>
                    <button onClick={getLocation} className="text-amber-800 font-bold underline mt-1.5 hover:text-amber-900 transition-colors">إعادة المحاولة</button>
                  </div>
                </div>
              </div>
            ) : location ? (
              <div className="space-y-2.5">
                {/* Zone Status */}
                {zoneCheck && (status?.settings?.zones?.length || 0) > 0 && (
                  <div className={`rounded-xl p-3.5 border ${
                    zoneCheck.inside
                      ? 'bg-tiba-secondary-50 border-tiba-secondary-100'
                      : 'bg-tiba-primary-50 border-tiba-primary-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      {zoneCheck.inside ? (
                        <>
                          <SignalIcon className="w-4 h-4 text-tiba-secondary-600" />
                          <div>
                            <p className="text-xs font-bold text-tiba-secondary-700">داخل النطاق المسموح ✓</p>
                            {zoneCheck.nearestZone && (
                              <p className="text-[10px] text-tiba-secondary-500 mt-0.5">
                                المنطقة: {zoneCheck.nearestZone} — البعد: {formatDistance(zoneCheck.distance || 0)}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldExclamationIcon className="w-4 h-4 text-tiba-primary-600" />
                          <div>
                            <p className="text-xs font-bold text-tiba-primary-700">خارج النطاق المسموح</p>
                            <p className="text-[10px] text-tiba-primary-500 mt-0.5">
                              أقرب منطقة: {zoneCheck.nearestZone} — البعد: {formatDistance(zoneCheck.distance || 0)}
                            </p>
                            <p className="text-[10px] text-tiba-primary-400 mt-1">يمكنك التسجيل مع إضافة ملاحظة تلقائية</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Coordinates */}
                <div className="bg-tiba-gray-50 rounded-xl p-3 text-xs text-tiba-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-tiba-secondary-500" />
                    <span className="font-medium text-tiba-gray-600">تم تحديد الموقع بنجاح</span>
                  </div>
                  <p className="mt-1 tabular-nums font-mono text-[10px]" dir="ltr">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                </div>
              </div>
            ) : (
              <div className="bg-tiba-gray-50 rounded-xl p-3.5 text-xs text-tiba-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-tiba-primary-400 border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ تحديد الموقع...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckInPage() {
  return <CheckInPageContent />;
}
