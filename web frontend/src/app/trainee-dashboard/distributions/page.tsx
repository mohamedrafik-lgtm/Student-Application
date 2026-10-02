'use client';

import { useState, useEffect } from 'react';
import { traineeAPI } from '@/lib/trainee-api';
import toast from 'react-hot-toast';
import { UsersIcon, CheckCircleIcon, ExclamationTriangleIcon, AcademicCapIcon, ClockIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';

interface DistributionRoom {
  id: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  isFull: boolean;
}

interface AvailableDistribution {
  id: string;
  type: 'THEORY' | 'PRACTICAL';
  academicYear: string;
  classroomName: string;
  isRegistrationOpen: boolean;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  isJoined: boolean;
  joinedRoomId: string | null;
  rooms: DistributionRoom[];
}

interface ConfirmDialogState {
  isOpen: boolean;
  roomId: string | null;
  roomName: string;
  distributionName: string;
  isChangingGroup?: boolean;
  currentRoomName?: string;
}

export default function TraineeDistributionsPage() {
  const [distributions, setDistributions] = useState<AvailableDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    roomId: null,
    roomName: '',
    distributionName: '',
  });

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const data = await traineeAPI.getAvailableDistributions();
      setDistributions(data);
    } catch (error: any) {
      console.error('Error fetching distributions:', error);
      toast.error('حدث خطأ أثناء تحميل التوزيعات المتاحة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, []);

  const requestJoin = (
    roomId: string,
    roomName: string,
    distributionName: string,
    isChangingGroup = false,
    currentRoomName = ''
  ) => {
    setConfirmDialog({
      isOpen: true,
      roomId,
      roomName,
      distributionName,
      isChangingGroup,
      currentRoomName,
    });
  };

  const cancelJoin = () => {
    setConfirmDialog({
      isOpen: false,
      roomId: null,
      roomName: '',
      distributionName: '',
      isChangingGroup: false,
      currentRoomName: '',
    });
  };

  const confirmJoin = async () => {
    const { roomId } = confirmDialog;
    if (!roomId) return;
    cancelJoin();
    try {
      setJoiningRoomId(roomId);
      await traineeAPI.joinDistributionRoom(roomId);
      toast.success('تم الانضمام إلى المجموعة بنجاح');
      await fetchDistributions();
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'حدث خطأ أثناء الانضمام للمجموعة');
    } finally {
      setJoiningRoomId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">جاري تحميل التوزيعات المتاحة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">

      {/* ===== Confirmation Dialog ===== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={cancelJoin}
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 w-full" />

            <div className="p-6 sm:p-7">
              {/* Icon & Title */}
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {confirmDialog.isChangingGroup ? 'تأكيد تغيير المجموعة' : 'تأكيد الانضمام للمجموعة'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">يرجى قراءة التنبيه بعناية قبل الإكمال</p>
                </div>
                <button
                  onClick={cancelJoin}
                  className="mr-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Warning box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
                  تنبيه هام — يرجى الانتباه
                </div>
                {confirmDialog.isChangingGroup ? (
                  <ul className="text-sm text-amber-700 space-y-1.5 pr-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      سيتم <strong>إزالتك من مجموعتك الحالية ({confirmDialog.currentRoomName})</strong> ونقلك إلى <strong>{confirmDialog.roomName}</strong>.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      يمكنك التغيير مجدداً طالما أن <strong>فترة التسجيل ما زالت مفتوحة</strong>.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      عند انتهاء فترة التسجيل لن تتمكن من التغيير إلا من خلال المقر الإداري.
                    </li>
                  </ul>
                ) : (
                  <ul className="text-sm text-amber-700 space-y-1.5 pr-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      يمكنك تغيير مجموعتك لاحقاً طالما أن <strong>فترة التسجيل ما زالت مفتوحة</strong>.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                      عند انتهاء فترة التسجيل يتوجب مراجعة المقر الإداري لأي تعديل.
                    </li>
                  </ul>
                )}
              </div>

              {/* Selected room summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UsersIcon className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {confirmDialog.isChangingGroup ? 'ستنتقل إلى' : 'ستنضم إلى'}
                  </p>
                  <p className="font-bold text-slate-800">{confirmDialog.roomName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{confirmDialog.distributionName}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={cancelJoin}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  إلغاء — لم أقرر بعد
                </button>
                <button
                  onClick={confirmJoin}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {confirmDialog.isChangingGroup ? 'نعم، انتقال للمجموعة الجديدة' : 'نعم، أنضم الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 flex items-start gap-4">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
          <UsersIcon className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">توزيعات التدريب والمجموعات</h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
            يمكنك من خلال هذه الصفحة استعراض المجموعات التدريبية المتاحة للتسجيل واختيار المجموعة التي تناسبك للانضمام إليها.
          </p>
        </div>
      </div>

      {distributions.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <AcademicCapIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">لا توجد توزيعات متاحة</h3>
          <p className="text-slate-500 mt-2 text-sm">
            عذراً، لا توجد حالياً أي توزيعات تدريبية متاحة للتسجيل الذاتي.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {distributions.map(dist => (
            <div key={dist.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 transition-all hover:shadow-md">
              <div className={`p-4 sm:p-6 border-b ${dist.isJoined ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        dist.type === 'THEORY'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {dist.type === 'THEORY' ? 'توزيع نظري' : 'توزيع عملي'}
                      </span>
                      {dist.isJoined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircleIcon className="w-4 h-4" />
                          تم الانضمام
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {dist.classroomName} <span className="text-sm font-normal text-slate-500 mx-1">({dist.academicYear})</span>
                    </h3>
                  </div>

                  {!dist.isRegistrationOpen && !dist.isJoined && (
                    <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-medium border border-rose-100 self-start">
                      <ClockIcon className="w-5 h-5" />
                      التسجيل مغلق
                    </div>
                  )}
                  {dist.isRegistrationOpen && !dist.isJoined && (
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium border border-amber-100 self-start">
                      <ClockIcon className="w-5 h-5" />
                      التسجيل مفتوح
                    </div>
                  )}
                </div>

                {(dist.registrationStartDate || dist.registrationEndDate) && (
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 bg-white/60 p-3 rounded-xl border border-slate-200/60 inline-flex">
                    {dist.registrationStartDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">بداية التسجيل:</span>
                        <span>{new Date(dist.registrationStartDate).toLocaleString('ar-SA')}</span>
                      </div>
                    )}
                    {dist.registrationStartDate && dist.registrationEndDate && (
                      <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></div>
                    )}
                    {dist.registrationEndDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">نهاية التسجيل:</span>
                        <span>{new Date(dist.registrationEndDate).toLocaleString('ar-SA')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-white space-y-4">
                {dist.isJoined && (() => {
                  const joinedRoom = dist.rooms.find(r => r.id === dist.joinedRoomId);
                  return (
                    <div className={`flex items-center justify-between rounded-xl p-4 sm:p-5 border ${
                      dist.isRegistrationOpen 
                        ? 'bg-amber-50/80 border-amber-200' 
                        : 'bg-emerald-50/80 border-emerald-200'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border ${
                          dist.isRegistrationOpen 
                            ? 'bg-amber-100 text-amber-700 border-amber-300' 
                            : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        }`}>
                          <CheckCircleIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base sm:text-lg">
                            مجموعتك الحالية: {joinedRoom?.name || 'مجموعة مسجلة'}
                          </h4>
                          {dist.isRegistrationOpen ? (
                            <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                              أنت مسجل حالياً في هذه المجموعة. يمكنك اختيار مجموعة أخرى أدناه للانتقال إليها طالما أن فترة التسجيل ما زالت مفتوحة.
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                              انتهت فترة التسجيل. أنت مسجل في هذه المجموعة ولا يمكنك التغيير الآن إلا من خلال المقر الإداري.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dist.rooms.map(room => {
                    const isCurrentRoom = room.id === dist.joinedRoomId;

                    return (
                      <div
                        key={room.id}
                        className={`relative rounded-xl border p-5 transition-all ${
                          isCurrentRoom
                            ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                            : room.isFull
                            ? 'bg-slate-50 border-slate-200 opacity-75'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{room.name}</h4>
                            {isCurrentRoom && (
                              <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                مجموعتك الحالية
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                            room.isFull
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {room.enrolledCount} / {room.capacity} متدرب
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              room.isFull ? 'bg-rose-500' :
                              (room.enrolledCount / room.capacity) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min((room.enrolledCount / room.capacity) * 100, 100)}%` }}
                          ></div>
                        </div>

                        {isCurrentRoom ? (
                          <Button
                            fullWidth
                            disabled
                            variant="outline"
                            className="bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                          >
                            مجموعتك الحالية
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            disabled={!dist.isRegistrationOpen || room.isFull || joiningRoomId !== null}
                            isLoading={joiningRoomId === room.id}
                            onClick={() => {
                              const currentRoom = dist.rooms.find(r => r.id === dist.joinedRoomId);
                              requestJoin(
                                room.id,
                                room.name,
                                `${dist.classroomName} — ${dist.type === 'THEORY' ? 'نظري' : 'عملي'}`,
                                dist.isJoined,
                                currentRoom?.name || ''
                              );
                            }}
                            variant={room.isFull || !dist.isRegistrationOpen ? 'outline' : 'primary'}
                            className={
                              room.isFull || !dist.isRegistrationOpen 
                                ? 'text-slate-500' 
                                : dist.isJoined 
                                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }
                          >
                            {room.isFull 
                              ? 'المجموعة ممتلئة' 
                              : !dist.isRegistrationOpen 
                              ? 'التسجيل مغلق' 
                              : dist.isJoined 
                              ? 'الانتقال لهذه المجموعة' 
                              : 'انضمام للمجموعة'
                            }
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
