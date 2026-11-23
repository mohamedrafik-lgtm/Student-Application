'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTraineeById } from '@/app/lib/api/trainees';
import { fetchAPI } from '@/lib/api';
import { 
  getDistributions, 
  updateAssignment, 
  createAssignment,
  type TraineeDistribution 
} from '@/lib/trainee-distribution-api';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  BookOpenIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { usePermissions } from '@/hooks/usePermissions';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  phone?: string;
  programId: number;
  program?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
}

interface ClassroomItem {
  id: number | null; // null for general distribution
  name: string;
  classNumber?: number;
  startDate?: string | null;
  endDate?: string | null;
  theoryDist?: TraineeDistribution | null;
  practicalDist?: TraineeDistribution | null;
}

export default function TransferGroupPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = parseInt(params.id as string);
  const { hasPermission } = usePermissions();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [classroomGroups, setClassroomGroups] = useState<ClassroomItem[]>([]);
  const [activeClassroomTab, setActiveClassroomTab] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    traineeName: string;
    classroomName: string;
    distType: string;
    fromRoomName: string;
    toRoomName: string;
    onConfirm: () => void;
  } | null>(null);

  const canTransfer = hasPermission('dashboard.trainees.distribution', 'transfer') || 
                      hasPermission('dashboard.trainees.distribution', 'edit');

  useEffect(() => {
    if (traineeId) {
      loadData();
    }
  }, [traineeId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Trainee Data
      const traineeData = await getTraineeById(traineeId);
      setTrainee(traineeData);

      if (!traineeData.programId) {
        toast.error('المتدرب غير مسجل في أي برنامج تدريبي');
        setLoading(false);
        return;
      }

      // 2. Fetch Program Classrooms & Distributions
      const [programResponse, distributionsData] = await Promise.all([
        fetchAPI<any>(`/programs/${traineeData.programId}`).catch(() => null),
        getDistributions({ programId: traineeData.programId }).catch(() => []),
      ]);

      const classrooms: any[] = programResponse?.classrooms || [];

      // Build Classroom Groups
      const groupMap: ClassroomItem[] = [];

      // Process defined classrooms
      for (const c of classrooms) {
        const theoryDist = distributionsData.find(
          d => d.classroomId === c.id && d.type === 'THEORY'
        ) || null;

        const practicalDist = distributionsData.find(
          d => d.classroomId === c.id && d.type === 'PRACTICAL'
        ) || null;

        groupMap.push({
          id: c.id,
          name: c.name || `الفصل الدراسي ${c.classNumber || ''}`,
          classNumber: c.classNumber,
          startDate: c.startDate,
          endDate: c.endDate,
          theoryDist,
          practicalDist,
        });
      }

      // Process General Distributions (where classroomId is null)
      const genTheoryDist = distributionsData.find(
        d => d.classroomId === null && d.type === 'THEORY'
      ) || null;

      const genPracticalDist = distributionsData.find(
        d => d.classroomId === null && d.type === 'PRACTICAL'
      ) || null;

      if (genTheoryDist || genPracticalDist) {
        groupMap.push({
          id: null,
          name: 'توزيعة عامة للبرنامج',
          theoryDist: genTheoryDist,
          practicalDist: genPracticalDist,
        });
      }

      setClassroomGroups(groupMap);

      // Pre-select active tab if not selected
      if (groupMap.length > 0 && !activeClassroomTab) {
        // Try to find currently active classroom date-wise, else first tab
        const now = new Date();
        const activeClass = groupMap.find(
          g => g.startDate && g.endDate && now >= new Date(g.startDate) && now <= new Date(g.endDate)
        );
        setActiveClassroomTab(
          activeClass ? String(activeClass.id) : String(groupMap[0].id)
        );
      }

      // Populate initial selected rooms based on trainee's current assignments
      const newSelectedRooms: Record<string, string> = {};
      for (const dist of distributionsData) {
        for (const room of dist.rooms || []) {
          const isAssigned = room.assignments?.some((a: any) => a.traineeId === traineeId);
          if (isAssigned) {
            newSelectedRooms[dist.id] = room.id;
            break;
          }
        }
      }
      setSelectedRooms(prev => ({ ...newSelectedRooms, ...prev }));

    } catch (error: any) {
      console.error('Error loading transfer data:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات التوزيعات');
    } finally {
      setLoading(false);
    }
  };

  // Get trainee's current assignment in a distribution
  const getTraineeCurrentAssignment = (dist: TraineeDistribution) => {
    if (!dist || !dist.rooms) return null;
    for (const room of dist.rooms) {
      const assignment = room.assignments?.find((a: any) => a.traineeId === traineeId);
      if (assignment) {
        return {
          ...assignment,
          roomId: room.id,
          roomName: room.roomName,
        };
      }
    }
    return null;
  };

  // Initiate Group Transfer or Add
  const handleInitiateTransfer = (dist: TraineeDistribution, classroomName: string) => {
    const selectedRoomId = selectedRooms[dist.id];
    if (!selectedRoomId) {
      toast.error('يرجى اختيار المجموعة أولاً');
      return;
    }

    const currentAssignment = getTraineeCurrentAssignment(dist);
    const newRoom = dist.rooms.find(r => r.id === selectedRoomId);

    if (!newRoom) {
      toast.error('المجموعة غير صالحة');
      return;
    }

    if (currentAssignment && currentAssignment.roomId === selectedRoomId) {
      toast.error('المتدرب مسجل بالفعل في هذه المجموعة');
      return;
    }

    const distTypeName = dist.type === 'THEORY' ? 'نظري' : 'عملي';
    const isTransfer = !!currentAssignment;

    setConfirmModal({
      open: true,
      title: isTransfer ? 'تأكيد تحويل المجموعة' : 'تأكيد إضافة المتدرب للمجموعة',
      traineeName: trainee?.nameAr || '',
      classroomName,
      distType: distTypeName,
      fromRoomName: currentAssignment ? currentAssignment.roomName : 'غير موزع',
      toRoomName: newRoom.roomName,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          if (currentAssignment) {
            // Update existing assignment
            await updateAssignment(currentAssignment.id, { roomId: selectedRoomId });
            toast.success(`تم تحويل المتدرب إلى (${newRoom.roomName}) بنجاح`);
          } else {
            // Create new assignment
            await createAssignment({ roomId: selectedRoomId, traineeId });
            toast.success(`تم إضافة المتدرب إلى (${newRoom.roomName}) بنجاح`);
          }
          setConfirmModal(null);
          await loadData();
        } catch (error: any) {
          console.error('Error transferring group:', error);
          toast.error(error.message || 'حدث خطأ في عملية التوزيع');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="تحويل التوزيع" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربين', href: '/dashboard/trainees' }, { label: 'تحويل التوزيع' }]} />
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">جاري تحميل بيانات الفصول والتوزيعات...</p>
        </div>
      </div>
    );
  }

  if (!canTransfer) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="غير مصرح" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'تحويل التوزيع' }]} />
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">غير مصرح بالوصول</h3>
          <p className="text-slate-500 mt-1 text-sm">ليس لديك صلاحية تحويل مجموعات المتدربين</p>
          <Button onClick={() => router.back()} className="mt-4" variant="outline">رجوع</Button>
        </div>
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="غير موجود" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'تحويل التوزيع' }]} />
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">المتدرب غير موجود</h3>
          <Button onClick={() => router.back()} className="mt-4" variant="outline">رجوع</Button>
        </div>
      </div>
    );
  }

  const selectedGroupItem = classroomGroups.find(g => String(g.id) === activeClassroomTab) || classroomGroups[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">

      {/* Confirmation Modal */}
      {confirmModal && (
        <TibaModal
          open={confirmModal.open}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.title}
          subtitle={`المتدرب: ${confirmModal.traineeName} | ${confirmModal.classroomName}`}
          variant="primary"
          size="md"
          icon={<ArrowPathIcon className="w-6 h-6 text-blue-600 animate-spin-slow" />}
          footer={
            <div className="flex items-center gap-3 justify-end w-full">
              <Button variant="outline" onClick={() => setConfirmModal(null)}>إلغاء</Button>
              <Button 
                onClick={confirmModal.onConfirm} 
                isLoading={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                تأكيد العملية
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>نوع التوزيع: <strong>{confirmModal.distType}</strong></span>
                <span>الفصل: <strong>{confirmModal.classroomName}</strong></span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-center">
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                  <span className="text-[11px] text-rose-600 block font-medium">من المجموعة:</span>
                  <span className="font-bold text-slate-800 text-sm">{confirmModal.fromRoomName}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                  <span className="text-[11px] text-emerald-600 block font-medium">إلى المجموعة:</span>
                  <span className="font-bold text-slate-800 text-sm">{confirmModal.toRoomName}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>سيتم تحديث توزيع المتدرب في قاعدة البيانات فوراً. يمكنك التغيير مجدداً في أي وقت.</span>
            </div>
          </div>
        </TibaModal>
      )}

      {/* Page Header */}
      <PageHeader
        title="إدارة وتوزيع مجموعة المتدرب"
        description="تحديد وتحويل مجموعات المتدرب النظرية والعملية لكل فصل دراسي بشكل منفصل"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: trainee.nameAr, href: `/dashboard/trainees/${trainee.id}` },
          { label: 'تحويل التوزيع' },
        ]}
        actions={
          <Button onClick={() => router.back()} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            رجوع
          </Button>
        }
      />

      {/* Trainee Info & Distribution Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-xl flex-shrink-0">
              {trainee.nameAr.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{trainee.nameAr}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span>الرقم القومي: <strong className="font-mono text-slate-700">{trainee.nationalId}</strong></span>
                <span>•</span>
                <span>البرنامج: <strong className="text-blue-700 font-semibold">{trainee.program?.nameAr}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Summary across Classrooms */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-amber-500" />
            ملخص توزيعه الحسابي بالفصول الدراسية:
          </h3>
          {classroomGroups.length === 0 ? (
            <p className="text-xs text-slate-400">لا توجد فصول دراسية أو توزيعات معرفة لهذا البرنامج بعد.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classroomGroups.map((group) => {
                const theoryAss = group.theoryDist ? getTraineeCurrentAssignment(group.theoryDist) : null;
                const practicalAss = group.practicalDist ? getTraineeCurrentAssignment(group.practicalDist) : null;

                return (
                  <div 
                    key={String(group.id)} 
                    onClick={() => setActiveClassroomTab(String(group.id))}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      activeClassroomTab === String(group.id)
                        ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">{group.name}</span>
                      {activeClassroomTab === String(group.id) && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <BookOpenIcon className="w-3 h-3 text-blue-600" /> النظري:
                        </span>
                        <span className={`font-bold ${theoryAss ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {theoryAss ? theoryAss.roomName : 'غير موزع'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <BeakerIcon className="w-3 h-3 text-indigo-600" /> العملي:
                        </span>
                        <span className={`font-bold ${practicalAss ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {practicalAss ? practicalAss.roomName : 'غير موزع'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Classroom Selection Tabs */}
      {classroomGroups.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
            {classroomGroups.map((group) => {
              const isActive = activeClassroomTab === String(group.id);
              return (
                <button
                  key={String(group.id)}
                  onClick={() => setActiveClassroomTab(String(group.id))}
                  className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  {group.name}
                </button>
              );
            })}
          </div>

          {/* Active Classroom Distribution Cards */}
          {selectedGroupItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Theory Distribution Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                      <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">المجموعة النظرية</h3>
                      <p className="text-xs text-slate-500">{selectedGroupItem.name}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {selectedGroupItem.theoryDist ? (() => {
                    const dist = selectedGroupItem.theoryDist;
                    const currentAss = getTraineeCurrentAssignment(dist);
                    const selectedValue = selectedRooms[dist.id] || currentAss?.roomId || '';

                    return (
                      <div className="space-y-4">
                        {/* Current Status Box */}
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                          currentAss 
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            currentAss ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {currentAss ? <CheckCircleIcon className="w-6 h-6" /> : <ExclamationTriangleIcon className="w-6 h-6" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold opacity-80 block">المجموعة الحالية:</span>
                            <span className="font-bold text-base">
                              {currentAss ? currentAss.roomName : 'غير موزع على أي مجموعة نظري'}
                            </span>
                          </div>
                        </div>

                        {/* Room Selector */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            {currentAss ? 'اختر مجموعة جديدة للتحويل إليها:' : 'اختر مجموعة للإضافة إليها:'}
                          </label>
                          <select
                            value={selectedValue}
                            onChange={(e) => setSelectedRooms(prev => ({ ...prev, [dist.id]: e.target.value }))}
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                          >
                            <option value="">-- اختر المجموعة النظرية --</option>
                            {dist.rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.roomName} ({room.assignments?.length || 0} / {room.capacity || '∞'} متدرب)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Submit Button */}
                        <Button
                          fullWidth
                          disabled={submitting || !selectedValue || selectedValue === currentAss?.roomId}
                          onClick={() => handleInitiateTransfer(dist, selectedGroupItem.name)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          leftIcon={currentAss ? <ArrowPathIcon className="w-4 h-4" /> : <UserPlusIcon className="w-4 h-4" />}
                        >
                          {selectedValue === currentAss?.roomId
                            ? 'المتدرب مسجل بهذه المجموعة بالفعل'
                            : currentAss 
                            ? 'تحويل إلى المجموعة المختارة' 
                            : 'إضافة للمجموعة النظري'
                          }
                        </Button>
                      </div>
                    );
                  })() : (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                      <BookOpenIcon className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-medium">لا توجد توزيعة نظري محددة لـ ({selectedGroupItem.name})</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Practical Distribution Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                      <BeakerIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">المجموعة العملية</h3>
                      <p className="text-xs text-slate-500">{selectedGroupItem.name}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {selectedGroupItem.practicalDist ? (() => {
                    const dist = selectedGroupItem.practicalDist;
                    const currentAss = getTraineeCurrentAssignment(dist);
                    const selectedValue = selectedRooms[dist.id] || currentAss?.roomId || '';

                    return (
                      <div className="space-y-4">
                        {/* Current Status Box */}
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                          currentAss 
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            currentAss ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {currentAss ? <CheckCircleIcon className="w-6 h-6" /> : <ExclamationTriangleIcon className="w-6 h-6" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold opacity-80 block">المجموعة الحالية:</span>
                            <span className="font-bold text-base">
                              {currentAss ? currentAss.roomName : 'غير موزع على أي مجموعة عملي'}
                            </span>
                          </div>
                        </div>

                        {/* Room Selector */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            {currentAss ? 'اختر مجموعة جديدة للتحويل إليها:' : 'اختر مجموعة للإضافة إليها:'}
                          </label>
                          <select
                            value={selectedValue}
                            onChange={(e) => setSelectedRooms(prev => ({ ...prev, [dist.id]: e.target.value }))}
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
                          >
                            <option value="">-- اختر المجموعة العملية --</option>
                            {dist.rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.roomName} ({room.assignments?.length || 0} / {room.capacity || '∞'} متدرب)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Submit Button */}
                        <Button
                          fullWidth
                          disabled={submitting || !selectedValue || selectedValue === currentAss?.roomId}
                          onClick={() => handleInitiateTransfer(dist, selectedGroupItem.name)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          leftIcon={currentAss ? <ArrowPathIcon className="w-4 h-4" /> : <UserPlusIcon className="w-4 h-4" />}
                        >
                          {selectedValue === currentAss?.roomId
                            ? 'المتدرب مسجل بهذه المجموعة بالفعل'
                            : currentAss 
                            ? 'تحويل إلى المجموعة المختارة' 
                            : 'إضافة للمجموعة العملي'
                          }
                        </Button>
                      </div>
                    );
                  })() : (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                      <BeakerIcon className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-medium">لا توجد توزيعة عملي محددة لـ ({selectedGroupItem.name})</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
