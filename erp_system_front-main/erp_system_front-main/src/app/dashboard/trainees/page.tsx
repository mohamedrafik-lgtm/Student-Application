'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { getFeeTypeLabel } from '@/lib/translations';
import { getAllTrainees } from '@/app/lib/api/trainees';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  MagnifyingGlassPlusIcon,
  CreditCardIcon,
  AcademicCapIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import CommissionModal from '@/app/components/ui/CommissionModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ProtectedPage from '../../../components/permissions/ProtectedPage';
import { ProtectedNavigation } from '../../../components/permissions/ProtectedNavigation';
import { usePermissions } from '../../../hooks/usePermissions';
import PageGuard from '@/components/permissions/PageGuard';
import * as z from 'zod';
import { createTraineePayment, processAutoPayment } from '@/app/lib/api/finances';
import Image from 'next/image';
import React from 'react';
import TraineeNotesModal from '@/components/ui/TraineeNotesModal';
import { TraineeAvatar, TraineePhotoLightbox } from '@/components/ui/trainee-avatar';
import { ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { TibaCategoryCard } from '@/components/ui/tiba-category-card';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import { TibaFeeItem } from '@/components/ui/tiba-fee-item';
import { TibaModal, TibaTraineeInfo, TibaModalAlert } from '@/components/ui/tiba-modal';
import { getTraineeGradesDetailed } from '@/lib/grades-api';
import { type DistributionRoom } from '@/lib/trainee-distribution-api';
import { egyptGovernoratesAndCities, getCitiesByGovernorate } from '@/app/lib/locations';
import { FunnelIcon } from '@heroicons/react/24/outline';

// نموذج دفع الرسوم
const paymentFormSchema = z.object({
  amount: z.coerce.number()
    .min(0.01, { message: 'المبلغ المدفوع يجب أن يكون أكبر من صفر' }),
  safeId: z.string().min(1, { message: 'الخزينة مطلوبة' }),
  notes: z.string().optional(),
});

interface Program {
  id: number;
  nameAr: string;
}

interface Trainee {
  id: number;
  nameAr: string;
  email: string;
  phone: string;
  nationalId?: string;
  programId: number;
  program: Program;
  photoUrl?: string;
  gender: 'MALE' | 'FEMALE';
  programType: 'SUMMER' | 'WINTER' | 'ANNUAL';
  academicYear?: string;
}

function TraineesPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const { userPermissions } = usePermissions();
  const router = useRouter();

  // التحقق من الصلاحيات مرة واحدة في بداية المكون
  const canEditTrainees = userPermissions?.hasPermission('dashboard.trainees', 'edit') || false;
  const canDeleteTrainees = userPermissions?.hasPermission('dashboard.trainees', 'delete') || false;
  const canManageFinances = userPermissions?.hasPermission('dashboard.financial', 'manage') || false;
  const canTransferGroups = userPermissions?.hasPermission('dashboard.trainees.distribution', 'transfer') || false;
  const canViewPhone = userPermissions?.hasPermission('dashboard.trainees', 'view_phone') || false;
  const canManagePaymentExceptions = userPermissions?.hasPermission('dashboard.trainees.payment-exceptions', 'manage') || false;
  const canManageDisciplinaryActions = userPermissions?.hasPermission('dashboard.trainees.disciplinary-actions', 'manage') || false;
  const canAccessTraineeActions = canEditTrainees || canDeleteTrainees;
  
  // صلاحيات مالية محددة - للمحاسبين ومن لديهم صلاحيات مالية
  const canManageTraineeFinances = canManageFinances ||
    userPermissions?.hasRole('accountant') ||
    userPermissions?.hasPermission('dashboard.financial', 'view') || false;

  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // حالات modal الصورة
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{photoUrl: string; name: string; nationalId: string} | null>(null);
  
  // حالات modal الإحصائيات
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(''); // البحث المطبق فعلياً
  const [searchInput, setSearchInput] = useState(''); // نص البحث في المربع
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterProgramType, setFilterProgramType] = useState('ALL');
  const [sortBy, setSortBy] = useState('name'); // 'name' للأبجدي، 'id' لرقم الملف
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' تصاعدي، 'desc' تنازلي
  
  // فلاتر متقدمة
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterGovernorate, setFilterGovernorate] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterBirthDateFrom, setFilterBirthDateFrom] = useState('');
  const [filterBirthDateTo, setFilterBirthDateTo] = useState('');
  
  // Pagination states
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [traineeToDelete, setTraineeToDelete] = useState<Trainee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<{ items: { label: string; count: number; icon: string; details?: string }[]; totalRecords: number; hasFinancialData: boolean } | null>(null);
  const [isDeletionPreviewLoading, setIsDeletionPreviewLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTraineeForPayment, setSelectedTraineeForPayment] = useState<Trainee | null>(null);
  const [safes, setSafes] = useState<any[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [traineeFinancialInfo, setTraineeFinancialInfo] = useState<{
    totalFees: number;
    totalPaid: number;
    remaining: number;
    currency: string;
    availablePayments: any[];
  } | null>(null);
  const [isLoadingFinancialInfo, setIsLoadingFinancialInfo] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    show: boolean;
    message: string;
    traineeId: number;
  } | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);
  const [showPaymentDisabledDialog, setShowPaymentDisabledDialog] = useState(false);
  // عرض نتائج فحص الرسوم الدراسية
  const [feesCheckResult, setFeesCheckResult] = useState<any | null>(null);
  const [showFeesCheckModal, setShowFeesCheckModal] = useState(false);

  // حالات مربع الملاحظات
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedTraineeForNotes, setSelectedTraineeForNotes] = useState<Trainee | null>(null);
  
  // حالات مربع الدرجات
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedTraineeForGrades, setSelectedTraineeForGrades] = useState<any | null>(null);
  const [gradesLoading, setGradesLoading] = useState(false);

  // حالات مربع العمولة
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedCommissionData, setSelectedCommissionData] = useState<{
    marketingEmployeeId: number;
    marketingEmployeeName: string;
    traineeId: number;
    traineeName: string;
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
  } | null>(null);

  // حالات modal استثناء موعد السداد
  const [showPaymentExceptionModal, setShowPaymentExceptionModal] = useState(false);
  const [selectedTraineeForException, setSelectedTraineeForException] = useState<Trainee | null>(null);
  const [feesWithSchedules, setFeesWithSchedules] = useState<any[]>([]);
  const [loadingFeesWithSchedules, setLoadingFeesWithSchedules] = useState(false);
  const [exceptionFormData, setExceptionFormData] = useState({
    feeId: '',
    customPaymentEndDate: '',
    customGracePeriodDays: 0,
    reason: '',
    notes: '',
  });

  // حالات modal عرض الاستثناءات السابقة
  const [showExceptionsListModal, setShowExceptionsListModal] = useState(false);
  const [selectedTraineeForExceptionsList, setSelectedTraineeForExceptionsList] = useState<Trainee | null>(null);
  const [exceptionsList, setExceptionsList] = useState<any[]>([]);
  const [loadingExceptionsList, setLoadingExceptionsList] = useState(false);

  // حالات modal التأكيد
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  // حالات رسوم إضافية (اختيار متعدد)
  const [showAdditionalFeesModal, setShowAdditionalFeesModal] = useState(false);
  const [additionalFeesData, setAdditionalFeesData] = useState<any>(null);
  const [selectedAdditionalFeeIds, setSelectedAdditionalFeeIds] = useState<number[]>([]);
  const [selectedTraineeForAdditionalFees, setSelectedTraineeForAdditionalFees] = useState<Trainee | null>(null);
  const [additionalFeesSearchQuery, setAdditionalFeesSearchQuery] = useState('');

  // حالات modal الإجراءات العقابية (إنشاء جديد)
  const [showDisciplinaryModal, setShowDisciplinaryModal] = useState(false);
  const [selectedTraineeForDisciplinary, setSelectedTraineeForDisciplinary] = useState<Trainee | null>(null);
  const [disciplinaryFormData, setDisciplinaryFormData] = useState({
    actionType: '',
    reason: '',
    startDate: '',
    endDate: '',
    notes: '',
    guardianNotified: false,
    guardianNotificationDate: '',
  });

  // حالات modal عرض الإجراءات العقابية (عرض وإدارة)
  const [showDisciplinaryListModal, setShowDisciplinaryListModal] = useState(false);
  const [selectedTraineeForDisciplinaryList, setSelectedTraineeForDisciplinaryList] = useState<Trainee | null>(null);
  const [disciplinaryActionsList, setDisciplinaryActionsList] = useState<any[]>([]);
  const [loadingDisciplinaryList, setLoadingDisciplinaryList] = useState(false);

  // فتح اختيار الرسوم الإضافية (غير الدراسية)
  const handleOpenAdditionalFees = async (trainee: Trainee) => {
    try {
      const response = await fetchAPI(`/trainees/${trainee.id}/available-additional-fees`);
      if (!response || response.availableToApply === 0) {
        toast('لا توجد رسوم إضافية متاحة لهذا المتدرب', { icon: 'ℹ️' });
        return;
      }
      setSelectedTraineeForAdditionalFees(trainee);
      setAdditionalFeesData(response);
      setAdditionalFeesSearchQuery(''); // إعادة تعيين البحث
      setShowAdditionalFeesModal(true);
    } catch (error: any) {
      console.error('Error loading additional fees list:', error);
      toast.error(error.message || 'حدث خطأ في تحميل الرسوم الإضافية');
    }
  };

  // فلترة الرسوم الإضافية حسب البحث
  const filteredAdditionalFees = additionalFeesData?.unappliedFees?.filter((fee: any) =>
    fee.name.toLowerCase().includes(additionalFeesSearchQuery.toLowerCase()) ||
    fee.type.toLowerCase().includes(additionalFeesSearchQuery.toLowerCase())
  ) || [];

  // تطبيق الرسوم الإضافية المختارة
  const applySelectedAdditionalFees = async (selectedFeeIds: number[]) => {
    if (!selectedTraineeForAdditionalFees || !selectedFeeIds?.length) return;
    try {
      const applyResponse = await fetchAPI(`/trainees/${selectedTraineeForAdditionalFees.id}/apply-additional-fees`, {
        method: 'POST',
        body: JSON.stringify({ feeIds: selectedFeeIds }),
      });
      if (applyResponse?.success !== false) {
        toast.success(applyResponse.message || 'تم تطبيق الرسوم الإضافية بنجاح');
        setShowAdditionalFeesModal(false);
        setAdditionalFeesData(null);
        setSelectedTraineeForAdditionalFees(null);
        // إعادة تحميل سريعة للبيانات
        // تحديث البيانات دون إعادة تحميل الصفحة
        await fetchTrainees(pagination.page, pagination.limit, false);
      } else {
        throw new Error(applyResponse.error || applyResponse.message || 'فشل في تطبيق الرسوم الإضافية');
      }
    } catch (error: any) {
      console.error('Error applying additional fees:', error);
      toast.error(error.message || 'حدث خطأ في تطبيق الرسوم الإضافية');
    }
  };

  // نموذج الدفع
  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      safeId: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // إعادة جلب البيانات عند تغيير الفلاتر
  useEffect(() => {
    if (isAuthenticated) {
      setPagination(prev => ({ 
        ...prev, 
        page: 1,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }));
      fetchTrainees(1, pagination.limit, true);
    }
  }, [filterProgram, isAuthenticated]);

  // دالة لتحميل المتدربين مع pagination
  const fetchTrainees = async (page = 1, limit = 10, resetData = false, customSearchQuery?: string) => {
    try {
      if (resetData) {
        setLoading(true);
      }

      // استخدام customSearchQuery إذا تم تمريره، وإلا استخدام searchQuery من الـ state
      const currentSearchQuery = customSearchQuery !== undefined ? customSearchQuery : searchQuery;

      const filters = {
        page,
        limit,
        ...(filterProgram !== 'ALL' && { programId: parseInt(filterProgram) }),
        ...(currentSearchQuery && { searchQuery: currentSearchQuery }),
        sortBy,
        sortOrder,
      };

      console.log('🔄 Fetching trainees with filters:', filters);
      
      const response = await getAllTrainees(filters);
      
      if (response && response.data) {
        // Response has pagination structure
        setTrainees(response.data);
        setPagination({
          ...response.pagination,
          limit: limit // الحفاظ على الـ limit المطلوب من المستخدم
        });
      } else {
        // Fallback: response is direct array (old format)
        setTrainees(response || []);
        setPagination({
          page: page,
          limit: limit, // استخدام الـ limit المطلوب
          total: response?.length || 0,
          totalPages: Math.ceil((response?.length || 0) / limit) || 1,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (err) {
      console.error('خطأ في تحميل المتدربين:', err);
      setError('حدث خطأ أثناء تحميل بيانات المتدربين');
      setTrainees([]);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البرامج
  const fetchPrograms = async () => {
    try {
      const programsData = await fetchAPI('/programs');
      setPrograms(programsData || []);
    } catch (programsError) {
      console.warn('خطأ في تحميل البرامج:', programsError);
      setPrograms([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrograms();
      fetchTrainees(1, pagination.limit, true, ''); // بدء بدون بحث
    }
  }, [isAuthenticated]);

  // إعادة تحميل البيانات عند تغيير الفلاتر والترتيب (بدون searchQuery)
  useEffect(() => {
    if (isAuthenticated) {
      setPagination(prev => ({ 
        ...prev, 
        page: 1,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }));
      fetchTrainees(1, pagination.limit, true); // سيستخدم searchQuery الحالي
    }
  }, [filterProgram, sortBy, sortOrder]); // إضافة sortBy و sortOrder

  // معالجات Pagination
  const handlePageChange = (newPage: number) => {
    console.log(`🔄 تغيير الصفحة إلى: ${newPage}`);
    // تحديث الـ state أولاً
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    fetchTrainees(newPage, pagination.limit, false); // عدم إعادة تحميل كاملة
    // التمرير لأعلى الجدول عند تغيير الصفحة
    document.querySelector('[data-table-container]')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  const handleLimitChange = (newLimit: number) => {
    console.log(`🔄 تغيير عدد العناصر إلى: ${newLimit}`);
    // تحديث الـ state أولاً
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1, // العودة للصفحة الأولى
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }));
    fetchTrainees(1, newLimit, true); // سيستخدم searchQuery الحالي
  };

  // دالة البحث اليدوي
  const handleSearch = () => {
    console.log(`🔍 البحث عن: "${searchInput}"`);
    setSearchQuery(searchInput); // تطبيق البحث
    
    // إعادة تعيين pagination للصفحة الأولى عند البحث
    setPagination(prev => ({
      ...prev,
      page: 1,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }));
    
    fetchTrainees(1, pagination.limit, true, searchInput);
  };

  // دالة مسح البحث
  const handleClearSearch = () => {
    console.log('🗑️ مسح البحث');
    setSearchInput('');
    setSearchQuery('');
    
    // إعادة تعيين pagination للصفحة الأولى عند مسح البحث
    setPagination(prev => ({
      ...prev,
      page: 1,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }));
    
    // تمرير string فارغ للتأكد من مسح البحث
    fetchTrainees(1, pagination.limit, true, '');
  };

  // دالة للبحث عند الضغط على Enter
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async () => {
    if (!traineeToDelete) return;
    setIsDeleting(true);

    const originalTrainees = [...trainees];
    const updatedTrainees = trainees.filter(t => t.id !== traineeToDelete.id);
    setTrainees(updatedTrainees);

    try {
      await fetchAPI(`/trainees/${traineeToDelete.id}`, { method: 'DELETE' });
      toast.success('تم حذف المتدرب وجميع بياناته بنجاح');
      setTraineeToDelete(null);
      setIsDeleteModalOpen(false);
      setDeletionPreview(null);
    } catch (error) {
      console.error('Error deleting trainee:', error);
      toast.error('فشل حذف المتدرب. يرجى المحاولة مرة أخرى.');
      setTrainees(originalTrainees);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditTrainee = (trainee: Trainee) => {
    window.open(`/dashboard/trainees/${trainee.id}/edit`, '_blank');
  };

  const handleOpenNotes = (trainee: Trainee) => {
    setSelectedTraineeForNotes(trainee);
    setShowNotesModal(true);
  };
  
  const handleOpenGrades = async (trainee: Trainee) => {
    setShowGradesModal(true);
    setGradesLoading(true);
    try {
      const gradesData = await getTraineeGradesDetailed(trainee.id);
      
      // gradesData.contentGrades is the array we need
      const grades = gradesData?.contentGrades || [];
      
      setSelectedTraineeForGrades({ trainee, grades });
    } catch (error: any) {
      console.error('Error loading grades:', error);
      if (error.status !== 404) {
        toast.error('حدث خطأ في تحميل الدرجات');
      }
      setSelectedTraineeForGrades({ trainee, grades: [] });
    } finally {
      setGradesLoading(false);
    }
  };

  const handleDeleteTrainee = (trainee: Trainee) => {
    openDeleteModal(trainee);
  };

  const openDeleteModal = async (trainee: Trainee) => {
    setTraineeToDelete(trainee);
    setIsDeleteModalOpen(true);
    setDeletionPreview(null);
    setIsDeletionPreviewLoading(true);

    try {
      const preview = await fetchAPI(`/trainees/${trainee.id}/deletion-preview`);
      setDeletionPreview(preview);
    } catch (error: any) {
      console.error('Error loading deletion preview:', error);
      toast.error('حدث خطأ في تحميل معاينة الحذف');
      // عرض المودال بدون معاينة للسماح بالحذف على أي حال
      setDeletionPreview({ items: [], totalRecords: 0, hasFinancialData: false });
    } finally {
      setIsDeletionPreviewLoading(false);
    }
  };

  const handleOpenApplicationForm = (traineeId: number) => {
    const printFormUrl = `/print/application-form/${traineeId}`;
    window.open(printFormUrl, '_blank');
  };

  // دالة لمعالجة بيانات مدفوعات المتدرب
  const processTraineePaymentsData = async (trainee: Trainee, paymentsData: any[]) => {
    try {
      setIsLoadingFinancialInfo(true);
      
      // تصفية المدفوعات غير المكتملة (التي لها رصيد متبقي)
      const incompletePayments = paymentsData.filter((payment: any) => {
        const feeAmount = payment.fee?.amount || 0;
        const paidAmount = payment.paidAmount || 0;
        return paidAmount < feeAmount; // الرسوم غير مدفوعة بالكامل
      });
      
      // حساب المجاميع المالية
      const totalFees = incompletePayments.reduce((sum: number, payment: any) => sum + (payment.fee?.amount || 0), 0);
      const totalPaid = incompletePayments.reduce((sum: number, payment: any) => sum + (payment.paidAmount || 0), 0);
      const remaining = totalFees - totalPaid;
      const currency = incompletePayments[0]?.safe?.currency || 'EGP';
      
      const updatedFinancialInfo = {
        totalFees,
        totalPaid,
        remaining,
        currency,
        availablePayments: incompletePayments
      };
      
      setTraineeFinancialInfo(updatedFinancialInfo);
      
      // الحفاظ على القيمة الافتراضية 0 للمبلغ
      paymentForm.setValue('amount', 0);
      
      return updatedFinancialInfo;
      
    } catch (error) {
      console.error('Error processing payments data:', error);
      throw error;
    } finally {
      setIsLoadingFinancialInfo(false);
    }
  };

  // دالة منفصلة لجلب البيانات المالية المحدثة للمتدرب
  const refreshTraineeFinancialData = async (trainee: Trainee) => {
    try {
      setIsLoadingFinancialInfo(true);
      
      // جلب مدفوعات المتدرب المحدثة
      const traineePaymentsResponse = await fetchAPI(`/finances/trainees/${trainee.id}/payments`);
      
      return await processTraineePaymentsData(trainee, traineePaymentsResponse);
      
    } catch (error) {
      console.error('Error refreshing financial data:', error);
      toast.error('حدث خطأ في تحديث البيانات');
      return null;
    }
  };

  const handleOpenPaymentModal = async (trainee: Trainee) => {
    // عرض رسالة إيقاف الدفع بدلاً من فتح نافذة الدفع
    setSelectedTraineeForPayment(trainee);
    setShowPaymentDisabledDialog(true);
  };

  // دالة التوجه إلى صفحة رسوم المتدربين
  const handleGoToPaymentsPage = () => {
    setShowPaymentDisabledDialog(false);
    router.push('/dashboard/finances/trainee-payments');
  };

  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    const currencySymbol = currency === 'EGP' ? 'ج.م' : currency === 'SAR' ? 'ر.س' : currency;
    return `${amount.toFixed(2)} ${currencySymbol}`;
  };

  // دالة عرض modal التأكيد
  const showConfirm = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      message: config.message,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        config.onConfirm();
      },
      type: config.type,
      confirmText: config.confirmText,
      isLoading: false
    });
  };

  // دالة إنشاء العمولة
  const handleCreateCommission = async (commissionData: {
    marketingEmployeeId: number;
    traineeId: number;
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
    amount: number;
    description?: string;
  }) => {
    try {
      const response = await fetchAPI('/commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commissionData),
      });

      if (response.success) {
        toast.success('تم إنشاء العمولة بنجاح');
      } else {
        toast.error('حدث خطأ أثناء إنشاء العمولة');
      }
    } catch (error) {
      console.error('Error creating commission:', error);
      toast.error('حدث خطأ أثناء إنشاء العمولة');
    }
  };


  // دالة فتح مربع العمولة
  const handleOpenCommissionModal = (
    marketingEmployeeId: number,
    marketingEmployeeName: string,
    traineeId: number,
    traineeName: string,
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT'
  ) => {
    setSelectedCommissionData({
      marketingEmployeeId,
      marketingEmployeeName,
      traineeId,
      traineeName,
      type,
    });
    setShowCommissionModal(true);
  };

  // معالجة طلب التأكيد
  const handlePaymentRequest = async (values: z.infer<typeof paymentFormSchema>) => {
    if (!selectedTraineeForPayment || !traineeFinancialInfo) return;
    
    if (values.amount > traineeFinancialInfo.remaining) {
      toast.error(`المبلغ المدفوع لا يمكن أن يتجاوز المبلغ المتبقي الإجمالي: ${formatCurrency(traineeFinancialInfo.remaining, traineeFinancialInfo.currency)}`);
      return;
    }

    // حفظ بيانات الدفع وإظهار رسالة التأكيد
    setPendingPaymentData(values);
    setShowConfirmationDialog(true);
  };

  // معالجة إرسال الدفعة بعد التأكيد
  const handlePaymentSubmit = async () => {
    if (!selectedTraineeForPayment || !traineeFinancialInfo || !pendingPaymentData) return;

    try {
      setIsProcessingPayment(true);
      setShowConfirmationDialog(false);
      
      // استخدام نظام الدفع التلقائي الجديد
      const result = await processAutoPayment({
        traineeId: selectedTraineeForPayment.id,
        amount: Number(pendingPaymentData.amount),
        safeId: pendingPaymentData.safeId,
        notes: pendingPaymentData.notes,
      });

      // إظهار رسالة النجاح مع خيارات الطباعة والعودة
      setPaymentSuccess({
        show: true,
        message: result.message || 'تم تسجيل الدفعة بنجاح',
        traineeId: selectedTraineeForPayment.id
      });
      
      // إعادة تعيين النموذج والبيانات المؤقتة
      paymentForm.reset();
      setPendingPaymentData(null);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // تحميل الرسوم التي لها جداول سداد عند فتح Modal
  useEffect(() => {
    if (showPaymentExceptionModal && selectedTraineeForException) {
      loadFeesWithSchedules(selectedTraineeForException.id);
    }
  }, [showPaymentExceptionModal, selectedTraineeForException]);

  const loadFeesWithSchedules = async (traineeId: number) => {
    try {
      setLoadingFeesWithSchedules(true);
      const fees = await fetchAPI(`/trainees/${traineeId}/fees-with-schedules`);
      setFeesWithSchedules(fees || []);
    } catch (error: any) {
      console.error('Error loading fees with schedules:', error);
      toast.error('حدث خطأ في تحميل قائمة الرسوم');
      setFeesWithSchedules([]);
    } finally {
      setLoadingFeesWithSchedules(false);
    }
  };

  // فلترة المتدربين محلياً (فقط للفلاتر المحلية، البحث والترتيب يتم من الخادم)
  const filteredTrainees = useMemo(() => {
    return trainees.filter(trainee => {
      const matchesProgram = filterProgram === 'ALL' || trainee.programId === Number(filterProgram);
      const matchesGender = filterGender === 'ALL' || trainee.gender === filterGender;
      const matchesProgramType = filterProgramType === 'ALL' || trainee.programType === filterProgramType;
      
      // فلاتر متقدمة
      const matchesGovernorate = !filterGovernorate || (trainee as any).governorate === filterGovernorate;
      const matchesCity = !filterCity || (trainee as any).city === filterCity;
      
      // فلتر تاريخ الميلاد
      let matchesBirthDate = true;
      if (filterBirthDateFrom || filterBirthDateTo) {
        const traineeBirthDate = (trainee as any).birthDate ? new Date((trainee as any).birthDate) : null;
        if (traineeBirthDate) {
          if (filterBirthDateFrom) {
            const fromDate = new Date(filterBirthDateFrom);
            if (traineeBirthDate < fromDate) matchesBirthDate = false;
          }
          if (filterBirthDateTo) {
            const toDate = new Date(filterBirthDateTo);
            if (traineeBirthDate > toDate) matchesBirthDate = false;
          }
        } else {
          matchesBirthDate = false;
        }
      }
      
      return matchesProgram && matchesGender && matchesProgramType &&
             matchesGovernorate && matchesCity && matchesBirthDate;
    });
  }, [filterProgram, filterGender, filterProgramType, trainees,
      filterGovernorate, filterCity, filterBirthDateFrom, filterBirthDateTo]);
  
  const programOptions = [
    { value: 'ALL', label: 'كل البرامج' },
    ...programs.map(p => ({ value: p.id.toString(), label: p.nameAr }))
  ];
  
  const genderOptions = [
    { value: 'ALL', label: 'الكل (الجنس)' },
    { value: 'MALE', label: 'ذكر' },
    { value: 'FEMALE', label: 'أنثى' },
  ];
  
  const programTypeOptions = [
    { value: 'ALL', label: 'كل الأنواع' },
    { value: 'SUMMER', label: 'صيفي (فبراير)' },
    { value: 'WINTER', label: 'شتوي (اكتوبر)' },
    { value: 'ANNUAL', label: 'سنوي' },
  ];

  const sortOptions = [
    { value: 'name', label: 'الترتيب الأبجدي' },
    { value: 'id', label: 'رقم الملف' },
  ];

  const sortOrderOptions = [
    { value: 'asc', label: 'ترتيب A-Z' },
    { value: 'desc', label: 'ترتيب Z-A' },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tiba-gray-50">
        <Card className="max-w-md mx-auto text-center">
          <div className="p-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-tiba-danger-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-tiba-gray-800 mb-2">يرجى تسجيل الدخول</h2>
            <p className="text-tiba-gray-600">يرجى تسجيل الدخول للوصول إلى هذه الصفحة.</p>
          </div>
        </Card>
      </div>
    );
  }


  return (
    <div>
      <PageHeader
        title="إدارة المتدربين"
        description="عرض وإدارة جميع المتدربين المسجلين في البرامج المختلفة."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين' }
        ]}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <ProtectedNavigation
              requiredPermission={{ resource: 'dashboard.trainees', action: 'export_data' }}
              fallback={null}
            >
              <Button
                onClick={() => setShowStatisticsModal(true)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
              >
                الإحصائيات
              </Button>
            </ProtectedNavigation>
            
            <ProtectedNavigation
              requiredPermission={{ resource: 'dashboard.trainees', action: 'export_data' }}
              fallback={null}
            >
              <Link href="/dashboard/trainees/export" className="block">
                <Button
                  variant="outline"
                  leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  className="bg-gradient-to-r from-tiba-secondary-500 to-tiba-secondary-600 text-white border-0 hover:from-tiba-secondary-600 hover:to-tiba-secondary-700 shadow-sm text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
                >
                  استخراج البيانات
                </Button>
              </Link>
            </ProtectedNavigation>
            
            <ProtectedNavigation
              requiredPermission={{ resource: 'dashboard.trainees', action: 'create' }}
              fallback={
                <div className="text-sm text-slate-500 bg-slate-100 px-4 py-3 rounded-lg text-center">
                  قراءة فقط
                </div>
              }
            >
              <Link href="/dashboard/trainees/new" className="block">
                <Button leftIcon={<PlusIcon className="w-4 h-4" />} className="text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center">
                  إضافة متدرب جديد
                </Button>
              </Link>
            </ProtectedNavigation>
          </div>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-tiba-danger-50 border border-tiba-danger-200 rounded-lg">
          <p className="text-sm text-tiba-danger-700 text-center">{error}</p>
        </div>
      )}

      
      <Card className="mb-6">
        <div className="p-4">
          <div className="space-y-4">
            {/* شريط البحث - يأخذ العرض الكامل على جميع الشاشات */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="بحث بالاسم، الايميل، أو الهاتف..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pr-4 pl-4 h-11 sm:h-12 text-sm sm:text-base border-slate-300 focus:border-tiba-primary-500 focus:ring-1 focus:ring-tiba-primary-200"
                />
              </div>
              
              {/* زر البحث */}
              <Button
                onClick={handleSearch}
                className="h-11 sm:h-12 px-4 sm:px-6 bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white shadow-sm text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                )}
                بحث
              </Button>
              
              {/* زر المسح */}
              {(searchInput || searchQuery) && (
                <Button
                  onClick={handleClearSearch}
                  variant="outline"
                  className="h-11 sm:h-12 px-4 sm:px-6 border-slate-300 hover:bg-slate-50 text-slate-700 text-sm sm:text-base"
                  disabled={loading}
                >
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  مسح
                </Button>
              )}
            </div>
            
            {/* مؤشر البحث النشط */}
            {searchQuery && (
              <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-4 w-4 text-tiba-primary-600" />
                    <span className="text-sm font-medium text-tiba-primary-800">
                      البحث النشط: "{searchQuery}" - وجد {pagination.total} نتيجة
                    </span>
                  </div>
                  <Button
                    onClick={handleClearSearch}
                    size="sm"
                    variant="ghost"
                    className="text-tiba-primary-600 hover:text-tiba-primary-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* الفلاتر - متجاوبة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <SearchableSelect
                options={programOptions}
                value={filterProgram}
                onChange={(value) => setFilterProgram(value)}
                placeholder="تصفية حسب البرنامج"
                instanceId="program-filter-select"
              />
              <SimpleSelect
                options={genderOptions}
                value={filterGender}
                onChange={(value) => setFilterGender(value)}
                instanceId="gender-filter-select"
              />
              <SimpleSelect
                options={programTypeOptions}
                value={filterProgramType}
                onChange={(value) => setFilterProgramType(value)}
                instanceId="program-type-filter-select"
              />
              
              {/* فلاتر الترتيب */}
              <SimpleSelect
                options={sortOptions}
                value={sortBy}
                onChange={(value) => setSortBy(value)}
                instanceId="sort-by-select"
              />
              <SimpleSelect
                options={sortOrderOptions}
                value={sortOrder}
                onChange={(value) => setSortOrder(value)}
                instanceId="sort-order-select"
              />
            </div>

            {/* زر الفلاتر المتقدمة */}
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant="outline"
                size="sm"
                className="text-sm"
                leftIcon={<FunnelIcon className="w-4 h-4" />}
              >
                {showAdvancedFilters ? 'إخفاء الفلاتر المتقدمة' : 'إظهار المزيد من الفلاتر'}
              </Button>
            </div>

            {/* الفلاتر المتقدمة - قابلة للطي */}
            {showAdvancedFilters && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <FunnelIcon className="w-5 h-5 text-tiba-primary-600" />
                  <h4 className="font-semibold text-slate-900">فلاتر متقدمة</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* فلتر المحافظة */}
                  <div>
                    <Label className="text-sm text-slate-700 mb-2">المحافظة</Label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'جميع المحافظات' },
                        ...egyptGovernoratesAndCities.map(g => ({ value: g.value, label: g.label }))
                      ]}
                      value={filterGovernorate}
                      onChange={(value) => {
                        setFilterGovernorate(value);
                        setFilterCity(''); // إعادة تعيين المدينة
                      }}
                      placeholder="اختر المحافظة"
                      instanceId="governorate-filter"
                    />
                  </div>

                  {/* فلتر المدينة */}
                  <div>
                    <Label className="text-sm text-slate-700 mb-2">المدينة</Label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'جميع المدن' },
                        ...(filterGovernorate
                          ? getCitiesByGovernorate('EG', filterGovernorate).map(c => ({ value: c.value, label: c.label }))
                          : []
                        )
                      ]}
                      value={filterCity}
                      onChange={(value) => setFilterCity(value)}
                      placeholder={filterGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"}
                      disabled={!filterGovernorate}
                      instanceId="city-filter"
                    />
                  </div>

                  {/* فلتر تاريخ الميلاد من */}
                  <div>
                    <TibaDatePicker
                      label="تاريخ الميلاد من"
                      value={filterBirthDateFrom}
                      onChange={(value: string) => setFilterBirthDateFrom(value)}
                      size="sm"
                      clearable
                    />
                  </div>

                  {/* فلتر تاريخ الميلاد إلى */}
                  <div>
                    <TibaDatePicker
                      label="تاريخ الميلاد إلى"
                      value={filterBirthDateTo}
                      onChange={(value: string) => setFilterBirthDateTo(value)}
                      size="sm"
                      clearable
                    />
                  </div>

                </div>

                {/* زر مسح الفلاتر المتقدمة */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      setFilterGovernorate('');
                      setFilterCity('');
                      setFilterBirthDateFrom('');
                      setFilterBirthDateTo('');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    مسح الفلاتر المتقدمة
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card data-table-container>
        <DataTable
          data={filteredTrainees}
          columns={[
            {
              header: 'المتدرب',
              accessor: (row) => (
                <TraineeInfo
                  trainee={row}
                  onOpenApplicationForm={handleOpenApplicationForm}
                  onOpenPhoto={(photoUrl, name, nationalId) => {
                    setSelectedPhoto({ photoUrl, name, nationalId });
                    setShowPhotoModal(true);
                  }}
                />
              ),
              className: 'min-w-0'
            },
            { 
              header: 'البرنامج', 
              accessor: (row) => row.program?.nameAr || 'غير محدد',
              className: 'hidden sm:table-cell'
            },
            { 
              header: 'العام الدراسي', 
              accessor: (row) => row.academicYear || 'غير محدد',
              className: 'hidden lg:table-cell'
            },
            { 
              header: 'رقم الملف', 
              accessor: (row) => 
                <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                  #{row.id}
                </span>,
              className: 'hidden sm:table-cell'
            },
            { 
              header: 'الجنس', 
              accessor: (row) => {
                const isMale = row.gender === 'MALE';
                return (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isMale ? 'bg-tiba-primary-100 text-tiba-primary-800' : 'bg-pink-100 text-pink-800'}`}>
                    {isMale ? 'ذكر' : 'أنثى'}
                  </span>
                );
              },
              className: 'hidden sm:table-cell'
            },
            ...(canViewPhone ? [{
              header: 'رقم الهاتف',
              accessor: (row: any) => (
                <span className="text-sm text-slate-900 font-medium" dir="ltr">
                  {row.phone || 'غير متوفر'}
                </span>
              ),
              className: 'table-cell' // عرض رقم الهاتف على جميع الشاشات بما في ذلك الهواتف المحمولة
            }] : []),
            {
              header: 'الإجراءات',
              accessor: (trainee) => (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 w-full">
                  <div className="flex items-center gap-2">
                    {/* زر التعديل */}
                    {canEditTrainees ? (
                      <EditButton trainee={trainee} onEdit={handleEditTrainee} />
                    ) : (
                      <ButtonSkeleton />
                    )}
                    
                    {/* زر الدفع */}
                    {canManageTraineeFinances ? (
                      <PaymentButton traineeId={trainee.id} />
                    ) : (
                      <ButtonSkeleton />
                    )}
                  </div>
                  
                  {/* قائمة الإجراءات */}
                  {canAccessTraineeActions ? (
                    <ActionMenu
                      trainee={trainee}
                      onEdit={handleEditTrainee}
                      onDelete={handleDeleteTrainee}
                      onOpenNotes={handleOpenNotes}
                      onOpenGrades={handleOpenGrades}
                      onShowConfirm={showConfirm}
                      onOpenAdditionalFees={handleOpenAdditionalFees}
                      fetchTrainees={fetchTrainees}
                      pagination={pagination}
                      setFeesCheckResult={setFeesCheckResult}
                      setShowFeesCheckModal={setShowFeesCheckModal}
                      canEdit={canEditTrainees}
                      canDelete={canDeleteTrainees}
                      canManageFinances={canManageTraineeFinances}
                      canTransferGroups={canTransferGroups}
                      canManagePaymentExceptions={canManagePaymentExceptions}
                      canManageDisciplinaryActions={canManageDisciplinaryActions}
                      onOpenPaymentException={(trainee: Trainee) => {
                        setSelectedTraineeForException(trainee);
                        setShowPaymentExceptionModal(true);
                      }}
                      onViewExceptions={async (trainee: Trainee) => {
                        setSelectedTraineeForExceptionsList(trainee);
                        setShowExceptionsListModal(true);
                        setLoadingExceptionsList(true);
                        try {
                          const exceptions = await fetchAPI(`/trainees/${trainee.id}/payment-exceptions`);
                          setExceptionsList(exceptions || []);
                        } catch (error: any) {
                          console.error('Error loading exceptions:', error);
                          toast.error('حدث خطأ في تحميل قائمة الاستثناءات');
                          setExceptionsList([]);
                        } finally {
                          setLoadingExceptionsList(false);
                        }
                      }}
                      onOpenDisciplinaryActions={(trainee: Trainee) => {
                        setSelectedTraineeForDisciplinary(trainee);
                        setShowDisciplinaryModal(true);
                      }}
                      onViewDisciplinaryActions={async (trainee: Trainee) => {
                        setSelectedTraineeForDisciplinaryList(trainee);
                        setShowDisciplinaryListModal(true);
                        setLoadingDisciplinaryList(true);
                        try {
                          const actions = await fetchAPI(`/disciplinary-actions?traineeId=${trainee.id}`);
                          setDisciplinaryActionsList(actions || []);
                        } catch (error: any) {
                          console.error('Error loading disciplinary actions:', error);
                          toast.error('حدث خطأ في تحميل قائمة الإجراءات العقابية');
                          setDisciplinaryActionsList([]);
                        } finally {
                          setLoadingDisciplinaryList(false);
                        }
                      }}
                    />
                  ) : (
                    <ButtonSkeleton />
                  )}
                </div>
              ),
              className: 'w-32'
            },
          ]}
          keyField="id"
          isLoading={loading}
          emptyMessage="لا يوجد متدربين لعرضهم"
        />
        
        {/* مؤشر التحميل */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 bg-tiba-primary-50 px-4 py-3 rounded-lg border border-tiba-primary-200">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-tiba-primary-600"></div>
              <span className="text-tiba-primary-800 font-medium">جاري تحميل البيانات...</span>
            </div>
          </div>
        )}

        {/* مكون Pagination */}
        {!loading && pagination.total > 0 && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              isLoading={loading}
              showLimitSelector={true}
              limitOptions={[10, 20, 30, 50, 100]}
            />
          </div>
        )}

        {/* رسالة عدم وجود نتائج */}
        {!loading && pagination.total === 0 && (
          <div className="text-center py-12">
            <div className="bg-gradient-to-r from-slate-50 to-tiba-primary-50 p-8 rounded-xl border border-slate-200 max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                {searchQuery ? (
                  <MagnifyingGlassIcon className="w-8 h-8 text-slate-400" />
                ) : (
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
              </div>
              
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد نتائج للبحث</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    لم يتم العثور على متدربين يطابقون البحث: <strong>"{searchQuery}"</strong>
                  </p>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500">جرب:</p>
                    <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                      <li>تأكد من صحة الإملاء</li>
                      <li>استخدم كلمات أقل أو مختلفة</li>
                      <li>ابحث باستخدام رقم الهاتف أو الهوية</li>
                    </ul>
                    <Button
                      onClick={handleClearSearch}
                      variant="outline"
                      size="sm"
                      className="mt-3 mx-auto"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      مسح البحث وعرض جميع المتدربين
                    </Button>
                  </div>
                </>
              ) : filterProgram !== 'ALL' ? (
                <>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">لا يوجد متدربين في هذا البرنامج</h3>
                  <p className="text-slate-600 text-sm">
                    لا يوجد متدربين مسجلين في البرنامج المحدد حالياً
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">لا يوجد متدربين</h3>
                  <p className="text-slate-600 text-sm">
                    لم يتم تسجيل أي متدربين في النظام بعد
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
      
      {/* نافذة دفع الرسوم */}
      <TibaModal
        open={!!(isPaymentModalOpen && selectedTraineeForPayment)}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedTraineeForPayment(null);
          setTraineeFinancialInfo(null);
          setPaymentSuccess(null);
          paymentForm.reset();
        }}
        variant="secondary"
        size="md"
        title="دفع رسوم المتدرب"
        icon={<CreditCardIcon className="w-full h-full" />}
        footer={
          (!paymentSuccess || !paymentSuccess.show) ? (
            <div className="flex justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                className="text-sm px-3 py-1.5"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedTraineeForPayment(null);
                  setTraineeFinancialInfo(null);
                  setPaymentSuccess(null);
                  paymentForm.reset();
                }}
                disabled={isProcessingPayment}
              >
                {traineeFinancialInfo && traineeFinancialInfo.remaining <= 0 ? 'إغلاق' : 'إلغاء'}
              </Button>
              
              {traineeFinancialInfo && traineeFinancialInfo.remaining > 0 && !isLoadingFinancialInfo && (
                <Button
                  type="submit"
                  form="payment-form"
                  className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white text-sm px-3 py-1.5"
                  disabled={isProcessingPayment}
                  onClick={paymentForm.handleSubmit(handlePaymentRequest)}
                >
                  {isProcessingPayment ? 'جاري المعالجة...' : 'تسجيل الدفعة'}
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        <TibaTraineeInfo
          name={selectedTraineeForPayment?.nameAr || ''}
          nationalId={selectedTraineeForPayment?.nationalId || ''}
          variant="secondary"
        />

        {/* معلومات الرسوم المالية */}
        <div className="mb-3">
          {isLoadingFinancialInfo ? (
            <div className="p-2 bg-tiba-primary-50 rounded text-center">
              <p className="text-xs text-tiba-primary-600">جاري التحميل...</p>
            </div>
          ) : traineeFinancialInfo ? (
            <>
              {traineeFinancialInfo.remaining <= 0 ? (
                <div className="p-2 bg-tiba-secondary-50 border border-tiba-secondary-200 rounded text-center">
                  <p className="text-sm font-medium text-tiba-secondary-800">✅ مدفوعة بالكامل</p>
                  <p className="text-xs text-tiba-secondary-600">
                    المدفوع: {formatCurrency(traineeFinancialInfo.totalPaid, traineeFinancialInfo.currency)}
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-tiba-warning-50 border border-tiba-warning-200 rounded text-center">
                  <p className="text-sm font-medium text-tiba-warning-800">💰 متبقي رسوم</p>
                  <p className="text-xs text-tiba-warning-700">
                    المتبقي: <span className="font-bold">{formatCurrency(traineeFinancialInfo.remaining, traineeFinancialInfo.currency)}</span>
                  </p>
                  <p className="text-xs text-tiba-warning-600 mt-1">
                    عدد الرسوم: {traineeFinancialInfo.availablePayments?.length || 0}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-2 bg-tiba-danger-50 border border-tiba-danger-200 rounded text-center">
              <p className="text-xs text-tiba-danger-600">خطأ في التحميل</p>
            </div>
          )}
        </div>

        {/* نموذج الدفع - يظهر فقط إذا كان هناك رسوم متبقية */}
        {traineeFinancialInfo && traineeFinancialInfo.remaining > 0 && !isLoadingFinancialInfo && (
          <form onSubmit={paymentForm.handleSubmit(handlePaymentRequest)} className="space-y-3">
            {/* معلومات توضيحية عن النظام الجديد */}
            <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded p-2">
              <p className="text-xs text-tiba-primary-700 text-center">
                🔄 <strong>دفع تلقائي:</strong> سيتم توزيع المبلغ على الرسوم من الأقدم للأحدث
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                المبلغ المدفوع * (الحد الأقصى: {formatCurrency(traineeFinancialInfo.remaining, traineeFinancialInfo.currency)})
              </label>
              <Input
                type="number"
                step="0.01"
                max={traineeFinancialInfo.remaining}
                {...paymentForm.register('amount')}
                className="w-full h-8 text-sm"
                placeholder="0.00"
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-xs text-tiba-danger-600 mt-1">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <SimpleSelect
                label="الخزينة المستقبلة للدفع *"
                options={[
                  { value: '', label: 'اختر الخزينة' },
                  ...safes.map((safe) => ({
                    value: String(safe.id),
                    label: `${safe.name} (${safe.currency})`
                  }))
                ]}
                value={paymentForm.watch('safeId') || ''}
                onChange={(value) => paymentForm.setValue('safeId', value, { shouldValidate: true })}
                instanceId="payment-safe-select"
              />
              {paymentForm.formState.errors.safeId && (
                <p className="text-xs text-tiba-danger-600 mt-1">
                  {paymentForm.formState.errors.safeId.message}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                💡 لا تظهر الخزائن التي مفروض عليها رسوم لتجنب التعارض
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ملاحظات
              </label>
              <textarea
                {...paymentForm.register('notes')}
                className="w-full p-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500"
                rows={2}
                placeholder="ملاحظات إضافية (اختياري)"
              />
            </div>
          </form>
        )}
      </TibaModal>

      {/* نافذة تأكيد الدفع */}
      <TibaModal
        open={!!(showConfirmationDialog && selectedTraineeForPayment && pendingPaymentData)}
        onClose={() => { setShowConfirmationDialog(false); setPendingPaymentData(null); }}
        variant="warning"
        size="sm"
        title="تأكيد الدفع"
        subtitle="هل أنت متأكد من تسجيل هذه الدفعة؟"
        icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
        zIndex={260}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmationDialog(false);
                setPendingPaymentData(null);
              }}
              disabled={isProcessingPayment}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1 bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
              onClick={handlePaymentSubmit}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? 'جاري المعالجة...' : 'تأكيد الدفع'}
            </Button>
          </div>
        }
      >
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">المتدرب:</span>
              <span className="font-medium">{selectedTraineeForPayment?.nameAr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">المبلغ المدفوع:</span>
              <span className="font-bold text-tiba-secondary-600">
                {pendingPaymentData && formatCurrency(Number(pendingPaymentData.amount), traineeFinancialInfo?.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">الخزينة:</span>
              <span className="font-medium">
                {pendingPaymentData && safes.find(s => s.id === pendingPaymentData.safeId)?.name}
              </span>
            </div>
            {pendingPaymentData?.notes && (
              <div className="flex justify-between">
                <span className="text-slate-600">الملاحظات:</span>
                <span className="font-medium">{pendingPaymentData.notes}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-tiba-primary-700 text-center">
              🔄 سيتم توزيع المبلغ تلقائياً على الرسوم من الأقدم للأحدث
            </p>
          </div>
        </div>
      </TibaModal>

      {/* نافذة النجاح المنفصلة */}
      <TibaModal
        open={!!(paymentSuccess && paymentSuccess.show)}
        onClose={() => {
          setPaymentSuccess(null);
          setIsPaymentModalOpen(false);
          setSelectedTraineeForPayment(null);
          setTraineeFinancialInfo(null);
          paymentForm.reset();
        }}
        variant="secondary"
        size="sm"
        title="تم الدفع بنجاح! 🎊"
        icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        zIndex={270}
        footer={
          <div className="space-y-3 w-full">
            <Button
              className="w-full bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white font-medium py-3 text-base shadow-md hover:shadow-lg transition-all duration-200"
              onClick={() => {
                window.open(`/print/trainee-payments/${paymentSuccess?.traineeId}`, '_blank');
              }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة الإيصال
            </Button>
            <Button
              variant="outline"
              className="w-full border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium py-3 text-base transition-all duration-200"
              onClick={() => {
                setPaymentSuccess(null);
                setIsPaymentModalOpen(false);
                setSelectedTraineeForPayment(null);
                setTraineeFinancialInfo(null);
                paymentForm.reset();
              }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              العودة للقائمة
            </Button>
          </div>
        }
      >
        <div className="bg-tiba-secondary-50 border border-tiba-secondary-200 rounded-xl p-4">
          <p className="text-sm text-tiba-secondary-800 font-medium mb-2">تفاصيل العملية:</p>
          <p className="text-xs text-tiba-secondary-700 leading-relaxed">{paymentSuccess?.message}</p>
        </div>
      </TibaModal>

      {/* نافذة إيقاف الدفع مؤقتاً */}
      <TibaModal
        open={!!(showPaymentDisabledDialog && selectedTraineeForPayment)}
        onClose={() => { setShowPaymentDisabledDialog(false); setSelectedTraineeForPayment(null); }}
        variant="warning"
        size="sm"
        title="الدفع معطل مؤقتاً ⚡"
        icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        zIndex={260}
        footer={
          <div className="space-y-3 w-full">
            <Button
              onClick={handleGoToPaymentsPage}
              className="w-full bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white border-0 shadow-md"
            >
              <CreditCardIcon className="ml-2 h-4 w-4" />
              الانتقال لصفحة رسوم المتدربين 💳
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDisabledDialog(false);
                setSelectedTraineeForPayment(null);
              }}
              className="w-full text-slate-600 border-slate-300"
            >
              إغلاق
            </Button>
          </div>
        }
      >
        <TibaTraineeInfo name={selectedTraineeForPayment?.nameAr || ''} nationalId={selectedTraineeForPayment?.nationalId || ''} variant="warning" />

        <TibaModalAlert variant="warning" title="تحديث صفحة المتدربين">
          نظام الدفع معطل مؤقتاً فقط من صفحة المتدربين هذه للصيانة والتحديث.
          النظام المالي يعمل بشكل طبيعي ويمكنك الدفع بسهولة من صفحة &quot;رسوم المتدربين&quot; المخصصة.
          سيعود الدفع من هذه الصفحة قريباً بمميزات أفضل! 🚀
        </TibaModalAlert>
      </TibaModal>

      <TibaModal
        open={!!(isDeleteModalOpen && traineeToDelete)}
        onClose={() => { setIsDeleteModalOpen(false); setTraineeToDelete(null); }}
        variant="danger"
        size="lg"
        title="تأكيد حذف المتدرب"
        subtitle={`${traineeToDelete?.nameAr || ''} — ${traineeToDelete?.nationalId || ''}`}
        icon={<ExclamationTriangleIcon className="w-full h-full" />}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <p className="text-xs text-tiba-danger-600 font-medium">هذا الإجراء لا يمكن التراجع عنه</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setIsDeleteModalOpen(false); setDeletionPreview(null); }} disabled={isDeleting}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeletionPreviewLoading || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full ml-2"></span>
                    جاري الحذف...
                  </>
                ) : (
                  'حذف المتدرب وجميع بياناته'
                )}
              </Button>
            </div>
          </div>
        }
      >
        {isDeletionPreviewLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-tiba-danger-100 border-t-tiba-danger-600 mb-4"></div>
            <p className="text-sm text-slate-500">جاري تحميل بيانات المتدرب...</p>
          </div>
        ) : deletionPreview ? (
          <>
            {deletionPreview.items.length > 0 ? (
              <>
                <div className="bg-tiba-warning-50 border border-tiba-warning-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-bold text-tiba-warning-800 mb-1">⚠️ تحذير: سيتم حذف جميع البيانات التالية نهائياً</p>
                  <p className="text-xs text-tiba-warning-700">إجمالي السجلات: <span className="font-bold text-tiba-warning-900">{deletionPreview.totalRecords}</span> سجل</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {deletionPreview.items.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      item.icon === 'payments' || item.icon === 'exceptions' || item.icon === 'deferrals'
                        ? 'bg-tiba-danger-50 border-tiba-danger-200'
                        : item.icon === 'commissions'
                          ? 'bg-tiba-primary-50 border-tiba-primary-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.icon === 'payments' || item.icon === 'exceptions' || item.icon === 'deferrals'
                          ? 'bg-tiba-danger-100 text-tiba-danger-700'
                          : item.icon === 'commissions'
                            ? 'bg-tiba-primary-100 text-tiba-primary-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        <span className="text-lg font-bold">{item.count}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.label}</p>
                        {item.details && <p className="text-xs text-tiba-danger-600 mt-0.5 truncate">{item.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ExclamationTriangleIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">لا توجد بيانات مرتبطة بهذا المتدرب</p>
              </div>
            )}
          </>
        ) : null}
      </TibaModal>

      {/* مربع العمولة */}
      {showCommissionModal && selectedCommissionData && (
        <CommissionModal
          isOpen={showCommissionModal}
          onClose={() => {
            setShowCommissionModal(false);
            setSelectedCommissionData(null);
          }}
          onSubmit={handleCreateCommission}
          marketingEmployeeId={selectedCommissionData.marketingEmployeeId}
          marketingEmployeeName={selectedCommissionData.marketingEmployeeName}
          traineeId={selectedCommissionData.traineeId}
          traineeName={selectedCommissionData.traineeName}
          type={selectedCommissionData.type}
        />
      )}

      {/* مربع الملاحظات */}
      {showNotesModal && selectedTraineeForNotes && (
        <TraineeNotesModal
          traineeId={selectedTraineeForNotes.id}
          traineeName={selectedTraineeForNotes.nameAr}
          isOpen={showNotesModal}
          onClose={() => {
            setShowNotesModal(false);
            setSelectedTraineeForNotes(null);
          }}
        />
      )}

      {/* مربع الدرجات (عرض فقط) */}
      <TibaModal
        open={showGradesModal}
        onClose={() => { setShowGradesModal(false); setSelectedTraineeForGrades(null); }}
        variant="secondary"
        size="full"
        title="درجات المتدرب"
        subtitle={selectedTraineeForGrades?.trainee ? `${selectedTraineeForGrades.trainee.nameAr} • ${selectedTraineeForGrades.trainee.nationalId}` : undefined}
        icon={<ChartBarIcon className="w-full h-full" />}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => { if (selectedTraineeForGrades?.trainee?.id) window.open(`/print/trainee-grades/${selectedTraineeForGrades.trainee.id}`, '_blank'); }}
              className="px-6 bg-gradient-to-r from-tiba-primary-600 to-tiba-primary-700 hover:from-tiba-primary-700 hover:to-tiba-primary-800 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              طباعة التقرير
            </Button>
            <Button variant="outline" onClick={() => { setShowGradesModal(false); setSelectedTraineeForGrades(null); }} className="px-6">إغلاق</Button>
          </div>
        }
      >
        {gradesLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-tiba-secondary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-tiba-secondary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 font-medium">جاري تحميل الدرجات...</p>
          </div>
        ) : !selectedTraineeForGrades?.grades || selectedTraineeForGrades.grades.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-2">لا توجد درجات مسجلة</p>
            <p className="text-slate-500">لم يتم رصد أي درجات لهذا المتدرب بعد</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {selectedTraineeForGrades.grades.map((item: any, idx: number) => {
              const gradeData = item.grade || {};
              const contentData = item.content || {};
              const maxMarksData = contentData.maxMarks || {};
              const maxTotal = maxMarksData.total || 0;
              const earnedTotal = gradeData.totalMarks || 0;
              const percentage = maxTotal > 0 ? (earnedTotal / maxTotal) * 100 : 0;

              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border-2 border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-tiba-secondary-600 text-white rounded-full flex items-center justify-center font-bold shadow flex-shrink-0">{idx + 1}</div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-lg font-bold text-slate-900 truncate">{contentData.name || 'مادة تدريبية'}</h4>
                          <p className="text-xs sm:text-sm text-slate-500">{contentData.code || ''}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl sm:text-3xl font-bold text-tiba-secondary-700">{percentage.toFixed(1)}%</p>
                        <p className="text-xs sm:text-sm text-slate-500">{earnedTotal.toFixed(1)} / {maxTotal}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                      {[
                        { label: 'أعمال السنة', value: gradeData.yearWorkMarks || 0, max: maxMarksData.yearWorkMarks || 0, accent: false },
                        { label: 'العملي', value: gradeData.practicalMarks || 0, max: maxMarksData.practicalMarks || 0, accent: false },
                        { label: 'التحريري', value: gradeData.writtenMarks || 0, max: maxMarksData.writtenMarks || 0, accent: false },
                        { label: 'الحضور', value: (gradeData.attendanceMarks || 0).toFixed(1), max: maxMarksData.attendanceMarks || 0, accent: true },
                        { label: 'اختبارات اونلاين', value: gradeData.quizzesMarks || 0, max: maxMarksData.quizzesMarks || 0, accent: false },
                        { label: 'الميد تيرم', value: gradeData.finalExamMarks || 0, max: maxMarksData.finalExamMarks || 0, accent: false },
                      ].map((g) => (
                        <div key={g.label} className={g.accent ? "bg-tiba-secondary-50 rounded-xl p-2.5 sm:p-4 border border-tiba-secondary-200" : "bg-slate-50 rounded-xl p-2.5 sm:p-4 border border-slate-200"}>
                          <p className={`text-[10px] sm:text-xs font-medium mb-1 sm:mb-2 ${g.accent ? 'text-tiba-secondary-700' : 'text-slate-600'}`}>{g.label}</p>
                          <div className="flex items-baseline gap-0.5 sm:gap-1">
                            <p className={`text-lg sm:text-2xl font-bold ${g.accent ? 'text-tiba-secondary-700' : 'text-slate-900'}`}>{g.value}</p>
                            <p className={`text-[10px] sm:text-sm ${g.accent ? 'text-tiba-secondary-600' : 'text-slate-500'}`}>/ {g.max}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm font-medium text-slate-700">التقدم</span>
                        <span className="text-xs sm:text-sm font-bold text-tiba-secondary-700">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 sm:h-3">
                        <div className="bg-gradient-to-r from-tiba-secondary-500 to-tiba-secondary-600 h-2.5 sm:h-3 rounded-full transition-all" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TibaModal>

      {/* Modal التأكيد */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        isLoading={confirmModal.isLoading}
      />

      {/* نافذة نتائج فحص الرسوم الدراسية */}
      <TibaModal
        open={!!(showFeesCheckModal && feesCheckResult)}
        onClose={() => setShowFeesCheckModal(false)}
        variant="primary"
        size="xl"
        title="تقرير فحص الرسوم"
        subtitle={feesCheckResult ? `${feesCheckResult.traineeName} • ${feesCheckResult.programName}` : ''}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        footer={
          <div className="flex justify-end gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setShowFeesCheckModal(false)} className="px-4 sm:px-6 text-sm">
              إغلاق
            </Button>
            {feesCheckResult && !feesCheckResult.isComplete && !feesCheckResult.fixSuccessful && (
              <Button 
                className="bg-tiba-warning-600 hover:bg-tiba-warning-700 text-white px-4 sm:px-6 text-sm"
                onClick={async () => {
                  setShowFeesCheckModal(false);
                  // إعادة تشغيل الفحص
                  setTimeout(() => {
                    const checkFeesBtn = document.querySelector('[data-action="check-fees"]') as HTMLElement;
                    checkFeesBtn?.click();
                  }, 500);
                }}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        }
      >
        {feesCheckResult && (
          <>
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg text-center border">
                <div className="text-lg sm:text-2xl font-bold text-slate-700">{feesCheckResult.totalProgramFees}</div>
                <div className="text-xs sm:text-sm text-slate-600">إجمالي الرسوم</div>
              </div>
              <div className="bg-tiba-secondary-50 p-3 sm:p-4 rounded-lg text-center border border-tiba-secondary-200">
                <div className="text-lg sm:text-2xl font-bold text-tiba-secondary-700">{feesCheckResult.appliedFees}</div>
                <div className="text-xs sm:text-sm text-tiba-secondary-600">مطبقة مسبقاً</div>
              </div>
              <div className="bg-tiba-warning-50 p-3 sm:p-4 rounded-lg text-center border border-tiba-warning-200">
                <div className="text-lg sm:text-2xl font-bold text-tiba-warning-700">{feesCheckResult.missingFees}</div>
                <div className="text-xs sm:text-sm text-tiba-warning-600">كانت ناقصة</div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg text-center border ${feesCheckResult.isComplete ? 'bg-tiba-secondary-50 border-tiba-secondary-200' : 'bg-tiba-warning-50 border-tiba-warning-200'}`}>
                <div className={`text-lg sm:text-2xl font-bold ${feesCheckResult.isComplete ? 'text-tiba-secondary-700' : 'text-tiba-warning-700'}`}>
                  {feesCheckResult.isComplete ? '✅' : '⚠️'}
                </div>
                <div className={`text-xs sm:text-sm ${feesCheckResult.isComplete ? 'text-tiba-secondary-600' : 'text-tiba-warning-600'}`}>
                  {feesCheckResult.isComplete ? 'مكتملة' : 'تحتاج إصلاح'}
                </div>
              </div>
            </div>

            {/* نتيجة عملية الإصلاح */}
            {feesCheckResult.fixAttempted && (
              <div className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 border ${feesCheckResult.fixSuccessful ? 'bg-tiba-secondary-50 border-tiba-secondary-200' : 'bg-tiba-danger-50 border-tiba-danger-200'}`}>
                <div className="flex items-center mb-2 sm:mb-3">
                  <span className="text-base sm:text-lg mr-2">{feesCheckResult.fixSuccessful ? '✅' : '❌'}</span>
                  <h4 className={`text-sm sm:text-base font-bold ${feesCheckResult.fixSuccessful ? 'text-tiba-secondary-800' : 'text-tiba-danger-800'}`}>
                    {feesCheckResult.fixSuccessful ? 'تم الإصلاح بنجاح!' : 'فشل في الإصلاح'}
                  </h4>
                </div>
                
                {feesCheckResult.fixResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-white p-2 sm:p-3 rounded border">
                      <div className="text-xs sm:text-sm text-slate-600">الرسوم المطبقة حديثاً</div>
                      <div className="text-sm sm:text-base font-bold text-tiba-secondary-700">{feesCheckResult.fixResult.appliedFeesCount || 0}</div>
                    </div>
                    <div className="bg-white p-2 sm:p-3 rounded border">
                      <div className="text-xs sm:text-sm text-slate-600">إجمالي المبلغ المطبق</div>
                      <div className="text-sm sm:text-base font-bold text-tiba-secondary-700">{(feesCheckResult.fixResult.totalAppliedAmount || 0).toLocaleString()} جنيه</div>
                    </div>
                    <div className="bg-white p-2 sm:p-3 rounded border">
                      <div className="text-xs sm:text-sm text-slate-600">الحالة</div>
                      <div className="text-sm sm:text-base font-bold text-tiba-secondary-700">{feesCheckResult.fixResult.success ? 'نجح' : 'فشل'}</div>
                    </div>
                  </div>
                )}
                
                {feesCheckResult.fixResult?.message && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white rounded border">
                    <div className="text-xs sm:text-sm"><strong>الرسالة:</strong> {feesCheckResult.fixResult.message}</div>
                  </div>
                )}
                
                {feesCheckResult.fixError && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white rounded border text-tiba-danger-600">
                    <div className="text-xs sm:text-sm"><strong>خطأ:</strong> {feesCheckResult.fixError}</div>
                  </div>
                )}
              </div>
            )}

            {/* تفاصيل الرسوم */}
            <div className="space-y-4 sm:space-y-6">
              
              {/* الرسوم المطبقة مسبقاً */}
              {feesCheckResult.appliedFeesList?.length > 0 && (
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-tiba-secondary-800 mb-2 sm:mb-3 flex items-center">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-tiba-secondary-500 rounded-full mr-2"></span>
                    الرسوم المطبقة مسبقاً ({feesCheckResult.appliedFeesList.length})
                  </h4>
                  <div className="border rounded-lg bg-tiba-secondary-50 max-h-40 sm:max-h-64 overflow-auto">
                    {feesCheckResult.appliedFeesList.map((f: any, index: number) => (
                      <div key={f.id} className={`p-2 sm:p-3 ${index > 0 ? 'border-t border-tiba-secondary-200' : ''} hover:bg-tiba-secondary-100 transition-colors`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base font-medium text-slate-900 truncate">{f.name}</div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-600 mt-1">
                              <span className={`inline-block px-2 py-1 rounded text-xs ${f.status === 'PAID' ? 'bg-tiba-secondary-100 text-tiba-secondary-700' : 'bg-tiba-warning-100 text-tiba-warning-700'}`}>
                                {f.status === 'PAID' ? 'مدفوع' : f.status === 'PENDING' ? 'قيد الانتظار' : f.status}
                              </span>
                              <span>مدفوع: {f.paidAmount} جنيه</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 mr-2">
                            <div className="text-sm sm:text-base font-bold text-tiba-secondary-700">{f.amount} جنيه</div>
                            <div className="text-xs text-tiba-secondary-600">✅ مطبقة مسبقاً</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* الرسوم التي تم إصلاحها/الناقصة */}
              {feesCheckResult.missingFeesList?.length > 0 && (
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-tiba-warning-800 mb-2 sm:mb-3 flex items-center">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-tiba-warning-500 rounded-full mr-2"></span>
                    الرسوم التي تم إصلاحها ({feesCheckResult.missingFeesList.length})
                  </h4>
                  <div className="border rounded-lg bg-tiba-warning-50 max-h-40 sm:max-h-64 overflow-auto">
                    {feesCheckResult.missingFeesList.map((f: any, index: number) => (
                      <div key={f.id} className={`p-2 sm:p-3 ${index > 0 ? 'border-t border-tiba-warning-200' : ''} hover:bg-tiba-warning-100 transition-colors`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base font-medium text-slate-900 truncate">{f.name}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              الخزينة: <span className="font-medium text-tiba-warning-700">{f.safeName}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 mr-2">
                            <div className="text-sm sm:text-base font-bold text-tiba-warning-700">{f.amount} جنيه</div>
                            <div className="text-xs text-tiba-warning-600">
                              {feesCheckResult.fixSuccessful ? '🔧 تم إصلاحها' : '⚠️ كانت ناقصة'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* خلاصة العملية */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-50 rounded-lg border">
              <h5 className="text-sm sm:text-base font-bold text-slate-800 mb-2 sm:mb-3 flex items-center">
                📋 خلاصة العملية:
              </h5>
              <div className="space-y-1 text-xs sm:text-sm text-slate-700">
                <div>• إجمالي الرسوم الدراسية: <strong>{feesCheckResult.totalProgramFees}</strong></div>
                <div>• رسوم مطبقة مسبقاً: <strong>{feesCheckResult.appliedFees}</strong></div>
                <div>• رسوم كانت ناقصة: <strong>{feesCheckResult.missingFees}</strong></div>
                {feesCheckResult.fixAttempted && (
                  <>
                    <div>• رسوم تم إصلاحها: <strong>{feesCheckResult.fixResult?.appliedFeesCount || 0}</strong></div>
                    <div>• مبلغ الإصلاح: <strong>{(feesCheckResult.fixResult?.totalAppliedAmount || 0).toLocaleString()} جنيه</strong></div>
                  </>
                )}
                <div className={`font-bold ${feesCheckResult.isComplete ? 'text-tiba-secondary-700' : 'text-tiba-warning-700'}`}>
                  • الحالة النهائية: {feesCheckResult.isComplete ? 'مكتملة ✅' : 'تحتاج مراجعة ⚠️'}
                </div>
              </div>
            </div>
          </>
        )}
      </TibaModal>

      {/* Modal اختيار الرسوم الإضافية */}
      <TibaModal
        open={!!(showAdditionalFeesModal && additionalFeesData && selectedTraineeForAdditionalFees)}
        onClose={() => setShowAdditionalFeesModal(false)}
        variant="warning"
        size="lg"
        title={`تحميل رسوم إضافية`}
        subtitle={selectedTraineeForAdditionalFees?.nameAr || ''}
        icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdditionalFeesModal(false)}>إلغاء</Button>
            <Button onClick={() => applySelectedAdditionalFees(selectedAdditionalFeeIds)} disabled={!selectedAdditionalFeeIds?.length} className="bg-tiba-warning-600 hover:bg-tiba-warning-700 text-white">
              تطبيق ({selectedAdditionalFeeIds?.length || 0})
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 mb-4">اختر واحدة أو أكثر من الرسوم الإضافية لتطبيقها على المتدرب.</p>
        
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input placeholder="البحث في الرسوم الإضافية..." value={additionalFeesSearchQuery} onChange={(e) => setAdditionalFeesSearchQuery(e.target.value)} className="pr-10 border-slate-300 focus:border-tiba-primary-500 text-slate-900" />
        </div>

        {additionalFeesSearchQuery && (
          <div className="mb-2 text-sm text-slate-600">عرض {filteredAdditionalFees.length} من {additionalFeesData?.unappliedFees?.length || 0} رسوم</div>
        )}

        <div className="space-y-2">
          {filteredAdditionalFees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p>لا توجد رسوم تطابق البحث</p>
            </div>
          ) : (
            filteredAdditionalFees.map((fee: any) => (
              <TibaFeeItem key={fee.id} id={fee.id} name={fee.name} amount={fee.amount} currency="جنيه" type={getFeeTypeLabel(fee.type)} checked={selectedAdditionalFeeIds.includes(fee.id)} onChange={(checked) => { const current = new Set<number>(selectedAdditionalFeeIds); if (checked) current.add(fee.id); else current.delete(fee.id); setSelectedAdditionalFeeIds(Array.from(current)); }} variant={selectedAdditionalFeeIds.includes(fee.id) ? 'selected' : 'default'} />
            ))
          )}
        </div>
      </TibaModal>

      {/* Modal استثناء موعد السداد */}
      <TibaModal
        open={showPaymentExceptionModal && !!selectedTraineeForException}
        onClose={() => {
          setShowPaymentExceptionModal(false);
          setSelectedTraineeForException(null);
          setExceptionFormData({ feeId: '', customPaymentEndDate: '', customGracePeriodDays: 0, reason: '', notes: '' });
        }}
        variant="primary"
        size="lg"
        title="تأجيل موعد السداد"
        subtitle="إنشاء استثناء خاص للمتدرب"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentExceptionModal(false);
                setSelectedTraineeForException(null);
                setExceptionFormData({ feeId: '', customPaymentEndDate: '', customGracePeriodDays: 0, reason: '', notes: '' });
              }}
              className="px-6"
            >
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                // التحقق من البيانات المطلوبة
                if (!exceptionFormData.reason.trim()) {
                  toast.error('يجب إدخال سبب الاستثناء');
                  return;
                }

                if (!exceptionFormData.customPaymentEndDate) {
                  toast.error('يجب اختيار موعد نهاية السداد الجديد');
                  return;
                }

                try {
                  // إرسال البيانات إلى الـ API
                  const response = await fetchAPI(`/trainees/${selectedTraineeForException!.id}/payment-exception`, {
                    method: 'POST',
                    body: JSON.stringify({
                      feeId: exceptionFormData.feeId ? parseInt(exceptionFormData.feeId) : null,
                      customPaymentEndDate: exceptionFormData.customPaymentEndDate,
                      customGracePeriodDays: exceptionFormData.customGracePeriodDays,
                      reason: exceptionFormData.reason,
                      notes: exceptionFormData.notes || null,
                    }),
                  });

                  if (response.success || response.id) {
                    toast.success('✅ تم إنشاء استثناء موعد السداد بنجاح');
                    setShowPaymentExceptionModal(false);
                    setSelectedTraineeForException(null);
                    setExceptionFormData({
                      feeId: '',
                      customPaymentEndDate: '',
                      customGracePeriodDays: 0,
                      reason: '',
                      notes: '',
                    });
                  } else {
                    throw new Error(response.message || 'فشل في إنشاء الاستثناء');
                  }
                } catch (error: any) {
                  console.error('Error creating payment exception:', error);
                  toast.error(error.message || 'حدث خطأ في إنشاء استثناء موعد السداد');
                }
              }}
              className="px-6 bg-gradient-to-r from-tiba-primary-600 to-tiba-primary-700 hover:from-tiba-primary-700 hover:to-tiba-primary-800 text-white shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              حفظ الاستثناء
            </Button>
          </div>
        }
      >
        {selectedTraineeForException && (
          <>
            <TibaTraineeInfo
              name={selectedTraineeForException.nameAr}
              nationalId={selectedTraineeForException.nationalId}
              program={selectedTraineeForException.program?.nameAr}
              variant="primary"
              className="mb-6"
            />

            {/* النموذج */}
            <div className="space-y-5">
              {/* اختيار الرسم */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الرسم المستهدف
                </label>
                {loadingFeesWithSchedules ? (
                  <div className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tiba-primary-600 mr-2"></div>
                    <span className="text-slate-600">جاري التحميل...</span>
                  </div>
                ) : (
                  <SimpleSelect
                    options={[
                      { value: '', label: 'جميع الرسوم التي لها مواعيد سداد' },
                      ...feesWithSchedules.map((fee) => ({
                        value: String(fee.id),
                        label: `${fee.name} - ${fee.remainingAmount.toFixed(2)} جنيه (متبقي)`
                      }))
                    ]}
                    value={exceptionFormData.feeId || ''}
                    onChange={(value) => setExceptionFormData({ ...exceptionFormData, feeId: value })}
                    instanceId="exception-fee-select"
                  />
                )}
                {feesWithSchedules.length === 0 && !loadingFeesWithSchedules && (
                  <p className="text-xs text-tiba-warning-600 mt-1 bg-tiba-warning-50 p-2 rounded border border-tiba-warning-200">
                    ⚠️ لا توجد رسوم لها مواعيد سداد مطبقة على هذا المتدرب
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {feesWithSchedules.length > 0
                    ? 'اختر رسماً محدداً أو اترك "جميع الرسوم" لتطبيق الاستثناء على كل الرسوم التي لها مواعيد سداد'
                    : 'يتم عرض فقط الرسوم التي تم تطبيق مواعيد سداد عليها'
                  }
                </p>
              </div>

              {/* تاريخ نهاية السداد */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  موعد نهاية السداد الجديد
                </label>
                <TibaDatePicker
                  value={exceptionFormData.customPaymentEndDate}
                  onChange={(value: string) => setExceptionFormData({ ...exceptionFormData, customPaymentEndDate: value })}
                  size="md"
                  clearable
                />
                <p className="text-xs text-slate-500 mt-1">
                  اختر التاريخ الجديد لنهاية فترة السداد
                </p>
              </div>

              {/* عدد أيام السماح */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  عدد أيام السماح الإضافية
                </label>
                <input
                  type="number"
                  min="0"
                  value={exceptionFormData.customGracePeriodDays}
                  onChange={(e) => setExceptionFormData({ ...exceptionFormData, customGracePeriodDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500"
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">
                  عدد الأيام الإضافية بعد موعد نهاية السداد قبل تطبيق الإجراءات
                </p>
              </div>

              {/* السبب */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  سبب الاستثناء <span className="text-tiba-danger-500">*</span>
                </label>
                <textarea
                  value={exceptionFormData.reason}
                  onChange={(e) => setExceptionFormData({ ...exceptionFormData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500"
                  rows={3}
                  placeholder="مثال: ظروف صحية، ظروف عائلية، تأجيل بسبب..."
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  يجب ذكر سبب واضح ومحدد لمنح الاستثناء
                </p>
              </div>

              {/* الملاحظات */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ملاحظات إضافية
                </label>
                <textarea
                  value={exceptionFormData.notes}
                  onChange={(e) => setExceptionFormData({ ...exceptionFormData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500"
                  rows={2}
                  placeholder="أي تفاصيل إضافية..."
                />
              </div>

              {/* تحذير */}
              <TibaModalAlert
                variant="warning"
                icon={<ExclamationTriangleIcon className="w-5 h-5" />}
                title="ملاحظات هامة"
              >
                <ul className="list-disc list-inside space-y-1">
                  <li>هذا الاستثناء سيتجاوز مواعيد السداد العامة</li>
                  <li>سيتم تسجيل الاستثناء مع اسم المستخدم المسؤول</li>
                  <li>يمكن مراجعة جميع الاستثناءات من سجلات التدقيق</li>
                </ul>
              </TibaModalAlert>
            </div>
          </>
        )}
      </TibaModal>

      {/* Modal عرض الاستثناءات السابقة */}
      <TibaModal
        open={!!(showExceptionsListModal && selectedTraineeForExceptionsList)}
        onClose={() => {
          setShowExceptionsListModal(false);
          setSelectedTraineeForExceptionsList(null);
          setExceptionsList([]);
        }}
        variant="primary"
        size="xl"
        title="استثناءات مواعيد السداد"
        subtitle="جميع التأجيلات والاستثناءات السابقة"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setShowExceptionsListModal(false);
              setSelectedTraineeForExceptionsList(null);
              setExceptionsList([]);
            }}
            className="px-6"
          >
            إغلاق
          </Button>
        }
      >
        {selectedTraineeForExceptionsList && (
          <>
            <TibaTraineeInfo
              name={selectedTraineeForExceptionsList.nameAr}
              nationalId={selectedTraineeForExceptionsList.nationalId}
              program={selectedTraineeForExceptionsList.program?.nameAr}
              variant="primary"
              className="mb-4"
            />

            {/* Loading State */}
            {loadingExceptionsList ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-tiba-primary-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-tiba-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">جاري تحميل الاستثناءات...</p>
              </div>
            ) : exceptionsList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">لا توجد استثناءات سابقة</p>
                <p className="text-slate-500">لم يتم تسجيل أي استثناءات لمواعيد السداد لهذا المتدرب</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exceptionsList.map((exception: any, idx: number) => (
                  <div key={exception.id} className="bg-white rounded-xl shadow-md border-2 border-tiba-primary-100 overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100 px-4 py-3 border-b border-tiba-primary-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-tiba-primary-600 text-white rounded-full flex items-center justify-center font-bold shadow">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              {exception.fee?.name || 'جميع الرسوم'}
                            </h4>
                            <p className="text-xs text-slate-600">
                              تم الإنشاء: {new Date(exception.createdAt).toLocaleDateString('ar-EG', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-3 py-1 bg-tiba-primary-100 text-tiba-primary-700 rounded-full text-xs font-medium">
                            استثناء نشط
                          </span>
                          <button
                            onClick={async () => {
                              if (confirm('هل أنت متأكد من حذف هذا الاستثناء؟')) {
                                try {
                                  await fetchAPI(`/trainees/${selectedTraineeForExceptionsList.id}/payment-exceptions/${exception.id}`, {
                                    method: 'DELETE'
                                  });
                                  toast.success('تم حذف الاستثناء بنجاح');
                                  // إعادة تحميل القائمة
                                  const exceptions = await fetchAPI(`/trainees/${selectedTraineeForExceptionsList.id}/payment-exceptions`);
                                  setExceptionsList(exceptions || []);
                                } catch (error: any) {
                                  toast.error('حدث خطأ في حذف الاستثناء');
                                  console.error(error);
                                }
                              }
                            }}
                            className="p-2 text-tiba-danger-600 hover:bg-tiba-danger-50 rounded-lg transition-colors"
                            title="حذف الاستثناء"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* موعد نهاية السداد */}
                        {exception.customPaymentEndDate && (
                          <div className="bg-tiba-primary-50 rounded-lg p-3 border border-tiba-primary-200">
                            <p className="text-xs text-tiba-primary-700 font-medium mb-1">📅 موعد نهاية السداد</p>
                            <p className="text-sm font-bold text-tiba-primary-900">
                              {new Date(exception.customPaymentEndDate).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        )}

                        {/* فترة السماح */}
                        <div className="bg-tiba-secondary-50 rounded-lg p-3 border border-tiba-secondary-200">
                          <p className="text-xs text-tiba-secondary-700 font-medium mb-1">⏰ فترة السماح</p>
                          <p className="text-sm font-bold text-tiba-secondary-900">
                            {exception.customGracePeriodDays} يوم
                          </p>
                        </div>

                        {/* الموعد النهائي */}
                        {exception.customFinalDeadline && (
                          <div className="bg-tiba-warning-50 rounded-lg p-3 border border-tiba-warning-200">
                            <p className="text-xs text-tiba-warning-700 font-medium mb-1">🎯 الموعد النهائي</p>
                            <p className="text-sm font-bold text-tiba-warning-900">
                              {new Date(exception.customFinalDeadline).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        )}

                        {/* المبلغ إن وجد */}
                        {exception.fee && (
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium mb-1">💰 المبلغ</p>
                            <p className="text-sm font-bold text-purple-900">
                              {exception.fee.amount} جنيه
                            </p>
                          </div>
                        )}
                      </div>

                      {/* السبب */}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-3">
                        <p className="text-xs text-slate-600 font-medium mb-2">📝 سبب الاستثناء:</p>
                        <p className="text-sm text-slate-900 leading-relaxed">{exception.reason}</p>
                      </div>

                      {/* الملاحظات إن وجدت */}
                      {exception.notes && (
                        <div className="bg-tiba-warning-50 rounded-lg p-3 border border-tiba-warning-200">
                          <p className="text-xs text-tiba-warning-700 font-medium mb-2">💡 ملاحظات إضافية:</p>
                          <p className="text-sm text-slate-800">{exception.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </TibaModal>

      {/* Modal عرض الصورة الشخصية */}
      {showPhotoModal && selectedPhoto && (
        <TraineePhotoLightbox
          photoUrl={selectedPhoto.photoUrl}
          name={selectedPhoto.name}
          nationalId={selectedPhoto.nationalId}
          onClose={() => {
            setShowPhotoModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {/* Modal الإحصائيات */}
      <TibaModal
        open={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        variant="primary"
        size="lg"
        zIndex={250}
        title="إحصائيات المتدربين"
        subtitle="اختر نوع التقرير"
        icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        footer={<p className="text-xs sm:text-sm text-slate-500 text-center">💡 سيتم فتح التقرير في نافذة جديدة</p>}
      >
        <div className="space-y-2 sm:space-y-3">
          <TibaCategoryCard title="البرامج التدريبية" description="عدد المتدربين في كل برنامج" variant="primary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} onClick={() => { window.open('/print/trainees-statistics/by-programs', '_blank'); setShowStatisticsModal(false); }} />
          <TibaCategoryCard title="حسب المحافظات" description="توزيع المتدربين على المحافظات" variant="secondary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} onClick={() => { window.open('/print/trainees-statistics/by-governorates', '_blank'); setShowStatisticsModal(false); }} />
          <TibaCategoryCard title="حسب المدن" description="توزيع المتدربين على المدن" variant="warning" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} onClick={() => { window.open('/print/trainees-statistics/by-cities', '_blank'); setShowStatisticsModal(false); }} />
          <TibaCategoryCard title="سجل مستجدين" description="جميع الطلاب المستجدين" variant="secondary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>} onClick={() => { window.open('/print/trainees-statistics/freshmen', '_blank'); setShowStatisticsModal(false); }} />
          <TibaCategoryCard title="سجل خريجين" description="جميع الطلاب الخريجين" variant="purple" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} onClick={() => { window.open('/print/trainees-statistics/graduates', '_blank'); setShowStatisticsModal(false); }} />
          <TibaCategoryCard title="الإجراءات العقابية" description="المتدربين المطبق عليهم إجراءات" variant="danger" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>} onClick={() => { window.open('/print/trainees-statistics/disciplinary-actions', '_blank'); setShowStatisticsModal(false); }} />
        </div>
      </TibaModal>

      {/* Modal الإجراءات العقابية */}
      <TibaModal
        open={!!(showDisciplinaryModal && selectedTraineeForDisciplinary)}
        onClose={() => {
          setShowDisciplinaryModal(false);
          setSelectedTraineeForDisciplinary(null);
          setDisciplinaryFormData({
            actionType: '',
            reason: '',
            startDate: '',
            endDate: '',
            notes: '',
            guardianNotified: false,
            guardianNotificationDate: '',
          });
        }}
        variant="danger"
        size="lg"
        title="إجراءات عقابية"
        subtitle="اتخاذ إجراء تأديبي ضد المتدرب"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisciplinaryModal(false);
                setSelectedTraineeForDisciplinary(null);
                setDisciplinaryFormData({
                  actionType: '',
                  reason: '',
                  startDate: '',
                  endDate: '',
                  notes: '',
                  guardianNotified: false,
                  guardianNotificationDate: '',
                });
              }}
              className="px-6"
            >
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                // التحقق من البيانات
                if (!disciplinaryFormData.actionType) {
                  toast.error('يجب اختيار نوع الإجراء');
                  return;
                }

                if (!disciplinaryFormData.reason.trim() || disciplinaryFormData.reason.length < 10) {
                  toast.error('يجب إدخال سبب الإجراء (10 أحرف على الأقل)');
                  return;
                }

                if (disciplinaryFormData.actionType === 'TEMPORARY_SUSPENSION') {
                  if (!disciplinaryFormData.startDate || !disciplinaryFormData.endDate) {
                    toast.error('يجب تحديد تاريخ البداية والنهاية للفصل المؤقت');
                    return;
                  }
                }

                try {
                  const response = await fetchAPI(`/disciplinary-actions`, {
                    method: 'POST',
                    body: JSON.stringify({
                      traineeId: selectedTraineeForDisciplinary!.id,
                      actionType: disciplinaryFormData.actionType,
                      reason: disciplinaryFormData.reason,
                      startDate: disciplinaryFormData.startDate || null,
                      endDate: disciplinaryFormData.endDate || null,
                      notes: disciplinaryFormData.notes || null,
                      guardianNotified: disciplinaryFormData.guardianNotified,
                      guardianNotificationDate: disciplinaryFormData.guardianNotificationDate || null,
                    }),
                  });

                  if (response.success) {
                    toast.success('✅ تم اتخاذ الإجراء العقابي بنجاح');
                    setShowDisciplinaryModal(false);
                    setSelectedTraineeForDisciplinary(null);
                    setDisciplinaryFormData({
                      actionType: '',
                      reason: '',
                      startDate: '',
                      endDate: '',
                      notes: '',
                      guardianNotified: false,
                      guardianNotificationDate: '',
                    });
                  } else {
                    throw new Error(response.message || 'فشل في اتخاذ الإجراء');
                  }
                } catch (error: any) {
                  console.error('Error creating disciplinary action:', error);
                  toast.error(error.message || 'حدث خطأ في اتخاذ الإجراء العقابي');
                }
              }}
              className="px-6 bg-gradient-to-r from-tiba-danger-600 to-tiba-danger-700 hover:from-tiba-danger-700 hover:to-tiba-danger-800 text-white shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              تنفيذ الإجراء
            </Button>
          </div>
        }
      >
        {selectedTraineeForDisciplinary && (
          <>
            <TibaTraineeInfo
              name={selectedTraineeForDisciplinary.nameAr}
              nationalId={selectedTraineeForDisciplinary.nationalId}
              variant="danger"
              className="mb-6"
            />

            {/* النموذج */}
            <div className="space-y-5">
              {/* نوع الإجراء */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  نوع الإجراء العقابي <span className="text-tiba-danger-500">*</span>
                </label>
                <SimpleSelect
                  options={[
                    { value: '', label: 'اختر نوع الإجراء' },
                    { value: 'WARNING', label: '⚠️ لفت نظر' },
                    { value: 'GUARDIAN_SUMMON', label: '👨‍👩‍👦 استدعاء ولي الأمر' },
                    { value: 'REPORT_FILING', label: '📋 حفظ محضر' },
                    { value: 'TEMPORARY_SUSPENSION', label: '🚫 فصل مؤقت' },
                    { value: 'PERMANENT_EXPULSION', label: '❌ فصل نهائي' },
                  ]}
                  value={disciplinaryFormData.actionType}
                  onChange={(value) => setDisciplinaryFormData({ ...disciplinaryFormData, actionType: value })}
                  instanceId="disciplinary-action-type-select"
                  required
                />
              </div>

              {/* التواريخ (للفصل المؤقت فقط) */}
              {disciplinaryFormData.actionType === 'TEMPORARY_SUSPENSION' && (
                <div className="grid grid-cols-2 gap-4 bg-tiba-warning-50 p-4 rounded-lg border border-tiba-warning-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      تاريخ البداية <span className="text-tiba-danger-500">*</span>
                    </label>
                    <TibaDatePicker
                      value={disciplinaryFormData.startDate}
                      onChange={(value: string) => setDisciplinaryFormData({ ...disciplinaryFormData, startDate: value })}
                      size="md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      تاريخ النهاية <span className="text-tiba-danger-500">*</span>
                    </label>
                    <TibaDatePicker
                      value={disciplinaryFormData.endDate}
                      onChange={(value: string) => setDisciplinaryFormData({ ...disciplinaryFormData, endDate: value })}
                      size="md"
                      required
                    />
                  </div>
                </div>
              )}

              {/* السبب */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  سبب الإجراء العقابي <span className="text-tiba-danger-500">*</span>
                </label>
                <textarea
                  value={disciplinaryFormData.reason}
                  onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-tiba-danger-500 focus:border-tiba-danger-500"
                  rows={4}
                  placeholder="اذكر السبب التفصيلي لاتخاذ الإجراء..."
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  يجب ذكر سبب واضح ومحدد لاتخاذ الإجراء العقابي (على الأقل 10 أحرف)
                </p>
              </div>

              {/* الملاحظات */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ملاحظات إدارية إضافية
                </label>
                <textarea
                  value={disciplinaryFormData.notes}
                  onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-tiba-danger-500"
                  rows={2}
                  placeholder="ملاحظات أو تفاصيل إضافية..."
                />
              </div>

              {/* إبلاغ ولي الأمر */}
              <div className="bg-tiba-primary-50 rounded-lg p-4 border border-tiba-primary-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={disciplinaryFormData.guardianNotified}
                    onChange={(e) => setDisciplinaryFormData({ 
                      ...disciplinaryFormData, 
                      guardianNotified: e.target.checked,
                      guardianNotificationDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                    })}
                    className="mt-1 h-4 w-4 text-tiba-primary-600 rounded"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-tiba-primary-900">
                      تم إبلاغ ولي الأمر
                    </label>
                    <p className="text-xs text-tiba-primary-700 mt-1">
                      رقم ولي الأمر: {(selectedTraineeForDisciplinary as any).guardianPhone || 'غير متوفر'}
                    </p>
                  </div>
                </div>
              </div>

              {/* تحذير */}
              <TibaModalAlert
                variant="danger"
                icon={<ExclamationTriangleIcon className="w-5 h-5" />}
                title="تحذيرات هامة"
              >
                <ul className="list-disc list-inside space-y-1">
                  <li>الفصل النهائي سيمنع المتدرب من الوصول للمنصة نهائياً</li>
                  <li>الفصل المؤقت سيمنع المتدرب من الحضور والمنصة خلال الفترة المحددة</li>
                  <li>جميع الإجراءات سيتم تسجيلها وأرشفتها</li>
                  <li>يمكن مراجعة جميع الإجراءات من سجلات التدقيق</li>
                </ul>
              </TibaModalAlert>
            </div>
          </>
        )}
      </TibaModal>

      {/* Modal عرض الإجراءات العقابية */}
      <TibaModal
        open={!!(showDisciplinaryListModal && selectedTraineeForDisciplinaryList)}
        onClose={() => {
          setShowDisciplinaryListModal(false);
          setSelectedTraineeForDisciplinaryList(null);
          setDisciplinaryActionsList([]);
        }}
        variant="danger"
        size="2xl"
        title="سجل الإجراءات العقابية"
        subtitle="جميع الإجراءات المتخذة ضد المتدرب"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        }
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setShowDisciplinaryListModal(false);
              setSelectedTraineeForDisciplinaryList(null);
              setDisciplinaryActionsList([]);
            }}
          >
            إغلاق
          </Button>
        }
      >
        {selectedTraineeForDisciplinaryList && (
          <>
            <TibaTraineeInfo
              name={selectedTraineeForDisciplinaryList.nameAr}
              nationalId={`${selectedTraineeForDisciplinaryList.nationalId} • ${selectedTraineeForDisciplinaryList.program?.nameAr}`}
              variant="danger"
              className="mb-4"
            />

            {/* Loading State */}
            {loadingDisciplinaryList ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-tiba-danger-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-tiba-danger-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">جاري تحميل الإجراءات...</p>
              </div>
            ) : disciplinaryActionsList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-tiba-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-tiba-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">لا توجد إجراءات عقابية</p>
                <p className="text-slate-500">لم يتم اتخاذ أي إجراءات عقابية ضد هذا المتدرب</p>
              </div>
            ) : (
              <div className="space-y-4">
                {disciplinaryActionsList.map((action: any, idx: number) => {
                  const actionTypeLabels: any = {
                    WARNING: { label: 'لفت نظر', icon: '⚠️', color: 'yellow' },
                    GUARDIAN_SUMMON: { label: 'استدعاء ولي الأمر', icon: '👨‍👩‍👦', color: 'orange' },
                    REPORT_FILING: { label: 'حفظ محضر', icon: '📋', color: 'blue' },
                    TEMPORARY_SUSPENSION: { label: 'فصل مؤقت', icon: '🚫', color: 'orange' },
                    PERMANENT_EXPULSION: { label: 'فصل نهائي', icon: '❌', color: 'red' }
                  };

                  const statusLabels: any = {
                    ACTIVE: { label: 'نشط', color: 'green' },
                    COMPLETED: { label: 'مكتمل', color: 'blue' },
                    CANCELLED: { label: 'ملغي', color: 'gray' }
                  };

                  const actionConfig = actionTypeLabels[action.actionType] || { label: action.actionType, icon: '❓', color: 'gray' };
                  const statusConfig = statusLabels[action.status] || { label: action.status, color: 'gray' };

                  return (
                    <div key={action.id} className={`bg-white rounded-xl shadow-md border-2 overflow-hidden hover:shadow-lg transition-shadow ${
                      actionConfig.color === 'red' ? 'border-tiba-danger-200' :
                      actionConfig.color === 'orange' ? 'border-tiba-warning-200' :
                      actionConfig.color === 'yellow' ? 'border-tiba-warning-200' :
                      actionConfig.color === 'blue' ? 'border-tiba-primary-200' : 'border-slate-200'
                    }`}>
                      {/* Header */}
                      <div className={`px-4 py-3 border-b ${
                        actionConfig.color === 'red' ? 'bg-gradient-to-r from-tiba-danger-50 to-tiba-danger-100 border-tiba-danger-200' :
                        actionConfig.color === 'orange' ? 'bg-gradient-to-r from-tiba-warning-50 to-tiba-warning-100 border-tiba-warning-200' :
                        actionConfig.color === 'yellow' ? 'bg-gradient-to-r from-tiba-warning-50 to-tiba-warning-100 border-tiba-warning-200' :
                        actionConfig.color === 'blue' ? 'bg-gradient-to-r from-tiba-primary-50 to-tiba-primary-100 border-tiba-primary-200' :
                        'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow ${
                              actionConfig.color === 'red' ? 'bg-tiba-danger-600 text-white' :
                              actionConfig.color === 'orange' ? 'bg-tiba-warning-600 text-white' :
                              actionConfig.color === 'yellow' ? 'bg-tiba-warning-600 text-white' :
                              actionConfig.color === 'blue' ? 'bg-tiba-primary-600 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span>{actionConfig.icon}</span>
                                <span>{actionConfig.label}</span>
                              </h4>
                              <p className="text-xs text-slate-600">
                                تاريخ الإجراء: {new Date(action.createdAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              statusConfig.color === 'green' ? 'bg-tiba-secondary-100 text-tiba-secondary-700' :
                              statusConfig.color === 'blue' ? 'bg-tiba-primary-100 text-tiba-primary-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* التواريخ (للفصل المؤقت) */}
                          {action.actionType === 'TEMPORARY_SUSPENSION' && action.startDate && action.endDate && (
                            <>
                              <div className="bg-tiba-warning-50 rounded-lg p-3 border border-tiba-warning-200">
                                <p className="text-xs text-tiba-warning-700 font-medium mb-1">📅 تاريخ البداية</p>
                                <p className="text-sm font-bold text-tiba-warning-900">
                                  {new Date(action.startDate).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                              <div className="bg-tiba-danger-50 rounded-lg p-3 border border-tiba-danger-200">
                                <p className="text-xs text-tiba-danger-700 font-medium mb-1">🎯 تاريخ النهاية</p>
                                <p className="text-sm font-bold text-tiba-danger-900">
                                  {new Date(action.endDate).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                            </>
                          )}

                          {/* ولي الأمر */}
                          {action.guardianNotified && (
                            <div className="bg-tiba-primary-50 rounded-lg p-3 border border-tiba-primary-200">
                              <p className="text-xs text-tiba-primary-700 font-medium mb-1">👨‍👩‍👦 إبلاغ ولي الأمر</p>
                              <p className="text-sm font-bold text-tiba-primary-900">
                                {action.guardianNotificationDate
                                  ? new Date(action.guardianNotificationDate).toLocaleDateString('ar-EG')
                                  : 'تم الإبلاغ'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* السبب */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-3">
                          <p className="text-xs text-slate-600 font-medium mb-2">📝 سبب الإجراء:</p>
                          <p className="text-sm text-slate-900 leading-relaxed">{action.reason}</p>
                        </div>

                        {/* الملاحظات */}
                        {action.notes && (
                          <div className="bg-tiba-warning-50 rounded-lg p-3 border border-tiba-warning-200 mb-3">
                            <p className="text-xs text-tiba-warning-700 font-medium mb-2">💡 ملاحظات إدارية:</p>
                            <p className="text-sm text-slate-800">{action.notes}</p>
                          </div>
                        )}

                        {/* أزرار الإجراءات */}
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                          {action.status === 'ACTIVE' && (
                            <>
                              <Button
                                onClick={async () => {
                                  try {
                                    await fetchAPI(`/disciplinary-actions/${action.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'COMPLETED' }),
                                    });
                                    toast.success('✅ تم إكمال الإجراء');
                                    // تحديث القائمة
                                    const updated = await fetchAPI(`/disciplinary-actions?traineeId=${selectedTraineeForDisciplinaryList.id}`);
                                    setDisciplinaryActionsList(updated || []);
                                  } catch (error: any) {
                                    toast.error(error.message || 'حدث خطأ في تحديث الإجراء');
                                  }
                                }}
                                size="sm"
                                className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
                              >
                                ✅ إكمال الإجراء
                              </Button>
                              <Button
                                onClick={async () => {
                                  const reason = prompt('سبب الإلغاء:');
                                  if (!reason) return;
                                  
                                  try {
                                    await fetchAPI(`/disciplinary-actions/${action.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({
                                        status: 'CANCELLED',
                                        cancellationReason: reason
                                      }),
                                    });
                                    toast.success('✅ تم إلغاء الإجراء');
                                    // تحديث القائمة
                                    const updated = await fetchAPI(`/disciplinary-actions?traineeId=${selectedTraineeForDisciplinaryList.id}`);
                                    setDisciplinaryActionsList(updated || []);
                                  } catch (error: any) {
                                    toast.error(error.message || 'حدث خطأ في إلغاء الإجراء');
                                  }
                                }}
                                size="sm"
                                variant="outline"
                                className="text-slate-700"
                              >
                                ❌ إلغاء الإجراء
                              </Button>
                            </>
                          )}
                          <Button
                            onClick={async () => {
                              if (!confirm('هل أنت متأكد من حذف هذا الإجراء؟')) return;
                              
                              try {
                                await fetchAPI(`/disciplinary-actions/${action.id}`, {
                                  method: 'DELETE',
                                });
                                toast.success('🗑️ تم حذف الإجراء');
                                // تحديث القائمة
                                const updated = await fetchAPI(`/disciplinary-actions?traineeId=${selectedTraineeForDisciplinaryList.id}`);
                                setDisciplinaryActionsList(updated || []);
                              } catch (error: any) {
                                toast.error(error.message || 'حدث خطأ في حذف الإجراء');
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="text-tiba-danger-600 hover:bg-tiba-danger-50 mr-auto"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </TibaModal>
    </div>
  );
}

// Componente para el menú desplegable de acciones - محسن للأداء
interface ActionMenuProps {
  trainee: Trainee;
  onEdit: (trainee: Trainee) => void;
  onDelete: (trainee: Trainee) => void;
  onOpenNotes: (trainee: Trainee) => void;
  onOpenGrades: (trainee: Trainee) => Promise<void>;
  onShowConfirm: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }) => void;
  onOpenAdditionalFees: (trainee: Trainee) => Promise<void> | void;
  fetchTrainees: (page?: number, limit?: number, resetData?: boolean) => Promise<void>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  setFeesCheckResult: (result: any) => void;
  setShowFeesCheckModal: (show: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  canManageFinances: boolean;
  canTransferGroups: boolean;
  canManagePaymentExceptions: boolean;
  canManageDisciplinaryActions: boolean;
  onOpenPaymentException: (trainee: Trainee) => void;
  onViewExceptions: (trainee: Trainee) => void;
  onOpenDisciplinaryActions: (trainee: Trainee) => void;
  onViewDisciplinaryActions: (trainee: Trainee) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = React.memo(({ trainee, onEdit, onDelete, onOpenNotes, onOpenGrades, onShowConfirm, onOpenAdditionalFees, fetchTrainees, pagination, setFeesCheckResult, setShowFeesCheckModal, canEdit, canDelete, canManageFinances, canTransferGroups, canManagePaymentExceptions, canManageDisciplinaryActions, onOpenPaymentException, onViewExceptions, onOpenDisciplinaryActions, onViewDisciplinaryActions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // دالة مساعدة لإعادة تحميل البيانات
  const refreshData = async () => {
    if (fetchTrainees && pagination) {
      await fetchTrainees(pagination.page, pagination.limit, false);
    }
  };

  
  // Cerrar el menú cuando se hace clic fuera de él y manejar scroll/resize
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calcular la posición del menú - محسن للأداء
  const getMenuPosition = React.useCallback(() => {
    if (!buttonRef.current) return { top: 0, left: 0, bottom: 'auto' as const };
    
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = window.innerWidth < 640 ? 224 : 192; // w-56 : w-48
    const menuHeight = 420;
    const padding = 10; // مساحة أمان من حواف الشاشة
    
    // حساب المواضع الأساسية
    let top: number | 'auto' = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    let bottom: number | 'auto' = 'auto';
    
    // التحقق من تجاوز الحدود العمودية
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
      // عرض القائمة فوق الزر
      bottom = window.innerHeight - rect.top + window.scrollY + 5;
      top = 'auto';
    }
    
    // التحقق من تجاوز الحدود الأفقية
    if (left + menuWidth > window.innerWidth - padding) {
      // إذا تجاوزت القائمة الحد الأيمن، اجعلها تنتهي عند الحد الأيمن للزر
      left = rect.right + window.scrollX - menuWidth;
    }
    
    // التأكد من عدم الخروج من الحد الأيسر
    if (left < padding) {
      left = padding;
    }
    
    // التأكد من عدم الخروج من الحدود العمودية
    if (typeof top === 'number' && top + menuHeight > window.innerHeight + window.scrollY - padding) {
      top = window.innerHeight + window.scrollY - menuHeight - padding;
    }
    
    if (typeof bottom === 'number' && bottom > window.innerHeight - padding) {
      bottom = window.innerHeight - padding;
    }
    
    return { top, left, bottom };
  }, []);

  // دالة لعرض عناصر القائمة - مشتركة بين الهاتف والكمبيوتر
  const renderMenuItems = () => (
    <>
      <button
        onClick={() => {
          router.push(`/dashboard/trainees/${trainee.id}/id-card`);
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
        <span className="font-medium">كارنيه المتدرب</span>
      </button>
      <button
        onClick={() => {
          onOpenNotes(trainee);
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-purple-50 w-full text-right transition-colors duration-150 active:bg-purple-100"
        role="menuitem"
      >
        <ChatBubbleLeftRightIcon className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-purple-600" />
        <span className="font-medium">الملاحظات</span>
      </button>
      <button
        onClick={() => {
          router.push(`/dashboard/attendance-records/${trainee.id}`);
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 w-full text-right transition-colors duration-150 active:bg-tiba-primary-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium">الحضور والغياب</span>
      </button>
      <button
        onClick={async () => {
          setIsOpen(false);
          await onOpenGrades(trainee);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
        role="menuitem"
      >
        <ChartBarIcon className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" />
        <span className="font-medium">عرض الدرجات</span>
      </button>
      {canEdit && (
        <button
          onClick={() => {
            onEdit(trainee);
            setIsOpen(false);
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 w-full text-right transition-colors duration-150 active:bg-tiba-primary-100"
          role="menuitem"
        >
          <PencilSquareIcon className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600" />
          <span className="font-medium">تعديل</span>
        </button>
      )}
      
      <button
        onClick={() => {
          router.push(`/dashboard/trainees/${trainee.id}/archive`);
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-warning-50 w-full text-right transition-colors duration-150 active:bg-tiba-warning-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium">أرشيف المتدرب</span>
      </button>

      <button
        onClick={() => {
          window.open(`/print/trainee-certificate/${trainee.id}`, '_blank');
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 w-full text-right transition-colors duration-150 active:bg-tiba-primary-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium">إفادة للمتدرب</span>
      </button>

      <button
        onClick={() => {
          window.open(`/print/trainee-enrollment/${trainee.id}`, '_blank');
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium">إثبات قيد</span>
      </button>

      <button
        onClick={async () => {
          setIsOpen(false);
          try {
            const response = await fetchAPI(`/trainees/${trainee.id}/send-schedule-whatsapp`, {
              method: 'POST',
            });
            
            if (response.success) {
              toast.success(response.message || 'تم إرسال الجدول الدراسي عبر واتساب بنجاح');
            } else {
              throw new Error(response.message || 'فشل في إرسال الجدول');
            }
          } catch (error: any) {
            console.error('Error sending schedule:', error);
            toast.error(error.message || 'حدث خطأ في إرسال الجدول الدراسي');
          }
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium">إرسال الجدول واتساب</span>
      </button>

      {/* أزرار تحويل المجموعات */}
      {canTransferGroups && (
        <>
          <hr className="my-1 border-slate-200" />
          <div className="px-2 py-1">
            <span className="text-xs text-slate-500 font-medium">تحويل المجموعات</span>
          </div>
          
          <Link
            href={`/dashboard/trainees/${trainee.id}/transfer-group`}
            className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 active:bg-tiba-primary-100 w-full text-right transition-colors duration-150"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <span className="ml-3 md:ml-2 text-lg">📚</span>
            <span className="font-medium">تحويل المجموعات</span>
          </Link>
        </>
      )}

      <button
        onClick={() => {
          window.open(`/print/trainee-payments/${trainee.id}`, '_blank');
          setIsOpen(false);
        }}
        className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-purple-50 w-full text-right transition-colors duration-150 active:bg-purple-100"
        role="menuitem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span className="font-medium">مدفوعات المتدرب</span>
      </button>
      {/* أزرار إدارة الرسوم - فقط للمحاسبين ومن لديهم صلاحيات مالية */}
      {canManageFinances && (
        <>
          <hr className="my-1 border-slate-200" />
          <div className="px-2 py-1">
            <span className="text-xs text-slate-500 font-medium">إدارة الرسوم</span>
          </div>
        </>
      )}
      
      {canManageFinances && (
        <button
          onClick={async () => {
            setIsOpen(false);
            try {
              const response = await fetchAPI(`/trainees/${trainee.id}/available-fees`);
              
              if (response.availableToApply === 0) {
                toast('جميع رسوم البرنامج مطبقة بالفعل على هذا المتدرب', { icon: 'ℹ️' });
                return;
              }

              const feesDetails = response.unappliedFees.map((fee: any) => `• ${fee.name} - ${fee.amount} جنيه`).join('\n');
              const totalAmount = response.unappliedFees.reduce((sum: number, fee: any) => sum + fee.amount, 0);
              
              const handleApplyFees = async () => {
                try {
                  const feeIds = response.unappliedFees.map((fee: any) => fee.id);
                  const applyResponse = await fetchAPI(`/trainees/${trainee.id}/apply-fees`, {
                    method: 'POST',
                    body: JSON.stringify({ feeIds }),
                  });

                  if (applyResponse.success) {
                    toast.success(applyResponse.message || `تم تطبيق ${applyResponse.appliedNow} رسوم بنجاح`);
                    await refreshData();
                  } else {
                    throw new Error(applyResponse.error || applyResponse.message || 'فشل في تطبيق الرسوم');
                  }
                } catch (error: any) {
                  console.error('Error applying fees:', error);
                  toast.error(error.message || 'حدث خطأ في تطبيق الرسوم');
                }
              };
              
              onShowConfirm({
                title: 'تطبيق الرسوم الدراسية',
                message: `المتدرب: ${trainee.nameAr}\nالبرنامج: ${response.programName}\n\n📚 الرسوم الدراسية المتاحة للتطبيق:\n${feesDetails}\n\n💰 إجمالي المبلغ: ${totalAmount} جنيه\n\nهل تريد تطبيق جميع هذه الرسوم الدراسية على المتدرب؟`,
                type: 'warning',
                confirmText: 'نعم، طبق الرسوم الدراسية',
                onConfirm: handleApplyFees
              });
            } catch (error: any) {
              console.error('Error loading program fees:', error);
              toast.error(error.message || 'حدث خطأ في تحميل رسوم البرنامج');
            }
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 01-3 0V5.197m0 0A7.5 7.5 0 005.196 5m.853 4.746a4.5 4.5 0 00-1.853 4.746M4.5 17.5V19a2.5 2.5 0 002.5 2.5h10A2.5 2.5 0 0019.5 19v-1.5M12 7.5v9m-4-4h8" />
          </svg>
          <span className="font-medium">تحميل رسوم دراسية</span>
        </button>
      )}

      {canManageFinances && (
        <button
          onClick={async () => {
            setIsOpen(false);
            await onOpenAdditionalFees(trainee);
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-warning-50 w-full text-right transition-colors duration-150 active:bg-tiba-warning-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h4.125M8.25 8.25V6.108" />
          </svg>
          <span className="font-medium">تحميل رسوم إضافية</span>
        </button>
      )}

      {canManageFinances && (
        <button
          onClick={() => {
            setIsOpen(false);
            
            const handleCheckAndFixFees = async () => {
              try {
                const response = await fetchAPI(`/trainees/${trainee.id}/check-and-fix-fees`, {
                  method: 'POST',
                });
                setFeesCheckResult(response);
                setShowFeesCheckModal(true);
                await refreshData();
              } catch (error: any) {
                console.error('Error checking and fixing fees:', error);
                toast.error(error.message || 'حدث خطأ في فحص الرسوم');
              }
            };
            
            onShowConfirm({
              title: '🔍 فحص وإصلاح الرسوم الدراسية',
              message: `هل تريد فحص وإصلاح الرسوم الدراسية للمتدرب "${trainee.nameAr}"؟\n\n🔍 عملية الفحص:\n• فحص جميع الرسوم الدراسية للبرنامج التدريبي\n• مقارنة الرسوم المطبقة مسبقاً مع الرسوم المطلوبة\n• اكتشاف أي رسوم دراسية مفقودة أو ناقصة\n\n🔧 عملية الإصلاح التلقائي:\n• تطبيق الرسوم المفقودة تلقائياً بنظام ذري\n• خصم المبالغ من الخزائن المناسبة\n• إنشاء مدفوعات للمتدرب بحالة "قيد الانتظار"\n• تحديث حالة الرسوم إلى "مطبقة"\n\n📊 التقرير المفصل سيُظهر:\n• ما كان مطبقاً مسبقاً (أخضر)\n• ما تم إصلاحه حديثاً (برتقالي)\n• تفاصيل المبالغ والخزائن\n• حالة نجاح/فشل العملية\n\n📋 ملاحظة: هذه العملية تتعامل مع الرسوم الدراسية فقط`,
              type: 'info',
              confirmText: 'ابدأ فحص وإصلاح الرسوم',
              onConfirm: handleCheckAndFixFees
            });
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-secondary-50 w-full text-right transition-colors duration-150 active:bg-tiba-secondary-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">فحص الرسوم الدراسية</span>
        </button>
      )}

      {/* أزرار خطيرة */}
      <hr className="my-1 border-slate-200" />
      <div className="px-2 py-1">
        <span className="text-xs text-slate-500 font-medium">إجراءات متقدمة</span>
      </div>

      {canManageFinances && (
        <button
          onClick={() => {
            setIsOpen(false);
            
            const handleDeleteDebt = async () => {
              try {
                const response = await fetchAPI(`/trainees/${trainee.id}/debt`, {
                  method: 'DELETE',
                });

                if (response.success) {
                  toast.success(response.message || 'تم حذف مديونية المتدرب بالكامل');
                  await refreshData();
                } else {
                  throw new Error(response.error || response.message || 'فشل في حذف مديونية المتدرب');
                }
              } catch (error: any) {
                console.error('Error deleting trainee debt:', error);
                toast.error(error.message || 'حدث خطأ في حذف مديونية المتدرب');
              }
            };
            
            onShowConfirm({
              title: 'حذف مديونية المتدرب',
              message: `هل أنت متأكد من حذف مديونية المتدرب "${trainee.nameAr}" كاملاً؟\n\nسيتم حذف:\n- جميع الرسوم المطبقة\n- جميع المدفوعات\n- إرجاع أرصدة الخزائن\n\nهذا الإجراء لا يمكن التراجع عنه!`,
              type: 'danger',
              confirmText: 'نعم، احذف المديونية',
              onConfirm: handleDeleteDebt
            });
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-warning-50 w-full text-right transition-colors duration-150 active:bg-tiba-warning-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="font-medium">حذف مديونية</span>
        </button>
      )}

      {canManagePaymentExceptions && (
        <button
          onClick={() => {
            setIsOpen(false);
            onOpenPaymentException(trainee);
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 w-full text-right transition-colors duration-150 active:bg-tiba-primary-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">تأجيل موعد السداد</span>
        </button>
      )}

      {canManagePaymentExceptions && (
        <button
          onClick={() => {
            setIsOpen(false);
            onViewExceptions(trainee);
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-primary-50 w-full text-right transition-colors duration-150 active:bg-tiba-primary-100"
          role="menuitem"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">عرض الاستثناءات السابقة</span>
        </button>
      )}

      {/* أزرار الإجراءات العقابية */}
      {canManageDisciplinaryActions && (
        <>
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenDisciplinaryActions(trainee);
            }}
            className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-danger-50 w-full text-right transition-colors duration-150 active:bg-tiba-danger-100"
            role="menuitem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">إجراءات عقابية</span>
          </button>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onViewDisciplinaryActions(trainee);
            }}
            className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-warning-50 w-full text-right transition-colors duration-150 active:bg-tiba-warning-100"
            role="menuitem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">عرض الإجراءات المطبقة</span>
          </button>
        </>
      )}

      <hr className="my-1 border-slate-200" />
      {canDelete && (
        <button
          onClick={() => {
            onDelete(trainee);
            setIsOpen(false);
          }}
          className="flex items-center px-4 py-3 md:py-2 text-sm text-slate-700 hover:bg-tiba-danger-50 w-full text-right transition-colors duration-150 active:bg-tiba-danger-100"
          role="menuitem"
        >
          <TrashIcon className="ml-3 md:ml-2 h-5 w-5 md:h-4 md:w-4 text-tiba-danger-600" />
          <span className="font-medium">حذف المتدرب</span>
        </button>
      )}
    </>
  );
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-auto px-4 py-2.5 md:px-3 md:py-1.5 rounded-lg md:rounded-md border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:ring-offset-1 flex items-center justify-center transition-colors duration-150"
        aria-label="إجراءات"
      >
        <span className="text-sm md:text-xs font-medium text-slate-900 ml-1">إجراءات</span>
        <ChevronDownIcon className={`h-4 w-4 md:h-3.5 md:w-3.5 text-slate-900 transition-transform duration-150 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          {/* Full-screen overlay on mobile */}
          <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]" onClick={() => setIsOpen(false)} />
          <div
            className="md:hidden fixed inset-x-0 bottom-0 z-[100] bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900">إجراءات المتدرب</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Menu items - scrollable */}
            <div className="overflow-y-auto flex-1 pb-8">
              <div className="py-2" role="menu" aria-orientation="vertical">
                {renderMenuItems()}
              </div>
            </div>
          </div>

          {/* Desktop positioned dropdown */}
          <div
            className="hidden md:block fixed w-48 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 max-h-80 overflow-y-auto animate-fade-in-fast"
            style={{
              top: getMenuPosition().top,
              bottom: getMenuPosition().bottom,
              left: getMenuPosition().left,
              transformOrigin: 'top right'
            }}
          >
            <div className="py-2" role="menu" aria-orientation="vertical">
              {renderMenuItems()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة للـ memo لتحسين الأداء
  return prevProps.trainee.id === nextProps.trainee.id &&
         prevProps.trainee.nameAr === nextProps.trainee.nameAr &&
         prevProps.canEdit === nextProps.canEdit &&
         prevProps.canDelete === nextProps.canDelete &&
         prevProps.canManageFinances === nextProps.canManageFinances &&
         prevProps.canTransferGroups === nextProps.canTransferGroups;
});

// مكون زر التعديل محسن للأداء
const EditButton = React.memo(function EditButton({ trainee, onEdit }: { trainee: Trainee; onEdit: (trainee: Trainee) => void }) {
  return (
    <button
      onClick={() => onEdit(trainee)}
      className="p-3 md:p-2 rounded-lg bg-tiba-primary-50 hover:bg-tiba-primary-100 border border-tiba-primary-200 hover:border-tiba-primary-300 transition-colors duration-150 group shadow-sm hover:shadow-md"
      title="تعديل بيانات المتدرب"
    >
      <PencilSquareIcon className="h-5 w-5 md:h-4 md:w-4 text-tiba-primary-600 group-hover:text-tiba-primary-700 transition-colors duration-150" />
    </button>
  );
});

// مكون زر الدفع محسن للأداء
const PaymentButton = React.memo(function PaymentButton({ traineeId }: { traineeId: number }) {
  return (
    <button
      onClick={() => window.open(`/dashboard/finances/trainee-payments/${traineeId}`, '_blank')}
      className="p-3 md:p-2 rounded-lg bg-tiba-secondary-50 hover:bg-tiba-secondary-100 border border-tiba-secondary-200 hover:border-tiba-secondary-300 transition-colors duration-150 group shadow-sm hover:shadow-md"
      title="دفع الرسوم"
    >
      <CreditCardIcon className="h-5 w-5 md:h-4 md:w-4 text-tiba-secondary-600 group-hover:text-tiba-secondary-700 transition-colors duration-150" />
    </button>
  );
});

// مكون skeleton للأزرار أثناء تحميل الصلاحيات
const ButtonSkeleton = React.memo(function ButtonSkeleton() {
  return (
    <div className="p-3 md:p-2 rounded-lg bg-slate-100 border border-slate-200 animate-pulse">
      <div className="h-5 w-5 md:h-4 md:w-4 bg-slate-300 rounded"></div>
    </div>
  );
});

// مكون عرض معلومات المتدرب محسن للأداء
const TraineeInfo = React.memo(function TraineeInfo({ trainee, onOpenApplicationForm, onOpenPhoto }: {
  trainee: Trainee;
  onOpenApplicationForm: (id: number) => void;
  onOpenPhoto?: (photoUrl: string, name: string, nationalId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <TraineeAvatar
        photoUrl={trainee.photoUrl}
        name={trainee.nameAr}
        nationalId={trainee.nationalId || 'غير محدد'}
        size="md"
        onOpenPhoto={onOpenPhoto}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <span className="font-bold text-sm sm:text-base truncate">{trainee.nameAr}</span>
          <button
            onClick={() => onOpenApplicationForm(trainee.id)}
            className="relative p-1 sm:p-1.5 rounded-lg bg-tiba-primary-50 hover:bg-tiba-primary-100 border border-tiba-primary-200 hover:border-tiba-primary-300 transition-all duration-200 group shadow-sm hover:shadow-md flex-shrink-0"
            title="عرض استمارة الطلب"
          >
            <MagnifyingGlassPlusIcon className="h-3 w-3 sm:h-4 sm:w-4 text-tiba-primary-600 group-hover:text-tiba-primary-700 group-hover:scale-110 transition-all duration-200" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-tiba-secondary-500 rounded-full animate-pulse"></div>
          </button>
        </div>
        <div className="text-xs sm:text-sm opacity-50 truncate">{trainee.nationalId || 'غير محدد'}</div>
        {/* معلومات إضافية على الشاشات الصغيرة */}
        <div className="block sm:hidden mt-1">
          <div className="text-xs text-slate-600">{trainee.program?.nameAr || 'غير محدد'}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${trainee.gender === 'MALE' ? 'bg-tiba-primary-100 text-tiba-primary-800' : 'bg-pink-100 text-pink-800'}`}>
              {trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'}
            </span>
            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              #{trainee.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.trainee.id === nextProps.trainee.id &&
         prevProps.trainee.nameAr === nextProps.trainee.nameAr &&
         prevProps.trainee.photoUrl === nextProps.trainee.photoUrl;
});

// Modal للتأكيد
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'warning',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 bg-tiba-danger-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-tiba-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 bg-tiba-warning-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-tiba-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 bg-tiba-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-tiba-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white';
      case 'warning':
        return 'bg-tiba-warning-600 hover:bg-tiba-warning-700 text-white';
      case 'info':
        return 'bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 animate-in zoom-in duration-200 border border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {getIcon()}
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              className={`flex-1 ${getButtonColor()}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'جاري المعالجة...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TraineesPage() {
  return (
    <PageGuard>
      <TraineesPageContent />
    </PageGuard>
  );
}