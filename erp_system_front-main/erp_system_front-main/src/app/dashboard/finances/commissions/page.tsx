'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import PayoutModal from '@/app/components/ui/PayoutModal';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';
import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Commission {
  id: number;
  marketingEmployeeId: number;
  traineeId: number;
  type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
  amount: number;
  status: 'PENDING' | 'PAID';
  description?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  paidBy?: string;
  marketingEmployee: {
    id: number;
    name: string;
    phone: string;
  };
  trainee: {
    id: number;
    nameAr: string;
    program: {
      id: number;
      nameAr: string;
    };
  } | null;
  payouts: Array<{
    id: number;
    amount: number;
    description: string;
    createdAt: string;
    fromSafe: {
      id: string;
      name: string;
      currency: string;
    };
    toSafe: {
      id: string;
      name: string;
      currency: string;
    };
  }>;
}

interface CommissionStats {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

interface MarketingEmployeeStats {
  id: number;
  name: string;
  phone: string;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });
  const [marketingEmployeesStats, setMarketingEmployeesStats] = useState<MarketingEmployeeStats[]>([]);
  const [marketingEmployees, setMarketingEmployees] = useState<Array<{id: number; name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [employeesPagination, setEmployeesPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // حالات مربع الصرف
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCommissionForPayout, setSelectedCommissionForPayout] = useState<Commission | null>(null);

  // جلب البيانات
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب جميع العمولات عبر عدة طلبات
      const allCommissions = [];
      let page = 1;
      let hasMore = true;
      const limit = 100; // الحد الأقصى المسموح

      while (hasMore) {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('page', page.toString());

        if (selectedEmployee) params.append('marketingEmployeeId', selectedEmployee.toString());
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedType) params.append('type', selectedType);
        if (searchTerm && searchTerm.trim()) params.append('searchTerm', searchTerm.trim());

        const commissionsRes = await fetchAPI(`/commissions?${params}`);
        
        if (commissionsRes.data && Array.isArray(commissionsRes.data)) {
          allCommissions.push(...commissionsRes.data);
          
          // إذا كان عدد العمولات أقل من الحد الأقصى، فهذه آخر صفحة
          if (commissionsRes.data.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      // جلب باقي البيانات
      const [statsRes, employeesStatsRes, employeesRes] = await Promise.all([
        fetchAPI('/commissions/stats'),
        fetchAPI('/commissions/marketing-employees-stats'),
        fetchAPI('/marketing/employees'),
      ]);

      // معالجة بيانات العمولات
      const processedCommissions = allCommissions.map((commission: any, index: number) => ({
        ...commission,
        id: commission.id || `commission-${index}`,
      }));
      
      setCommissions(processedCommissions);

      // معالجة الإحصائيات
      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      } else if (statsRes && typeof statsRes === 'object') {
        // إذا كانت البيانات في الجذر مباشرة
        setStats(statsRes);
      } else {
        setStats({
          totalCommissions: 0,
          pendingCommissions: 0,
          paidCommissions: 0,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
        });
      }

      // معالجة إحصائيات الموظفين
      if (employeesStatsRes && employeesStatsRes.data) {
        setMarketingEmployeesStats(employeesStatsRes.data);
      } else if (employeesStatsRes && Array.isArray(employeesStatsRes)) {
        // إذا كانت البيانات في الجذر مباشرة كمصفوفة
        setMarketingEmployeesStats(employeesStatsRes);
      } else {
        setMarketingEmployeesStats([]);
      }

      
      if (employeesRes.success || employeesRes.data || Array.isArray(employeesRes)) {
        const employeesData = employeesRes.data || employeesRes;
        
        if (Array.isArray(employeesData)) {
          setMarketingEmployees(employeesData.map((emp: any) => ({
            id: emp.id,
            name: emp.name,
          })));
        } else {
          setMarketingEmployees([]);
        }
      } else {
        setMarketingEmployees([]);
      }
    } catch (error: any) {
      console.error('❌ خطأ في جلب البيانات:', error);
      setError(error.message || 'حدث خطأ أثناء جلب البيانات');
      
      // تعيين قيم افتراضية في حالة الخطأ
      setStats({
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
      });
      setMarketingEmployeesStats([]);
      setCommissions([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEmployee, selectedStatus, selectedType]);

  // تحديث pagination الموظفين عند تغيير البيانات
  useEffect(() => {
    setEmployeesPagination(prev => ({
      ...prev,
      total: marketingEmployeesStats.length,
      totalPages: Math.ceil(marketingEmployeesStats.length / prev.limit),
      hasNext: prev.page < Math.ceil(marketingEmployeesStats.length / prev.limit),
      hasPrev: prev.page > 1,
    }));
  }, [marketingEmployeesStats]);

  // تحديث pagination العمولات عند تغيير البيانات
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: commissions.length,
      totalPages: Math.ceil(commissions.length / prev.limit),
      hasNext: prev.page < Math.ceil(commissions.length / prev.limit),
      hasPrev: prev.page > 1,
    }));
  }, [commissions]);

  // البحث
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedEmployee(null);
    setSelectedStatus(null);
    setSelectedType(null);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData();
  };

  // تغيير الصفحة
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // تغيير عدد العناصر
  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  // تغيير صفحة الموظفين
  const handleEmployeesPageChange = (page: number) => {
    setEmployeesPagination(prev => ({ ...prev, page }));
  };

  // تغيير عدد عناصر الموظفين
  const handleEmployeesLimitChange = (limit: number) => {
    setEmployeesPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
      }).format(0);
    }
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // حساب الموظفين المعروضين في الصفحة الحالية
  const getCurrentPageEmployees = () => {
    const startIndex = (employeesPagination.page - 1) * employeesPagination.limit;
    const endIndex = startIndex + employeesPagination.limit;
    return marketingEmployeesStats.slice(startIndex, endIndex);
  };

  // حساب العمولات المعروضة في الصفحة الحالية
  const getCurrentPageCommissions = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return commissions.slice(startIndex, endIndex);
  };

  // دالة صرف العمولة
  const handleCreatePayout = async (payoutData: {
    amount: number;
    fromSafeId: string;
    toSafeId: string;
    description: string;
  }) => {
    if (!selectedCommissionForPayout) return;

    try {
      const response = await fetchAPI(`/commissions/${selectedCommissionForPayout.id}/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutData),
      });

      // إذا كان هناك بيانات payout و commission، فالعملية نجحت
      if (response.payout && response.commission) {
        toast.success('تم صرف العمولة بنجاح');
        setShowPayoutModal(false);
        setSelectedCommissionForPayout(null);
        await fetchData(); // إعادة تحميل البيانات
        console.log('🔍 Data refreshed after payout');
      } else if (response.success) {
        toast.success('تم صرف العمولة بنجاح');
        setShowPayoutModal(false);
        setSelectedCommissionForPayout(null);
        await fetchData(); // إعادة تحميل البيانات
        console.log('🔍 Data refreshed after payout');
      } else {
        console.error('Payout failed:', response);
        toast.error(response.message || 'حدث خطأ أثناء صرف العمولة');
      }
    } catch (error: any) {
      console.error('Error creating payout:', error);
      toast.error(error.message || 'حدث خطأ أثناء صرف العمولة');
    }
  };

  // دالة فتح مربع الصرف
  const handleOpenPayoutModal = (commission: Commission) => {
    setSelectedCommissionForPayout(commission);
    setShowPayoutModal(true);
  };

  // أعمدة الجدول
  const columns = [
    {
      header: 'رقم العمولة',
      accessor: (commission: Commission) => (
        <span className="font-medium text-blue-600">#{commission.id}</span>
      ),
    },
    {
      header: 'موظف التسويق',
      accessor: (commission: Commission) => (
        <div>
          <div className="font-medium">{commission.marketingEmployee.name}</div>
          <div className="text-sm text-gray-500">{commission.marketingEmployee.phone}</div>
        </div>
      ),
    },
    {
      header: 'المتدرب',
      accessor: (commission: Commission) => (
        <div>
          <div className="font-medium">{commission.trainee?.nameAr || 'متدرب محذوف'}</div>
          <div className="text-sm text-gray-500">{commission.trainee?.program?.nameAr || '-'}</div>
        </div>
      ),
    },
    {
      header: 'نوع العمولة',
      accessor: (commission: Commission) => (
        <Badge variant={commission.type === 'FIRST_CONTACT' ? 'default' : 'secondary'}>
          {commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}
        </Badge>
      ),
    },
    {
      header: 'القيمة',
      accessor: (commission: Commission) => (
        <span className="font-medium text-green-600">
          {formatAmount(commission.amount)}
        </span>
      ),
    },
    {
      header: 'الحالة',
      accessor: (commission: Commission) => (
        <Badge variant={commission.status === 'PAID' ? 'success' : 'warning'}>
          {commission.status === 'PAID' ? 'تم الصرف' : 'لم يتم الصرف'}
        </Badge>
      ),
    },
    {
      header: 'تاريخ الإنشاء',
      accessor: (commission: Commission) => (
        <span className="text-sm text-gray-600">
          {formatDate(commission.createdAt)}
        </span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: (commission: Commission) => (
        <div className="flex gap-2">
          {commission.status === 'PENDING' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleOpenPayoutModal(commission)}
              className="flex items-center gap-1"
            >
              <BanknotesIcon className="h-4 w-4" />
              صرف
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading && commissions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <FinancialPageGuard>
      <div>
        <PageHeader
          title="إدارة العمولات"
          description="عرض وإدارة عمولات موظفي التسويق"
        />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      {/* إحصائيات العمولات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي العمولات</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCommissions || 0}</p>
              <p className="text-sm text-blue-600">{formatAmount(stats?.totalAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">لم يتم الصرف</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingCommissions || 0}</p>
              <p className="text-sm text-yellow-600">{formatAmount(stats?.pendingAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">تم الصرف</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.paidCommissions || 0}</p>
              <p className="text-sm text-green-600">{formatAmount(stats?.paidAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-200 p-3 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-yellow-700 font-medium">إجمالي المتبقي</p>
              <p className="text-2xl font-bold text-yellow-800">{formatAmount(stats?.pendingAmount)}</p>
              <p className="text-xs text-yellow-600">مطلوب صرفه</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="bg-green-200 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">إجمالي المصروف</p>
              <p className="text-2xl font-bold text-green-800">{formatAmount(stats?.paidAmount)}</p>
              <p className="text-xs text-green-600">تم صرفه</p>
            </div>
          </div>
        </Card>
      </div>

      {/* جدول العمولات والصرف */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BanknotesIcon className="h-5 w-5 text-blue-600" />
              صرف العمولات
            </h3>
            <div className="text-sm text-gray-500">
              إجمالي: {pagination.total} عمولة
            </div>
          </div>

          {/* فلاتر البحث داخل قسم الصرف */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البحث
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="ابحث بالاسم أو الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">البحث بـ اسم المتدرب أو اسم المسوق</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  موظف التسويق
                </label>
                <SearchableSelect
                  options={marketingEmployees.map(emp => ({ value: emp.id, label: emp.name }))}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder="اختر الموظف"
                  clearable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحالة
                </label>
                <SimpleSelect
                  options={[
                    { value: 'PENDING', label: 'لم يتم الصرف' },
                    { value: 'PAID', label: 'تم الصرف' },
                  ]}
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  placeholder="اختر الحالة"
                  clearable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع العمولة
                </label>
                <SimpleSelect
                  options={[
                    { value: 'FIRST_CONTACT', label: 'تواصل أول' },
                    { value: 'SECOND_CONTACT', label: 'تواصل ثاني' },
                  ]}
                  value={selectedType}
                  onChange={setSelectedType}
                  placeholder="اختر النوع"
                  clearable
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-4 w-4" />
                بحث
              </Button>
              <Button variant="outline" onClick={handleClearSearch} className="flex items-center gap-2">
                <XMarkIcon className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            </div>
          </div>
          <DataTable
            data={getCurrentPageCommissions()}
            columns={columns}
            keyField="id"
            isLoading={loading}
            emptyMessage="لا توجد عمولات"
          />
          
          {/* Pagination للعمولات */}
          <div className="mt-6">
            <div className="mb-3 text-sm text-gray-600 flex items-center justify-between">
              <span>عرض {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} عمولة</span>
            </div>
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        </div>
      </Card>


      {/* إحصائيات الموظفين */}
      <Card className="mb-6 mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
              إحصائيات الموظفين
            </h3>
            <div className="text-sm text-gray-500">
              إجمالي الموظفين: {marketingEmployeesStats.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الموظف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي العمولات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    لم يتم الصرف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تم الصرف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي المتبقي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي المصروف
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageEmployees().length > 0 ? (
                  getCurrentPageEmployees().map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.totalCommissions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {employee.pendingCommissions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {employee.paidCommissions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(employee.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          {formatAmount(employee.pendingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4" />
                          {formatAmount(employee.paidAmount)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <UserGroupIcon className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-500">لا توجد إحصائيات موظفين متاحة</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination للموظفين */}
          {employeesPagination.totalPages > 1 && (
            <div className="mt-6">
              <div className="mb-3 text-sm text-gray-600 flex items-center justify-between">
                <span>عرض {((employeesPagination.page - 1) * employeesPagination.limit) + 1} - {Math.min(employeesPagination.page * employeesPagination.limit, employeesPagination.total)} من {employeesPagination.total} موظف</span>
              </div>
              <Pagination
                pagination={employeesPagination}
                onPageChange={handleEmployeesPageChange}
                onLimitChange={handleEmployeesLimitChange}
              />
            </div>
          )}
        </div>
      </Card>

      {/* مربع صرف العمولة */}
      {showPayoutModal && selectedCommissionForPayout && (
        <PayoutModal
          isOpen={showPayoutModal}
          onClose={() => {
            setShowPayoutModal(false);
            setSelectedCommissionForPayout(null);
          }}
          onSubmit={handleCreatePayout}
          commission={selectedCommissionForPayout}
        />
      )}
      </div>
    </FinancialPageGuard>
  );
}
