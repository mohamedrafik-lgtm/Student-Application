'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  SignalIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  ComputerDesktopIcon,
  AcademicCapIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ArrowPathIcon,
  EyeIcon,
  GlobeAltIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardStat } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import PageGuard from '@/components/permissions/PageGuard';
import { DataTable, Column } from '@/app/components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TraineeAvatar } from '@/components/ui/trainee-avatar';
import { Skeleton } from '@/components/ui/skeleton';

// ======================== Types ========================

interface TraineeSummary {
  id: number;
  nameAr: string;
  nationalId: string;
  photoUrl: string | null;
  program: { id: number; nameAr: string } | null;
}

interface OnlineTrainee {
  sessionId: string;
  loginAt: string;
  lastHeartbeatAt: string;
  activeSeconds: number;
  device: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  currentPage: string | null;
  trainee: TraineeSummary | null;
  traineeAuthId: string;
}

interface RecentSession {
  id: string;
  loginAt: string;
  logoutAt: string | null;
  lastHeartbeatAt: string;
  activeSeconds: number;
  device: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  isActive: boolean;
  logoutType: string | null;
  trainee: TraineeSummary | null;
  traineeAuthId: string;
}

interface DailyActivity {
  date: string;
  sessions: number;
  uniqueUsers: number;
  totalMinutes: number;
}

interface DeviceBreakdown {
  device: string;
  count: number;
  percentage: number;
}

interface BrowserBreakdown {
  browser: string;
  count: number;
}

interface OsBreakdown {
  os: string;
  count: number;
}

interface ProgramBreakdown {
  id: number;
  nameAr: string;
  traineeCount: number;
  onlineNow: number;
  totalSessions: number;
  avgDuration: number;
  totalTime: number;
}

interface TopActiveTrainee {
  rank: number;
  traineeAuthId: string;
  trainee: TraineeSummary | null;
  totalSessions: number;
  totalTime: number;
  lastLogin: string | null;
}

interface TopPage {
  page: string;
  visits: number;
  totalDuration: number;
}

interface TrackingData {
  summary: {
    totalOnline: number;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    totalSessions: number;
    avgSessionDuration: number;
    totalActiveTime: number;
  };
  onlineNow: OnlineTrainee[];
  recentSessions: RecentSession[];
  dailyActivity: DailyActivity[];
  deviceBreakdown: DeviceBreakdown[];
  browserBreakdown: BrowserBreakdown[];
  osBreakdown: OsBreakdown[];
  programBreakdown: ProgramBreakdown[];
  topActive: TopActiveTrainee[];
  topPages: TopPage[];
}

interface TraineeSessionDetail {
  trainee: TraineeSummary | null;
  stats: {
    totalSessions: number;
    totalActiveTime: number;
    avgSessionDuration: number;
    longestSession: number;
    lastLogin: string | null;
  } | null;
  topPages: Array<{ page: string; visits: number; duration: number }>;
  sessions: Array<{
    id: string;
    loginAt: string;
    logoutAt: string | null;
    lastHeartbeatAt: string;
    activeSeconds: number;
    device: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    isActive: boolean;
    logoutType: string | null;
  }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Program {
  id: number;
  nameAr: string;
}

// ======================== Helpers ========================

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0د';
  if (seconds < 60) return `${seconds}ث`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}د`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}س ${m}د` : `${h}س`;
};

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB');
};

const getDeviceIcon = (device: string | null) => {
  const d = (device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone') || d.includes('android') || d.includes('iphone'))
    return <DevicePhoneMobileIcon className="w-4 h-4" />;
  if (d.includes('tablet') || d.includes('ipad'))
    return <DeviceTabletIcon className="w-4 h-4" />;
  return <ComputerDesktopIcon className="w-4 h-4" />;
};

const getDeviceLabel = (device: string | null): string => {
  if (!device) return 'غير محدد';
  const d = device.toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) return 'هاتف محمول';
  if (d.includes('tablet')) return 'جهاز لوحي';
  if (d.includes('desktop')) return 'حاسوب مكتبي';
  return device;
};

