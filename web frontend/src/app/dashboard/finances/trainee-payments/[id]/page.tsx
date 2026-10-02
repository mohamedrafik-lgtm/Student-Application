'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Progress
} from '@/components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTraineePaymentsByTraineeId, getAllSafes, processAutoPayment, createTraineePayment, removeTraineePayment } from '@/app/lib/api/finances';
import { getAllTrainees } from '@/app/lib/api/trainees';
import { getImageUrl } from '@/lib/api';
import { TraineePayment, PaymentStatus, Safe, SafeCategory } from '@/app/types/finances';
import { Trainee } from '@/app/types/trainees';
import { toast } from 'sonner';
import { formatCurrency } from '@/app/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Loader2, CheckCircle2, Printer, Calculator, User, Phone, IdCard, GraduationCap, DollarSign, Clock, Trash2 } from 'lucide-react';
import DashboardShell from '../../../components/DashboardShell';
import DashboardHeader from '../../../components/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

// ترجمة نوع التسجيل
const getEnrollmentTypeInArabic = (type: string) => {
  switch (type) {
    case 'REGULAR': return 'انتظام';
    case 'DISTANCE': return 'انتساب';
    case 'ONLINE': return 'أونلاين';
    default: return type;
  }
};

// ترجمة نوع الرسوم
const getFeeTypeText = (type: any) => {
  switch (type) {
    case 'TUITION': return 'رسوم دراسية';
    case 'SERVICES': return 'رسوم خدمات';
    case 'TRAINING': return 'رسوم تدريب';
    case 'ADDITIONAL': return 'رسوم إضافية';
    default: return 'غير محدد';
  }
};

// نص حالة الدفع
const getStatusText = (status: PaymentStatus) => {
  switch (status) {
    case 'PAID': return 'مدفوع';
    case 'PENDING': return 'معلق';
    case 'PARTIALLY_PAID': return 'مدفوع جزئياً';
    case 'CANCELLED': return 'ملغي';
    default: return status;
  }
};

