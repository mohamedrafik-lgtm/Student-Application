'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import LoadingScreen from '@/app/components/LoadingScreen';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  UsersIcon, ClockIcon, CalendarDaysIcon,
  CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon,
  ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon,
  MapPinIcon, ChartBarIcon, XMarkIcon, EyeIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import StaffAvatar from '@/components/ui/StaffAvatar';
import { TibaModal } from '@/components/ui/tiba-modal';

// ============ TYPES ============
interface DashboardStats {
  totalEnrolled: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayEarlyLeave: number;
  todayOnTime: number;
  pendingLeaves: number;
  averageWorkMinutes: number;
  attendanceRate: number;
}

interface TodayEmployee {
  user: { id: string; name: string; email: string; photoUrl?: string | null; phone?: string };
  log: {
    id: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    workedMinutes?: number | null;
    isLate?: boolean;
    isEarlyLeave?: boolean;
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
    checkOutLatitude?: number | null;
    checkOutLongitude?: number | null;
    notes?: string | null;
  } | null;
  status: string;
}

interface TodayStats {
  total: number;
  present: number;
  absent: number;
  excused: number;
  notRecorded: number;
  late: number;
}

interface UserLogEntry {
  id: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workedMinutes?: number | null;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  notes?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
}

interface UserLogsData {
  user: { id: string; name: string; email: string; phone?: string; photoUrl?: string | null };
  logs: UserLogEntry[];
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    excusedDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    totalWorkedMinutes: number;
    totalRequiredMinutes: number;
    totalOvertimeMinutes: number;
    attendanceRate: number;
  };
}

