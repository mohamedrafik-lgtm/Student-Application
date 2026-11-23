'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UsersIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import PageGuard from '@/components/permissions/PageGuard';
import { TibaModal } from '@/components/ui/tiba-modal';

const MONTHS = [
  { value: '0', label: 'كل الأشهر' },
  { value: '1', label: 'يناير' },
  { value: '2', label: 'فبراير' },
  { value: '3', label: 'مارس' },
  { value: '4', label: 'أبريل' },
  { value: '5', label: 'مايو' },
  { value: '6', label: 'يونيو' },
  { value: '7', label: 'يوليو' },
  { value: '8', label: 'أغسطس' },
  { value: '9', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 3; y--) {
    years.push({ value: y.toString(), label: y.toString() });
  }
  return years;
}

interface MarketingEmployee {
  id: number;
  name: string;
  phone: string;
  email?: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  isActive: boolean;
  isArchived: boolean;
  totalAssignedTrainees: number;
  monthlyFirstContact: number;
  monthlySecondContact: number;
  marketingTargets: Array<{
    id: number;
    targetAmount: number;
    achievedAmount: number;
    month: number;
    year: number;
  }>;
  _count: {
    trainees: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface EmployeeFormData {
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
  userId: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
}

function MarketingEmployeesPageContent() {
  const [employees, setEmployees] = useState<MarketingEmployee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MarketingEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<MarketingEmployee | null>(null);
  const [isArchivingEmployee, setIsArchivingEmployee] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    phone: '',
    email: '',
    isActive: true,
    userId: '',
  });

