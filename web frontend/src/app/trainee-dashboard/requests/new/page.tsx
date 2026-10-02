'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTraineeProfile } from '../../hooks/useTraineeProfile';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAX_DEFERRAL_DAYS = 14;

export default function NewDeferralRequestPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useTraineeProfile();
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(true);
  const [requestsEnabled, setRequestsEnabled] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);
  
  const [formData, setFormData] = useState({
    feeId: '',
    reason: '',
    requestedExtensionDays: 14
  });

  useEffect(() => {
    checkSettings();
  }, []);

  useEffect(() => {
    if (profile?.trainee?.id && requestsEnabled && !checkingSettings) {
      loadFees();
    } else if (!requestsEnabled) {
      setLoadingFees(false); // إيقاف التحميل إذا معطل
    }
  }, [profile, requestsEnabled, checkingSettings]);

  const checkSettings = () => {
    const stored = localStorage.getItem('deferral_requests_enabled');
    const enabled = stored !== 'false';
    setRequestsEnabled(enabled);
    setCheckingSettings(false);
  };

  const loadFees = async () => {
    try {
      setLoadingFees(true);
      const token = localStorage.getItem('trainee_token');
      const traineeId = profile?.trainee?.id;
      
      if (!traineeId) {
        console.error('No trainee ID found');
        return;
      }
      
      // جلب جميع مدفوعات المتدرب
      const response = await fetch(
        `${API_BASE_URL}/finances/trainees/${traineeId}/payments`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to load fees');
      }
      
      const data = await response.json();
      console.log('📊 Loaded payments:', data);
      
      // فلترة الرسوم غير المدفوعة والمرتبطة بمواعيد سداد
      const unpaidFees = (data || [])
        .filter((payment: any) => {
          console.log('💳 Payment details:', {
            id: payment.id,
            status: payment.status,
            feeId: payment.feeId,
            feeName: payment.fee?.name,
            hasPaymentSchedule: !!payment.fee?.paymentSchedule,
            paymentSchedule: payment.fee?.paymentSchedule
          });
          
          // يجب أن تكون غير مدفوعة
          if (payment.status === 'PAID') {
            console.log('❌ رُفض - مدفوع بالكامل');
            return false;
          }
          
          // التحقق من وجود موعد سداد عبر الرسم
          const hasSchedule = payment.fee?.paymentSchedule;
          console.log('📅 Has schedule:', !!hasSchedule, hasSchedule?.paymentEndDate || 'N/A');
          
          // إذا كانت مرتبطة بموعد سداد، نقبلها
          if (hasSchedule) {
            console.log('✅ قُبل - مرتبط بموعد سداد');
            return true;
          }
          
          // إذا لم تكن مرتبطة، لا نقبلها
          console.log('❌ رُفض - غير مرتبط بموعد سداد');
          return false;
        })
        .map((payment: any) => ({
          id: payment.fee.id,
          name: payment.fee.name,
          amount: payment.fee.amount,
          remainingAmount: payment.amount - (payment.paidAmount || 0),
          status: payment.status,
          dueDate: payment.fee.paymentSchedule?.paymentEndDate,
          scheduleName: `موعد السداد: ${new Date(payment.fee.paymentSchedule.paymentEndDate).toLocaleDateString('ar-EG')}`,
          paymentSchedule: payment.fee.paymentSchedule
        }))
        .sort((a: any, b: any) => {
          // ترتيب حسب تاريخ الاستحقاق (الأقرب أولاً)
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      
      console.log('✅ Unpaid fees with schedule (total):', unpaidFees.length);
      console.log('📋 Fees list:', unpaidFees);
      setFees(unpaidFees);
    } catch (error) {
      console.error('Error loading fees:', error);
      setFees([]);
    } finally {
      setLoadingFees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.feeId || !formData.reason.trim()) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.requestedExtensionDays < 1 || formData.requestedExtensionDays > MAX_DEFERRAL_DAYS) {
      toast.error(`الحد الأقصى المسموح به للتأجيل هو ${MAX_DEFERRAL_DAYS} يوماً`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('trainee_token');
      
      const response = await fetch(
        `${API_BASE_URL}/deferral-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            feeId: parseInt(formData.feeId),
            reason: formData.reason.trim(),
            requestedExtensionDays: formData.requestedExtensionDays
          })
        }
      );

      if (response.ok) {
        toast.success('تم إرسال طلبك بنجاح! سيتم مراجعته قريباً');
        router.push('/trainee-dashboard/requests');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ في إرسال الطلب');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // إذا كانت الطلبات معطلة
  if (!requestsEnabled) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <XCircleIcon className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">تقديم الطلبات معطل مؤقتاً</h2>
            <p className="text-slate-500">نظام طلبات تأجيل السداد غير متاح حالياً من قبل الإدارة.</p>
          </div>
          <div className="p-8 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-slate-600 text-center leading-relaxed text-sm">
                نظام تقديم طلبات تأجيل السداد معطل مؤقتاً من قبل الإدارة.
                يمكنك التواصل مع المركز مباشرة للاستفسار.
              </p>
            </div>
            <Link
              href="/trainee-dashboard/requests"
              className="block w-full text-center bg-emerald-600 text-white px-6 py-3.5 rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-sm transition-colors"
            >
              العودة لقائمة الطلبات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8">
        <Link 
          href="/trainee-dashboard/requests" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-6"
        >
          <ArrowRightIcon className="w-4 h-4" />
          العودة إلى الطلبات
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <BanknotesIcon className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">طلب تأجيل سداد</h1>
            <p className="text-sm text-slate-500 mt-1">قم بتعبئة النموذج أدناه لطلب تأجيل موعد سداد أحد الرسوم المستحقة.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        
        {/* اختيار الرسم */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            الرسم المطلوب تأجيله <span className="text-rose-500">*</span>
          </label>
          <Select
            value={formData.feeId}
            onValueChange={(value) => setFormData({...formData, feeId: value})}
            disabled={fees.length === 0 || loadingFees}
          >
            <SelectTrigger className="w-full h-[50px] px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900">
              <SelectValue placeholder="-- اختر الرسم --" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl shadow-lg">
              {fees.map((fee: any) => (
                <SelectItem key={fee.id} value={fee.id.toString()} className="focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer py-3">
                  {fee.name} - متبقي {fee.remainingAmount} ج.م
                  {fee.dueDate && ` - موعد السداد: ${new Date(fee.dueDate).toLocaleDateString('ar-EG')}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fees.length === 0 && !loadingFees && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                لا توجد رسوم مرتبطة بمواعيد سداد ومستحقة للدفع حالياً.
              </p>
            </div>
          )}
          {loadingFees && (
            <div className="text-sm text-emerald-600 mt-2 font-medium flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              جاري تحميل الرسوم...
            </div>
          )}
        </div>

        {/* عدد الأيام */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            عدد الأيام المطلوب تأجيلها <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={MAX_DEFERRAL_DAYS}
              value={formData.requestedExtensionDays}
              onChange={(e) => {
                const parsedValue = parseInt(e.target.value, 10);
                const safeValue = Number.isNaN(parsedValue)
                  ? 1
                  : Math.min(MAX_DEFERRAL_DAYS, Math.max(1, parsedValue));

                setFormData({ ...formData, requestedExtensionDays: safeValue });
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900"
              required
            />
            <CalendarDaysIcon className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            الحد الأقصى المسموح به للتأجيل هو 14 يوماً.
          </p>
        </div>

        {/* السبب */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            سبب طلب التأجيل <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-900 resize-none"
              rows={5}
              placeholder="يرجى توضيح سبب طلب التأجيل بالتفصيل (مثال: ظروف صحية، ظروف عائلية، ظروف مادية مؤقتة...)"
              required
            />
            <DocumentTextIcon className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* تحذير */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-bold mb-2 text-slate-900">ملاحظات هامة:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                <li>سيتم مراجعة طلبك من قبل الإدارة المالية.</li>
                <li>ستصلك نتيجة المراجعة في قائمة الطلبات.</li>
                <li>في حالة القبول، سيتم تأجيل موعد السداد تلقائياً.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            إلغاء وتراجع
          </button>
          <button
            type="submit"
            disabled={loading || fees.length === 0}
            className="flex-1 sm:flex-none px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4 rotate-180" />
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}