interface MapData {
  userName: string;
  date: string;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInTime?: string | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkOutTime?: string | null;
}

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// ============ COMPONENTS ============
function StatCard({ title, value, subtitle, icon, iconBg, link }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  link?: string;
}) {
  const content = (
    <div className={`relative overflow-hidden bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 h-full hover:shadow-md hover:border-tiba-primary-200 hover:-translate-y-0.5 transition-all duration-300 group ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 truncate">{subtitle}</p>}
        </div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PRESENT: { label: 'حاضر', cls: 'bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-secondary-200', dot: 'bg-tiba-secondary-500' },
  ABSENT_UNEXCUSED: { label: 'غائب بدون إذن', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
  ABSENT: { label: 'غائب', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
  LATE: { label: 'متأخر', cls: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  EARLY_LEAVE: { label: 'انصراف مبكر', cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  ABSENT_EXCUSED: { label: 'إذن', cls: 'bg-teal-50 text-teal-700 border border-teal-200', dot: 'bg-teal-500' },
  LEAVE: { label: 'إذن', cls: 'bg-teal-50 text-teal-700 border border-teal-200', dot: 'bg-teal-500' },
  HOLIDAY: { label: 'عطلة', cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  DAY_OFF: { label: 'يوم إجازة', cls: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
  ON_LEAVE: { label: 'في إجازة', cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] || { label: status, cls: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}

function getMonthDateRange(year: number, month: number) {
  const s = new Date(year, month, 1);
  const e = new Date(year, month + 1, 0);
  return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
}

function formatMinutes(min?: number | null) {
  if (min === null || min === undefined || min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} ساعة ${m > 0 ? `و ${m} دقيقة` : ''}`;
}

// ============ MAIN PAGE ============
function StaffAttendanceDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayEmployees, setTodayEmployees] = useState<TodayEmployee[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Employee detail panel
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeLogs, setEmployeeLogs] = useState<UserLogsData | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);

  // Month picker for detail view
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, todayRes] = await Promise.all([
        fetchAPI('/staff-attendance/dashboard'),
        fetchAPI('/staff-attendance/today'),
      ]);
      if (statsRes) setStats(statsRes);
      if (todayRes?.employees) {
        setTodayEmployees(todayRes.employees);
        setTodayStats(todayRes.stats || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load employee logs for month
  const loadEmployeeLogs = useCallback(async (userId: string) => {
    try {
      setLoadingLogs(true);
      const { start, end } = getMonthDateRange(selectedYear, selectedMonth);
      const data = await fetchAPI(`/staff-attendance/logs/user/${userId}?startDate=${start}&endDate=${end}`);
      setEmployeeLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل سجلات الموظف');
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedEmployeeId) loadEmployeeLogs(selectedEmployeeId);
  }, [selectedEmployeeId, selectedYear, selectedMonth, loadEmployeeLogs]);

  const filteredEmployees = useMemo(() => {
    let list = todayEmployees;
    if (search) list = list.filter(e => e.user?.name?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) {
      if (statusFilter === 'NOT_RECORDED') list = list.filter(e => e.status === 'NOT_RECORDED');
      else list = list.filter(e => e.status === statusFilter);
    }
    return list;
  }, [todayEmployees, search, statusFilter]);

  const handleSelectEmployee = (userId: string) => {
    if (selectedEmployeeId === userId) {
      setSelectedEmployeeId(null);
      setEmployeeLogs(null);
    } else {
      setSelectedEmployeeId(userId);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="لوحة حضور الموظفين"
        description="نظرة عامة على حضور وانصراف الموظفين اليوم"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين' },
        ]}
        actions={
          <Link
            href="/dashboard/staff-attendance/check-in"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-tiba-primary-500 to-tiba-primary-600 rounded-xl hover:from-tiba-primary-600 hover:to-tiba-primary-700 transition-all shadow-sm hover:shadow-md"
          >
            <ClockIcon className="w-4 h-4" />
            تسجيل حضوري
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="إجمالي المسجلين"
          value={stats?.totalEnrolled ?? 0}
          icon={<UsersIcon className="w-5 h-5 text-tiba-primary-600" />}
          iconBg="bg-tiba-primary-50"
          subtitle="موظف مسجل في النظام"
          link="/dashboard/staff-attendance/employees"
        />
        <StatCard
          title="الحاضرون اليوم"
          value={stats?.todayPresent ?? 0}
          icon={<CheckCircleIcon className="w-5 h-5 text-tiba-secondary-600" />}
          iconBg="bg-tiba-secondary-50"
          subtitle={`نسبة الحضور: ${stats?.attendanceRate ?? 0}%`}
        />
        <StatCard
          title="الغائبون اليوم"
          value={stats?.todayAbsent ?? 0}
          icon={<XCircleIcon className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-50"
          subtitle="موظف غائب"
        />
        <StatCard
          title="المتأخرون"
          value={stats?.todayLate ?? 0}
          icon={<ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle={`انصراف مبكر: ${stats?.todayEarlyLeave ?? 0}`}
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="طلبات إجازة معلقة"
          value={stats?.pendingLeaves ?? 0}
          icon={<CalendarDaysIcon className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          link="/dashboard/staff-attendance/leaves"
        />
        <StatCard
          title="متوسط ساعات العمل"
          value={stats?.averageWorkMinutes ? formatMinutes(stats.averageWorkMinutes) : '\u2014'}
          icon={<ClockIcon className="w-5 h-5 text-tiba-primary-600" />}
          iconBg="bg-tiba-primary-50"
        />
        <StatCard
          title="نسبة الحضور"
          value={`${stats?.attendanceRate ?? 0}%`}
          icon={<ArrowTrendingUpIcon className="w-5 h-5 text-tiba-secondary-600" />}
          iconBg="bg-tiba-secondary-50"
        />
      </div>

      {/* Today's Attendance Progress Bar */}
      {todayStats && todayStats.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-tiba-primary-500" />
              توزيع حالات الحضور اليوم
            </h3>
            <span className="text-xs text-slate-400">{todayStats.total} موظف</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-tiba-gray-100">
            {todayStats.present > 0 && (
              <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(todayStats.present / todayStats.total) * 100}%` }} title={`حاضر: ${todayStats.present}`} />
            )}
            {todayStats.late > 0 && (
              <div className="bg-amber-500 transition-all duration-700" style={{ width: `${(todayStats.late / todayStats.total) * 100}%` }} title={`متأخر: ${todayStats.late}`} />
            )}
            {todayStats.absent > 0 && (
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${(todayStats.absent / todayStats.total) * 100}%` }} title={`غائب: ${todayStats.absent}`} />
            )}
            {todayStats.excused > 0 && (
              <div className="bg-tiba-primary-400 transition-all duration-700" style={{ width: `${(todayStats.excused / todayStats.total) * 100}%` }} title={`بعذر: ${todayStats.excused}`} />
            )}
            {todayStats.notRecorded > 0 && (
              <div className="bg-slate-300 transition-all duration-700" style={{ width: `${(todayStats.notRecorded / todayStats.total) * 100}%` }} title={`لم يسجل: ${todayStats.notRecorded}`} />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {todayStats.present > 0 && <span className="flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> حاضر ({todayStats.present})</span>}
            {todayStats.late > 0 && <span className="flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> متأخر ({todayStats.late})</span>}
            {todayStats.absent > 0 && <span className="flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> غائب ({todayStats.absent})</span>}
            {todayStats.excused > 0 && <span className="flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-tiba-primary-400" /> بعذر ({todayStats.excused})</span>}
            {todayStats.notRecorded > 0 && <span className="flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> لم يسجل ({todayStats.notRecorded})</span>}
          </div>
        </div>
      )}

      {/* Employees Photo Grid + Search/Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-tiba-primary-500" />
              الموظفون — حالة اليوم
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none bg-white transition-all"
              >
                <option value="">الكل</option>
                <option value="PRESENT">حاضر</option>
                <option value="ABSENT_UNEXCUSED">غائب</option>
                <option value="LEAVE">إذن</option>
                <option value="NOT_RECORDED">لم يسجل</option>
                <option value="DAY_OFF">يوم عطلة</option>
                <option value="ON_LEAVE">في إجازة</option>
              </select>
            </div>
          </div>
        </div>

        {todayEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">لا يوجد موظفون مسجلون</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">لا توجد نتائج مطابقة</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.user.id;
                return (
                  <button
                    key={emp.user.id}
                    onClick={() => handleSelectEmployee(emp.user.id)}
                    className={`group relative bg-white rounded-xl border-2 p-3 sm:p-4 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-sm
                      ${isSelected
                        ? 'border-tiba-primary-400 bg-tiba-primary-50/50 ring-2 ring-tiba-primary-200'
                        : 'border-slate-200 hover:border-tiba-primary-300'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <StaffAvatar
                        name={emp.user.name}
                        photoUrl={emp.user.photoUrl}
                        size="lg"
                        status={emp.status !== 'NOT_RECORDED' ? emp.status : undefined}
                        showStatusRing={emp.status !== 'NOT_RECORDED'}
                      />
                      <div className="min-w-0 w-full">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{emp.user.name}</p>
                        <div className="mt-1.5">
                          {emp.status !== 'NOT_RECORDED' ? (
                            <StatusBadge status={emp.status} />
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200">
                              لم يسجل
                            </span>
                          )}
                        </div>
                        {emp.log && (
                          <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                            {formatTime(emp.log.checkInTime)}
                            {emp.log.checkOutTime ? ` — ${formatTime(emp.log.checkOutTime)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 group-hover:text-tiba-primary-500 transition-colors">
                      <EyeIcon className="w-3 h-3" />
                      <span>عرض السجل</span>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-tiba-primary-500 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Employee Detail Panel  */}
      {selectedEmployeeId && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
          {loadingLogs ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">جارٍ تحميل سجلات الموظف...</p>
            </div>
          ) : employeeLogs ? (
            <div>
              {/* Gradient Header */}
              <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-tiba-secondary-500 p-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
                </div>
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <StaffAvatar name={employeeLogs.user.name} photoUrl={employeeLogs.user.photoUrl} size="xl" />
                    <div>
                      <h3 className="text-lg font-bold">{employeeLogs.user.name}</h3>
                      <p className="text-white/70 text-sm mt-0.5">{employeeLogs.user.email}</p>
                      <p className="text-white/60 text-xs mt-0.5">سجل {ARABIC_MONTHS[selectedMonth]} {selectedYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Month Navigation */}
                    <div className="flex items-center gap-1 bg-white/15 rounded-lg p-0.5 backdrop-blur-sm">
                      <button onClick={nextMonth} className="p-1.5 hover:bg-white/20 rounded-md transition-all">
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold px-2 min-w-[90px] text-center">{ARABIC_MONTHS[selectedMonth]}</span>
                      <button onClick={prevMonth} className="p-1.5 hover:bg-white/20 rounded-md transition-all">
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Link
                      href={`/dashboard/staff-attendance/employees/${employeeLogs.user.id}`}
                      className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all"
                    >
                      الملف ↗
                    </Link>
                    <button
                      onClick={() => { setSelectedEmployeeId(null); setEmployeeLogs(null); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[
                    { label: 'أيام العمل', value: employeeLogs.stats.totalDays, color: 'from-slate-50 to-slate-100', iconColor: 'text-slate-500', border: 'border-slate-200', icon: CalendarDaysIcon },
                    { label: 'حاضر', value: employeeLogs.stats.presentDays, color: 'from-emerald-50 to-emerald-100/80', iconColor: 'text-emerald-500', border: 'border-emerald-200', icon: CheckCircleIcon },
                    { label: 'غائب', value: employeeLogs.stats.absentDays, color: 'from-red-50 to-red-100/80', iconColor: 'text-red-500', border: 'border-red-200', icon: XCircleIcon },
                    { label: 'بعذر', value: employeeLogs.stats.excusedDays, color: 'from-amber-50 to-amber-100/80', iconColor: 'text-amber-500', border: 'border-amber-200', icon: ExclamationTriangleIcon },
                    { label: 'تأخير', value: employeeLogs.stats.lateDays, color: 'from-orange-50 to-orange-100/80', iconColor: 'text-orange-500', border: 'border-orange-200', icon: ClockIcon },
                    { label: 'نسبة الحضور', value: `${employeeLogs.stats.attendanceRate}%`, color: 'from-tiba-primary-50 to-tiba-primary-100/80', iconColor: 'text-tiba-primary-500', border: 'border-tiba-primary-200', icon: ChartBarIcon },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-xl border ${stat.border} p-2 sm:p-3 text-center`}>
                      <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor} mx-auto mb-1`} />
                      <p className="text-base sm:text-lg font-bold text-slate-900">{stat.value}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                {employeeLogs.stats.totalDays > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600">نسبة الحضور</span>
                      <span className="text-xs font-bold text-tiba-primary-600">{employeeLogs.stats.attendanceRate}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${employeeLogs.stats.attendanceRate >= 90 ? 'bg-gradient-to-l from-emerald-400 to-emerald-500' : employeeLogs.stats.attendanceRate >= 70 ? 'bg-gradient-to-l from-amber-400 to-amber-500' : 'bg-gradient-to-l from-red-400 to-red-500'}`}
                        style={{ width: `${employeeLogs.stats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                      <span>ساعات العمل: {formatMinutes(employeeLogs.stats.totalWorkedMinutes)}</span>
                      <span>ساعات إضافية: {formatMinutes(employeeLogs.stats.totalOvertimeMinutes)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Records Table */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-tiba-primary-500" />
                    تفاصيل الحضور — {ARABIC_MONTHS[selectedMonth]} {selectedYear}
                  </h4>
                  <span className="text-xs text-slate-400">{employeeLogs.logs.length} سجل</span>
                </div>
              </div>

              {employeeLogs.logs.length === 0 ? (
                <div className="p-12 text-center">
                  <DocumentTextIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">لا توجد سجلات لهذا الشهر</p>
                  <p className="text-xs text-slate-300 mt-1">جرب اختيار شهر آخر</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">التاريخ</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">الحالة</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">الحضور</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">الانصراف</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">المدة</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">الموقع</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeeLogs.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-slate-800 text-xs font-medium">{formatDate(log.date)}</td>
                            <td className="text-center px-4 py-3">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <StatusBadge status={log.status} />
                                {log.isLate && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">متأخر</span>}
                                {log.isEarlyLeave && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">مبكر</span>}
                              </div>
                            </td>
                            <td className="text-center px-4 py-3 text-slate-700 tabular-nums font-medium">{formatTime(log.checkInTime)}</td>
                            <td className="text-center px-4 py-3 text-slate-700 tabular-nums font-medium">{formatTime(log.checkOutTime)}</td>
                            <td className="text-center px-4 py-3 text-slate-700">{formatMinutes(log.workedMinutes)}</td>
                            <td className="text-center px-4 py-3">
                              {(log.checkInLatitude || log.checkOutLatitude) ? (
                                <button
                                  onClick={() => setMapData({
                                    userName: employeeLogs.user.name,
                                    date: formatDate(log.date),
                                    checkInLat: log.checkInLatitude,
                                    checkInLng: log.checkInLongitude,
                                    checkInTime: log.checkInTime,
                                    checkOutLat: log.checkOutLatitude,
                                    checkOutLng: log.checkOutLongitude,
                                    checkOutTime: log.checkOutTime,
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-tiba-primary-600 bg-tiba-primary-50 hover:bg-tiba-primary-100 rounded-lg transition-colors"
                                >
                                  <MapPinIcon className="w-3.5 h-3.5" />
                                  الخريطة
                                </button>
                              ) : <span className="text-xs text-slate-300">—</span>}
                            </td>
                            <td className="text-center px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{log.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {employeeLogs.logs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-slate-800">{formatDate(log.date)}</p>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={log.status} />
                            {log.isLate && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">متأخر</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <ArrowRightOnRectangleIcon className="w-3 h-3 text-tiba-secondary-500" />
                              <span className="text-[10px] text-slate-500">حضور</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 tabular-nums">{formatTime(log.checkInTime)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <ArrowLeftOnRectangleIcon className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] text-slate-500">انصراف</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 tabular-nums">{formatTime(log.checkOutTime)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <ClockIcon className="w-3 h-3 text-tiba-primary-500" />
                              <span className="text-[10px] text-slate-500">المدة</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800">{formatMinutes(log.workedMinutes)}</p>
                          </div>
                        </div>
                        {(log.checkInLatitude || log.checkOutLatitude) && (
                          <button
                            onClick={() => setMapData({
                              userName: employeeLogs.user.name,
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
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Map Modal */}
      {mapData && (
        <TibaModal
          open={!!mapData}
          onClose={() => setMapData(null)}
          variant="primary"
          size="lg"
          title={`موقع حضور ${mapData.userName}`}
          subtitle={mapData.date}
          icon={<MapPinIcon className="w-6 h-6" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mapData.checkInLat && mapData.checkInLng && (
                <div className="bg-tiba-secondary-50 rounded-xl border border-tiba-secondary-100 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-tiba-secondary-500 text-white flex items-center justify-center text-[10px] font-bold">حـ</div>
                    <p className="text-xs font-bold text-tiba-secondary-700">موقع الحضور</p>
                  </div>
                  <p className="text-[11px] text-tiba-secondary-600 tabular-nums" dir="ltr">{mapData.checkInLat.toFixed(6)}, {mapData.checkInLng.toFixed(6)}</p>
                  {mapData.checkInTime && <p className="text-[10px] text-tiba-secondary-500 mt-1">الوقت: {formatTime(mapData.checkInTime)}</p>}
                </div>
              )}
              {mapData.checkOutLat && mapData.checkOutLng && (
                <div className="bg-rose-50 rounded-xl border border-rose-100 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">ن</div>
                    <p className="text-xs font-bold text-rose-700">موقع الانصراف</p>
                  </div>
                  <p className="text-[11px] text-rose-600 tabular-nums" dir="ltr">{mapData.checkOutLat.toFixed(6)}, {mapData.checkOutLng.toFixed(6)}</p>
                  {mapData.checkOutTime && <p className="text-[10px] text-rose-500 mt-1">الوقت: {formatTime(mapData.checkOutTime)}</p>}
                </div>
              )}
            </div>
            {(() => {
              const lat = mapData.checkInLat || mapData.checkOutLat;
              const lng = mapData.checkInLng || mapData.checkOutLng;
              if (!lat || !lng) return null;
              return (
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <iframe width="100%" height="350" style={{ border: 0 }} loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
                  />
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPinIcon className="w-3 h-3 text-tiba-primary-500" />النقطة المحددة تمثل موقع تسجيل الحضور</p>
                    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-tiba-primary-600 hover:underline">فتح في Google Maps ↗</a>
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

export default function StaffAttendanceDashboard() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance', action: 'view' }}>
      <StaffAttendanceDashboardContent />
    </PageGuard>
  );
}
