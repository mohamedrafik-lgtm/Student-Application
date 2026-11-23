'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  CubeIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyMaterial,
  updateStudyMaterial,
  type StudyMaterial,
} from '@/lib/study-materials-api';
import { fetchAPI } from '@/lib/api';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  type: string;
  academicYear: string;
}

export default function EditStudyMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [fees, setFees] = useState<TraineeFee[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [traineeCount, setTraineeCount] = useState(0);
  const [loadingTraineeCount, setLoadingTraineeCount] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    programId: 0,
    linkedFeeId: null as number | null,
    quantity: 0,
    isActive: true,
    responsibleUserIds: [] as string[],
  });

  useEffect(() => {
    loadPrograms();
    loadUsers();
    loadMaterial();
  }, [materialId]);

  useEffect(() => {
    if (formData.programId > 0) {
      loadTraineeCount();
      loadFees();
    } else {
      setTraineeCount(0);
      setFees([]);
    }
  }, [formData.programId]);

  const loadPrograms = async () => {
    try {
      const response = await fetchAPI('/training-programs');
      const programsData = Array.isArray(response) ? response : (response.data || response.programs || []);
      setPrograms(programsData);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('فشل تحميل البرامج التدريبية');
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetchAPI('/users');
      const usersData = Array.isArray(response) ? response : (response.users || response.data || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadMaterial = async () => {
    try {
      setLoading(true);
      const material = await getStudyMaterial(materialId);
      const responsibleIds = (material as any).responsibleUsers?.map((r: any) => r.userId) || [];
      setFormData({
        name: material.name,
        nameEn: material.nameEn || '',
        description: material.description || '',
        programId: material.programId,
        linkedFeeId: material.linkedFeeId || null,
        quantity: material.quantity,
        isActive: material.isActive,
        responsibleUserIds: responsibleIds,
      });
    } catch (error: any) {
      console.error('Error loading material:', error);
      toast.error('فشل تحميل بيانات الأداة الدراسية');
    } finally {
      setLoading(false);
    }
  };

  const loadTraineeCount = async () => {
    try {
      setLoadingTraineeCount(true);
      const response = await fetchAPI(`/trainees?programId=${formData.programId}`);
      const traineesData = Array.isArray(response) ? response : (response.trainees || response.data || []);
      setTraineeCount(traineesData.length);
    } catch (error) {
      console.error('Error loading trainee count:', error);
      setTraineeCount(0);
    } finally {
      setLoadingTraineeCount(false);
    }
  };

  const loadFees = async () => {
    try {
      setLoadingFees(true);
      const response = await fetchAPI(`/finances/trainee-fees?programId=${formData.programId}`);
      const feesData = Array.isArray(response) ? response : (response.fees || response.data || []);
      setFees(feesData);
    } catch (error) {
      console.error('Error loading fees:', error);
      setFees([]);
    } finally {
      setLoadingFees(false);
    }
  };

  const setQuantityByTraineeCount = () => {
    setFormData({ ...formData, quantity: traineeCount });
    toast.success(`تم تعيين الكمية إلى ${traineeCount} (عدد المتدربين)`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('يرجى إدخال اسم الأداة'); return; }
    if (!formData.programId) { toast.error('يرجى اختيار البرنامج التدريبي'); return; }
    if (formData.quantity < 0) { toast.error('الكمية يجب أن تكون أكبر من أو تساوي صفر'); return; }
    try {
      setSubmitting(true);
      await updateStudyMaterial(materialId, formData);
      toast.success('تم تحديث الأداة الدراسية بنجاح');
      router.push('/dashboard/study-materials');
    } catch (error: any) {
      console.error('Error updating material:', error);
      toast.error(error.message || 'فشل تحديث الأداة الدراسية');
    } finally {
      setSubmitting(false);
    }
  };

  const programOptions = programs.map((p) => ({ value: String(p.id), label: p.nameAr }));
  const feeOptions = [
    { value: '0', label: 'مجاني (بدون رسوم)' },
    ...fees.map((f) => ({ value: String(f.id), label: `${f.name} - ${f.amount} جنيه مصري (${f.academicYear})` })),
  ];

  if (loading) {
    return (
      <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'edit' }}>
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
    <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'edit' }}>
      <div className="space-y-6">
        <PageHeader
          title="تعديل أداة دراسية"
          description="تعديل بيانات الأداة الدراسية"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الأدوات الدراسية', href: '/dashboard/study-materials' },
            { label: 'تعديل' },
          ]}
          actions={
            <Button onClick={() => router.push('/dashboard/study-materials')} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
              رجوع
            </Button>
          }
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* المعلومات الأساسية */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CubeIcon className="w-5 h-5 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">المعلومات الأساسية</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      اسم الأداة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full py-2.5 px-3.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="مثال: كتاب الرياضيات"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      اسم الأداة بالإنجليزية
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      className="w-full py-2.5 px-3.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Example: Mathematics Book"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    البرنامج التدريبي <span className="text-red-500">*</span>
                  </label>
                  <TibaSelect
                    options={programOptions}
                    value={String(formData.programId || '')}
                    onChange={(val) => setFormData({ ...formData, programId: parseInt(val) || 0, linkedFeeId: null })}
                    placeholder="اختر البرنامج التدريبي"
                    instanceId="select-program"
                  />
                </div>
              </div>
            </div>

            {/* إعدادات التسليم */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">إعدادات التسليم</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    الرسم المطلوب سداده للتسليم
                  </label>
                  <TibaSelect
                    options={feeOptions}
                    value={String(formData.linkedFeeId || 0)}
                    onChange={(val) => setFormData({ ...formData, linkedFeeId: val === '0' ? null : parseInt(val) })}
                    placeholder="مجاني (بدون رسوم)"
                    isDisabled={!formData.programId || loadingFees}
                    instanceId="select-fee"
                  />
                  <div className="mt-2">
                    {formData.linkedFeeId ? (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                        <span>التسليم يتطلب سداد الرسم بالكامل</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                        <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                        <span>الأداة مجانية ولا تتطلب سداد أي رسوم</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    <span className="flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> المسؤولون عن التسليم (اختياري)</span>
                  </label>
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-6 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="animate-pulse flex items-center gap-2 text-xs text-slate-400"><div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" /> جاري التحميل...</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      {users.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">لا يوجد موظفين متاحين</p>
                      ) : (
                        users.map((user) => (
                          <label
                            key={user.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${formData.responsibleUserIds.includes(user.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.responsibleUserIds.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, responsibleUserIds: [...formData.responsibleUserIds, user.id] });
                                } else {
                                  setFormData({ ...formData, responsibleUserIds: formData.responsibleUserIds.filter(id => id !== user.id) });
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {formData.responsibleUserIds.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                      <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>تم اختيار <strong>{formData.responsibleUserIds.length}</strong> موظف</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    الكمية المتاحة <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="flex-1 py-2.5 px-3.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      min="0"
                      required
                    />
                    {formData.programId > 0 && (
                      <Button type="button" onClick={setQuantityByTraineeCount} disabled={loadingTraineeCount || traineeCount === 0} variant="outline" size="sm" isLoading={loadingTraineeCount}>
                        حسب عدد المتدربين ({traineeCount})
                      </Button>
                    )}
                  </div>
                  {formData.programId > 0 && traineeCount > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                      <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>عدد المتدربين في البرنامج المختار: <strong>{traineeCount}</strong> متدرب</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* تفاصيل إضافية */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">تفاصيل إضافية</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">الوصف</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full py-2.5 px-3.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none placeholder:text-slate-400"
                    placeholder="وصف تفصيلي عن الأداة الدراسية..."
                  />
                </div>

                <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all border ${formData.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">الأداة نشطة ومتاحة للتسليم</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formData.isActive ? 'الأداة متاحة حالياً للتسليم' : 'الأداة معطلة ولن تظهر في قائمة التسليم'}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button type="button" onClick={() => router.push('/dashboard/study-materials')} variant="outline" className="w-full sm:w-auto">
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting} className="w-full sm:w-auto" leftIcon={<CheckCircleIcon className="w-4 h-4" />}>
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ProtectedPage>
  );
}

