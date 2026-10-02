'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getDistributions, 
  deleteDistribution,
  type TraineeDistribution 
} from '@/lib/trainee-distribution-api';
import { fetchAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  UsersIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  BookOpenIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { TibaSelect } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
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

export default function TraineeDistributionPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [distributions, setDistributions] = useState<TraineeDistribution[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgramId, setFilterProgramId] = useState<string>('');
  const [filterClassroomId, setFilterClassroomId] = useState<string>('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  // التحقق من الصلاحيات
  const canView = hasPermission('dashboard.trainees.distribution', 'view');
  const canCreate = hasPermission('dashboard.trainees.distribution', 'create');
  const canEdit = hasPermission('dashboard.trainees.distribution', 'edit');
  const canDelete = hasPermission('dashboard.trainees.distribution', 'delete');
  const canPrint = hasPermission('dashboard.trainees.distribution', 'print');

  useEffect(() => {
    loadData();
  }, [filterProgramId, filterClassroomId]);

  // جلب الفصول الدراسية عند تغيير البرنامج
  useEffect(() => {
    if (filterProgramId) {
      loadClassrooms(+filterProgramId);
    } else {
      setClassrooms([]);
      setFilterClassroomId('');
    }
  }, [filterProgramId]);

  const loadClassrooms = async (programId: number) => {
    try {
      const data = await fetchAPI<any>(`/programs/${programId}`);
      if (data.classrooms) {
        setClassrooms(data.classrooms);
      }
    } catch (error) {
      console.error('Error loading classrooms:', error);
      setClassrooms([]);
    }
  };

  // تحديد الفصل الدراسي النشط حسب التاريخ الحالي
  const getActiveClassroom = (): Classroom | null => {
    const now = new Date();
    const active = classrooms.find(c => {
      if (!c.startDate || !c.endDate) return false;
      return now >= new Date(c.startDate) && now <= new Date(c.endDate);
    });
    if (active) return active;
    const past = classrooms
      .filter(c => c.endDate && now > new Date(c.endDate))
      .sort((a, b) => new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime());
    return past[0] || null;
  };

  const isClassroomActive = (classroom: Classroom): boolean => {
    const now = new Date();
    if (!classroom.startDate || !classroom.endDate) return false;
    return now >= new Date(classroom.startDate) && now <= new Date(classroom.endDate);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const programsData = await fetchAPI<Program[]>('/programs');
      setPrograms(programsData);

      const filters: any = {};
      if (filterProgramId) filters.programId = +filterProgramId;
      if (filterClassroomId) filters.classroomId = +filterClassroomId;

      const distributionsData = await getDistributions(filters);
      setDistributions(distributionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !deleteModal.id) return;
    try {
      await deleteDistribution(deleteModal.id);
      toast.success('تم حذف التوزيع بنجاح');
      setDeleteModal({ open: false, id: '', name: '' });
      loadData();
    } catch (error) {
      console.error('Error deleting distribution:', error);
      toast.error('حدث خطأ في حذف التوزيع');
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="توزيع المتدربين" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'توزيع المتدربين' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">غير مصرح</h3>
            <p className="text-sm text-slate-500">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="توزيع المتدربين على المجموعات"
        description="إدارة توزيع المتدربين على المجموعات الدراسية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'التوزيع' },
        ]}
        actions={
          canCreate ? (
            <Button onClick={() => router.push('/dashboard/trainees/distribution/new')} leftIcon={<PlusIcon className="w-4 h-4" />}>
              توزيع جديد
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TibaSelect
              label="تصفية حسب البرنامج"
              options={[
                { value: '', label: 'جميع البرامج' },
                ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
              ]}
              value={filterProgramId}
              onChange={(val) => {
                setFilterProgramId(val);
                setFilterClassroomId('');
              }}
              isSearchable={false}
              isClearable={false}
              instanceId="filter-program"
            />

            {filterProgramId && classrooms.length > 0 && (
              <TibaSelect
                label="تصفية حسب الفصل الدراسي"
                options={[
                  { value: '', label: 'جميع الفصول' },
                  ...classrooms.map(c => ({
                    value: String(c.id),
                    label: `${c.name}${isClassroomActive(c) ? ' (الحالي)' : ''}`,
                  })),
                ]}
                value={filterClassroomId}
                onChange={(val) => setFilterClassroomId(val)}
                isSearchable={false}
                isClearable={false}
                instanceId="filter-classroom"
              />
            )}

            <div className="flex items-end">
              <Button onClick={loadData} variant="outline" fullWidth leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                تحديث
              </Button>
            </div>
          </div>
        </div>

        {/* Distributions List */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse space-y-3">
                <div className="h-5 w-48 bg-slate-200 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-12 bg-slate-100 rounded-lg" />
                  <div className="h-12 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : distributions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد توزيعات</h3>
            <p className="text-sm text-slate-500 mb-5">قم بإنشاء توزيع جديد للمتدربين على المجموعات</p>
            {canCreate && (
              <Button onClick={() => router.push('/dashboard/trainees/distribution/new')} leftIcon={<PlusIcon className="w-4 h-4" />}>
                توزيع جديد
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {distributions.map((distribution) => {
              const isActive = distribution.classroom?.startDate && distribution.classroom?.endDate &&
                new Date() >= new Date(distribution.classroom.startDate) &&
                new Date() <= new Date(distribution.classroom.endDate);
              const totalTrainees = distribution.rooms.reduce((sum, room) => sum + (room._count?.assignments || 0), 0);

              return (
                <div key={distribution.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{distribution.program.nameAr}</h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          distribution.type === 'THEORY'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {distribution.type === 'THEORY' ? <BookOpenIcon className="w-3 h-3" /> : <BeakerIcon className="w-3 h-3" />}
                          {distribution.type === 'THEORY' ? 'نظري' : 'عملي'}
                        </span>
                        {distribution.classroom && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-violet-50 text-violet-700 border-violet-100'
                          }`}>
                            <CalendarDaysIcon className="w-3 h-3" />
                            {distribution.classroom.name}
                            {isActive && <CheckCircleIcon className="w-3 h-3" />}
                          </span>
                        )}
                        {!distribution.classroom && distribution.classroomId === null && (
                          <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">عامة</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">العام الدراسي: {distribution.academicYear}</p>
                      {distribution.classroom?.startDate && distribution.classroom?.endDate && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(distribution.classroom.startDate).toLocaleDateString('ar-SA')} - {new Date(distribution.classroom.endDate).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50/80 rounded-lg">
                    <div>
                      <p className="text-[11px] text-slate-500">عدد المجموعات</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">{distribution.numberOfRooms}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">إجمالي المتدربين</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">{totalTrainees}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => router.push(`/dashboard/trainees/distribution/${distribution.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      عرض وطباعة
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteModal({ open: true, id: distribution.id, name: distribution.program.nameAr })}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <TibaModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: '', name: '' })}
        title="تأكيد الحذف"
        subtitle={`هل أنت متأكد من حذف توزيع "${deleteModal.name}"؟`}
        variant="danger"
        size="sm"
        icon={<TrashIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, id: '', name: '' })}>إلغاء</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>حذف</Button>
          </div>
        }
      />
    </div>
  );
}