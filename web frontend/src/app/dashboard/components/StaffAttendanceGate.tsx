'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  FingerPrintIcon,
  MapPinIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface StaffZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

interface StaffMyStatus {
  isEnrolled: boolean;
  systemActive?: boolean;
  isWeeklyOff?: boolean;
  weeklyOffDay?: string | null;
  todayHoliday?: { id: string; name: string; date: string } | null;
  todayLog: {
    id: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workedMinutes: number | null;
    isLate: boolean;
    requiredMinutes: number | null;
  } | null;
  settings: {
    workHoursPerDay: number;
    workStartTime: string;
    workEndTime: string;
    lateThresholdMinutes: number;
    requireLocation: boolean;
    requireCheckInLocation?: boolean;
    requireCheckOutLocation?: boolean;
    timezone?: string;
    zones?: StaffZone[];
  } | null;
}

interface StaffAttendanceGateProps {
  currentUserId?: string;
}

interface ZoneCheckResult {
  inside: boolean;
  nearestZone?: string;
  distance?: number;
}

const SKIP_DURATION_MS = 15 * 60 * 1000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkLocationInZones(lat: number, lon: number, zones: StaffZone[]): ZoneCheckResult {
  if (!zones.length) return { inside: true };

  let minDist = Infinity;
  let nearestName = '';

  for (const zone of zones) {
    const dist = haversineDistance(lat, lon, zone.latitude, zone.longitude);
    if (dist <= zone.radius) {
      return { inside: true, nearestZone: zone.name, distance: Math.round(dist) };
    }
    if (dist < minDist) {
      minDist = dist;
      nearestName = zone.name;
    }
  }

  return {
    inside: false,
    nearestZone: nearestName,
    distance: Math.round(minDist),
  };
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} كم`;
  return `${Math.round(meters)} متر`;
}

function parseTimeToMinutes(value?: string): number | null {
  if (!value || !value.includes(':')) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getNowMinutesInTimezone(timezone?: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone || 'Africa/Cairo',
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
  return hour * 60 + minute;
}

function isNowWithinWorkHours(start?: string, end?: string, timezone?: string): boolean {
  const startMins = parseTimeToMinutes(start);
  const endMins = parseTimeToMinutes(end);
  if (startMins === null || endMins === null) return false;

  const nowMins = getNowMinutesInTimezone(timezone);

  if (endMins > startMins) {
    return nowMins >= startMins && nowMins < endMins;
  }

  if (endMins < startMins) {
    return nowMins >= startMins || nowMins < endMins;
  }

  return false;
}

function getSkipStorageKey(userId?: string): string {
  return `staffAttendanceGateSkipUntil:${userId || 'anonymous'}`;
}

async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  if (!navigator.geolocation) {
    const err = new Error('المتصفح الحالي لا يدعم تحديد الموقع الجغرافي') as Error & { hint?: string };
    err.hint = 'استخدم متصفحا أحدث أو فعّل خدمات الموقع في الجهاز ثم أعد المحاولة.';
    throw err;
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geoError) => {
        let message = 'تعذر تحديد الموقع الجغرافي الآن';
        let hint = 'تأكد من تفعيل خدمات الموقع ثم حاول مرة أخرى.';

        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'تم رفض إذن الوصول إلى الموقع';
          hint = 'افتح إعدادات المتصفح وفعّل إذن الموقع لهذا الموقع ثم أعد المحاولة.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'خدمة الموقع غير متاحة حاليا';
          hint = 'تأكد أن GPS أو خدمات تحديد الموقع مفعلة في الجهاز.';
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'انتهت مهلة تحديد الموقع';
          hint = 'حاول مرة أخرى في مكان بإشارة أفضل أو إنترنت أقوى.';
        }

        const err = new Error(message) as Error & { hint?: string };
        err.hint = hint;
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function StaffAttendanceGate({ currentUserId }: StaffAttendanceGateProps) {
  const [status, setStatus] = useState<StaffMyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [skipUntil, setSkipUntil] = useState<number | null>(null);
  const [zoneStatus, setZoneStatus] = useState<ZoneCheckResult | null>(null);
  const [zoneCheckLoading, setZoneCheckLoading] = useState(false);
  const [locationIssue, setLocationIssue] = useState<{
    title: string;
    message: string;
    hint: string;
  } | null>(null);
  const [outsideZoneConfirm, setOutsideZoneConfirm] = useState<{
    open: boolean;
    body: Record<string, unknown> | null;
    nearestZone?: string;
    distance?: number;
  }>({ open: false, body: null });

  const loadSkipUntil = useCallback(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(getSkipStorageKey(currentUserId));
    const parsed = raw ? Number(raw) : NaN;

    if (!Number.isNaN(parsed) && parsed > Date.now()) {
      setSkipUntil(parsed);
    } else {
      localStorage.removeItem(getSkipStorageKey(currentUserId));
      setSkipUntil(null);
    }
  }, [currentUserId]);

  const loadStatus = useCallback(async (forceFresh = false) => {
    try {
      const endpoint = forceFresh
        ? `/staff-attendance/my-status?_t=${Date.now()}`
        : '/staff-attendance/my-status';
      const data = await fetchAPI(endpoint, {
        cache: 'no-store',
      });
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkipUntil();
    loadStatus();
  }, [loadSkipUntil, loadStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadSkipUntil();
      loadStatus();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadSkipUntil, loadStatus]);

  useEffect(() => {
    const onFocus = () => {
      loadSkipUntil();
      loadStatus();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadSkipUntil, loadStatus]);

  useEffect(() => {
    if (!skipUntil) return;
    const remaining = skipUntil - Date.now();

    if (remaining <= 0) {
      loadSkipUntil();
      return;
    }

    const timer = window.setTimeout(() => {
      loadSkipUntil();
      loadStatus();
    }, remaining + 250);

    return () => window.clearTimeout(timer);
  }, [skipUntil, loadSkipUntil, loadStatus]);

  const isHolidayOrDayOff = !!status?.todayHoliday || !!status?.isWeeklyOff;
  const isCheckedIn = !!status?.todayLog?.checkInTime;
  const strictCheckIn = !!status?.settings?.requireCheckInLocation;
  const softCheckIn = !strictCheckIn && !!status?.settings?.requireLocation;
  const locationRequiredForCheckIn = strictCheckIn || softCheckIn;
  const inWorkHours = isNowWithinWorkHours(
    status?.settings?.workStartTime,
    status?.settings?.workEndTime,
    status?.settings?.timezone
  );
  const skipIsActive = !!skipUntil && skipUntil > Date.now();

  const shouldBlock = useMemo(() => {
    if (loading) return false;
    if (!status?.isEnrolled) return false;
    if (status.systemActive === false) return false;
    if (isHolidayOrDayOff) return false;
    if (isCheckedIn) return false;
    if (!inWorkHours) return false;
    if (skipIsActive) return false;
    return true;
  }, [loading, status, isHolidayOrDayOff, isCheckedIn, inWorkHours, skipIsActive]);

  const checkLiveZoneStatus = useCallback(async () => {
    if (!locationRequiredForCheckIn) {
      setZoneStatus(null);
      setZoneCheckLoading(false);
      setLocationIssue(null);
      return;
    }

    try {
      setZoneCheckLoading(true);
      const loc = await getCurrentLocation();
      const zones = status?.settings?.zones || [];
      const result = checkLocationInZones(loc.latitude, loc.longitude, zones);
      setZoneStatus(result);
      setLocationIssue(null);
    } catch (locError: any) {
      setZoneStatus(null);
      setLocationIssue({
        title: 'مشكلة في تفعيل الموقع',
        message: locError?.message || 'تعذر الوصول إلى الموقع الجغرافي',
        hint: locError?.hint || 'يرجى تفعيل خدمة الموقع ومنح الإذن ثم المحاولة مرة أخرى.',
      });
    } finally {
      setZoneCheckLoading(false);
    }
  }, [locationRequiredForCheckIn, status?.settings?.zones]);

  useEffect(() => {
    if (!shouldBlock) return;
    if (!locationRequiredForCheckIn) {
      setZoneStatus(null);
      setZoneCheckLoading(false);
      return;
    }

    void checkLiveZoneStatus();
  }, [shouldBlock, locationRequiredForCheckIn, checkLiveZoneStatus]);

  const handleSkip = () => {
    const until = Date.now() + SKIP_DURATION_MS;
    localStorage.setItem(getSkipStorageKey(currentUserId), String(until));
    setSkipUntil(until);
    toast.success('تم التخطي مؤقتا، ستظهر الشاشة مرة أخرى بعد 15 دقيقة');
  };

  const completeCheckIn = useCallback(async (body: Record<string, unknown>) => {
    try {
      setSubmitting(true);

      await fetchAPI('/staff-attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const nowIso = new Date().toISOString();
      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          todayLog: {
            id: prev.todayLog?.id || 'optimistic-checkin',
            status: 'PRESENT',
            checkInTime: nowIso,
            checkOutTime: null,
            workedMinutes: prev.todayLog?.workedMinutes ?? null,
            isLate: prev.todayLog?.isLate ?? false,
            requiredMinutes: prev.todayLog?.requiredMinutes ?? null,
          },
        };
      });

      setLocationIssue(null);
      toast.success('تم تسجيل الحضور بنجاح');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('staff-attendance:changed', {
            detail: { source: 'dashboard-gate', action: 'check-in' },
          })
        );
      }
      localStorage.removeItem(getSkipStorageKey(currentUserId));
      setSkipUntil(null);
      void loadStatus(true);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تسجيل الحضور الآن');
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId, loadStatus]);

  const handleCheckIn = async () => {
    if (!status?.settings) return;

    try {
      setSubmitting(true);
      setLocationIssue(null);

      const needLocation = strictCheckIn || softCheckIn;

      const body: Record<string, unknown> = {};
      let zoneCheck: ZoneCheckResult | null = null;

      if (needLocation) {
        let loc: { latitude: number; longitude: number };
        try {
          loc = await getCurrentLocation();
        } catch (locError: any) {
          setSubmitting(false);
          setLocationIssue({
            title: 'مشكلة في تفعيل الموقع',
            message: locError?.message || 'تعذر الوصول إلى الموقع الجغرافي',
            hint: locError?.hint || 'يرجى تفعيل خدمة الموقع ومنح الإذن ثم المحاولة مرة أخرى.',
          });
          return;
        }

        body.latitude = loc.latitude;
        body.longitude = loc.longitude;

        const zones = status.settings.zones || [];
        zoneCheck = checkLocationInZones(loc.latitude, loc.longitude, zones);

        if (!zoneCheck.inside) {
          if (strictCheckIn) {
            setSubmitting(false);
            toast.error('أنت خارج نطاق المناطق المسموحة. يجب التواجد في منطقة العمل لتسجيل الحضور');
            return;
          }

          if (softCheckIn) {
            setSubmitting(false);
            setOutsideZoneConfirm({
              open: true,
              body,
              nearestZone: zoneCheck.nearestZone,
              distance: zoneCheck.distance,
            });
            return;
          }
        }
      }

      setSubmitting(false);
      await completeCheckIn(body);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تسجيل الحضور الآن');
      setSubmitting(false);
    }
  };

  const handleForceCheckInOutsideZone = async () => {
    if (!outsideZoneConfirm.body) return;
    const forcedBody = {
      ...outsideZoneConfirm.body,
      forceCheckIn: true,
    };
    setOutsideZoneConfirm({ open: false, body: null });
    await completeCheckIn(forcedBody);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-tiba-primary-200 border-t-tiba-primary-600 animate-spin" />
          <h3 className="text-base font-black text-slate-800 mb-1">جاري التحقق من حالة الحضور</h3>
          <p className="text-sm text-slate-500">يرجى الانتظار لحظات...</p>
        </div>
      </div>
    );
  }

  if (!shouldBlock) return null;

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overflow-x-hidden bg-slate-950 overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.26),transparent_35%),radial-gradient(circle_at_65%_80%,rgba(37,99,235,0.20),transparent_40%)]" />

      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative min-h-[38vh] lg:min-h-screen p-6 sm:p-10 lg:p-14 text-white border-b border-white/10 lg:border-b-0 lg:border-l lg:border-white/10 flex flex-col justify-between">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-14 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute bottom-10 left-0 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-white/90 mb-5">
              <FingerPrintIcon className="w-4 h-4" />
              نظام الانضباط الإداري
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight max-w-2xl">
              تسجيل الحضور
              <span className="text-cyan-200"> شرط أساسي </span>
              لاستخدام لوحة الإدارة
            </h2>

            <p className="mt-4 text-sm sm:text-base lg:text-lg text-white/80 max-w-xl leading-relaxed">
              النظام يضمن التزام أوقات العمل بشكل منطقي وعادل، وتظهر هذه الشاشة فقط للحالات المطلوب منها تسجيل حضور فعلي الآن.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mt-8">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4">
              <p className="text-xs text-white/70 font-semibold mb-1">فترة العمل الحالية</p>
              <p className="text-lg sm:text-2xl font-black text-white" dir="ltr">
                {status?.settings?.workStartTime || '--:--'} - {status?.settings?.workEndTime || '--:--'}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 backdrop-blur-md p-4">
              <p className="text-xs text-rose-100/80 font-semibold mb-1">الحالة الآن</p>
              <p className="text-lg sm:text-2xl font-black text-rose-100">لم يتم تسجيل الحضور بعد</p>
            </div>
          </div>
        </section>

        <section className="bg-white/95 backdrop-blur-xl p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
          <div className="w-full max-w-xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)] p-5 sm:p-7">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">الإجراء المطلوب الآن</h3>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-5">
                <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm sm:text-base text-amber-800 leading-relaxed">
                  يمكنك تسجيل الحضور فورًا أو عمل تخطي مؤقت. في حالة التخطي ستعود هذه الشاشة تلقائيًا بعد 15 دقيقة.
                </p>
              </div>

              {locationRequiredForCheckIn && !locationIssue && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3 mb-5">
                  <MapPinIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm sm:text-base text-blue-800 leading-relaxed mb-2">
                      تسجيل الحضور في حسابك يتطلب تفعيل خدمة الموقع الجغرافي للتحقق من موقعك الحالي.
                    </p>
                    <button
                      onClick={() => void checkLiveZoneStatus()}
                      disabled={submitting || zoneCheckLoading}
                      className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 disabled:opacity-60"
                    >
                      <ArrowPathIcon className={`w-4 h-4 ${zoneCheckLoading ? 'animate-spin' : ''}`} />
                      {zoneCheckLoading ? 'جاري فحص الموقع...' : 'تحديث حالة موقعي'}
                    </button>
                  </div>
                </div>
              )}

              {locationRequiredForCheckIn && !locationIssue && zoneStatus && !zoneStatus.inside && (
                <div className={`rounded-2xl border p-4 mb-5 ${strictCheckIn ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className={`w-5 h-5 shrink-0 mt-0.5 ${strictCheckIn ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="flex-1">
                      <p className={`text-sm sm:text-base font-black mb-1 ${strictCheckIn ? 'text-rose-800' : 'text-amber-800'}`}>
                        خارج النطاق الجغرافي المسموح
                      </p>
                      <p className={`text-sm leading-relaxed ${strictCheckIn ? 'text-rose-700' : 'text-amber-700'}`}>
                        أنت خارج النطاق
                        {zoneStatus.distance !== undefined ? ` بمسافة ${formatDistance(zoneStatus.distance)}` : ''}
                        {zoneStatus.nearestZone ? ` عن أقرب منطقة (${zoneStatus.nearestZone})` : ''}.
                      </p>
                      <p className={`text-xs sm:text-sm leading-relaxed mt-1 ${strictCheckIn ? 'text-rose-700' : 'text-amber-700'}`}>
                        {strictCheckIn
                          ? 'هذا الإعداد إجباري: لن يتم تسجيل الحضور إلا من داخل النطاق المسموح.'
                          : 'هذا الإعداد غير إجباري: يمكنك تسجيل الحضور رغم الموقع وسيتم حفظ ملاحظة بذلك.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {locationRequiredForCheckIn && !locationIssue && zoneStatus?.inside && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-5 flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base text-emerald-800 leading-relaxed">
                    موقعك الحالي داخل نطاق العمل المسموح ويمكنك تسجيل الحضور مباشرة.
                  </p>
                </div>
              )}

              {locationIssue && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <ShieldExclamationIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-black text-rose-800 mb-1">{locationIssue.title}</p>
                      <p className="text-sm text-rose-700 leading-relaxed mb-1">{locationIssue.message}</p>
                      <p className="text-xs sm:text-sm text-rose-600 leading-relaxed">{locationIssue.hint}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void checkLiveZoneStatus()}
                    disabled={submitting}
                    className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-60"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    إعادة محاولة فحص الموقع
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-5 rounded-2xl bg-gradient-to-l from-tiba-primary-700 to-indigo-600 hover:from-tiba-primary-800 hover:to-indigo-700 text-white font-black transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MapPinIcon className="w-5 h-5" />
                  )}
                  تسجيل الحضور الآن
                </button>

                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-5 rounded-2xl border-2 border-slate-300 hover:border-slate-400 text-slate-700 bg-white font-black transition-all disabled:opacity-60"
                >
                  <ClockIcon className="w-5 h-5" />
                  تخطي لمدة 15 دقيقة
                </button>
              </div>

              <button
                onClick={loadStatus}
                disabled={submitting}
                className="mt-5 mx-auto flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                تحديث الحالة
              </button>
            </div>
          </div>
        </section>
      </div>

      {outsideZoneConfirm.open && (
        <div className="absolute inset-0 z-[130] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="w-full max-w-xl rounded-[28px] overflow-hidden border border-white/15 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="relative bg-gradient-to-l from-amber-600 to-orange-500 px-6 py-5 text-white">
              <button
                onClick={() => setOutsideZoneConfirm({ open: false, body: null })}
                className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-3 pl-12">
                <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black mb-1">خارج نطاق العمل المسموح</h3>
                  <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                    أنت خارج النطاق المسموح، ويمكنك المتابعة فقط مع تسجيل ملاحظة إدارية تلقائية.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              {(outsideZoneConfirm.distance !== undefined || outsideZoneConfirm.nearestZone) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5 text-amber-800 text-sm sm:text-base leading-relaxed font-semibold">
                  أنت خارج نطاق المناطق المسموحة
                  {outsideZoneConfirm.distance !== undefined ? ` بمسافة ${formatDistance(outsideZoneConfirm.distance)}` : ''}
                  {outsideZoneConfirm.nearestZone ? ` عن أقرب منطقة (${outsideZoneConfirm.nearestZone})` : ''}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleForceCheckInOutsideZone}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-l from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-black transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MapPinIcon className="w-5 h-5" />
                  )}
                  تسجيل الحضور رغم الموقع
                </button>

                <button
                  onClick={() => setOutsideZoneConfirm({ open: false, body: null })}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center h-12 px-5 rounded-2xl border-2 border-slate-300 hover:border-slate-400 text-slate-700 bg-white font-black transition-all disabled:opacity-60"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}