'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDistribution, copyDistribution, getDistributions, type CreateDistributionDto, type TraineeDistribution, DistributionType } from '@/lib/trainee-distribution-api';
import { fetchAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  UsersIcon,
  BookOpenIcon,
  BeakerIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import PageHeader from '@/app/components/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  numberOfClassrooms: number;
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate: string | null;
  endDate: string | null;
}

interface Trainee {
  id: number;
  nameAr: string;
  traineeStatus: string;
}

export default function NewDistributionPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDistributionDto>({
    programId: 0,
    type: DistributionType.THEORY,
    numberOfRooms: 1,
  });
  const [roomCapacities, setRoomCapacities] = useState<number[]>([]);
  const [totalTrainees, setTotalTrainees] = useState<number>(0);
  const [loadingTrainees, setLoadingTrainees] = useState(false);

  // نسخ من توزيعة سابقة
  const [existingDistributions, setExistingDistributions] = useState<TraineeDistribution[]>([]);
  const [selectedCopySource, setSelectedCopySource] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);

  const canCreate = hasPermission('dashboard.trainees.distribution', 'create');

  useEffect(() => {
    loadPrograms();
  }, []);

  // جلب عدد المتدربين عند تغيير البرنامج
  useEffect(() => {
    if (formData.programId) {
      loadTraineesCount();
      loadClassrooms(formData.programId);
      loadExistingDistributions(formData.programId);
    } else {
      setTotalTrainees(0);
      setRoomCapacities([]);
      setClassrooms([]);
      setExistingDistributions([]);
    }
    // إعادة تعيين وضع النسخ عند تغيير البرنامج
    setCopyMode(false);
    setSelectedCopySource(null);
  }, [formData.programId]);

  // تحديث سعات المجموعات عند تغيير عدد المجموعات
  useEffect(() => {
    if (formData.numberOfRooms > 0 && totalTrainees > 0) {
      // توزيع تلقائي متساوي
      const perRoom = Math.floor(totalTrainees / formData.numberOfRooms);
      const remainder = totalTrainees % formData.numberOfRooms;
      
      const newCapacities = Array(formData.numberOfRooms).fill(perRoom);
      
      // توزيع الباقي على المجموعات الأولى
      for (let i = 0; i < remainder; i++) {
        newCapacities[i]++;
      }
      
      setRoomCapacities(newCapacities);
    } else {
      setRoomCapacities([]);
    }
  }, [formData.numberOfRooms, totalTrainees]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI<Program[]>('/programs');
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('حدث خطأ في تحميل البرامج');
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      const data = await fetchAPI<any>(`/programs/${programId}`);
      if (data.classrooms && data.classrooms.length > 0) {
        const sorted = data.classrooms.sort((a: Classroom, b: Classroom) => a.classNumber - b.classNumber);
        setClassrooms(sorted);
      } else {
        setClassrooms([]);
      }
    } catch (error) {
      console.error('Error loading classrooms:', error);
      setClassrooms([]);
    }
  };

  const isClassroomActive = (classroom: Classroom): boolean => {
    const now = new Date();
    if (!classroom.startDate || !classroom.endDate) return false;
    return now >= new Date(classroom.startDate) && now <= new Date(classroom.endDate);
  };

  const loadExistingDistributions = async (programId: number) => {
    try {
      const data = await getDistributions({ programId });
      setExistingDistributions(data);
    } catch (error) {
      console.error('Error loading existing distributions:', error);
      setExistingDistributions([]);
    }
  };

  const loadTraineesCount = async () => {
    try {
      setLoadingTrainees(true);
      const response = await fetchAPI<any>(
        `/trainees?programId=${formData.programId}`
      );
      
      // التعامل مع pagination response أو array مباشرة
      const trainees = Array.isArray(response) ? response : response.data;
      
      // فلترة المتدربين بحالة NEW أو CURRENT فقط
      const activeTrainees = trainees.filter((t: Trainee) => 
        t.traineeStatus === 'NEW' || t.traineeStatus === 'CURRENT'
      );
      
      setTotalTrainees(activeTrainees.length);
      console.log(`📊 Found ${activeTrainees.length} active trainees in program ${formData.programId}`);
    } catch (error) {
      console.error('Error loading trainees:', error);
      setTotalTrainees(0);
    } finally {
      setLoadingTrainees(false);
    }
  };

  const updateRoomCapacity = (index: number, value: number) => {
    const newCapacities = [...roomCapacities];
    newCapacities[index] = value;
    setRoomCapacities(newCapacities);
  };

  const getTotalAssigned = () => {
    return roomCapacities.reduce((sum, cap) => sum + cap, 0);
  };

  const getRemainingTrainees = () => {
    return totalTrainees - getTotalAssigned();
  };

  const isValidDistribution = () => {
    return getTotalAssigned() === totalTrainees && roomCapacities.every(cap => cap > 0);
  };

  const handleCopyFromExisting = async () => {
    if (!selectedCopySource || !formData.classroomId) return;

    try {
      setLoadingCopy(true);
      await copyDistribution(selectedCopySource, formData.classroomId);
      toast.success('تم نسخ التوزيعة بنجاح');
      router.push('/dashboard/trainees/distribution');
    } catch (error: any) {
      const msg = error?.message || 'حدث خطأ في نسخ التوزيعة';
      toast.error(msg);
    } finally {
      setLoadingCopy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error('ليس لديك صلاحية إنشاء توزيعات');
      return;
    }

    if (!formData.programId) {
      toast.error('يرجى اختيار البرنامج التدريبي');
      return;
    }

    if (formData.numberOfRooms < 1) {
      toast.error('يجب أن يكون عدد المجموعات أكبر من صفر');
      return;
    }

    if (!isValidDistribution()) {
      toast.error('مجموع سعات المجموعات يجب أن يساوي عدد المتدربين الكلي');
      return;
    }

    try {
      setLoading(true);
      await createDistribution({
        ...formData,
        roomCapacities: roomCapacities,
      });
      toast.success('تم إنشاء التوزيع بنجاح');
      router.push('/dashboard/trainees/distribution');
    } catch (error: any) {
      console.error('Error creating distribution:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء التوزيع');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title="توزيع جديد" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع', href: '/dashboard/trainees/distribution' }, { label: 'جديد' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">غير مصرح</h3>
            <p className="text-sm text-slate-500">ليس لديك صلاحية لإنشاء توزيعات جديدة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="توزيع جديد للمتدربين"
        description="قم بإنشاء توزيع جديد للمتدربين على المجموعات الدراسية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'التوزيع', href: '/dashboard/trainees/distribution' },
          { label: 'جديد' },
        ]}
        actions={
          <Button onClick={() => router.back()} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            رجوع
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <TibaSelect
                label="البرنامج التدريبي"
                required
                options={[
                  { value: '0', label: 'اختر البرنامج' },
                  ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
                ]}
                value={String(formData.programId)}
                onChange={(val) => {
                  const newProgramId = parseInt(val) || 0;
                  setFormData({ ...formData, programId: newProgramId, classroomId: undefined });
                  setCopyMode(false);
                  setSelectedCopySource(null);
                }}
                isSearchable
                isClearable={false}
                instanceId="new-dist-program"
              />
            </div>

            {/* اختيار الفصل الدراسي */}
            {classrooms.length > 0 && formData.programId > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الفصل الدراسي <span className="text-slate-400 text-xs">(اختياري - اتركه فارغاً لتوزيعة عامة)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, classroomId: undefined })}
                    className={`py-3 px-4 rounded-lg border transition-all text-right ${
                      !formData.classroomId
                        ? 'border-slate-500 bg-slate-50 text-slate-800 font-semibold ring-1 ring-slate-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <UsersIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="text-sm font-medium">توزيعة عامة</div>
                    <div className="text-[11px] text-slate-500">بدون فصل دراسي</div>
                  </button>
                  
                  {classrooms.map((classroom) => (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, classroomId: classroom.id })}
                      className={`py-3 px-4 rounded-lg border transition-all text-right ${
                        formData.classroomId === classroom.id
                          ? 'border-violet-500 bg-violet-50 text-violet-800 font-semibold ring-1 ring-violet-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <CalendarDaysIcon className="w-5 h-5 text-violet-500" />
                        {isClassroomActive(classroom) && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">
                            <CheckCircleIcon className="w-3 h-3" />
                            الحالي
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium">{classroom.name}</div>
                      {classroom.startDate && classroom.endDate && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(classroom.startDate).toLocaleDateString('ar-SA')} - {new Date(classroom.endDate).toLocaleDateString('ar-SA')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                نوع التوزيع <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: DistributionType.THEORY })}
                  className={`py-3 px-4 rounded-lg border transition-all ${
                    formData.type === DistributionType.THEORY
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <BookOpenIcon className="w-6 h-6 mx-auto mb-1.5 text-blue-500" />
                    <div className="text-sm">توزيع النظري</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: DistributionType.PRACTICAL })}
                  className={`py-3 px-4 rounded-lg border transition-all ${
                    formData.type === DistributionType.PRACTICAL
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-center">
                    <BeakerIcon className="w-6 h-6 mx-auto mb-1.5 text-emerald-500" />
                    <div className="text-sm">توزيع العملي</div>
                  </div>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                يمكن إنشاء توزيعين لكل فصل دراسي: توزيع النظري وتوزيع العملي
              </p>
            </div>

            {/* نسخ من توزيعة سابقة */}
            {formData.programId > 0 && formData.classroomId && existingDistributions.length > 0 && (() => {
              const copyableDistributions = existingDistributions.filter(
                d => d.classroomId !== formData.classroomId && d.type === formData.type
              );
              if (copyableDistributions.length === 0) return null;
              return (
                <div className="md:col-span-2">
                  <div className={`border rounded-xl p-5 transition-all ${
                    copyMode ? 'border-blue-300 bg-blue-50/30' : 'border-dashed border-slate-300 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={copyMode}
                          onChange={(e) => {
                            setCopyMode(e.target.checked);
                            if (!e.target.checked) setSelectedCopySource(null);
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <DocumentDuplicateIcon className="w-4 h-4 text-blue-600" />
                        نسخ من توزيعة سابقة
                      </label>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">{copyableDistributions.length} توزيعة متاحة</span>
                    </div>

                    {copyMode && (
                      <div className="space-y-2 mt-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-blue-700">
                            سيتم نسخ نفس المجموعات وترتيب الطلاب من التوزيعة المختارة إلى الفصل الدراسي الحالي
                          </p>
                        </div>
                        {copyableDistributions.map((dist) => (
                          <button
                            key={dist.id}
                            type="button"
                            onClick={() => setSelectedCopySource(dist.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-right ${
                              selectedCopySource === dist.id
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                                : 'border-slate-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                dist.type === 'THEORY' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {dist.type === 'THEORY' ? <BookOpenIcon className="w-4 h-4" /> : <BeakerIcon className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{dist.classroom?.name || 'عامة'}</p>
                                <p className="text-[11px] text-slate-500">
                                  {dist.numberOfRooms} مجموعات · {dist.rooms.reduce((s, r) => s + (r._count?.assignments || 0), 0)} متدرب · {dist.academicYear}
                                </p>
                              </div>
                            </div>
                            {selectedCopySource === dist.id && (
                              <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}

                        {selectedCopySource && (
                          <Button
                            type="button"
                            onClick={handleCopyFromExisting}
                            isLoading={loadingCopy}
                            fullWidth
                            className="mt-3"
                            leftIcon={<DocumentDuplicateIcon className="w-4 h-4" />}
                          >
                            نسخ التوزيعة الآن
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {!copyMode && (
            <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                عدد المجموعات <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max="20"
                value={formData.numberOfRooms}
                onChange={(e) => setFormData({ ...formData, numberOfRooms: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                سيتم توزيع المتدربين بترتيب أبجدي على المجموعات
              </p>
            </div>

            {/* عرض إجمالي المتدربين */}
            {totalTrainees > 0 && (
              <div className="md:col-span-2">
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UsersIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-medium">إجمالي المتدربين في البرنامج</p>
                        <p className="text-xl font-bold text-blue-600 tabular-nums">{totalTrainees} متدرب</p>
                      </div>
                    </div>
                    <div>
                      {isValidDistribution() ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                          <CheckCircleIcon className="w-4 h-4" />
                          التوزيع صحيح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          المتبقي: {getRemainingTrainees()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* سعات المجموعات */}
            {roomCapacities.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  سعة كل مجموعة (عدد المتدربين) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roomCapacities.map((capacity, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                        {formData.type === DistributionType.THEORY
                          ? <BookOpenIcon className="w-3.5 h-3.5 text-blue-500" />
                          : <BeakerIcon className="w-3.5 h-3.5 text-emerald-500" />
                        }
                        مجموعة {index + 1}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={totalTrainees}
                        value={capacity}
                        onChange={(e) => updateRoomCapacity(index, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base font-bold text-center tabular-nums transition-all"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  يمكنك تعديل عدد المتدربين في كل مجموعة يدوياً. يجب أن يكون <strong>المجموع = {totalTrainees}</strong>
                </p>
              </div>
            )}
            </>
            )}
          </div>

          {/* Submit Button */}
          {!copyMode && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              إلغاء
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading || !isValidDistribution() || totalTrainees === 0}
              leftIcon={
                !isValidDistribution() && totalTrainees > 0
                  ? <ExclamationTriangleIcon className="w-4 h-4" />
                  : <CheckCircleIcon className="w-4 h-4" />
              }
            >
              {!isValidDistribution() && totalTrainees > 0 ? 'يجب توزيع جميع المتدربين' : 'إنشاء التوزيع'}
            </Button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}