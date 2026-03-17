'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { Pagination } from '@/components/ui/Pagination';
import { TraineeAvatar } from '@/components/ui/trainee-avatar';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowRightIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyMaterial,
  createDelivery,
  updateDelivery,
  type StudyMaterial,
} from '@/lib/study-materials-api';
import { fetchAPI } from '@/lib/api';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  phone: string;
  photoUrl?: string;
  deliveryStatus?: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST' | null;
  deliveryId?: string;
  deliveryDate?: string;
  quantity?: number;
  feePaymentStatus?: {
    isPaid: boolean;
    amountPaid: number;
    remainingAmount: number;
  } | null;
}

const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RETURNED: 'bg-blue-50 text-blue-700 border-blue-200',
  LOST: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS = {
  PENDING: 'قيد الانتظار',
  DELIVERED: 'تم التسليم',
  RETURNED: 'تم الإرجاع',
  LOST: 'مفقود',
};

const STATUS_ICONS = {
  PENDING: ClockIcon,
  DELIVERED: CheckCircleIcon,
  RETURNED: ArrowPathIcon,
  LOST: ExclamationCircleIcon,
};

export default function MaterialDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params.id as string;
  const { userPermissions } = usePermissions();
  
  // التحقق من صلاحية عرض أرقام الهواتف
  const canViewPhone = userPermissions?.hasPermission('dashboard.trainees', 'view_phone') || false;

  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    trainee: Trainee | null;
    action: 'deliver' | 'return' | 'lost' | null;
  }>({
    isOpen: false,
    trainee: null,
    action: null,
  });

  useEffect(() => {
    loadMaterial();
  }, [materialId]);

  useEffect(() => {
    if (material) {
      loadTrainees();
    }
  }, [material, searchQuery, pagination.page]);

  const loadMaterial = async () => {
    try {
      const materialData = await getStudyMaterial(materialId);
      setMaterial(materialData);
    } catch (error: any) {
      console.error('Error loading material:', error);
      toast.error('فشل تحميل بيانات الأداة الدراسية');
    }
  };

  const loadTrainees = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading trainees for material:', {
        materialId,
        materialName: material?.name,
        programId: material?.programId,
        searchQuery
      });
      
      // Load trainees for the program
      const response = await fetchAPI(
        `/trainees?programId=${material!.programId}${searchQuery ? `&search=${searchQuery}` : ''}`
      );
      const traineesData = Array.isArray(response) ? response : (response.trainees || response.data || []);
      
      console.log('👥 Loaded trainees:', {
        count: traineesData.length,
        sampleTrainees: traineesData.slice(0, 3).map((t: any) => ({
          id: t.id,
          idType: typeof t.id,
          name: t.nameAr
        }))
      });

      // Load delivery status for each trainee
      const deliveriesResponse = await fetchAPI(
        `/study-materials/deliveries/list?studyMaterialId=${materialId}&limit=1000`
      );
      const deliveries = deliveriesResponse.deliveries || [];
      
      console.log('📦 All deliveries for this material:', {
        count: deliveries.length,
        materialId,
        deliveries: deliveries.map((d: any) => ({
          id: d.id,
          traineeId: d.traineeId,
          traineeIdType: typeof d.traineeId,
          status: d.status,
          traineeName: d.trainee?.nameAr
        }))
      });

      // Load payment status if material has linkedFee
      let paymentStatuses: any[] = [];
      if (material!.linkedFeeId) {
        try {
          const paymentsResponse = await fetchAPI(
            `/finances/trainee-payments?feeId=${material!.linkedFeeId}`
          );
          paymentStatuses = paymentsResponse.payments || paymentsResponse.data || [];
        } catch (error) {
          console.error('Error loading payment statuses:', error);
        }
      }

      // Map deliveries and payment status to trainees
      const traineesWithStatus = traineesData.map((trainee: any) => {
        // Try both string and number comparisons
        const delivery = deliveries.find((d: any) => {
          const numericMatch = Number(d.traineeId) === Number(trainee.id);
          const strictMatch = d.traineeId === trainee.id;
          const stringMatch = String(d.traineeId) === String(trainee.id);
          
          return numericMatch || strictMatch || stringMatch;
        });
        
        // Debug logging for all trainees with deliveries to identify any mismatches
        if (delivery) {
          console.log(`✅ Delivery found for ${trainee.nameAr}:`, {
            traineeId: trainee.id,
            traineeIdType: typeof trainee.id,
            deliveryTraineeId: delivery.traineeId,
            deliveryTraineeIdType: typeof delivery.traineeId,
            status: delivery.status,
            deliveryId: delivery.id
          });
        } else if (trainee.nameAr.includes('ابراهيم')) {
          // Special debugging for "ابراهيم"
          console.log(`❌ No delivery found for ${trainee.nameAr}:`, {
            traineeId: trainee.id,
            traineeIdType: typeof trainee.id,
            allDeliveriesForThisMaterial: deliveries.length,
            sampleDeliveryIds: deliveries.slice(0, 3).map(d => ({
              traineeId: d.traineeId,
              type: typeof d.traineeId,
              status: d.status
            }))
          });
        }
        
        let feePaymentStatus = null;
        if (material!.linkedFeeId && material!.linkedFee) {
          const payment = paymentStatuses.find((p: any) => p.traineeId === trainee.id);
          const amountPaid = payment?.paidAmount || 0;
          const requiredAmount = material!.linkedFee.amount;
          feePaymentStatus = {
            isPaid: amountPaid >= requiredAmount,
            amountPaid: amountPaid,
            remainingAmount: Math.max(0, requiredAmount - amountPaid),
          };
        }
        
        return {
          ...trainee,
          deliveryStatus: delivery?.status || null,
          deliveryId: delivery?.id,
          deliveryDate: delivery?.deliveryDate,
          quantity: delivery?.quantity,
          feePaymentStatus,
          // Debug info
          _debug: {
            hasDelivery: !!delivery,
            deliveryStatus: delivery?.status,
            deliveryId: delivery?.id
          }
        };
      });

      // Apply pagination
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const paginatedTrainees = traineesWithStatus.slice(start, end);

      setTrainees(paginatedTrainees);
      setPagination((prev) => ({
        ...prev,
        total: traineesWithStatus.length,
        totalPages: Math.ceil(traineesWithStatus.length / prev.limit),
      }));
      
      // Final summary log
      console.log('✅ Trainees loaded successfully:', {
        totalTrainees: traineesWithStatus.length,
        paginatedCount: paginatedTrainees.length,
        deliveriesMatched: traineesWithStatus.filter(t => t.deliveryStatus).length,
        deliveriesNotMatched: traineesWithStatus.filter(t => !t.deliveryStatus).length,
        deliveryStatuses: traineesWithStatus.reduce((acc: any, t) => {
          const status = t.deliveryStatus || 'NO_DELIVERY';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {})
      });
    } catch (error: any) {
      console.error('❌ Error loading trainees:', error);
      toast.error('فشل تحميل المتدربين');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (trainee: Trainee, action: 'deliver' | 'return' | 'lost') => {
    setConfirmDialog({
      isOpen: true,
      trainee,
      action,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      trainee: null,
      action: null,
    });
  };

  const handleConfirmAction = async () => {
    const { trainee, action } = confirmDialog;
    if (!trainee || !action) return;

    closeConfirmDialog();

    if (action === 'deliver') {
      await handleDeliver(trainee);
    } else if (action === 'return') {
      await handleUpdateStatus(trainee, 'RETURNED');
    } else if (action === 'lost') {
      await handleUpdateStatus(trainee, 'LOST');
    }
  };

  const handleDeliver = async (trainee: Trainee) => {
    if (!material) return;

    if (material.quantity <= 0) {
      toast.error('الكمية المتاحة غير كافية');
      return;
    }

    // التحقق من حالة التسليم الحالية
    if (trainee.deliveryStatus && trainee.deliveryStatus !== 'RETURNED') {
      const statusMessages = {
        'PENDING': 'تم تسجيل طلب تسليم هذه الأداة للمتدرب مسبقاً ولم يتم تسليمها بعد',
        'DELIVERED': 'تم تسليم هذه الأداة للمتدرب مسبقاً ولم يتم إرجاعها بعد',
        'LOST': 'تم تسجيل فقدان هذه الأداة للمتدرب مسبقاً'
      };
      
      const errorMessage = statusMessages[trainee.deliveryStatus] || 'تم تسليم هذه الأداة للمتدرب مسبقاً ولم يتم إرجاعها بعد';
      
      console.error('⚠️ Cannot deliver - trainee already has active delivery:', {
        traineeId: trainee.id,
        traineeName: trainee.nameAr,
        currentStatus: trainee.deliveryStatus,
        deliveryId: trainee.deliveryId,
        material: material.name
      });
      
      toast.error(errorMessage, { duration: 5000 });
      return;
    }

    console.log('📤 Attempting to create delivery:', {
      studyMaterialId: materialId,
      traineeId: trainee.id,
      traineeIdType: typeof trainee.id,
      traineeName: trainee.nameAr,
      materialName: material.name
    });

    try {
      // حفظ موضع التمرير الحالي
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      await createDelivery({
        studyMaterialId: materialId,
        traineeId: trainee.id,
        quantity: 1,
      });
      toast.success(`تم تسليم ${material.name} للمتدرب ${trainee.nameAr}`);
      
      // Reload data to reflect changes
      await Promise.all([loadMaterial(), loadTrainees()]);
      
      // إعادة التمرير إلى الموضع السابق بعد تحميل البيانات
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error creating delivery:', {
        error,
        message: error.message,
        traineeId: trainee.id,
        materialId
      });
      
      // Display user-friendly error message
      toast.error(error.message || 'فشل تسجيل التسليم', { duration: 5000 });
    }
  };

  const handleUpdateStatus = async (trainee: Trainee, newStatus: 'DELIVERED' | 'RETURNED' | 'LOST') => {
    if (!trainee.deliveryId) return;

    try {
      // حفظ موضع التمرير الحالي
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      await updateDelivery(trainee.deliveryId, { status: newStatus });
      toast.success('تم تحديث حالة التسليم');
      
      await loadTrainees();
      if (newStatus === 'RETURNED') {
        await loadMaterial(); // Reload to update quantity
      }
      
      // إعادة التمرير إلى الموضع السابق بعد تحميل البيانات
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
    } catch (error: any) {
      console.error('Error updating delivery:', error);
      toast.error(error.message || 'فشل تحديث حالة التسليم');
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (!material) {
    return (
      <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'view' }}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={`تسليم: ${material.name}`}
          description={`البرنامج التدريبي: ${material.program?.nameAr}`}
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الأدوات الدراسية', href: '/dashboard/study-materials' },
            { label: 'التسليم', href: '/dashboard/study-materials/deliveries' },
            { label: material.name },
          ]}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => {
                  const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                  toast.loading('جاري تحديث البيانات...');
                  Promise.all([loadMaterial(), loadTrainees()]).then(() => {
                    toast.dismiss();
                    toast.success('تم تحديث البيانات بنجاح');
                    setTimeout(() => { window.scrollTo({ top: scrollPosition, behavior: 'smooth' }); }, 100);
                  });
                }}
                variant="outline"
                size="sm"
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                تحديث
              </Button>
              <Button onClick={() => router.push('/dashboard/study-materials/deliveries')} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
                رجوع
              </Button>
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Material Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{material.name}</h3>
                  {material.nameEn && <p className="text-xs text-slate-400 truncate">{material.nameEn}</p>}
                  {material.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{material.description}</p>}
                </div>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-[11px] text-slate-400 mb-0.5">الكمية المتاحة</p>
                <p className="text-2xl font-bold text-blue-600 tabular-nums">{material.quantity}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="ابحث في المتدربين..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              {searchQuery && (
                <button onClick={handleClearSearch} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium px-3 transition-colors">
                  <XMarkIcon className="w-3.5 h-3.5" /> مسح
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200 rounded" /><div className="h-3 w-32 bg-slate-100 rounded" /></div>
                  <div className="h-8 w-20 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                {searchQuery ? 'لا توجد نتائج تطابق البحث' : 'لا يوجد متدربين في هذا البرنامج'}
              </h3>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {trainees.map((trainee) => {
                  const StatusIcon = trainee.deliveryStatus ? STATUS_ICONS[trainee.deliveryStatus] : null;
                  return (
                    <div key={trainee.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <TraineeAvatar photoUrl={trainee.photoUrl} name={trainee.nameAr} nationalId={trainee.nationalId} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{trainee.nationalId}</p>
                          {canViewPhone && trainee.phone && (
                            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums" dir="ltr">{trainee.phone}</p>
                          )}
                        </div>
                        {trainee.deliveryStatus ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0 ${STATUS_COLORS[trainee.deliveryStatus]}`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                            {STATUS_LABELS[trainee.deliveryStatus]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 flex-shrink-0">
                            لم يسلّم
                          </span>
                        )}
                      </div>

                      {material!.linkedFee && trainee.feePaymentStatus && (
                        <div className="mb-3">
                          {trainee.feePaymentStatus.isPaid ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
                              <CheckCircleIcon className="w-3 h-3 flex-shrink-0" />
                              <span>مسدد بالكامل ({trainee.feePaymentStatus.amountPaid} ج.م)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                              <ExclamationCircleIcon className="w-3 h-3 flex-shrink-0" />
                              <span>غير مسدد - متبقي: {trainee.feePaymentStatus.remainingAmount} ج.م</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!trainee.deliveryStatus ? (
                          <Button
                            onClick={() => openConfirmDialog(trainee, 'deliver')}
                            disabled={material.quantity <= 0 || (!!trainee.feePaymentStatus && !trainee.feePaymentStatus.isPaid)}
                            variant="success"
                            size="sm"
                            className="flex-1"
                            leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}
                          >
                            تسليم
                          </Button>
                        ) : (
                          <>
                            {trainee.deliveryStatus === 'DELIVERED' && (
                              <>
                                <Button onClick={() => openConfirmDialog(trainee, 'return')} variant="outline" size="sm" className="flex-1" leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}>
                                  إرجاع
                                </Button>
                                <Button onClick={() => openConfirmDialog(trainee, 'lost')} variant="danger" size="sm" className="flex-1">
                                  مفقود
                                </Button>
                              </>
                            )}
                            {trainee.deliveryStatus === 'PENDING' && (
                              <Button onClick={() => openConfirmDialog(trainee, 'lost')} variant="danger" size="sm" className="flex-1">
                                مفقود
                              </Button>
                            )}
                            {trainee.deliveryStatus === 'RETURNED' && (
                              <Button onClick={() => openConfirmDialog(trainee, 'deliver')} disabled={material.quantity <= 0} variant="success" size="sm" className="flex-1" leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}>
                                إعادة تسليم
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المتدرب</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرقم القومي</th>
                        {canViewPhone && (
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الهاتف</th>
                        )}
                        {material!.linkedFee && (
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">حالة السداد</th>
                        )}
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">حالة التسليم</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trainees.map((trainee) => {
                        const StatusIcon = trainee.deliveryStatus ? STATUS_ICONS[trainee.deliveryStatus] : null;
                        return (
                          <tr key={trainee.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <TraineeAvatar photoUrl={trainee.photoUrl} name={trainee.nameAr} nationalId={trainee.nationalId} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                                  {trainee.nameEn && <p className="text-xs text-slate-400 truncate">{trainee.nameEn}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-slate-700 tabular-nums">{trainee.nationalId}</span>
                            </td>
                            {canViewPhone && (
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-700 tabular-nums" dir="ltr">{trainee.phone}</span>
                              </td>
                            )}
                            {material!.linkedFee && (
                              <td className="px-4 py-3">
                                {trainee.feePaymentStatus ? (
                                  trainee.feePaymentStatus.isPaid ? (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircleIcon className="w-3 h-3" /> مسدد
                                      </span>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{trainee.feePaymentStatus.amountPaid} ج.م</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                                        <ExclamationCircleIcon className="w-3 h-3" /> غير مسدد
                                      </span>
                                      <p className="text-[10px] text-red-500 mt-0.5">متبقي: {trainee.feePaymentStatus.remainingAmount} ج.م</p>
                                    </div>
                                  )
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                    لم يطبق
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              {trainee.deliveryStatus ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[trainee.deliveryStatus]}`}>
                                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                  {STATUS_LABELS[trainee.deliveryStatus]}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                  لم يسلّم
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {!trainee.deliveryStatus ? (
                                  <Button
                                    onClick={() => openConfirmDialog(trainee, 'deliver')}
                                    disabled={material.quantity <= 0 || (!!trainee.feePaymentStatus && !trainee.feePaymentStatus.isPaid)}
                                    variant="success"
                                    size="sm"
                                    leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}
                                    title={trainee.feePaymentStatus && !trainee.feePaymentStatus.isPaid ? `يجب سداد ${trainee.feePaymentStatus.remainingAmount} ج.م أولاً` : ''}
                                  >
                                    تسليم
                                  </Button>
                                ) : (
                                  <>
                                    {trainee.deliveryStatus === 'DELIVERED' && (
                                      <>
                                        <Button onClick={() => openConfirmDialog(trainee, 'return')} variant="outline" size="sm" leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}>
                                          إرجاع
                                        </Button>
                                        <Button onClick={() => openConfirmDialog(trainee, 'lost')} variant="danger" size="sm">
                                          مفقود
                                        </Button>
                                      </>
                                    )}
                                    {trainee.deliveryStatus === 'PENDING' && (
                                      <Button onClick={() => openConfirmDialog(trainee, 'lost')} variant="danger" size="sm">
                                        مفقود
                                      </Button>
                                    )}
                                    {trainee.deliveryStatus === 'RETURNED' && (
                                      <Button onClick={() => openConfirmDialog(trainee, 'deliver')} disabled={material.quantity <= 0} variant="success" size="sm" leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}>
                                        إعادة تسليم
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <Pagination
                pagination={{
                  page: pagination.page,
                  limit: pagination.limit,
                  total: pagination.total,
                  totalPages: pagination.totalPages,
                  hasNext: pagination.page < pagination.totalPages,
                  hasPrev: pagination.page > 1,
                }}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <TibaModal
        open={confirmDialog.isOpen && !!confirmDialog.trainee}
        onClose={closeConfirmDialog}
        title={
          confirmDialog.action === 'deliver' ? 'تأكيد التسليم' :
          confirmDialog.action === 'return' ? 'تأكيد الإرجاع' : 'تأكيد الفقدان'
        }
        subtitle={
          confirmDialog.action === 'deliver' ? 'هل أنت متأكد من تسليم هذه الأداة للمتدرب؟' :
          confirmDialog.action === 'return' ? 'هل أنت متأكد من استلام الأداة من المتدرب؟' :
          'هل أنت متأكد من تسجيل هذه الأداة كمفقودة؟'
        }
        variant={confirmDialog.action === 'deliver' ? 'primary' : confirmDialog.action === 'return' ? 'neutral' : 'danger'}
        size="sm"
        icon={
          confirmDialog.action === 'deliver' ? <CheckCircleIcon className="w-6 h-6" /> :
          confirmDialog.action === 'return' ? <ArrowPathIcon className="w-6 h-6" /> :
          <ExclamationCircleIcon className="w-6 h-6" />
        }
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={closeConfirmDialog}>إلغاء</Button>
            <Button
              variant={confirmDialog.action === 'lost' ? 'danger' : confirmDialog.action === 'deliver' ? 'success' : 'primary'}
              className="flex-1"
              onClick={handleConfirmAction}
              leftIcon={
                confirmDialog.action === 'deliver' ? <CheckCircleIcon className="w-4 h-4" /> :
                confirmDialog.action === 'return' ? <ArrowPathIcon className="w-4 h-4" /> :
                <ExclamationCircleIcon className="w-4 h-4" />
              }
            >
              {confirmDialog.action === 'deliver' ? 'تأكيد التسليم' :
               confirmDialog.action === 'return' ? 'تأكيد الإرجاع' : 'تأكيد الفقدان'}
            </Button>
          </div>
        }
      >
        {confirmDialog.trainee && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <TraineeAvatar photoUrl={confirmDialog.trainee.photoUrl} name={confirmDialog.trainee.nameAr} nationalId={confirmDialog.trainee.nationalId} size="sm" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">اسم المتدرب</p>
                <p className="text-sm font-bold text-slate-900 truncate">{confirmDialog.trainee.nameAr}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CubeIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">الأداة الدراسية</p>
                <p className="text-sm font-bold text-slate-900 truncate">{material?.name}</p>
              </div>
            </div>
          </div>
        )}
      </TibaModal>
    </ProtectedPage>
  );
}

