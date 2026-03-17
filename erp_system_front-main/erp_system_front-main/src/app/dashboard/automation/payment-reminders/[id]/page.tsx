'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiEdit,
  FiPlay,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiAlertCircle,
  FiSkipForward,
  FiBell,
  FiSend,
  FiCalendar,
  FiUser,
  FiPhone,
} from 'react-icons/fi';
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
      case 'SENT': return <FiCheck className="w-4 h-4 text-green-600" />;
      case 'FAILED': return <FiX className="w-4 h-4 text-red-600" />;
      case 'SKIPPED': return <FiSkipForward className="w-4 h-4 text-gray-600" />;
      case 'SENDING': return <FiClock className="w-4 h-4 text-purple-600 animate-spin" />;
      default: return <FiClock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-6">
          <div className="bg-gray-200 rounded-xl h-32"></div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-200 rounded-xl h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">الرسالة غير موجودة</h2>
          <Button onClick={() => router.back()}>العودة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl text-white p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.back()} 
                variant="outline" 
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/50"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                رجوع
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">{reminder.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-white/90">
                  <span className="flex items-center gap-2">
                    <FiBell className="h-4 w-4" />
                    {reminder.fee.name}
                  </span>
                  <span>•</span>
                  <span>{reminder.fee.program.nameAr}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push(`/dashboard/automation/payment-reminders/${id}/edit`)} 
                className="bg-white/20 hover:bg-white/30 text-white border-white/50"
                variant="outline"
              >
                <FiEdit className="w-4 h-4 mr-2" />
                تعديل
              </Button>
              <Button 
                onClick={handleTrigger} 
                disabled={actionLoading || !reminder.isActive}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <FiPlay className="w-4 h-4 mr-2" />
                تشغيل يدوي
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-gray-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiSend className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">المجموع</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-green-200">
              <CardContent className="p-6 text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiCheck className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-green-600 mb-1">مرسل بنجاح</p>
                <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiCalendar className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-blue-600 mb-1">مجدول</p>
                <p className="text-3xl font-bold text-blue-600">{stats.scheduled}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-red-200">
              <CardContent className="p-6 text-center">
                <div className="bg-red-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiX className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm text-red-600 mb-1">فاشل</p>
                <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="bg-gray-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiSkipForward className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">متخطى</p>
                <p className="text-3xl font-bold text-gray-600">{stats.skipped}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="p-6 text-center">
                <div className="bg-purple-600 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiCheck className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm text-purple-600 mb-1">معدل النجاح</p>
                <p className="text-3xl font-bold text-purple-600">{stats.successRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Message Content */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FiBell className="h-5 w-5 text-blue-600" />
              محتوى الرسالة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
              <pre className="text-sm whitespace-pre-wrap text-gray-900 font-medium leading-relaxed">
                {reminder.message}
              </pre>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1">
                <FiCalendar className="w-3 h-3 mr-1 inline" />
                {TRIGGER_TYPE_LABELS[reminder.triggerType]}
              </Badge>
              {reminder.customTriggerDate && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1">
                  📅 {new Date(reminder.customTriggerDate).toLocaleDateString('ar-EG')}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                <FiClock className="w-3 h-3 mr-1 inline" />
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
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FiSend className="h-5 w-5 text-indigo-600" />
                سجل الإرسال ({pagination?.total || 0})
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="SENT">مرسل ✅</option>
                  <option value="FAILED">فاشل ❌</option>
                  <option value="SCHEDULED">مجدول 📅</option>
                  <option value="SKIPPED">متخطى ⏭️</option>
                </select>
                {stats?.failed > 0 && (
                  <Button 
                    onClick={handleRetryFailed} 
                    size="sm" 
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <FiRefreshCw className="w-4 h-4 mr-1" />
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
                  <FiSend className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">لا توجد سجلات إرسال بعد</p>
                  <p className="text-gray-400 text-sm mt-2">سيتم عرض السجلات عند تشغيل الرسالة</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المتدرب</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الهاتف</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">التوقيت</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deliveries.map((delivery, idx) => (
                      <motion.tr
                        key={delivery.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FiUser className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{delivery.trainee.nameAr}</p>
                              <p className="text-xs text-gray-500">{delivery.trainee.program?.nameAr}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FiPhone className="h-4 w-4 text-gray-400" />
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
                        <td className="px-6 py-4 text-sm text-gray-700">
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
                            <p className="text-lg font-bold text-orange-600">
                              {delivery.remainingAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">جنيه</p>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  variant="outline"
                  size="sm"
                >
                  السابق
                </Button>
                <span className="text-sm text-gray-600 px-4">
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