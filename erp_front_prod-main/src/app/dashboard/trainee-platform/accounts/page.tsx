'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  LockClosedIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  UserIcon,
  PrinterIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import PageGuard from '@/components/permissions/PageGuard';
import CreateAccountsModal from './components/CreateAccountsModal';
import DeleteAccountModal from './components/DeleteAccountModal';

interface TraineeAccount {
  id: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  plainPassword?: string | null;
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    phone: string;
    email: string | null;
    photoUrl: string | null;
    createdAt: string;
    program: {
      id: number;
      nameAr: string;
    };
  };
}

interface Program {
  id: number;
  nameAr: string;
}

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function TraineeAccountsPageContent() {
  const [accounts, setAccounts] = useState<TraineeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [accountStats, setAccountStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    loggedInToday: number;
  }>({ total: 0, active: 0, inactive: 0, loggedInToday: 0 });
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [isConfirmSendDialogOpen, setIsConfirmSendDialogOpen] = useState(false);
  const [pendingSendAccountId, setPendingSendAccountId] = useState<string | null>(null);
  const [pendingSendAccountName, setPendingSendAccountName] = useState<string>('');
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState<string | null>(null);
  const [pendingDeleteAccountName, setPendingDeleteAccountName] = useState<string>('');

  const { userPermissions } = usePermissions();
  const canCreateAccounts = userPermissions?.hasPermission(
    'dashboard.trainee-platform.accounts',
    'create',
  ) ?? false;
  const canActivateAccounts = userPermissions?.hasPermission(
    'dashboard.trainee-platform.accounts',
    'activate',
  ) ?? false;
  const canResetAccountsPassword = userPermissions?.hasPermission(
    'dashboard.trainee-platform.accounts',
    'reset-password',
  ) ?? false;
  const canSendCredentials = userPermissions?.hasPermission(
    'dashboard.trainee-platform.accounts',
    'view',
  ) ?? false;
  const canDeleteAccounts = userPermissions?.hasPermission(
    'dashboard.trainee-platform.accounts',
    'delete',
  ) ?? false;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  const normalizeSearchText = (value: string) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const normalizedDigits = value
      .split('')
      .map((char) => {
        const idx = arabicDigits.indexOf(char);
        return idx >= 0 ? String(idx) : char;
      })
      .join('');

    return normalizedDigits.replace(/\s+/g, ' ').trim();
  };

  const fetchTraineeAccounts = async (page: number, search: string, programId?: string) => {
    setLoading(true);
    try {
      const normalizedSearch = normalizeSearchText(search);
      const params: any = { page, limit: 10 };
      if (normalizedSearch) params.search = normalizedSearch;
      if (programId && programId !== 'ALL') params.programId = programId;
      
      const response = await fetchAPI(`/trainee-platform/accounts?${new URLSearchParams(params).toString()}`);
      
      // دعم كلا الهيكلين للاستجابة مع حماية ضد الاستجابات الفارغة
      const accountsData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      const totalCount = response?.meta?.total ?? response?.total ?? 0;
      const responseLimit = response?.meta?.limit ?? response?.limit ?? 10;
      
      setAccounts(accountsData);
      setTotalPages(Math.ceil(totalCount / responseLimit));
      setTotalAccounts(totalCount);
      
    } catch (error: any) {
      console.error('❌ Error fetching trainee accounts:', error);
      toast.error(error.message || 'فشل جلب حسابات المتدربين');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetchAPI('/programs');
      setPrograms(response.data || response || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]);
    }
  };

  const fetchAccountStats = async (programId?: string) => {
    try {
      const params = programId && programId !== 'ALL' ? `?programId=${programId}` : '';
      const response = await fetchAPI(`/trainee-platform/accounts/stats${params}`);
      setAccountStats({
        total: response.total || 0,
        active: response.active || 0,
        inactive: response.inactive || 0,
        loggedInToday: response.loggedInToday || 0,
      });
    } catch (error) {
      console.error('Error fetching account stats:', error);
    }
  };

  useEffect(() => {
    fetchTraineeAccounts(currentPage, searchQuery, selectedProgram);
  }, [currentPage, searchQuery, selectedProgram]);

  useEffect(() => {
    fetchAccountStats(selectedProgram);
  }, [selectedProgram]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearch = () => {
    const normalizedSearch = normalizeSearchText(searchInput);
    setSearchInput(normalizedSearch);
    setSearchQuery(normalizedSearch);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleProgramChange = (value: string) => {
    setSelectedProgram(value);
    setCurrentPage(1);
  };

  const handleToggleStatus = async (accountId: string, currentStatus: boolean, traineeName: string) => {
    try {
      await fetchAPI(`/trainee-platform/accounts/${accountId}/toggle-status`, {
        method: 'PATCH',
      });
      toast.success(`تم ${currentStatus ? 'تعطيل' : 'تفعيل'} حساب ${traineeName} بنجاح`);
      fetchTraineeAccounts(currentPage, searchQuery, selectedProgram);
    } catch (error: any) {
      toast.error(error.message || 'فشل تغيير حالة الحساب');
    }
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (!selectedAccountId) return;

    try {
      await fetchAPI(`/trainee-platform/accounts/${selectedAccountId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      toast.success(`تم إعادة تعيين كلمة مرور ${selectedAccountName} بنجاح`);
      setIsResetPasswordDialogOpen(false);
      setSelectedAccountId(null);
      setSelectedAccountName('');
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'فشل إعادة تعيين كلمة المرور');
    }
  };

  const openResetPasswordDialog = (accountId: string, traineeName: string) => {
    setSelectedAccountId(accountId);
    setSelectedAccountName(traineeName);
    setIsResetPasswordDialogOpen(true);
  };

  const handlePrintReport = (type: 'all' | 'registered' | 'unregistered') => {
    window.open(`/print/trainee-platform-report?type=${type}`, '_blank');
  };

  const handleSendCredentials = (accountId: string, traineeName: string) => {
    setPendingSendAccountId(accountId);
    setPendingSendAccountName(traineeName);
    setIsConfirmSendDialogOpen(true);
  };

  const handleDeleteAccount = (accountId: string, traineeName: string) => {
    setPendingDeleteAccountId(accountId);
    setPendingDeleteAccountName(traineeName);
    setIsDeleteModalOpen(true);
  };

  const refreshAfterDelete = async () => {
    // إذا كنا في آخر صفحة وكان الحذف أزال كل عناصرها، ارجع صفحة للخلف
    if (accounts.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else {
      await fetchTraineeAccounts(currentPage, searchQuery, selectedProgram);
    }
    fetchAccountStats();
  };

  const confirmSendCredentials = async () => {
    if (!pendingSendAccountId) return;

    try {
      setIsSendingCredentials(true);
      const response = await fetchAPI(`/trainee-platform/accounts/${pendingSendAccountId}/send-credentials`, {
        method: 'POST',
      });
      
      if (response.success) {
        toast.success(response.message || 'تم إرسال البيانات بنجاح');
        setIsConfirmSendDialogOpen(false);
        setPendingSendAccountId(null);
        setPendingSendAccountName('');
      } else {
        toast.error(response.message || 'فشل إرسال البيانات');
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إرسال البيانات');
    } finally {
      setIsSendingCredentials(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      key: 'trainee',
      title: 'المتدرب',
      render: (account: TraineeAccount) => (
        <div className="flex items-center space-x-3 space-x-reverse">
          {account.trainee.photoUrl ? (
            <img
              src={account.trainee.photoUrl}
              alt={account.trainee.nameAr}
              className="w-10 h-10 rounded-full object-cover border-2 border-tiba-primary-200"
            />
          ) : (
            <div className="w-10 h-10 bg-tiba-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-tiba-primary-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-tiba-gray-800">{account.trainee.nameAr}</div>
            <div className="text-sm text-tiba-gray-500">{account.trainee.nationalId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'program',
      title: 'البرنامج',
      render: (account: TraineeAccount) => (
        <span className="text-tiba-gray-700">{account.trainee.program.nameAr}</span>
      ),
    },
    {
      key: 'contact',
      title: 'معلومات الاتصال',
      render: (account: TraineeAccount) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 space-x-reverse text-sm">
            <PhoneIcon className="w-4 h-4 text-tiba-gray-400" />
            <span className="text-tiba-gray-600">{account.trainee.phone}</span>
          </div>
          {account.trainee.email && (
            <div className="flex items-center space-x-2 space-x-reverse text-sm">
              <EnvelopeIcon className="w-4 h-4 text-tiba-gray-400" />
              <span className="text-tiba-gray-600">{account.trainee.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      title: 'التواريخ',
      render: (account: TraineeAccount) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 space-x-reverse text-sm">
            <CalendarIcon className="w-4 h-4 text-tiba-gray-400" />
            <span className="text-tiba-gray-600">التسجيل: {formatDate(account.createdAt)}</span>
          </div>
          <div className="text-sm text-tiba-gray-500">
            آخر دخول: {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'لم يسجل دخول بعد'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'الحالة',
      render: (account: TraineeAccount) => (
        <div className="flex items-center space-x-2 space-x-reverse">
          {account.isActive ? (
            <>
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full text-sm font-medium">
                مفعل
              </span>
            </>
          ) : (
            <>
              <XCircleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-700 bg-red-50 px-2 py-1 rounded-full text-sm font-medium">
                معطل
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      render: (account: TraineeAccount) => (
        <div className="flex items-center gap-1.5">
          {canActivateAccounts && (
          <button
            type="button"
            onClick={() => handleToggleStatus(account.id, account.isActive, account.trainee.nameAr)}
            title={account.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
            aria-label={account.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
            className={`w-9 h-9 inline-flex items-center justify-center rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
              account.isActive
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300'
                : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-300'
            }`}
          >
            {account.isActive ? (
              <XCircleIcon className="w-5 h-5" />
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
          </button>
          )}
          {canResetAccountsPassword && (
          <button
            type="button"
            onClick={() => openResetPasswordDialog(account.id, account.trainee.nameAr)}
            title="إعادة تعيين كلمة المرور"
            aria-label="إعادة تعيين كلمة المرور"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 transition-all duration-150 hover:bg-orange-100 hover:border-orange-300 hover:scale-105 active:scale-95"
          >
            <LockClosedIcon className="w-5 h-5" />
          </button>
          )}
          {canSendCredentials && (
          <button
            type="button"
            onClick={() => handleSendCredentials(account.id, account.trainee.nameAr)}
            disabled={!account.isActive}
            title={!account.isActive ? 'يجب تفعيل الحساب أولاً' : 'إرسال بيانات المنصة عبر الواتساب'}
            aria-label="إرسال بيانات المنصة عبر الواتساب"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition-all duration-150 hover:bg-blue-100 hover:border-blue-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
          )}
          {canDeleteAccounts && (
          <button
            type="button"
            onClick={() => handleDeleteAccount(account.id, account.trainee.nameAr)}
            title="حذف الحساب نهائياً"
            aria-label="حذف الحساب نهائياً"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-all duration-150 hover:bg-red-100 hover:border-red-300 hover:scale-105 active:scale-95"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiba-primary-600"></div>
        <span className="mr-2 text-tiba-gray-600">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة حسابات المتدربين"
        description="عرض وإدارة حسابات تسجيل الدخول للمتدربين على المنصة الإلكترونية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'منصة المتدربين' },
          { label: 'إدارة الحسابات' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreateAccounts && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              className="bg-gradient-to-r from-tiba-primary-600 to-tiba-primary-700 hover:from-tiba-primary-700 hover:to-tiba-primary-800 shadow-md"
              disabled={false}
              title={undefined}
            >
              <UserPlusIcon className="w-5 h-5 ml-2" />
              إنشاء حسابات
            </Button>
            )}
            <Button
              onClick={() => handlePrintReport('all')}
              variant="outline"
              className="border-tiba-primary-300 text-tiba-primary-700 hover:bg-tiba-primary-50"
            >
              <PrinterIcon className="w-5 h-5 ml-2" />
              طباعة الكل
            </Button>
            <Button
              onClick={() => handlePrintReport('registered')}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <PrinterIcon className="w-5 h-5 ml-2" />
              المسجلين
            </Button>
            <Button
              onClick={() => handlePrintReport('unregistered')}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <PrinterIcon className="w-5 h-5 ml-2" />
              غير المسجلين
            </Button>
          </div>
        }
      />

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="primary">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-tiba-primary-700">إجمالي الحسابات</p>
                <p className="text-2xl font-bold text-tiba-primary-800">{totalAccounts}</p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-tiba-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="secondary">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-tiba-secondary-700">حسابات مفعلة</p>
                <p className="text-2xl font-bold text-tiba-secondary-800">
                  {accountStats.active}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-tiba-secondary-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="warning">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-tiba-warning-700">حسابات معطلة</p>
                <p className="text-2xl font-bold text-tiba-warning-800">
                  {accountStats.inactive}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-tiba-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-tiba-gray-600">آخر دخول اليوم</p>
                <p className="text-2xl font-bold text-tiba-gray-800">
                  {accountStats.loggedInToday}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-tiba-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>حسابات المتدربين</CardTitle>
          <CardDescription>
            قائمة بجميع حسابات المتدربين المسجلين على المنصة مع إمكانية إدارتها
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* أدوات البحث والتصفية */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tiba-gray-400" />
                <Input
                  placeholder="بحث بالاسم، الرقم القومي، الهاتف، البريد الإلكتروني..."
                  value={searchInput}
                  onChange={handleSearchInput}
                  onKeyDown={handleSearchKeyDown}
                  className="pr-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                variant="primary"
                className="px-4 whitespace-nowrap"
                disabled={loading}
              >
                <MagnifyingGlassIcon className="w-4 h-4 ml-1" />
                بحث
              </Button>
              {searchQuery && (
                <Button
                  onClick={handleClearSearch}
                  variant="outline"
                  className="px-4 whitespace-nowrap"
                  disabled={loading}
                >
                  <XCircleIcon className="w-4 h-4 ml-1" />
                  مسح
                </Button>
              )}
            </div>
            <SearchableSelect
              value={selectedProgram}
              onChange={handleProgramChange}
              placeholder="جميع البرامج"
              className="w-full md:w-[200px]"
              options={[
                { value: 'ALL', label: 'جميع البرامج' },
                ...programs.map(program => ({
                  value: String(program.id),
                  label: program.nameAr,
                }))
              ]}
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiba-primary-600"></div>
              <span className="mr-2 text-tiba-gray-600">جاري التحميل...</span>
            </div>
          ) : accounts.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full bg-white border border-tiba-gray-300 rounded-lg shadow-sm">
                <thead className="bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={`px-4 py-3 text-right text-sm font-semibold text-tiba-primary-800 border-b border-tiba-primary-200 whitespace-nowrap ${column.key === 'actions' ? 'w-[190px]' : ''}`}>
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-tiba-gray-200">
                  {accounts.map((account, index) => (
                    <tr key={account.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-tiba-gray-25'} hover:bg-tiba-primary-25 transition-colors duration-150`}>
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-2.5 text-sm border-b border-tiba-gray-100">
                          {column.render(account)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="bg-white border border-tiba-gray-300 rounded-lg p-4 space-y-3">
                    {/* Trainee Info */}
                    <div className="flex items-center gap-3">
                      {account.trainee.photoUrl ? (
                        <img
                          src={account.trainee.photoUrl}
                          alt={account.trainee.nameAr}
                          className="w-14 h-14 rounded-full object-cover border-2 border-tiba-primary-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-tiba-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-7 h-7 text-tiba-primary-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-tiba-gray-800 truncate">{account.trainee.nameAr}</p>
                        <p className="text-sm text-tiba-gray-500 truncate">{account.trainee.nationalId}</p>
                        <p className="text-xs text-tiba-gray-500 truncate">{account.trainee.program.nameAr}</p>
                      </div>
                      {account.isActive ? (
                        <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          ✓ مفعل
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          ✕ معطل
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="bg-tiba-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <PhoneIcon className="w-4 h-4 text-tiba-gray-400 flex-shrink-0" />
                        <span className="text-tiba-gray-600">{account.trainee.phone}</span>
                      </div>
                      {account.trainee.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <EnvelopeIcon className="w-4 h-4 text-tiba-gray-400 flex-shrink-0" />
                          <span className="text-tiba-gray-600 truncate">{account.trainee.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-tiba-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>التسجيل: {formatDate(account.createdAt)}</span>
                      </div>
                      <div>
                        آخر دخول: {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'لم يسجل دخول بعد'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      <div className="flex gap-2">
                        {canActivateAccounts && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(account.id, account.isActive, account.trainee.nameAr)}
                          className={`flex-1 text-xs ${account.isActive
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {account.isActive ? (
                            <>
                              <XCircleIcon className="w-4 h-4 ml-1" />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4 ml-1" />
                              تفعيل
                            </>
                          )}
                        </Button>
                        )}
                        {canResetAccountsPassword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetPasswordDialog(account.id, account.trainee.nameAr)}
                          className="flex-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <LockClosedIcon className="w-4 h-4 ml-1" />
                          إعادة تعيين
                        </Button>
                        )}
                      </div>
                      {canSendCredentials && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendCredentials(account.id, account.trainee.nameAr)}
                        disabled={!account.isActive}
                        className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <PaperAirplaneIcon className="w-4 h-4 ml-1" />
                        إرسال البيانات
                      </Button>
                      )}
                      {canDeleteAccounts && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id, account.trainee.nameAr)}
                        className="w-full text-xs border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 ml-1" />
                        حذف الحساب نهائياً
                      </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-3 space-x-reverse mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-tiba-gray-300 rounded-lg text-tiba-gray-700 hover:bg-tiba-primary-50 hover:border-tiba-primary-300 hover:text-tiba-primary-700 disabled:bg-tiba-gray-100 disabled:text-tiba-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    السابق
                  </button>
                  
                  <div className="px-4 py-2 bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg">
                    <span className="text-sm font-medium text-tiba-primary-800">
                      صفحة {currentPage} من {totalPages}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-tiba-gray-300 rounded-lg text-tiba-gray-700 hover:bg-tiba-primary-50 hover:border-tiba-primary-300 hover:text-tiba-primary-700 disabled:bg-tiba-gray-100 disabled:text-tiba-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="bg-tiba-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-8 h-8 text-tiba-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد حسابات متدربين</h3>
              <p className="text-tiba-gray-500">لم يتم العثور على أي حسابات متدربين تطابق المعايير المحددة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal إعادة تعيين كلمة المرور */}
      {isResetPasswordDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-tiba-primary-500 to-tiba-primary-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  إعادة تعيين كلمة المرور
                </h3>
                <button
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                  className="text-white hover:text-tiba-primary-100 transition-colors"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg p-4">
                  <p className="text-sm text-tiba-primary-800">
                    إعادة تعيين كلمة مرور جديدة للمتدرب: <strong className="font-semibold">{selectedAccountName}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                    كلمة المرور الجديدة
                  </label>
                  <Input
                    type="password"
                    {...form.register('newPassword')}
                    placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                    className="w-full border-tiba-gray-300 focus:border-tiba-primary-500 focus:ring-tiba-primary-500"
                  />
                  {form.formState.errors.newPassword && (
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 ml-1" />
                      {form.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-tiba-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResetPasswordDialogOpen(false)}
                    className="px-4 py-2"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={form.formState.isSubmitting}
                    className="px-4 py-2"
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        جاري الحفظ...
                      </div>
                    ) : (
                      'إعادة تعيين'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد إرسال بيانات المنصة */}
      {isConfirmSendDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            {/* الهيدر */}
            <div className="flex items-center space-x-3 space-x-reverse mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <PaperAirplaneIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-tiba-gray-900">إرسال بيانات المنصة</h3>
                <p className="text-sm text-tiba-gray-500">تأكيد عملية الإرسال عبر الواتساب</p>
              </div>
            </div>

            {/* المحتوى */}
            <div className="mb-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 mb-2">
                  سيتم إرسال رسالة واتساب للمتدرب:
                </p>
                <p className="font-semibold text-blue-900 text-lg">
                  {pendingSendAccountName}
                </p>
              </div>

              <div className="bg-tiba-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-tiba-gray-700">محتوى الرسالة:</p>
                <ul className="text-sm text-tiba-gray-600 space-y-1 mr-4">
                  <li>• اسم المتدرب</li>
                  <li>• الرقم القومي (اسم المستخدم)</li>
                  <li>• كلمة المرور (نفس الرقم القومي)</li>
                </ul>
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>ملاحظة:</strong> سيتم تحديث كلمة المرور إلى الرقم القومي تلقائياً
                </p>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={confirmSendCredentials}
                disabled={isSendingCredentials}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
              >
                {isSendingCredentials ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-5 h-5" />
                    <span>إرسال الآن</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setIsConfirmSendDialogOpen(false);
                  setPendingSendAccountId(null);
                  setPendingSendAccountName('');
                }}
                disabled={isSendingCredentials}
                className="px-6 py-3 border-2 border-tiba-gray-300 text-tiba-gray-700 rounded-lg hover:bg-tiba-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إنشاء الحسابات */}
      <CreateAccountsModal
        open={isCreateModalOpen && canCreateAccounts}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchTraineeAccounts(currentPage, searchQuery, selectedProgram)}
        initialProgramId={selectedProgram !== 'ALL' ? selectedProgram : undefined}
      />

      {/* نافذة حذف الحساب نهائياً */}
      <DeleteAccountModal
        open={isDeleteModalOpen && canDeleteAccounts}
        accountId={pendingDeleteAccountId}
        traineeName={pendingDeleteAccountName}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPendingDeleteAccountId(null);
          setPendingDeleteAccountName('');
        }}
        onDeleted={refreshAfterDelete}
      />

    </div>
  );
}

export default function TraineeAccountsPage() {
  return (
    <PageGuard>
      <TraineeAccountsPageContent />
    </PageGuard>
  );
}