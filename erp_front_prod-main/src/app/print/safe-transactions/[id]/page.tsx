'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { Printer, Calendar, Building, Info, FileText, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

interface Safe {
  id: string;
  name: string;
  type?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  category?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  balance: number;
  description?: string;
  currency?: string;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'FEE';
  sourceId?: number;
  targetId?: number;
  sourceSafe?: Safe;
  targetSafe?: Safe;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'إيداع',
  WITHDRAW: 'سحب',
  TRANSFER: 'تحويل',
  PAYMENT: 'دفع',
  FEE: 'رسوم'
};

const SAFE_TYPE_LABELS: Record<string, string> = {
  DEBT: 'خزينة الديون',
  INCOME: 'خزينة الدخل',
  EXPENSE: 'خزينة المصروفات',
  ASSET: 'خزينة الأصول'
};

export default function PrintSafeTransactionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const safeId = params?.id as string;

  const reportType = searchParams.get('reportType');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const searchQuery = searchParams.get('search');

  const [safe, setSafe] = useState<Safe | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      let apiUrl = `/finances/safes/${safeId}/transactions?limit=1000`;

      if (reportType === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        apiUrl += `&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}`;
      } else if (reportType === 'custom' && dateFrom && dateTo) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        apiUrl += `&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`;
      }

      const [safeResponse, transactionsResponse, settingsResponse] = await Promise.all([
        fetchAPI(`/finances/safes/${safeId}`),
        fetchAPI(apiUrl),
        fetchAPI('/settings')
      ]);

      if (safeResponse) setSafe(safeResponse);

      // Handle standard and wrapped API responses for transactions
      const txData = transactionsResponse?.data || (Array.isArray(transactionsResponse) ? transactionsResponse : undefined);
      if (txData) {
        let data = txData;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          data = data.filter((transaction: Transaction) => {
            return (
              transaction.id?.toString().includes(query) ||
              transaction.description?.toLowerCase().includes(query) ||
              TRANSACTION_TYPE_LABELS[transaction.type]?.toLowerCase().includes(query) ||
              transaction.sourceSafe?.name?.toLowerCase().includes(query) ||
              transaction.targetSafe?.name?.toLowerCase().includes(query) ||
              transaction.amount?.toString().includes(query) ||
              transaction.createdBy?.name?.toLowerCase().includes(query)
            );
          });
        }

        setTransactions(data);
      }

      if (settingsResponse) setSettings(settingsResponse);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (safeId) fetchData();
  }, [safeId]);

  useEffect(() => {
    if (!isLoading && transactions.length > 0) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, transactions]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency || 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalDeposits = transactions
    .filter(t =>
      t.type === 'DEPOSIT' ||
      t.type === 'PAYMENT' ||
      (t.type === 'TRANSFER' && t.targetSafe?.id === safeId)
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawals = transactions
    .filter(t =>
      t.type === 'WITHDRAW' ||
      t.type === 'FEE' ||
      (t.type === 'TRANSFER' && t.sourceSafe?.id === safeId)
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  let reportTitle = 'تقرير معاملات الخزينة';
  if (reportType === 'today') {
    reportTitle = 'تقرير معاملات اليوم';
  } else if (reportType === 'custom' && dateFrom && dateTo) {
    const fromDate = new Date(dateFrom).toLocaleDateString('ar-EG');
    const toDate = new Date(dateTo).toLocaleDateString('ar-EG');
    reportTitle = `تقرير المعاملات من ${fromDate} إلى ${toDate}`;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تجهيز التقرير للطباعة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans print:bg-white" dir="rtl">
      {/* Print Button (Hidden in Print) */}
      <button
        onClick={handlePrint}
        className="fixed top-6 left-6 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 print:hidden group"
      >
        <Printer className="w-5 h-5 group-hover:animate-pulse" />
        <span>طباعة التقرير</span>
      </button>

      <div className="max-w-5xl mx-auto p-8 print:p-0 print:max-w-none bg-white min-h-screen shadow-lg print:shadow-none">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8 print:mb-6 print:pb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              {settings?.centerName || settings?.systemName}
            </h1>
            <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              {reportTitle}
            </h2>

            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium">تاريخ الطباعة:</span>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
              {safe && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">الخزينة:</span>
                  <span className="text-gray-900 font-bold">{safe.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">
                    {SAFE_TYPE_LABELS[safe.category || safe.type || 'ASSET']}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            {settings?.centerLogo || settings?.logoUrl ? (
              <img
                src={getImageUrl(settings.centerLogo || settings.logoUrl)}
                alt="Logo"
                className="w-24 h-24 object-contain rounded-xl shadow-sm border border-gray-100 p-2"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <Building className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-10 print:mb-8 print:gap-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-2xl border border-blue-100 print:bg-white print:border-gray-200 print:rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-2 print:text-gray-800">
              <Wallet className="w-5 h-5" />
              <p className="text-sm font-bold">الرصيد الحالي</p>
            </div>
            <p className="text-2xl font-black text-gray-900 print:text-xl">
              {safe ? formatCurrency(safe.balance, safe.currency) : '---'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-2xl border border-green-100 print:bg-white print:border-gray-200 print:rounded-lg">
            <div className="flex items-center gap-2 text-green-600 mb-2 print:text-gray-800">
              <ArrowDownLeft className="w-5 h-5" />
              <p className="text-sm font-bold">إجمالي الإيداعات</p>
            </div>
            <p className="text-2xl font-black text-gray-900 print:text-xl">
              {formatCurrency(totalDeposits, safe?.currency)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-5 rounded-2xl border border-red-100 print:bg-white print:border-gray-200 print:rounded-lg">
            <div className="flex items-center gap-2 text-red-600 mb-2 print:text-gray-800">
              <ArrowUpRight className="w-5 h-5" />
              <p className="text-sm font-bold">إجمالي المسحوبات</p>
            </div>
            <p className="text-2xl font-black text-gray-900 print:text-xl">
              {formatCurrency(totalWithdrawals, safe?.currency)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 rounded-2xl border border-gray-200 print:bg-white print:border-gray-200 print:rounded-lg">
            <div className="flex items-center gap-2 text-gray-500 mb-2 print:text-gray-800">
              <FileText className="w-5 h-5" />
              <p className="text-sm font-bold">عدد المعاملات</p>
            </div>
            <p className="text-2xl font-black text-gray-900 print:text-xl">
              {transactions.length}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 print:hidden" />
            سجل المعاملات التفصيلي
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 print:bg-white">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3 print:hidden" />
              <p className="text-gray-500 font-medium">لا توجد معاملات مسجلة في هذه الفترة</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-xl print:rounded-none">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 print:bg-gray-100">
                  <tr>
                    <th className="px-4 py-4 font-bold print:py-2">رقم</th>
                    <th className="px-4 py-4 font-bold print:py-2">النوع</th>
                    <th className="px-4 py-4 font-bold print:py-2">الوصف</th>
                    <th className="px-4 py-4 font-bold print:py-2">محولة من/إلى</th>
                    <th className="px-4 py-4 font-bold text-left print:py-2">المبلغ</th>
                    <th className="px-4 py-4 font-bold print:py-2">بواسطة</th>
                    <th className="px-4 py-4 font-bold print:py-2">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((transaction, index) => {
                    const isDeposit = transaction.type === 'DEPOSIT' ||
                      transaction.type === 'PAYMENT' ||
                      (transaction.type === 'TRANSFER' && transaction.targetSafe?.id === safeId);

                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors bg-white page-break-inside-avoid">
                        <td className="px-4 py-3 text-gray-500 font-medium print:py-2 print:text-xs">#{index + 1}</td>
                        <td className="px-4 py-3 print:py-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border print:border-none print:px-0 print:py-0 ${isDeposit
                              ? 'bg-green-50 text-green-700 border-green-200 print:bg-transparent'
                              : 'bg-red-50 text-red-700 border-red-200 print:bg-transparent'
                            }`}>
                            <span className="print:hidden">
                              {isDeposit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </span>
                            {TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium max-w-[200px] print:max-w-none print:py-2 print:text-xs">
                          {transaction.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 print:py-2 print:text-xs">
                          {transaction.type === 'TRANSFER' ? (
                            <div className="flex flex-col gap-0.5">
                              {transaction.sourceSafe?.name && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400">من:</span>
                                  <span className="font-semibold">{transaction.sourceSafe.name}</span>
                                </div>
                              )}
                              {transaction.targetSafe?.name && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400">إلى:</span>
                                  <span className="font-semibold">{transaction.targetSafe.name}</span>
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className={`px-4 py-3 font-black text-left text-base print:py-2 print:text-sm ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="text-xs ml-0.5 font-normal text-gray-400 print:hidden">{isDeposit ? '+' : '-'}</span>
                          {formatCurrency(transaction.amount, safe?.currency)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 print:py-2 print:text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase print:hidden">
                              {(transaction.createdBy?.name || '?').charAt(0)}
                            </div>
                            <span className="font-medium">{transaction.createdBy?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-medium print:py-2">
                          {formatDate(transaction.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-200 text-center print:mt-10 print:pt-4">
          <p className="text-lg font-bold text-gray-900 mb-1">
            {settings?.centerName || settings?.systemName}
          </p>
          <p className="text-sm text-gray-500 font-medium mb-3 print:mb-1">تقرير مفصل لمعاملات الخزينة</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            {settings?.website && <span>{settings.website}</span>}
            {settings?.website && <span>•</span>}
            <span>تم الإنشاء آلياً عبر النظام</span>
          </div>
        </div>
      </div>
    </div>
  );
}
