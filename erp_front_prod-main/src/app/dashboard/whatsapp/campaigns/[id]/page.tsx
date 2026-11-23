'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageHeader from '@/app/components/PageHeader';
import {
  ArrowRightIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  getCampaignById,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  deleteCampaign,
  getStatusBadgeColor,
  getStatusText
} from '@/app/lib/api/campaigns';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  message: string;
  status: string;
  targetType: string;
  targetProgramId?: number;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  delayBetweenMessages: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
  };
  campaignRecipients?: Array<{
    id: string;
    status: string;
    phoneNumber: string;
    sentAt?: string;
    failedAt?: string;
    errorMessage?: string;
    trainee: {
      id: number;
      nameAr: string;
      phone: string;
      program?: {
        nameAr: string;
      };
    };
  }>;
}

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  // تحديث تلقائي كل 5 ثوانِ للحملات النشطة
  useEffect(() => {
    if (!campaign || !autoRefresh) return;

    // تحديث تلقائي فقط للحملات النشطة
    const shouldAutoRefresh = ['running', 'paused'].includes(campaign.status);
    
    if (!shouldAutoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 تحديث تلقائي للحملة:', campaignId);
      fetchCampaign(true); // تحديث صامت
    }, 5000); // كل 5 ثوانِ

    return () => {
      clearInterval(interval);
    };
  }, [campaign?.status, campaignId, autoRefresh]);

  // إيقاف التحديث التلقائي عند إخفاء الصفحة
  useEffect(() => {
    const handleVisibilityChange = () => {
      setAutoRefresh(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchCampaign = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      const response = await getCampaignById(campaignId);
      if (response.success) {
        setCampaign(response.data);
        
        // إذا تغيرت الحالة إلى مكتملة أو فاشلة، أظهر إشعار
        if (campaign && campaign.status !== response.data.status) {
          if (response.data.status === 'completed') {
            toast.success('🎉 تم إكمال الحملة بنجاح!');
          } else if (response.data.status === 'failed') {
            toast.error('❌ فشلت الحملة!');
          }
        }
      } else {
        if (!silent) {
          toast.error('فشل في جلب بيانات الحملة');
        }
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      if (!silent) {
        toast.error('حدث خطأ أثناء جلب بيانات الحملة');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleAction = async (action: string) => {
    if (!campaign) return;

    try {
      setActionLoading(action);
      let response;

      switch (action) {
        case 'start':
          response = await startCampaign(campaign.id);
          break;
        case 'pause':
          response = await pauseCampaign(campaign.id);
          break;
        case 'stop':
          response = await stopCampaign(campaign.id);
          break;
        case 'delete':
          if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return;
          response = await deleteCampaign(campaign.id);
          if (response.success) {
            toast.success('تم حذف الحملة بنجاح');
            router.push('/dashboard/whatsapp/campaigns');
            return;
          }
          break;
      }

      if (response?.success) {
        toast.success(response.message || 'تم تنفيذ العملية بنجاح');
        fetchCampaign(); // إعادة جلب البيانات
      } else {
        toast.error(response?.message || 'فشل في تنفيذ العملية');
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      toast.error('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setActionLoading(null);
    }
  };

  const getProgressPercentage = () => {
    if (!campaign || campaign.totalTargets === 0) return 0;
    return (campaign.sentCount / campaign.totalTargets) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} ثانية`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} دقيقة`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-tiba-gray-200 rounded-lg h-16" />
          <div className="bg-tiba-gray-200 rounded-lg h-64" />
          <div className="bg-tiba-gray-200 rounded-lg h-48" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-tiba-gray-800 mb-2">الحملة غير موجودة</h2>
          <p className="text-tiba-gray-500 mb-4">لم يتم العثور على الحملة المطلوبة</p>
          <Button 
            onClick={() => router.push('/dashboard/whatsapp/campaigns')}
            className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white"
          >
            <ArrowRightIcon className="w-4 h-4 ml-1" />
            العودة للحملات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description={campaign.description}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'WhatsApp', href: '/dashboard/whatsapp' },
          { label: 'الحملات', href: '/dashboard/whatsapp/campaigns' },
          { label: campaign.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => router.push('/dashboard/whatsapp/campaigns')} variant="outline" size="sm">
              <ArrowRightIcon className="w-4 h-4 ml-1" />
              العودة
            </Button>

            <Badge className={getStatusBadgeColor(campaign.status)}>
              {getStatusText(campaign.status)}
            </Badge>

            {['running', 'paused'].includes(campaign.status) && autoRefresh && (
              <div className="flex items-center gap-1 text-xs text-tiba-secondary-600 bg-tiba-secondary-50 px-2 py-1 rounded-full border border-tiba-secondary-200">
                <div className="w-2 h-2 bg-tiba-secondary-500 rounded-full animate-pulse"></div>
                تحديث تلقائي
              </div>
            )}

            {campaign.status === 'draft' && (
              <Button onClick={() => handleAction('start')} disabled={actionLoading === 'start'} size="sm" className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white">
                <PlayIcon className="w-4 h-4 ml-1" />
                {actionLoading === 'start' ? 'جاري البدء...' : 'بدء الحملة'}
              </Button>
            )}

            {campaign.status === 'running' && (
              <>
                <Button onClick={() => handleAction('pause')} disabled={actionLoading === 'pause'} variant="outline" size="sm" className="border-tiba-warning-400 text-tiba-warning-700 hover:bg-tiba-warning-50">
                  <PauseIcon className="w-4 h-4 ml-1" />
                  {actionLoading === 'pause' ? 'جاري...' : 'إيقاف مؤقت'}
                </Button>
                <Button onClick={() => handleAction('stop')} disabled={actionLoading === 'stop'} size="sm" className="bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white">
                  <StopIcon className="w-4 h-4 ml-1" />
                  {actionLoading === 'stop' ? 'جاري...' : 'إيقاف نهائي'}
                </Button>
              </>
            )}

            {campaign.status === 'paused' && (
              <Button onClick={() => handleAction('start')} disabled={actionLoading === 'start'} size="sm" className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white">
                <PlayIcon className="w-4 h-4 ml-1" />
                {actionLoading === 'start' ? 'جاري...' : 'استكمال'}
              </Button>
            )}

            <Button variant="outline" onClick={() => fetchCampaign(false)} disabled={loading} size="sm">
              <ArrowPathIcon className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>

            {['running', 'paused'].includes(campaign.status) && (
              <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)} size="sm" className={autoRefresh ? 'border-tiba-secondary-300 text-tiba-secondary-700 hover:bg-tiba-secondary-50' : ''}>
                {autoRefresh ? 'إيقاف التحديث' : 'تفعيل التحديث'}
              </Button>
            )}

            {['draft', 'completed', 'failed'].includes(campaign.status) && (
              <Button onClick={() => handleAction('delete')} disabled={actionLoading === 'delete'} size="sm" className="bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white">
                <TrashIcon className="w-4 h-4 ml-1" />
                {actionLoading === 'delete' ? 'جاري...' : 'حذف'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <Card size="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-tiba-gray-800">
                <ChartBarIcon className="h-5 w-5 text-tiba-primary-600" />
                تقدم الحملة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-tiba-gray-600">تم الإرسال</span>
                  <span className="font-semibold text-tiba-gray-800">{campaign.sentCount} من {campaign.totalTargets}</span>
                </div>
                <div className="w-full bg-tiba-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-tiba-primary-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-3 bg-tiba-primary-50 rounded-lg border border-tiba-primary-200">
                    <UsersIcon className="h-5 w-5 text-tiba-primary-600 mx-auto mb-1" />
                    <p className="font-bold text-tiba-primary-700">{campaign.totalTargets}</p>
                    <p className="text-tiba-gray-600 text-xs">إجمالي</p>
                  </div>
                  <div className="text-center p-3 bg-tiba-secondary-50 rounded-lg border border-tiba-secondary-200">
                    <PaperAirplaneIcon className="h-5 w-5 text-tiba-secondary-600 mx-auto mb-1" />
                    <p className="font-bold text-tiba-secondary-700">{campaign.sentCount}</p>
                    <p className="text-tiba-gray-600 text-xs">مرسل</p>
                  </div>
                  <div className="text-center p-3 bg-tiba-danger-50 rounded-lg border border-tiba-danger-200">
                    <StopIcon className="h-5 w-5 text-tiba-danger-600 mx-auto mb-1" />
                    <p className="font-bold text-tiba-danger-700">{campaign.failedCount}</p>
                    <p className="text-tiba-gray-600 text-xs">فاشل</p>
                  </div>
                  <div className="text-center p-3 bg-tiba-warning-50 rounded-lg border border-tiba-warning-200">
                    <ClockIcon className="h-5 w-5 text-tiba-warning-600 mx-auto mb-1" />
                    <p className="font-bold text-tiba-warning-700">{campaign.delayBetweenMessages}ث</p>
                    <p className="text-tiba-gray-600 text-xs">تأخير</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card size="md">
            <CardHeader>
              <CardTitle className="text-tiba-gray-800">محتوى الرسالة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">{campaign.message}</pre>
              </div>
              {campaign.template && (
                <div className="mt-3 text-sm text-gray-700 font-medium">
                  <strong className="text-gray-800">القالب المستخدم:</strong> {campaign.template.name}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipients List */}
          {campaign.campaignRecipients && campaign.campaignRecipients.length > 0 && (
            <Card size="md">
              <CardHeader>
                <CardTitle className="text-tiba-gray-800">قائمة المستلمين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.campaignRecipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{recipient.trainee.nameAr}</p>
                        <p className="text-sm text-gray-700 font-medium">{recipient.phoneNumber}</p>
                        {recipient.trainee.program && (
                          <p className="text-xs text-gray-600 font-medium">{recipient.trainee.program.nameAr}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={
                            recipient.status === 'sent' ? 'bg-green-100 text-green-800 border border-green-300' :
                            recipient.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-300' :
                            'bg-gray-100 text-gray-800 border border-gray-300'
                          }
                        >
                          {recipient.status === 'sent' ? 'مرسل' :
                           recipient.status === 'failed' ? 'فاشل' :
                           recipient.status === 'pending' ? 'في الانتظار' : recipient.status}
                        </Badge>
                        {recipient.sentAt && (
                          <p className="text-xs text-gray-600 font-medium mt-1">
                            {formatDate(recipient.sentAt)}
                          </p>
                        )}
                        {recipient.errorMessage && (
                          <p className="text-xs text-red-600 font-medium mt-1">
                            {recipient.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Information */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <Card size="md">
            <CardHeader>
              <CardTitle className="text-tiba-gray-800">معلومات الحملة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">نوع الاستهداف</label>
                <p className="text-sm text-gray-800 font-medium">
                  {campaign.targetType === 'all' ? 'كل المتدربين' :
                   campaign.targetType === 'program' ? 'برنامج محدد' :
                   'مخصص'}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">تاريخ الإنشاء</label>
                <p className="text-sm text-gray-800 font-medium">{formatDate(campaign.createdAt)}</p>
              </div>

              {campaign.startedAt && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">تاريخ البدء</label>
                  <p className="text-sm text-gray-800 font-medium">{formatDate(campaign.startedAt)}</p>
                </div>
              )}

              {campaign.completedAt && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">تاريخ الانتهاء</label>
                  <p className="text-sm text-gray-800 font-medium">{formatDate(campaign.completedAt)}</p>
                </div>
              )}

              {campaign.estimatedDuration && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">المدة المتوقعة</label>
                  <p className="text-sm text-gray-800 font-medium">{formatDuration(campaign.estimatedDuration)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
