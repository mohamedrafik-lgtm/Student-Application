'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getDistributions,
  updateAssignment,
  type TraineeDistribution,
  type DistributionRoom,
} from '@/lib/trainee-distribution-api';
import { fetchAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon, ArrowsRightLeftIcon, Squares2X2Icon, CalendarDaysIcon,
  BookOpenIcon, BeakerIcon, CheckIcon, XMarkIcon, UserIcon,
  ChevronDownIcon, ChevronUpIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { getImageUrl } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photo?: string;
  phone?: string;
  program?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate: string | null;
  endDate: string | null;
}

interface ClassroomDistData {
  classroom: Classroom | null;
  classroomId: number | null;
  distributions: TraineeDistribution[];
  assignments: {
    type: 'THEORY' | 'PRACTICAL';
    distributionId: string;
    roomId: string;
    roomName: string;
    roomNumber: number;
    assignmentId: string;
    allRooms: DistributionRoom[];
  }[];
}

export default function TransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const traineeId = searchParams.get('traineeId');
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [classroomGroups, setClassroomGroups] = useState<ClassroomDistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClassrooms, setExpandedClassrooms] = useState<Set<string>>(new Set());

  // Transfer state
  const [transferState, setTransferState] = useState<{
    assignmentId: string;
    currentRoomId: string;
    targetRoomId: string;
    loading: boolean;
  } | null>(null);

  const canEdit = hasPermission('dashboard.trainees.distribution', 'edit');

  useEffect(() => {
    if (traineeId) {
      loadTraineeData(parseInt(traineeId));
    }
  }, [traineeId]);

  const loadTraineeData = async (id: number) => {
    try {
      setLoading(true);

      // Load trainee info
      const traineeData = await fetchAPI(`/trainees/${id}`) as Trainee;
      setTrainee(traineeData);

      // Load all distributions to find this trainee
      const allDistributions = await getDistributions(
        traineeData.program ? { programId: traineeData.program.id } : undefined
      );

      // Find distributions containing this trainee
      const relevantDistributions: TraineeDistribution[] = [];
      allDistributions.forEach((dist) => {
        const hasTrainee = dist.rooms.some((room) =>
          room.assignments?.some((a) => a.traineeId === id)
        );
        if (hasTrainee) {
          relevantDistributions.push(dist);
        }
      });

      // Group by classroom
      const groupMap = new Map<string, ClassroomDistData>();

      relevantDistributions.forEach((dist) => {
        const key = dist.classroomId ? String(dist.classroomId) : 'general';

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            classroom: dist.classroom || null,
            classroomId: dist.classroomId || null,
            distributions: [],
            assignments: [],
          });
        }

        const group = groupMap.get(key)!;
        group.distributions.push(dist);

        // Find this trainee's assignment in this distribution
        dist.rooms.forEach((room) => {
          room.assignments?.forEach((assignment) => {
            if (assignment.traineeId === id) {
              group.assignments.push({
                type: dist.type as 'THEORY' | 'PRACTICAL',
                distributionId: dist.id,
                roomId: room.id,
                roomName: room.roomName,
                roomNumber: room.roomNumber,
                assignmentId: assignment.id,
                allRooms: dist.rooms,
              });
            }
          });
        });
      });

      const groups = Array.from(groupMap.values());

      // Sort: active classroom first, then by classNumber
      groups.sort((a, b) => {
        const aActive = a.classroom ? isClassroomActive(a.classroom) : false;
        const bActive = b.classroom ? isClassroomActive(b.classroom) : false;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        if (a.classroom && b.classroom) return a.classroom.classNumber - b.classroom.classNumber;
        if (!a.classroom) return 1;
        return -1;
      });

      setClassroomGroups(groups);

      // Auto-expand all classrooms
      const allKeys = new Set(groups.map((g) => g.classroomId ? String(g.classroomId) : 'general'));
      setExpandedClassrooms(allKeys);
    } catch (error: any) {
      console.error('Error loading trainee data:', error);
      toast.error('فشل تحميل بيانات المتدرب');
    } finally {
      setLoading(false);
    }
  };

  const isClassroomActive = (classroom: Classroom): boolean => {
    const now = new Date();
    if (!classroom.startDate || !classroom.endDate) return false;
    return now >= new Date(classroom.startDate) && now <= new Date(classroom.endDate);
  };

  const toggleClassroom = (key: string) => {
    setExpandedClassrooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const startTransfer = (assignmentId: string, currentRoomId: string) => {
    setTransferState({
      assignmentId,
      currentRoomId,
      targetRoomId: '',
      loading: false,
    });
  };

  const cancelTransfer = () => {
    setTransferState(null);
  };

  const handleTransfer = async () => {
    if (!transferState || !transferState.targetRoomId || !traineeId) return;

    try {
      setTransferState((prev) => prev ? { ...prev, loading: true } : null);
      await updateAssignment(transferState.assignmentId, {
        roomId: transferState.targetRoomId,
      });
      toast.success('تم نقل المتدرب بنجاح');
      setTransferState(null);
      loadTraineeData(parseInt(traineeId));
    } catch (error: any) {
      const msg = error?.message || 'حدث خطأ في نقل المتدرب';
      toast.error(msg);
      setTransferState((prev) => prev ? { ...prev, loading: false } : null);
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="تحويل المتدرب" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربون', href: '/dashboard/distribution/students' }, { label: '...' }]} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200 rounded" /><div className="h-3 w-32 bg-slate-100 rounded" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!traineeId || !trainee) {
    return (
      <div className="space-y-6">
        <PageHeader title="تحويل المتدرب" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربون', href: '/dashboard/distribution/students' }]} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UserIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">لم يتم تحديد المتدرب</h3>
            <p className="text-sm text-slate-500 mb-4">الرجاء اختيار متدرب من قائمة المتدربين</p>
            <Button onClick={() => router.push('/dashboard/distribution/students')} variant="primary" size="sm">العودة للقائمة</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تحويل المتدرب"
        description="نقل المتدرب بين المجموعات داخل نفس الفصل الدراسي"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربون', href: '/dashboard/distribution/students' },
          { label: 'تحويل' },
        ]}
        actions={
          <Button onClick={() => router.push('/dashboard/distribution/students')} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            رجوع
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Trainee Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 overflow-hidden rounded-full flex-shrink-0 ring-2 ring-slate-100">
              {trainee.photo ? (
                <Image src={getImageUrl(trainee.photo)} alt={trainee.nameAr} fill style={{ objectFit: 'cover' }} className="rounded-full" />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xl">{trainee.nameAr?.charAt(0) || 'م'}</div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{trainee.nameAr}</h2>
              {trainee.nameEn && <p className="text-xs text-slate-400">{trainee.nameEn}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500 font-mono">{trainee.nationalId}</span>
                {trainee.program && (
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">{trainee.program.nameAr}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Groups */}
        {classroomGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Squares2X2Icon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد توزيعات</h3>
            <p className="text-sm text-slate-500">هذا المتدرب غير موزع على أي مجموعة حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classroomGroups.map((group) => {
              const key = group.classroomId ? String(group.classroomId) : 'general';
              const isExpanded = expandedClassrooms.has(key);
              const isActive = group.classroom ? isClassroomActive(group.classroom) : false;

              return (
                <div key={key} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActive ? 'border-blue-300' : 'border-slate-200'}`}>
                  {/* Classroom Header */}
                  <button
                    onClick={() => toggleClassroom(key)}
                    className={`w-full flex items-center justify-between p-4 text-right transition-colors ${isActive ? 'bg-blue-50/50' : 'bg-slate-50/50 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-100' : 'bg-slate-200'}`}>
                        <CalendarDaysIcon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          {group.classroom ? group.classroom.name : 'توزيعة عامة'}
                          {isActive && (
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">الحالي</span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {group.assignments.length} توزيعة — {group.assignments.filter(a => a.type === 'THEORY').length} نظري، {group.assignments.filter(a => a.type === 'PRACTICAL').length} عملي
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                  </button>

                  {/* Assignments List */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 border-t border-slate-100">
                      {group.assignments.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">لا توجد توزيعات في هذا الفصل</p>
                      ) : (
                        group.assignments.map((assignment) => {
                          const isTransferring = transferState?.assignmentId === assignment.assignmentId;
                          const otherRooms = assignment.allRooms.filter((r) => r.id !== assignment.roomId);

                          return (
                            <div key={assignment.assignmentId} className={`rounded-xl border p-4 transition-all ${isTransferring ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
                              {/* Assignment Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${assignment.type === 'THEORY' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                                    {assignment.type === 'THEORY' ? <BookOpenIcon className="w-4 h-4 text-blue-600" /> : <BeakerIcon className="w-4 h-4 text-emerald-600" />}
                                  </div>
                                  <div>
                                    <span className={`text-xs font-bold ${assignment.type === 'THEORY' ? 'text-blue-700' : 'text-emerald-700'}`}>
                                      {assignment.type === 'THEORY' ? 'نظري' : 'عملي'}
                                    </span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Squares2X2Icon className="w-3 h-3 text-slate-400" />
                                      <span className="text-xs text-slate-600">{assignment.roomName}</span>
                                    </div>
                                  </div>
                                </div>
                                {canEdit && !isTransferring && (
                                  <Button
                                    onClick={() => startTransfer(assignment.assignmentId, assignment.roomId)}
                                    variant="outline"
                                    size="sm"
                                    disabled={otherRooms.length === 0}
                                    leftIcon={<ArrowsRightLeftIcon className="w-3.5 h-3.5" />}
                                  >
                                    نقل
                                  </Button>
                                )}
                              </div>

                              {/* Transfer Section */}
                              {isTransferring && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  <p className="text-xs font-bold text-slate-700 mb-2">اختر المجموعة المستهدفة:</p>
                                  {otherRooms.length === 0 ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                      <p className="text-xs text-red-700">لا توجد مجموعات أخرى في هذه التوزيعة</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2 mb-3">
                                      {otherRooms.map((room) => (
                                        <button
                                          key={room.id}
                                          type="button"
                                          onClick={() => setTransferState((prev) => prev ? { ...prev, targetRoomId: room.id } : null)}
                                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-right ${
                                            transferState?.targetRoomId === room.id
                                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                                              : 'border-slate-200 bg-white hover:border-blue-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Squares2X2Icon className={`w-4 h-4 ${transferState?.targetRoomId === room.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <span className="text-sm font-medium text-slate-800">{room.roomName}</span>
                                          </div>
                                          <span className="text-xs text-slate-500">
                                            {room._count?.assignments || room.assignments?.length || 0} متدرب{room.capacity ? ` / ${room.capacity}` : ''}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={handleTransfer}
                                      disabled={!transferState?.targetRoomId}
                                      isLoading={transferState?.loading}
                                      variant="primary"
                                      size="sm"
                                      leftIcon={<CheckIcon className="w-3.5 h-3.5" />}
                                    >
                                      تأكيد النقل
                                    </Button>
                                    <Button onClick={cancelTransfer} variant="outline" size="sm" leftIcon={<XMarkIcon className="w-3.5 h-3.5" />}>
                                      إلغاء
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
