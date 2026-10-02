'use client';

import { useState, useEffect } from 'react';
import { Card, CardStat, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import PageHeader from '@/app/components/PageHeader';
import { SimpleSelect } from '@/app/components/ui/Select';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  PaperAirplaneIcon,
  EyeIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  WhatsAppCampaign,
  OverallStats,
  getAllCampaigns,
  getOverallStats,
  startCampaign,
  pauseCampaign,
  deleteCampaign,
  getStatusBadgeColor,
  getStatusText,
  formatEstimatedTime
} from '@/app/lib/api/campaigns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface CampaignFilters {
  status: string;
  targetType: string;
}

function WhatsAppCampaignsPageContent() {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<CampaignFilters>({
    status: 'all',
    targetType: 'all'
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    campaignId: string;
    campaignName: string;
  }>({
    open: false,
    campaignId: '',
    campaignName: ''
  });

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsResponse, statsResponse] = await Promise.all([
        getAllCampaigns(),
        getOverallStats()
      ]);

      if (campaignsResponse.success) {
        setCampaigns(campaignsResponse.data || []);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setActionLoading(campaignId);
      const response = await startCampaign(campaignId);
      
      if (response.success) {
        toast.success(`تم بدء الحملة "${campaignName}" بنجاح`);
        fetchData();
      } else {
        toast.error(response.message || 'فشل في بدء الحملة');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('حدث خطأ أثناء بدء الحملة');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setActionLoading(campaignId);
      const response = await pauseCampaign(campaignId);
      
      if (response.success) {
        toast.success(`تم إيقاف الحملة "${campaignName}" مؤقتاً`);
        fetchData();
      } else {
        toast.error(response.message || 'فشل في إيقاف الحملة');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('حدث خطأ أثناء إيقاف الحملة');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      setActionLoading(deleteDialog.campaignId);
      const response = await deleteCampaign(deleteDialog.campaignId);
      
      if (response.success) {
        toast.success(`تم حذف الحملة "${deleteDialog.campaignName}" بنجاح`);
        fetchData();
        setDeleteDialog({ open: false, campaignId: '', campaignName: '' });
      } else {
        toast.error(response.message || 'فشل في حذف الحملة');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('حدث خطأ أثناء حذف الحملة');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (campaignId: string, campaignName: string) => {
    setDeleteDialog({
      open: true,
      campaignId,
      campaignName
    });
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const statusMatch = filters.status === 'all' || campaign.status === filters.status;
    const targetTypeMatch = filters.targetType === 'all' || campaign.targetType === filters.targetType;
    return statusMatch && targetTypeMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-tiba-gray-200 rounded-lg h-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-tiba-gray-200 rounded-lg h-20" />)}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-tiba-gray-200 rounded-lg h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="حملات واتساب الجماعية"
        description="إدارة وإرسال الرسائل الجماعية للمتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'WhatsApp', href: '/dashboard/whatsapp' },
          { label: 'الحملات' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/whatsapp/campaigns/templates')}
              variant="outline"
              size="sm"
            >
              <DocumentTextIcon className="w-4 h-4 ml-1" />
              القوالب
            </Button>
            <Button
              onClick={() => router.push('/dashboard/whatsapp/campaigns/new')}
              size="sm"
              className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white"
            >
              <PlusIcon className="w-4 h-4 ml-1" />
              حملة جديدة
            </Button>
          </div>
        }
      />
        
{/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card size="sm">
            <CardStat icon={<RocketLaunchIcon className="w-6 h-6" />} title="إجمالي الحملات" value={stats.totalCampaigns} variant="primary" />
          </Card>
          <Card size="sm">
            <CardStat icon={<PlayIcon className="w-6 h-6" />} title="الحملات النشطة" value={stats.activeCampaigns} variant="secondary" />
          </Card>
          <Card size="sm">
            <CardStat icon={<PaperAirplaneIcon className="w-6 h-6" />} title="الرسائل المرسلة" value={stats.totalMessagesSent.toLocaleString()} variant="primary" />
          </Card>
          <Card size="sm">
            <CardStat icon={<ChartBarIcon className="w-6 h-6" />} title="معدل النجاح" value={`${stats.averageSuccessRate.toFixed(1)}%`} variant="warning" />
          </Card>
        </div>
      )}

{/* Filters */}
      <Card size="md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-tiba-primary-600" />
              فلترة الحملات
            </CardTitle>
            <Button onClick={fetchData} variant="outline" size="sm">
              <ArrowPathIcon className="w-4 h-4 ml-1" />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-tiba-gray-700 mb-1">الحالة</label>
              <SimpleSelect
                value={filters.status}
                onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                options={[
                  { value: 'all', label: 'جميع الحالات' },
                  { value: 'draft', label: 'مسودة' },
                  { value: 'running', label: 'قيد التشغيل' },
                  { value: 'paused', label: 'متوقفة مؤقتاً' },
                  { value: 'completed', label: 'مكتملة' },
                  { value: 'failed', label: 'فاشلة' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tiba-gray-700 mb-1">نوع الاستهداف</label>
              <SimpleSelect
                value={filters.targetType}
                onChange={(val) => setFilters(prev => ({ ...prev, targetType: val }))}
                options={[
                  { value: 'all', label: 'جميع الأنواع' },
                  { value: 'program', label: 'برنامج محدد' },
                  { value: 'custom', label: 'مخصص' },
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setFilters({ status: 'all', targetType: 'all' })}
                variant="outline"
                size="sm"
                className="w-full border-tiba-danger-300 text-tiba-danger-700 hover:bg-tiba-danger-50"
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <Card size="lg">
            <div className="text-center py-10">
              <RocketLaunchIcon className="w-12 h-12 text-tiba-gray-300 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-tiba-gray-700 mb-1">لا توجد حملات</h4>
              <p className="text-sm text-tiba-gray-500 mb-4">ابدأ بإنشاء حملة جديدة لإرسال الرسائل للمتدربين</p>
              <Button onClick={() => router.push('/dashboard/whatsapp/campaigns/new')} className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white">
                <PlusIcon className="w-4 h-4 ml-1" />
                إنشاء حملة جديدة
              </Button>
            </div>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} hover size="md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-tiba-gray-800">{campaign.name}</h4>
                      {campaign.description && (
                        <p className="text-sm text-tiba-gray-500 mt-0.5">{campaign.description}</p>
                      )}
                    </div>
                    <Badge className={getStatusBadgeColor(campaign.status)}>
                      {getStatusText(campaign.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-tiba-gray-600">
                      <UsersIcon className="w-4 h-4 text-tiba-primary-500" />
                      <span>{campaign.totalTargets} متدرب</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-tiba-gray-600">
                      <PaperAirplaneIcon className="w-4 h-4 text-tiba-secondary-500" />
                      <span>{campaign.sentCount} مرسل</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-tiba-gray-600">
                      <ClockIcon className="w-4 h-4 text-tiba-warning-500" />
                      <span>{campaign.delayBetweenMessages}ث تأخير</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-tiba-gray-600">
                      <ChartBarIcon className="w-4 h-4 text-purple-500" />
                      <span>
                        {campaign.totalTargets > 0 
                          ? ((campaign.sentCount / campaign.totalTargets) * 100).toFixed(1)
                          : 0
                        }% نجاح
                      </span>
                    </div>
                  </div>

                  {campaign.estimatedDuration && campaign.status === 'running' && (
                    <div className="mt-2 p-2 bg-tiba-primary-50 rounded-lg">
                      <p className="text-xs text-tiba-primary-700">
                        المدة المتوقعة: {formatEstimatedTime(campaign.estimatedDuration)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => router.push(`/dashboard/whatsapp/campaigns/${campaign.id}`)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="w-4 h-4 ml-1" />
                    عرض
                  </Button>

                  {campaign.status === 'draft' || campaign.status === 'paused' ? (
                    <Button
                      onClick={() => handleStartCampaign(campaign.id, campaign.name)}
                      disabled={actionLoading === campaign.id}
                      size="sm"
                      className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
                    >
                      <PlayIcon className="w-4 h-4 ml-1" />
                      تشغيل
                    </Button>
                  ) : campaign.status === 'running' ? (
                    <Button
                      onClick={() => handlePauseCampaign(campaign.id, campaign.name)}
                      disabled={actionLoading === campaign.id}
                      size="sm"
                      variant="outline"
                      className="border-tiba-warning-400 text-tiba-warning-700 hover:bg-tiba-warning-50"
                    >
                      <PauseIcon className="w-4 h-4 ml-1" />
                      إيقاف
                    </Button>
                  ) : null}

                  {campaign.status === 'draft' && (
                    <Button
                      onClick={() => router.push(`/dashboard/whatsapp/campaigns/${campaign.id}/edit`)}
                      variant="outline"
                      size="sm"
                    >
                      <PencilSquareIcon className="w-4 h-4 ml-1" />
                      تعديل
                    </Button>
                  )}

                  <Button
                    onClick={() => openDeleteDialog(campaign.id, campaign.name)}
                    variant="outline"
                    size="sm"
                    className="border-tiba-danger-300 text-tiba-danger-700 hover:bg-tiba-danger-50"
                  >
                    <TrashIcon className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="!bg-white border-2 border-tiba-danger-200 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-tiba-danger-100 p-3 rounded-full">
                <TrashIcon className="h-6 w-6 text-tiba-danger-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-tiba-gray-900">تأكيد الحذف</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-tiba-gray-700 leading-relaxed pr-12">
              هل أنت متأكد من رغبتك في حذف الحملة <span className="font-bold text-tiba-danger-600">&quot;{deleteDialog.campaignName}&quot;</span>؟
              <br />
              <span className="text-tiba-danger-500 font-medium">هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-tiba-gray-100 text-tiba-gray-700 hover:bg-tiba-gray-200 border-tiba-gray-300 font-semibold px-6 py-2.5">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              disabled={actionLoading === deleteDialog.campaignId}
              className="bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white font-semibold px-6 py-2.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === deleteDialog.campaignId ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 ml-2 animate-spin inline-block" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4 ml-2 inline-block" />
                  حذف نهائياً
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function WhatsAppCampaignsPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.whatsapp.campaigns', action: 'view' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح لك بالوصول</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة للوصول إلى حملات الواتساب</p>
          </div>
        </div>
      }
    >
      <WhatsAppCampaignsPageContent />
    </ProtectedPage>
  );
}
