"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useSettingsSafe } from '@/lib/settings-context';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchComprehensiveDashboard, fetchAPI } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  UsersIcon, AcademicCapIcon, CurrencyDollarIcon, ClockIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon,
  CalendarDaysIcon, BanknotesIcon, UserPlusIcon, DocumentTextIcon,
  EyeIcon, CheckCircleIcon, ExclamationTriangleIcon,
  BuildingOffice2Icon, ClipboardDocumentCheckIcon, MegaphoneIcon,
  MapPinIcon, BookOpenIcon,
  ArrowRightStartOnRectangleIcon,
  FingerPrintIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import StaffAvatar from '@/components/ui/StaffAvatar';

// ============ TYPES ============
interface DashboardData {
  stats: {
    totalTrainees: number;
    activeTrainees: number;
    newTraineesToday: number;
    newTraineesThisMonth: number;
    traineesChangePercent: number;
    totalPrograms: number;
    activePrograms: number;
    attendanceRate: number;
    attendancePresent: number;
    attendanceAbsent: number;
    attendanceLate: number;
    attendanceTotal: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    monthlyNetIncome: number;
    monthlyPaymentsCount: number;
    todayRevenue: number;
    todayPaymentsCount: number;
    revenueChangePercent: number;
    expensesChangePercent: number;
    totalUnpaid: number;
    totalApplications: number;
    newApplicationsToday: number;
    newApplicationsThisMonth: number;
  };
  charts: {
    traineesByStatus: Array<{ name: string; value: number; status: string }>;
    traineesByProgram: Array<{ name: string; value: number }>;
    monthlyRevenueHistory: Array<{ month: string; revenue: number; expenses: number; net: number }>;
    monthlyNewTrainees: Array<{ month: string; count: number }>;
    attendanceBreakdown: Array<{ name: string; value: number; color: string }>;
    applicationsByStatus: Array<{ name: string; value: number }>;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    date: string;
    traineeName: string;
    programName: string;
    method: string;
  }>;
  todaySessionsByProgram: Array<{
    programId: number;
    programName: string;
    sessions: Array<{
      id: number;
      title: string;
      type: string;
      startTime: string;
      endTime: string;
      location: string | null;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      attendanceRate: number;
    }>;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalExcused: number;
    totalRecords: number;
    overallAttendanceRate: number;
  }>;
  recentActivities: Array<{
    id: string;
    time: string;
    title: string;
    description: string;
    color: string;
    userName: string;
    action: string;
    createdAt: string;
  }>;
}

interface StaffZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

interface TodayStaffEmployee {
  user: { id: string; name: string; email: string; photoUrl?: string | null; phone?: string };
  log: {
    id: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workedMinutes: number | null;
    isLate: boolean;
    isEarlyLeave: boolean;
    checkInLatitude: number | null;
    checkInLongitude: number | null;
    checkOutLatitude: number | null;
    checkOutLongitude: number | null;
    checkInZoneName: string | null;
    notes: string | null;
  } | null;
  status: string;
}
interface TodayStaffData {
  date: string;
  employees: TodayStaffEmployee[];
  stats: { total: number; present: number; absent: number; excused: number; notRecorded: number; dayOff: number; onLeave: number; late: number };
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
    locationLatitude?: number | null;
    locationLongitude?: number | null;
    locationRadius?: number;
    zones?: StaffZone[];
  } | null;
}

