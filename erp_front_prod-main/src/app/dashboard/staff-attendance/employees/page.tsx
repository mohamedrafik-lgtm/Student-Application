'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import PageGuard from '@/components/permissions/PageGuard';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import {
  UserPlusIcon, MagnifyingGlassIcon,
  CheckCircleIcon, XCircleIcon,
  Cog6ToothIcon, ClockIcon, CalendarDaysIcon, MapPinIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { TibaModal } from '@/components/ui/tiba-modal';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface EnrollmentZone {
  zone: { id: string; name: string; color: string; isGlobal: boolean };
}

interface Enrollment {
  id: string;
  userId: string;
  isActive: boolean;
  offDays: number[];
  customWorkDays: string[] | null;
  customWorkStartTime: string | null;
  customWorkEndTime: string | null;
  customWorkHoursPerDay: number | null;
  customLateThresholdMinutes: number | null;
  customEarlyLeaveThresholdMinutes: number | null;
  customDaySchedules: Record<string, { start: string; end: string }> | null;
  allowGlobalZones: boolean;
  zones: EnrollmentZone[];
  user: { id: string; name: string; email: string; phone?: string; photoUrl?: string | null };
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
}

interface ZoneItem {
  id: string;
  name: string;
  color: string;
  isGlobal: boolean;
  isActive: boolean;
}

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ALL_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_NAME_MAP: Record<string, string> = {
  SUNDAY: 'الأحد', MONDAY: 'الإثنين', TUESDAY: 'الثلاثاء', WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس', FRIDAY: 'الجمعة', SATURDAY: 'السبت',
};

// Calculate hours difference between two HH:mm time strings
function calcHoursDiff(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60; // overnight shift
  const diff = (endMin - startMin) / 60;
  return Math.round(diff * 2) / 2; // round to nearest 0.5
}

