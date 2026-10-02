'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon,
  CalendarDaysIcon, UserGroupIcon, CheckCircleIcon, XCircleIcon,
  ExclamationTriangleIcon, ChartBarIcon, XMarkIcon, EyeIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';
import StaffAvatar from '@/components/ui/StaffAvatar';

// ============ Interfaces ============
interface Employee {
  user: { id: string; name: string; email: string; photoUrl?: string | null; phone?: string };
  log: any;
  status: string;
}

interface UserLog {
  id: string;
  userId: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workedMinutes?: number | null;
  requiredMinutes?: number | null;
  overtimeMinutes?: number | null;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  notes?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  autoCheckedOut?: boolean;
}

interface UserLogsData {
  user: { id: string; name: string; email: string; phone?: string; photoUrl?: string | null };
  logs: UserLog[];
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

// ============ Constants ============
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PRESENT: { label: 'حاضر', cls: 'bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-secondary-200', dot: 'bg-tiba-secondary-500' },
  ABSENT_UNEXCUSED: { label: 'غائب بدون إذن', cls: 'bg-tiba-danger-50 text-tiba-danger-700 border border-tiba-danger-200', dot: 'bg-tiba-danger-500' },
  ABSENT: { label: 'غائب', cls: 'bg-tiba-danger-50 text-tiba-danger-700 border border-tiba-danger-200', dot: 'bg-tiba-danger-500' },
  LATE: { label: 'متأخر', cls: 'bg-tiba-warning-50 text-tiba-warning-700 border border-tiba-warning-200', dot: 'bg-tiba-warning-500' },
  EARLY_LEAVE: { label: 'انصراف مبكر', cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  ABSENT_EXCUSED: { label: 'إذن', cls: 'bg-teal-50 text-teal-700 border border-teal-200', dot: 'bg-teal-500' },
  LEAVE: { label: 'إذن', cls: 'bg-teal-50 text-teal-700 border border-teal-200', dot: 'bg-teal-500' },
  HOLIDAY: { label: 'عطلة', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  DAY_OFF: { label: 'يوم إجازة', cls: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
};

// ============ Utility Components ============
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] || { label: status, cls: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
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

function formatMinutes(min?: number | null) {
  if (min === null || min === undefined || min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} دقيقة`;
  return `${h}س ${m > 0 ? `${m}د` : ''}`;
}

function getMonthDateRange(year: number, month: number) {
  const s = new Date(year, month, 1);
  const e = new Date(year, month + 1, 0);
  return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
}

// ============ Main Component ============
function AdminLogsContent() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeLogs, setEmployeeLogs] = useState<UserLogsData | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);

  // Load enrolled employees
  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const data = await fetchAPI('/staff-attendance/today');
      if (data?.employees) setEmployees(data.employees);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل قائمة الموظفين');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Load selected employee logs for chosen month
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
    if (selectedEmployee) loadEmployeeLogs(selectedEmployee);
  }, [selectedEmployee, selectedYear, selectedMonth, loadEmployeeLogs]);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    return employees.filter(e => e.user?.name?.toLowerCase().includes(search.toLowerCase()));
  }, [employees, search]);

  const handleSelectEmployee = (userId: string) => {
    if (selectedEmployee === userId) {
      setSelectedEmployee(null);
      setEmployeeLogs(null);
    } else {
      setSelectedEmployee(userId);
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
  const goToCurrentMonth = () => {
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth());
  };

  return (
    <div>
      <PageHeader
        title="سجلات حضور الموظفين"
        description="اختر موظف لعرض سجل حضوره الشهري بالتفصيل"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'الموارد البشرية', href: '/dashboard/staff-attendance' },
          { label: 'سجلات الحضور' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={loadEmployees} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            تحديث
          </Button>
        }
      />

      {/* Month Picker + Search */}
      <div className="bg-white rounded-2xl border border-tiba-gray-200 p-4 sm:p-5 mb-5 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100/50 rounded-xl border border-tiba-primary-200 p-1">
              <button onClick={nextMonth} className="p-2 hover:bg-white/80 rounded-lg transition-all">
                <ChevronRightIcon className="w-4 h-4 text-tiba-primary-600" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 min-w-[160px] justify-center">
                <CalendarDaysIcon className="w-4 h-4 text-tiba-primary-500" />
                <span className="text-sm font-bold text-tiba-primary-800">{ARABIC_MONTHS[selectedMonth]} {selectedYear}</span>
              </div>
              <button onClick={prevMonth} className="p-2 hover:bg-white/80 rounded-lg transition-all">
                <ChevronLeftIcon className="w-4 h-4 text-tiba-primary-600" />
              </button>
            </div>
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-2 text-xs font-medium text-tiba-primary-600 hover:text-tiba-primary-700 bg-tiba-primary-50 hover:bg-tiba-primary-100 rounded-lg border border-tiba-primary-200 transition-all"
            >
              الشهر الحالي
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-tiba-gray-100">
          <div className="flex items-center gap-1.5">
            <UserGroupIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">إجمالي الموظفين:</span>
            <span className="text-xs font-bold text-slate-800">{employees.length}</span>
          </div>
          {selectedEmployee && employeeLogs && (
            <div className="flex items-center gap-1.5 pr-3 border-r border-tiba-gray-200">
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">سجلات الموظف المحدد:</span>
              <span className="text-xs font-bold text-emerald-700">{employeeLogs.logs.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Employee Sidebar + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Employees List */}
        <div className={`transition-all duration-300 ${selectedEmployee ? 'lg:w-[340px] flex-shrink-0' : 'w-full'}`}>
          <div className="bg-white rounded-2xl border border-tiba-gray-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-tiba-gray-100 bg-gradient-to-l from-tiba-primary-50 to-white">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-tiba-primary-500" />
                الموظفون المسجلون
              </h3>
            </div>

            {loadingEmployees ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-slate-500">جارٍ تحميل الموظفين...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <UserGroupIcon className="w-12 h-12 text-tiba-gray-200 mx-auto mb-3" />
                <p className="text-sm text-tiba-gray-400 font-medium">لا يوجد موظفون</p>
              </div>
            ) : selectedEmployee ? (
              /* Compact list when employee is selected */
              <div className="divide-y divide-tiba-gray-100 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployee === emp.user.id;
                  return (
                    <button
                      key={emp.user.id}
                      onClick={() => handleSelectEmployee(emp.user.id)}
                      className={`w-full flex items-center gap-3 p-3 text-right transition-all
                        ${isSelected
                          ? 'bg-tiba-primary-50 border-r-4 border-r-tiba-primary-500'
                          : 'hover:bg-slate-50'
                        }`}
                    >
                      <StaffAvatar
                        name={emp.user.name}
                        photoUrl={emp.user.photoUrl}
                        size="sm"
                        status={emp.status !== 'NOT_RECORDED' ? emp.status : undefined}
                        showStatusDot={emp.status !== 'NOT_RECORDED'}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-tiba-primary-700' : 'text-slate-900'}`}>{emp.user.name}</p>
                        {emp.status !== 'NOT_RECORDED' ? (
                          <StatusBadge status={emp.status} />
                        ) : (
                          <span className="text-[11px] text-slate-400">لم يسجل بعد</span>
                        )}
                      </div>
                      <EyeIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-tiba-primary-500' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Full grid when no employee selected */
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.user.id}
                      onClick={() => handleSelectEmployee(emp.user.id)}
                      className="group relative bg-white rounded-xl border-2 border-tiba-gray-200 hover:border-tiba-primary-300 p-4 text-right transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <StaffAvatar
                          name={emp.user.name}
                          photoUrl={emp.user.photoUrl}
                          size="xl"
                          status={emp.status !== 'NOT_RECORDED' ? emp.status : undefined}
                          showStatusRing={emp.status !== 'NOT_RECORDED'}
                        />
                        <div className="min-w-0 w-full">
                          <p className="text-sm font-bold text-slate-900 truncate">{emp.user.name}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{emp.user.email}</p>
                          <div className="mt-2">
                            {emp.status !== 'NOT_RECORDED' ? (
                              <StatusBadge status={emp.status} />
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border text-slate-500 bg-slate-50 border-slate-200">
                                لم يسجل بعد
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-tiba-gray-100 flex items-center justify-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-tiba-primary-500 transition-colors">
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>عرض السجل الشهري</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Employee Detail Panel */}
        {selectedEmployee && (
          <div className="flex-1 min-w-0">
            {loadingLogs ? (
              <div className="bg-white rounded-2xl border border-tiba-gray-200 shadow-card p-12 text-center">
                <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-slate-500">جارٍ تحميل سجلات الموظف...</p>
              </div>
            ) : employeeLogs ? (
              <div className="space-y-4">
                {/* Employee Header with gradient */}
                <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-tiba-secondary-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
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
                      <Link
                        href={`/dashboard/staff-attendance/employees/${employeeLogs.user.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all"
                      >
                        الملف الكامل ↗
                      </Link>
                      <button
                        onClick={() => { setSelectedEmployee(null); setEmployeeLogs(null); }}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'أيام العمل', value: employeeLogs.stats.totalDays, icon: CalendarDaysIcon, color: 'from-slate-50 to-slate-100/80', iconColor: 'text-slate-500', border: 'border-slate-200' },
                    { label: 'حاضر', value: employeeLogs.stats.presentDays, icon: CheckCircleIcon, color: 'from-emerald-50 to-emerald-100/80', iconColor: 'text-emerald-500', border: 'border-emerald-200' },
                    { label: 'غائب', value: employeeLogs.stats.absentDays, icon: XCircleIcon, color: 'from-red-50 to-red-100/80', iconColor: 'text-red-500', border: 'border-red-200' },
                    { label: 'إذن', value: employeeLogs.stats.excusedDays, icon: ExclamationTriangleIcon, color: 'from-teal-50 to-teal-100/80', iconColor: 'text-teal-500', border: 'border-teal-200' },
                    { label: 'تأخير', value: employeeLogs.stats.lateDays, icon: ClockIcon, color: 'from-orange-50 to-orange-100/80', iconColor: 'text-orange-500', border: 'border-orange-200' },
                    { label: 'نسبة الحضور', value: `${employeeLogs.stats.attendanceRate}%`, icon: ChartBarIcon, color: 'from-tiba-primary-50 to-tiba-primary-100/80', iconColor: 'text-tiba-primary-500', border: 'border-tiba-primary-200' },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-xl border ${stat.border} p-3 text-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor} mx-auto mb-1.5`} />
                      <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Attendance Progress Bar */}
                {employeeLogs.stats.totalDays > 0 && (
                  <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">نسبة الحضور الشهرية</span>
                      <span className="text-xs font-bold text-tiba-primary-600">{employeeLogs.stats.attendanceRate}%</span>
                    </div>
                    <div className="w-full h-3 bg-tiba-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          employeeLogs.stats.attendanceRate >= 90
                            ? 'bg-gradient-to-l from-emerald-400 to-emerald-500'
                            : employeeLogs.stats.attendanceRate >= 70
                              ? 'bg-gradient-to-l from-amber-400 to-amber-500'
                              : 'bg-gradient-to-l from-red-400 to-red-500'
                        }`}
                        style={{ width: `${employeeLogs.stats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                      <span>ساعات العمل: {formatMinutes(employeeLogs.stats.totalWorkedMinutes)}</span>
                      <span>ساعات إضافية: {formatMinutes(employeeLogs.stats.totalOvertimeMinutes)}</span>
                    </div>
                  </div>
                )}

                {/* Logs Table */}
                <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-tiba-gray-100 bg-slate-50/50">
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
                      <DocumentTextIcon className="w-12 h-12 text-tiba-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-tiba-gray-400 font-medium">لا توجد سجلات لهذا الشهر</p>
                      <p className="text-xs text-tiba-gray-300 mt-1">جرب اختيار شهر آخر</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-tiba-gray-200">
                              <th className="text-right px-4 py-3 font-semibold text-tiba-gray-700 text-xs">التاريخ</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">الحالة</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">الحضور</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">الانصراف</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">المدة</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">الموقع</th>
                              <th className="text-center px-4 py-3 font-semibold text-tiba-gray-700 text-xs">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-tiba-gray-100">
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
                                <td className="text-center px-4 py-3 text-slate-700 tabular-nums font-medium">
                                  <div className="flex items-center justify-center gap-1">
                                    {formatTime(log.checkOutTime)}
                                    {log.autoCheckedOut && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-200">تلقائي</span>}
                                  </div>
                                </td>
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
                      <div className="md:hidden divide-y divide-tiba-gray-100">
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
                                {log.autoCheckedOut && <span className="text-[9px] font-semibold text-sky-600">تلقائي</span>}
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
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Location Map Modal */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
                    <div className="rounded-xl overflow-hidden border border-tiba-gray-200 shadow-sm">
                    <iframe
                      width="100%"
                      height="350"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
                    />
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-t border-tiba-gray-200">
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3 text-tiba-primary-500" />
                        النقطة المحددة تمثل موقع تسجيل الحضور
                      </p>
                      <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-tiba-primary-600 hover:text-tiba-primary-700 hover:underline">
                        فتح في Google Maps ↗
                      </a>
                    </div>
                  </div>
                );
              })()}

              {mapData.checkInLat && mapData.checkInLng && mapData.checkOutLat && mapData.checkOutLng && (
                <div className="mt-3 p-3 bg-tiba-primary-50 rounded-xl border border-tiba-primary-100 text-center">
                  <p className="text-xs text-tiba-primary-600 font-medium">
                    المسافة بين الحضور والانصراف: {(() => {
                      const R = 6371000;
                      const dLat = (mapData.checkOutLat! - mapData.checkInLat!) * Math.PI / 180;
                      const dLon = (mapData.checkOutLng! - mapData.checkInLng!) * Math.PI / 180;
                      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(mapData.checkInLat! * Math.PI / 180) * Math.cos(mapData.checkOutLat! * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                      const d = R * c;
                      return d < 1000 ? `${Math.round(d)} متر` : `${(d/1000).toFixed(2)} كم`;
                    })()}
                  </p>
                </div>
              )}
            </div>
        </TibaModal>
      )}
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance', action: 'view' }}>
      <AdminLogsContent />
    </PageGuard>
  );
}
