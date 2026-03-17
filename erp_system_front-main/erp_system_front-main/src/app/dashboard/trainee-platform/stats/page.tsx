'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ComputerDesktopIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { 
  FiActivity, 
  FiClock, 
  FiPercent,
  FiRefreshCw 
} from 'react-icons/fi';
import { fetchAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/permissions/ProtectedRoute';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardStat } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import PageGuard from '@/components/permissions/PageGuard';

interface PlatformStats {
  overview: {
    totalAccounts: number;
    activeAccounts: number;
    inactiveAccounts: number;
    registeredTrainees: number;
    unregisteredTrainees: number;
  };
  loginActivity: Array<{ date: string; count: number }>;
  programsStats: Array<{ id: number; nameAr: string; traineeCount: number }>;
  recentActivity: Array<{
    id: string;
    lastLoginAt: string;
    trainee: {
      nameAr: string;
      program: { nameAr: string };
    };
  }>;
}

interface Program {
  id: number;
  nameAr: string;
}

function TraineePlatformStatsPageContent() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [expiring, setExpiring] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProgram && selectedProgram !== 'ALL') {
        params.programId = selectedProgram;
      }
      const response = await fetchAPI(`/trainee-platform/stats?${new URLSearchParams(params).toString()}`);
      setStats(response);
    } catch (error: any) {
      toast.error(error.message || 'فشل جلب إحصائيات المنصة');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetchAPI('/programs');
      setPrograms(response.data || response || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPrograms();
  }, [selectedProgram]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // دالة لتنسيق الوقت بالثواني إلى ساعات ودقائق
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}ث`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}د`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}س ${minutes}د`;
    }
  };

  const getActivitySummary = () => {
    if (!stats?.loginActivity) return 'لا توجد بيانات';
    const totalLogins = stats.loginActivity.reduce((sum, item) => sum + item.count, 0);
    return `${totalLogins} عملية دخول في آخر ${stats.loginActivity.length} أيام`;
  };

  const getRegistrationPercentage = () => {
    if (!stats?.overview) return 0;
    const total = stats.overview.registeredTrainees + stats.overview.unregisteredTrainees;
    if (total === 0) return 0;
    return ((stats.overview.registeredTrainees / total) * 100).toFixed(1);
  };

  const getActivityPercentage = () => {
    if (!stats?.overview.totalAccounts) return 0;
    return ((stats.overview.activeAccounts / stats.overview.totalAccounts) * 100).toFixed(1);
  };

  const handleExpireSessions = async () => {
    setExpiring(true);
    try {
      const response = await fetchAPI('/trainee-platform/expire-sessions', {
        method: 'POST'
      });
      toast.success(`تم إنهاء ${response.expiredSessions} جلسة منتهية الصلاحية`);
      // إعادة تحميل الإحصائيات
      await fetchStats();
    } catch (error) {
      console.error('Error expiring sessions:', error);
      toast.error('حدث خطأ في إنهاء الجلسات');
    } finally {
      setExpiring(false);
    }
  };

  const handleDebugSessions = async () => {
    try {
      const response = await fetchAPI('/trainee-platform/debug-sessions');
      console.log('🔍 Session Debug Info:', response);
      
      // عرض معلومات التشخيص
      const { summary, issues } = response;
      let message = `📊 إجمالي الجلسات: ${summary.totalSessions}\n`;
      message += `✅ جلسات نشطة: ${summary.activeSessions}\n`;
      message += `✅ جلسات مكتملة: ${summary.completedSessions}\n`;
      message += `⏱️ جلسات بوقت: ${summary.sessionsWithDuration}\n`;
      message += `📈 إحصائيات متدربين: ${summary.traineeStatsCount}`;

      if (issues.noSessions) {
        message += '\n⚠️ مشكلة: لا توجد جلسات!';
      }
      if (issues.allSessionsActive) {
        message += '\n⚠️ مشكلة: جميع الجلسات نشطة - تحتاج إنهاء!';
      }
      if (issues.noSessionsWithDuration) {
        message += '\n⚠️ مشكلة: لا توجد جلسات بمدة زمنية!';
      }

      alert(message);
    } catch (error) {
      console.error('Error debugging sessions:', error);
      toast.error('حدث خطأ في التشخيص');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiba-primary-600"></div>
        <span className="mr-2 text-tiba-gray-600">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إحصائيات منصة المتدربين"
        description="نظرة شاملة على نشاط وأداء المتدربين على المنصة الإلكترونية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'منصة المتدربين' },
          { label: 'الإحصائيات' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={fetchStats}
            leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />}
          >
            تحديث البيانات
          </Button>
        }
      />

      {/* أدوات التصفية */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <SearchableSelect
              value={selectedProgram}
              onValueChange={setSelectedProgram}
              placeholder="جميع البرامج"
              className="w-full md:w-[200px]"
              options={[
                { value: 'ALL', label: 'جميع البرامج' },
                ...programs.map(program => ({
                  value: String(program.id),
                  label: program.nameAr,
                }))
              ]}
            />
            <Button
              onClick={handleExpireSessions}
              disabled={expiring}
              variant="outline"
              className="w-full md:w-auto"
            >
              {expiring ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
                  جاري المعالجة...
                </div>
              ) : (
                <>
                  <FiRefreshCw className="w-4 h-4 ml-2" />
                  تحديث الإحصائيات
                </>
              )}
            </Button>
            <Button
              onClick={handleDebugSessions}
              variant="secondary"
              className="w-full md:w-auto"
            >
              🔍 تشخيص الجلسات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات العامة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardStat
          icon={<UserGroupIcon className="w-6 h-6" />}
          title="إجمالي الحسابات"
          value={stats?.overview.totalAccounts ?? 0}
          variant="primary"
        />
        
        <CardStat
          icon={<CheckCircleIcon className="w-6 h-6" />}
          title="حسابات مفعلة"
          value={stats?.overview.activeAccounts ?? 0}
          change={`${getActivityPercentage()}% من الإجمالي`}
          changeType="positive"
          variant="secondary"
        />
        
        <CardStat
          icon={<XCircleIcon className="w-6 h-6" />}
          title="حسابات معطلة"
          value={stats?.overview.inactiveAccounts ?? 0}
          variant="warning"
        />
        
        <CardStat
          icon={<ComputerDesktopIcon className="w-6 h-6" />}
          title="معدل التسجيل"
          value={`${getRegistrationPercentage()}%`}
          change={`${stats?.overview.registeredTrainees ?? 0} من ${(stats?.overview.registeredTrainees ?? 0) + (stats?.overview.unregisteredTrainees ?? 0)}`}
          changeType="neutral"
        />
      </div>

      {/* إحصائيات الوقت والنشاط */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <CardStat
          icon={<FiActivity className="w-6 h-6" />}
          title="إجمالي الجلسات"
          value={stats?.overview.totalSessions ?? 0}
          variant="secondary"
        />
        
        <CardStat
          icon={<FiClock className="w-6 h-6" />}
          title="إجمالي الوقت المقضي"
          value={formatTime(stats?.overview.totalTimeSpent ?? 0)}
          variant="info"
        />
        
        <CardStat
          icon={<FiClock className="w-6 h-6" />}
          title="متوسط مدة الجلسة"
          value={formatTime(stats?.overview.averageSessionTime ?? 0)}
          variant="primary"
        />
        
        <CardStat
          icon={<CalendarDaysIcon className="w-6 h-6" />}
          title="نشط اليوم"
          value={stats?.overview.activeToday ?? 0}
          variant="success"
        />
      </div>

      {/* تفصيل الحسابات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5" />
              تفصيل المتدربين
            </CardTitle>
            <CardDescription>
              توزيع المتدربين حسب حالة التسجيل في المنصة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-tiba-secondary-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-tiba-secondary-600" />
                  <span className="font-medium text-tiba-secondary-800">متدربون مسجلون</span>
                </div>
                <span className="text-2xl font-bold text-tiba-secondary-800">
                  {stats?.overview.registeredTrainees ?? 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-tiba-warning-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircleIcon className="w-5 h-5 text-tiba-warning-600" />
                  <span className="font-medium text-tiba-warning-800">متدربون غير مسجلين</span>
                </div>
                <span className="text-2xl font-bold text-tiba-warning-800">
                  {stats?.overview.unregisteredTrainees ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              نشاط تسجيل الدخول
            </CardTitle>
            <CardDescription>
              ملخص عمليات تسجيل الدخول الأخيرة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100 border border-tiba-primary-200 rounded-lg">
                <div className="text-lg font-semibold text-tiba-primary-800">
                  {getActivitySummary()}
                </div>
                <div className="text-sm text-tiba-primary-600 mt-1">
                  إجمالي عمليات الدخول المسجلة
                </div>
              </div>
              
              {stats?.loginActivity && stats.loginActivity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-tiba-gray-900">النشاط اليومي (آخر 7 أيام):</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {stats.loginActivity.slice(-7).map((activity, index) => (
                      <div key={index} className="flex justify-between text-sm p-3 bg-white border border-tiba-gray-200 rounded-lg hover:bg-tiba-gray-25 transition-colors">
                        <span className="text-tiba-gray-700">
                          {new Date(activity.date).toLocaleDateString('en-GB')}
                        </span>
                        <span className="font-medium text-tiba-primary-700 px-2 py-1 bg-tiba-primary-50 rounded">{activity.count} دخول</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أحدث النشاط */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5" />
            أحدث عمليات تسجيل الدخول
          </CardTitle>
          <CardDescription>
            آخر المتدربين الذين سجلوا دخولهم إلى المنصة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-white border border-tiba-gray-200 rounded-lg hover:bg-tiba-primary-25 hover:border-tiba-primary-200 transition-all duration-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-tiba-primary-100 to-tiba-primary-200 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-tiba-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium text-tiba-gray-800">
                          {activity.trainee?.nameAr || 'متدرب'}
                        </div>
                        <div className="text-sm text-tiba-gray-500">
                          {activity.trainee?.program?.nameAr || 'برنامج'}
                        </div>
                        {activity.duration && (
                          <div className="text-xs text-tiba-primary-600">
                            مدة الجلسة: {formatTime(activity.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-tiba-gray-600 bg-tiba-gray-50 px-2 py-1 rounded mb-1">
                        {activity.logoutAt ? formatDate(activity.logoutAt) : formatDate(activity.loginAt)}
                      </div>
                      {activity.device && (
                        <div className="text-xs text-tiba-gray-500">
                          {activity.device}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="bg-tiba-gray-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <ComputerDesktopIcon className="w-6 h-6 text-tiba-gray-400" />
                  </div>
                  <p className="text-tiba-gray-500">لا توجد أنشطة حديثة</p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
      
      {/* إحصائيات الأنشطة والأجهزة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* أكثر الأنشطة شيوعاً */}
        {stats?.topActivities && stats.topActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiActivity className="w-5 h-5" />
                أكثر الأنشطة شيوعاً
              </CardTitle>
              <CardDescription>
                الأنشطة الأكثر استخداماً من قبل المتدربين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topActivities.map((activity, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white border border-tiba-gray-200 rounded-lg hover:bg-tiba-primary-25 hover:border-tiba-primary-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-tiba-secondary-100 to-tiba-secondary-200 rounded-full flex items-center justify-center text-xs font-bold text-tiba-secondary-600">
                        {index + 1}
                      </div>
                      <span className="font-medium text-tiba-gray-800">
                        {activity.type === 'PAGE_VIEW' && 'زيارة صفحة'}
                        {activity.type === 'VIDEO_WATCH' && 'مشاهدة فيديو'}
                        {activity.type === 'DOWNLOAD' && 'تحميل ملف'}
                        {activity.type === 'QUIZ_ATTEMPT' && 'محاولة اختبار'}
                        {activity.type === 'ASSIGNMENT_SUBMIT' && 'تقديم مهمة'}
                        {activity.type === 'DISCUSSION_POST' && 'مشاركة نقاش'}
                        {activity.type === 'OTHER' && 'نشاط آخر'}
                        {!['PAGE_VIEW', 'VIDEO_WATCH', 'DOWNLOAD', 'QUIZ_ATTEMPT', 'ASSIGNMENT_SUBMIT', 'DISCUSSION_POST', 'OTHER'].includes(activity.type) && activity.type}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-tiba-primary-700">{activity.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* إحصائيات الأجهزة */}
        {stats?.deviceStats && stats.deviceStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ComputerDesktopIcon className="w-5 h-5" />
                إحصائيات الأجهزة
              </CardTitle>
              <CardDescription>
                أنواع الأجهزة المستخدمة للوصول للمنصة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.deviceStats.map((device, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white border border-tiba-gray-200 rounded-lg hover:bg-tiba-primary-25 hover:border-tiba-primary-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-tiba-primary-100 to-tiba-primary-200 rounded-full flex items-center justify-center">
                        {device.device === 'Desktop' && <ComputerDesktopIcon className="w-4 h-4 text-tiba-primary-600" />}
                        {device.device === 'Mobile' && <FiActivity className="w-4 h-4 text-tiba-primary-600" />}
                        {device.device === 'Tablet' && <ComputerDesktopIcon className="w-4 h-4 text-tiba-primary-600" />}
                        {!['Desktop', 'Mobile', 'Tablet'].includes(device.device || '') && <ComputerDesktopIcon className="w-4 h-4 text-tiba-primary-600" />}
                      </div>
                      <span className="font-medium text-tiba-gray-800">
                        {device.device === 'Desktop' && 'حاسوب مكتبي'}
                        {device.device === 'Mobile' && 'هاتف محمول'}
                        {device.device === 'Tablet' && 'جهاز لوحي'}
                        {!['Desktop', 'Mobile', 'Tablet'].includes(device.device || '') && (device.device || 'غير محدد')}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-tiba-primary-700">{device.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* إحصائيات البرامج التدريبية */}
      {stats?.programsStats && stats.programsStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              إحصائيات البرامج التدريبية
            </CardTitle>
            <CardDescription>
              توزيع المتدربين المسجلين حسب البرنامج التدريبي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.programsStats.map((program, index) => (
                <div key={index} className="p-4 bg-white border border-tiba-gray-200 rounded-lg hover:border-tiba-primary-300 hover:bg-tiba-primary-25 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-tiba-secondary-100 to-tiba-secondary-200 rounded-full flex items-center justify-center">
                        <AcademicCapIcon className="w-5 h-5 text-tiba-secondary-600" />
                      </div>
                      <span className="font-medium text-tiba-gray-800">{program.nameAr}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-tiba-primary-700">{program.traineeCount}</span>
                      <div className="text-xs text-tiba-gray-500">متدرب مسجل</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TraineePlatformStatsPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'dashboard.trainee-platform.stats', action: 'view' }}>
      <TraineePlatformStatsPageContent />
    </PageGuard>
  );
}