const getLogoutTypeLabel = (type: string | null): string => {
  if (!type) return '—';
  switch (type) {
    case 'MANUAL': return 'خروج يدوي';
    case 'EXPIRED': return 'انتهت تلقائياً';
    case 'NEW_SESSION': return 'زيارة جديدة';
    default: return type;
  }
};

const getLogoutTypeBadge = (type: string | null) => {
  if (!type) return <Badge variant="secondary">—</Badge>;
  switch (type) {
    case 'MANUAL': return <Badge variant="default">خروج يدوي</Badge>;
    case 'EXPIRED': return <Badge variant="outline">انتهت تلقائياً</Badge>;
    case 'NEW_SESSION': return <Badge variant="secondary">زيارة جديدة</Badge>;
    default: return <Badge variant="secondary">{type}</Badge>;
  }
};

const getPageLabel = (page: string | null): string => {
  if (!page) return '—';
  const map: Record<string, string> = {
    '/trainee-dashboard': 'الرئيسية',
    '/trainee-dashboard/schedule': 'الجدول',
    '/trainee-dashboard/grades': 'الدرجات',
    '/trainee-dashboard/released-grades': 'الدرجات المعلنة',
    '/trainee-dashboard/attendance': 'الحضور',
    '/trainee-dashboard/check-in': 'تسجيل الحضور',
    '/trainee-dashboard/quizzes': 'الاختبارات',
    '/trainee-dashboard/assignments': 'الواجبات',
    '/trainee-dashboard/notifications': 'الإشعارات',
    '/trainee-dashboard/profile': 'الملف الشخصي',
    '/trainee-dashboard/requests': 'الطلبات',
    '/trainee-dashboard/complaints': 'الشكاوى',
    '/trainee-dashboard/appeals': 'التظلمات',
    '/trainee-dashboard/documents': 'الوثائق',
    '/trainee-dashboard/payments': 'المدفوعات',
    '/trainee-dashboard/content': 'المحتوى',
    '/trainee-dashboard/surveys': 'الاستبيانات',
    '/trainee-dashboard/id-card': 'البطاقة الجامعية',
    '/trainee-dashboard/blocked': 'محظور',
  };
  return map[page] || page.replace('/trainee-dashboard/', '').replace('/trainee-dashboard', 'الرئيسية');
};

// ======================== Main Component ========================

