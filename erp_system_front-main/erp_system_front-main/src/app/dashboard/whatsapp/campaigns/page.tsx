'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { motion } from 'framer-motion';
import {
  FiPlus,
  FiPlay,
  FiPause,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiClock,
  FiBarChart,
  FiTarget,
  FiSend,
  FiEye,
  FiFileText,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded-3xl h-32 mb-6"></div>
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl h-24"></div>
              </div>
            ))}
          </div>

          {/* Campaigns Skeleton */}
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl h-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-green-600 via-blue-600 to-purple-700 rounded-3xl text-white p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="bg-white/20 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-lg">
                <FiTarget className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">حملات واتساب الجماعية</h1>
                <p className="text-white/90 text-base md:text-lg mb-3">إدارة وإرسال الرسائل الجماعية للمتدربين</p>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full text-xs md:text-sm shadow-lg">
                    <FiUsers className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white font-semibold drop-shadow-md">استهداف ذكي</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full text-xs md:text-sm shadow-lg">
                    <FiClock className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white font-semibold drop-shadow-md">مؤقت بين الرسائل</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full text-xs md:text-sm shadow-lg">
                    <FiBarChart className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white font-semibold drop-shadow-md">تتبع حالة الإرسال</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/dashboard/whatsapp/campaigns/templates')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm font-semibold px-6 py-2 shadow-md"
                variant="outline"
              >
                <FiFileText className="w-4 h-4 mr-2" />
                إدارة القوالب
              </Button>
              <Button
                onClick={() => router.push('/dashboard/whatsapp/campaigns/new')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 shadow-md"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                حملة جديدة
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FiTarget className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">إجمالي الحملات</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalCampaigns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <FiPlay className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">الحملات النشطة</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.activeCampaigns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FiSend className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">الرسائل المرسلة</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalMessagesSent.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <FiBarChart className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">معدل النجاح</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.averageSuccessRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <FiFilter className="h-5 w-5 text-blue-600" />
                فلترة الحملات
              </CardTitle>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 font-medium px-4 py-2 shadow-sm"
              >
                <FiRefreshCw className="h-4 w-4" />
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">جميع الحالات</option>
                  <option value="draft" className="text-gray-900 bg-white">مسودة</option>
                  <option value="running" className="text-gray-900 bg-white">قيد التشغيل</option>
                  <option value="paused" className="text-gray-900 bg-white">متوقفة مؤقتاً</option>
                  <option value="completed" className="text-gray-900 bg-white">مكتملة</option>
                  <option value="failed" className="text-gray-900 bg-white">فاشلة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الاستهداف</label>
                <select
                  value={filters.targetType}
                  onChange={(e) => setFilters(prev => ({ ...prev, targetType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">جميع الأنواع</option>
                  <option value="all" className="text-gray-900 bg-white">كل المتدربين</option>
                  <option value="program" className="text-gray-900 bg-white">برنامج محدد</option>
                  <option value="custom" className="text-gray-900 bg-white">مخصص</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => setFilters({ status: 'all', targetType: 'all' })}
                  variant="outline"
                  className="w-full bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:border-red-400 font-medium px-4 py-2"
                >
                  إعادة تعيين الفلاتر
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FiTarget className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">لا توجد حملات</h3>
                <p className="text-gray-600 mb-6">ابدأ بإنشاء حملة جديدة لإرسال الرسائل للمتدربين</p>
                <Button onClick={() => router.push('/dashboard/whatsapp/campaigns/new')}>
                  <FiPlus className="w-4 h-4 mr-2" />
                  إنشاء حملة جديدة
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{campaign.name}</h3>
                            {campaign.description && (
                              <p className="text-gray-600 text-sm">{campaign.description}</p>
                            )}
                          </div>
                          <Badge className={getStatusBadgeColor(campaign.status)}>
                            {getStatusText(campaign.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <FiUsers className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{campaign.totalTargets} متدرب</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiSend className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{campaign.sentCount} مرسل</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiClock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium">{campaign.delayBetweenMessages}ث تأخير</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiBarChart className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">
                              {campaign.totalTargets > 0 
                                ? ((campaign.sentCount / campaign.totalTargets) * 100).toFixed(1)
                                : 0
                              }% نجاح
                            </span>
                          </div>
                        </div>

                        {campaign.estimatedDuration && campaign.status === 'running' && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
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
                          className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
                        >
                          <FiEye className="w-4 h-4 mr-1" />
                          عرض
                        </Button>

                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <Button
                            onClick={() => handleStartCampaign(campaign.id, campaign.name)}
                            disabled={actionLoading === campaign.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <FiPlay className="w-4 h-4 mr-1 text-white" />
                            تشغيل
                          </Button>
                        ) : campaign.status === 'running' ? (
                          <Button
                            onClick={() => handlePauseCampaign(campaign.id, campaign.name)}
                            disabled={actionLoading === campaign.id}
                            size="sm"
                            variant="outline"
                            className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                          >
                            <FiPause className="w-4 h-4 mr-1" />
                            إيقاف
                          </Button>
                        ) : null}

                        {campaign.status === 'draft' && (
                          <Button
                            onClick={() => router.push(`/dashboard/whatsapp/campaigns/${campaign.id}/edit`)}
                            variant="outline"
                            size="sm"
                            className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 hover:border-orange-400"
                          >
                            <FiEdit className="w-4 h-4 mr-1" />
                            تعديل
                          </Button>
                        )}

                        <Button
                          onClick={() => openDeleteDialog(campaign.id, campaign.name)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-700 hover:bg-red-50"
                        >
                          <FiTrash2 className="w-4 h-4 mr-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="!bg-white border-2 border-red-200 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-3 rounded-full">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">تأكيد الحذف</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-gray-700 leading-relaxed pr-12">
              هل أنت متأكد من رغبتك في حذف الحملة <span className="font-bold text-red-600">"{deleteDialog.campaignName}"</span>؟
              <br />
              <span className="text-red-500 font-medium">⚠️ هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 font-semibold px-6 py-2.5">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              disabled={actionLoading === deleteDialog.campaignId}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === deleteDialog.campaignId ? (
                <>
                  <FiRefreshCw className="w-4 h-4 mr-2 animate-spin inline-block" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4 mr-2 inline-block" />
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
