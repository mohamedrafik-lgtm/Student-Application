'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  getDistribution, 
  updateRoomName,
  updateRoomCapacity,
  updateDistribution,
  type TraineeDistribution 
} from '@/lib/trainee-distribution-api';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon,
  UsersIcon,
  PrinterIcon,
  HomeModernIcon,
  EyeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  BookOpenIcon,
  BeakerIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { usePermissions } from '@/hooks/usePermissions';

export default function DistributionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = usePermissions();
  
  const [distribution, setDistribution] = useState<TraineeDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [renameModalRoom, setRenameModalRoom] = useState<any>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [capacityModalRoom, setCapacityModalRoom] = useState<any>(null);
  const [newCapacity, setNewCapacity] = useState<number>(0);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  const [showDatesModal, setShowDatesModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editIsVisible, setEditIsVisible] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

  const canView = hasPermission('dashboard.trainees.distribution', 'view');
  const canEdit = hasPermission('dashboard.trainees.distribution', 'edit');
  const canPrint = hasPermission('dashboard.trainees.distribution', 'print');
  const canViewPhone = hasPermission('dashboard.trainees', 'view_phone');
  
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeName: true,
    includeNationalId: true,
    includePhone: canViewPhone,
    includeGuardianPhone: canViewPhone,
  });
  const [printRoomId, setPrintRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDistribution();
    }
  }, [id]);

  const loadDistribution = async () => {
    try {
      setLoading(true);
      const data = await getDistribution(id);
      setDistribution(data);
    } catch (error) {
      console.error('Error loading distribution:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!canPrint) {
      toast.error('ليس لديك صلاحية طباعة القوائم');
      return;
    }
    setPrintRoomId(null);
    setShowPrintDialog(true);
  };

  const handlePrintRoom = (roomId: string) => {
    if (!canPrint) {
      toast.error('ليس لديك صلاحية طباعة القوائم');
      return;
    }
    setPrintRoomId(roomId);
    setShowPrintDialog(true);
  };

  const confirmPrint = () => {
    const params = new URLSearchParams();
    if (printRoomId) params.append('roomId', printRoomId);
    if (printOptions.includeName) params.append('name', 'true');
    if (printOptions.includeNationalId) params.append('nationalId', 'true');
    if (printOptions.includePhone) params.append('phone', 'true');
    if (printOptions.includeGuardianPhone) params.append('guardianPhone', 'true');
    
    const url = `/print/trainee-distribution/${id}?${params.toString()}`;
    window.open(url, '_blank');
    setShowPrintDialog(false);
  };

  const openRenameModal = (room: any) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية تعديل أسماء المجموعات');
      return;
    }
    setRenameModalRoom(room);
    setNewRoomName(room.roomName);
  };

  const handleRenameRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('يرجى إدخال اسم المجموعة');
      return;
    }

    if (newRoomName.trim() === renameModalRoom.roomName) {
      toast.error('الاسم الجديد مطابق للاسم الحالي');
      return;
    }

    try {
      await updateRoomName(renameModalRoom.id, newRoomName.trim());
      toast.success('تم تحديث اسم المجموعة بنجاح');
      setRenameModalRoom(null);
      setNewRoomName('');
      loadDistribution();
    } catch (error: any) {
      console.error('Error renaming room:', error);
      toast.error(error.message || 'حدث خطأ في تحديث اسم المجموعة');
    }
  };

  const openCapacityModal = (room: any) => {
    if (!canEdit) { toast.error('ليس لديك صلاحية تعديل السعة'); return; }
    setCapacityModalRoom(room);
    setNewCapacity(room.capacity || 0);
  };

  const handleUpdateCapacity = async () => {
    if (!capacityModalRoom) return;
    const currentEnrolled = capacityModalRoom.assignments?.length || 0;
    if (newCapacity < 1) {
      toast.error('يجب أن تكون السعة أكبر من صفر');
      return;
    }
    if (newCapacity < currentEnrolled) {
      toast.error(`لا يمكن تقليل السعة إلى ${newCapacity} — يوجد ${currentEnrolled} متدرب مسجل بالفعل في هذه المجموعة`);
      return;
    }
    try {
      setSavingCapacity(true);
      await updateRoomCapacity(capacityModalRoom.id, newCapacity);
      toast.success('تم تحديث السعة القصوى بنجاح');
      setCapacityModalRoom(null);
      loadDistribution();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحديث السعة');
    } finally {
      setSavingCapacity(false);
    }
  };

  const formatForDateTimeLocal = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openDatesModal = () => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية تعديل الإعدادات');
      return;
    }
    if (!distribution) return;
    setEditStartDate(formatForDateTimeLocal(distribution.registrationStartDate));
    setEditEndDate(formatForDateTimeLocal(distribution.registrationEndDate));
    setEditIsVisible(!!distribution.isVisibleToTrainees);
    setShowDatesModal(true);
  };

  const handleUpdateDates = async () => {
    if (!distribution) return;
    try {
      setSavingDates(true);
      await updateDistribution(id, {
        registrationStartDate: editStartDate ? new Date(editStartDate).toISOString() : null,
        registrationEndDate: editEndDate ? new Date(editEndDate).toISOString() : null,
        isVisibleToTrainees: editIsVisible,
      });
      toast.success('تم تحديث مواعيد وإعدادات التسجيل بنجاح');
      setShowDatesModal(false);
      loadDistribution();
    } catch (error: any) {
      console.error('Error updating registration dates:', error);
      toast.error(error.message || 'حدث خطأ في تحديث التواريخ');
    } finally {
      setSavingDates(false);
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="تفاصيل التوزيع" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع', href: '/dashboard/trainees/distribution' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">غير مصرح</h3>
            <p className="text-sm text-slate-500">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="تفاصيل التوزيع" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع', href: '/dashboard/trainees/distribution' }, { label: '...' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

  if (!distribution) {
    return (
      <div className="space-y-6">
        <PageHeader title="غير موجود" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع', href: '/dashboard/trainees/distribution' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">التوزيع غير موجود</h3>
          </div>
        </div>
      </div>
    );
  }

  const totalTrainees = distribution.rooms.reduce((sum, room) => sum + (room.assignments?.length || 0), 0);
  const avgPerRoom = Math.ceil(totalTrainees / distribution.numberOfRooms);
  const isActive = distribution.classroom?.startDate && distribution.classroom?.endDate &&
    new Date() >= new Date(distribution.classroom.startDate) && new Date() <= new Date(distribution.classroom.endDate);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={`توزيع متدربي ${distribution.program.nameAr}`}
          description={`العام الدراسي: ${distribution.academicYear}${distribution.classroom ? ` | ${distribution.classroom.name}` : ' | توزيعة عامة'}`}
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'المتدربين', href: '/dashboard/trainees' },
            { label: 'التوزيع', href: '/dashboard/trainees/distribution' },
            { label: distribution.program.nameAr },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => router.back()} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
                رجوع
              </Button>
              {canPrint && (
                <Button onClick={handlePrint} variant="outline" size="sm" leftIcon={<PrinterIcon className="w-4 h-4" />}>
                  طباعة
                </Button>
              )}
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Type & Classroom Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
              distribution.type === 'THEORY' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              {distribution.type === 'THEORY' ? <BookOpenIcon className="w-3.5 h-3.5" /> : <BeakerIcon className="w-3.5 h-3.5" />}
              {distribution.type === 'THEORY' ? 'مجموعات النظري' : 'مجموعات العملي'}
            </span>
            {distribution.classroom && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-violet-50 text-violet-700 border-violet-100'
              }`}>
                <CalendarDaysIcon className="w-3.5 h-3.5" />
                {distribution.classroom.name}
                {isActive && <CheckCircleIcon className="w-3 h-3" />}
              </span>
            )}
            {!distribution.classroom && (
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">توزيعة عامة</span>
            )}
            {distribution.classroom?.startDate && distribution.classroom?.endDate && (
              <span className="text-[11px] text-slate-400">
                ({new Date(distribution.classroom.startDate).toLocaleDateString('ar-SA')} - {new Date(distribution.classroom.endDate).toLocaleDateString('ar-SA')})
              </span>
            )}
          </div>

          {/* Self Registration Settings Card (For TRAINEE_CHOICE mode) */}
          {distribution.assignmentMode === 'TRAINEE_CHOICE' && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 flex-shrink-0">
                    <ClockIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-800">إعدادات التسجيل الذاتي من المنصة</h3>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        distribution.isVisibleToTrainees 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {distribution.isVisibleToTrainees ? 'ظاهر للمتدربين' : 'مخفي في المنصة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      مواعيد التسجيل وحالة ظهور التوزيع للمتدربين على المنصة
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    onClick={openDatesModal}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-amber-100/50 border-amber-300 text-amber-900"
                    leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                  >
                    تعديل المواعيد والإعدادات
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 text-xs">
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200/40">
                  <span className="text-slate-500 font-medium block mb-1">تاريخ بداية التسجيل:</span>
                  <span className="font-bold text-slate-800">
                    {distribution.registrationStartDate 
                      ? new Date(distribution.registrationStartDate).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'غير محدد (مفتوح مباشرة)'
                    }
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200/40">
                  <span className="text-slate-500 font-medium block mb-1">تاريخ نهاية التسجيل:</span>
                  <span className="font-bold text-slate-800">
                    {distribution.registrationEndDate 
                      ? new Date(distribution.registrationEndDate).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'غير محدد (مفتوح بدون تاريخ إنهاء)'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><HomeModernIcon className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-2xl font-bold text-slate-900 tabular-nums">{distribution.numberOfRooms}</p><p className="text-xs text-slate-500">عدد المجموعات</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><UsersIcon className="w-5 h-5 text-emerald-600" /></div>
                <div><p className="text-2xl font-bold text-emerald-600 tabular-nums">{totalTrainees}</p><p className="text-xs text-slate-500">إجمالي المتدربين</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0"><UsersIcon className="w-5 h-5 text-violet-600" /></div>
                <div><p className="text-2xl font-bold text-violet-600 tabular-nums">{avgPerRoom}</p><p className="text-xs text-slate-500">متوسط/مجموعة</p></div>
              </div>
            </div>
          </div>

          {/* Rooms Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distribution.rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate">{room.roomName}</h2>
                    {canEdit && (
                      <button onClick={() => openRenameModal(room)} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="إعادة تسمية">
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {room.assignments?.length || 0}
                    {room.capacity ? ` / ${room.capacity}` : ''} متدرب
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedRoom(room)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    استعراض
                  </button>
                  {canPrint && (
                    <button
                      onClick={() => handlePrintRoom(room.id)}
                      className="inline-flex items-center justify-center text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-2 transition-colors"
                      title="طباعة قائمة المجموعة"
                    >
                      <PrinterIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEdit && distribution.assignmentMode === 'TRAINEE_CHOICE' && (
                    <button
                      onClick={() => openCapacityModal(room)}
                      className="inline-flex items-center justify-center text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-2 transition-colors"
                      title="تعديل السعة القصوى"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      <TibaModal
        open={!!renameModalRoom}
        onClose={() => { setRenameModalRoom(null); setNewRoomName(''); }}
        title="إعادة تسمية المجموعة"
        subtitle={renameModalRoom ? `الاسم الحالي: ${renameModalRoom.roomName}` : ''}
        variant="primary"
        size="sm"
        icon={<PencilSquareIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setRenameModalRoom(null); setNewRoomName(''); }}>إلغاء</Button>
            <Button size="sm" onClick={handleRenameRoom}>حفظ</Button>
          </div>
        }
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">الاسم الجديد</label>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRenameRoom()}
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="أدخل الاسم الجديد للمجموعة"
            autoFocus
          />
        </div>
      </TibaModal>

      {/* Capacity Edit Modal */}
      <TibaModal
        open={!!capacityModalRoom}
        onClose={() => setCapacityModalRoom(null)}
        title="تعديل السعة القصوى"
        subtitle={capacityModalRoom ? `المجموعة: ${capacityModalRoom.roomName} • المسجلين حالياً: ${capacityModalRoom.assignments?.length || 0}` : ''}
        variant="primary"
        size="sm"
        icon={<PencilSquareIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setCapacityModalRoom(null)}>إلغاء</Button>
            <Button size="sm" onClick={handleUpdateCapacity} isLoading={savingCapacity}>حفظ السعة</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            لا يمكن تعيين سعة أقل من عدد المتدربين المسجلين حالياً في المجموعة.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">السعة القصوى (عدد المقاعد)</label>
            <input
              type="number"
              min={capacityModalRoom?.assignments?.length || 1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateCapacity()}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-center text-lg tabular-nums"
              autoFocus
            />
            {capacityModalRoom && (
              <p className="text-xs text-slate-400 mt-1 text-center">
                الحد الأدنى المسموح: {capacityModalRoom.assignments?.length || 0} متدرب
              </p>
            )}
          </div>
        </div>
      </TibaModal>

      {/* Registration Dates Modal */}
      <TibaModal
        open={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        title="تعديل مواعيد وإعدادات التسجيل الذاتي"
        subtitle={distribution ? `التوزيعة: ${distribution.program.nameAr}` : ''}
        variant="primary"
        size="md"
        icon={<ClockIcon className="w-6 h-6 text-amber-600" />}
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowDatesModal(false)}>إلغاء</Button>
            <Button size="sm" onClick={handleUpdateDates} isLoading={savingDates}>حفظ التغييرات</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            يمكنك تحديد تواريخ بداية ونهاية فترة التسجيل الذاتي للمتدربين، وإظهار التوزيع في المنصة أو إخفائه.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              تاريخ بداية التسجيل (اختياري)
            </label>
            <input
              type="datetime-local"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {editStartDate && (
              <button
                type="button"
                onClick={() => setEditStartDate('')}
                className="text-xs text-rose-600 mt-1 hover:underline block"
              >
                إزالة تاريخ البداية
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              تاريخ نهاية التسجيل (اختياري)
            </label>
            <input
              type="datetime-local"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {editEndDate && (
              <button
                type="button"
                onClick={() => setEditEndDate('')}
                className="text-xs text-rose-600 mt-1 hover:underline block"
              >
                إزالة تاريخ النهاية
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsVisible}
                onChange={(e) => setEditIsVisible(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-slate-700">
                إظهار التوزيع للمتدربين في منصة المتدربين
              </span>
            </label>
          </div>
        </div>
      </TibaModal>



      {/* Student List Modal */}
      <TibaModal
        open={!!selectedRoom}
        onClose={() => { setSelectedRoom(null); setRoomSearchQuery(''); }}
        title={selectedRoom?.roomName || ''}
        subtitle={selectedRoom ? `إجمالي المتدربين: ${selectedRoom.assignments?.length || 0}` : ''}
        variant="primary"
        size="xl"
        icon={<UsersIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-2 justify-end">
            {canPrint && selectedRoom && (
              <Button variant="outline" size="sm" onClick={() => handlePrintRoom(selectedRoom.id)} leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}>
                طباعة القائمة
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { setSelectedRoom(null); setRoomSearchQuery(''); }}>إغلاق</Button>
          </div>
        }
      >
        {selectedRoom && (() => {
          const filteredAssignments = selectedRoom.assignments?.filter((assignment: any) => {
            const searchLower = roomSearchQuery.toLowerCase();
            return (
              assignment.trainee.nameAr.toLowerCase().includes(searchLower) ||
              assignment.trainee.nameEn?.toLowerCase().includes(searchLower) ||
              assignment.trainee.nationalId.includes(searchLower) ||
              assignment.trainee.phone.includes(searchLower) ||
              assignment.trainee.email?.toLowerCase().includes(searchLower)
            );
          }) || [];

          return (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم القومي..."
                  className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                {roomSearchQuery && (
                  <button onClick={() => setRoomSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {roomSearchQuery && (
                <p className="text-xs text-slate-500">النتائج: <strong>{filteredAssignments.length}</strong></p>
              )}

              {canViewPhone && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    أرقام الهواتف ظاهرة لك لأن لديك الصلاحية
                  </p>
                </div>
              )}

              {filteredAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UsersIcon className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    {roomSearchQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد متدربين'}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {roomSearchQuery ? `لم يتم العثور على متدربين يطابقون "${roomSearchQuery}"` : 'لا يوجد متدربين في هذه المجموعة'}
                  </p>
                  {roomSearchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setRoomSearchQuery('')} leftIcon={<XMarkIcon className="w-3.5 h-3.5" />}>
                      مسح البحث
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Mobile Cards */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {filteredAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 flex-shrink-0 mt-0.5">
                            {assignment.orderNumber}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{assignment.trainee.nameAr}</p>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">{assignment.trainee.nationalId}</p>
                            {canViewPhone && (
                              <div className="flex flex-col gap-1 mt-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <PhoneIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                  <span className="font-mono" dir="ltr">{assignment.trainee.phone || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <PhoneIcon className="w-3 h-3 text-violet-500 flex-shrink-0" />
                                  <span className="font-mono" dir="ltr">{assignment.trainee.guardianPhone || '-'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 w-12">#</th>
                          <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">الاسم</th>
                          <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">الرقم القومي</th>
                          {canViewPhone && (
                            <>
                              <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">هاتف المتدرب</th>
                              <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">هاتف ولي الأمر</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAssignments.map((assignment: any) => (
                          <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                {assignment.orderNumber}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm font-bold text-slate-900">{assignment.trainee.nameAr}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-slate-600">{assignment.trainee.nationalId}</td>
                            {canViewPhone && (
                              <>
                                <td className="px-3 py-2.5 text-xs font-mono text-slate-600" dir="ltr">{assignment.trainee.phone || '-'}</td>
                                <td className="px-3 py-2.5 text-xs font-mono text-slate-600" dir="ltr">{assignment.trainee.guardianPhone || '-'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50/50">
                    <span className="text-xs text-slate-500">إجمالي النتائج: <strong className="text-slate-700">{filteredAssignments.length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </TibaModal>
      
      {/* Print Options Dialog */}
      <TibaModal
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        title="خيارات الطباعة"
        subtitle="اختر البيانات التي تريد طباعتها في القائمة"
        variant="primary"
        size="sm"
        icon={<PrinterIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowPrintDialog(false)}>إلغاء</Button>
            <Button variant="primary" className="flex-1" onClick={confirmPrint} leftIcon={<PrinterIcon className="w-4 h-4" />}>طباعة</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={printOptions.includeName} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeName: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
            <span className="text-sm font-medium text-slate-700">الاسم</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={printOptions.includeNationalId} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeNationalId: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
            <span className="text-sm font-medium text-slate-700">الرقم القومي</span>
          </label>
          {canViewPhone && (
            <>
              <label className="flex items-center gap-3 p-3 border border-emerald-200 bg-emerald-50/50 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                <input type="checkbox" checked={printOptions.includePhone} onChange={(e) => setPrintOptions(prev => ({ ...prev, includePhone: e.target.checked }))} className="w-4 h-4 text-emerald-600 rounded border-emerald-300" />
                <PhoneIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">هاتف المتدرب</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-violet-200 bg-violet-50/50 rounded-lg hover:bg-violet-50 cursor-pointer transition-colors">
                <input type="checkbox" checked={printOptions.includeGuardianPhone} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeGuardianPhone: e.target.checked }))} className="w-4 h-4 text-violet-600 rounded border-violet-300" />
                <PhoneIcon className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-slate-700">هاتف ولي الأمر</span>
              </label>
            </>
          )}
        </div>
      </TibaModal>
    </>
  );
}