function TraineeTrackingContent() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('online');
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  // تفاصيل متدرب
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [traineeDetail, setTraineeDetail] = useState<TraineeSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedProgram && selectedProgram !== 'ALL') params.programId = selectedProgram;
      if (search.trim()) params.search = search.trim();
      const qs = new URLSearchParams(params).toString();
      const response = await fetchAPI(`/trainee-platform/stats?${qs}`);
      setData(response);
    } catch (error: any) {
      if (showLoading) toast.error(error.message || 'فشل جلب بيانات التتبع');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedProgram, search]);

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await fetchAPI('/programs');
      setPrograms(response.data || response || []);
    } catch { setPrograms([]); }
  }, []);

  const fetchTraineeDetail = useCallback(async (traineeAuthId: string, page = 1) => {
    setDetailLoading(true);
    try {
      const response = await fetchAPI(
        `/trainee-platform/tracking/trainee/${encodeURIComponent(traineeAuthId)}?page=${page}&limit=15`
      );
      setTraineeDetail(response);
    } catch (error: any) {
      toast.error(error.message || 'فشل جلب تفاصيل المتدرب');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // التحديث التلقائي كل 30 ثانية (مع إنهاء الجلسات المنتهية)
  useEffect(() => {
    refreshTimer.current = setInterval(async () => {
      try { await fetchAPI('/trainee-platform/expire-sessions', { method: 'POST' }); } catch {}
      fetchData(false);
    }, 30000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [selectedProgram, search]);
  useEffect(() => { fetchPrograms(); }, []);

  useEffect(() => {
    if (selectedTraineeId) fetchTraineeDetail(selectedTraineeId, detailPage);
  }, [selectedTraineeId, detailPage]);

  // تحديث تلقائي لتفاصيل الجلسات كل 30 ثانية
  useEffect(() => {
    if (!selectedTraineeId) return;
    const timer = setInterval(() => fetchTraineeDetail(selectedTraineeId, detailPage), 30000);
    return () => clearInterval(timer);
  }, [selectedTraineeId, detailPage, fetchTraineeDetail]);

  const handleExpireSessions = async () => {
    try {
      const res = await fetchAPI('/trainee-platform/expire-sessions', { method: 'POST' });
      toast.success(`تم إنهاء ${res.expiredSessions || 0} زيارة منتهية الصلاحية`);
      await fetchData();
    } catch { toast.error('حدث خطأ في إنهاء الزيارات'); }
  };

  const openTraineeDetail = (traineeAuthId: string) => {
    setSelectedTraineeId(traineeAuthId);
    setDetailPage(1);
    setTraineeDetail(null);
  };

  // ======================== Columns ========================

  const onlineColumns: Column<OnlineTrainee>[] = [
    {
      header: 'المتدرب',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <TraineeAvatar
            photoUrl={item.trainee?.photoUrl}
            name={item.trainee?.nameAr || 'متدرب'}
            size="sm"
          />
          <div>
            <div className="font-medium text-tiba-gray-800">{item.trainee?.nameAr || 'متدرب'}</div>
            <div className="text-xs text-tiba-gray-500">{item.trainee?.nationalId}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'البرنامج',
      accessor: (item) => (
        <span className="text-sm text-tiba-gray-700">{item.trainee?.program?.nameAr || '—'}</span>
      ),
    },
    {
      header: 'الوقت النشط',
      accessor: (item) => (
        <Badge variant="secondary">{formatDuration(item.activeSeconds)}</Badge>
      ),
    },
    {
      header: 'الصفحة الحالية',
      accessor: (item) => (
        <span className="text-sm text-tiba-gray-600">{getPageLabel(item.currentPage)}</span>
      ),
    },
    {
      header: 'المتصفح / النظام',
      accessor: (item) => (
        <div className="flex items-center gap-1 text-sm text-tiba-gray-600">
          {getDeviceIcon(item.device)}
          <span>{item.browser || '—'} / {item.os || '—'}</span>
        </div>
      ),
    },
    {
      header: '',
      accessor: () => null,
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openTraineeDetail(item.traineeAuthId)}
        >
          <EyeIcon className="w-4 h-4 ml-1" />
          عرض التفاصيل
        </Button>
      ),
    },
  ];

  const recentColumns: Column<RecentSession>[] = [
    {
      header: 'المتدرب',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <TraineeAvatar
            photoUrl={item.trainee?.photoUrl}
            name={item.trainee?.nameAr || 'متدرب'}
            size="sm"
          />
          <div>
            <div className="font-medium text-tiba-gray-800">{item.trainee?.nameAr || 'متدرب'}</div>
            <div className="text-xs text-tiba-gray-500">{item.trainee?.nationalId}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'تسجيل الدخول',
      accessor: (item) => <span className="text-sm">{formatDateTime(item.loginAt)}</span>,
    },
    {
      header: 'تسجيل الخروج',
      accessor: (item) => (
        <span className="text-sm">
          {item.logoutAt ? formatDateTime(item.logoutAt) : '—'}
        </span>
      ),
    },
    {
      header: 'الوقت النشط',
      accessor: (item) => (
        <span className="text-sm font-medium text-tiba-primary-700">{formatDuration(item.activeSeconds)}</span>
      ),
    },
    {
      header: 'الحالة',
      accessor: (item) => (
        item.isActive
          ? <Badge variant="default">نشطة</Badge>
          : getLogoutTypeBadge(item.logoutType)
      ),
    },
    {
      header: 'المتصفح',
      accessor: (item) => (
        <div className="flex items-center gap-1 text-sm text-tiba-gray-600">
          {getDeviceIcon(item.device)}
          <span>{item.browser || getDeviceLabel(item.device)}</span>
        </div>
      ),
    },
    {
      header: '',
      accessor: () => null,
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openTraineeDetail(item.traineeAuthId)}
        >
          <EyeIcon className="w-4 h-4 ml-1" />
          عرض التفاصيل
        </Button>
      ),
    },
  ];

  const topActiveColumns: Column<TopActiveTrainee>[] = [
    {
      header: '#',
      accessor: (item) => (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-tiba-primary-100 to-tiba-primary-200 flex items-center justify-center text-sm font-bold text-tiba-primary-700">
          {item.rank}
        </div>
      ),
      className: 'w-12',
    },
    {
      header: 'المتدرب',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <TraineeAvatar
            photoUrl={item.trainee?.photoUrl}
            name={item.trainee?.nameAr || 'متدرب'}
            size="sm"
          />
          <div>
            <div className="font-medium text-tiba-gray-800">{item.trainee?.nameAr || 'متدرب'}</div>
            <div className="text-xs text-tiba-gray-500">{item.trainee?.nationalId}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'البرنامج',
      accessor: (item) => (
        <span className="text-sm text-tiba-gray-700">{item.trainee?.program?.nameAr || '—'}</span>
      ),
    },
    {
      header: 'عدد الزيارات',
      accessor: (item) => (
        <span className="text-sm font-medium text-tiba-primary-700">{item.totalSessions}</span>
      ),
    },
    {
      header: 'إجمالي الوقت النشط',
      accessor: (item) => (
        <Badge variant="secondary">{formatDuration(item.totalTime)}</Badge>
      ),
    },
    {
      header: 'آخر دخول',
      accessor: (item) => (
        <span className="text-sm text-tiba-gray-600">
          {item.lastLogin ? formatDateTime(item.lastLogin) : '—'}
        </span>
      ),
    },
    {
      header: '',
      accessor: () => null,
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openTraineeDetail(item.traineeAuthId)}
        >
          <EyeIcon className="w-4 h-4 ml-1" />
          عرض التفاصيل
        </Button>
      ),
    },
  ];

  // ======================== Loading State ========================

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="تتبع نشاط المتدربين"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'منصة المتدربين' },
            { label: 'تتبع النشاط' },
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تتبع نشاط المتدربين"
        description="مراقبة نشاط المتدربين على المنصة الإلكترونية في الوقت الفعلي مع تتبع دقيق بالنبضات"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'منصة المتدربين' },
          { label: 'تتبع النشاط' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin text-tiba-primary" />
            <span className="text-xs text-muted-foreground">تحديث تلقائي</span>
            <Button variant="outline" size="sm" onClick={() => fetchData()}>
              تحديث
            </Button>
          </div>
        }
      />

      {/* أدوات التصفية */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1">البرنامج التدريبي</label>
              <SearchableSelect
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                placeholder="جميع البرامج"
                options={[
                  { value: 'ALL', label: 'جميع البرامج' },
                  ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
                ]}
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1">بحث</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الهوية..."
                className="w-full px-3 py-2 border border-tiba-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <CardStat
          icon={<SignalIcon className="w-6 h-6" />}
          title="متصلون الآن"
          value={summary?.totalOnline ?? 0}
          variant="primary"
          change={`${data?.onlineNow.length || 0} زيارة نشطة`}
          changeType="neutral"
        />
        <CardStat
          icon={<CalendarDaysIcon className="w-6 h-6" />}
          title="نشطون اليوم"
          value={summary?.activeToday ?? 0}
          variant="secondary"
          change={`هذا الأسبوع: ${summary?.activeThisWeek ?? 0}`}
          changeType="neutral"
        />
        <CardStat
          icon={<UserGroupIcon className="w-6 h-6" />}
          title="نشطون هذا الشهر"
          value={summary?.activeThisMonth ?? 0}
          variant="default"
          change={`إجمالي الزيارات: ${summary?.totalSessions ?? 0}`}
          changeType="neutral"
        />
        <CardStat
          icon={<ClockIcon className="w-6 h-6" />}
          title="متوسط وقت الزيارة"
          value={formatDuration(summary?.avgSessionDuration ?? 0)}
          variant="warning"
        />
        <CardStat
          icon={<ClockIcon className="w-6 h-6" />}
          title="إجمالي الوقت النشط"
          value={formatDuration(summary?.totalActiveTime ?? 0)}
          variant="danger"
        />
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="online" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-1 sm:px-2">
            <SignalIcon className="w-4 h-4 shrink-0 hidden sm:block" />
            متصلون
            {(summary?.totalOnline ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                {summary?.totalOnline}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-1 sm:px-2">
            <ClockIcon className="w-4 h-4 shrink-0 hidden sm:block" />
            الزيارات
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-1 sm:px-2">
            <AcademicCapIcon className="w-4 h-4 shrink-0 hidden sm:block" />
            إحصائيات
          </TabsTrigger>
          <TabsTrigger value="top" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-1 sm:px-2">
            <UserGroupIcon className="w-4 h-4 shrink-0 hidden sm:block" />
            الأنشط
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-1 sm:px-2">
            <DocumentTextIcon className="w-4 h-4 shrink-0 hidden sm:block" />
            الصفحات
          </TabsTrigger>
        </TabsList>

        {/* تبويب: المتصلون الآن */}
        <TabsContent value="online">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignalIcon className="w-5 h-5 text-green-500" />
                المتصلون الآن
                <Badge variant="default" className="mr-2">{data?.onlineNow.length ?? 0}</Badge>
              </CardTitle>
              <CardDescription>المتدربون المتصلون حالياً بالمنصة (يتم التحقق عبر نبضات كل 60 ثانية)</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.onlineNow && data.onlineNow.length > 0 ? (
                <DataTable<OnlineTrainee>
                  data={data.onlineNow}
                  columns={onlineColumns}
                  keyField="sessionId"
                  emptyMessage="لا يوجد متدربون متصلون حالياً"
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-tiba-gray-100 flex items-center justify-center mb-4">
                    <SignalIcon className="w-8 h-8 text-tiba-gray-400" />
                  </div>
                  <p className="text-tiba-gray-500 text-lg">لا يوجد متدربون متصلون حالياً</p>
                  <p className="text-tiba-gray-400 text-sm mt-1">سيتم التحديث تلقائياً كل 30 ثانية</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: سجل الجلسات */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                آخر الزيارات
              </CardTitle>
              <CardDescription>آخر 50 زيارة مع الوقت النشط الفعلي (محسوب من النبضات)</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable<RecentSession>
                data={data?.recentSessions ?? []}
                columns={recentColumns}
                keyField="id"
                pagination
                itemsPerPage={10}
                emptyMessage="لا توجد زيارات مسجلة"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: الإحصائيات */}
        <TabsContent value="stats">
          <div className="space-y-6">
            {/* النشاط اليومي */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5" />
                  النشاط اليومي (آخر 30 يوم)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.dailyActivity && data.dailyActivity.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2 text-sm font-medium text-tiba-gray-600 pb-2 border-b sticky top-0 bg-white">
                      <span>التاريخ</span>
                      <span>الزيارات</span>
                      <span>المتدربون</span>
                      <span>الوقت الكلي</span>
                    </div>
                    {data.dailyActivity.slice().reverse().map((day) => (
                      <div key={day.date} className="grid grid-cols-4 gap-2 text-sm py-2 px-1 hover:bg-tiba-gray-50 rounded">
                        <span className="text-tiba-gray-700">{formatDate(day.date)}</span>
                        <span className="font-medium text-tiba-primary-700">{day.sessions}</span>
                        <span className="text-tiba-gray-700">{day.uniqueUsers}</span>
                        <span className="text-tiba-gray-700">{day.totalMinutes}د</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* توزيع الأجهزة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ComputerDesktopIcon className="w-5 h-5" />
                    توزيع الأجهزة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.deviceBreakdown && data.deviceBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {data.deviceBreakdown.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-tiba-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-tiba-primary-100 to-tiba-primary-200 flex items-center justify-center text-tiba-primary-600">
                              {getDeviceIcon(d.device)}
                            </div>
                            <span className="font-medium text-tiba-gray-800">{getDeviceLabel(d.device)}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-lg font-bold text-tiba-primary-700">{d.count}</span>
                            <span className="text-sm text-tiba-gray-500 mr-2">({d.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>

              {/* توزيع المتصفحات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GlobeAltIcon className="w-5 h-5" />
                    توزيع المتصفحات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.browserBreakdown && data.browserBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {data.browserBreakdown.map((b, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-tiba-gray-200 rounded-lg">
                          <span className="font-medium text-tiba-gray-800">{b.browser}</span>
                          <span className="text-lg font-bold text-tiba-primary-700">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>

              {/* توزيع أنظمة التشغيل */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ComputerDesktopIcon className="w-5 h-5" />
                    أنظمة التشغيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.osBreakdown && data.osBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {data.osBreakdown.map((o, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-tiba-gray-200 rounded-lg">
                          <span className="font-medium text-tiba-gray-800">{o.os}</span>
                          <span className="text-lg font-bold text-tiba-primary-700">{o.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* توزيع البرامج */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AcademicCapIcon className="w-5 h-5" />
                  توزيع البرامج
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.programBreakdown && data.programBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.programBreakdown.map((prog) => (
                      <div key={prog.id} className="p-4 bg-white border border-tiba-gray-200 rounded-lg hover:border-tiba-primary-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-tiba-gray-800">{prog.nameAr}</span>
                          {prog.onlineNow > 0 && (
                            <Badge variant="default">{prog.onlineNow} متصل</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-tiba-gray-600">
                          <span>{prog.traineeCount} متدرب</span>
                          <span>{prog.totalSessions} زيارة</span>
                          <span>متوسط: {formatDuration(prog.avgDuration)}</span>
                          <span>الكلي: {formatDuration(prog.totalTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب: الأكثر نشاطاً */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" />
                أكثر المتدربين نشاطاً هذا الشهر
              </CardTitle>
              <CardDescription>أعلى 20 متدرب من حيث الوقت النشط الفعلي على المنصة</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable<TopActiveTrainee>
                data={data?.topActive ?? []}
                columns={topActiveColumns}
                keyField="traineeAuthId"
                emptyMessage="لا توجد بيانات نشاط"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: أكثر الصفحات زيارة */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                أكثر الصفحات زيارة
              </CardTitle>
              <CardDescription>الصفحات الأكثر زيارة من قبل المتدربين مع إجمالي الوقت المقضي</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.topPages && data.topPages.length > 0 ? (
                <div className="space-y-3">
                  {data.topPages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-tiba-gray-200 rounded-lg hover:bg-tiba-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-tiba-primary-100 to-tiba-primary-200 flex items-center justify-center text-sm font-bold text-tiba-primary-700">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-tiba-gray-800">{getPageLabel(p.page)}</div>
                          <div className="text-xs text-tiba-gray-500 font-mono">{p.page}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-tiba-gray-600">{p.visits} زيارة</span>
                        <Badge variant="secondary">{formatDuration(p.totalDuration)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات بعد — ستظهر بعد بدء التتبع</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* نافذة تفاصيل المتدرب */}
      {selectedTraineeId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSelectedTraineeId(null)}>
          <div
            className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-base sm:text-lg font-bold text-tiba-gray-900">
                سجل زيارات المتدرب
              </h3>
              <button
                onClick={() => setSelectedTraineeId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-tiba-gray-500 hover:bg-tiba-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {detailLoading && !traineeDetail ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : traineeDetail ? (
                <>
                  {/* معلومات المتدرب */}
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-tiba-primary-50 rounded-lg">
                    <TraineeAvatar
                      photoUrl={traineeDetail.trainee?.photoUrl}
                      name={traineeDetail.trainee?.nameAr || 'متدرب'}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-tiba-gray-900 truncate">
                        {traineeDetail.trainee?.nameAr || 'متدرب'}
                      </div>
                      <div className="text-xs sm:text-sm text-tiba-gray-600 truncate">
                        {traineeDetail.trainee?.program?.nameAr || ''}
                      </div>
                      {traineeDetail.stats && (
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-tiba-gray-600">
                          <span>الزيارات: {traineeDetail.stats.totalSessions}</span>
                          <span>النشط: {formatDuration(traineeDetail.stats.totalActiveTime)}</span>
                          <span>المتوسط: {formatDuration(traineeDetail.stats.avgSessionDuration)}</span>
                          <span>الأطول: {formatDuration(traineeDetail.stats.longestSession)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* أكثر الصفحات زيارة لهذا المتدرب */}
                  {traineeDetail.topPages && traineeDetail.topPages.length > 0 && (
                    <div className="p-3 bg-tiba-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-tiba-gray-700 mb-2">أكثر الصفحات زيارة:</h4>
                      <div className="flex flex-wrap gap-2">
                        {traineeDetail.topPages.map((p, i) => (
                          <Badge key={i} variant="outline">
                            {getPageLabel(p.page)} ({p.visits})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* جدول الجلسات - عرض بطاقات على الهاتف وجدول على الكمبيوتر */}
                  {/* عرض الهاتف: بطاقات */}
                  <div className="sm:hidden space-y-3">
                    {traineeDetail.sessions.map((s) => (
                      <div key={s.id} className="border rounded-lg p-3 space-y-2 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-tiba-gray-500">
                            {getDeviceIcon(s.device)}
                            {s.browser || getDeviceLabel(s.device)}
                          </div>
                          {s.isActive
                            ? <Badge variant="default">نشطة</Badge>
                            : getLogoutTypeBadge(s.logoutType)
                          }
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-tiba-gray-500">الدخول</div>
                            <div className="text-tiba-gray-800">{formatDateTime(s.loginAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-tiba-gray-500">الخروج</div>
                            <div className="text-tiba-gray-800">{s.logoutAt ? formatDateTime(s.logoutAt) : '—'}</div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-xs text-tiba-gray-500">الوقت النشط: </span>
                          <span className="font-medium text-tiba-primary-700">{formatDuration(s.activeSeconds)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* عرض الكمبيوتر: جدول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-tiba-gray-600">
                          <th className="text-right py-2 px-3">تسجيل الدخول</th>
                          <th className="text-right py-2 px-3">تسجيل الخروج</th>
                          <th className="text-right py-2 px-3">الوقت النشط</th>
                          <th className="text-right py-2 px-3">المتصفح</th>
                          <th className="text-right py-2 px-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traineeDetail.sessions.map((s) => (
                          <tr key={s.id} className="border-b hover:bg-tiba-gray-50">
                            <td className="py-2 px-3">{formatDateTime(s.loginAt)}</td>
                            <td className="py-2 px-3">{s.logoutAt ? formatDateTime(s.logoutAt) : '—'}</td>
                            <td className="py-2 px-3 font-medium text-tiba-primary-700">{formatDuration(s.activeSeconds)}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1">
                                {getDeviceIcon(s.device)}
                                {s.browser || getDeviceLabel(s.device)}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {s.isActive
                                ? <Badge variant="default">نشطة</Badge>
                                : getLogoutTypeBadge(s.logoutType)
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* التنقل بين الصفحات */}
                  {traineeDetail.meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={detailPage <= 1}
                        onClick={() => setDetailPage(p => p - 1)}
                      >
                        السابق
                      </Button>
                      <span className="text-sm text-tiba-gray-600">
                        صفحة {traineeDetail.meta.page} من {traineeDetail.meta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={detailPage >= traineeDetail.meta.totalPages}
                        onClick={() => setDetailPage(p => p + 1)}
                      >
                        التالي
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center py-8 text-tiba-gray-500">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TraineePlatformStatsPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'dashboard.trainee-platform.stats', action: 'view' }}>
      <TraineeTrackingContent />
    </PageGuard>
  );
}