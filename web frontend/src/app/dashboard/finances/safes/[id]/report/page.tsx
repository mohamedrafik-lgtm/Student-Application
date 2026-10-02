'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { usePermissions } from '@/hooks/usePermissions';

import { 
  ArrowLeftIcon, 
  PrinterIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import { Search } from 'lucide-react';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { DataTable, Column } from '@/app/components/ui/DataTable';
import { SimpleSelect } from '@/app/components/ui/Select';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import { FiArrowDownLeft, FiArrowUpRight, FiList } from 'react-icons/fi';

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

export default function SafeReportPage() {
  const router = useRouter();
  const params = useParams();
  const safeId = params?.id as string;
  const { hasPermission } = usePermissions();
  const canViewBalances = hasPermission('finances.safes.balances', 'view');
  
  const [safe, setSafe] = useState<Safe | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  // فلترة التواريخ
  const [reportType, setReportType] = useState<string>('today');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // البحث
  const [searchQuery, setSearchQuery] = useState<string>('');

  // تحميل بيانات الخزينة
  const loadSafeData = async () => {
    try {
      const response = await fetchAPI(`/finances/safes/${safeId}`);
      if (response) {
        setSafe(response);
      }
    } catch (error) {
      console.error('Error loading safe data:', error);
      toast.error('حدث خطأ في تحميل بيانات الخزينة');
    }
  };

  // تحميل المعاملات
  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      let apiUrl = `/finances/safes/${safeId}/transactions?limit=1000`;
      
      if (reportType === 'today') {
        // تاريخ اليوم
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        apiUrl += `&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}`;
      } else if (reportType === 'custom' && dateFrom && dateTo) {
        // فترة مخصصة
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        
        apiUrl += `&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`;
      }

      const response = await fetchAPI(apiUrl);
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('حدث خطأ في تحميل المعاملات');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (safeId) {
        loadSafeData();
        loadTransactions();
    }
  }, [safeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatCurrency = (amount: number, currency: string = 'جنيه') => {
    return amount.toLocaleString('ar-EG') + ' ' + currency;
  };

  // تصفية المعاملات حسب البحث
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // البحث في جميع الحقول
    return (
      transaction.id.toString().includes(query) ||
      transaction.description?.toLowerCase().includes(query) ||
      TRANSACTION_TYPE_LABELS[transaction.type]?.toLowerCase().includes(query) ||
      transaction.sourceSafe?.name?.toLowerCase().includes(query) ||
      transaction.targetSafe?.name?.toLowerCase().includes(query) ||
      transaction.amount.toString().includes(query) ||
      formatCurrency(transaction.amount).includes(query) ||
      transaction.createdBy?.name?.toLowerCase().includes(query) ||
      formatDate(transaction.createdAt).includes(query)
    );
  });

  // حساب الإحصائيات
  const totalDeposits = filteredTransactions
    .filter(t => 
      t.type === 'DEPOSIT' || 
      t.type === 'PAYMENT' || 
      (t.type === 'TRANSFER' && t.targetSafe?.id === safeId)
    )
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalWithdrawals = filteredTransactions
    .filter(t => 
      t.type === 'WITHDRAW' || 
      t.type === 'FEE' || 
      (t.type === 'TRANSFER' && t.sourceSafe?.id === safeId)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const handleGenerateReport = () => {
    loadTransactions();
  };

  const handlePrint = () => {
    let printUrl = `/print/safe-transactions/${safeId}`;
    
    if (reportType === 'today') {
      printUrl += '?reportType=today';
    } else if (reportType === 'custom' && dateFrom && dateTo) {
      printUrl += `?reportType=custom&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    }
    
    if (searchQuery) {
      printUrl += `${printUrl.includes('?') ? '&' : '?'}search=${encodeURIComponent(searchQuery)}`;
    }
    
    window.open(printUrl, '_blank');
  };

  const columns: Column<Transaction>[] = [
    {
      header: 'النوع',
      accessor: 'type',
      cell: (item) => {
        const isDeposit = item.type === 'DEPOSIT' || 
          item.type === 'PAYMENT' ||
          (item.type === 'TRANSFER' && item.targetSafe?.id === safeId);
        
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            isDeposit
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {TRANSACTION_TYPE_LABELS[item.type]}
          </span>
        );
      }
    },
    { header: 'الوصف', accessor: (item) => item.description || '-' },
    {
      header: 'من / إلى',
      accessor: 'sourceSafe',
      cell: (item) => {
        if (item.type === 'TRANSFER') {
          return (
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              {item.sourceSafe?.name && (
                <div><span className="text-slate-400">من: </span>{item.sourceSafe.name}</div>
              )}
              {item.targetSafe?.name && (
                <div><span className="text-slate-400">إلى: </span>{item.targetSafe.name}</div>
              )}
            </div>
          );
        }
        return '-';
      }
    },
    {
      header: 'المبلغ',
      accessor: 'amount',
      cell: (item) => (
        <span className="text-sm font-semibold text-slate-900">
          {formatCurrency(item.amount, safe?.currency || 'جنيه')}
        </span>
      )
    },
    { header: 'المستخدم', accessor: (item) => item.createdBy?.name || '-' },
    { 
      header: 'التاريخ', 
      accessor: 'createdAt',
      cell: (item) => <span className="text-sm text-slate-600 whitespace-nowrap">{formatDate(item.createdAt)}</span>
    }
  ];

  return (
    <ProtectedPage requiredPermission={{ resource: 'finances.safes.transactions', action: 'view' }}>
      <div className="p-6 max-w-[1400px] mx-auto min-h-screen" dir="rtl">
        <PageHeader
          title="تقرير معاملات الخزينة"
          description={safe ? `${safe.name}${canViewBalances ? ` - ${formatCurrency(safe.balance, safe.currency || 'جنيه')}` : ''}` : 'تقرير مخصص للحركات المالية على الخزينة'}
          breadcrumbs={[
            { label: 'الرئيسية', href: '/dashboard' },
            { label: 'الخزائن', href: '/dashboard/finances/safes' },
            { label: 'تقرير الخزينة' }
          ]}
          actions={
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard/finances/safes')}
                    className="flex gap-2 items-center"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    عودة للخزائن
                </Button>
                <Button
                    onClick={handlePrint}
                    disabled={filteredTransactions.length === 0}
                    className="flex gap-2 items-center"
                >
                    <PrinterIcon className="w-5 h-5" />
                    طباعة التقرير
                </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
                <Card className="h-full">
                    <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2 mb-2 text-slate-800">
                            <FunnelIcon className="w-5 h-5" />
                            <h3 className="text-lg font-semibold">تصفية التقرير</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SimpleSelect
                                label="نوع التقرير"
                                value={reportType}
                                onChange={setReportType}
                                options={[
                                    { value: 'today', label: 'معاملات اليوم' },
                                    { value: 'custom', label: 'فترة مخصصة' }
                                ]}
                            />

                            {reportType === 'custom' && (
                                <>
                                    <TibaDatePicker
                                        label="من تاريخ"
                                        value={dateFrom}
                                        onChange={setDateFrom}
                                        placeholder="اختر تاريخ البداية"
                                    />
                                    <TibaDatePicker
                                        label="إلى تاريخ"
                                        value={dateTo}
                                        onChange={setDateTo}
                                        placeholder="اختر تاريخ النهاية"
                                    />
                                </>
                            )}
                        </div>
                        <div className="mt-2 flex justify-end">
                            <Button 
                                onClick={handleGenerateReport} 
                                disabled={loading || (reportType === 'custom' && (!dateFrom || !dateTo))}
                                className="flex gap-2 items-center"
                            >
                                {loading ? (
                                    <>
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        جاري التحميل...
                                    </>
                                ) : 'إنشاء التقرير'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
                <Card className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100">
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 mb-3">
                            <FiList className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-1">العمليات المدونة</p>
                        <h4 className="text-3xl font-bold text-slate-800">{filteredTransactions.length}</h4>
                    </CardContent>
                </Card>
            </div>
        </div>

        {!loading && filteredTransactions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-2">إجمالي الإيداعات</p>
                                {canViewBalances ? (
                                    <h4 className="text-2xl font-bold text-slate-900">
                                        {formatCurrency(totalDeposits, safe?.currency || 'جنيه')}
                                    </h4>
                                ) : (
                                    <p className="text-sm text-slate-400">لا تملك صلاحية العرض</p>
                                )}
                            </div>
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                                <FiArrowDownLeft className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-2">إجمالي المسحوبات</p>
                                {canViewBalances ? (
                                    <h4 className="text-2xl font-bold text-slate-900">
                                        {formatCurrency(totalWithdrawals, safe?.currency || 'جنيه')}
                                    </h4>
                                ) : (
                                    <p className="text-sm text-slate-400">لا تملك صلاحية العرض</p>
                                )}
                            </div>
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                                <FiArrowUpRight className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-900">سجل المعاملات</h3>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="ابحث في المعاملات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <DataTable 
                    data={filteredTransactions}
                    columns={columns}
                    keyField="id"
                    isLoading={loading}
                    emptyMessage={
                        searchQuery 
                            ? "لا توجد نتائج مطابقة لبحثك" 
                            : "لا توجد معاملات في الفترة المحددة"
                    }
                    pagination={true}
                    itemsPerPage={25}
                />
            </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