function EmployeesPageContent() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Edit schedule modal
  const [editTarget, setEditTarget] = useState<Enrollment | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSchedule, setEditSchedule] = useState({
    customWorkDays: null as string[] | null,
    customWorkStartTime: '' as string,
    customWorkEndTime: '' as string,
    customWorkHoursPerDay: '' as string,
    customLateThresholdMinutes: '' as string,
    customEarlyLeaveThresholdMinutes: '' as string,
    useCustomSchedule: false,
    useDaySchedules: false,
    customDaySchedules: {} as Record<string, { start: string; end: string }>,
    zoneIds: [] as string[],
    allowGlobalZones: true,
  });

  // Available zones (all active zones)
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/staff-attendance/enrollments?includeInactive=true');
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAPI('/users');
      if (data?.users) setAllUsers(data.users);
      else if (Array.isArray(data)) setAllUsers(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadZones = useCallback(async () => {
    try {
      const data = await fetchAPI('/staff-attendance/zones');
      if (Array.isArray(data)) setAvailableZones(data.filter((z: ZoneItem) => z.isActive));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadEnrollments(); loadZones(); }, [loadEnrollments, loadZones]);

  const handleOpenAdd = () => {
    loadUsers();
    setShowAddModal(true);
    setSelectedUsers([]);
    setUserSearch('');
  };

  const handleBulkEnroll = async () => {
    if (selectedUsers.length === 0) return;
    try {
      setAddSubmitting(true);
      await fetchAPI('/staff-attendance/enrollments/bulk', {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      toast.success(`تم تسجيل ${selectedUsers.length} موظف بنجاح`);
      setShowAddModal(false);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في التسجيل');
    } finally {
      setAddSubmitting(false);
    }
  };

  const toggleActive = async (e: Enrollment) => {
    try {
      await fetchAPI(`/staff-attendance/enrollments/${e.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !e.isActive }),
      });
      toast.success(e.isActive ? 'تم تعطيل الموظف' : 'تم إعادة تنشيط الموظف');
      loadEnrollments();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ');
    }
  };

  // Open edit schedule modal
  const openEditSchedule = (e: Enrollment) => {
    const hasCustom = !!(e.customWorkDays || e.customWorkStartTime || e.customWorkEndTime || e.customWorkHoursPerDay || e.customLateThresholdMinutes || e.customEarlyLeaveThresholdMinutes || e.customDaySchedules);
    // Auto-calc hours if start/end exist but hours is empty
    let hours = e.customWorkHoursPerDay != null ? String(e.customWorkHoursPerDay) : '';
    if (!hours && e.customWorkStartTime && e.customWorkEndTime) {
      const calc = calcHoursDiff(e.customWorkStartTime, e.customWorkEndTime);
      if (calc !== null) hours = String(calc);
    }
    // تحميل جدول كل يوم — المفاتيح UPPERCASE
    const hasDaySchedules = e.customDaySchedules && Object.keys(e.customDaySchedules).length > 0;
    setEditSchedule({
      customWorkDays: e.customWorkDays ? (e.customWorkDays as string[]).map((d: string) => d.toUpperCase()) : null,
      customWorkStartTime: e.customWorkStartTime || '',
      customWorkEndTime: e.customWorkEndTime || '',
      customWorkHoursPerDay: hours,
      customLateThresholdMinutes: e.customLateThresholdMinutes != null ? String(e.customLateThresholdMinutes) : '',
      customEarlyLeaveThresholdMinutes: e.customEarlyLeaveThresholdMinutes != null ? String(e.customEarlyLeaveThresholdMinutes) : '',
      useCustomSchedule: hasCustom,
      useDaySchedules: !!hasDaySchedules,
      customDaySchedules: (e.customDaySchedules as Record<string, { start: string; end: string }>) || {},
      zoneIds: e.zones?.map(z => z.zone.id) || [],
      allowGlobalZones: e.allowGlobalZones ?? true,
    });
    setEditTarget(e);
  };

  const toggleWorkDay = (day: string) => {
    setEditSchedule(prev => {
      const current = prev.customWorkDays || [];
      const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
      return { ...prev, customWorkDays: updated.length > 0 ? updated : null };
    });
  };

  const toggleZoneId = (zoneId: string) => {
    setEditSchedule(prev => ({
      ...prev,
      zoneIds: prev.zoneIds.includes(zoneId) ? prev.zoneIds.filter(id => id !== zoneId) : [...prev.zoneIds, zoneId],
    }));
  };

  const handleSaveSchedule = async () => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      const body: any = {
        zoneIds: editSchedule.zoneIds,
        allowGlobalZones: editSchedule.allowGlobalZones,
      };
      if (editSchedule.useCustomSchedule) {
        body.customWorkDays = editSchedule.customWorkDays;
        body.customLateThresholdMinutes = editSchedule.customLateThresholdMinutes ? Number(editSchedule.customLateThresholdMinutes) : null;
        body.customEarlyLeaveThresholdMinutes = editSchedule.customEarlyLeaveThresholdMinutes ? Number(editSchedule.customEarlyLeaveThresholdMinutes) : null;

        if (editSchedule.useDaySchedules) {
          // جدول مخصص لكل يوم
          const daySchedules: Record<string, { start: string; end: string }> = {};
          const workDays = editSchedule.customWorkDays || [];
          for (const day of workDays) {
            const key = day.toUpperCase();
            const sched = editSchedule.customDaySchedules[key];
            if (sched?.start && sched?.end) {
              daySchedules[key] = { start: sched.start, end: sched.end };
            }
          }
          body.customDaySchedules = Object.keys(daySchedules).length > 0 ? daySchedules : null;
          // مسح الأوقات الموحدة
          body.customWorkStartTime = null;
          body.customWorkEndTime = null;
          body.customWorkHoursPerDay = null;
        } else {
          // ساعات موحدة لكل الأيام
          body.customWorkStartTime = editSchedule.customWorkStartTime || null;
          body.customWorkEndTime = editSchedule.customWorkEndTime || null;
          body.customWorkHoursPerDay = editSchedule.customWorkHoursPerDay ? Number(editSchedule.customWorkHoursPerDay) : null;
          body.customDaySchedules = null;
        }
      } else {
        // Clear custom schedule
        body.customWorkDays = null;
        body.customWorkStartTime = null;
        body.customWorkEndTime = null;
        body.customWorkHoursPerDay = null;
        body.customLateThresholdMinutes = null;
        body.customEarlyLeaveThresholdMinutes = null;
        body.customDaySchedules = null;
      }
      await fetchAPI(`/staff-attendance/enrollments/${editTarget.userId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast.success('تم حفظ إعدادات الموظف بنجاح');
      setEditTarget(null);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في الحفظ');
    } finally {
      setEditSaving(false);
    }
  };

  const enrolledUserIds = new Set(enrollments.map(e => e.userId));
  const availableUsers = allUsers
    .filter(u => !enrolledUserIds.has(u.id))
    .filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  const filteredEnrollments = search
    ? enrollments.filter(e => e.user?.name?.toLowerCase().includes(search.toLowerCase()) || e.user?.email?.toLowerCase().includes(search.toLowerCase()))
    : enrollments;

  // Helper: show schedule summary
  const getScheduleSummary = (e: Enrollment) => {
    if (e.customWorkDays && e.customWorkDays.length > 0) {
      const days = e.customWorkDays.map(d => DAY_NAME_MAP[d] || d).join('، ');
      // جدول مخصص لكل يوم
      if (e.customDaySchedules && Object.keys(e.customDaySchedules).length > 0) {
        return `${days} • جدول مخصص لكل يوم`;
      }
      const time = e.customWorkStartTime && e.customWorkEndTime
        ? ` • ${e.customWorkStartTime}-${e.customWorkEndTime}`
        : '';
      return `${days}${time}`;
    }
    if (e.customDaySchedules && Object.keys(e.customDaySchedules).length > 0) {
      return 'جدول مخصص لكل يوم';
    }
    if (e.customWorkStartTime || e.customWorkEndTime) {
      return `${e.customWorkStartTime || '—'} - ${e.customWorkEndTime || '—'}`;
    }
    return null;
  };

  const hasCustomSchedule = (e: Enrollment) =>
    !!(e.customWorkDays || e.customWorkStartTime || e.customWorkEndTime || e.customWorkHoursPerDay);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-tiba-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-tiba-gray-500">جارٍ التحميل...</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="الموظفين المسجلين"
        description="إدارة الموظفين المسجلين في نظام الحضور والانصراف"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'حضور الموظفين', href: '/dashboard/staff-attendance' },
          { label: 'الموظفين' },
        ]}
        actions={
          <Button
            onClick={handleOpenAdd}
            size="sm"
            leftIcon={<UserPlusIcon className="w-4 h-4" />}
          >
            تسجيل موظفين
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <p className="text-xs text-tiba-gray-500">إجمالي المسجلين</p>
          <p className="text-2xl font-bold text-slate-900">{enrollments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <p className="text-xs text-tiba-gray-500">نشط</p>
          <p className="text-2xl font-bold text-tiba-secondary-600">{enrollments.filter(e => e.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-tiba-gray-200 p-4 shadow-card">
          <p className="text-xs text-tiba-gray-500">جدول مخصص</p>
          <p className="text-2xl font-bold text-purple-600">{enrollments.filter(e => hasCustomSchedule(e)).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 p-3 sm:p-4 mb-4 shadow-card">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl border border-tiba-gray-200 shadow-card overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-tiba-gray-200">
              <tr>
                <th className="text-right px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">الموظف</th>
                <th className="text-center px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">الحالة</th>
                <th className="text-center px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">الجدول</th>
                <th className="text-center px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">المناطق المربوطة</th>
                <th className="text-center px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">تاريخ التسجيل</th>
                <th className="text-center px-4 py-3.5 font-semibold text-tiba-gray-700 text-xs">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tiba-gray-100">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-tiba-gray-400">لا يوجد موظفين مسجلين</td>
                </tr>
              ) : (
                filteredEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/staff-attendance/employees/${e.userId}`} className="flex items-center gap-2.5 group">
                        <StaffAvatar name={e.user?.name || ''} photoUrl={e.user?.photoUrl} size="sm" />
                        <div>
                          <span className="text-slate-900 font-medium group-hover:text-tiba-primary-600 transition-colors block">{e.user?.name}</span>
                          <span className="text-[11px] text-tiba-gray-400">{e.user?.email}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="text-center px-4 py-3">
                      {e.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-secondary-200">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircleIcon className="w-3.5 h-3.5" /> غير نشط
                        </span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3 text-xs">
                      {hasCustomSchedule(e) ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 mb-1">
                            <ClockIcon className="w-3 h-3" /> جدول مخصص
                          </span>
                          {getScheduleSummary(e) && (
                            <p className="text-[10px] text-tiba-gray-400 mt-0.5 max-w-[200px] truncate">{getScheduleSummary(e)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-tiba-gray-400">الإعدادات العامة</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3 text-xs">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* Global zones - show as blocked if allowGlobalZones=false and has custom zones */}
                        {availableZones.filter(z => z.isGlobal).map(z => {
                          const blocked = !e.allowGlobalZones && e.zones && e.zones.some(ez => !ez.zone.isGlobal);
                          return (
                            <span
                              key={z.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                                blocked ? 'bg-tiba-gray-100 text-tiba-gray-400 border-tiba-gray-200 line-through' : ''
                              }`}
                              style={blocked ? {} : { backgroundColor: `${z.color}10`, color: z.color, borderColor: `${z.color}30` }}
                              title={blocked ? 'محظور - لا يُسمح بالنقاط العامة' : 'عامة'}
                            >
                              <GlobeAltIcon className="w-3 h-3" />
                              {z.name}
                            </span>
                          );
                        })}
                        {/* Custom linked zones */}
                        {e.zones && e.zones.filter(ez => !ez.zone.isGlobal).map((ez) => (
                          <span
                            key={ez.zone.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border"
                            style={{ backgroundColor: `${ez.zone.color}10`, color: ez.zone.color, borderColor: `${ez.zone.color}30` }}
                          >
                            <MapPinIcon className="w-3 h-3" />
                            {ez.zone.name}
                          </span>
                        ))}
                        {availableZones.filter(z => z.isGlobal).length === 0 && (!e.zones || e.zones.filter(ez => !ez.zone.isGlobal).length === 0) && (
                          <span className="text-tiba-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 text-xs text-slate-400">
                      {new Date(e.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="inline-flex items-center rounded-lg border border-tiba-gray-200 overflow-hidden">
                          <button
                            onClick={() => !e.isActive && toggleActive(e)}
                            className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                              e.isActive
                                ? 'bg-tiba-secondary-500 text-white'
                                : 'bg-white text-tiba-gray-500 hover:bg-tiba-secondary-50 hover:text-tiba-secondary-700'
                            }`}
                          >
                            تفعيل
                          </button>
                          <button
                            onClick={() => e.isActive && toggleActive(e)}
                            className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                              !e.isActive
                                ? 'bg-tiba-danger-500 text-white'
                                : 'bg-white text-tiba-gray-500 hover:bg-tiba-danger-50 hover:text-tiba-danger-700'
                            }`}
                          >
                            إيقاف
                          </button>
                        </div>
                        <button
                          onClick={() => openEditSchedule(e)}
                          className="p-1.5 text-tiba-gray-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors"
                          title="إعدادات الجدول والمناطق"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-tiba-gray-100">
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8 text-tiba-gray-400 text-sm">لا يوجد موظفين مسجلين</div>
          ) : (
            filteredEnrollments.map((e) => (
              <div key={e.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/dashboard/staff-attendance/employees/${e.userId}`} className="flex items-center gap-2.5">
                    <StaffAvatar name={e.user?.name || ''} photoUrl={e.user?.photoUrl} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{e.user?.name}</p>
                      <p className="text-[11px] text-tiba-gray-400">{e.user?.email}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex items-center rounded-lg border border-tiba-gray-200 overflow-hidden">
                      <button
                        onClick={() => !e.isActive && toggleActive(e)}
                        className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                          e.isActive
                            ? 'bg-tiba-secondary-500 text-white'
                            : 'bg-white text-tiba-gray-500 hover:bg-tiba-secondary-50'
                        }`}
                      >
                        تفعيل
                      </button>
                      <button
                        onClick={() => e.isActive && toggleActive(e)}
                        className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                          !e.isActive
                            ? 'bg-tiba-danger-500 text-white'
                            : 'bg-white text-tiba-gray-500 hover:bg-tiba-danger-50'
                        }`}
                      >
                        إيقاف
                      </button>
                    </div>
                    <button
                      onClick={() => openEditSchedule(e)}
                      className="p-1.5 text-tiba-gray-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-tiba-gray-400 flex-wrap">
                  {hasCustomSchedule(e) ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                      <ClockIcon className="w-3 h-3" /> جدول مخصص
                    </span>
                  ) : (
                    <span>الإعدادات العامة</span>
                  )}
                  {e.zones && e.zones.filter(ez => !ez.zone.isGlobal).length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" /> {e.zones.filter(ez => !ez.zone.isGlobal).length} منطقة مخصصة
                    </span>
                  )}
                  {availableZones.filter(z => z.isGlobal).length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <GlobeAltIcon className="w-3 h-3" /> {availableZones.filter(z => z.isGlobal).length} عامة
                    </span>
                  )}
                  <span>منذ: {new Date(e.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Employees Modal */}
      <TibaModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        variant="primary"
        size="lg"
        title="تسجيل موظفين في نظام الحضور"
        subtitle="اختر الموظفين لإضافتهم لنظام الحضور والانصراف"
        icon={<UserPlusIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button
              size="sm"
              onClick={handleBulkEnroll}
              disabled={selectedUsers.length === 0 || addSubmitting}
              leftIcon={addSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
            >
              تسجيل ({selectedUsers.length})
            </Button>
          </div>
        }
      >
        <div>
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-all"
              />
            </div>
            {selectedUsers.length > 0 && (
              <p className="text-xs text-tiba-primary-600 mt-2 font-medium">تم اختيار {selectedUsers.length} موظف</p>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
            {availableUsers.length === 0 ? (
              <p className="text-center py-8 text-sm text-tiba-gray-400">لا يوجد موظفين متاحين للتسجيل</p>
            ) : (
              availableUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={(ev) => {
                      setSelectedUsers(prev =>
                        ev.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                      );
                    }}
                    className="w-4 h-4 text-tiba-primary-600 border-tiba-gray-300 rounded focus:ring-tiba-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-tiba-gray-400">{u.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </TibaModal>

      {/* Edit Schedule & Zones Modal */}
      <TibaModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        variant="primary"
        size="lg"
        title={`إعدادات: ${editTarget?.user?.name || ''}`}
        subtitle="تخصيص جدول العمل والمناطق المسموحة لهذا الموظف"
        icon={<Cog6ToothIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button
              size="sm"
              onClick={handleSaveSchedule}
              disabled={editSaving}
              leftIcon={editSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
            >
              حفظ الإعدادات
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Custom Schedule Toggle */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-200/60">
            <label className="relative inline-flex items-center cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={editSchedule.useCustomSchedule}
                onChange={e => setEditSchedule(prev => ({ ...prev, useCustomSchedule: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-[22px] bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-purple-600" />
            </label>
            <div>
              <p className="text-xs font-semibold text-tiba-gray-800">جدول عمل مخصص</p>
              <p className="text-[11px] text-tiba-gray-500 mt-0.5">
                {editSchedule.useCustomSchedule
                  ? 'يتم استخدام جدول مخصص لهذا الموظف بدلاً من الإعدادات العامة'
                  : 'يتم استخدام الإعدادات العامة لنظام الحضور'
                }
              </p>
            </div>
          </div>

          {/* Custom Schedule Fields */}
          {editSchedule.useCustomSchedule && (
            <div className="space-y-4 p-4 rounded-xl bg-white border border-tiba-gray-200">
              {/* Work Days */}
              <div>
                <label className="text-xs font-semibold text-tiba-gray-700 block mb-2">
                  <CalendarDaysIcon className="w-3.5 h-3.5 inline ml-1" /> أيام العمل
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => toggleWorkDay(day)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        editSchedule.customWorkDays?.includes(day)
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-tiba-gray-100 text-tiba-gray-600 hover:bg-tiba-gray-200'
                      }`}
                    >
                      {DAY_NAMES[idx]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle: Unified vs Per-Day */}
              {editSchedule.customWorkDays && editSchedule.customWorkDays.length > 0 && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200/60">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSchedule.useDaySchedules}
                      onChange={e => setEditSchedule(prev => ({ ...prev, useDaySchedules: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                  <div>
                    <p className="text-xs font-semibold text-tiba-gray-800">
                      {editSchedule.useDaySchedules ? 'ساعات مختلفة لكل يوم' : 'ساعات موحدة لكل الأيام'}
                    </p>
                    <p className="text-[10px] text-tiba-gray-500 mt-0.5">
                      {editSchedule.useDaySchedules
                        ? 'تحديد وقت بداية ونهاية مختلف لكل يوم عمل'
                        : 'نفس وقت البداية والنهاية لجميع أيام العمل'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Per-Day Schedule */}
              {editSchedule.useDaySchedules && editSchedule.customWorkDays && editSchedule.customWorkDays.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-tiba-gray-700 block">
                    <ClockIcon className="w-3.5 h-3.5 inline ml-1" /> أوقات كل يوم
                  </label>
                  <div className="space-y-2">
                    {editSchedule.customWorkDays.map(day => {
                      const key = day.toUpperCase();
                      const sched = editSchedule.customDaySchedules[key] || { start: '', end: '' };
                      return (
                        <div key={day} className="flex items-center gap-3 p-2.5 rounded-lg bg-indigo-50/40 border border-indigo-100">
                          <span className="text-xs font-semibold text-indigo-700 w-16 flex-shrink-0">{DAY_NAME_MAP[day]}</span>
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={sched.start}
                              onChange={e => {
                                const val = e.target.value;
                                setEditSchedule(prev => ({
                                  ...prev,
                                  customDaySchedules: { ...prev.customDaySchedules, [key]: { ...prev.customDaySchedules[key], start: val, end: prev.customDaySchedules[key]?.end || '' } },
                                }));
                              }}
                              className="flex-1 px-2 py-1.5 text-sm border border-tiba-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                            <span className="text-xs text-tiba-gray-400">→</span>
                            <input
                              type="time"
                              value={sched.end}
                              onChange={e => {
                                const val = e.target.value;
                                setEditSchedule(prev => ({
                                  ...prev,
                                  customDaySchedules: { ...prev.customDaySchedules, [key]: { start: prev.customDaySchedules[key]?.start || '', end: val } },
                                }));
                              }}
                              className="flex-1 px-2 py-1.5 text-sm border border-tiba-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                            {sched.start && sched.end && (
                              <span className="text-[10px] text-indigo-500 font-medium w-12 text-center flex-shrink-0">
                                {calcHoursDiff(sched.start, sched.end) ?? '—'}h
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
              <>
              {/* Unified Work Hours */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-tiba-gray-500 block mb-1">بداية الدوام</label>
                  <input
                    type="time"
                    value={editSchedule.customWorkStartTime}
                    onChange={e => {
                      const start = e.target.value;
                      setEditSchedule(prev => {
                        const hours = calcHoursDiff(start, prev.customWorkEndTime);
                        return { ...prev, customWorkStartTime: start, ...(hours !== null ? { customWorkHoursPerDay: String(hours) } : {}) };
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-tiba-gray-500 block mb-1">نهاية الدوام</label>
                  <input
                    type="time"
                    value={editSchedule.customWorkEndTime}
                    onChange={e => {
                      const end = e.target.value;
                      setEditSchedule(prev => {
                        const hours = calcHoursDiff(prev.customWorkStartTime, end);
                        return { ...prev, customWorkEndTime: end, ...(hours !== null ? { customWorkHoursPerDay: String(hours) } : {}) };
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-tiba-gray-500 block mb-1">ساعات العمل/يوم</label>
                  <input
                    type="number"
                    value={editSchedule.customWorkHoursPerDay}
                    onChange={e => setEditSchedule(prev => ({ ...prev, customWorkHoursPerDay: e.target.value }))}
                    placeholder="يُحسب تلقائياً"
                    min="1"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                  />
                  {editSchedule.customWorkStartTime && editSchedule.customWorkEndTime && (
                    <p className="text-[10px] text-purple-500 mt-1">محسوب من أوقات الدوام</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-tiba-gray-500 block mb-1">حد التأخير (دقيقة)</label>
                  <input
                    type="number"
                    value={editSchedule.customLateThresholdMinutes}
                    onChange={e => setEditSchedule(prev => ({ ...prev, customLateThresholdMinutes: e.target.value }))}
                    placeholder="مثال: 15"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-tiba-gray-500 block mb-1">حد الانصراف المبكر (دقيقة)</label>
                  <input
                    type="number"
                    value={editSchedule.customEarlyLeaveThresholdMinutes}
                    onChange={e => setEditSchedule(prev => ({ ...prev, customEarlyLeaveThresholdMinutes: e.target.value }))}
                    placeholder="مثال: 15"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                  />
                </div>
              </div>
              </>
              )}

              {/* حدود التأخير/الانصراف المبكر — تظهر دائماً في وضع جدول لكل يوم */}
              {editSchedule.useDaySchedules && editSchedule.customWorkDays && editSchedule.customWorkDays.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[11px] text-tiba-gray-500 block mb-1">حد التأخير (دقيقة)</label>
                    <input
                      type="number"
                      value={editSchedule.customLateThresholdMinutes}
                      onChange={e => setEditSchedule(prev => ({ ...prev, customLateThresholdMinutes: e.target.value }))}
                      placeholder="مثال: 15"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-tiba-gray-500 block mb-1">حد الانصراف المبكر (دقيقة)</label>
                    <input
                      type="number"
                      value={editSchedule.customEarlyLeaveThresholdMinutes}
                      onChange={e => setEditSchedule(prev => ({ ...prev, customEarlyLeaveThresholdMinutes: e.target.value }))}
                      placeholder="مثال: 15"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-tiba-gray-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zone Assignment - All zones */}
          {availableZones.length > 0 && (
            <div className="p-4 rounded-xl bg-white border border-tiba-gray-200">
              <label className="text-xs font-semibold text-tiba-gray-700 block mb-2">
                <MapPinIcon className="w-3.5 h-3.5 inline ml-1" /> مناطق الحضور
              </label>
              <p className="text-[11px] text-tiba-gray-400 mb-3">
                حدد المناطق المسموح بتسجيل الحضور منها لهذا الموظف
              </p>

              {/* Allow global zones toggle - only show when employee has custom zones */}
              {editSchedule.zoneIds.length > 0 && availableZones.some(z => z.isGlobal) && (
                <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-tiba-primary-50/60 border border-tiba-primary-200">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSchedule.allowGlobalZones}
                      onChange={e => setEditSchedule(prev => ({ ...prev, allowGlobalZones: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-tiba-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tiba-primary-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-tiba-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tiba-primary-600" />
                  </label>
                  <div>
                    <p className="text-xs font-semibold text-tiba-primary-800">
                      {editSchedule.allowGlobalZones ? 'مسموح بالنقاط العامة أيضاً' : 'فقط النقاط المخصصة'}
                    </p>
                    <p className="text-[10px] text-tiba-primary-600 mt-0.5">
                      {editSchedule.allowGlobalZones
                        ? 'الموظف يستطيع تسجيل الحضور من النقاط العامة والمخصصة معاً'
                        : 'الموظف يستطيع تسجيل الحضور فقط من النقاط المخصصة له'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {/* Global zones */}
                {availableZones.filter(z => z.isGlobal).map(z => {
                  const isDisabled = editSchedule.zoneIds.length > 0 && !editSchedule.allowGlobalZones;
                  return (
                    <div
                      key={z.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                        isDisabled
                          ? 'bg-tiba-gray-50 border-tiba-gray-200 opacity-50'
                          : 'bg-tiba-primary-50/50 border-tiba-primary-100'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                      <span className="text-sm text-tiba-gray-700 flex-1">{z.name}</span>
                      {isDisabled ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-tiba-gray-100 text-tiba-gray-500">
                          <XCircleIcon className="w-3 h-3" /> محظورة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-tiba-primary-100 text-tiba-primary-700">
                          <GlobeAltIcon className="w-3 h-3" /> عامة - مفعّلة
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Custom zones - toggleable */}
                {availableZones.filter(z => !z.isGlobal).map(z => (
                  <label
                    key={z.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      editSchedule.zoneIds.includes(z.id)
                        ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100/60'
                        : 'bg-tiba-gray-50 border border-tiba-gray-200 hover:bg-tiba-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editSchedule.zoneIds.includes(z.id)}
                      onChange={() => toggleZoneId(z.id)}
                      className="w-4 h-4 text-amber-600 border-tiba-gray-300 rounded focus:ring-amber-500"
                    />
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                    <span className="text-sm text-tiba-gray-700 flex-1">{z.name}</span>
                    {editSchedule.zoneIds.includes(z.id) ? (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">مربوطة</span>
                    ) : (
                      <span className="text-[10px] font-medium text-tiba-gray-400 bg-tiba-gray-100 px-1.5 py-0.5 rounded-md">غير مربوطة</span>
                    )}
                  </label>
                ))}
                {availableZones.filter(z => !z.isGlobal).length === 0 && (
                  <p className="text-[11px] text-tiba-gray-400 text-center py-2">لا توجد مناطق مخصصة. يمكنك إنشاؤها من صفحة الإعدادات</p>
                )}
              </div>
            </div>
          )}
        </div>
      </TibaModal>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'staff-attendance.enrollments', action: 'view' }}>
      <EmployeesPageContent />
    </PageGuard>
  );
}
