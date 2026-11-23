'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ForwardIcon,
  BellIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  PaymentReminderTemplate,
  PaymentReminderDelivery,
  DELIVERY_STATUS_LABELS,
  TRIGGER_TYPE_LABELS,
} from '@/types/payment-reminders';
import {
  getReminderById,
  getReminderDeliveryStats,
  getReminderDeliveries,
  triggerReminderManually,
  retryFailedReminders,
} from '@/lib/payment-reminders-api';
import PageHeader from '@/app/components/PageHeader';
import { SimpleSelect } from '@/app/components/ui/Select';

function ReminderDetailsPageContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [reminder, setReminder] = useState<PaymentReminderTemplate | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<PaymentReminderDelivery[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, page, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reminderRes, statsRes, deliveriesRes] = await Promise.all([
        getReminderById(id),
        getReminderDeliveryStats(id),
        getReminderDeliveries(id, {
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          page,
          limit: 20,
        }),
      ]);

      if (reminderRes.success) setReminder(reminderRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (deliveriesRes.success) {
        setDeliveries(deliveriesRes.data);
        setPagination(deliveriesRes.pagination);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    if (!confirm('هل تريد تشغيل هذه الرسالة يدوياً الآن؟')) return;

    try {
      setActionLoading(true);
      const response = await triggerReminderManually(id);
      if (response.success) {
        toast.success('تم التشغيل - سيتم الإرسال تدريجياً');
        fetchData();
      }
    } catch (error) {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setActionLoading(true);
      const response = await retryFailedReminders(id);
      if (response.success) {
        toast.success(response.message);
        fetchData();
      }
    } catch (error) {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: 'bg-green-100 text-green-800 border-green-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
      SENDING: 'bg-purple-100 text-purple-800 border-purple-200',
      SKIPPED: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <CheckIcon className="w-4 h-4 text-green-600" />;
      case 'FAILED': return <XMarkIcon className="w-4 h-4 text-red-600" />;
      case 'SKIPPED': return <ForwardIcon className="w-4 h-4 text-tiba-gray-600" />;
      case 'SENDING': return <ClockIcon className="w-4 h-4 text-tiba-secondary-600 animate-spin" />;
      default: return <ClockIcon className="w-4 h-4 text-tiba-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="bg-tiba-gray-200 rounded-xl h-20"></div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-tiba-gray-200 rounded-xl h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <ExclamationCircleIcon className="w-16 h-16 text-tiba-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-tiba-gray-800 mb-2">الرسالة غير موجودة</h2>
            <Button onClick={() => router.back()}>العودة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title={reminder.name}
        description={`${reminder.fee.name} • ${reminder.fee.program.nameAr}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الأتمتة' },
          { label: 'رسائل التذكير', href: '/dashboard/automation/payment-reminders' },
          { label: reminder.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
            >
              <ArrowLeftIcon className="w-4 h-4 ml-2" />
              رجوع
            </Button>
            <Button 
              onClick={() => router.push(`/dashboard/automation/payment-reminders/${id}/edit`)} 
              variant="outline"
            >
              <PencilSquareIcon className="w-4 h-4 ml-2" />
              تعديل
            </Button>
            <Button 
              onClick={handleTrigger} 
              disabled={actionLoading || !reminder.isActive}
              className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white font-semibold"
            >
              <PlayIcon className="w-4 h-4 ml-2" />
              تشغيل يدوي
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="bg-tiba-gray-100 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <PaperAirplaneIcon className="h-5 w-5 text-tiba-gray-600" />
              </div>
              <p className="text-xs text-tiba-gray-600 mb-1">المجموع</p>
              <p className="text-2xl font-bold text-tiba-gray-900">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="bg-green-100 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-green-600 mb-1">مرسل بنجاح</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="bg-tiba-primary-100 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-tiba-primary-600" />
              </div>
              <p className="text-xs text-tiba-primary-600 mb-1">مجدول</p>
              <p className="text-2xl font-bold text-tiba-primary-600">{stats.scheduled}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="bg-red-100 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <XMarkIcon className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-xs text-red-600 mb-1">فاشل</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="bg-tiba-gray-100 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <ForwardIcon className="h-5 w-5 text-tiba-gray-600" />
              </div>
              <p className="text-xs text-tiba-gray-600 mb-1">متخطى</p>
              <p className="text-2xl font-bold text-tiba-gray-600">{stats.skipped}</p>
            </CardContent>
          </Card>

          <Card variant="primary">
            <CardContent className="p-4 text-center">
              <div className="bg-tiba-primary-600 w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                <CheckIcon className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs text-tiba-primary-600 mb-1">معدل النجاح</p>
              <p className="text-2xl font-bold text-tiba-primary-800">{stats.successRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-tiba-gray-900">
            <BellIcon className="h-5 w-5 text-tiba-primary-600" />
            محتوى الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-tiba-primary-50 p-6 rounded-xl border border-tiba-primary-200">
            <pre className="text-sm whitespace-pre-wrap text-tiba-gray-900 font-medium leading-relaxed">
              {reminder.message}
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className="bg-tiba-primary-100 text-tiba-primary-800 border-tiba-primary-300 px-3 py-1">
              <CalendarIcon className="w-3 h-3 ml-1 inline" />
                {TRIGGER_TYPE_LABELS[reminder.triggerType]}
              </Badge>
              {reminder.customTriggerDate && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1">
                  📅 {new Date(reminder.customTriggerDate).toLocaleDateString('ar-EG')}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                <ClockIcon className="w-3 h-3 ml-1 inline" />
                {reminder.delayBetweenMessages}ث تأخير
              </Badge>
              {reminder.description && (
                <p className="text-sm text-gray-600 w-full mt-2 italic">
                  💡 {reminder.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deliveries */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-tiba-gray-900">
                <PaperAirplaneIcon className="h-5 w-5 text-tiba-primary-600" />
                سجل الإرسال ({pagination?.total || 0})
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <SimpleSelect
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  options={[
                    { value: 'ALL', label: 'جميع الحالات' },
                    { value: 'SENT', label: 'مرسل ✅' },
                    { value: 'FAILED', label: 'فاشل ❌' },
                    { value: 'SCHEDULED', label: 'مجدول 📅' },
                    { value: 'SKIPPED', label: 'متخطى ⏭️' },
                  ]}
                  placeholder="جميع الحالات"
                />
                {stats?.failed > 0 && (
                  <Button 
                    onClick={handleRetryFailed} 
                    size="sm" 
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <ArrowPathIcon className="w-4 h-4 ml-1" />
                    إعادة الفاشلة ({stats.failed})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {deliveries.length === 0 ? (
                <div className="text-center py-16">
                  <PaperAirplaneIcon className="w-16 h-16 text-tiba-gray-300 mx-auto mb-4" />
                  <p className="text-tiba-gray-500 text-lg">لا توجد سجلات إرسال بعد</p>
                  <p className="text-tiba-gray-400 text-sm mt-2">سيتم عرض السجلات عند تشغيل الرسالة</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-tiba-gray-50 border-b-2 border-tiba-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-tiba-gray-700">المتدرب</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-tiba-gray-700">الهاتف</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-tiba-gray-700">الحالة</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-tiba-gray-700">التوقيت</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-tiba-gray-700">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tiba-gray-100">
                    {deliveries.map((delivery) => (
                      <tr
                        key={delivery.id}
                        className="hover:bg-tiba-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-tiba-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-tiba-primary-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-tiba-gray-900">{delivery.trainee.nameAr}</p>
                              <p className="text-xs text-tiba-gray-500">{delivery.trainee.program?.nameAr}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-tiba-gray-700">
                            <PhoneIcon className="h-4 w-4 text-tiba-gray-400" />
                            {delivery.phoneNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(delivery.status)}
                            <Badge className={`${getStatusBadge(delivery.status)} border font-medium`}>
                              {DELIVERY_STATUS_LABELS[delivery.status]}
                            </Badge>
                          </div>
                          {delivery.errorMessage && (
                            <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                              ⚠️ {delivery.errorMessage}
                            </p>
                          )}
                          {delivery.retryCount > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              🔄 محاولة {delivery.retryCount}/3
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-tiba-gray-700">
                          {delivery.sentAt ? (
                            <div className="text-green-700">
                              <p className="font-medium">✅ {new Date(delivery.sentAt).toLocaleDateString('ar-EG')}</p>
                              <p className="text-xs text-gray-500">{new Date(delivery.sentAt).toLocaleTimeString('ar-EG')}</p>
                            </div>
                          ) : delivery.failedAt ? (
                            <div className="text-red-700">
                              <p className="font-medium">❌ {new Date(delivery.failedAt).toLocaleDateString('ar-EG')}</p>
                              <p className="text-xs text-gray-500">{new Date(delivery.failedAt).toLocaleTimeString('ar-EG')}</p>
                            </div>
                          ) : (
                            <div className="text-blue-700">
                              <p className="font-medium">📅 {new Date(delivery.scheduledAt).toLocaleDateString('ar-EG')}</p>
                              <p className="text-xs text-gray-500">{new Date(delivery.scheduledAt).toLocaleTimeString('ar-EG')}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-tiba-warning-600">
                              {delivery.remainingAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-tiba-gray-500">جنيه</p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-tiba-gray-200">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  variant="outline"
                  size="sm"
                >
                  السابق
                </Button>
                <span className="text-sm text-tiba-gray-600 px-4">
                  صفحة {pagination.page} من {pagination.totalPages}
                </span>
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasNext}
                  variant="outline"
                  size="sm"
                >
                  التالي
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

export default function ReminderDetailsPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.automation.payment-reminders', action: 'view' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة</p>
          </div>
        </div>
      }
    >
      <ReminderDetailsPageContent />
    </ProtectedPage>
  );
}