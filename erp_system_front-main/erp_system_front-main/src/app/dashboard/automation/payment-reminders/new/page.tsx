'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmojiPickerComponent, QuickEmojis } from '@/components/ui/emoji-picker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiBell, FiCalendar, FiClock, FiSearch, FiCheck, FiInfo, FiUsers, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import { ReminderTriggerType, TRIGGER_TYPE_LABELS, TRIGGER_TYPE_DESCRIPTIONS } from '@/types/payment-reminders';
import { createReminderTemplate } from '@/lib/payment-reminders-api';
import { fetchAPI } from '@/lib/api';

interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  program: {
    nameAr: string;
  };
  paymentSchedule?: any;
}

function NewReminderPageContent() {
  const router = useRouter();
  const [fees, setFees] = useState<TraineeFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
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
    fetchFeesWithSchedules();
  }, []);

  const fetchFeesWithSchedules = async () => {
    try {
      setLoading(true);
      const allFees = await fetchAPI('/finances/trainee-fees');
      const schedules = await fetchAPI('/payment-schedules');
      
      // فلترة: فقط الرسوم التي لها جداول سداد
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

    if (!formData.name || !formData.message || !formData.feeId) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.triggerType === ReminderTriggerType.CUSTOM_DATE && !formData.customTriggerDate) {
      toast.error('يجب تحديد تاريخ مخصص');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setSaving(true);
      const response = await createReminderTemplate(formData);

      if (response.success) {
        toast.success('تم إنشاء الرسالة التذكيرية بنجاح');
        router.push('/dashboard/automation/payment-reminders');
      } else {
        toast.error('فشل في إنشاء الرسالة');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في الحفظ');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="bg-gray-200 rounded-xl h-32"></div>
          <div className="bg-gray-200 rounded-xl h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold">إنشاء رسالة تذكير جديدة</h1>
                <p className="text-white/90 mt-1">إعداد رسالة تذكير تلقائية للمتدربين</p>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <FiBell className="h-6 w-6" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Info */}
          <Card>
            <CardHeader className="bg-gray-50">
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
                    <span className="text-blue-600 text-xs mr-2">
                      (فقط الرسوم التي لها مواعيد سداد محددة)
                    </span>
                  </label>
                  
                  <SearchableSelect
                    options={fees.map(fee => ({
                      value: fee.id.toString(),
                      label: `${fee.name} - ${fee.program.nameAr} (${fee.amount.toLocaleString()} ج.م)`,
                    }))}
                    value={formData.feeId > 0 ? formData.feeId.toString() : undefined}
                    onValueChange={(value: string) => setFormData({ ...formData, feeId: parseInt(value) })}
                    placeholder={fees.length === 0 ? 'لا توجد رسوم لها مواعيد سداد' : 'ابحث واختر الرسم...'}
                    emptyMessage="لا توجد نتائج"
                    searchPlaceholder="ابحث في الرسوم..."
                    className="w-full"
                  />
                  
                  {fees.length === 0 && (
                    <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-800 mb-2 flex items-center gap-2">
                        <FiSearch className="h-4 w-4" />
                        <strong>لا توجد رسوم لها مواعيد سداد محددة</strong>
                      </p>
                      <p className="text-xs text-orange-700 mb-3">
                        يجب إنشاء موعد سداد أولاً من صفحة مواعيد السداد
                      </p>
                      <Button
                        type="button"
                        onClick={() => router.push('/dashboard/finances/payment-schedules')}
                        variant="outline"
                        size="sm"
                        className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                      >
                        الانتقال لمواعيد السداد →
                      </Button>
                    </div>
                  )}
                  
                  {fees.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <FiCheck className="text-green-600 h-3 w-3" />
                      وجد {fees.length} رسم له موعد سداد محدد
                    </p>
                  )}
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
            <CardHeader className="bg-gray-50">
              <CardTitle>توقيت الإرسال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.triggerType === value ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="triggerType"
                      value={value}
                      checked={formData.triggerType === value}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as ReminderTriggerType })}
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900 mb-1">{label}</p>
                      <p className="text-sm text-gray-600">{TRIGGER_TYPE_DESCRIPTIONS[value as ReminderTriggerType]}</p>
                    </div>
                    {formData.triggerType === value && (
                      <FiCheck className="w-5 h-5 text-blue-600" />
                    )}
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
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card>
            <CardHeader className="bg-gray-50">
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

              {/* Variables */}
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

              {/* Emojis */}
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
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-900">معاينة الرسالة</CardTitle>
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

          {/* Important Notice */}
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 p-3 rounded-full flex-shrink-0">
                  <FiInfo className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">ℹ️ ملاحظة هامة</h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p className="flex items-center gap-2">
                      <FiUsers className="h-4 w-4 text-blue-600" />
                      <strong>هذه الرسالة ستُرسل تلقائياً فقط للمتدربين:</strong>
                    </p>
                    <ul className="mr-6 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span><strong>لم يسددوا الرسم بالكامل</strong> (لم يدفعوا أو دفعوا جزئياً فقط)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span>لديهم <strong>مبلغ متبقي</strong> من الرسم (لم يدفعوا كل المبلغ)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span>لديهم <strong>رقم هاتف صحيح</strong> مسجل في النظام</span>
                      </li>
                    </ul>
                    <p className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                      <strong>⏭️ تخطي تلقائي:</strong> المتدربون الذين سددوا الرسم بالكامل سيتم تخطيهم تلقائياً (لن يتلقوا الرسالة)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 font-medium px-6 py-3"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              إلغاء
            </Button>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
                variant="outline"
                onClick={() => setFormData({ ...formData, isActive: false })}
                className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 font-medium px-6 py-3"
              >
                حفظ كمعطل
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-3 shadow-lg disabled:opacity-50"
              >
                <FiSave className="w-5 h-5 mr-2" />
                {saving ? 'جاري الحفظ...' : 'إنشاء وتفعيل ✓'}
              </Button>
            </div>
          </div>
        </form>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="!bg-white border-2 border-blue-200 shadow-2xl max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiBell className="h-6 w-6 text-blue-600" />
                </div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">تأكيد الإنشاء</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base text-gray-700 leading-relaxed pr-12">
                هل أنت متأكد من إنشاء رسالة التذكير <span className="font-bold text-blue-600">"{formData.name}"</span>؟
                <br /><br />
                <div className="bg-blue-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ ملاحظة:</strong> سيتم إرسال الرسالة تلقائياً عند حلول الموعد المحدد لجميع المتدربين غير المسددين للرسم.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel
                disabled={saving}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 font-semibold px-6 py-2.5"
              >
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCreate}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-2.5 shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 mr-2 animate-spin inline-block" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-2 inline-block" />
                    تأكيد الإنشاء
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function NewReminderPage() {
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
      <NewReminderPageContent />
    </ProtectedPage>
  );
}