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
  PaperAirplaneIcon
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
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [isConfirmSendDialogOpen, setIsConfirmSendDialogOpen] = useState(false);
  const [pendingSendAccountId, setPendingSendAccountId] = useState<string | null>(null);
  const [pendingSendAccountName, setPendingSendAccountName] = useState<string>('');
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);

  const { userPermissions } = usePermissions();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  const fetchTraineeAccounts = async (page: number, search: string, programId?: string) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (programId && programId !== 'ALL') params.programId = programId;
      
      const response = await fetchAPI(`/trainee-platform/accounts?${new URLSearchParams(params).toString()}`);
      
      // دعم كلا الهيكلين للاستجابة
      const accountsData = response.data || response || [];
      const totalCount = response.total || response.meta?.total || 0;
      const responseLimit = response.limit || response.meta?.limit || 10;
      
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

  useEffect(() => {
    fetchTraineeAccounts(currentPage, searchQuery, selectedProgram);
  }, [currentPage, searchQuery, selectedProgram]);

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
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleStatus(account.id, account.isActive, account.trainee.nameAr)}
            disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'activate')}
            className={account.isActive 
              ? 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400' 
              : 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400'
            }
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => openResetPasswordDialog(account.id, account.trainee.nameAr)}
            disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'reset-password')}
            className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400"
          >
            <LockClosedIcon className="w-4 h-4 ml-1" />
            إعادة تعيين
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendCredentials(account.id, account.trainee.nameAr)}
            disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'view') || !account.isActive}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!account.isActive ? 'يجب تفعيل الحساب أولاً' : 'إرسال بيانات المنصة عبر الواتساب'}
          >
            <PaperAirplaneIcon className="w-4 h-4 ml-1" />
            إرسال البيانات
          </Button>
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
          <div className="flex items-center gap-2">
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
                  {accounts.filter(acc => acc.isActive).length}
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
                  {accounts.filter(acc => !acc.isActive).length}
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
                  {accounts.filter(acc => 
                    acc.lastLoginAt && 
                    new Date(acc.lastLoginAt).toDateString() === new Date().toDateString()
                  ).length}
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
                  onKeyPress={handleSearchKeyPress}
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
                <table className="min-w-full bg-white border border-tiba-gray-300 rounded-lg shadow-sm">
                <thead className="bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="px-6 py-4 text-right text-sm font-semibold text-tiba-primary-800 border-b border-tiba-primary-200">
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-tiba-gray-200">
                  {accounts.map((account, index) => (
                    <tr key={account.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-tiba-gray-25'} hover:bg-tiba-primary-25 transition-colors duration-150`}>
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 text-sm border-b border-tiba-gray-100">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(account.id, account.isActive, account.trainee.nameAr)}
                          disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'activate')}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetPasswordDialog(account.id, account.trainee.nameAr)}
                          disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'reset-password')}
                          className="flex-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <LockClosedIcon className="w-4 h-4 ml-1" />
                          إعادة تعيين
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendCredentials(account.id, account.trainee.nameAr)}
                        disabled={!userPermissions?.hasPermission('dashboard.trainee-platform.accounts', 'view') || !account.isActive}
                        className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <PaperAirplaneIcon className="w-4 h-4 ml-1" />
                        إرسال البيانات
                      </Button>
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