'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { SimpleSelect } from '@/app/components/ui/Select';
import {
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrophyIcon,
  UserIcon,
  PhoneArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import PageGuard from '@/components/permissions/PageGuard';

interface MarketingStats {
  overview: {
    totalEmployees: number;
    totalTrainees: number;
    assignedTrainees: number;
    unassignedTrainees: number;
    assignmentRate: number;
    firstContactTrainees: number;
    unassignedFirstContact: number;
    firstContactRate: number;
    secondContactTrainees: number;
    totalContacts: number;
  };
  monthly: {
    newTrainees: number;
    assignedTrainees: number;
    firstContactTrainees: number;
    secondContactTrainees: number;
    assignmentRate: number;
    firstContactRate: number;
    totalContacts: number;
  };
  employees: Array<{
    id: number;
    name: string;
    monthlyTarget: number;
    totalAssigned: number;
    monthlyAssigned: number;
    monthlyFirstContact: number;
    monthlySecondContact: number;
    totalContacts: number;
    achievementRate: number;
  }>;
  topPerformers: Array<{
    id: number;
    name: string;
    monthlyTarget: number;
    totalAssigned: number;
    monthlyAssigned: number;
    monthlyFirstContact: number;
    monthlySecondContact: number;
    totalContacts: number;
    achievementRate: number;
    rank: number;
  }>;
  worstPerformers: Array<{
    id: number;
    name: string;
    monthlyTarget: number;
    totalAssigned: number;
    monthlyAssigned: number;
    monthlyFirstContact: number;
    monthlySecondContact: number;
    totalContacts: number;
    achievementRate: number;
    rank: number;
  }>;
  programs: Array<{
    programId: number;
    programName: string;
    count: number;
  }>;
  detailed: {
    statusDistribution: Array<{
      status: string;
      count: number;
    }>;
    averagePerEmployee: number;
    activeEmployeesRate: number;
    averageSecondContact: number;
  };
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
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

function MarketingStatsPageContent() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadStats();
  }, [selectedMonth, selectedYear]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI(`/marketing/stats?month=${selectedMonth}&year=${selectedYear}`);
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('فشل في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <PageHeader
          title="إحصائيات التسويق"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'إدارة التسويق' },
            { label: 'الإحصائيات' },
          ]}
        />
        <Card size="lg" hover={false} className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">لا توجد بيانات</h3>
          <p className="text-xs text-slate-400">لم يتم العثور على إحصائيات للفترة المحددة</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="إحصائيات التسويق"
        description="تحليل أداء فريق التسويق والتواصل مع المتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة التسويق', href: '/dashboard/marketing/employees' },
          { label: 'الإحصائيات' },
        ]}
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <CardStat
          icon={<UsersIcon className="w-5 h-5" />}
          title="موظفي التسويق"
          value={stats.overview.totalEmployees}
          variant="primary"
        />
        <CardStat
          icon={<PhoneArrowUpRightIcon className="w-5 h-5" />}
          title="التواصل الأول"
          value={stats.overview.firstContactTrainees}
          change="يحتسب في التارجت"
          changeType="positive"
          variant="secondary"
        />
        <CardStat
          icon={<ChartBarIcon className="w-5 h-5" />}
          title="معدل التواصل"
          value={`${stats.overview.firstContactRate}%`}
          variant="primary"
        />
        <CardStat
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          title="التواصل الشهري"
          value={stats.monthly.firstContactTrainees}
          change="هذا الشهر"
          variant="warning"
        />
      </div>

      {/* Top & Worst Performers */}
      {stats.detailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 */}
          <Card size="sm" hover={false}>
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon className="w-4.5 h-4.5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">أفضل 5 موظفين</h3>
            </div>
            {stats.topPerformers && stats.topPerformers.length > 0 ? (
              <div className="space-y-2">
                {stats.topPerformers.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                      emp.rank === 1 ? 'bg-amber-500' :
                      emp.rank === 2 ? 'bg-slate-400' :
                      emp.rank === 3 ? 'bg-orange-400' : 'bg-tiba-primary-400'
                    }`}>
                      {emp.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.monthlyFirstContact} من {emp.monthlyTarget}</div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className={`text-sm font-bold ${
                        emp.achievementRate >= 100 ? 'text-emerald-600' :
                        emp.achievementRate >= 75 ? 'text-tiba-primary-600' : 'text-amber-600'
                      }`}>
                        {emp.achievementRate}%
                      </span>
                    </div>
                    <div className="w-16 flex-shrink-0">
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${
                            emp.rank === 1 ? 'bg-amber-500' :
                            emp.rank === 2 ? 'bg-slate-400' :
                            emp.rank === 3 ? 'bg-orange-400' : 'bg-tiba-primary-400'
                          }`}
                          style={{ width: `${Math.min(emp.achievementRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrophyIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">لا توجد بيانات أداء</p>
              </div>
            )}
          </Card>

          {/* Worst 5 */}
          <Card size="sm" hover={false}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowTrendingDownIcon className="w-4.5 h-4.5 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900">أضعف 5 موظفين</h3>
            </div>
            {stats.worstPerformers && stats.worstPerformers.length > 0 ? (
              <div className="space-y-2">
                {stats.worstPerformers.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                      emp.rank === 1 ? 'bg-red-500' :
                      emp.rank === 2 ? 'bg-orange-500' :
                      emp.rank === 3 ? 'bg-amber-500' : 'bg-slate-400'
                    }`}>
                      {emp.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.monthlyFirstContact} من {emp.monthlyTarget}</div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className={`text-sm font-bold ${
                        emp.achievementRate >= 50 ? 'text-amber-600' :
                        emp.achievementRate >= 25 ? 'text-red-500' : 'text-red-700'
                      }`}>
                        {emp.achievementRate}%
                      </span>
                    </div>
                    <div className="w-16 flex-shrink-0">
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${
                            emp.rank === 1 ? 'bg-red-500' :
                            emp.rank === 2 ? 'bg-orange-500' :
                            emp.rank === 3 ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(emp.achievementRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ArrowTrendingDownIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">جميع الموظفين يحققون أداءً جيداً</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Employee Performance Table */}
      <Card size="sm" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-4.5 h-4.5 text-tiba-primary-600" />
          <h3 className="text-sm font-bold text-slate-900">أداء موظفي التسويق</h3>
          <span className="text-[10px] text-slate-400">تفاصيل كل موظف</span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase">الموظف</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase">التارجت</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase">تواصل أول</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase">تواصل ثاني</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase">الإنجاز</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase min-w-[80px]">التقدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-tiba-primary-100 flex items-center justify-center">
                        <UserIcon className="w-3.5 h-3.5 text-tiba-primary-700" />
                      </div>
                      <span className="text-xs font-semibold text-slate-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs font-medium text-slate-700">{emp.monthlyTarget}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-bold text-emerald-600">{emp.monthlyFirstContact || 0}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-medium text-blue-600">{emp.monthlySecondContact || 0}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                      emp.achievementRate >= 100 ? 'bg-emerald-50 text-emerald-700' :
                      emp.achievementRate >= 75 ? 'bg-blue-50 text-blue-700' :
                      emp.achievementRate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {emp.achievementRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          emp.achievementRate >= 100 ? 'bg-emerald-500' :
                          emp.achievementRate >= 75 ? 'bg-tiba-primary-500' :
                          emp.achievementRate >= 50 ? 'bg-amber-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.min(emp.achievementRate, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2">
          {stats.employees.map((emp) => (
            <div key={emp.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-tiba-primary-100 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5 text-tiba-primary-700" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{emp.name}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  emp.achievementRate >= 100 ? 'bg-emerald-50 text-emerald-700' :
                  emp.achievementRate >= 75 ? 'bg-blue-50 text-blue-700' :
                  emp.achievementRate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                }`}>
                  {emp.achievementRate.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">التارجت</div>
                  <div className="text-xs font-bold text-slate-700">{emp.monthlyTarget}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">تواصل أول</div>
                  <div className="text-xs font-bold text-emerald-600">{emp.monthlyFirstContact || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">تواصل ثاني</div>
                  <div className="text-xs font-bold text-blue-600">{emp.monthlySecondContact || 0}</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    emp.achievementRate >= 100 ? 'bg-emerald-500' :
                    emp.achievementRate >= 75 ? 'bg-tiba-primary-500' :
                    emp.achievementRate >= 50 ? 'bg-amber-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(emp.achievementRate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {stats.employees.length === 0 && (
          <div className="text-center py-8">
            <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">لا توجد بيانات أداء للفترة المحددة</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MarketingStatsPage() {
  return (
    <PageGuard>
      <MarketingStatsPageContent />
    </PageGuard>
  );
}