// Haversine distance in meters
function haversineDistanceDash(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkStaffLocationInZones(lat: number, lon: number, zones: StaffZone[]): { inside: boolean; nearestZone?: string; distance?: number } {
  if (zones.length === 0) return { inside: true };
  let minDist = Infinity;
  let nearestName = '';
  for (const zone of zones) {
    const dist = haversineDistanceDash(lat, lon, zone.latitude, zone.longitude);
    if (dist <= zone.radius) return { inside: true, nearestZone: zone.name, distance: Math.round(dist) };
    if (dist < minDist) { minDist = dist; nearestName = zone.name; }
  }
  return { inside: false, nearestZone: nearestName, distance: Math.round(minDist) };
}

function formatStaffDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} كم`;
  return `${meters} متر`;
}

const DAY_NAMES_AR_DASH: Record<string, string> = {
  SUNDAY: 'الأحد', MONDAY: 'الاثنين', TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء', THURSDAY: 'الخميس', FRIDAY: 'الجمعة', SATURDAY: 'السبت',
};

// ============ CHART COLORS ============
const COLORS = ['#2563EB', '#0D9488', '#D97706', '#E11D48', '#7C3AED', '#DB2777', '#0891B2', '#65A30D'];
const STATUS_COLORS: Record<string, string> = {
  NEW: '#2563EB',
  CURRENT: '#0D9488',
  GRADUATE: '#7C3AED',
  WITHDRAWN: '#E11D48',
};

// ============ FORMATTERS ============
function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} مليون ج.م`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} ألف ج.م`;
  return `${amount.toLocaleString('ar-SA')} ج.م`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('ar-SA');
}

// ============ COMPONENTS ============

function StatCard({ title, value, subtitle, icon, color, link, change, loading }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  link?: string;
  change?: number;
  loading?: boolean;
}) {
  const content = (
    <div className={`relative overflow-hidden bg-white rounded-xl border border-slate-200 p-5 h-full hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-600 mb-1.5">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-md mb-2" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
          )}
          {change !== undefined && change !== 0 && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${change > 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
              {change > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-slate-500 mt-2 truncate">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return link ? <Link href={link}>{content}</Link> : content;
}

function ChartCard({ title, action, children, className = '' }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-slate-900">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
          <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded-lg" />
    </div>
  );
}

// ============ MAIN DASHBOARD ============

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useSettingsSafe() || {};
  const { hasPermission, hasRole, loading: permissionsLoading } = usePermissions();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffStatus, setStaffStatus] = useState<StaffMyStatus | null>(null);
  const [staffStatusLoading, setStaffStatusLoading] = useState(true);
  const [todayStaff, setTodayStaff] = useState<TodayStaffData | null>(null);
  const [todayStaffLoading, setTodayStaffLoading] = useState(true);
  const [selectedStaffEmployee, setSelectedStaffEmployee] = useState<TodayStaffEmployee | null>(null);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [staffElapsed, setStaffElapsed] = useState(0);
  const staffTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [staffLocation, setStaffLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [staffLocationError, setStaffLocationError] = useState('');
  const [staffLocationLoading, setStaffLocationLoading] = useState(false);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [showForceCheckInConfirm, setShowForceCheckInConfirm] = useState<{
    open: boolean;
    type: 'holiday' | 'outsideZone' | 'both';
    warnings: string[];
  }>({ open: false, type: 'holiday', warnings: [] });

  useEffect(() => {
    if (settings?.centerName) {
      document.title = `${settings.centerName} - لوحة التحكم`;
    }
  }, [settings?.centerName]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchComprehensiveDashboard();
      setData(result);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError('تعذر تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Load staff attendance status for employee view
  useEffect(() => {
    const loadStaffStatus = async () => {
      try {
        const data = await fetchAPI('/staff-attendance/my-status');
        setStaffStatus(data);
      } catch {
        setStaffStatus(null);
      } finally {
        setStaffStatusLoading(false);
      }
    };
    loadStaffStatus();
  }, []);

  // Load today's staff attendance for admin widget
  useEffect(() => {
    if (permissionsLoading) return; // Wait for permissions to load first
    if (!hasPermission('staff-attendance', 'view')) {
      setTodayStaffLoading(false);
      return;
    }
    const loadTodayStaff = async () => {
      try {
        const data = await fetchAPI('/staff-attendance/today');
        setTodayStaff(data);
      } catch {
        setTodayStaff(null);
      } finally {
        setTodayStaffLoading(false);
      }
    };
    loadTodayStaff();
  }, [permissionsLoading]);

  // Load pending leave requests for admin widget
  useEffect(() => {
    if (permissionsLoading) return;
    if (!hasPermission('staff-attendance', 'view')) {
      return;
    }
    const loadPendingLeaves = async () => {
      try {
        const data = await fetchAPI('/staff-attendance/leaves?status=PENDING');
        setPendingLeaves(Array.isArray(data) ? data : []);
      } catch {
        setPendingLeaves([]);
      }
    };
    loadPendingLeaves();
  }, [permissionsLoading]);

  // Timer for elapsed work time
  useEffect(() => {
    if (staffStatus?.todayLog?.checkInTime && !staffStatus.todayLog.checkOutTime) {
      const checkInDate = new Date(staffStatus.todayLog.checkInTime);
      const calcElapsed = () => Math.floor((Date.now() - checkInDate.getTime()) / 1000);
      setStaffElapsed(calcElapsed());
      staffTimerRef.current = setInterval(() => setStaffElapsed(calcElapsed()), 1000);
      return () => { if (staffTimerRef.current) clearInterval(staffTimerRef.current); };
    } else {
      setStaffElapsed(0);
      if (staffTimerRef.current) clearInterval(staffTimerRef.current);
    }
  }, [staffStatus]);

  // Get staff GPS location
  const getStaffLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStaffLocationError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setStaffLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStaffLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStaffLocationError('');
        setStaffLocationLoading(false);
      },
      (err) => {
        let msg = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'تم حظر الوصول للموقع من المتصفح';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'خدمة الموقع غير متاحة على هذا الجهاز';
            break;
          case err.TIMEOUT:
            msg = 'انتهت مهلة تحديد الموقع، حاول مرة أخرى';
            break;
          default:
            msg = 'تعذّر تحديد الموقع الجغرافي';
        }
        setStaffLocationError(msg);
        setStaffLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Auto-get location when enrolled
  useEffect(() => {
    if (staffStatus?.isEnrolled) {
      getStaffLocation();
    }
  }, [staffStatus?.isEnrolled, getStaffLocation]);

  const loadStaffStatusFn = useCallback(async () => {
    try {
      const data = await fetchAPI('/staff-attendance/my-status');
      setStaffStatus(data);
    } catch {
      setStaffStatus(null);
    }
  }, []);

  // Handle check-in from dashboard
  const doStaffCheckIn = async (force = false) => {
    if (!staffLocation) {
      setShowLocationHelp(true);
      getStaffLocation();
      return;
    }
    try {
      setStaffSubmitting(true);
      const body: Record<string, unknown> = {
        latitude: staffLocation.latitude,
        longitude: staffLocation.longitude,
      };
      if (force) body.forceCheckIn = true;
      await fetchAPI('/staff-attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('تم تسجيل الحضور بنجاح! ✅');
      setShowForceCheckInConfirm(d => ({ ...d, open: false }));
      loadStaffStatusFn();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في تسجيل الحضور');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleStaffCheckIn = () => {
    if (!staffLocation) {
      setShowLocationHelp(true);
      getStaffLocation();
      return;
    }
    // Check for warnings (holiday + zone)
    const warnings: string[] = [];
    let needsConfirmation = false;
    const staffIsHoliday = staffStatus?.isWeeklyOff || !!staffStatus?.todayHoliday;
    const zones = staffStatus?.settings?.zones || [];
    const zCheck = zones.length > 0 ? checkStaffLocationInZones(staffLocation.latitude, staffLocation.longitude, zones) : null;
    const staffIsOutsideZone = zCheck ? !zCheck.inside : false;

    const strictCheckIn = staffStatus?.settings?.requireCheckInLocation || false;
    const softCheckIn = !strictCheckIn && (staffStatus?.settings?.requireLocation || false);

    // منع كامل — لا يمكن التجاوز
    if (staffIsOutsideZone && strictCheckIn) {
      toast.error('أنت خارج نطاق المناطق المسموحة. يجب التواجد في منطقة العمل لتسجيل الحضور');
      return;
    }

    if (staffIsHoliday) {
      needsConfirmation = true;
      if (staffStatus?.todayHoliday) {
        warnings.push(`اليوم إجازة رسمية: ${staffStatus.todayHoliday.name}`);
      }
      if (staffStatus?.isWeeklyOff && staffStatus.weeklyOffDay) {
        warnings.push(`اليوم هو يوم ${DAY_NAMES_AR_DASH[staffStatus.weeklyOffDay] || staffStatus.weeklyOffDay} وهو يوم عطلة أسبوعية`);
      }
    }

    // softCheckIn فقط — تنبيه مع إمكانية التجاوز
    if (staffIsOutsideZone && softCheckIn) {
      needsConfirmation = true;
      warnings.push(
        `أنت خارج نطاق المناطق المسموحة بمسافة ${formatStaffDistance(zCheck?.distance || 0)} عن أقرب منطقة (${zCheck?.nearestZone || ''})`
      );
    }

    if (needsConfirmation) {
      const confirmType = staffIsHoliday && staffIsOutsideZone ? 'both' : staffIsHoliday ? 'holiday' : 'outsideZone';
      setShowForceCheckInConfirm({ open: true, type: confirmType, warnings });
    } else {
      doStaffCheckIn(false);
    }
  };

  // Handle check-out from dashboard (with early leave confirmation)
  const handleStaffCheckOut = async (force = false) => {
    // يجب تحديد الموقع دائماً قبل تسجيل الانصراف
    if (!staffLocation) {
      setShowLocationHelp(true);
      getStaffLocation();
      return;
    }

    // التحقق من إلزام الموقع عند الانصراف
    const strictCheckOut = staffStatus?.settings?.requireCheckOutLocation || false;
    if (strictCheckOut) {
      const zones = staffStatus?.settings?.zones || [];
      const zCheck = zones.length > 0 ? checkStaffLocationInZones(staffLocation.latitude, staffLocation.longitude, zones) : null;
      if (zCheck && !zCheck.inside) {
        toast.error('أنت خارج نطاق المناطق المسموحة. يجب التواجد في منطقة العمل لتسجيل الانصراف');
        return;
      }
    }

    // Always show confirmation dialog unless forced
    if (!force) {
      setShowCheckoutConfirm(true);
      return;
    }
    try {
      setStaffSubmitting(true);
      setShowCheckoutConfirm(false);
      const body: Record<string, unknown> = {
        latitude: staffLocation.latitude,
        longitude: staffLocation.longitude,
      };
      await fetchAPI('/staff-attendance/check-out', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('تم تسجيل الانصراف بنجاح! ✅');
      loadStaffStatusFn();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في تسجيل الانصراف');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatStaffTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // Permission helpers
  const canViewTrainees = hasPermission('dashboard.trainees', 'view');
  const canViewFinancial = hasPermission('dashboard.financial', 'view');
  const canViewAttendance = hasPermission('dashboard.attendance', 'view');
  const canViewPrograms = hasPermission('dashboard.programs', 'view');
  const canViewMarketing = hasPermission('marketing.applications', 'view');
  const canViewReports = hasPermission('dashboard.reports', 'view');
  const canViewAuditLogs = hasPermission('dashboard.audit-logs', 'view');
  const canViewStatistics = hasPermission('dashboard.statistics', 'view');
  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const stats = data?.stats;
  const charts = data?.charts;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5 sm:space-y-6" dir="rtl">

      {/* ============ HEADER ============ */}
      {error && !loading && (
        <div className="flex justify-end">
          <button 
            onClick={loadDashboard} 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ============ STAFF ATTENDANCE OVERVIEW (TOP — FOR ADMINS) ============ */}
      {/* Loading state */}
      {hasPermission('staff-attendance', 'view') && todayStaffLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-24" />
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 mt-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="h-3 bg-slate-100 rounded w-14" />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Data loaded */}
      {hasPermission('staff-attendance', 'view') && !todayStaffLoading && todayStaff && todayStaff.employees.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header with stats */}
          <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 p-4 sm:p-5 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
            </div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">حضور الموظفين اليوم</h3>
                  <p className="text-white/60 text-xs mt-0.5">{todayStaff.stats.total} موظف مسجل في النظام</p>
                </div>
              </div>
              <Link href="/dashboard/staff-attendance" className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all">
                لوحة الحضور الكاملة ←
              </Link>
            </div>

            {/* Quick Stats Badges */}
            <div className="relative flex flex-wrap items-center gap-2 sm:gap-3 mt-3 pt-3 border-t border-white/20">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                {todayStaff.stats.present} حاضر
              </span>
              {todayStaff.stats.absent > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-400/20 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-red-400/30" />
                  {todayStaff.stats.absent} غائب
                </span>
              )}
              {todayStaff.stats.late > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
                  {todayStaff.stats.late} متأخر
                </span>
              )}
              {todayStaff.stats.excused > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-400/20 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
                  {todayStaff.stats.excused} إذن
                </span>
              )}
              {todayStaff.stats.notRecorded > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/50 ring-2 ring-white/20" />
                  {todayStaff.stats.notRecorded} لم يسجل
                </span>
              )}
              {(todayStaff.stats.dayOff ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-400/20 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-400/30" />
                  {todayStaff.stats.dayOff} يوم عطلة
                </span>
              )}
              {(todayStaff.stats.onLeave ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-400/20 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 ring-2 ring-purple-400/30" />
                  {todayStaff.stats.onLeave} في إجازة
                </span>
              )}
              {/* Pending leave requests badge */}
              {pendingLeaves.length > 0 && (
                <Link href="/dashboard/staff-attendance/leaves" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/25 text-white hover:bg-amber-400/40 transition-all mr-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30 animate-pulse" />
                  {pendingLeaves.length} طلب إجازة معلق
                  <ChevronLeftIcon className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Employee Photo Grid */}
          <div className="p-4 sm:p-5">
            {(() => {
              const MOBILE_LIMIT = 6;
              const allEmps = todayStaff.employees;
              const hasMore = allEmps.length > MOBILE_LIMIT;
              return (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                    {/* On mobile: show limited, on sm+: show all */}
                    {allEmps.map((emp, idx) => (
                      <button
                        key={emp.user.id}
                        onClick={() => setSelectedStaffEmployee(emp)}
                        className={`flex flex-col items-center gap-1.5 group p-2 rounded-xl hover:bg-slate-50 hover:shadow-md border-2 border-transparent hover:border-tiba-primary-200 transition-all duration-200 hover:-translate-y-0.5 ${
                          !showAllStaff && idx >= MOBILE_LIMIT ? 'hidden sm:flex' : 'flex'
                        }`}
                        title={emp.user.name}
                      >
                        <div className="relative">
                          <StaffAvatar
                            name={emp.user.name}
                            photoUrl={emp.user.photoUrl}
                            size="lg"
                            status={emp.status}
                            showStatusRing
                          />
                          {/* Status dot with color */}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            emp.status === 'PRESENT' ? 'bg-emerald-500' :
                            emp.status === 'ABSENT_UNEXCUSED' ? 'bg-red-500' :
                            emp.status === 'ABSENT_EXCUSED' ? 'bg-teal-500':
                            emp.status === 'LEAVE' ? 'bg-teal-500':
                            emp.status === 'LATE' ? 'bg-amber-500' :
                            emp.status === 'DAY_OFF' ? 'bg-blue-400' :
                            emp.status === 'ON_LEAVE' ? 'bg-purple-500' :
                            'bg-slate-300'
                          }`} />
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="text-[11px] font-semibold text-slate-700 group-hover:text-tiba-primary-600 transition-colors leading-tight line-clamp-2">
                            {emp.user.name.split(' ').slice(0, 2).join(' ')}
                          </p>
                          {emp.status === 'DAY_OFF' ? (
                            <p className="text-[9px] text-blue-400 mt-0.5 font-medium">ليس يوم عمل</p>
                          ) : emp.status === 'ON_LEAVE' ? (
                            <p className="text-[9px] text-purple-500 mt-0.5 font-medium">في إجازة</p>
                          ) : (emp.status === 'LEAVE' || emp.status === 'ABSENT_EXCUSED') ? (
                            <p className="text-[9px] text-teal-500 mt-0.5 font-medium">إذن</p>
                          ) : emp.log?.checkInTime ? (
                            <p className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
                              {formatStaffTime(emp.log.checkInTime)}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Show More / Show Less - only visible on mobile */}
                  {hasMore && (
                    <button
                      onClick={() => setShowAllStaff(!showAllStaff)}
                      className="sm:hidden w-full mt-3 py-2 text-xs font-semibold text-tiba-primary-600 bg-tiba-primary-50 hover:bg-tiba-primary-100 border border-tiba-primary-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      {showAllStaff ? (
                        <>
                          <ChevronUpIcon className="w-4 h-4" />
                          عرض أقل
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="w-4 h-4" />
                          عرض المزيد ({allEmps.length - MOBILE_LIMIT} موظف آخر)
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}

            {/* Attendance Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              {(() => {
                const dayOffCount = todayStaff.stats.dayOff ?? 0;
                const onLeaveCount = todayStaff.stats.onLeave ?? 0;
                const activeTotal = todayStaff.stats.total - dayOffCount - onLeaveCount;
                const attendancePercent = activeTotal > 0 ? Math.round((todayStaff.stats.present / activeTotal) * 100) : 0;
                return (
                  <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span>نسبة الحضور {(dayOffCount > 0 || onLeaveCount > 0) ? <span className="text-blue-400">(بدون العطلات والإجازات)</span> : ''}</span>
                    <span className="font-bold text-slate-700">{attendancePercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    {todayStaff.stats.present > 0 && (
                      <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(todayStaff.stats.present / todayStaff.stats.total) * 100}%` }} title={`حاضر: ${todayStaff.stats.present}`} />
                    )}
                    {todayStaff.stats.late > 0 && (
                      <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${(todayStaff.stats.late / todayStaff.stats.total) * 100}%` }} title={`متأخر: ${todayStaff.stats.late}`} />
                    )}
                    {todayStaff.stats.absent > 0 && (
                      <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${(todayStaff.stats.absent / todayStaff.stats.total) * 100}%` }} title={`غائب: ${todayStaff.stats.absent}`} />
                    )}
                    {todayStaff.stats.excused > 0 && (
                      <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${(todayStaff.stats.excused / todayStaff.stats.total) * 100}%` }} title={`إذن: ${todayStaff.stats.excused}`} />
                    )}
                    {dayOffCount > 0 && (
                      <div className="h-full bg-blue-300 transition-all duration-700" style={{ width: `${(dayOffCount / todayStaff.stats.total) * 100}%` }} title={`يوم عطلة: ${dayOffCount}`} />
                    )}
                    {onLeaveCount > 0 && (
                      <div className="h-full bg-purple-400 transition-all duration-700" style={{ width: `${(onLeaveCount / todayStaff.stats.total) * 100}%` }} title={`في إجازة: ${onLeaveCount}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> حاضر</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> متأخر</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-red-500" /> غائب</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-teal-500" /> إذن</span>
                    {dayOffCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-300" /> يوم عطلة</span>
                    )}
                    {onLeaveCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-purple-500"><span className="w-2 h-2 rounded-full bg-purple-400" /> في إجازة</span>
                    )}
                  </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedStaffEmployee && (() => {
        const _log = selectedStaffEmployee.log;
        const _hasCheckInLoc = !!(_log?.checkInLatitude && _log?.checkInLongitude);
        const _hasCheckOutLoc = !!(_log?.checkOutLatitude && _log?.checkOutLongitude);
        const _hasAnyLoc = _hasCheckInLoc || _hasCheckOutLoc;
        const _statusColor = selectedStaffEmployee.status === 'PRESENT' ? 'emerald' :
          selectedStaffEmployee.status === 'ABSENT_UNEXCUSED' ? 'red' :
          selectedStaffEmployee.status === 'NOT_RECORDED' ? 'slate' :
          selectedStaffEmployee.status === 'LATE' ? 'amber' :
          selectedStaffEmployee.status === 'DAY_OFF' ? 'blue' :
          selectedStaffEmployee.status === 'ON_LEAVE' ? 'purple' :
          (selectedStaffEmployee.status === 'LEAVE' || selectedStaffEmployee.status === 'ABSENT_EXCUSED') ? 'teal' : 'indigo';
        const _statusGradient = selectedStaffEmployee.status === 'PRESENT' ? 'from-emerald-500 to-teal-600' :
          selectedStaffEmployee.status === 'ABSENT_UNEXCUSED' ? 'from-red-500 to-rose-600' :
          selectedStaffEmployee.status === 'NOT_RECORDED' ? 'from-slate-400 to-slate-500' :
          selectedStaffEmployee.status === 'LATE' ? 'from-amber-500 to-orange-600' :
          selectedStaffEmployee.status === 'DAY_OFF' ? 'from-blue-400 to-blue-500' :
          selectedStaffEmployee.status === 'ON_LEAVE' ? 'from-purple-500 to-violet-600' :
          (selectedStaffEmployee.status === 'LEAVE' || selectedStaffEmployee.status === 'ABSENT_EXCUSED') ? 'from-teal-500 to-cyan-600' :
          'from-tiba-primary-500 to-indigo-600';
        const _statusLabel = selectedStaffEmployee.status === 'PRESENT' ? 'حاضر' :
          selectedStaffEmployee.status === 'ABSENT_UNEXCUSED' ? 'غائب بدون إذن' :
          selectedStaffEmployee.status === 'ABSENT_EXCUSED' ? 'إذن' :
          selectedStaffEmployee.status === 'LEAVE' ? 'إذن' :
          selectedStaffEmployee.status === 'LATE' ? 'متأخر' :
          selectedStaffEmployee.status === 'NOT_RECORDED' ? 'لم يسجل بعد' :
          selectedStaffEmployee.status === 'DAY_OFF' ? 'ليس يوم عمل' :
          selectedStaffEmployee.status === 'ON_LEAVE' ? 'في إجازة' :
          selectedStaffEmployee.status;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStaffEmployee(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Compact Header */}
            <div className={`relative px-4 py-3 bg-gradient-to-br ${_statusGradient} flex items-center gap-3 flex-shrink-0`}>
              <StaffAvatar
                name={selectedStaffEmployee.user.name}
                photoUrl={selectedStaffEmployee.user.photoUrl}
                size="md"
                status={selectedStaffEmployee.status}
                showStatusRing
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{selectedStaffEmployee.user.name}</h3>
                <p className="text-[11px] text-white/70 truncate">{selectedStaffEmployee.user.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm">
                  <span className={`w-1.5 h-1.5 rounded-full bg-${_statusColor}-300`} />
                  {_statusLabel}
                </span>
                <button onClick={() => setSelectedStaffEmployee(null)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-4">
              {_log ? (
                <div className="lg:grid lg:grid-cols-2 lg:gap-4">
                  {/* Left Column: Times & Stats */}
                  <div>
                    {/* Check-in / Check-out times */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <ArrowRightOnRectangleIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-medium">الحضور</span>
                        </div>
                        <p className="text-base font-bold text-emerald-700 tabular-nums" dir="ltr">
                          {_log.checkInTime
                            ? new Date(_log.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-[10px] text-rose-600 font-medium">الانصراف</span>
                        </div>
                        <p className="text-base font-bold text-rose-700 tabular-nums" dir="ltr">
                          {_log.checkOutTime
                            ? new Date(_log.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Zone name */}
                    {_log.checkInZoneName && (
                      <div className="bg-tiba-primary-50 border border-tiba-primary-100 rounded-lg p-2 mb-3 flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4 text-tiba-primary-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-tiba-primary-600 font-medium">نقطة الحضور</p>
                          <p className="text-xs font-bold text-tiba-primary-700">{_log.checkInZoneName}</p>
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-slate-500 mb-0.5">ساعات العمل</p>
                        <p className="text-xs font-bold text-slate-700">
                          {_log.workedMinutes !== null
                            ? `${Math.floor(_log.workedMinutes / 60)}س ${_log.workedMinutes % 60}د`
                            : '—'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-slate-500 mb-0.5">التأخير</p>
                        <p className={`text-xs font-bold ${_log.isLate ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {_log.isLate ? 'متأخر' : 'في الوقت'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-slate-500 mb-0.5">مبكر</p>
                        <p className={`text-xs font-bold ${_log.isEarlyLeave ? 'text-orange-600' : 'text-slate-400'}`}>
                          {_log.isEarlyLeave ? 'نعم' : 'لا'}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {_log.notes && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
                        <p className="text-[10px] text-amber-600 font-medium mb-0.5">ملاحظات</p>
                        <p className="text-xs text-amber-700 leading-relaxed">{_log.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Locations */}
                  <div>
                    {_hasAnyLoc ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-tiba-primary-500" />
                          <p className="text-xs font-semibold text-slate-700">مواقع التسجيل</p>
                        </div>

                        {/* Check-in Location */}
                        {_hasCheckInLoc && (
                          <div className="rounded-xl border border-emerald-200 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-b border-emerald-200">
                              <ArrowRightOnRectangleIcon className="w-3 h-3 text-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-700">موقع الحضور</span>
                              <span className="text-[10px] text-emerald-500 mr-auto tabular-nums" dir="ltr">
                                {_log.checkInLatitude!.toFixed(5)}, {_log.checkInLongitude!.toFixed(5)}
                              </span>
                            </div>
                            <iframe
                              width="100%" height="130" style={{ border: 0 }} loading="lazy"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${_log.checkInLongitude! - 0.003},${_log.checkInLatitude! - 0.002},${_log.checkInLongitude! + 0.003},${_log.checkInLatitude! + 0.002}&layer=mapnik&marker=${_log.checkInLatitude},${_log.checkInLongitude}`}
                            />
                            <div className="flex items-center justify-end bg-emerald-50 px-3 py-1 border-t border-emerald-200">
                              <a href={`https://www.google.com/maps?q=${_log.checkInLatitude},${_log.checkInLongitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1">
                                <MapPinIcon className="w-3 h-3" />
                                عرض على الخريطة ↗
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Check-out Location */}
                        {_hasCheckOutLoc && (
                          <div className="rounded-xl border border-rose-200 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border-b border-rose-200">
                              <ArrowLeftOnRectangleIcon className="w-3 h-3 text-rose-500" />
                              <span className="text-[10px] font-semibold text-rose-700">موقع الانصراف</span>
                              <span className="text-[10px] text-rose-500 mr-auto tabular-nums" dir="ltr">
                                {_log.checkOutLatitude!.toFixed(5)}, {_log.checkOutLongitude!.toFixed(5)}
                              </span>
                            </div>
                            <iframe
                              width="100%" height="130" style={{ border: 0 }} loading="lazy"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${_log.checkOutLongitude! - 0.003},${_log.checkOutLatitude! - 0.002},${_log.checkOutLongitude! + 0.003},${_log.checkOutLatitude! + 0.002}&layer=mapnik&marker=${_log.checkOutLatitude},${_log.checkOutLongitude}`}
                            />
                            <div className="flex items-center justify-end bg-rose-50 px-3 py-1 border-t border-rose-200">
                              <a href={`https://www.google.com/maps?q=${_log.checkOutLatitude},${_log.checkOutLongitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1">
                                <MapPinIcon className="w-3 h-3" />
                                عرض على الخريطة ↗
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <MapPinIcon className="w-8 h-8 text-slate-300 mb-1.5" />
                        <p className="text-xs text-slate-400 font-medium">لا توجد بيانات موقع</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                    <ClockIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">لم يسجل الحضور بعد</p>
                  <p className="text-xs text-slate-400 mt-0.5">هذا الموظف لم يسجل حضوره اليوم</p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 p-3 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/dashboard/staff-attendance/employees/${selectedStaffEmployee.user.id}`}
                  onClick={() => setSelectedStaffEmployee(null)}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-gradient-to-l from-tiba-primary-600 to-indigo-600 rounded-xl hover:from-tiba-primary-700 hover:to-indigo-700 transition-all shadow-sm active:scale-[0.98]"
                >
                  <DocumentTextIcon className="w-3.5 h-3.5" />
                  سجل الحضور
                </Link>
                <Link
                  href="/dashboard/staff-attendance/logs"
                  onClick={() => setSelectedStaffEmployee(null)}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-tiba-primary-600 bg-white border border-tiba-primary-200 rounded-xl hover:bg-tiba-primary-50 transition-all active:scale-[0.98]"
                >
                  <ClockIcon className="w-3.5 h-3.5" />
                  السجلات
                </Link>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ============ MAIN STATS CARDS ============ */}
      {canViewStatistics ? (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {canViewTrainees && (
                <StatCard
                  title="إجمالي المتدربين"
                  value={formatNumber(stats?.totalTrainees || 0)}
                  subtitle={`${stats?.activeTrainees || 0} نشط · ${stats?.newTraineesThisMonth || 0} هذا الشهر`}
                  icon={<UsersIcon className="w-5 h-5 text-blue-600" />}
                  color="bg-blue-50"
                  change={stats?.traineesChangePercent}
                />
              )}
              {canViewFinancial && (
                <StatCard
                  title="إيرادات الشهر"
                  value={formatCurrency(stats?.monthlyRevenue || 0)}
                  subtitle={`${stats?.monthlyPaymentsCount || 0} عملية · اليوم: ${formatCurrency(stats?.todayRevenue || 0)}`}
                  icon={<BanknotesIcon className="w-5 h-5 text-amber-600" />}
                  color="bg-amber-50"
                  change={stats?.revenueChangePercent}
                />
              )}
              {canViewFinancial && (
                <StatCard
                  title="مصروفات الشهر"
                  value={formatCurrency(stats?.monthlyExpenses || 0)}
                  icon={<ArrowTrendingDownIcon className="w-5 h-5 text-rose-600" />}
                  color="bg-rose-50"
                  change={stats?.expensesChangePercent}
                />
              )}
            </div>
          )}

          {/* ============ SECONDARY STATS ============ */}
          {!loading && (canViewMarketing || canViewFinancial) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {canViewMarketing && (
                <StatCard
                  title="تقديمات اليوم"
                  value={formatNumber(stats?.newApplicationsToday || 0)}
                  subtitle={`إجمالي الشهر: ${formatNumber(stats?.newApplicationsThisMonth || 0)}`}
                  icon={<MegaphoneIcon className="w-5 h-5 text-pink-600" />}
                  color="bg-pink-50"
                />
              )}
              {canViewFinancial && (
                <>
                  <StatCard
                    title="غير مسدد"
                    value={formatCurrency(stats?.totalUnpaid || 0)}
                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />}
                    color="bg-rose-50"
                  />
                  <StatCard
                    title="مسددين اليوم"
                    value={formatNumber(stats?.todayPaymentsCount || 0)}
                    subtitle={formatCurrency(stats?.todayRevenue || 0)}
                    icon={<CurrencyDollarIcon className="w-5 h-5 text-teal-600" />}
                    color="bg-teal-50"
                  />
                </>
              )}
            </div>
          )}

          {/* ============ CHARTS ROW 1 ============ */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <SkeletonChart />
              <SkeletonChart />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {canViewFinancial && charts?.monthlyRevenueHistory && charts.monthlyRevenueHistory.length > 0 && (
            <ChartCard title="الإيرادات والمصروفات (آخر 6 أشهر)">
              <div className="-mx-2 sm:mx-0">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={charts.monthlyRevenueHistory} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E11D48" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)} ألف` : v} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = { revenue: 'الإيرادات', expenses: 'المصروفات' };
                        return [formatCurrency(value), labels[name] || name];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', direction: 'rtl' }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const labels: Record<string, string> = { revenue: 'الإيرادات', expenses: 'المصروفات' };
                        return <span className="text-xs text-slate-600">{labels[value] || value}</span>;
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revenueGradient)" />
                    <Area type="monotone" dataKey="expenses" stroke="#E11D48" strokeWidth={1.5} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {canViewTrainees && charts?.monthlyNewTrainees && charts.monthlyNewTrainees.length > 0 && (
            <ChartCard 
              title="المتدربون الجدد شهرياً"
              action={
                <Link href="/dashboard/trainees" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  عرض الكل
                </Link>
              }
            >
              <div className="-mx-2 sm:mx-0">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.monthlyNewTrainees} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(value: number) => [value, 'متدرب']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', direction: 'rtl' }}
                    />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* ============ CHARTS ROW 2 ============ */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {canViewTrainees && charts?.traineesByStatus && charts.traineesByStatus.length > 0 && (
            <ChartCard title="المتدربون حسب الحالة">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={charts.traineesByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.traineesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), 'متدرب']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', direction: 'rtl' }}
                  />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {canViewAttendance && charts?.attendanceBreakdown && charts.attendanceBreakdown.some(a => a.value > 0) && (
            <ChartCard title="توزيع الحضور هذا الشهر">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={charts.attendanceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.attendanceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), 'سجل']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', direction: 'rtl' }}
                  />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {canViewPrograms && charts?.traineesByProgram && charts.traineesByProgram.length > 0 && (
            <ChartCard title="المتدربون حسب البرنامج">
              <div className="-mx-2 sm:mx-0">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.traineesByProgram} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={90}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '..' : v}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatNumber(value), 'متدرب']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', direction: 'rtl' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {charts.traineesByProgram.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}

          {/* ============ STAFF ATTENDANCE WIDGET (FOR ADMINS) ============ */}
          {!staffStatusLoading && staffStatus?.isEnrolled && (() => {
            const adminZones = staffStatus?.settings?.zones || [];
            const adminZoneCheck = staffLocation && adminZones.length > 0
              ? checkStaffLocationInZones(staffLocation.latitude, staffLocation.longitude, adminZones)
              : null;
            const adminIsOutsideZone = adminZoneCheck ? !adminZoneCheck.inside : false;
            const adminIsHoliday = staffStatus?.isWeeklyOff || !!staffStatus?.todayHoliday;
            const adminStrictCheckIn = staffStatus?.settings?.requireCheckInLocation || false;
            const adminStrictCheckOut = staffStatus?.settings?.requireCheckOutLocation || false;
            const adminCheckInBlocked = adminStrictCheckIn && adminIsOutsideZone;
            const adminCheckOutBlocked = adminStrictCheckOut && adminIsOutsideZone;
            return (
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                adminIsHoliday
                  ? 'bg-gradient-to-l from-amber-400 via-orange-400 to-amber-400'
                  : staffStatus.todayLog?.checkOutTime
                  ? 'bg-gradient-to-l from-blue-400 via-indigo-400 to-violet-400'
                  : staffStatus.todayLog?.checkInTime
                  ? 'bg-gradient-to-l from-teal-400 via-emerald-400 to-green-400'
                  : 'bg-gradient-to-l from-blue-400 via-indigo-400 to-violet-400'
              }`} />
              <div className="p-5 sm:p-6 pt-6">
                {/* Holiday Banner (admin) */}
                {adminIsHoliday && !staffStatus.todayLog?.checkOutTime && !staffStatus.todayLog?.checkInTime && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-700">
                    <CalendarDaysIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-800">اليوم يوم إجازة</span>
                      {staffStatus?.todayHoliday && <span className="text-amber-600"> — {staffStatus.todayHoliday.name}</span>}
                      {staffStatus?.isWeeklyOff && staffStatus.weeklyOffDay && <span className="text-amber-600"> — عطلة {DAY_NAMES_AR_DASH[staffStatus.weeklyOffDay] || staffStatus.weeklyOffDay}</span>}
                      <span className="text-amber-500 mr-1">· يمكنك التسجيل مع ملاحظة</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  {/* Left: Status + Timer */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      staffStatus.todayLog?.checkOutTime ? 'bg-blue-50' : staffStatus.todayLog?.checkInTime ? 'bg-teal-50' : 'bg-indigo-50'
                    }`}>
                      <FingerPrintIcon className={`w-6 h-6 ${
                        staffStatus.todayLog?.checkOutTime ? 'text-blue-600' : staffStatus.todayLog?.checkInTime ? 'text-teal-600' : 'text-indigo-600'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-900">حضورك اليوم</h3>
                        {staffStatus.todayLog?.checkInTime && !staffStatus.todayLog.checkOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold rounded-full">
                            <span className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" />
                            في العمل
                          </span>
                        ) : staffStatus.todayLog?.checkOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold rounded-full">
                            اكتمل ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold rounded-full">
                            لم يُسجَّل
                          </span>
                        )}
                      </div>
                      {staffStatus.todayLog?.checkInTime && !staffStatus.todayLog.checkOutTime ? (
                        <p className="text-2xl font-mono font-bold text-teal-600 tracking-wider" dir="ltr">{formatElapsed(staffElapsed)}</p>
                      ) : staffStatus.todayLog?.checkOutTime ? (
                        <p className="text-sm text-slate-600">
                          {staffStatus.todayLog.workedMinutes 
                            ? `${Math.floor(staffStatus.todayLog.workedMinutes / 60)}س ${staffStatus.todayLog.workedMinutes % 60}د`
                            : 'تم الانصراف'}
                          <span className="text-slate-400 mx-2">·</span>
                          {formatStaffTime(staffStatus.todayLog.checkInTime)} — {formatStaffTime(staffStatus.todayLog.checkOutTime)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">الدوام: {staffStatus.settings?.workStartTime} — {staffStatus.settings?.workEndTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Location + Action */}
                  <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
                    {/* Location indicator with zone check */}
                    {staffLocation ? (
                      adminZoneCheck && adminZones.length > 0 ? (
                        adminZoneCheck.inside ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-teal-50 text-teal-600" title={`${adminZoneCheck.nearestZone || ''} — ${formatStaffDistance(adminZoneCheck.distance || 0)}`}>
                            <SignalIcon className="w-3.5 h-3.5" />
                            داخل النطاق ✓
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-orange-50 text-orange-600 border border-orange-200" title={`أقرب منطقة: ${adminZoneCheck.nearestZone} — ${formatStaffDistance(adminZoneCheck.distance || 0)}`}>
                            <ShieldExclamationIcon className="w-3.5 h-3.5" />
                            خارج النطاق
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-teal-50 text-teal-600">
                          <MapPinIcon className="w-3.5 h-3.5" />
                          GPS ✓
                        </div>
                      )
                    ) : staffLocationError ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-red-50 text-red-600">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        لا GPS
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-slate-50 text-slate-500">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        ...
                      </div>
                    )}

                    {/* Action button */}
                    {!staffStatus.todayLog?.checkOutTime && (
                      !staffStatus.todayLog?.checkInTime ? (
                        <button
                          onClick={handleStaffCheckIn}
                          disabled={staffSubmitting || !staffLocation || adminCheckInBlocked}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98] ${
                            adminCheckInBlocked
                              ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                              : adminIsHoliday
                              ? 'bg-gradient-to-l from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                              : adminIsOutsideZone
                              ? 'bg-gradient-to-l from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600'
                              : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          }`}
                        >
                          {staffSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FingerPrintIcon className="w-4 h-4" />
                          )}
                          {adminCheckInBlocked ? 'خارج النطاق' : adminIsHoliday ? 'حضور (إجازة)' : 'تسجيل الحضور'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStaffCheckOut(false)}
                          disabled={staffSubmitting || !staffLocation || adminCheckOutBlocked}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98] ${
                            adminCheckOutBlocked
                              ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                              : 'bg-gradient-to-l from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600'
                          }`}
                        >
                          {staffSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                          )}
                          {adminCheckOutBlocked ? 'خارج النطاق' : 'تسجيل الانصراف'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}
        </>
      ) : (
        /* ============ ALTERNATIVE CONTENT FOR USERS WITHOUT STATISTICS PERMISSION ============ */
        <div className="space-y-5">
          {/* Welcome Banner */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-5 sm:px-6 sm:py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-slate-600">{user?.name?.charAt(0) || '👋'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">مرحباً، {user?.name || 'مستخدم'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">يمكنك الوصول للأقسام المتاحة لك من الروابط أدناه</p>
              </div>
            </div>
          </div>

          {/* Staff Attendance Widget - Inline Check-in/Check-out */}
          {!staffStatusLoading && staffStatus?.isEnrolled ? (() => {
            const empZones = staffStatus?.settings?.zones || [];
            const empZoneCheck = staffLocation && empZones.length > 0
              ? checkStaffLocationInZones(staffLocation.latitude, staffLocation.longitude, empZones)
              : null;
            const empIsOutsideZone = empZoneCheck ? !empZoneCheck.inside : false;
            const empIsHoliday = staffStatus?.isWeeklyOff || !!staffStatus?.todayHoliday;
            const empStrictCheckIn = !!staffStatus?.settings?.requireCheckInLocation;
            const empStrictCheckOut = !!staffStatus?.settings?.requireCheckOutLocation;
            const empCheckInBlocked = empStrictCheckIn && empIsOutsideZone;
            const empCheckOutBlocked = empStrictCheckOut && empIsOutsideZone;
            return (
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                empIsHoliday
                  ? 'bg-gradient-to-l from-amber-400 via-orange-400 to-amber-400'
                  : staffStatus.todayLog?.checkOutTime
                  ? 'bg-gradient-to-l from-blue-400 via-indigo-400 to-violet-400'
                  : staffStatus.todayLog?.checkInTime
                  ? 'bg-gradient-to-l from-teal-400 via-emerald-400 to-green-400'
                  : 'bg-gradient-to-l from-blue-400 via-indigo-400 to-violet-400'
              }`} />
              
              <div className="p-4 pt-5 lg:p-4 lg:pt-5">
                {/* Holiday Banner */}
                {empIsHoliday && !staffStatus.todayLog?.checkOutTime && !staffStatus.todayLog?.checkInTime && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl mb-3 lg:mb-2 bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200">
                    <div className="w-8 h-8 lg:w-7 lg:h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <CalendarDaysIcon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-amber-800">اليوم يوم إجازة</p>
                      {staffStatus?.todayHoliday && (
                        <p className="text-[10px] text-amber-600">إجازة رسمية: {staffStatus.todayHoliday.name}</p>
                      )}
                      {staffStatus?.isWeeklyOff && staffStatus.weeklyOffDay && (
                        <p className="text-[10px] text-amber-600">عطلة أسبوعية: يوم {DAY_NAMES_AR_DASH[staffStatus.weeklyOffDay] || staffStatus.weeklyOffDay}</p>
                      )}
                      <p className="text-[9px] text-amber-500 mt-0.5">يمكنك تسجيل الحضور مع إضافة ملاحظة تلقائية</p>
                    </div>
                  </div>
                )}

                {/* Header Row */}
                <div className="flex items-center justify-between mb-3 lg:mb-2">
                  <div className="flex items-center gap-2.5 lg:gap-2">
                    <div className={`w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg flex items-center justify-center ${
                      staffStatus.todayLog?.checkOutTime
                        ? 'bg-blue-50'
                        : staffStatus.todayLog?.checkInTime
                        ? 'bg-teal-50'
                        : 'bg-indigo-50'
                    }`}>
                      <FingerPrintIcon className={`w-5 h-5 lg:w-4 lg:h-4 ${
                        staffStatus.todayLog?.checkOutTime
                          ? 'text-blue-600'
                          : staffStatus.todayLog?.checkInTime
                          ? 'text-teal-600'
                          : 'text-indigo-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-sm font-bold text-slate-900">الحضور والانصراف</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {/* Status badge */}
                  {staffStatus.todayLog?.checkInTime && !staffStatus.todayLog.checkOutTime ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold rounded-full">
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                      في العمل
                    </div>
                  ) : staffStatus.todayLog?.checkOutTime ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      اكتمل
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                      <ClockIcon className="w-3.5 h-3.5" />
                      لم يُسجَّل
                    </div>
                  )}
                </div>

                {/* Live Timer - big and central */}
                {staffStatus.todayLog?.checkInTime && !staffStatus.todayLog.checkOutTime && (
                  <div className="text-center py-3 lg:py-2 mb-3 lg:mb-2 bg-gradient-to-b from-teal-50/60 to-white rounded-xl border border-teal-100">
                    <p className="text-3xl sm:text-4xl lg:text-3xl font-mono font-bold text-teal-600 tracking-wider" dir="ltr">
                      {formatElapsed(staffElapsed)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">وقت العمل المستمر</p>
                    {(() => {
                      const reqMin = staffStatus.todayLog?.requiredMinutes || Math.round((staffStatus.settings?.workHoursPerDay || 8) * 60);
                      const elapsedMin = Math.floor(staffElapsed / 60);
                      const pct = Math.min(100, Math.round((elapsedMin / reqMin) * 100));
                      return (
                        <div className="mt-2 mx-auto max-w-[180px]">
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-teal-500' : pct >= 75 ? 'bg-blue-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{pct}% من الدوام المطلوب</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Completed summary */}
                {staffStatus.todayLog?.checkOutTime && (
                  <div className="text-center py-3 lg:py-2 mb-3 lg:mb-2 bg-gradient-to-b from-blue-50/60 to-white rounded-xl border border-blue-100">
                    <CheckCircleIcon className="w-8 h-8 lg:w-7 lg:h-7 text-blue-500 mx-auto mb-1.5" />
                    <p className="text-base lg:text-sm font-bold text-blue-700">
                      {staffStatus.todayLog?.workedMinutes
                        ? `${Math.floor(staffStatus.todayLog.workedMinutes / 60)} ساعة و ${staffStatus.todayLog.workedMinutes % 60} دقيقة`
                        : 'تم الانصراف'
                      }
                    </p>
                    <p className="text-xs text-slate-500 mt-1">إجمالي ساعات العمل لليوم</p>
                  </div>
                )}

                {/* Time Info Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3 lg:mb-2">
                  <div className="flex flex-col items-center p-2 lg:p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-lg bg-emerald-50 flex items-center justify-center mb-1">
                      <ClockIcon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">بداية الدوام</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{staffStatus.settings?.workStartTime || '—'}</p>
                  </div>
                  <div className="flex flex-col items-center p-2 lg:p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-lg bg-blue-50 flex items-center justify-center mb-1">
                      <FingerPrintIcon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">الحضور</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatStaffTime(staffStatus.todayLog?.checkInTime || null)}</p>
                    {staffStatus.todayLog?.isLate && <span className="text-[9px] text-rose-600 font-medium mt-0.5">متأخر</span>}
                  </div>
                  <div className="flex flex-col items-center p-2 lg:p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-lg bg-violet-50 flex items-center justify-center mb-1">
                      <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">الانصراف</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatStaffTime(staffStatus.todayLog?.checkOutTime || null)}</p>
                  </div>
                </div>

                {/* GPS Location Status with Zone Check */}
                {staffLocation ? (
                  empZoneCheck && empZones.length > 0 ? (
                    empZoneCheck.inside ? (
                      <div className="flex items-center gap-2 p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 text-xs bg-teal-50 border border-teal-200 text-teal-700">
                        <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <SignalIcon className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-bold text-teal-800 text-[11px]">داخل النطاق المسموح ✓</p>
                          <p className="text-[10px] text-teal-600 mt-0.5">
                            المنطقة: {empZoneCheck.nearestZone} — البعد: {formatStaffDistance(empZoneCheck.distance || 0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 text-xs bg-orange-50 border border-orange-200 text-orange-700">
                        <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <ShieldExclamationIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-bold text-orange-800 text-[11px]">خارج النطاق المسموح</p>
                          <p className="text-[10px] text-orange-600 mt-0.5">
                            أقرب منطقة: {empZoneCheck.nearestZone} — البعد: {formatStaffDistance(empZoneCheck.distance || 0)}
                          </p>
                          <p className="text-[9px] text-orange-400 mt-0.5">يمكنك التسجيل مع إضافة ملاحظة تلقائية</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 text-xs bg-teal-50 border border-teal-200 text-teal-700">
                      <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <MapPinIcon className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-bold text-teal-800 text-[11px]">تم تحديد الموقع بنجاح ✓</p>
                        <p className="text-[10px] text-teal-600 mt-0.5">الموقع الجغرافي مفعّل ويعمل بشكل صحيح</p>
                      </div>
                    </div>
                  )
                ) : staffLocationLoading ? (
                  <div className="flex items-center gap-2 p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 text-xs bg-blue-50 border border-blue-200 text-blue-700">
                    <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-800">جارٍ تحديد الموقع...</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">يرجى الانتظار لحظات</p>
                    </div>
                  </div>
                ) : staffLocationError ? (
                  <div className="p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-800">{staffLocationError}</p>
                        <p className="text-[10px] text-red-600 mt-0.5">يجب تفعيل الموقع لتسجيل الحضور والانصراف</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 mr-10">
                      <button onClick={getStaffLocation} className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                        🔄 إعادة المحاولة
                      </button>
                      <button onClick={() => setShowLocationHelp(true)} className="text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                        ❓ كيفية التفعيل
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 lg:p-2 rounded-xl mb-3 lg:mb-2 text-xs bg-slate-50 border border-slate-200 text-slate-500">
                    <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <span>في انتظار تحديد الموقع...</span>
                  </div>
                )}

                {/* Action Buttons */}
                {!staffStatus.todayLog?.checkOutTime && (
                  <div>
                    {!staffStatus.todayLog?.checkInTime ? (
                      <button
                        onClick={handleStaffCheckIn}
                        disabled={staffSubmitting || !staffLocation || empCheckInBlocked}
                        className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 lg:py-2.5 text-sm lg:text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] ${
                          empCheckInBlocked
                            ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                            : empIsHoliday
                            ? 'bg-gradient-to-l from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                            : empIsOutsideZone
                            ? 'bg-gradient-to-l from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600'
                            : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                      >
                        {staffSubmitting ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FingerPrintIcon className="w-5 h-5" />
                        )}
                        {staffSubmitting ? 'جارٍ التسجيل...' : empCheckInBlocked ? 'خارج النطاق - تسجيل الحضور محظور' : empIsHoliday ? 'تسجيل الحضور (يوم إجازة)' : 'تسجيل الحضور'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStaffCheckOut(false)}
                        disabled={staffSubmitting || !staffLocation || empCheckOutBlocked}
                        className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 lg:py-2.5 text-sm lg:text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] ${
                          empCheckOutBlocked
                            ? 'bg-tiba-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-l from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600'
                        }`}
                      >
                        {staffSubmitting ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                        )}
                        {staffSubmitting ? 'جارٍ التسجيل...' : empCheckOutBlocked ? 'خارج النطاق - تسجيل الانصراف محظور' : 'تسجيل الانصراف'}
                      </button>
                    )}
                    {!staffLocation && !staffLocationLoading && (
                      <p className="text-xs text-indigo-600 text-center mt-2">
                        ⚠️ يجب تفعيل الموقع الجغرافي لتسجيل الحضور والانصراف
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })() : !staffStatusLoading && !staffStatus?.isEnrolled ? (
            /* Not enrolled - show info card */
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-slate-300 via-slate-400 to-slate-300" />
              <div className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <FingerPrintIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-700 mb-1">نظام حضور الموظفين</h3>
                    <p className="text-sm text-slate-500">لم يتم تسجيلك في نظام الحضور بعد. تواصل مع الإدارة لتفعيل حسابك.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============ TODAY'S SESSIONS BY PROGRAM ============ */}
      {!loading && canViewAttendance && data?.todaySessionsByProgram && data.todaySessionsByProgram.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                محاضرات اليوم
              </h3>
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {data.todaySessionsByProgram.reduce((sum, p) => sum + p.sessions.length, 0)} محاضرة
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.todaySessionsByProgram.map((program) => (
              <div key={program.programId}>
                {/* Program Header */}
                <div className="px-4 sm:px-5 py-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{program.programName}</h4>
                      <p className="text-xs text-slate-500">{program.sessions.length} محاضرة</p>
                    </div>
                  </div>
                  {program.totalRecords > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded">حاضر {program.totalPresent}</span>
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">غائب {program.totalAbsent}</span>
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">متأخر {program.totalLate}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        program.overallAttendanceRate >= 80 ? 'bg-teal-100 text-teal-800' :
                        program.overallAttendanceRate >= 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {program.overallAttendanceRate}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Sessions */}
                <div className="divide-y divide-slate-50">
                  {program.sessions.map((session) => {
                    const startTime = session.startTime.includes('T') 
                      ? new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                      : session.startTime;
                    const endTime = session.endTime.includes('T')
                      ? new Date(session.endTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                      : session.endTime;
                    const typeLabel = session.type === 'THEORETICAL' || session.type === 'THEORY' ? 'نظري' : session.type === 'PRACTICAL' ? 'عملي' : session.type;
                    const typeColor = session.type === 'THEORETICAL' || session.type === 'THEORY' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div key={session.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <BookOpenIcon className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{session.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500">{startTime} - {endTime}</span>
                              {session.location && (
                                <span className="text-xs text-slate-500 flex items-center gap-0.5">
                                  <MapPinIcon className="w-3 h-3" />
                                  {session.location}
                                </span>
                              )}
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${typeColor}`}>{typeLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 mr-11 sm:mr-0">
                          {session.total > 0 ? (
                            <>
                              <div className="hidden md:flex items-center gap-1.5 text-xs font-medium">
                                <span className="text-teal-600">{session.present}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-rose-600">{session.absent}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-amber-600">{session.late}</span>
                              </div>
                              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="flex h-full">
                                  <div className="bg-teal-500 h-full" style={{ width: `${(session.present / session.total) * 100}%` }} />
                                  <div className="bg-amber-500 h-full" style={{ width: `${(session.late / session.total) * 100}%` }} />
                                  <div className="bg-rose-500 h-full" style={{ width: `${(session.absent / session.total) * 100}%` }} />
                                </div>
                              </div>
                              <span className={`text-xs font-bold min-w-[32px] text-center ${
                                session.attendanceRate >= 80 ? 'text-teal-600' :
                                session.attendanceRate >= 60 ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {session.attendanceRate}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">لم يُسجَّل</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                {program.totalRecords > 0 && (
                  <div className="px-4 sm:px-5 py-2 bg-slate-50/50 border-t border-slate-100">
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-teal-500 h-full transition-all" style={{ width: `${(program.totalPresent / program.totalRecords) * 100}%` }} />
                        <div className="bg-amber-500 h-full transition-all" style={{ width: `${(program.totalLate / program.totalRecords) * 100}%` }} />
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${(program.totalAbsent / program.totalRecords) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No sessions message */}
      {!loading && canViewAttendance && data?.todaySessionsByProgram && data.todaySessionsByProgram.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
          <CalendarDaysIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">لا توجد محاضرات مجدولة اليوم</p>
        </div>
      )}

      {/* ============ QUICK LINKS ============ */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
              وصول سريع
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {canViewTrainees && (
                <Link href="/dashboard/trainees" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 text-center">المتدربين</span>
                </Link>
              )}
              {canViewPrograms && (
                <Link href="/dashboard/programs" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-violet-50 border border-transparent hover:border-violet-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AcademicCapIcon className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-violet-700 text-center">البرامج</span>
                </Link>
              )}
              {canViewAttendance && (
                <Link href="/dashboard/attendance" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-teal-700 text-center">الحضور</span>
                </Link>
              )}
              {canViewFinancial && (
                <Link href="/dashboard/finances/safes" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BanknotesIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-amber-700 text-center">المالية</span>
                </Link>
              )}
              {canViewMarketing && (
                <Link href="/dashboard/marketing/employees" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-pink-50 border border-transparent hover:border-pink-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MegaphoneIcon className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-pink-700 text-center">التسويق</span>
                </Link>
              )}
              {canViewReports && (
                <Link href="/dashboard/finances/reports" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700 text-center">التقارير</span>
                </Link>
              )}
              {(hasPermission('staff-attendance', 'view') || staffStatus?.isEnrolled) && (
                <Link href="/dashboard/staff-attendance/check-in" className="flex flex-col items-center gap-2 p-3 sm:p-4 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-lg transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FingerPrintIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-teal-700 text-center">تسجيل الحضور</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ ERROR STATE ============ */}
      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <ExclamationTriangleIcon className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-rose-700 mb-3">{error}</p>
          <button onClick={loadDashboard} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ============ FORCE CHECK-IN CONFIRMATION DIALOG ============ */}
      {showForceCheckInConfirm.open && (() => {
        const t = showForceCheckInConfirm.type;
        const colorMap = {
          holiday: { bg: 'from-amber-50 to-orange-50', iconBg: 'bg-amber-100 border-amber-200', iconText: 'text-amber-500', btn: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-200', warningBg: 'bg-amber-50 border-amber-100', warningText: 'text-amber-700' },
          outsideZone: { bg: 'from-orange-50 to-rose-50', iconBg: 'bg-orange-100 border-orange-200', iconText: 'text-orange-500', btn: 'from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 shadow-orange-200', warningBg: 'bg-orange-50 border-orange-100', warningText: 'text-orange-700' },
          both: { bg: 'from-rose-50 to-red-50', iconBg: 'bg-rose-100 border-rose-200', iconText: 'text-rose-500', btn: 'from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-200', warningBg: 'bg-rose-50 border-rose-100', warningText: 'text-rose-700' },
        };
        const c = colorMap[t];
        const title = t === 'holiday' ? 'تسجيل حضور في يوم إجازة' : t === 'outsideZone' ? 'خارج نطاق العمل المسموح' : 'تنبيهات متعددة';
        const desc = t === 'holiday' ? 'أنت تحاول تسجيل الحضور في يوم إجازة. سيتم تسجيل الحضور مع ملاحظة بذلك.' : t === 'outsideZone' ? 'أنت خارج المناطق المسموح بتسجيل الحضور منها. سيتم تسجيل الحضور مع ملاحظة بذلك.' : 'يوجد أكثر من تنبيه حول تسجيل حضورك. سيتم تسجيل الحضور مع ملاحظات بذلك.';
        const confirmText = t === 'holiday' ? 'تسجيل الحضور رغم الإجازة' : t === 'outsideZone' ? 'تسجيل الحضور رغم الموقع' : 'تسجيل الحضور على أي حال';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl" onClick={() => setShowForceCheckInConfirm(d => ({ ...d, open: false }))}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className={`h-1 bg-gradient-to-l ${c.btn.split(' ').slice(0, 2).join(' ')}`} />
              <div className="p-6">
                <button onClick={() => setShowForceCheckInConfirm(d => ({ ...d, open: false }))} className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 ${c.iconBg} border-2 rounded-2xl flex items-center justify-center ${c.iconText}`}>
                    {t === 'holiday' ? <CalendarDaysIcon className="w-8 h-8" /> : t === 'outsideZone' ? <ShieldExclamationIcon className="w-8 h-8" /> : <ExclamationTriangleIcon className="w-8 h-8" />}
                  </div>
                </div>
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
                {showForceCheckInConfirm.warnings.length > 0 && (
                  <div className={`rounded-xl border ${c.warningBg} p-3.5 mb-5 space-y-2`}>
                    {showForceCheckInConfirm.warnings.map((w, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${c.warningText}`}>
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{w}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => doStaffCheckIn(true)}
                    disabled={staffSubmitting}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-l ${c.btn} rounded-xl shadow-md disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {staffSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                    {confirmText}
                  </button>
                  <button
                    onClick={() => setShowForceCheckInConfirm(d => ({ ...d, open: false }))}
                    disabled={staffSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ CHECKOUT CONFIRMATION DIALOG ============ */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCheckoutConfirm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            {/* Header gradient */}
            {(() => {
              const checkInTime = staffStatus?.todayLog?.checkInTime ? new Date(staffStatus.todayLog.checkInTime).getTime() : 0;
              const workedMinutes = checkInTime ? Math.floor((Date.now() - checkInTime) / 60000) : 0;
              const requiredMinutes = staffStatus?.todayLog?.requiredMinutes || Math.round((staffStatus?.settings?.workHoursPerDay || 8) * 60);
              const isEarly = workedMinutes < requiredMinutes;
              const progressPercent = Math.min(100, Math.round((workedMinutes / requiredMinutes) * 100));
              return (
                <>
                  <div className={`px-6 pt-6 pb-5 text-center ${isEarly ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-gradient-to-br from-teal-50 to-emerald-50'}`}>
                    <div className={`w-16 h-16 rounded-2xl ${isEarly ? 'bg-indigo-100 border-2 border-indigo-200' : 'bg-teal-100 border-2 border-teal-200'} flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                      {isEarly ? (
                        <ExclamationTriangleIcon className="w-8 h-8 text-indigo-500" />
                      ) : (
                        <CheckCircleIcon className="w-8 h-8 text-teal-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                      {isEarly ? 'تسجيل انصراف مبكر' : 'تأكيد تسجيل الانصراف'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isEarly ? 'لم تنقضِ ساعات العمل المطلوبة بعد' : 'أتممت ساعات العمل المطلوبة بنجاح 🎉'}
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    {/* Progress Section */}
                    <div className={`p-4 rounded-2xl border ${isEarly ? 'bg-indigo-50/50 border-indigo-100' : 'bg-teal-50/50 border-teal-100'} mb-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-slate-500 mb-0.5">⏱️ مدة العمل</p>
                          <p className={`text-lg font-extrabold ${isEarly ? 'text-indigo-700' : 'text-teal-700'}`}>
                            {Math.floor(workedMinutes / 60)}س {workedMinutes % 60}د
                          </p>
                        </div>
                        <div className={`w-px h-10 ${isEarly ? 'bg-indigo-200' : 'bg-teal-200'}`} />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-slate-500 mb-0.5">📋 المطلوب</p>
                          <p className="text-lg font-extrabold text-slate-700">
                            {Math.floor(requiredMinutes / 60)}س {requiredMinutes % 60}د
                          </p>
                        </div>
                        <div className={`w-px h-10 ${isEarly ? 'bg-indigo-200' : 'bg-teal-200'}`} />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-slate-500 mb-0.5">📊 الإنجاز</p>
                          <p className={`text-lg font-extrabold ${progressPercent >= 100 ? 'text-teal-600' : progressPercent >= 75 ? 'text-blue-600' : 'text-indigo-600'}`}>
                            {progressPercent}%
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            progressPercent >= 100 ? 'bg-gradient-to-l from-teal-500 to-emerald-400' 
                            : progressPercent >= 75 ? 'bg-gradient-to-l from-blue-500 to-blue-400' 
                            : 'bg-gradient-to-l from-indigo-500 to-blue-400'
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {isEarly && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 mb-4">
                        <span className="text-lg">⚠️</span>
                        <p className="text-xs text-indigo-800 font-medium">
                          سيتم تسجيل هذا اليوم كانصراف مبكر وقد يؤثر على تقييم الحضور
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-slate-600 font-semibold text-center mb-4">
                      هل تريد تأكيد تسجيل الانصراف؟
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowCheckoutConfirm(false)}
                        className="px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.97]"
                      >
                        ← العودة
                      </button>
                      <button
                        onClick={() => handleStaffCheckOut(true)}
                        disabled={staffSubmitting}
                        className={`px-4 py-3 text-sm font-bold text-white rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 ${
                          isEarly 
                            ? 'bg-gradient-to-l from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 shadow-indigo-200 shadow-md' 
                            : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200 shadow-md'
                        }`}
                      >
                        {staffSubmitting ? (
                          <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ...</span>
                        ) : 'تأكيد الانصراف ✓'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============ LOCATION HELP MODAL ============ */}
      {showLocationHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLocationHelp(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 px-6 pt-6 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center shadow-sm">
                  <MapPinIcon className="w-7 h-7 text-indigo-500" />
                </div>
                <button onClick={() => setShowLocationHelp(false)} className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm">
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">تفعيل خدمة الموقع الجغرافي</h3>
              <p className="text-sm text-slate-500 mt-1">يجب تفعيل الموقع لتتمكن من تسجيل الحضور والانصراف</p>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {/* Chrome Desktop */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🖥️</span>
                  <h4 className="text-sm font-extrabold text-slate-800">على الكمبيوتر (Chrome)</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> اضغط على أيقونة 🔒 بجانب عنوان الموقع في شريط العناوين</p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> اختر <strong>"إعدادات الموقع"</strong> أو <strong>"Site settings"</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> غيّر <strong>"الموقع الجغرافي"</strong> إلى <strong>"سماح"</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span> أعد تحميل الصفحة</p>
                </div>
              </div>

              {/* iPhone Safari */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📱</span>
                  <h4 className="text-sm font-extrabold text-slate-800">على الآيفون (Safari)</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> افتح <strong>"الإعدادات"</strong> ← <strong>"الخصوصية والأمان"</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> اختر <strong>"خدمات الموقع"</strong> وتأكد أنها <strong>مفعلة</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> انزل إلى <strong>Safari</strong> واختر <strong>"أثناء استخدام التطبيق"</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span> ارجع للصفحة وأعد تحميلها</p>
                </div>
              </div>

              {/* Android Chrome */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <h4 className="text-sm font-extrabold text-slate-800">على أندرويد (Chrome)</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> اضغط على أيقونة 🔒 بجانب عنوان الموقع</p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> اختر <strong>"الأذونات"</strong> أو <strong>"Permissions"</strong></p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> فعّل <strong>"الموقع الجغرافي"</strong> (Location)</p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span> تأكد من تفعيل GPS من <strong>إعدادات الجهاز</strong> أيضاً</p>
                </div>
              </div>

              {/* Windows Location Service */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚙️</span>
                  <h4 className="text-sm font-extrabold text-slate-800">تفعيل الموقع في Windows</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-slate-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> افتح <strong>الإعدادات</strong> (Settings) ← <strong>الخصوصية</strong> (Privacy)</p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-slate-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> اختر <strong>"الموقع"</strong> (Location) من القائمة الجانبية</p>
                  <p className="text-xs text-slate-700 flex items-start gap-2"><span className="bg-slate-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> فعّل <strong>"خدمة الموقع"</strong> و <strong>"السماح للتطبيقات بالوصول"</strong></p>
                </div>
              </div>

              {/* Important tip */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-800 font-bold mb-1">💡 نصيحة مهمة</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">بعد تفعيل الموقع، أعد تحميل الصفحة بالضغط على <strong>F5</strong> أو سحب الصفحة للأسفل على الهاتف. إذا استمرت المشكلة، جرّب متصفح آخر أو تأكد من أن GPS مفعل في إعدادات الجهاز.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => { setShowLocationHelp(false); getStaffLocation(); }}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-xl transition-all shadow-md active:scale-[0.97]"
              >
                🔄 إعادة تحديد الموقع
              </button>
              <button
                onClick={() => setShowLocationHelp(false)}
                className="px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all active:scale-[0.97]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
