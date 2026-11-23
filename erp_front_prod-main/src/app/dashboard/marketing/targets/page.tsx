'use client';

import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { SimpleSelect } from '@/app/components/ui/Select';
import { Button } from '@/components/ui/button';
import {
  PencilSquareIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import PageGuard from '@/components/permissions/PageGuard';

interface MarketingEmployee {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
  monthlyFirstContact?: number;
  monthlySecondContact?: number;
}

interface MarketingTarget {
  id: number;
  employeeId: number;
  employee: MarketingEmployee;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  notes?: string;
  setAt: string;
}

interface TargetFormData {
  employeeIds: number[];
  month: number;
  year: number;
  targetAmount: string;
  notes?: string;
}

const MONTHS = [
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

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2022; y <= currentYear + 1; y++) {
    years.push({ value: y.toString(), label: y.toString() });
  }
  return years;
};

function MarketingTargetsPageContent() {
  const [employees, setEmployees] = useState<MarketingEmployee[]>([]);
  const [targets, setTargets] = useState<MarketingTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MarketingTarget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<TargetFormData>({
    employeeIds: [],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: '',
    notes: '',
  });
  const targetAmountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmployees();
    loadTargets();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (showForm && targetAmountInputRef.current) {
      setTimeout(() => {
        targetAmountInputRef.current?.focus();
        targetAmountInputRef.current?.select();
      }, 100);
    }
  }, [showForm]);

  const loadEmployees = async () => {
    try {
      const response = await fetchAPI('/marketing/employees');
      setEmployees(response.filter((emp: MarketingEmployee) => emp.isActive));
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('فشل في تحميل بيانات الموظفين');
    }
  };

  const loadTargets = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI(`/marketing/targets?month=${selectedMonth}&year=${selectedYear}`);
      setTargets(response);
    } catch (error) {
      console.error('Error loading targets:', error);
      toast.error('فشل في تحميل بيانات الأهداف');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmountNum = parseInt(formData.targetAmount) || 0;

    if (formData.employeeIds.length === 0 || targetAmountNum <= 0) {
      toast.error('يرجى اختيار موظف واحد على الأقل وتحديد عدد المتدربين المطلوب');
      return;
    }

    try {
      if (editingTarget) {
        await fetchAPI(`/marketing/targets/${editingTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            targetAmount: targetAmountNum,
            notes: formData.notes,
          }),
        });
        toast.success('تم تحديث الهدف بنجاح');
      } else {
        const promises = formData.employeeIds.map(employeeId =>
          fetchAPI('/marketing/targets', {
            method: 'POST',
            body: JSON.stringify({
              employeeId,
              month: formData.month,
              year: formData.year,
              targetAmount: targetAmountNum,
              notes: formData.notes,
            }),
          })
        );
        await Promise.all(promises);
        toast.success(`تم تحديد الأهداف بنجاح لـ ${formData.employeeIds.length} موظف`);
      }

      resetForm();
      loadTargets();
    } catch (error: any) {
      console.error('Error saving target:', error);
      toast.error(error.message || 'فشل في حفظ الهدف');
    }
  };

  const handleEdit = (target: MarketingTarget) => {
    setEditingTarget(target);
    setFormData({
      employeeIds: [target.employeeId],
      month: target.month,
      year: target.year,
      targetAmount: target.targetAmount.toString(),
      notes: target.notes || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      employeeIds: [],
      month: selectedMonth,
      year: selectedYear,
      targetAmount: '',
      notes: '',
    });
    setEditingTarget(null);
    setShowForm(false);
  };

  const getEmployeeTarget = (employeeId: number) => {
    return targets.find(target => target.employeeId === employeeId);
  };

  const getAchievementPercentage = (target: MarketingTarget, employee: MarketingEmployee) => {
    const achieved = employee.monthlyFirstContact || 0;
    return target.targetAmount > 0 ? Math.round((achieved / target.targetAmount) * 100) : 0;
  };

  const totalTargetSet = targets.length;
  const avgTarget = targets.length > 0
    ? Math.round(targets.reduce((s, t) => s + t.targetAmount, 0) / targets.length)
    : 0;
  const totalAchieved = employees.reduce((s, e) => s + (e.monthlyFirstContact || 0), 0);
  const totalRequired = targets.reduce((s, t) => s + t.targetAmount, 0);
  const overallPercentage = totalRequired > 0 ? Math.round((totalAchieved / totalRequired) * 100) : 0;

  const monthLabel = MONTHS.find(m => m.value === selectedMonth.toString())?.label || '';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="التارجت الشهري"
        description="تحديد ومتابعة أهداف فريق التسويق"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة التسويق', href: '/dashboard/marketing/stats' },
          { label: 'التارجت' },
        ]}
        actions={
          <Button
            onClick={() => {
              setFormData({
                employeeIds: employees.map(emp => emp.id),
                month: selectedMonth,
                year: selectedYear,
                targetAmount: '',
                notes: '',
              });
              setEditingTarget(null);
              setShowForm(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4 rounded-lg"
          >
            <PlusIcon className="w-4 h-4 ml-1.5" />
            تحديد هدف جديد
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
          <div className="flex-1 sm:max-w-[140px]">
            <SimpleSelect
              label="السنة"
              options={getYearOptions()}
              value={selectedYear.toString()}
              onChange={(v) => setSelectedYear(parseInt(v))}
              placeholder="اختر السنة"
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardStat
          icon={<ChartBarIcon className="w-5 h-5" />}
          title="أهداف محددة"
          value={totalTargetSet}
          change={`من أصل ${employees.length} موظف`}
          variant="primary"
        />
        <CardStat
          icon={<UserGroupIcon className="w-5 h-5" />}
          title="متوسط التارجت"
          value={avgTarget}
          change="متدرب لكل موظف"
          variant="secondary"
        />
        <CardStat
          icon={overallPercentage >= 75 ? <ArrowTrendingUpIcon className="w-5 h-5" /> : <ArrowTrendingDownIcon className="w-5 h-5" />}
          title="نسبة الإنجاز الكلية"
          value={`${overallPercentage}%`}
          change={`${totalAchieved} من ${totalRequired}`}
          changeType={overallPercentage >= 75 ? 'positive' : overallPercentage >= 50 ? 'neutral' : 'negative'}
          variant={overallPercentage >= 75 ? 'secondary' : overallPercentage >= 50 ? 'warning' : 'danger'}
        />
      </div>

      {/* Target Form */}
      {showForm && (
        <Card size="lg" hover={false}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingTarget ? `تعديل هدف ${employees.find(emp => emp.id === editingTarget.employeeId)?.name}` : 'تحديد هدف جديد'}
              </h2>
              {editingTarget && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {MONTHS.find(m => m.value === editingTarget.month.toString())?.label} {editingTarget.year}
                </p>
              )}
            </div>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">الموظفين *</label>
                {!editingTarget ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-tiba-primary-50 rounded-lg border border-tiba-primary-100">
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={formData.employeeIds.length === employees.length}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            employeeIds: e.target.checked ? employees.map(emp => emp.id) : [],
                          });
                        }}
                        className="w-4 h-4 text-tiba-primary-600 border-slate-300 rounded focus:ring-tiba-primary-500"
                      />
                      <label htmlFor="select-all" className="text-xs font-medium text-tiba-primary-800">
                        تحديد الكل ({employees.length})
                      </label>
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-50">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            id={`emp-${employee.id}`}
                            checked={formData.employeeIds.includes(employee.id)}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                employeeIds: e.target.checked
                                  ? [...formData.employeeIds, employee.id]
                                  : formData.employeeIds.filter(id => id !== employee.id),
                              });
                            }}
                            className="w-4 h-4 text-tiba-primary-600 border-slate-300 rounded focus:ring-tiba-primary-500"
                          />
                          <label htmlFor={`emp-${employee.id}`} className="text-xs text-slate-700 cursor-pointer flex-1">
                            {employee.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.employeeIds.length > 0 && (
                      <p className="text-[10px] text-tiba-primary-600 font-medium">تم اختيار {formData.employeeIds.length} موظف</p>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                    {employees.find(emp => emp.id === editingTarget?.employeeId)?.name}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">عدد المتدربين المطلوب *</label>
                  <input
                    ref={targetAmountInputRef}
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="عدد المتدربين"
                    min="1"
                    required
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">ملاحظات</label>
                  <input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="اختياري"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-5 rounded-lg">
                {editingTarget ? 'تحديث الهدف' : 'تحديد الهدف'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="text-xs h-9 px-5 rounded-lg border-slate-200">
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Employees Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((employee) => {
          const target = getEmployeeTarget(employee.id);
          const percentage = target ? getAchievementPercentage(target, employee) : 0;

          return (
            <Card key={employee.id} size="sm" hover={true}>
              {/* Employee Header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-lg bg-tiba-primary-100 flex items-center justify-center flex-shrink-0">
                  <UserGroupIcon className="w-[1.125rem] h-[1.125rem] text-tiba-primary-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{employee.name}</h3>
                  <p className="text-[10px] text-slate-400">{employee.phone}</p>
                </div>
              </div>

              {target ? (
                <div className="space-y-3">
                  {/* Target Stats */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">الهدف</span>
                      <span className="text-sm font-bold text-slate-900">{target.targetAmount} متدرب</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-md p-2 border border-slate-100 text-center">
                        <div className="text-sm font-bold text-emerald-600">{employee.monthlyFirstContact || 0}</div>
                        <div className="text-[10px] text-slate-400">تواصل أول</div>
                      </div>
                      <div className="bg-white rounded-md p-2 border border-slate-100 text-center">
                        <div className="text-sm font-bold text-blue-600">{employee.monthlySecondContact || 0}</div>
                        <div className="text-[10px] text-slate-400">تواصل ثاني</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            percentage >= 100 ? 'bg-emerald-500' :
                            percentage >= 75 ? 'bg-tiba-primary-500' :
                            percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs font-bold ${
                          percentage >= 100 ? 'text-emerald-600' :
                          percentage >= 75 ? 'text-tiba-primary-600' :
                          percentage >= 50 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {percentage}%
                        </span>
                        <button
                          onClick={() => handleEdit(target)}
                          className="text-[10px] text-tiba-primary-600 hover:text-tiba-primary-700 font-medium flex items-center gap-0.5"
                        >
                          <PencilSquareIcon className="w-3 h-3" />
                          تعديل
                        </button>
                      </div>
                    </div>

                    {target.notes && (
                      <p className="text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-100">
                        {target.notes}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <ChartBarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">لم يتم تحديد هدف لهذا الشهر</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {employees.length === 0 && (
        <Card size="lg" hover={false} className="text-center py-12">
          <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">لا توجد موظفين نشطين</h3>
          <p className="text-xs text-slate-400">يجب إضافة موظفين أولاً لتحديد الأهداف</p>
        </Card>
      )}
    </div>
  );
}

export default function MarketingTargetsPage() {
  return (
    <PageGuard>
      <MarketingTargetsPageContent />
    </PageGuard>
  );
}
