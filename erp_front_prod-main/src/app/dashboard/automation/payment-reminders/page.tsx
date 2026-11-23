'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { CardStat } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import {
  BellIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  PaperAirplaneIcon,
  WifiIcon,
  SignalSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  PaymentReminderTemplate,
  ReminderStats,
  TRIGGER_TYPE_LABELS,
  ReminderTriggerType,
} from '@/types/payment-reminders';
import {
  getAllReminders,
  getRemindersStats,
  deleteReminderTemplate,
  triggerReminderManually,
} from '@/lib/payment-reminders-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { SimpleSelect } from '@/app/components/ui/Select';

function PaymentRemindersPageContent() {
  const router = useRouter();
  const [reminders, setReminders] = useState<PaymentReminderTemplate[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('ALL');
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    reminderId: string;
    reminderName: string;
  }>({
    open: false,
    reminderId: '',
    reminderName: '',
  });

  useEffect(() => {
    fetchData();
    fetchWhatsAppStatus();
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const status = await fetchAPI('/whatsapp/status');
      setWhatsappStatus(status);
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setWhatsappStatus({ isConnected: false });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [remindersRes, statsRes] = await Promise.all([
        getAllReminders(),
        getRemindersStats(),
      ]);

      if (remindersRes.success) {
        setReminders(remindersRes.data || []);
      }

      if (statsRes.success) {
        setStats(statsRes.data || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(deleteDialog.reminderId);
      const response = await deleteReminderTemplate(deleteDialog.reminderId);

      if (response.success) {
        toast.success(`تم حذف "${deleteDialog.reminderName}" بنجاح`);
        fetchData();
        setDeleteDialog({ open: false, reminderId: '', reminderName: '' });
      } else {
        toast.error('فشل في حذف الرسالة');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('حدث خطأ في الحذف');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerManually = async (id: string, name: string) => {
    if (!confirm(`هل تريد تشغيل "${name}" يدوياً الآن؟`)) return;

    try {
      setActionLoading(id);
      const response = await triggerReminderManually(id);

      if (response.success) {
        toast.success('تم التشغيل بنجاح - سيتم الإرسال تدريجياً');
        fetchData();
      }
    } catch (error) {
      toast.error('حدث خطأ في التشغيل');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReminders = reminders.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.fee.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = filterActive === 'ALL' || 
                         (filterActive === 'ACTIVE' && r.isActive) ||
                         (filterActive === 'INACTIVE' && !r.isActive);
    return matchesSearch && matchesActive;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="bg-tiba-gray-200 rounded-xl h-20"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-tiba-gray-200 rounded-xl h-24"></div>
            ))}
          </div>
          <div className="bg-tiba-gray-200 rounded-xl h-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="رسائل تذكير السداد"
        description="إدارة الرسائل التلقائية لتذكير المتدربين بمواعيد السداد"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الأتمتة' },
          { label: 'رسائل التذكير' },
        ]}
        actions={
          <Button
            onClick={() => router.push('/dashboard/automation/payment-reminders/new')}
            className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white px-6 py-3 shadow-sm"
          >
            <PlusIcon className="w-5 h-5 ml-2" />
            إنشاء رسالة تذكير
          </Button>
        }
      />

      {/* WhatsApp Status Alert */}
      {whatsappStatus && !whatsappStatus.isConnected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-red-100 p-3 rounded-full">
            <SignalSlashIcon className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-900">WhatsApp غير متصل</h3>
            <p className="text-sm text-red-700">يجب توصيل WhatsApp لإرسال الرسائل التلقائية</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/whatsapp')}
            variant="outline"
            className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
          >
            إدارة WhatsApp
          </Button>
        </div>
      )}

      {whatsappStatus && whatsappStatus.isConnected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-full">
            <WifiIcon className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-900">WhatsApp متصل ✓</h3>
            <p className="text-sm text-green-700">
              📱 {whatsappStatus.phoneNumber || 'رقم غير محدد'} • جاهز لإرسال الرسائل التلقائية
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardStat
            title="إجمالي الرسائل"
            value={stats.total}
            icon={<BellIcon className="h-6 w-6" />}
            variant="primary"
          />
          <CardStat
            title="الرسائل النشطة"
            value={stats.active}
            icon={<PlayIcon className="h-6 w-6" />}
            variant="secondary"
          />
          <CardStat
            title="تم الإرسال"
            value={stats.deliveries.sent.toLocaleString()}
            icon={<PaperAirplaneIcon className="h-6 w-6" />}
            variant="default"
          />
          <CardStat
            title="معدل النجاح"
            value={`${stats.deliveries.successRate.toFixed(1)}%`}
            icon={<ChartBarIcon className="h-6 w-6" />}
            variant="warning"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-tiba-primary-600" />
              البحث والفلترة
            </CardTitle>
            <Button onClick={fetchData} variant="outline" size="sm">
              <ArrowPathIcon className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="البحث في الرسائل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white"
            />

            <SimpleSelect
              value={filterActive}
              onChange={(val) => setFilterActive(val)}
              options={[
                { value: 'ALL', label: 'جميع الحالات' },
                { value: 'ACTIVE', label: 'نشطة فقط' },
                { value: 'INACTIVE', label: 'معطلة فقط' },
              ]}
              placeholder="جميع الحالات"
            />

            <Button
              onClick={() => {
                setSearchQuery('');
                setFilterActive('ALL');
              }}
              variant="outline"
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminders List */}
      <div className="space-y-4">
        {filteredReminders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BellIcon className="h-12 w-12 text-tiba-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد رسائل</h3>
              <p className="text-tiba-gray-600 mb-6">ابدأ بإنشاء رسالة تذكير جديدة</p>
              <Button
                onClick={() => router.push('/dashboard/automation/payment-reminders/new')}
                className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white font-semibold px-6 py-3 shadow-sm"
              >
                <PlusIcon className="w-4 h-4 ml-2" />
                إنشاء رسالة تذكير
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredReminders.map((reminder) => (
            <Card key={reminder.id} hover>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-tiba-gray-900">{reminder.name}</h3>
                      <Badge className={reminder.isActive ? 'bg-green-100 text-green-800' : 'bg-tiba-gray-100 text-tiba-gray-600'}>
                        {reminder.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>

                    {reminder.description && (
                      <p className="text-tiba-gray-600 text-sm mb-3">{reminder.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-tiba-primary-600" />
                        <div>
                          <p className="text-tiba-gray-500">الرسم</p>
                          <p className="font-medium text-tiba-gray-900">{reminder.fee.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-tiba-secondary-600" />
                        <div>
                          <p className="text-tiba-gray-500">التوقيت</p>
                          <p className="font-medium text-tiba-gray-900">{TRIGGER_TYPE_LABELS[reminder.triggerType]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <PaperAirplaneIcon className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-tiba-gray-500">الإرسالات</p>
                          <p className="font-medium text-tiba-gray-900">{reminder._count?.deliveries || 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4 text-tiba-warning-600" />
                        <div>
                          <p className="text-tiba-gray-500">التأخير</p>
                          <p className="font-medium text-tiba-gray-900">{reminder.delayBetweenMessages}ث</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => router.push(`/dashboard/automation/payment-reminders/${reminder.id}`)}
                      variant="outline"
                      size="sm"
                      className="bg-tiba-primary-50 text-tiba-primary-700 border-tiba-primary-300"
                    >
                      <EyeIcon className="w-4 h-4 ml-1" />
                      عرض
                    </Button>

                    <Button
                      onClick={() => router.push(`/dashboard/automation/payment-reminders/${reminder.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="bg-tiba-warning-50 text-tiba-warning-700 border-tiba-warning-300"
                    >
                      <PencilSquareIcon className="w-4 h-4 ml-1" />
                      تعديل
                    </Button>

                    <Button
                      onClick={() => handleTriggerManually(reminder.id, reminder.name)}
                      disabled={actionLoading === reminder.id || !reminder.isActive}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 text-green-700 border-green-300"
                    >
                      <PlayIcon className="w-4 h-4 ml-1" />
                      تشغيل
                    </Button>

                    <Button
                      onClick={() => setDeleteDialog({
                        open: true,
                        reminderId: reminder.id,
                        reminderName: reminder.name,
                      })}
                      variant="outline"
                      size="sm"
                      className="bg-red-50 text-red-700 border-red-300"
                    >
                      <TrashIcon className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="!bg-white border-2 border-red-200 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-3 rounded-full">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-tiba-gray-900">تأكيد الحذف</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-tiba-gray-700 leading-relaxed pr-12">
              هل أنت متأكد من حذف الرسالة <span className="font-bold text-red-600">"{deleteDialog.reminderName}"</span>؟
              <br />
              <span className="text-red-500 font-medium">⚠️ هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-tiba-gray-100 text-tiba-gray-700 hover:bg-tiba-gray-200 border-tiba-gray-300 font-semibold px-6 py-2.5">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading === deleteDialog.reminderId}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === deleteDialog.reminderId ? (
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

export default function PaymentRemindersPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.automation.payment-reminders', action: 'view' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة</p>
          </div>
        </div>
      }
    >
      <PaymentRemindersPageContent />
    </ProtectedPage>
  );
}