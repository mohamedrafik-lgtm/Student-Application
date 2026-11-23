'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  FiCalendar, FiClock, FiAlertCircle, FiPlus, FiEdit2, FiTrash2,
  FiCheck, FiX, FiInfo, FiLock, FiUnlock, FiBook, FiSearch
} from 'react-icons/fi';
import { FiLoader } from 'react-icons/fi';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface PaymentSchedule {
  id: string;
  feeId: number;
  paymentStartDate: string | null;
  paymentEndDate: string | null;
  gracePeriodDays: number;
  finalDeadline: string | null;
  nonPaymentActions: string[];
  actionEnabled: boolean;
  notes: string | null;
  fineSourceFeeId: number | null;
  fineSourceAmount: number | null;
  fineSourceDescription: string | null;
  fineRecurrence: 'ONCE' | 'MONTHLY' | null;
  createdAt: string;
  fee: {
    id: number;
    name: string;
    amount: number;
    type: string;
    program: {
      id: number;
      nameAr: string;
    };
  };
}

interface FineProcessingSummary {
  paymentRecords: number;
  unpaidRecords: number;
  pendingRequests: number;
  deferredRecords: number;
  notYetDue: number;
  applied: number;
  failed: number;
  failure?: string;
}

type PaymentScheduleSaveResponse = PaymentSchedule & { fineProcessing?: FineProcessingSummary };

interface FineSourceFeeOption {
  id: number;
  amount: number;
  name: string;
  programId: number;
}

const ACTION_OPTIONS = [
  { value: 'DISABLE_ATTENDANCE', label: 'إيقاف نظام الحضور', icon: '📅' },
  { value: 'DISABLE_PLATFORM', label: 'إيقاف المنصة الإلكترونية', icon: '💻' },
  { value: 'DISABLE_QUIZZES', label: 'إيقاف الاختبارات الإلكترونية', icon: '📝' },
  { value: 'DISABLE_ALL', label: 'إيقاف الكل', icon: '🚫' },
];