  useEffect(() => {
    loadEmployees();
  }, [selectedMonth, selectedYear]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI(`/marketing/employees?month=${selectedMonth}&year=${selectedYear}&includeArchived=true`);
      setEmployees(response);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('فشل في تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemUsers = async (employeeId?: number) => {
    try {
      const query = employeeId ? `?employeeId=${employeeId}` : '';
      const response = await fetchAPI(`/marketing/employees/available-system-users${query}`);
      setSystemUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading system users:', error);
      toast.error('تعذر تحميل حسابات النظام المتاحة');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanedData = {
        ...formData,
        email: formData.email?.trim() || undefined,
        userId: formData.userId || null,
      };

      if (editingEmployee) {
        await fetchAPI(`/marketing/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(cleanedData),
        });
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        await fetchAPI('/marketing/employees', {
          method: 'POST',
          body: JSON.stringify(cleanedData),
        });
        toast.success('تم إضافة الموظف بنجاح');
      }

      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في حفظ بيانات الموظف');
    }
  };

  const handleEdit = (employee: MarketingEmployee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      isActive: employee.isActive,
      userId: employee.userId || '',
    });
    loadSystemUsers(employee.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await fetchAPI(`/marketing/employees/${id}`, { method: 'DELETE' });
      toast.success('تم حذف الموظف بنجاح');
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('فشل في حذف الموظف');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleArchiveToggle = async () => {
    if (!archiveTarget || isArchivingEmployee) return;
    const isArchived = !archiveTarget.isArchived;
    try {
      setIsArchivingEmployee(true);
      await fetchAPI(`/marketing/employees/${archiveTarget.id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived }),
      });
      setEmployees(current => current.map(employee => employee.id === archiveTarget.id ? { ...employee, isArchived } : employee));
      toast.success(isArchived ? 'تمت أرشفة موظف التسويق' : 'تم استرجاع موظف التسويق');
      setArchiveTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة الأرشفة');
    } finally {
      setIsArchivingEmployee(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', isActive: true, userId: '' });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || employee.phone.includes(searchTerm);
    const matchesStatus = employeeFilter === 'all' || (employeeFilter === 'archived' ? employee.isArchived : !employee.isArchived);
    return matchesSearch && matchesStatus;
  });

  const activeCount = employees.filter(e => e.isActive && !e.isArchived).length;
  const inactiveCount = employees.filter(e => !e.isActive && !e.isArchived).length;
  const archivedCount = employees.filter(e => e.isArchived).length;

  const isAllTime = selectedMonth === 0;

  const getSelectedTarget = (employee: MarketingEmployee) => {
    if (isAllTime) {
      // كل الأشهر: مجموع كل التارجتات
      if (employee.marketingTargets.length === 0) return null;
      const totalTarget = employee.marketingTargets.reduce((sum, t) => sum + t.targetAmount, 0);
      return { targetAmount: totalTarget };
    }
    return employee.marketingTargets.find(
      target => target.month === selectedMonth && target.year === selectedYear
    );
  };

  const getAchievement = (employee: MarketingEmployee) => {
    return employee.monthlyFirstContact || 0;
  };

  const periodLabel = isAllTime
    ? 'كل الفترات'
    : new Date(selectedYear, selectedMonth - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="موظفي التسويق"
        description={`إحصائيات ${periodLabel}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة التسويق', href: '/dashboard/marketing/stats' },
          { label: 'موظفي التسويق' },
        ]}
        actions={
          <Button
            onClick={() => {
              resetForm();
              loadSystemUsers();
              setShowForm(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4 rounded-lg"
          >
            <PlusIcon className="w-4 h-4 ml-1.5" />
            إضافة موظف
          </Button>
        }
      />

      {/* Filters */}
      <Card size="sm" hover={false}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 sm:max-w-[180px]">
            <SimpleSelect
              label="الشهر"
              options={MONTHS}
              value={selectedMonth.toString()}
              onChange={(v) => setSelectedMonth(parseInt(v))}
              placeholder="اختر الشهر"
            />
          </div>
          {selectedMonth !== 0 && (
            <div className="flex-1 sm:max-w-[140px]">
              <SimpleSelect
                label="السنة"
                options={getYearOptions()}
                value={selectedYear.toString()}
                onChange={(v) => setSelectedYear(parseInt(v))}
                placeholder="اختر السنة"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CardStat
          icon={<UsersIcon className="w-5 h-5" />}
          title="إجمالي الموظفين"
          value={employees.length}
          variant="primary"
        />
        <CardStat
          icon={<CheckCircleIcon className="w-5 h-5" />}
          title="موظفين نشطين"
          value={activeCount}
          variant="secondary"
        />
        <CardStat
          icon={<XCircleIcon className="w-5 h-5" />}
          title="غير نشطين"
          value={inactiveCount}
          variant="danger"
        />
        <CardStat
          icon={<ArchiveBoxIcon className="w-5 h-5" />}
          title="مؤرشفون"
          value={archivedCount}
          variant="secondary"
        />
      </div>

      <Card size="sm" hover={false}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">حالة موظفي التسويق</h2>
            <p className="mt-1 text-xs text-slate-500">اختر السجلات التي تريد عرضها</p>
          </div>
          <div role="tablist" aria-label="تصفية موظفي التسويق" className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            {([
              { key: 'active', label: 'الحاليون', count: employees.length - archivedCount, icon: <UserGroupIcon className="h-4 w-4" /> },
              { key: 'archived', label: 'المؤرشفون', count: archivedCount, icon: <ArchiveBoxIcon className="h-4 w-4" /> },
              { key: 'all', label: 'الكل', count: employees.length, icon: <UsersIcon className="h-4 w-4" /> },
            ] as const).map((filter) => {
              const selected = employeeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setEmployeeFilter(filter.key)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    selected
                      ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {filter.icon}
                  <span className="whitespace-nowrap">{filter.label}</span>
                  <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] ${selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Search */}
      <Card size="sm" hover={false}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pr-10 pl-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </Card>

      {/* Employee Form Modal */}
      <TibaModal
        open={showForm}
        onClose={resetForm}
        variant={editingEmployee ? 'primary' : 'secondary'}
        size="md"
        title={editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
        subtitle={editingEmployee ? `تعديل بيانات ${editingEmployee.name}` : 'أدخل بيانات الموظف الجديد'}
        icon={editingEmployee ? <PencilSquareIcon className="w-5 h-5 text-white" /> : <PlusIcon className="w-5 h-5 text-white" />}
        footer={
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={resetForm} className="text-xs h-9 px-5 rounded-lg border-slate-200">
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                const form = document.getElementById('employee-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-5 rounded-lg"
            >
              {editingEmployee ? 'تحديث البيانات' : 'إضافة الموظف'}
            </Button>
          </div>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-4 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">اسم الموظف *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم الموظف"
                required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">رقم الهاتف *</label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="أدخل رقم الهاتف"
                required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="اختياري"
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">حساب النظام المرتبط</label>
              <SearchableSelect
                label="حساب النظام المرتبط"
                options={[
                  { value: '', label: 'بدون ربط بحساب' },
                  ...systemUsers.map((systemUser) => ({
                    value: systemUser.id,
                    label: `${systemUser.name} — ${systemUser.email}`,
                  })),
                ]}
                value={formData.userId}
                onChange={(userId) => setFormData({ ...formData, userId })}
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                instanceId="marketing-employee-system-user"
              />
              <p className="mt-1 text-[11px] text-slate-500">تظهر الحسابات الإدارية النشطة غير المرتبطة بموظف تسويق آخر.</p>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-3 rounded-lg border border-slate-100">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-tiba-primary-600 border-slate-300 rounded focus:ring-tiba-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">موظف نشط</label>
            </div>
          </div>
        </form>
      </TibaModal>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => {
          const currentTarget = getSelectedTarget(employee);
          const targetAmount = currentTarget?.targetAmount || 0;
          const achievement = getAchievement(employee);
          const achievementPercentage = targetAmount > 0
            ? Math.round((achievement / targetAmount) * 100)
            : 0;

          return (
            <Card key={employee.id} size="sm" hover={true} className="overflow-hidden">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-tiba-primary-100 flex items-center justify-center flex-shrink-0">
                    <UserGroupIcon className="w-5 h-5 text-tiba-primary-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{employee.name}</h3>
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      employee.isArchived ? 'bg-slate-100 text-slate-600 border border-slate-200' : employee.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {employee.isArchived ? 'مؤرشف' : employee.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setArchiveTarget(employee)}
                    className={`p-1.5 rounded-md transition-colors ${employee.isArchived ? 'text-teal-600 hover:bg-teal-50' : 'text-amber-600 hover:bg-amber-50'}`}
                    title={employee.isArchived ? 'استرجاع' : 'أرشفة'}
                  >
                    {employee.isArchived ? <ArchiveBoxXMarkIcon className="w-3.5 h-3.5" /> : <ArchiveBoxIcon className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(employee)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-tiba-primary-600 hover:bg-tiba-primary-50 transition-colors"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(employee.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.phone}</span>
                </div>
                {employee.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                {employee.user && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700">
                    <UsersIcon className="w-3.5 h-3.5" />
                    <span className="truncate">حساب النظام: {employee.user.name} ({employee.user.email})</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2 text-center">
                  <div className="text-base font-bold text-emerald-700">{employee.monthlyFirstContact || 0}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">تواصل أول</div>
                </div>
                <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2 text-center">
                  <div className="text-base font-bold text-blue-700">{employee.monthlySecondContact || 0}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">تواصل ثاني</div>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-center">
                  <div className="text-base font-bold text-amber-700">
                    {targetAmount}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">التارجت</div>
                </div>
              </div>

              {/* Progress */}
              {targetAmount > 0 && (
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-slate-500">{isAllTime ? 'الهدف الإجمالي' : 'الهدف الشهري'}</span>
                    <span className="text-xs font-bold text-slate-700">
                      {achievement} / {targetAmount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        achievementPercentage >= 100 ? 'bg-emerald-500' :
                        achievementPercentage >= 75 ? 'bg-tiba-primary-500' :
                        achievementPercentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-center mt-1">
                    <span className={`text-xs font-bold ${
                      achievementPercentage >= 100 ? 'text-emerald-600' :
                      achievementPercentage >= 75 ? 'text-tiba-primary-600' :
                      achievementPercentage >= 50 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {achievementPercentage}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <Card size="lg" hover={false} className="text-center py-12">
          <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">لا توجد نتائج</h3>
          <p className="text-xs text-slate-400 mb-4">
            {searchTerm ? `لا توجد نتائج للبحث "${searchTerm}"` : 'لم يتم إضافة موظفين بعد'}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => {
                resetForm();
                loadSystemUsers();
                setShowForm(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4 rounded-lg"
            >
              <PlusIcon className="w-4 h-4 ml-1.5" />
              إضافة أول موظف
            </Button>
          )}
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && !isArchivingEmployee && setArchiveTarget(null)}>
        <AlertDialogContent className="sm:max-w-[400px] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              {archiveTarget?.isArchived ? 'استرجاع موظف التسويق' : 'أرشفة موظف التسويق'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              {archiveTarget?.isArchived
                ? `سيعود ${archiveTarget.name} للظهور ضمن موظفي التسويق الحاليين.`
                : `سيُنقل ${archiveTarget?.name} إلى قائمة المؤرشفين مع الاحتفاظ بسجلاته وبياناته، سواء كان مربوطاً بحساب نظام أم لا.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isArchivingEmployee} className="text-xs h-9 border-slate-200">إلغاء</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleArchiveToggle()}
              disabled={isArchivingEmployee}
              className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-semibold text-white shadow transition-colors disabled:cursor-wait disabled:opacity-70 ${
                archiveTarget?.isArchived ? 'bg-teal-700 hover:bg-teal-800' : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {isArchivingEmployee ? 'جارٍ التنفيذ...' : archiveTarget?.isArchived ? 'استرجاع' : 'أرشفة'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-[400px] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-9 border-slate-200">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9"
            >
              حذف الموظف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MarketingEmployeesPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'marketing.employees', action: 'view' }}>
      <MarketingEmployeesPageContent />
    </PageGuard>
  );
}
