'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PageHeader from '@/app/components/PageHeader';
import { Card, CardStat } from '@/app/components/ui/Card';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import {
  UserIcon,
  MagnifyingGlassIcon,
  PhoneArrowUpRightIcon,
  XMarkIcon,
  LockClosedIcon,
  UsersIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import PageGuard from '@/components/permissions/PageGuard';
import CommissionModal from '@/app/components/ui/CommissionModal';

interface MarketingEmployee {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
}

interface TraineeWithMarketing {
  id: number;
  nameAr: string;
  nameEn: string;
  phone: string;
  email?: string;
  nationalId: string;
  traineeStatus: string;
  marketingEmployeeId?: number;
  marketingEmployee?: {
    id: number;
    name: string;
  };
  firstContactEmployeeId?: number;
  firstContactEmployee?: {
    id: number;
    name: string;
  };
  secondContactEmployeeId?: number;
  secondContactEmployee?: {
    id: number;
    name: string;
  };
  program: {
    id: number;
    nameAr: string;
  };
  totalPaidAmount: number;
  createdAt: string;
  updatedAt: string;
  canModifyFirstContact?: boolean;
  canModifySecondContact?: boolean;
}

function MarketingApplicationsPageContent() {
  const [employees, setEmployees] = useState<MarketingEmployee[]>([]);
  const [trainees, setTrainees] = useState<TraineeWithMarketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [assigningTrainee, setAssigningTrainee] = useState<number | null>(null);
  const [confirmContact, setConfirmContact] = useState<{
    show: boolean;
    traineeId: number;
    traineeName: string;
    contactType: 'first' | 'second';
    employeeId: number | null;
    employeeName: string;
    commissionAmount: number;
    commissionDescription: string;
  } | null>(null);

  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedCommissionData, setSelectedCommissionData] = useState<{
    marketingEmployeeId: number;
    traineeId: number;
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
    amount: number;
    description: string;
  } | null>(null);

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    loadEmployees();
    loadTrainees(1, pagination.limit);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTrainees(1, pagination.limit, searchTerm, '', employeeFilter);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, employeeFilter]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadTrainees(newPage, pagination.limit, searchTerm, '', employeeFilter);
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    loadTrainees(1, newLimit, searchTerm, '', employeeFilter);
  };

  const loadEmployees = async () => {
    try {
      const response = await fetchAPI('/marketing/employees');
      setEmployees(response.filter((emp: MarketingEmployee) => emp.isActive));
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('فشل في تحميل بيانات الموظفين');
    }
  };

  const checkModifyPermission = async (traineeId: number, contactType: 'FIRST_CONTACT' | 'SECOND_CONTACT'): Promise<boolean> => {
    try {
      const url = `/marketing/trainees/${traineeId}/can-modify-contact/${contactType}`;
      const response = await fetchAPI(url);
      let result = false;
      if (typeof response === 'boolean') {
        result = response;
      } else if (typeof response === 'object' && response !== null) {
        result = response.canModify === true || response.success === true || response === true;
      }
      return result;
    } catch (error) {
      console.error('Error checking modify permission:', error);
      return false;
    }
  };

  const loadTrainees = async (page = 1, limit = 10, search = '', status = '', employee = '') => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) queryParams.append('search', search);
      if (status && status !== 'all') queryParams.append('status', status);
      if (employee && employee !== 'all' && employee !== 'unassigned') queryParams.append('employeeId', employee);
      if (employee === 'unassigned') queryParams.append('unassigned', 'true');

      const response = await fetchAPI(`/marketing/trainees?${queryParams.toString()}`);

      if (response && response.data) {
        const traineesData = response.data || [];
        const traineesWithPermissions = await Promise.all(
          traineesData.map(async (trainee: TraineeWithMarketing) => {
            const canModifyFirst = await checkModifyPermission(trainee.id, 'FIRST_CONTACT');
            const canModifySecond = await checkModifyPermission(trainee.id, 'SECOND_CONTACT');
            return { ...trainee, canModifyFirstContact: canModifyFirst, canModifySecondContact: canModifySecond };
          })
        );
        setTrainees(traineesWithPermissions);
        setPagination({
          page, limit,
          total: response.total || 0,
          totalPages: response.totalPages || 1,
          hasNext: response.hasNext || false,
          hasPrev: response.hasPrev || false
        });
      } else {
        const traineesData = response || [];
        const traineesWithPermissions = await Promise.all(
          traineesData.map(async (trainee: TraineeWithMarketing) => {
            const canModifyFirst = await checkModifyPermission(trainee.id, 'FIRST_CONTACT');
            const canModifySecond = await checkModifyPermission(trainee.id, 'SECOND_CONTACT');
            return { ...trainee, canModifyFirstContact: canModifyFirst, canModifySecondContact: canModifySecond };
          })
        );
        setTrainees(traineesWithPermissions);
        setPagination({
          page, limit,
          total: response?.length || 0,
          totalPages: Math.ceil((response?.length || 0) / limit) || 1,
          hasNext: false, hasPrev: false
        });
      }
    } catch (error) {
      console.error('Error loading trainees:', error);
      toast.error('فشل في تحميل بيانات المتدربين');
      setTrainees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestContact = (traineeId: number, contactType: 'first' | 'second', employeeId: number | null) => {
    const trainee = trainees.find(t => t.id === traineeId);
    const employee = employees.find(e => e.id === employeeId);
    if (!trainee) return;

    if (contactType === 'first' && trainee.firstContactEmployeeId && employeeId !== null) {
      if (!trainee.canModifyFirstContact) {
        toast.error('لا يمكن تعديل التواصل الأول لأنه تم صرف العمولة مسبقاً');
        return;
      }
    }
    if (contactType === 'second' && trainee.secondContactEmployeeId && employeeId !== null) {
      if (!trainee.canModifySecondContact) {
        toast.error('لا يمكن تعديل التواصل الثاني لأنه تم صرف العمولة مسبقاً');
        return;
      }
    }

    const contactTypeText = contactType === 'first' ? 'التواصل الأول' : 'التواصل الثاني';
    setConfirmContact({
      show: true,
      traineeId,
      traineeName: trainee.nameAr,
      contactType,
      employeeId,
      employeeName: employeeId ? (employee?.name || 'موظف غير معروف') : 'إلغاء التخصيص',
      commissionAmount: employeeId ? 100 : 0,
      commissionDescription: employeeId ? `عمولة ${contactTypeText} للمتدرب ${trainee.nameAr}` : ''
    });
  };

  const handleUpdateContact = async () => {
    if (!confirmContact) return;
    try {
      setAssigningTrainee(confirmContact.traineeId);
      const updateData: any = {};
      if (confirmContact.contactType === 'first') {
        updateData.firstContactEmployeeId = confirmContact.employeeId;
      } else {
        updateData.secondContactEmployeeId = confirmContact.employeeId;
      }

      await fetchAPI(`/marketing/trainees/${confirmContact.traineeId}/contact`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const contactTypeText = confirmContact.contactType === 'first' ? 'التواصل الأول' : 'التواصل الثاني';

      if (confirmContact.employeeId && confirmContact.commissionAmount > 0) {
        try {
          await handleCreateCommission({
            marketingEmployeeId: confirmContact.employeeId,
            traineeId: confirmContact.traineeId,
            type: confirmContact.contactType === 'first' ? 'FIRST_CONTACT' : 'SECOND_CONTACT',
            amount: confirmContact.commissionAmount,
            description: confirmContact.commissionDescription
          });
          toast.success(`تم تحديث ${contactTypeText} والعمولة بنجاح`);
        } catch (commissionError: any) {
          console.error('Error creating commission:', commissionError);
          if (commissionError.message?.includes('توجد عمولة')) {
            toast.warning(`تم تحديث ${contactTypeText} بنجاح، لكن ${commissionError.message}`);
          } else {
            toast.success(`تم تحديث ${contactTypeText} بنجاح، لكن فشل في إنشاء العمولة`);
          }
        }
      } else if (confirmContact.employeeId && confirmContact.commissionAmount === 0) {
        toast.warning(`تم تحديث ${contactTypeText} بنجاح، لكن لم يتم إنشاء عمولة لأن القيمة صفر`);
      } else {
        toast.success(`تم تحديث ${contactTypeText} بنجاح`);
      }

      await loadTrainees(pagination.page, pagination.limit, searchTerm, '', employeeFilter);
      setConfirmContact(null);
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast.error('فشل في تحديث التواصل');
    } finally {
      setAssigningTrainee(null);
    }
  };

  const handleCreateCommission = async (data: {
    marketingEmployeeId: number;
    traineeId: number;
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
    amount: number;
    description: string;
  }) => {
    try {
      await fetchAPI('/commissions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('تم إنشاء العمولة بنجاح');
      setShowCommissionModal(false);
      setSelectedCommissionData(null);
    } catch (error: any) {
      console.error('Error creating commission:', error);
      toast.error('فشل في إنشاء العمولة');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Build employee options for SearchableSelect
  const employeeSelectOptions = [
    { value: 'unassigned', label: 'غير محدد' },
    ...employees.map(emp => ({ value: emp.id.toString(), label: emp.name }))
  ];

  // Build employee filter options for SimpleSelect
  const employeeFilterOptions = [
    { value: 'all', label: 'جميع الموظفين' },
    { value: 'unassigned', label: 'لا يوجد تواصل أول' },
    ...employees.map(emp => ({ value: emp.id.toString(), label: emp.name }))
  ];

  if (loading && trainees.length === 0) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title="التواصل مع المتدربين"
        description="تحديد موظفي التسويق للتواصل الأول والثاني مع المتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة التسويق', href: '/dashboard/marketing/employees' },
          { label: 'التواصل مع المتدربين' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <CardStat
          icon={<UsersIcon className="w-5 h-5" />}
          title="إجمالي المتدربين"
          value={pagination.total}
          variant="primary"
        />
        <CardStat
          icon={<PhoneArrowUpRightIcon className="w-5 h-5" />}
          title="الصفحة الحالية"
          value={trainees.length}
          change={`صفحة ${pagination.page} من ${pagination.totalPages}`}
          variant="secondary"
        />
      </div>

      {/* Filters */}
      <Card size="sm" hover={false}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الهاتف، أو الرقم القومي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pr-10 pl-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400 bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="sm:w-56">
            <SimpleSelect
              options={employeeFilterOptions}
              value={employeeFilter || 'all'}
              onChange={(v) => setEmployeeFilter(v === 'all' ? '' : v)}
              placeholder="فلترة بالتواصل الأول"
            />
          </div>
          {(searchTerm || employeeFilter) && (
            <button
              onClick={() => { setSearchTerm(''); setEmployeeFilter(''); }}
              className="h-10 px-4 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>مسح</span>
            </button>
          )}
        </div>
      </Card>

      {/* Trainees Table */}
      <Card size="sm" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-4.5 h-4.5 text-tiba-primary-600" />
          <h3 className="text-sm font-bold text-slate-900">إدارة التواصل</h3>
          {loading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-300 border-t-tiba-primary-600 mr-auto" />
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase">المتدرب</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase">البرنامج</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase">المدفوع</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    التواصل الأول
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">تارجت</span>
                  </div>
                </th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    التواصل الثاني
                    <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">إضافي</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trainees.map((trainee) => (
                <tr key={trainee.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-tiba-primary-100 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-tiba-primary-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{trainee.nameAr}</div>
                        <div className="text-[10px] text-slate-400">{trainee.phone} • {trainee.nationalId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block max-w-[120px] truncate">
                      {trainee.program.nameAr}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-bold text-emerald-600">{formatAmount(trainee.totalPaidAmount || 0)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <SearchableSelect
                        value={trainee.firstContactEmployeeId?.toString() || 'unassigned'}
                        onChange={(value) => {
                          const empId = (!value || value === 'unassigned') ? null : parseInt(value);
                          handleRequestContact(trainee.id, 'first', empId);
                        }}
                        options={employeeSelectOptions}
                        placeholder="اختر الموظف"
                        disabled={assigningTrainee === trainee.id || (trainee.firstContactEmployeeId != null && !trainee.canModifyFirstContact)}
                      />
                      {trainee.firstContactEmployeeId != null && !trainee.canModifyFirstContact && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10" title="تم صرف العمولة">
                          <LockClosedIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <SearchableSelect
                        value={trainee.secondContactEmployeeId?.toString() || 'unassigned'}
                        onChange={(value) => {
                          const empId = (!value || value === 'unassigned') ? null : parseInt(value);
                          handleRequestContact(trainee.id, 'second', empId);
                        }}
                        options={employeeSelectOptions}
                        placeholder="اختر الموظف"
                        disabled={assigningTrainee === trainee.id || (trainee.secondContactEmployeeId != null && !trainee.canModifySecondContact)}
                      />
                      {trainee.secondContactEmployeeId != null && !trainee.canModifySecondContact && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10" title="تم صرف العمولة">
                          <LockClosedIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {trainees.map((trainee) => (
            <div key={trainee.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-md bg-tiba-primary-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-tiba-primary-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{trainee.nameAr}</h4>
                  <p className="text-[10px] text-slate-400">{trainee.phone} • {trainee.nationalId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{trainee.program.nameAr}</span>
                <span className="text-[10px] font-bold text-emerald-600">{formatAmount(trainee.totalPaidAmount || 0)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                    التواصل الأول
                    <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full text-[9px]">تارجت</span>
                  </div>
                  <div className="relative">
                    <SearchableSelect
                      value={trainee.firstContactEmployeeId?.toString() || 'unassigned'}
                      onChange={(value) => {
                        const empId = (!value || value === 'unassigned') ? null : parseInt(value);
                        handleRequestContact(trainee.id, 'first', empId);
                      }}
                      options={employeeSelectOptions}
                      placeholder="اختر الموظف"
                      disabled={assigningTrainee === trainee.id || (trainee.firstContactEmployeeId != null && !trainee.canModifyFirstContact)}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    التواصل الثاني
                    <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px]">إضافي</span>
                  </div>
                  <div className="relative">
                    <SearchableSelect
                      value={trainee.secondContactEmployeeId?.toString() || 'unassigned'}
                      onChange={(value) => {
                        const empId = (!value || value === 'unassigned') ? null : parseInt(value);
                        handleRequestContact(trainee.id, 'second', empId);
                      }}
                      options={employeeSelectOptions}
                      placeholder="اختر الموظف"
                      disabled={assigningTrainee === trainee.id || (trainee.secondContactEmployeeId != null && !trainee.canModifySecondContact)}
                    />
                  </div>
                </div>
              </div>

              {assigningTrainee === trainee.id && (
                <div className="mt-2 flex items-center justify-center gap-2 bg-slate-50 rounded p-1.5">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-300 border-t-tiba-primary-600" />
                  <span className="text-[10px] text-slate-500">جاري التحديث...</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {trainees.length === 0 && !loading && (
          <div className="text-center py-10">
            <MagnifyingGlassIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">
              {searchTerm || employeeFilter ? 'لا توجد نتائج' : 'لا توجد متدربين'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {searchTerm
                ? `لا توجد نتائج للبحث "${searchTerm}"`
                : employeeFilter
                ? 'لا توجد متدربين مطابقين للفلتر المحدد'
                : 'لا توجد متدربين في النظام'}
            </p>
            {(searchTerm || employeeFilter) && (
              <button
                onClick={() => { setSearchTerm(''); setEmployeeFilter(''); }}
                className="inline-flex items-center gap-1.5 px-4 h-8 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            isLoading={loading}
            className="mt-4"
          />
        )}
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmContact?.show || false} onOpenChange={(open) => !open && setConfirmContact(null)}>
        <AlertDialogContent className="sm:max-w-[480px] bg-white rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PhoneArrowUpRightIcon className="w-4.5 h-4.5 text-tiba-primary-600" />
              تأكيد {confirmContact?.contactType === 'first' ? 'التواصل الأول' : 'التواصل الثاني'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600">
                {confirmContact && (
                  <div className="space-y-3 mt-3">
                    {/* Warning */}
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold mb-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        تنبيه مهم
                      </div>
                      <p className="text-[11px] text-red-600">
                        هذا الإجراء <strong>نهائي ولا يمكن التراجع عنه</strong>.
                        لن تتمكن من تعديل {confirmContact.contactType === 'first' ? 'التواصل الأول' : 'التواصل الثاني'} مرة أخرى بعد التأكيد.
                      </p>
                    </div>

                    {/* Details */}
                    <div className={`p-2.5 rounded-lg space-y-1.5 ${
                      confirmContact.contactType === 'first' ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">المتدرب:</span>
                        <span className="font-bold text-slate-900">{confirmContact.traineeName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">
                          {confirmContact.contactType === 'first' ? 'التواصل الأول:' : 'التواصل الثاني:'}
                        </span>
                        <span className={`font-bold ${
                          confirmContact.contactType === 'first' ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {confirmContact.employeeName}
                        </span>
                      </div>
                    </div>

                    {confirmContact.employeeId ? (
                      <>
                        <div className={`text-[11px] p-2 rounded-lg ${
                          confirmContact.contactType === 'first' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {confirmContact.contactType === 'first'
                            ? '⭐ يحتسب في التارجت الشهري للموظف'
                            : 'ℹ️ تواصل ثاني (لا يحتسب في التارجت)'}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-slate-700">قيمة العمولة (ج.م):</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={confirmContact.commissionAmount}
                            onChange={(e) => setConfirmContact({
                              ...confirmContact,
                              commissionAmount: parseFloat(e.target.value) || 0
                            })}
                            placeholder="أدخل قيمة العمولة"
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
                          />
                          {confirmContact.commissionAmount === 0 && (
                            <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded p-1.5 flex items-center gap-1.5">
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              لن يتم إنشاء عمولة عند القيمة صفر
                            </div>
                          )}
                          <label className="block text-xs font-medium text-slate-700">وصف العمولة:</label>
                          <input
                            type="text"
                            value={confirmContact.commissionDescription}
                            onChange={(e) => setConfirmContact({
                              ...confirmContact,
                              commissionDescription: e.target.value
                            })}
                            placeholder="وصف العمولة"
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400"
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-orange-600 p-2 bg-orange-50 rounded-lg">
                        سيتم إلغاء تخصيص {confirmContact.contactType === 'first' ? 'التواصل الأول' : 'التواصل الثاني'}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel className="h-9 text-xs text-slate-600 border-slate-200 rounded-lg hover:bg-slate-50">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateContact}
              className={`h-9 text-xs text-white rounded-lg ${
                confirmContact?.contactType === 'first' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmContact?.employeeId ? 'تأكيد وإنشاء العمولة' : 'تأكيد الإلغاء'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commission Modal */}
      {showCommissionModal && selectedCommissionData && (
        <CommissionModal
          isOpen={showCommissionModal}
          onClose={() => {
            setShowCommissionModal(false);
            setSelectedCommissionData(null);
          }}
          onSubmit={handleCreateCommission}
          marketingEmployeeId={selectedCommissionData.marketingEmployeeId}
          traineeId={selectedCommissionData.traineeId}
          type={selectedCommissionData.type}
          amount={selectedCommissionData.amount}
          description={selectedCommissionData.description}
        />
      )}
    </div>
  );
}

export default function MarketingApplicationsPage() {
  return (
    <PageGuard>
      <MarketingApplicationsPageContent />
    </PageGuard>
  );
}