// لون شارة الحالة
const getStatusBadgeColor = (status: PaymentStatus) => {
  switch (status) {
    case 'PAID': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const isFullOnlyNonTuitionFee = (payment?: TraineePayment) => {
  if (!payment?.fee) return false;
  return payment.fee.type !== 'TUITION' && payment.fee.allowPartialPayment === false;
};

const isPaymentRemovalAllowed = (payment?: TraineePayment) => {
  if (!payment?.fee) return false;
  if (payment.fee.type === 'TUITION') return false;
  if (!payment.fee.refundDeadlineEnabled || !payment.fee.refundDeadlineAt) return false;
  if (payment.paidAmount > 0) return false;
  if (payment.status !== PaymentStatus.PENDING) return false;

  const deadline = new Date(payment.fee.refundDeadlineAt);
  if (Number.isNaN(deadline.getTime())) return false;

  return new Date() <= deadline;
};

const getPaymentRemovalRestrictionReason = (payment?: TraineePayment) => {
  if (!payment?.fee) return 'بيانات الرسم غير متاحة';
  if (payment.fee.type === 'TUITION') return 'غير مسموح بإزالة الرسوم الدراسية من هذا المسار';
  if (payment.paidAmount > 0 && payment.paidAmount < payment.amount) {
    return 'لا يمكن إزالة رسم مدفوع جزئياً. الإزالة متاحة فقط للرسم غير المدفوع بالكامل';
  }
  if (payment.paidAmount >= payment.amount) return 'لا يمكن إزالة رسم مدفوع بالكامل';
  if (payment.status !== PaymentStatus.PENDING) return 'الإزالة متاحة فقط عندما تكون الحالة غير مسدد';
  if (!payment.fee.refundDeadlineEnabled || !payment.fee.refundDeadlineAt) return 'مهلة الاسترداد غير مفعلة لهذا الرسم';

  const deadline = new Date(payment.fee.refundDeadlineAt);
  if (Number.isNaN(deadline.getTime())) return 'تاريخ مهلة الاسترداد غير صالح';
  if (new Date() > deadline) return 'انتهت مهلة الاسترداد لهذا الرسم';

  return 'متاح للإزالة';
};

const formatRefundDeadlineDate = (date?: string | null) => {
  if (!date) return 'غير محدد';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'غير صالح';
  return parsed.toLocaleDateString('ar-EG');
};

const isRefundDeadlineExceededForNonTuitionUnpaid = (payment?: TraineePayment) => {
  if (!payment?.fee) return false;
  if (payment.fee.type === 'TUITION') return false;
  if (!payment.fee.refundDeadlineEnabled || !payment.fee.refundDeadlineAt) return false;
  if (payment.paidAmount >= payment.amount) return false;

  const deadline = new Date(payment.fee.refundDeadlineAt);
  if (Number.isNaN(deadline.getTime())) return false;

  return new Date() > deadline;
};

// نموذج الدفع الذكي
const smartPaymentFormSchema = z.object({
  totalAmount: z.coerce.number()
    .min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  safeId: z.string().min(1, { message: 'الخزينة مطلوبة' }),
  notes: z.string().optional(),
});

// نموذج الدفع المحدد
const specificPaymentFormSchema = z.object({
  paymentId: z.coerce.number().min(1, { message: 'يجب اختيار الرسم' }),
  amount: z.coerce.number().min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  safeId: z.string().min(1, { message: 'الخزينة مطلوبة' }),
  notes: z.string().optional(),
});

function TraineePaymentDetailPageContent() {
  // CSS للانيميشن
  const progressStyle = `
    @keyframes countdown {
      from { width: 0%; }
      to { width: 100%; }
    }
  `;

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = progressStyle;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const { } = useAuth();
  const params = useParams();
  const traineeId = parseInt(params.id as string);

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [availableSafes, setAvailableSafes] = useState<Safe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSmartPaymentDialog, setOpenSmartPaymentDialog] = useState(false);
  const [openSpecificPaymentDialog, setOpenSpecificPaymentDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openRemoveFeeDialog, setOpenRemoveFeeDialog] = useState(false);
  const [selectedPaymentToRemove, setSelectedPaymentToRemove] = useState<TraineePayment | null>(null);
  const [isRemovingFee, setIsRemovingFee] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    show: boolean;
    message: string;
    details: any;
  } | null>(null);

  // نموذج الدفع الذكي
  const smartPaymentForm = useForm<z.infer<typeof smartPaymentFormSchema>>({
    resolver: zodResolver(smartPaymentFormSchema),
    defaultValues: {
      totalAmount: 0,
      safeId: '',
      notes: '',
    },
  });

  // نموذج الدفع المحدد
  const specificPaymentForm = useForm<z.infer<typeof specificPaymentFormSchema>>({
    resolver: zodResolver(specificPaymentFormSchema),
    defaultValues: {
      paymentId: 0,
      amount: 0,
      safeId: '',
      notes: '',
    },
  });

  const selectedSpecificPaymentId = specificPaymentForm.watch('paymentId');
  const selectedSpecificPayment = payments.find(p => p.id === selectedSpecificPaymentId);
  const selectedSpecificPaymentRemaining = selectedSpecificPayment
    ? selectedSpecificPayment.amount - selectedSpecificPayment.paidAmount
    : 0;
  const selectedSpecificPaymentIsFullOnly = isFullOnlyNonTuitionFee(selectedSpecificPayment);

  // حساب المجاميع
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.reduce((sum, p) => sum + p.paidAmount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // جلب البيانات
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [paymentsData, safesData, traineesData] = await Promise.all([
        getTraineePaymentsByTraineeId(traineeId),
        getAllSafes(),
        getAllTrainees(),
      ]);

      setPayments(paymentsData);
      setSafes(safesData);
      
      const traineeData = traineesData.find((t: any) => t.id === traineeId);
      setTrainee(traineeData || null);

      // تعيين المبلغ المتبقي كقيمة افتراضية
      const totalRemaining = paymentsData.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
      smartPaymentForm.setValue('totalAmount', totalRemaining);

    } catch (error) {
      toast.error('حدث خطأ أثناء جلب البيانات');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (traineeId) {
      fetchData();
    }
  }, [traineeId]);

  // فتح نافذة الدفع الذكي
  const openSmartPayment = () => {
    // تصفية خزائن الدخل فقط (خزائن الرسوم المستلمة)
    const incomeSafes = safes.filter(safe => 
      safe.category === SafeCategory.INCOME && safe.isActive
    );
    
    setAvailableSafes(incomeSafes);
    
    // تنظيف النموذج وإعادة تعيين القيم
    smartPaymentForm.reset({
      totalAmount: 0,
      safeId: '',
      notes: '',
    });
    
    // إفراغ حقل المبلغ يدوياً
    smartPaymentForm.setValue('totalAmount', '' as any);
    
    setOpenSmartPaymentDialog(true);
  };

  // معالجة الدفع الذكي
  const handleSmartPayment = async (values: z.infer<typeof smartPaymentFormSchema>) => {
    try {
      setIsProcessing(true);
      
      // استدعاء API الدفع التلقائي
      const result = await processAutoPayment({
        traineeId,
        amount: values.totalAmount,
        safeId: values.safeId,
        notes: values.notes,
      });
      
      // رسالة نجاح مضغوطة
      toast.success(`💰 تم دفع ${formatCurrency(values.totalAmount, 'EGP')} بنجاح`, {
        duration: 4000, // 4 ثوان ثم تختفي تلقائياً
        position: 'top-center',
        style: {
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }
      });

      setPaymentSuccess({
        show: true,
        message: `تم توزيع ${formatCurrency(values.totalAmount, 'EGP')} بنجاح على ${result.processedPayments} رسوم`,
        details: result
      });

      // إغلاق المودال تلقائياً بعد 6 ثوان
      setTimeout(() => {
        setPaymentSuccess(null);
        fetchData();
      }, 6000);
      
      setOpenSmartPaymentDialog(false);
      setOpenConfirmDialog(false);
      smartPaymentForm.reset();
      fetchData();
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // رسالة خطأ مفصلة
      const errorMessage = `❌ فشل في معالجة الدفع
      
👤 المتدرب: ${trainee?.nameAr}
💰 المبلغ: ${formatCurrency(values.totalAmount, 'EGP')}
🏦 الخزينة: ${safes.find(s => s.id === values.safeId)?.name}
⚠️ السبب: ${error?.message || 'خطأ غير معروف'}

🔄 يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني`;

      toast.error(errorMessage, {
        duration: 10000,
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          whiteSpace: 'pre-line'
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // معالجة الدفع المحدد
  const handleSpecificPayment = async (values: z.infer<typeof specificPaymentFormSchema>) => {
    try {
      setIsProcessing(true);

      const selectedPayment = payments.find(p => p.id === values.paymentId);
      if (!selectedPayment) {
        throw new Error('الرسم المحدد غير موجود');
      }

      const remainingForSelectedPayment = selectedPayment.amount - selectedPayment.paidAmount;
      if (values.amount > remainingForSelectedPayment) {
        throw new Error(`المبلغ المدفوع يتجاوز المتبقي. المتبقي لهذا الرسم: ${formatCurrency(remainingForSelectedPayment, 'EGP')}`);
      }

      if (isFullOnlyNonTuitionFee(selectedPayment) && values.amount !== remainingForSelectedPayment) {
        throw new Error(`هذا الرسم مضبوط على "سداد كامل فقط". يجب سداد كامل المتبقي: ${formatCurrency(remainingForSelectedPayment, 'EGP')}`);
      }

      // استدعاء API الدفع العادي
      const result = await createTraineePayment({
        feeId: selectedPayment.feeId,
        traineeId,
        amount: values.amount,
        safeId: values.safeId,
        notes: values.notes,
      });

      toast.success(`💰 تم دفع ${formatCurrency(values.amount, 'EGP')} بنجاح`, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }
      });

      setOpenSpecificPaymentDialog(false);
      specificPaymentForm.reset();
      fetchData();

    } catch (error: any) {
      console.error('Payment error:', error);
      const message = error?.response?.data?.message || error?.message || 'خطأ غير معروف';
      toast.error(`❌ فشل في معالجة الدفع: ${message}`, {
        duration: 10000,
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRemoveFeeDialog = (payment: TraineePayment) => {
    if (!isPaymentRemovalAllowed(payment)) {
      toast.error(getPaymentRemovalRestrictionReason(payment));
      return;
    }

    setSelectedPaymentToRemove(payment);
    setOpenRemoveFeeDialog(true);
  };

  const handleRemoveFee = async () => {
    if (!selectedPaymentToRemove) return;

    try {
      setIsRemovingFee(true);
      await removeTraineePayment(selectedPaymentToRemove.id);

      toast.success(`✅ تم إزالة الرسم "${selectedPaymentToRemove.fee?.name}" بنجاح`, {
        duration: 5000,
      });

      setOpenRemoveFeeDialog(false);
      setSelectedPaymentToRemove(null);
      await fetchData();
    } catch (error: any) {
      console.error('Remove fee error:', error);
      const message = error?.response?.data?.message || error?.message || 'خطأ غير معروف';
      toast.error(`❌ فشل في إزالة الرسم: ${message}`, {
        duration: 8000,
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
        }
      });
    } finally {
      setIsRemovingFee(false);
    }
  };

  // دالة طباعة إيصال - استخدام رابط الطباعة القديم
  const handlePrintReceipt = () => {
    // فتح صفحة الطباعة في تاب جديد
    const printUrl = `/print/trainee-payments/${traineeId}`;
    window.open(printUrl, '_blank');
  };

  // الحصول على لون حالة الدفع
  const getPaymentStatusColor = (payment: TraineePayment) => {
    if (payment.status === PaymentStatus.PAID) {
      return 'bg-green-50 border-green-200';
    } else if (payment.status === PaymentStatus.PARTIALLY_PAID) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!trainee) {
    return (
      <DashboardShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-800">المتدرب غير موجود</h2>
          <Button 
            onClick={() => window.close()} 
            className="mt-4"
            variant="outline"
          >
            إغلاق النافذة
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
        <DashboardHeader 
        heading={`💳 مدفوعات المتدرب: ${trainee.nameAr}`}
        description="عرض وإدارة جميع مديونيات المتدرب مع نظام الدفع الذكي"
      />

      <div className="space-y-6">
        {/* بيانات المتدرب */}
        <Card className="border-2 border-blue-100 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* صورة المتدرب والمعلومات الأساسية */}
              <div className="lg:col-span-1">
                <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
                  {/* صورة المتدرب */}
                  <div className="flex-shrink-0">
                    <div className="relative w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 overflow-hidden rounded-full border-3 md:border-4 border-blue-200 shadow-lg">
                      {trainee.photoUrl ? (
                        <img
                          src={getImageUrl(trainee.photoUrl)}
                          alt={trainee.nameAr}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg md:text-2xl lg:text-3xl ${trainee.photoUrl ? 'hidden' : ''}`}>
                        {trainee.nameAr?.charAt(0) || 'م'}
                      </div>
        </div>
      </div>

                  {/* المعلومات الأساسية */}
                  <div className="text-center sm:text-left lg:text-center flex-1">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-2">{trainee.nameAr}</h2>
                    <div className="space-y-1 text-xs md:text-sm lg:text-base text-gray-600">
                                            <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-1 md:gap-2">
                        <IdCard className="h-3 md:h-4 w-3 md:w-4 text-gray-500" />
                        <span>{trainee.nationalId}</span>
              </div>
                      {trainee.phone && (
                        <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-1 md:gap-2">
                          <Phone className="h-3 md:h-4 w-3 md:w-4 text-gray-500" />
                          <span>{trainee.phone}</span>
                </div>
                      )}
                </div>
                </div>
                </div>
              </div>

              {/* المعلومات الأكاديمية */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  المعلومات الأكاديمية
                </h3>
                <div className="space-y-3 text-gray-700">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">البرنامج التدريبي</div>
                    <div className="font-medium">{trainee.program?.nameAr || 'غير محدد'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">نوع التسجيل</div>
                    <div className="font-medium">{getEnrollmentTypeInArabic(trainee.enrollmentType || 'غير محدد')}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">السنة الأكاديمية</div>
                    <div className="font-medium">{trainee.academicYear || 'غير محدد'}</div>
                  </div>
                </div>
              </div>

              {/* الملخص المالي */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  الملخص المالي
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">إجمالي الرسوم:</span>
                    <span className="font-bold text-gray-800">{formatCurrency(totalAmount, 'EGP')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">المبلغ المدفوع:</span>
                    <span className="font-bold text-green-600">{formatCurrency(paidAmount, 'EGP')}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-gray-600 font-medium">المبلغ المتبقي:</span>
                    <span className="font-bold text-red-600 text-lg">{formatCurrency(remainingAmount, 'EGP')}</span>
                  </div>
                  
                  {/* شريط التقدم */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>نسبة الدفع</span>
                      <span>{paymentPercentage.toFixed(1)}%</span>
                </div>
                    <Progress value={paymentPercentage} className="h-3" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أزرار العمليات السريعة */}
        {remainingAmount > 0 && (
          <Card className="border-2 border-green-100 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                <Button 
                  onClick={openSmartPayment}
                  className="bg-green-600 hover:bg-green-700 text-white h-10 md:h-11 text-sm md:text-base px-4 md:px-6"
                >
                  <Calculator className="mr-1 md:mr-2 h-4 w-4" />
                  💡 دفع رسوم أساسية
                </Button>
                <Button 
                  onClick={() => setOpenSpecificPaymentDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-10 md:h-11 text-sm md:text-base px-4 md:px-6"
                >
                  <DollarSign className="mr-1 md:mr-2 h-4 w-4" />
                  💳 دفع رسوم إضافية
                </Button>
                <Button 
                  onClick={handlePrintReceipt}
                  variant="outline"
                  className="h-10 md:h-11 border-gray-300 text-gray-700 hover:bg-gray-50 px-4 md:px-6 text-sm md:text-base"
                >
                  <Printer className="mr-1 md:mr-2 h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* تفاصيل الرسوم */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              تفاصيل الرسوم ({payments.length} رسوم)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-medium text-gray-800">🎉 لا توجد رسوم</h3>
                <p>هذا المتدرب ليس لديه أي رسوم مطلوبة</p>
              </div>
            ) : (
              <>
                {/* عرض الجدول على الشاشات الكبيرة */}
                <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-100">
                    <TableRow>
                        <TableHead className="font-bold text-gray-800">الرسوم</TableHead>
                        <TableHead className="font-bold text-gray-800">النوع</TableHead>
                        <TableHead className="font-bold text-gray-800">المبلغ الإجمالي</TableHead>
                        <TableHead className="font-bold text-gray-800">المبلغ المدفوع</TableHead>
                        <TableHead className="font-bold text-gray-800">المبلغ المتبقي</TableHead>
                        <TableHead className="font-bold text-gray-800">الحالة</TableHead>
                        <TableHead className="font-bold text-gray-800">تاريخ الإنشاء</TableHead>
                      <TableHead className="font-bold text-gray-800">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // من الأقدم للأحدث
                      .map((payment, index) => {
                        const remaining = payment.amount - payment.paidAmount;
                        const paymentPercent = (payment.paidAmount / payment.amount) * 100;
                        const isPartiallyPaidFee = payment.paidAmount > 0 && payment.paidAmount < payment.amount;
                        const isTuitionFee = payment.fee?.type === 'TUITION';
                        const isRefundDeadlineExceeded = isRefundDeadlineExceededForNonTuitionUnpaid(payment);
                        const canRemoveFee = isPaymentRemovalAllowed(payment);
                        const removeReason = getPaymentRemovalRestrictionReason(payment);
                      
                      return (
                          <TableRow 
                            key={payment.id} 
                            className={`${getPaymentStatusColor(payment)} border-b transition-colors`}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-gray-800">
                                  {payment.fee?.name}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1} (أولوية الدفع)
                                </Badge>
                                {isRefundDeadlineExceeded && (
                                  <Badge className="text-xs bg-red-100 text-red-800 border border-red-200">
                                    تجاوز المدة
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {getFeeTypeText(payment.fee?.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-gray-800">
                              {formatCurrency(payment.amount, 'EGP')}
                          </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(payment.paidAmount, 'EGP')}
                          </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatCurrency(remaining, 'EGP')}
                          </TableCell>
                          <TableCell>
                              <div className="space-y-2">
                                <Badge 
                                  className={`${
                                    payment.status === PaymentStatus.PAID 
                                      ? 'bg-green-100 text-green-800' 
                                      : payment.status === PaymentStatus.PARTIALLY_PAID
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  } border`}
                                >
                                  {payment.status === PaymentStatus.PAID 
                                    ? '✅ مدفوع' 
                                    : payment.status === PaymentStatus.PARTIALLY_PAID
                                    ? '🔄 جزئي'
                                    : '❌ غير مدفوع'}
                            </Badge>
                                <Progress value={paymentPercent} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                          </TableCell>
                            <TableCell>
                              {isTuitionFee ? (
                                <span className="text-xs text-gray-500">غير متاح للرسوم الدراسية</span>
                              ) : (
                                <div className="space-y-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenRemoveFeeDialog(payment)}
                                    disabled={!canRemoveFee || isRemovingFee}
                                    title={canRemoveFee ? 'إزالة الرسم من المتدرب' : removeReason}
                                    className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4 ml-1" />
                                    إزالة الرسم
                                  </Button>
                                  {!canRemoveFee && isPartiallyPaidFee && (
                                    <div className="text-[11px] text-amber-700 font-medium">
                                      لا يمكن إزالة رسم مدفوع جزئياً
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

                {/* عرض الكروت على الشاشات الصغيرة */}
                <div className="block md:hidden space-y-4 p-4">
                  {payments
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((payment, index) => {
                      const remaining = payment.amount - payment.paidAmount;
                      const paymentPercent = (payment.paidAmount / payment.amount) * 100;
                      const isPartiallyPaidFee = payment.paidAmount > 0 && payment.paidAmount < payment.amount;
                      const isTuitionFee = payment.fee?.type === 'TUITION';
                      const isRefundDeadlineExceeded = isRefundDeadlineExceededForNonTuitionUnpaid(payment);
                      const canRemoveFee = isPaymentRemovalAllowed(payment);
                      const removeReason = getPaymentRemovalRestrictionReason(payment);
                      
                      return (
                        <div key={payment.id} className={`rounded-lg border p-4 space-y-3 ${getPaymentStatusColor(payment)}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-800">{payment.fee?.name}</h3>
                              <Badge variant="outline" className="text-xs mt-1">
                                #{index + 1} (أولوية الدفع)
                              </Badge>
                              {isRefundDeadlineExceeded && (
                                <Badge className="text-xs mt-1 bg-red-100 text-red-800 border border-red-200">
                                  تجاوز المدة
                                </Badge>
                              )}
                            </div>
                            <Badge className={getStatusBadgeColor(payment.status)}>
                              {getStatusText(payment.status)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">النوع:</span>
                              <div className="font-medium">
                                {getFeeTypeText(payment.fee?.type)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">تاريخ الإنشاء:</span>
                              <div className="font-medium">{new Date(payment.createdAt).toLocaleDateString('ar-EG')}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">المبلغ الإجمالي:</span>
                              <span className="font-bold text-gray-800">{formatCurrency(payment.amount, 'EGP')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">المبلغ المدفوع:</span>
                              <span className="font-bold text-green-600">{formatCurrency(payment.paidAmount, 'EGP')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">المبلغ المتبقي:</span>
                              <span className="font-bold text-red-600">{formatCurrency(remaining, 'EGP')}</span>
                            </div>
                            
                            {/* شريط التقدم */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>نسبة الدفع</span>
                                <span>{paymentPercent.toFixed(1)}%</span>
                              </div>
                              <Progress value={paymentPercent} className="h-2" />
                            </div>
                          </div>

                          {!isTuitionFee && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-600 mb-2">
                                مهلة الاسترداد: {formatRefundDeadlineDate(payment.fee?.refundDeadlineAt)}
                              </div>
                              {isRefundDeadlineExceeded && (
                                <div className="text-xs text-red-600 mb-2 font-medium">
                                  هذا الرسم تجاوز مدة الاسترداد
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRemoveFeeDialog(payment)}
                                disabled={!canRemoveFee || isRemovingFee}
                                title={canRemoveFee ? 'إزالة الرسم من المتدرب' : removeReason}
                                className="w-full text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4 ml-1" />
                                إزالة الرسم
                              </Button>
                              {!canRemoveFee && isPartiallyPaidFee && (
                                <div className="text-xs text-amber-700 font-medium mt-2">
                                  لا يمكن إزالة رسم مدفوع جزئياً
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* معلومات الدفع الذكي */}
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calculator className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-blue-800">💡 كيف يعمل الدفع الذكي؟</h4>
                <p className="text-sm text-blue-700">
                  أدخل أي مبلغ وسيتم توزيعه تلقائياً على الرسوم من الأقدم للأحدث. 
                  مثال: إذا أدخلت 1000 جنيه، سيتم دفع الرسوم بترتيب الأولوية حتى ينتهي المبلغ.
                </p>
              </div>
        </div>
          </CardContent>
        </Card>
      </div>

      {/* مربع حوار الدفع الذكي */}
      <Dialog open={openSmartPaymentDialog} onOpenChange={setOpenSmartPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Calculator className="h-4 w-4 text-blue-600" />
              </div>
              الدفع الذكي
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              أدخل المبلغ وسيتم توزيعه على الرسوم من الأقدم للأحدث
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* ملخص سريع */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-blue-800 text-sm mb-2">📊 ملخص المديونية</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-600">إجمالي المتبقي:</span>
                  <div className="font-semibold text-red-600">{formatCurrency(remainingAmount, 'EGP')}</div>
                </div>
                <div>
                  <span className="text-blue-600">عدد الرسوم المعلقة:</span>
                  <div className="font-semibold text-blue-800">
                    {payments.filter(p => p.status !== PaymentStatus.PAID).length} رسوم
                  </div>
                </div>
              </div>
            </div>

            <Form {...smartPaymentForm}>
              <form className="space-y-4">
                <FormField
                  control={smartPaymentForm.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">💰 المبلغ المراد دفعه</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          max={remainingAmount}
                          step="0.01"
                          placeholder="ادخل القيمة المراد دفعها"
                          className="h-10 border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 text-gray-900 placeholder-gray-500"
                          {...field}
                          value={field.value === 0 ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500">
                        الحد الأقصى: {formatCurrency(remainingAmount, 'EGP')}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={smartPaymentForm.control}
                  name="safeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">🏦 خزينة الدخل المستلمة</FormLabel>
                      {availableSafes.length === 0 ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                          ⚠️ لا توجد خزائن دخل متاحة للسداد
                          <br />
                          <span className="text-xs">يجب إنشاء خزائن دخل أولاً</span>
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 text-gray-900">
                              <SelectValue placeholder="اختر خزينة الدخل" className="text-gray-500" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white">
                            {availableSafes.map((safe) => (
                              <SelectItem 
                                key={safe.id} 
                                value={safe.id}
                                className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600">💰</span>
                                  <span className="text-gray-900">
                                    {safe.name} ({formatCurrency(safe.balance, safe.currency)})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="text-xs text-blue-600 mt-1">
                        ℹ️ يتم عرض خزائن الدخل فقط لاستقبال الرسوم
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={smartPaymentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">📝 ملاحظات</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ملاحظات إضافية (اختياري)..." 
                          className="h-10 border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-900 placeholder-gray-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSmartPaymentDialog(false)}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={() => setOpenConfirmDialog(true)}
              disabled={availableSafes.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              معاينة التوزيع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد الدفع */}
      <AlertDialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
        <AlertDialogContent className="sm:max-w-[450px] bg-gradient-to-br from-slate-50 via-stone-50 to-zinc-50 border border-slate-300 shadow-2xl">
          <AlertDialogHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4 animate-pulse shadow-lg">
              <Calculator className="h-8 w-8 text-white animate-bounce" />
            </div>
            <AlertDialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-emerald-600 bg-clip-text text-transparent">
              💳 تأكيد الدفع الذكي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-base">
              هل تريد تنفيذ العملية التالية؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-2">
            {/* معلومات الطالب */}
            <div className="bg-gradient-to-r from-slate-100 to-stone-100 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                👤 معلومات الطالب
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">الاسم:</span>
                  <span className="font-medium text-slate-800">{trainee?.nameAr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">البرنامج:</span>
                  <span className="font-medium text-slate-800">{trainee?.program?.nameAr || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">الرقم القومي:</span>
                  <span className="font-medium text-slate-800">{trainee?.nationalId}</span>
                </div>
              </div>
            </div>

            {/* تفاصيل الدفع */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
              <h4 className="font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                💰 تفاصيل الدفع
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-600">المبلغ المدفوع:</span>
                  <span className="font-bold text-emerald-800 text-lg">{formatCurrency(smartPaymentForm.getValues().totalAmount, 'EGP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">الخزينة:</span>
                  <span className="font-medium text-emerald-800">{safes.find(s => s.id === smartPaymentForm.getValues().safeId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">عدد الرسوم:</span>
                  <span className="font-medium text-emerald-800">{payments.filter(p => p.status !== PaymentStatus.PAID).length} رسوم</span>
                </div>
              </div>
            </div>

            {/* طريقة التوزيع */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium text-amber-700 text-sm">🎯 التوزيع الذكي</span>
              </div>
              <p className="text-xs text-amber-600">
                سيتم توزيع المبلغ على الرسوم من الأقدم للأحدث تلقائياً ✨
              </p>
            </div>
          </div>
          
          <AlertDialogFooter className="flex gap-3 pt-4">
            <AlertDialogCancel className="flex-1 bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 transition-all duration-200">
              ❌ إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSmartPayment(smartPaymentForm.getValues())}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  ✅ تأكيد الدفع
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة النجاح المحسنة */}
      {paymentSuccess && paymentSuccess.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 border border-gray-200 animate-in zoom-in duration-300">
            {/* شريط تقدم الإغلاق التلقائي */}
            <div className="h-1 bg-gray-200 rounded-t-xl overflow-hidden">
              <div className="h-full bg-green-500" style={{
                animation: 'countdown 6s linear forwards',
                width: '0%'
              }}></div>
            </div>
            
            <div className="relative p-6 text-center">
              {/* أيقونة النجاح بسيطة */}
              <div className="relative mx-auto mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                {/* دائرة واحدة بسيطة */}
                <div className="absolute inset-0 rounded-full border-2 border-emerald-300 opacity-30"></div>
              </div>
              
              {/* العنوان */}
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                🎉 تم الدفع بنجاح!
              </h3>
              
              {/* معلومات الطالب */}
              <div className="bg-gradient-to-r from-slate-100 to-stone-100 rounded-lg p-4 mb-4 border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center justify-center gap-2">
                  <User className="h-4 w-4" />
                  معلومات الطالب
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">الاسم:</span>
                    <span className="font-medium text-slate-800">{trainee?.nameAr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">البرنامج:</span>
                    <span className="font-medium text-slate-800">{trainee?.program?.nameAr || 'غير محدد'}</span>
                  </div>
                </div>
              </div>

              {/* تفاصيل الدفع */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mb-4 border border-emerald-200">
                <h4 className="font-semibold text-emerald-700 mb-2 flex items-center justify-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  تفاصيل الدفع
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-600">المبلغ المدفوع:</span>
                    <span className="font-bold text-emerald-800 text-lg">{formatCurrency(paymentSuccess.details?.totalAmountPaid || 0, 'EGP')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">الرسوم المدفوعة:</span>
                    <span className="font-medium text-emerald-800">{paymentSuccess.details?.processedPayments} رسوم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">مدفوعة بالكامل:</span>
                    <span className="font-medium text-emerald-800">{paymentSuccess.details?.fullyPaidCount} رسوم</span>
                  </div>
                  {paymentSuccess.details?.clearedSafesCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">خزائن تم تصفيتها:</span>
                      <span className="font-medium text-emerald-800">{paymentSuccess.details?.clearedSafesCount} خزينة</span>
                    </div>
                  )}
                </div>
              </div>

              {/* شريط تقدم ثابت */}
              <div className="mb-4">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>

              {/* الأزرار */}
              <div className="flex gap-2 md:gap-3">
                <Button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white h-9 md:h-10 shadow-lg transition-colors duration-200 text-sm md:text-base px-3 md:px-4"
                >
                  <Printer className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4" />
                  🖨️ طباعة
                </Button>
                
                <Button
                  onClick={() => {
                    setPaymentSuccess(null);
                    fetchData();
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-9 md:h-10 shadow-lg transition-colors duration-200 text-sm md:text-base px-3 md:px-4"
                >
                  ✅ إغلاق
                </Button>
              </div>

              {/* نجوم ثابتة */}
              <div className="absolute top-4 left-4">
                <div className="text-amber-400 text-lg opacity-60">⭐</div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="text-amber-400 text-lg opacity-60">⭐</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={openRemoveFeeDialog}
        onOpenChange={(open) => !isRemovingFee && setOpenRemoveFeeDialog(open)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black font-bold">تأكيد إزالة الرسم</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              سيتم إزالة الرسم عن المتدرب مع عكس تأثيره على الخزينة.
              <br />
              لا يمكن إزالة أي رسم تم سداده جزئياً أو كلياً.
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedPaymentToRemove && (
            <div className="my-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800 space-y-1">
              <p><span className="font-semibold">الرسم:</span> {selectedPaymentToRemove.fee?.name}</p>
              <p><span className="font-semibold">المبلغ:</span> {formatCurrency(selectedPaymentToRemove.amount, 'EGP')}</p>
              <p><span className="font-semibold">المسدد:</span> {formatCurrency(selectedPaymentToRemove.paidAmount, 'EGP')}</p>
              <p><span className="font-semibold">آخر موعد للاسترداد:</span> {formatRefundDeadlineDate(selectedPaymentToRemove.fee?.refundDeadlineAt)}</p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFee}
              disabled={isRemovingFee}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isRemovingFee ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإزالة...
                </>
              ) : (
                'تأكيد الإزالة'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* مربع حوار الدفع المحدد */}
      <Dialog open={openSpecificPaymentDialog} onOpenChange={setOpenSpecificPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              دفع رسوم إضافية
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              اختر الرسم الإضافي المراد دفعه وحدد المبلغ
              <br />
              <span className="text-xs text-blue-600 mt-1 inline-block">
                ℹ️ الرسوم الدراسية تُدفع فقط من خلال "دفع رسوم أساسية"
              </span>
              <br />
              <span className="text-xs text-amber-600 mt-1 inline-block">
                ℹ️ بعض الرسوم الإضافية قد تكون مضبوطة على "سداد كامل فقط"
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Form {...specificPaymentForm}>
              <form onSubmit={specificPaymentForm.handleSubmit(handleSpecificPayment)} className="space-y-4">
                <FormField
                  control={specificPaymentForm.control}
                  name="paymentId"
                  render={({ field }) => {
                    const availablePayments = payments.filter(p => 
                      p.status !== PaymentStatus.PAID && 
                      p.fee?.type !== 'TUITION' // استبعاد الرسوم الدراسية
                    );
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-800">📋 اختر الرسم</FormLabel>
                        {availablePayments.length === 0 ? (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <div className="text-4xl mb-2">✅</div>
                            <p className="text-gray-700 font-semibold mb-1">لا توجد رسوم إضافية للسداد</p>
                            <p className="text-gray-500 text-sm">
                              جميع الرسوم الإضافية مدفوعة أو لا توجد رسوم مطبقة
                            </p>
                          </div>
                        ) : (
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              const selected = payments.find(p => p.id === parseInt(value));
                              if (selected) {
                                const remaining = selected.amount - selected.paidAmount;
                                specificPaymentForm.setValue('amount', remaining);
                              }
                            }} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 text-gray-900">
                                <SelectValue placeholder="اختر الرسم المراد دفعه" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white">
                              {availablePayments.map((payment) => {
                                const remaining = payment.amount - payment.paidAmount;
                                const fullOnly = isFullOnlyNonTuitionFee(payment);
                                return (
                                  <SelectItem 
                                    key={payment.id} 
                                    value={payment.id.toString()}
                                    className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex flex-col">
                                        <span>{payment.fee?.name}</span>
                                        {fullOnly && (
                                          <span className="text-[11px] text-amber-700">سداد كامل فقط</span>
                                        )}
                                      </div>
                                      <span className="text-red-600 font-semibold">
                                        {formatCurrency(remaining, 'EGP')}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={specificPaymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">💰 المبلغ المراد دفعه</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          max={selectedSpecificPayment ? selectedSpecificPaymentRemaining : undefined}
                          step="0.01"
                          placeholder="المبلغ"
                          className="h-10 border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 text-gray-900"
                          readOnly={selectedSpecificPaymentIsFullOnly}
                          {...field}
                          value={field.value === 0 ? '' : field.value}
                          onChange={(e) => {
                            if (selectedSpecificPaymentIsFullOnly) {
                              field.onChange(selectedSpecificPaymentRemaining);
                              return;
                            }
                            const value = e.target.value;
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                          }}
                        />
                      </FormControl>
                      {selectedSpecificPaymentIsFullOnly && (
                        <div className="text-xs text-amber-700">
                          هذا الرسم يتطلب سداد كامل المتبقي: {formatCurrency(selectedSpecificPaymentRemaining, 'EGP')}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={specificPaymentForm.control}
                  name="safeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">🏦 خزينة الدخل المستلمة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 text-gray-900">
                            <SelectValue placeholder="اختر خزينة الدخل" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          {safes
                            .filter(safe => safe.category === SafeCategory.INCOME && safe.isActive)
                            .map((safe) => (
                              <SelectItem 
                                key={safe.id} 
                                value={safe.id}
                                className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600">💰</span>
                                  <span>{safe.name} ({formatCurrency(safe.balance, safe.currency)})</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={specificPaymentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-800">📝 ملاحظات</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ملاحظات إضافية (اختياري)..." 
                          className="h-10 border-gray-300 text-gray-900"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSpecificPaymentDialog(false)}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={specificPaymentForm.handleSubmit(handleSpecificPayment)}
              disabled={
                isProcessing || 
                payments.filter(p => p.status !== PaymentStatus.PAID && p.fee?.type !== 'TUITION').length === 0
              }
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  💳 تأكيد الدفع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

export default function TraineePaymentDetailPage() {
  return (
    <FinancialPageGuard>
      <TraineePaymentDetailPageContent />
    </FinancialPageGuard>
  );
} 