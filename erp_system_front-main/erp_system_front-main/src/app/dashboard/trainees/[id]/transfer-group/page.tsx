'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardShell from '@/app/dashboard/components/DashboardShell';
import { usePermissions } from '@/hooks/usePermissions';
import { getTraineeById } from '@/app/lib/api/trainees';
import { getDistributions, updateAssignment, createAssignment } from '@/lib/trainee-distribution-api';
import { toast } from 'react-hot-toast';
import { FiArrowRight, FiUsers, FiCheckCircle, FiAlertCircle, FiUserPlus } from 'react-icons/fi';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  programId: number;
  program?: {
    nameAr: string;
    nameEn: string;
  };
}

interface Room {
  id: string;
  roomName: string;
  roomNumber: number;
  assignments?: any[];
}

interface Distribution {
  id: string;
  type: 'THEORY' | 'PRACTICAL';
  rooms: Room[];
}

export default function TransferGroupPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = parseInt(params.id as string);
  const { userPermissions, loading: permissionsLoading } = usePermissions();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Theory transfer state
  const [theoryDistributions, setTheoryDistributions] = useState<Distribution[]>([]);
  const [currentTheoryAssignment, setCurrentTheoryAssignment] = useState<any>(null);
  const [selectedTheoryRoom, setSelectedTheoryRoom] = useState<string>('');

  // Practical transfer state
  const [practicalDistributions, setPracticalDistributions] = useState<Distribution[]>([]);
  const [currentPracticalAssignment, setCurrentPracticalAssignment] = useState<any>(null);
  const [selectedPracticalRoom, setSelectedPracticalRoom] = useState<string>('');

  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    currentGroup: string;
    newGroup: string;
    type: 'theory' | 'practical';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [traineeId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load trainee data
      const traineeData = await getTraineeById(traineeId);
      setTrainee(traineeData);

      // Load theory distributions
      const theoryDist = await getDistributions({
        programId: traineeData.programId,
        type: 'THEORY' as any,
      });
      setTheoryDistributions(theoryDist);

      // Find current theory assignment
      let foundTheoryAssignment = null;
      for (const dist of theoryDist) {
        for (const room of dist.rooms || []) {
          const assignment = room.assignments?.find((a: any) => a.traineeId === traineeId);
          if (assignment) {
            foundTheoryAssignment = {
              ...assignment,
              roomId: room.id,
              roomName: room.roomName,
            };
            setSelectedTheoryRoom(room.id);
            break;
          }
        }
        if (foundTheoryAssignment) break;
      }
      setCurrentTheoryAssignment(foundTheoryAssignment);

      // Load practical distributions
      const practicalDist = await getDistributions({
        programId: traineeData.programId,
        type: 'PRACTICAL' as any,
      });
      setPracticalDistributions(practicalDist);

      // Find current practical assignment
      let foundPracticalAssignment = null;
      for (const dist of practicalDist) {
        for (const room of dist.rooms || []) {
          const assignment = room.assignments?.find((a: any) => a.traineeId === traineeId);
          if (assignment) {
            foundPracticalAssignment = {
              ...assignment,
              roomId: room.id,
              roomName: room.roomName,
            };
            setSelectedPracticalRoom(room.id);
            break;
          }
        }
        if (foundPracticalAssignment) break;
      }
      setCurrentPracticalAssignment(foundPracticalAssignment);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Show confirmation dialog
  const showConfirmDialog = (data: {
    title: string;
    message: string;
    currentGroup: string;
    newGroup: string;
    type: 'theory' | 'practical';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmData({
        ...data,
        onConfirm: () => {
          setShowConfirm(false);
          setConfirmData(null);
          resolve(true);
        },
      });
      setShowConfirm(true);
      
      // Store reject handler
      (window as any).__confirmReject = () => {
        setShowConfirm(false);
        setConfirmData(null);
        resolve(false);
      };
    });
  };

  const handleTheoryTransfer = async () => {
    if (!selectedTheoryRoom) {
      toast.error('يرجى اختيار المجموعة النظري');
      return;
    }

    // Get new room name
    const newRoom = theoryDistributions
      .flatMap(dist => dist.rooms)
      .find(room => room.id === selectedTheoryRoom);

    // حالة الإضافة: إذا لم يكن المتدرب موجود في أي مجموعة نظري
    if (!currentTheoryAssignment) {
      // Show confirmation dialog
      const confirmed = await showConfirmDialog({
        title: 'تأكيد إضافة المتدرب للمجموعة النظري',
        message: `هل أنت متأكد من إضافة المتدرب إلى المجموعة؟`,
        currentGroup: 'غير موزع',
        newGroup: newRoom?.roomName || '',
        type: 'theory',
      });

      if (!confirmed) return;

      try {
        setSubmitting(true);
        await createAssignment({
          roomId: selectedTheoryRoom,
          traineeId: traineeId,
        });
        toast.success('تم إضافة المتدرب للمجموعة النظري بنجاح');
        await loadData(); // Reload data
      } catch (error: any) {
        console.error('Error adding to theory group:', error);
        toast.error(error.message || 'فشل إضافة المتدرب للمجموعة النظري');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // حالة التحويل: إذا كان المتدرب موجود بالفعل
    if (selectedTheoryRoom === currentTheoryAssignment.roomId) {
      toast.error('المتدرب موجود بالفعل في هذه المجموعة');
      return;
    }

    // Show confirmation dialog
    const confirmed = await showConfirmDialog({
      title: 'تأكيد تحويل المجموعة النظري',
      message: `هل أنت متأكد من تحويل المتدرب من المجموعة الحالية إلى المجموعة الجديدة؟`,
      currentGroup: currentTheoryAssignment.roomName,
      newGroup: newRoom?.roomName || '',
      type: 'theory',
    });

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await updateAssignment(currentTheoryAssignment.id, {
        roomId: selectedTheoryRoom,
      });
      toast.success('تم تحويل المجموعة النظري بنجاح');
      await loadData(); // Reload data
    } catch (error: any) {
      console.error('Error transferring theory:', error);
      toast.error(error.message || 'فشل تحويل المجموعة النظري');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePracticalTransfer = async () => {
    if (!selectedPracticalRoom) {
      toast.error('يرجى اختيار المجموعة العملي');
      return;
    }

    // Get new room name
    const newRoom = practicalDistributions
      .flatMap(dist => dist.rooms)
      .find(room => room.id === selectedPracticalRoom);

    // حالة الإضافة: إذا لم يكن المتدرب موجود في أي مجموعة عملي
    if (!currentPracticalAssignment) {
      // Show confirmation dialog
      const confirmed = await showConfirmDialog({
        title: 'تأكيد إضافة المتدرب للمجموعة العملي',
        message: `هل أنت متأكد من إضافة المتدرب إلى المجموعة؟`,
        currentGroup: 'غير موزع',
        newGroup: newRoom?.roomName || '',
        type: 'practical',
      });

      if (!confirmed) return;

      try {
        setSubmitting(true);
        await createAssignment({
          roomId: selectedPracticalRoom,
          traineeId: traineeId,
        });
        toast.success('تم إضافة المتدرب للمجموعة العملي بنجاح');
        await loadData(); // Reload data
      } catch (error: any) {
        console.error('Error adding to practical group:', error);
        toast.error(error.message || 'فشل إضافة المتدرب للمجموعة العملي');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // حالة التحويل: إذا كان المتدرب موجود بالفعل
    if (selectedPracticalRoom === currentPracticalAssignment.roomId) {
      toast.error('المتدرب موجود بالفعل في هذه المجموعة');
      return;
    }

    // Show confirmation dialog
    const confirmed = await showConfirmDialog({
      title: 'تأكيد تحويل المجموعة العملي',
      message: `هل أنت متأكد من تحويل المتدرب من المجموعة الحالية إلى المجموعة الجديدة؟`,
      currentGroup: currentPracticalAssignment.roomName,
      newGroup: newRoom?.roomName || '',
      type: 'practical',
    });

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await updateAssignment(currentPracticalAssignment.id, {
        roomId: selectedPracticalRoom,
      });
      toast.success('تم تحويل المجموعة العملي بنجاح');
      await loadData(); // Reload data
    } catch (error: any) {
      console.error('Error transferring practical:', error);
      toast.error(error.message || 'فشل تحويل المجموعة العملي');
    } finally {
      setSubmitting(false);
    }
  };

  // Check permissions
  if (permissionsLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const canTransferGroups = userPermissions?.hasPermission('dashboard.trainees.distribution', 'transfer') || false;

  if (!canTransferGroups) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              غير مسموح بالوصول
            </h1>
            <p className="text-gray-600 mb-4">
              ليس لديك صلاحية تحويل المجموعات
            </p>
            <Button onClick={() => router.back()}>
              رجوع
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!trainee) {
    return (
      <DashboardShell>
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">المتدرب غير موجود</p>
          <Button onClick={() => router.back()} className="mt-4">
            رجوع
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mb-4"
        >
          <FiArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl text-white">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FiUsers className="w-8 h-8" />
            إدارة المجموعات
          </h1>
          <p className="text-blue-100 text-lg">
            المتدرب: <span className="font-bold">{trainee.nameAr}</span>
          </p>
          {trainee.program && (
            <p className="text-blue-100">
              البرنامج: {trainee.program.nameAr}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theory Transfer */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <span className="text-2xl">📚</span>
              {currentTheoryAssignment ? 'تحويل المجموعة النظري' : 'إضافة للمجموعة النظري'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {currentTheoryAssignment ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-blue-600 w-5 h-5" />
                  <span className="font-semibold text-blue-900">المجموعة الحالية:</span>
                </div>
                <p className="text-blue-700 font-bold text-lg">
                  {currentTheoryAssignment.roomName}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="text-yellow-600 w-5 h-5" />
                  <span className="text-yellow-800">المتدرب غير موزع على أي مجموعة نظري</span>
                </div>
              </div>
            )}

            {theoryDistributions.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentTheoryAssignment ? 'اختر المجموعة النظري الجديدة' : 'اختر المجموعة النظري'}
                  </label>
                  <select
                    value={selectedTheoryRoom}
                    onChange={(e) => setSelectedTheoryRoom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- اختر المجموعة --</option>
                    {theoryDistributions.map((dist) =>
                      dist.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.roomName} ({room.assignments?.length || 0} متدرب)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <Button
                  onClick={handleTheoryTransfer}
                  disabled={submitting || !selectedTheoryRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {currentTheoryAssignment ? 'جاري التحويل...' : 'جاري الإضافة...'}
                    </>
                  ) : (
                    <>
                      {currentTheoryAssignment ? (
                        <>📚 تحويل المجموعة النظري</>
                      ) : (
                        <>
                          <FiUserPlus className="inline ml-2" />
                          إضافة للمجموعة النظري
                        </>
                      )}
                    </>
                  )}
                </Button>
              </>
            )}

            {theoryDistributions.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600">لا يوجد توزيع نظري لهذا البرنامج</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Practical Transfer */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <span className="text-2xl">🔬</span>
              {currentPracticalAssignment ? 'تحويل المجموعة العملي' : 'إضافة للمجموعة العملي'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {currentPracticalAssignment ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-600 w-5 h-5" />
                  <span className="font-semibold text-green-900">المجموعة الحالية:</span>
                </div>
                <p className="text-green-700 font-bold text-lg">
                  {currentPracticalAssignment.roomName}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="text-yellow-600 w-5 h-5" />
                  <span className="text-yellow-800">المتدرب غير موزع على أي مجموعة عملي</span>
                </div>
              </div>
            )}

            {practicalDistributions.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentPracticalAssignment ? 'اختر المجموعة العملي الجديدة' : 'اختر المجموعة العملي'}
                  </label>
                  <select
                    value={selectedPracticalRoom}
                    onChange={(e) => setSelectedPracticalRoom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- اختر المجموعة --</option>
                    {practicalDistributions.map((dist) =>
                      dist.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.roomName} ({room.assignments?.length || 0} متدرب)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <Button
                  onClick={handlePracticalTransfer}
                  disabled={submitting || !selectedPracticalRoom}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {currentPracticalAssignment ? 'جاري التحويل...' : 'جاري الإضافة...'}
                    </>
                  ) : (
                    <>
                      {currentPracticalAssignment ? (
                        <>🔬 تحويل المجموعة العملي</>
                      ) : (
                        <>
                          <FiUserPlus className="inline ml-2" />
                          إضافة للمجموعة العملي
                        </>
                      )}
                    </>
                  )}
                </Button>
              </>
            )}

            {practicalDistributions.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600">لا يوجد توزيع عملي لهذا البرنامج</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className={`p-6 rounded-t-2xl ${
              confirmData.type === 'theory' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600'
            }`}>
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <span className="text-2xl">{confirmData.type === 'theory' ? '📚' : '🔬'}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{confirmData.title}</h3>
                  <p className="text-sm text-white text-opacity-90">تأكيد عملية التحويل</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-center mb-4">{confirmData.message}</p>
              
              {/* Transfer Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 text-sm">من</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">المجموعة الحالية</p>
                    <p className="font-semibold text-gray-900">{confirmData.currentGroup}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <span className="px-3 text-gray-400">↓</span>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    confirmData.type === 'theory' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <span className={`text-sm ${
                      confirmData.type === 'theory' ? 'text-blue-600' : 'text-green-600'
                    }`}>إلى</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">المجموعة الجديدة</p>
                    <p className={`font-semibold ${
                      confirmData.type === 'theory' ? 'text-blue-700' : 'text-green-700'
                    }`}>{confirmData.newGroup}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-yellow-600 text-lg">⚠️</span>
                <p className="text-sm text-yellow-800">
                  سيتم تحويل المتدرب <strong>{trainee?.nameAr}</strong> بشكل فوري ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <Button
                onClick={() => (window as any).__confirmReject?.()}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold"
              >
                إلغاء
              </Button>
              <Button
                onClick={confirmData.onConfirm}
                className={`flex-1 text-white font-semibold shadow-lg ${
                  confirmData.type === 'theory'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                تأكيد التحويل
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

