'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmojiPickerComponent, QuickEmojis } from '@/components/ui/emoji-picker';
import {
  ArrowLeftIcon,
  BookmarkIcon,
  CheckIcon,
  InformationCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { ReminderTriggerType, TRIGGER_TYPE_LABELS } from '@/types/payment-reminders';
import { getReminderById, updateReminderTemplate } from '@/lib/payment-reminders-api';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';

function EditReminderPageContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    description: '',
    feeId: 0,
    triggerType: ReminderTriggerType.PAYMENT_START,
    customTriggerDate: '',
    daysOffset: 0,
    delayBetweenMessages: 30,
    isActive: true,
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reminderRes, allFees, schedules] = await Promise.all([
        getReminderById(id),
        fetchAPI('/finances/trainee-fees'),
        fetchAPI('/payment-schedules'),
      ]);

      if (reminderRes.success) {
        const r = reminderRes.data;
        setFormData({
          name: r.name,
          message: r.message,
          description: r.description || '',
          feeId: r.feeId,
          triggerType: r.triggerType,
          customTriggerDate: r.customTriggerDate ? r.customTriggerDate.split('T')[0] : '',
          daysOffset: r.daysOffset || 0,
          delayBetweenMessages: r.delayBetweenMessages,
          isActive: r.isActive,
        });
      }

      const feesWithSchedules = allFees.filter((fee: any) =>
        schedules.some((s: any) => s.feeId === fee.id)
      );
      setFees(feesWithSchedules);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = formData.message.substring(0, start) + variable + formData.message.substring(end);
      setFormData({ ...formData, message: newValue });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const insertEmoji = (emoji: string) => {
    insertVariable(emoji);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.message) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);
      const response = await updateReminderTemplate(id, formData);

      if (response.success) {
        toast.success('تم تحديث الرسالة بنجاح');
        router.push(`/dashboard/automation/payment-reminders/${id}`);
      } else {
        toast.error('فشل في التحديث');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="bg-tiba-gray-200 rounded-xl h-20"></div>
          <div className="bg-tiba-gray-200 rounded-xl h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="تعديل الرسالة التذكيرية"
        description={formData.name}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الأتمتة' },
          { label: 'رسائل التذكير', href: '/dashboard/automation/payment-reminders' },
          { label: 'تعديل' },
        ]}
        actions={
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeftIcon className="w-4 h-4 ml-2" />
            رجوع
          </Button>
        }
      />

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">اسم الرسالة *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: تذكير بداية السداد"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    الرسم المرتبط *
                  </label>
                  <SearchableSelect
                    options={fees.map(fee => ({
                      value: fee.id.toString(),
                      label: `${fee.name} - ${fee.program.nameAr} (${fee.amount.toLocaleString()} ج.م)`,
                    }))}
                    value={formData.feeId > 0 ? formData.feeId.toString() : undefined}
                    onValueChange={(value: string) => setFormData({ ...formData, feeId: parseInt(value) })}
                    placeholder="ابحث واختر الرسم..."
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">⚠️ لا يمكن تغيير الرسم بعد الإنشاء</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر للرسالة..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Trigger Type */}
          <Card>
            <CardHeader>
              <CardTitle>توقيت الإرسال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.triggerType === value ? 'border-tiba-primary-500 bg-tiba-primary-50' : 'border-tiba-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="triggerType"
                      value={value}
                      checked={formData.triggerType === value}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as ReminderTriggerType })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>

              {formData.triggerType === ReminderTriggerType.CUSTOM_DATE && (
                <div>
                  <label className="block text-sm font-medium mb-2">التاريخ المخصص *</label>
                  <input
                    type="date"
                    value={formData.customTriggerDate}
                    onChange={(e) => setFormData({ ...formData, customTriggerDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">التأخير بين الرسائل (ثانية) *</label>
                <Input
                  type="number"
                  min="30"
                  max="300"
                  value={formData.delayBetweenMessages}
                  onChange={(e) => setFormData({ ...formData, delayBetweenMessages: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">الحد الأدنى: 30 ثانية، الأقصى: 300 ثانية</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                  تفعيل الرسالة (إذا معطلة لن ترسل تلقائياً)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          <Card>
            <CardHeader>
              <CardTitle>محتوى الرسالة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الرسالة *</label>
                <Textarea
                  id="message-textarea"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب محتوى الرسالة..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">إدراج متغيرات:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { var: '{{trainee_name}}', label: '👤 اسم المتدرب' },
                    { var: '{{fee_name}}', label: '💰 اسم الرسم' },
                    { var: '{{remaining_amount}}', label: '💵 المتبقي' },
                    { var: '{{program_name}}', label: '📚 البرنامج' },
                    { var: '{{current_date}}', label: '📅 التاريخ' },
                  ].map(({ var: v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">إضافة إيموجيز:</p>
                  <EmojiPickerComponent onEmojiSelect={insertEmoji} />
                </div>
                <QuickEmojis onEmojiSelect={insertEmoji} className="bg-gray-50 p-3 rounded-lg" />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {formData.message && (
            <Card className="border-2 border-tiba-primary-300">
              <CardHeader>
                <CardTitle className="text-tiba-primary-900">معاينة الرسالة</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="bg-white p-4 rounded-lg border text-sm whitespace-pre-wrap">
                  {formData.message
                    .replace(/\{\{trainee_name\}\}/g, 'أحمد محمد')
                    .replace(/\{\{fee_name\}\}/g, 'رسوم التسجيل')
                    .replace(/\{\{remaining_amount\}\}/g, '1,500')
                    .replace(/\{\{program_name\}\}/g, 'مساعد خدمات صحية')
                    .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('ar-EG'))
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 font-medium px-6 py-3"
            >
              <ArrowLeftIcon className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white font-bold px-8 py-3 shadow-sm"
            >
              <BookmarkIcon className="w-5 h-5 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات ✓'}
            </Button>
          </div>
        </form>
    </div>
  );
}

export default function EditReminderPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.automation.payment-reminders', action: 'manage' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة</p>
          </div>
        </div>
      }
    >
      <EditReminderPageContent />
    </ProtectedPage>
  );
}