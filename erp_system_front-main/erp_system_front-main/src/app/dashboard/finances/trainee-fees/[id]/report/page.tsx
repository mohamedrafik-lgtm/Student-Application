'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Progress,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Checkbox,
} from '@/components/ui';
import { getTraineeFeeReport } from '@/app/lib/api/finances';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/app/lib/utils';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import DashboardShell from '../../../../components/DashboardShell';
import DashboardHeader from '../../../../components/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { TraineeFee, PaymentStatus } from '@/app/types/finances';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

function FeeReportPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const feeId = Number(params.id);
  const reportType = searchParams.get('type') || undefined;
  const [fee, setFee] = useState<TraineeFee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  // الحصول على عنوان التقرير بناءً على النوع
  const getReportTitle = () => {
    switch (reportType) {
      case 'paid':
        return 'المسددين للرسم';
      case 'unpaid':
        return 'الغير مسددين للرسم';
      case 'paid-all-previous':
        return 'المسددين للرسم وكل الرسوم السابقة';
      case 'unpaid-any-previous':
        return 'الغير مسددين للرسم الحالي وأي رسم سابق';
      default:
        return 'جميع المتدربين';
    }
  };

  // جلب بيانات الرسوم والمدفوعات المرتبطة بها
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const feeData = await getTraineeFeeReport(feeId, reportType);
      setFee(feeData);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب البيانات');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة أو تغيير نوع التقرير
  useEffect(() => {
    if (feeId) {
      fetchData();
    }
  }, [feeId, reportType]);

  // تحويل حالة الدفع إلى نص عربي
  const getPaymentStatusText = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'قيد الانتظار';
      case PaymentStatus.PAID:
        return 'مدفوع';
      case PaymentStatus.PARTIALLY_PAID:
        return 'مدفوع جزئياً';
      case PaymentStatus.CANCELLED:
        return 'ملغي';
      default:
        return status;
    }
  };

  // حساب إجماليات التقرير
  const calculateSummary = () => {
    if (!fee || !fee.traineePayments) {
      return {
        totalStudents: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        paidPercentage: 0,
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: 0,
          PAID: 0,
          CANCELLED: 0,
        }
      };
    }

    // لتقرير الغير مسددين: البيانات تأتي مجمّعة من الباك إند
    if (reportType === 'unpaid-any-previous') {
      const totalStudents = fee.traineePayments.length; // عدد المتدربين (بدون تكرار)
      const totalAmount = fee.traineePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalPaid = fee.traineePayments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
      const totalRemaining = fee.traineePayments.reduce((sum, payment) => sum + (payment.remainingAmount || 0), 0);
      
      return {
        totalStudents,
        totalAmount,
        totalPaid,
        totalRemaining,
        paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: totalStudents, // جميع المتدربين في هذا التقرير لديهم مديونيات
          PAID: 0,
          CANCELLED: 0,
        }
      };
    }

    // لتقرير المسددين لكل الرسوم: البيانات تأتي مجمّعة من الباك إند
    if (reportType === 'paid-all-previous') {
      const totalStudents = fee.traineePayments.length; // عدد المتدربين (بدون تكرار)
      const totalAmount = fee.traineePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalPaid = fee.traineePayments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
      const totalRemaining = 0; // لا يوجد متبقي في هذا التقرير
      
      return {
        totalStudents,
        totalAmount,
        totalPaid,
        totalRemaining,
        paidPercentage: 100, // دائماً 100% لأنهم مسددين بالكامل
        statusCounts: {
          PENDING: 0,
          PARTIALLY_PAID: 0,
          PAID: totalStudents, // جميع المتدربين في هذا التقرير مسددين بالكامل
          CANCELLED: 0,
        }
      };
    }

    // للتقارير الأخرى: حساب عادي
    const totalStudents = fee.traineePayments.length;
    const totalAmount = fee.amount * totalStudents;
    const totalPaid = fee.traineePayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // حساب عدد المتدربين حسب حالة الدفع
    const statusCounts = {
      PENDING: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CANCELLED: 0,
    };

    fee.traineePayments.forEach(payment => {
      statusCounts[payment.status]++;
    });

    return {
      totalStudents,
      totalAmount,
      totalPaid,
      totalRemaining,
      paidPercentage,
      statusCounts,
    };
  };

  // فتح Dialog للسؤال عن الطباعة
  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  // تأكيد الطباعة مع الخيارات
  const confirmPrint = () => {
    const params = new URLSearchParams();
    if (reportType) params.append('type', reportType);
    if (includeNotes) params.append('includeNotes', 'true');
    
    const printUrl = `/print/trainee-fees/${feeId}?${params.toString()}`;
    window.open(printUrl, '_blank');
    setPrintDialogOpen(false);
  };

  // العودة إلى صفحة الرسوم
  const goBack = () => {
    router.push('/dashboard/finances/trainee-fees');
  };

  const summary = calculateSummary();

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-4 no-print">
        <DashboardHeader 
          heading={`تقرير رسوم: ${fee?.name || ''} - ${getReportTitle()}`} 
          description={fee?.program?.nameAr ? `البرنامج: ${fee.program.nameAr}` : ''}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack} className="text-gray-700">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
          <Button onClick={handlePrint} className="bg-primary-600 hover:bg-primary-700 text-white">
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="space-y-4">
          {/* بطاقة معلومات الرسوم */}
          <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">معلومات الرسوم</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">اسم الرسوم</p>
                  <p className="font-medium text-gray-900">{fee?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المبلغ</p>
                  <p className="font-medium text-gray-900">{formatCurrency(fee?.amount || 0, fee?.safe?.currency || 'EGP')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">العام الدراسي</p>
                  <p className="font-medium text-gray-900">{fee?.academicYear}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">البرنامج</p>
                  <p className="font-medium text-gray-900">{fee?.program?.nameAr || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الخزينة</p>
                  <p className="font-medium text-gray-900">{fee?.safe?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تاريخ التطبيق</p>
                  <p className="font-medium text-gray-900">{fee?.appliedAt ? formatDate(fee.appliedAt) : 'غير مطبق'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* بطاقة ملخص التقرير */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">ملخص التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="summary-grid grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="summary-card border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">عدد المتدربين</p>
                    <p className="font-bold text-xl text-gray-900">{summary.totalStudents}</p>
                  </div>
                  <div className="summary-card border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">إجمالي المبالغ</p>
                    <p className="font-bold text-xl text-gray-900">{formatCurrency(summary.totalAmount, fee?.safe?.currency || 'EGP')}</p>
                  </div>
                  <div className="summary-card border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">إجمالي المدفوعات</p>
                    <p className="font-bold text-xl text-green-600">{formatCurrency(summary.totalPaid, fee?.safe?.currency || 'EGP')}</p>
                  </div>
                  <div className="summary-card border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">المبالغ المتبقية</p>
                    <p className="font-bold text-xl text-red-600">{formatCurrency(summary.totalRemaining, fee?.safe?.currency || 'EGP')}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">نسبة التحصيل</span>
                    <span className="text-sm font-medium text-gray-900">{summary.paidPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={summary.paidPercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                    <p className="text-sm text-gray-600 mb-1">قيد الانتظار</p>
                    <p className="font-bold text-lg text-yellow-600">{summary.statusCounts.PENDING}</p>
                  </div>
                  <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">مدفوع جزئياً</p>
                    <p className="font-bold text-lg text-blue-600">{summary.statusCounts.PARTIALLY_PAID}</p>
                  </div>
                  <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                    <p className="text-sm text-gray-600 mb-1">مدفوع بالكامل</p>
                    <p className="font-bold text-lg text-green-600">{summary.statusCounts.PAID}</p>
                  </div>
                  <div className="border rounded-lg p-3 bg-gray-50 border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">ملغي</p>
                    <p className="font-bold text-lg text-gray-600">{summary.statusCounts.CANCELLED}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* جدول المتدربين */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">تفاصيل المتدربين</CardTitle>
            <CardDescription className="text-gray-600">{getReportTitle()}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : !fee?.traineePayments || fee.traineePayments.length === 0 ? (
              <div className="text-center py-8 text-gray-600 border rounded-lg bg-gray-50">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>لم يتم تطبيق الرسوم على أي متدرب</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-gray-700">المتدرب</TableHead>
                      <TableHead className="text-gray-700">الرقم القومي</TableHead>
                      {reportType === 'unpaid-any-previous' && (
                        <TableHead className="text-gray-700">الرسوم الغير مسددة</TableHead>
                      )}
                      {reportType === 'paid-all-previous' && (
                        <TableHead className="text-gray-700">الرسوم المسددة</TableHead>
                      )}
                      <TableHead className="text-gray-700">إجمالي المبلغ</TableHead>
                      <TableHead className="text-gray-700">إجمالي المدفوع</TableHead>
                      <TableHead className="text-gray-700">إجمالي المتبقي</TableHead>
                      {reportType !== 'unpaid-any-previous' && reportType !== 'paid-all-previous' && (
                      <TableHead className="text-gray-700">تاريخ الدفع</TableHead>
                      )}
                      <TableHead className="text-gray-700">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fee.traineePayments.map((payment, index) => {
                      // لتقرير المسددين لكل الرسوم - عرض متدرب واحد مع جميع رسومه المدفوعة
                      if (reportType === 'paid-all-previous') {
                        const paidFees = payment.paidFees || [];
                        const totalAmount = payment.amount || 0;
                        const totalPaid = payment.paidAmount || 0;
                        
                        return (
                          <TableRow key={`${payment.id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell className="text-gray-800 font-medium align-top">
                              <div>
                                <div className="font-semibold">{payment.trainee?.nameAr}</div>
                                <div className="text-xs text-green-600 mt-1">
                                  ✅ {paidFees.length} {paidFees.length === 1 ? 'رسم' : 'رسوم'} مسددة بالكامل
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-800 align-top">{payment.trainee?.nationalId}</TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-2">
                                {paidFees.map((paidFee: any, feeIndex: number) => (
                                  <div key={feeIndex} className="border-l-2 border-green-400 pl-2">
                                    <div className="font-medium text-sm text-gray-800">{paidFee.feeName}</div>
                                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                      <div>المبلغ: {formatCurrency(paidFee.amount, fee.safe?.currency || 'EGP')}</div>
                                      <div className="text-green-600 font-semibold">✓ مدفوع بالكامل: {formatCurrency(paidFee.paidAmount, fee.safe?.currency || 'EGP')}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-800 font-semibold align-top">
                              {formatCurrency(totalAmount, fee.safe?.currency || 'EGP')}
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold align-top">
                              {formatCurrency(totalPaid, fee.safe?.currency || 'EGP')}
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="text-green-600 font-bold text-lg">
                                0.00 {fee.safe?.currency || 'EGP'}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge variant="default" className="bg-green-600 text-white">
                                ✓ مسدد بالكامل
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // لتقرير الغير مسددين - عرض متدرب واحد مع جميع رسومه
                      if (reportType === 'unpaid-any-previous') {
                        const unpaidFees = payment.unpaidFees || [];
                        const totalAmount = payment.amount || 0;
                        const totalPaid = payment.paidAmount || 0;
                        const totalRemaining = payment.remainingAmount || 0;
                        
                        return (
                          <TableRow key={`${payment.id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell className="text-gray-800 font-medium align-top">
                              <div>
                                <div className="font-semibold">{payment.trainee?.nameAr}</div>
                                <div className="text-xs text-orange-600 mt-1">
                                  {unpaidFees.length} {unpaidFees.length === 1 ? 'رسم' : 'رسوم'} غير مسددة
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-800 align-top">{payment.trainee?.nationalId}</TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-2">
                                {unpaidFees.map((unpaidFee: any, feeIndex: number) => (
                                  <div key={feeIndex} className="border-l-2 border-orange-400 pl-2">
                                    <div className="font-medium text-sm text-gray-800">{unpaidFee.feeName}</div>
                                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                      <div>المطلوب: {formatCurrency(unpaidFee.amount, fee.safe?.currency || 'EGP')}</div>
                                      <div className="text-green-600">المدفوع: {formatCurrency(unpaidFee.paidAmount, fee.safe?.currency || 'EGP')}</div>
                                      <div className="text-red-600 font-semibold">المتبقي: {formatCurrency(unpaidFee.remainingAmount, fee.safe?.currency || 'EGP')}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-800 font-semibold align-top">
                              {formatCurrency(totalAmount, fee.safe?.currency || 'EGP')}
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold align-top">
                              {formatCurrency(totalPaid, fee.safe?.currency || 'EGP')}
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="text-red-600 font-bold text-lg">
                                {formatCurrency(totalRemaining, fee.safe?.currency || 'EGP')}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                                {unpaidFees.length} رسوم معلقة
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // للتقرير العادي
                      const paymentAmount = fee.amount;
                      const remainingAmount = paymentAmount - payment.paidAmount;
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <TableCell className="text-gray-800 font-medium">
                            {payment.trainee?.nameAr}
                          </TableCell>
                          <TableCell className="text-gray-800">{payment.trainee?.nationalId}</TableCell>
                          <TableCell className="text-gray-800">{formatCurrency(paymentAmount, fee.safe?.currency || 'EGP')}</TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(payment.paidAmount, fee.safe?.currency || 'EGP')}
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            {formatCurrency(remainingAmount, fee.safe?.currency || 'EGP')}
                          </TableCell>
                          <TableCell className="text-gray-800">
                            {payment.paidAt ? formatDate(payment.paidAt) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              payment.status === PaymentStatus.PAID ? "default" :
                              payment.status === PaymentStatus.PARTIALLY_PAID ? "secondary" : "outline"
                            }>
                              {getPaymentStatusText(payment.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog تأكيد الطباعة */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="bg-white sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-gray-900 font-bold text-xl">خيارات الطباعة</DialogTitle>
              <DialogDescription className="text-gray-600">
                اختر الإعدادات المناسبة قبل الطباعة
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              <div className="flex items-start space-x-3 space-x-reverse">
                <Checkbox
                  id="includeNotes"
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="includeNotes"
                    className="text-sm font-semibold text-gray-900 leading-none cursor-pointer"
                  >
                    طباعة مع ملاحظات المتدربين
                  </label>
                  <p className="text-sm text-gray-600">
                    سيتم إضافة عمود يحتوي على جميع ملاحظات كل متدرب في التقرير المطبوع
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPrintDialogOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </Button>
              <Button
                onClick={confirmPrint}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="ml-2 h-4 w-4" />
                طباعة الآن
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardShell>
  );
}

export default function FeeReportPage() {
  return (
    <FinancialPageGuard>
      <FeeReportPageContent />
    </FinancialPageGuard>
  );
} 