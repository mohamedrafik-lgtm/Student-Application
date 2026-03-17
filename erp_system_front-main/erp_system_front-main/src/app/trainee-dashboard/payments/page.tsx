'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';

export default function TraineePaymentsPage() {
  const { profile: traineeData, stats, loading, error } = useTraineeProfile();

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحضير بياناتك المالية..." 
        submessage="نجهز لك معلومات الرسوم والمدفوعات"
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">حدث خطأ في تحميل البيانات</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const trainee = traineeData?.trainee;
  const payments = trainee?.traineePayments || [];
  
  // تشخيص: طباعة بيانات جداول السداد
  console.log('💰 Payment Schedules Debug:', payments.map(p => ({
    feeName: p.fee.name,
    hasSchedule: !!p.fee.paymentSchedule,
    schedule: p.fee.paymentSchedule
  })));

  // ترتيب المدفوعات حسب تاريخ الإنشاء (الأقدم أولاً)
  const sortedPayments = [...payments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  console.log(`📊 تم جلب ${payments.length} من الرسوم للمتدرب:`, payments.map(p => ({
    name: p.fee.name,
    amount: p.amount,
    paid: p.paidAmount,
    status: p.status,
    date: p.createdAt
  })));

  // تحديد المدفوعات المتاحة للسداد (الرسوم غير المسددة بالترتيب)
  const getPaymentAvailability = () => {
    let nextUnpaidFound = false;
    return sortedPayments.map(payment => {
      const isFullyPaid = payment.status === 'PAID';
      const isPartiallyPaid = payment.status === 'PARTIALLY_PAID';
      const isPending = payment.status === 'PENDING';
      
      // إذا كانت مدفوعة بالكامل، تخطاها
      if (isFullyPaid) {
        return { ...payment, canPay: false, isNext: false };
      }
      
      // أول رسوم غير مدفوعة أو مدفوعة جزئياً = متاحة للدفع
      if ((isPending || isPartiallyPaid) && !nextUnpaidFound) {
        nextUnpaidFound = true;
        return { ...payment, canPay: true, isNext: true };
      }
      
      // باقي الرسوم غير متاحة للدفع حتى يتم سداد السابقة
      return { ...payment, canPay: false, isNext: false };
    });
  };

  const paymentsWithAvailability = getPaymentAvailability();

  // حساب الإحصائيات المالية
  const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const paidAmount = payments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
  const remainingAmount = totalAmount - paidAmount;
  const paymentPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // تعريب نوع الرسوم
  const getFeeTypeLabel = (type: string) => {
    const feeTypeLabels: { [key: string]: string } = {
      'TUITION': 'رسوم دراسية',
      'SERVICES': 'رسوم خدمات',
      'TRAINING': 'رسوم تدريب',
      'ADDITIONAL': 'رسوم إضافية'
    };
    return feeTypeLabels[type] || type;
  };

  // تعريب حالة الدفع
  const getPaymentStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'PAID': 'مدفوع بالكامل',
      'PARTIALLY_PAID': 'مدفوع جزئياً',
      'PENDING': 'في انتظار الدفع',
      'CANCELLED': 'ملغي'
    };
    return statusLabels[status] || status;
  };

  // لون شارة الحالة
  const getStatusBadgeColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PAID': 'bg-green-100 text-green-800 border-green-200',
      'PARTIALLY_PAID': 'bg-blue-100 text-blue-800 border-blue-200',
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'PARTIALLY_PAID':
        return <ClockIcon className="w-4 h-4" />;
      case 'PENDING':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'CANCELLED':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">المالية والمدفوعات</h1>
          <p className="text-slate-500 text-sm sm:text-base">متابعة الرصيد المستحق وسجل المدفوعات الخاص بك</p>
        </div>
      </div>

      {/* The "Wallet" Card - Emerald Theme */}
      <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <div className="flex items-center gap-2 text-white">
              <BanknotesIcon className="w-5 h-5" />
              <span className="font-bold text-sm sm:text-base">إجمالي المبالغ المتبقية للدفع</span>
            </div>
            <div className="w-10 h-7 sm:w-12 sm:h-8 bg-white/20 rounded-md backdrop-blur-sm flex items-center justify-center border border-white/20">
              <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>

          <div className="mb-8 sm:mb-10">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              {remainingAmount.toLocaleString()} <span className="text-xl sm:text-2xl text-white font-bold">ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
            <div>
              <div className="text-white text-xs sm:text-sm mb-1 font-medium">إجمالي الرسوم</div>
              <div className="text-lg sm:text-xl font-bold text-white">{totalAmount.toLocaleString()} <span className="text-xs text-white font-bold">ج.م</span></div>
            </div>
            <div>
              <div className="text-white text-xs sm:text-sm mb-1 font-medium">المدفوع</div>
              <div className="text-lg sm:text-xl font-bold text-white">{paidAmount.toLocaleString()} <span className="text-xs text-white font-bold">ج.م</span></div>
            </div>
          </div>

          {/* Progress Bar integrated into the card */}
          <div className="mt-6 sm:mt-8">
            <div className="flex justify-between text-sm font-bold text-white mb-2">
              <span>نسبة السداد</span>
              <span>{paymentPercentage}%</span>
            </div>
            <div className="w-full bg-emerald-800/50 rounded-full h-2.5 shadow-inner">
              <div 
                className="bg-white h-full rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: `${paymentPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions / Fees List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
            تفاصيل الرسوم
          </h3>
          <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {payments.length} رسوم
          </span>
        </div>

        {payments.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {paymentsWithAvailability.map((payment) => (
              <div key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left side: Icon & Info */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                      payment.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                      payment.status === 'PARTIALLY_PAID' ? 'bg-blue-50 text-blue-600' :
                      payment.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">{payment.fee.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{getFeeTypeLabel(payment.fee.type)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md ${
                          payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          payment.status === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-700' :
                          payment.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {getPaymentStatusLabel(payment.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-14 sm:pl-0">
                    <div className="text-xs text-slate-500 hidden sm:block">المبلغ المطلوب</div>
                    <div className="text-base sm:text-lg font-black text-slate-900">
                      {(payment.amount || 0).toLocaleString()} <span className="text-[10px] sm:text-xs font-medium text-slate-500">ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Payment Schedule & Progress Details */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                  <div className="mr-0 sm:mr-16 bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
                    
                    {/* Progress Bar (Always show to clarify paid vs remaining) */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-emerald-600">مدفوع: {(payment.paidAmount || 0).toLocaleString()} ج.م</span>
                        <span className="text-rose-600">متبقي: {((payment.amount || 0) - (payment.paidAmount || 0)).toLocaleString()} ج.م</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full ${
                            payment.status === 'PAID' ? 'bg-emerald-500' :
                            payment.status === 'PARTIALLY_PAID' ? 'bg-blue-500' :
                            payment.status === 'CANCELLED' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}
                          style={{ width: `${(payment.amount || 0) > 0 ? ((payment.paidAmount || 0) / (payment.amount || 1)) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Schedule Dates (Restored) */}
                    {payment.fee?.paymentSchedule && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-500">بداية السداد:</span>
                          <span className="font-bold text-slate-700">
                            {new Date(payment.fee.paymentSchedule.paymentStartDate).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <ClockIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-500">نهاية السداد:</span>
                          <span className="font-bold text-slate-700">
                            {new Date(payment.fee.paymentSchedule.paymentEndDate).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">لا توجد رسوم مطلوبة</h3>
            <p className="text-sm text-slate-500">حسابك المالي سليم ولا توجد أي رسوم مستحقة الدفع.</p>
          </div>
        )}
      </div>

      {/* Subtle Coming Soon Banner */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 transition-all hover:bg-emerald-50">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100">
          <CreditCardIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
        </div>
        <div className="flex-1 text-center sm:text-right">
          <h4 className="text-sm font-bold text-emerald-900 mb-1">الدفع الإلكتروني قريباً</h4>
          <p className="text-xs sm:text-sm text-emerald-700/80">نعمل على توفير بوابات دفع إلكترونية (بطاقات بنكية، محافظ إلكترونية، فوري) لتسهيل عملية السداد.</p>
        </div>
      </div>
    </div>
  );
}
