'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import React from 'react';

import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
  ShieldCheckIcon,
  UserIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import AuditLogItem from '@/app/components/AuditLogItem';
import AuditLogFilters, { FilterOptions } from '@/app/components/AuditLogFilters';
import { filterAuditLogs, getFilteredStats, sortAuditLogs } from '@/app/utils/auditLogFilters';
import PageGuard from '@/components/permissions/PageGuard';

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  user?: {
    name: string;
    email: string;
  };
  details: any;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

const groupLogsByDate = (logs: AuditLog[]) => {
  return logs.reduce((acc, log) => {
    if (!log.createdAt) {
      const dayLabel = 'تاريخ غير معروف';
      if (!acc[dayLabel]) {
        acc[dayLabel] = [];
      }
      acc[dayLabel].push(log);
      return acc;
    }

    let date;
    try {
      date = parseISO(log.createdAt);
      if (isNaN(date.getTime())) {
        const dayLabel = 'تاريخ غير صالح';
        if (!acc[dayLabel]) {
          acc[dayLabel] = [];
        }
        acc[dayLabel].push(log);
        return acc;
      }
    } catch (error) {
      console.error('Error parsing date:', error, log.createdAt);
      const dayLabel = 'تاريخ غير صالح';
      if (!acc[dayLabel]) {
        acc[dayLabel] = [];
      }
      acc[dayLabel].push(log);
      return acc;
    }

    let dayLabel;

    if (isToday(date)) {
      dayLabel = 'اليوم';
    } else if (isYesterday(date)) {
      dayLabel = 'الأمس';
    } else {
      try {
        dayLabel = format(date, 'EEEE, d MMMM yyyy', { locale: ar });
      } catch (error) {
        console.error('Error formatting date:', error);
        dayLabel = 'تاريخ غير صالح';
      }
    }

    if (!acc[dayLabel]) {
      acc[dayLabel] = [];
    }
    acc[dayLabel].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);
};

function AuditLogsPageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    actions: [],
    entities: [],
    users: [],
    dateRange: { start: '', end: '' },
    quickDate: '',
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'action' | 'user' | 'entity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchAuditLogs = async () => {
        setLoading(true);
        try {
          const data = await fetchAPI('/audit-logs');
          if (data && data.logs && Array.isArray(data.logs)) {
            setLogs(data.logs);
          } else if (data && data.logs && typeof data.logs === 'object' && !Array.isArray(data.logs)) {
            // If logs is an object but not an array, convert to array (e.g., if it's a paginated response)
            console.log('Converting logs object to array:', data.logs);
            const logsArray = Object.values(data.logs) as AuditLog[];
            setLogs(logsArray);
          } else {
            console.warn('No valid logs data received from API:', data);
            setLogs([]);
          }
        } catch (error: any) {
          console.error('Error fetching audit logs:', error);
          if (error.message && error.message.includes('Cannot GET')) {
            setError('واجهة سجلات التدقيق غير متاحة حالياً في الخادم الخلفي');
          } else if (error.status === 404) {
            setError('واجهة سجلات التدقيق غير متاحة حالياً');
          } else {
            setError('حدث خطأ أثناء تحميل سجلات التدقيق');
          }
          setLogs([]);
        } finally {
          setLoading(false);
        }
      };

      fetchAuditLogs();
    } else if (isAuthenticated && user) {
      fetchAuditLogs();
    }
  }, [isAuthenticated, user]);

  // تطبيق الفلاتر والترتيب
  const filteredLogs = filterAuditLogs(logs, filters);
  const sortedLogs = sortAuditLogs(filteredLogs, sortBy, sortOrder);
  const groupedLogs = groupLogsByDate(sortedLogs);
  const stats = getFilteredStats(logs, filters);

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSort = (field: 'date' | 'action' | 'user' | 'entity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل سجلات التدقيق...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="سجلات التدقيق"
        description="مراقبة جميع العمليات والأنشطة في النظام"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'سجلات التدقيق' }
        ]}
        actions={
          <Button 
            variant="default" 
            size="md"
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            تصدير التقرير
          </Button>
        }
      />

      {error && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <div className="p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  واجهة سجلات التدقيق غير متاحة
                </h3>
                <p className="text-red-700 mb-4">
                  {error}
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>ملاحظة:</strong> هذه الميزة تتطلب إعداد endpoint خاص في الخادم الخلفي. 
                    يمكن للمطور إضافة هذه الواجهة لتفعيل مراقبة الأنشطة في النظام.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!error && logs.length === 0 && (
        <Card className="mt-6 border-dashed border-gray-300 bg-white">
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              لا توجد سجلات تدقيق متاحة
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              لم يتم تسجيل أي أنشطة في النظام بعد، أو أن واجهة سجلات التدقيق غير متاحة حالياً.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
                <p className="text-sm text-blue-800">
                  <strong>معلومات:</strong> سجلات التدقيق تساعد في مراقبة الأنشطة المهمة مثل تسجيل الدخول، 
                  إنشاء/تعديل البيانات، وحذف السجلات.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!error && logs.length > 0 && (
        <>
          {/* نظام البحث والفلاتر */}
          <AuditLogFilters
            logs={logs}
            onFiltersChange={handleFiltersChange}
            isOpen={isFiltersOpen}
            onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
          />

          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardStat 
                icon={<ShieldCheckIcon className="w-6 h-6" />}
                title="السجلات المفلترة"
                value={stats.total}
                change={`من ${stats.originalTotal} سجل`}
                changeType={stats.total === stats.originalTotal ? "positive" : "negative"}
                variant="primary"
              />
            </Card>

            <Card>
              <CardStat 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="عمليات الإنشاء"
                value={stats.creates}
                change={`${Math.round((stats.creates / stats.total) * 100)}% من المفلترة`}
                changeType="positive"
                variant="secondary"
              />
            </Card>

            <Card>
              <CardStat 
                icon={<ClockIcon className="w-6 h-6" />}
                title="عمليات التحديث"
                value={stats.updates}
                change={`${Math.round((stats.updates / stats.total) * 100)}% من المفلترة`}
                changeType="positive"
                variant="warning"
              />
            </Card>

            <Card>
              <CardStat 
                icon={<UserIcon className="w-6 h-6" />}
                title="تسجيلات الدخول"
                value={stats.logins}
                change={`${Math.round((stats.logins / stats.total) * 100)}% من المفلترة`}
                changeType="positive"
                variant="warning"
              />
            </Card>
          </div>

          {/* خيارات الترتيب */}
          {filteredLogs.length > 0 && (
            <Card className="mb-6">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">ترتيب حسب:</span>
                    <div className="flex gap-2">
                      {[
                        { key: 'date', label: 'التاريخ' },
                        { key: 'action', label: 'نوع الإجراء' },
                        { key: 'user', label: 'المستخدم' },
                        { key: 'entity', label: 'نوع الكيان' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => handleSort(key as any)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            sortBy === key
                              ? 'bg-tiba-primary-100 text-tiba-primary-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                          {sortBy === key && (
                            <React.Fragment key={`sort-icon-${sortOrder}`}>
                              {sortOrder === 'asc' ? (
                                <ArrowUpIcon key="asc-icon" className="w-3 h-3 inline mr-1" />
                              ) : (
                                <ArrowDownIcon key="desc-icon" className="w-3 h-3 inline mr-1" />
                              )}
                            </React.Fragment>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredLogs.length} سجل
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* الخط الزمني */}
          {filteredLogs.length > 0 ? (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <CalendarIcon className="w-6 h-6 text-tiba-primary-600 mr-2" />
                  <h3 className="text-lg font-semibold text-tiba-gray-800">سجل الأنشطة</h3>
                </div>
                <div className="text-sm text-tiba-gray-500">
                  {Object.keys(groupedLogs).length} أيام
                </div>
              </div>
              
              <div className="space-y-8">
                {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                  <div key={date} className="relative">
                    <div className="flex items-center mb-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <div className="flex-shrink-0 px-6">
                        <div className="bg-gradient-to-r from-tiba-primary-50 to-blue-50 border border-tiba-primary-200 rounded-full px-4 py-2 shadow-sm">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-tiba-primary-600 mr-2" />
                            <h3 className="text-sm font-semibold text-tiba-primary-800">{date}</h3>
                            <span className="ml-2 text-xs text-tiba-primary-600 bg-white px-2 py-1 rounded-full font-medium">
                              {dateLogs.length} سجل
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {dateLogs.map((log, index) => (
                        <AuditLogItem key={log.id || `log-${index}`} log={log} isLast={index === dateLogs.length - 1} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="border-dashed border-gray-300 bg-white">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  لا توجد نتائج
                </h3>
                <p className="text-gray-600 mb-4">
                  لا توجد سجلات تطابق معايير البحث والفلاتر المحددة.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    search: '',
                    actions: [],
                    entities: [],
                    users: [],
                    dateRange: { start: '', end: '' },
                    quickDate: '',
                  })}
                >
                  مسح الفلاتر
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <PageGuard>
      <AuditLogsPageContent />
    </PageGuard>
  );
}