function PaymentSchedulesPageContent() {
  const { hasPermission } = usePermissions();
  
  const canView = hasPermission('dashboard.financial.payment-schedules', 'view');
  const canManage = hasPermission('dashboard.financial.payment-schedules', 'manage');

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [schedulesData, setSchedulesData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    feeId: '',
    paymentStartDate: '',
    paymentEndDate: '',
    gracePeriodDays: 0,
    nonPaymentActions: [] as string[],
    actionEnabled: false,
    notes: '',
    fineSourceFeeId: '',
    fineRecurrence: '' as '' | 'ONCE' | 'MONTHLY',
  });
  const fineSourceFees: FineSourceFeeOption[] = (schedulesData.fees || [])
    .filter((fee: any) => Number(fee.id) !== Number(formData.feeId));
  const selectedFineSource = fineSourceFees.find(fee => fee.id === Number(formData.fineSourceFeeId));

  useEffect(() => {
    if (canView) {
      fetchPrograms();
    }
  }, [canView]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const programsData = await fetchAPI('/programs');
      setPrograms(programsData);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('حدث خطأ في تحميل البرامج');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulesForProgram = async (programId: number) => {
    try {
      const [schedulesRes, feesRes] = await Promise.all([
        fetchAPI('/payment-schedules'),
        fetchAPI('/finances/trainee-fees'),
      ]);
      
      // تصنيف حسب البرنامج
      const programFees = feesRes.filter((f: any) => f.programId === programId);
      const programSchedules = schedulesRes.filter((s: any) => 
        programFees.some((f: any) => f.id === s.feeId)
      );
      
      setSchedulesData({
        fees: programFees,
        schedules: programSchedules,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

  const handleSelectProgram = (programId: number) => {
    setSelectedProgram(programId);
    fetchSchedulesForProgram(programId);
  };

  const handleToggleAction = (action: string) => {
    // إذا ضغط على "إيقاف الكل"
    if (action === 'DISABLE_ALL') {
      if (formData.nonPaymentActions.includes('DISABLE_ALL')) {
        // إلغاء الكل
        setFormData({ ...formData, nonPaymentActions: [] });
      } else {
        // تحديد الكل
        setFormData({
          ...formData,
          nonPaymentActions: ACTION_OPTIONS.map(o => o.value)
        });
      }
    } else {
      // خيار عادي
      if (formData.nonPaymentActions.includes(action)) {
        // إلغاء الاختيار (وإلغاء "إيقاف الكل" أيضاً)
        setFormData({
          ...formData,
          nonPaymentActions: formData.nonPaymentActions.filter(a => a !== action && a !== 'DISABLE_ALL')
        });
      } else {
        // إضافة الاختيار
        const newActions = [...formData.nonPaymentActions, action];
        // إذا تم تحديد الكل ماعدا "إيقاف الكل"، أضف "إيقاف الكل" تلقائياً
        const allExceptDisableAll = ACTION_OPTIONS.filter(o => o.value !== 'DISABLE_ALL').map(o => o.value);
        const hasAllOthers = allExceptDisableAll.every(a => newActions.includes(a));
        if (hasAllOthers) {
          newActions.push('DISABLE_ALL');
        }
        setFormData({
          ...formData,
          nonPaymentActions: newActions
        });
      }
    }
  };

  const handleSelectAllActions = () => {
    if (formData.nonPaymentActions.length === ACTION_OPTIONS.length) {
      setFormData({ ...formData, nonPaymentActions: [] });
    } else {
      setFormData({
        ...formData,
        nonPaymentActions: ACTION_OPTIONS.map(a => a.value)
      });
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSearchQuery('');
    setFormData({
      feeId: '',
      paymentStartDate: '',
      paymentEndDate: '',
      gracePeriodDays: 0,
      nonPaymentActions: [],
      actionEnabled: false,
      notes: '',
      fineSourceFeeId: '',
      fineRecurrence: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (schedule: PaymentSchedule) => {
    setModalMode('edit');
    setSearchQuery('');
    setSelectedSchedule(schedule);
    setFormData({
      feeId: schedule.feeId.toString(),
      paymentStartDate: schedule.paymentStartDate ? schedule.paymentStartDate.split('T')[0] : '',
      paymentEndDate: schedule.paymentEndDate ? schedule.paymentEndDate.split('T')[0] : '',
      gracePeriodDays: schedule.gracePeriodDays,
      nonPaymentActions: schedule.nonPaymentActions || [],
      actionEnabled: schedule.actionEnabled,
      notes: schedule.notes || '',
      fineSourceFeeId: schedule.fineSourceFeeId?.toString() || '',
      fineRecurrence: schedule.fineRecurrence || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      toast.error('ليس لديك صلاحية الإدارة');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      let savedSchedule: PaymentScheduleSaveResponse | undefined;
      if (modalMode === 'create') {
        savedSchedule = await fetchAPI('/payment-schedules', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            feeId: parseInt(formData.feeId),
            fineSourceFeeId: formData.fineSourceFeeId ? Number(formData.fineSourceFeeId) : null,
            fineRecurrence: formData.fineRecurrence || null,
          }),
        });
      } else if (selectedSchedule) {
        savedSchedule = await fetchAPI(`/payment-schedules/${selectedSchedule.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, fineSourceFeeId: formData.fineSourceFeeId ? Number(formData.fineSourceFeeId) : null, fineRecurrence: formData.fineRecurrence || null }),
        });
      }

      const actionLabel = modalMode === 'create' ? 'تم إنشاء موعد السداد بنجاح' : 'تم تحديث موعد السداد بنجاح';
      const fineResult = savedSchedule?.fineProcessing;
      if (formData.fineRecurrence && fineResult) {
        if (fineResult.failure) toast.error(`تم حفظ الموعد، لكن تعذر تطبيق الغرامة: ${fineResult.failure}`);
        else if (fineResult.applied > 0) toast.success(`${actionLabel}، وتم تطبيق ${fineResult.applied.toLocaleString('ar-EG')} غرامة مستحقة فورًا`);
        else if (fineResult.paymentRecords === 0) toast(`${actionLabel}. لم توجد سجلات سداد على الرسم حتى تُضاف إليها الغرامة.`, { icon: 'ℹ️' });
        else if (fineResult.unpaidRecords === 0) toast(`${actionLabel}. لا توجد مديونيات غير مسددة على هذا الرسم.`, { icon: 'ℹ️' });
        else if (fineResult.pendingRequests > 0) toast(`${actionLabel}. استُثني ${fineResult.pendingRequests.toLocaleString('ar-EG')} متدرب لوجود طلب تأجيل قيد المراجعة.`, { icon: 'ℹ️' });
        else if (fineResult.notYetDue > 0) toast(`${actionLabel}. لم ينته موعد السداد أو فترة السماح بعد.`, { icon: 'ℹ️' });
        else toast(`${actionLabel}. لم توجد غرامات جديدة؛ قد تكون مسجلة مسبقًا.`, { icon: 'ℹ️' });
      } else {
        toast.success(actionLabel);
      }
      
      setShowModal(false);
      if (selectedProgram) {
        fetchSchedulesForProgram(selectedProgram);
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error(error.message || 'حدث خطأ في حفظ البيانات');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error('ليس لديك صلاحية الحذف');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف موعد السداد؟')) {
      return;
    }

    try {
      await fetchAPI(`/payment-schedules/${id}`, {
        method: 'DELETE',
      });
      toast.success('تم حذف موعد السداد بنجاح');
      if (selectedProgram) {
        fetchSchedulesForProgram(selectedProgram);
      }
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error(error.message || 'حدث خطأ في الحذف');
    }
  };

  const calculateFinalDeadline = () => {
    if (formData.paymentEndDate && formData.gracePeriodDays > 0) {
      const endDate = new Date(formData.paymentEndDate);
      endDate.setDate(endDate.getDate() + formData.gracePeriodDays);
      return endDate.toLocaleDateString('ar-EG');
    }
    return formData.paymentEndDate ? new Date(formData.paymentEndDate).toLocaleDateString('ar-EG') : 'غير محدد';
  };

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiLock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح</h2>
          <p className="text-gray-600">ليس لديك صلاحية عرض هذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FiCalendar className="h-5 w-5 text-white" />
                </div>
                مواعيد سداد الرسوم
              </h1>
              <p className="text-gray-600 mt-2">إدارة مواعيد سداد الرسوم والإجراءات عند عدم السداد</p>
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        {!selectedProgram ? (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">اختر البرنامج التدريبي</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleSelectProgram(program.id)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-300 text-right"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FiBook className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{program.nameAr}</h3>
                      <p className="text-sm text-gray-600">{program.nameEn}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    السعر: <span className="font-semibold text-green-600">{program.price.toLocaleString()} ج.م</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Back Button & Add Button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedProgram(null)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium"
              >
                <FiX className="h-5 w-5" />
                العودة للبرامج
              </button>
              {canManage && schedulesData.fees?.length > 0 && (
                <button
                  onClick={handleOpenCreate}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center gap-2"
                >
                  <FiPlus className="h-5 w-5" />
                  إضافة موعد سداد
                </button>
              )}
            </div>

            {/* Current Program Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-6">
              <h3 className="font-bold text-lg text-blue-900 mb-1">
                {programs.find(p => p.id === selectedProgram)?.nameAr}
              </h3>
              <p className="text-sm text-blue-700">
                عدد الرسوم: {schedulesData.fees?.length || 0} | 
                مواعيد محددة: {schedulesData.schedules?.length || 0}
              </p>
            </div>

            {/* Schedules List */}
            {schedulesData.fees?.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد رسوم</h3>
                <p className="text-gray-600">لا توجد رسوم مسجلة لهذا البرنامج بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedulesData.fees?.map((fee: any) => {
                  const schedule = schedulesData.schedules?.find((s: any) => s.feeId === fee.id);

                  return (
                    <div key={fee.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                      {/* Fee Info */}
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{fee.name}</h3>
                        <p className="text-sm font-semibold text-green-600">
                          {fee.amount.toLocaleString()} ج.م
                        </p>
                      </div>

                      {schedule ? (
                        <>
                          {/* Dates */}
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2">
                              <FiCalendar className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-gray-700">بداية:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {schedule.paymentStartDate ? new Date(schedule.paymentStartDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <FiCalendar className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-gray-700">نهاية:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {schedule.paymentEndDate ? new Date(schedule.paymentEndDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                              </span>
                            </div>

                            {schedule.gracePeriodDays > 0 && (
                              <>
                                <div className="flex items-center gap-2">
                                  <FiClock className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm text-gray-700">فترة السماح:</span>
                                  <span className="text-sm font-medium text-orange-600">
                                    {schedule.gracePeriodDays} يوم
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-purple-50 p-2 rounded">
                                  <FiAlertCircle className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm text-gray-700">الموعد النهائي:</span>
                                  <span className="text-sm font-bold text-purple-600">
                                    {schedule.finalDeadline ? new Date(schedule.finalDeadline).toLocaleDateString('ar-EG') : 'غير محدد'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          {schedule.fineRecurrence && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                            <div className="font-semibold text-amber-900">غرامة {schedule.fineRecurrence === 'MONTHLY' ? 'شهرية' : 'مرة واحدة'}</div>
                            <div className="text-amber-800">{schedule.fineSourceDescription || 'رسم مالي'} · {Number(schedule.fineSourceAmount || 0).toLocaleString('ar-EG')} ج.م</div>
                          </div>}
                          {/* Actions */}
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">الإجراءات:</span>
                              {schedule.actionEnabled ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                                  <FiUnlock className="h-3 w-3" />
                                  مفعلة
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full flex items-center gap-1">
                                  <FiLock className="h-3 w-3" />
                                  معطلة
                                </span>
                              )}
                            </div>
                            {schedule.nonPaymentActions && schedule.nonPaymentActions.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {schedule.nonPaymentActions.map((action: string) => {
                                  const option = ACTION_OPTIONS.find(o => o.value === action);
                                  return (
                                    <span key={action} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                                      {option?.icon} {option?.label}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">لا توجد إجراءات محددة</p>
                            )}
                          </div>

                          {/* Notes */}
                          {schedule.notes && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-600 font-medium mb-1">ملاحظات:</p>
                              <p className="text-sm text-gray-700">{schedule.notes}</p>
                            </div>
                          )}

                          {/* Actions Buttons */}
                          {canManage && (
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => handleOpenEdit(schedule)}
                                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <FiEdit2 className="h-4 w-4" />
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <FiTrash2 className="h-4 w-4" />
                                حذف
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 mb-4">لم يتم تحديد موعد سداد</p>
                          {canManage && (
                            <button
                              onClick={() => {
                                setFormData({ ...formData, feeId: fee.id.toString(), ...(Number(formData.fineSourceFeeId) === fee.id ? { fineSourceFeeId: '', fineRecurrence: '' as const } : {}) });
                                handleOpenCreate();
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mx-auto"
                            >
                              <FiPlus className="h-4 w-4" />
                              إضافة موعد
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                      {modalMode === 'create' ? 'إنشاء موعد سداد جديد' : 'تعديل موعد السداد'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Fee Selection - Create Mode */}
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الرسوم *
                      </label>
                      <select
                        value={formData.feeId}
                        onChange={(e) => setFormData({ ...formData, feeId: e.target.value, ...(Number(formData.fineSourceFeeId) === Number(e.target.value) ? { fineSourceFeeId: '', fineRecurrence: '' as const } : {}) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">اختر الرسوم</option>
                        {schedulesData.fees?.filter((f: any) =>
                          !schedulesData.schedules?.some((s: any) => s.feeId === f.id)
                        ).map((fee: any) => (
                          <option key={fee.id} value={fee.id}>
                            {fee.name} ({fee.amount.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Fee Display - Edit Mode */}
                  {modalMode === 'edit' && selectedSchedule && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <FiBook className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 font-medium mb-1">الرسم المطبق عليه موعد السداد:</p>
                          <h3 className="text-lg font-bold text-gray-900">{selectedSchedule.fee.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            المبلغ: <span className="font-semibold text-green-600">{selectedSchedule.fee.amount.toLocaleString()} ج.م</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        موعد بداية السداد
                      </label>
                      <input
                        type="date"
                        value={formData.paymentStartDate}
                        onChange={(e) => setFormData({ ...formData, paymentStartDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">اتركه فارغاً إذا كان غير محدد</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        موعد نهاية السداد
                      </label>
                      <input
                        type="date"
                        value={formData.paymentEndDate}
                        onChange={(e) => setFormData({ ...formData, paymentEndDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">اتركه فارغاً إذا كان غير محدد</p>
                    </div>
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      فترة السماح (بالأيام)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.gracePeriodDays}
                      onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.gracePeriodDays > 0 && (
                      <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-700">
                          <FiInfo className="inline h-4 w-4 mr-1" />
                          الموعد النهائي (بعد فترة السماح): <strong>{calculateFinalDeadline()}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Non-Payment Actions - Multiple Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        الإجراءات عند عدم السداد (اختيار متعدد)
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllActions}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {formData.nonPaymentActions.length === ACTION_OPTIONS.length ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ACTION_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            formData.nonPaymentActions.includes(option.value)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.nonPaymentActions.includes(option.value)}
                            onChange={() => handleToggleAction(option.value)}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="text-2xl">{option.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{option.label}</span>
                          {formData.nonPaymentActions.includes(option.value) && (
                            <FiCheck className="h-4 w-4 text-blue-600 mr-auto" />
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium">
                        ℹ️ الإجراءات المفعلة:
                      </p>
                      <ul className="text-xs text-blue-600 mt-2 space-y-1">
                        <li>✅ <strong>إيقاف المنصة:</strong> يعمل - يمنع الوصول الكامل</li>
                        <li>✅ <strong>إيقاف الحضور:</strong> يعمل - يمنع تسجيل الحضور</li>
                        <li>⚠️ <strong>إيقاف الاختبارات:</strong> قيد التطوير</li>
                      </ul>
                    </div>
                  </div>

                  {/* Action Enabled */}
                  <section className="space-y-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5">
                    <div>
                      <h3 className="font-bold text-amber-950">غرامة التأخير <span className="text-xs font-medium text-amber-700">(اختياري)</span></h3>
                      <p className="mt-1 text-sm leading-6 text-amber-800">تُضاف الغرامة لكل متدرب لديه مبلغ غير مسدد من الرسم المرتبط بهذا الموعد. اختر أدناه رسمًا آخر لتحديد قيمة الغرامة فقط؛ لا يشترط أن يكون هذا الرسم مستحقًا على المتدرب.</p>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                      <label htmlFor="fine-source-search" className="sr-only">البحث في الرسوم المالية</label>
                      <div className="flex items-center gap-2 border-b border-slate-200 px-3">
                        <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                          id="fine-source-search"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="ابحث باسم الرسم أو قيمته"
                          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 focus:ring-0"
                        />
                        {formData.fineSourceFeeId && <button
                          type="button"
                          onClick={() => setFormData({ ...formData, fineSourceFeeId: '', fineRecurrence: '' })}
                          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >إزالة الاختيار</button>}
                      </div>

                      <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
                        <button
                          type="button"
                          aria-pressed={!formData.fineSourceFeeId}
                          onClick={() => setFormData({ ...formData, fineSourceFeeId: '', fineRecurrence: '' })}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-right text-sm transition-colors ${!formData.fineSourceFeeId ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <span>بدون غرامة</span>
                          {!formData.fineSourceFeeId && <FiCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
                        </button>
                        {fineSourceFees
                          .filter(fee => `${fee.name} ${fee.amount}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                          .map(fee => {
                            const isSelected = fee.id === Number(formData.fineSourceFeeId);
                            return <button
                              type="button"
                              key={fee.id}
                              aria-pressed={isSelected}
                              onClick={() => setFormData({ ...formData, fineSourceFeeId: fee.id.toString(), fineRecurrence: formData.fineRecurrence || 'ONCE' })}
                              className={`flex w-full min-w-0 items-center gap-3 px-3 py-3 text-right transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}><FiBook className="h-4 w-4" /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-800" title={fee.name}>{fee.name}</span>
                                <span className="mt-0.5 block text-xs text-slate-500">رسم مالي من البرنامج الحالي</span>
                              </span>
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{Number(fee.amount).toLocaleString('ar-EG')} ج.م</span>
                              {isSelected && <FiCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
                            </button>;
                          })}
                        {fineSourceFees.filter(fee => `${fee.name} ${fee.amount}`.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 && (
                          <p className="px-4 py-6 text-center text-sm text-slate-500">لا توجد رسوم مالية أخرى مطابقة ضمن البرنامج.</p>
                        )}
                      </div>
                    </div>

                    {formData.fineSourceFeeId && <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-emerald-800">الرسم المالي المختار للغرامة</div>
                        <div className="mt-0.5 truncate text-sm font-medium text-emerald-950" title={selectedFineSource?.name || selectedSchedule?.fineSourceDescription || ''}>
                          {selectedFineSource?.name || selectedSchedule?.fineSourceDescription || 'رسم مالي'}
                        </div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-sm font-bold text-emerald-900">
                        {Number(selectedFineSource?.amount || selectedSchedule?.fineSourceAmount || 0).toLocaleString('ar-EG')} ج.م
                      </div>
                    </div>}

                    {formData.fineSourceFeeId && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-100/60 p-3">
                      <label className="block text-sm font-medium text-gray-700">طريقة تطبيق الغرامة</label>
                      <select value={formData.fineRecurrence} onChange={e => setFormData({...formData, fineRecurrence:e.target.value as 'ONCE' | 'MONTHLY'})} className="w-full rounded-lg border border-gray-300 bg-white p-3" required>
                        <option value="ONCE">مرة واحدة على الرسم</option>
                        <option value="MONTHLY">تتكرر شهريًا حتى سداد الرسم</option>
                      </select>
                      <p className="text-sm font-semibold text-amber-900">قيمة الغرامة: {Number(selectedFineSource?.amount || selectedSchedule?.fineSourceAmount || 0).toLocaleString('ar-EG')} ج.م</p>
                    </div>}
                  </section>

                  {/* Action Enabled */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="actionEnabled"
                      checked={formData.actionEnabled}
                      onChange={(e) => setFormData({ ...formData, actionEnabled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <label htmlFor="actionEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                      تفعيل الإجراءات عند عدم السداد
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ملاحظات إضافية
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="أي ملاحظات أو تفاصيل إضافية..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-6 pb-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isSubmitting ? <><FiLoader className="h-4 w-4 animate-spin" /> جارٍ {modalMode === 'create' ? 'الإنشاء' : 'الحفظ'}...</> : (modalMode === 'create' ? 'إنشاء' : 'حفظ التغييرات')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSchedulesPage() {
  return (
    <FinancialPageGuard>
      <PaymentSchedulesPageContent />
    </FinancialPageGuard>
  );
}
