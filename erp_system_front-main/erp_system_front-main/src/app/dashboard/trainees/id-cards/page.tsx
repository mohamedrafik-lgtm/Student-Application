'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';
import PageHeader from '@/app/components/PageHeader';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';
import { IdCardDesign } from '@/types/id-card-design';
import IdCardPreview from '@/components/id-card-designer/IdCardPreview';
import QRCode from 'qrcode';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  PrinterIcon,
  TruckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  CheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { bulkDownloadAPI } from '@/lib/bulk-download-api';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { TibaModal } from '@/components/ui/tiba-modal';
import { TraineeAvatar, TraineePhotoLightbox } from '@/components/ui/trainee-avatar';

// ── الأنواع ──

interface Trainee {
  id: number;
  nameAr: string;
  nameEn?: string;
  nationalId?: string;
  phone?: string;
  photoUrl?: string;
  program?: { id: number; nameAr: string };
  idCardStatus: {
    status: string;
    statusColor: string;
    canDeliver: boolean;
    canPrint: boolean;
    printedAt: string | null;
    printedBy: { id: string; name: string } | null;
    deliveredAt: string | null;
    deliveredBy: { id: string; name: string } | null;
    deliveryNotes: string | null;
    printId: number | null;
  };
}

interface Statistics {
  totalTrainees: number;
  notPrinted: number;
  printed: number;
  printedNotDelivered: number;
  delivered: number;
  printedPercentage: string;
  deliveredPercentage: string;
}

interface Program {
  id: number;
  nameAr: string;
}

// ── المكون الرئيسي ──

function IdCardsManagementPageContent() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  // التحميل الجماعي
  const [bulkDownloadModalOpen, setBulkDownloadModalOpen] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<number[]>([]);

  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');

  // pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // modal للتسليم
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // المعاينة والطباعة
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTrainee, setPreviewTrainee] = useState<Trainee | null>(null);
  const [idCardDesign, setIdCardDesign] = useState<IdCardDesign | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  // تأكيد الطباعة
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [traineeToConfirm, setTraineeToConfirm] = useState<Trainee | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // صورة اللايت بوكس
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photoUrl: string; name: string; nationalId: string } | null>(null);

  // ── تحميل البيانات ──

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    loadTrainees(1);
  }, [searchTerm, statusFilter, programFilter]);

  useEffect(() => {
    if (pagination.currentPage > 1) loadTrainees(pagination.currentPage);
  }, [pagination.currentPage]);

  const loadInitialData = async () => {
    try {
      const [statsResponse, programsResponse, settingsResponse] = await Promise.all([
        fetchAPI('/id-cards/statistics'),
        fetchAPI('/programs'),
        fetchAPI('/settings'),
      ]);
      setStatistics(statsResponse);
      setPrograms(programsResponse);
      setSettings(settingsResponse.settings);
    } catch {
      toast.error('حدث خطأ في تحميل البيانات الأولية');
    }
  };

  const loadTrainees = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (programFilter) params.append('programId', programFilter);

      const response = await fetchAPI(`/id-cards/trainees-with-status?${params}`);
      setTrainees(response.data);
      setPagination(response.pagination);
    } catch {
      toast.error('حدث خطأ في تحميل المتدربين');
    } finally {
      setLoading(false);
    }
  };

  // ── دوال التسليم ──

  const handleDeliveryStatusUpdate = async (isDelivered: boolean) => {
    if (!selectedTrainee?.idCardStatus.printId) return;
    try {
      setUpdating(selectedTrainee.idCardStatus.printId);
      const response = await fetchAPI(
        `/id-cards/delivery-status/${selectedTrainee.idCardStatus.printId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            isDelivered,
            deliveryNotes: isDelivered ? deliveryNotes.trim() : '',
          }),
        }
      );
      if (response.success) {
        toast.success(response.message);
        setShowDeliveryModal(false);
        setDeliveryNotes('');
        setSelectedTrainee(null);
        await Promise.all([loadTrainees(pagination.currentPage), loadInitialData()]);
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحديث حالة التسليم');
    } finally {
      setUpdating(null);
    }
  };

  const openDeliveryModal = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setDeliveryNotes('');
    setShowDeliveryModal(true);
  };

  // ── دوال المعاينة والطباعة ──

  const handlePreview = async (trainee: Trainee) => {
    setPreviewTrainee(trainee);
    try {
      const design = await idCardDesignsAPI.getDesignForTrainee(trainee.id);
      setIdCardDesign(design);
      if (trainee.nationalId) {
        try {
          const qrDataURL = await QRCode.toDataURL(trainee.nationalId, {
            width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' },
          });
          setQrCodeDataUrl(qrDataURL);
        } catch { /* ignore */ }
      }
      setPreviewModalOpen(true);
    } catch {
      toast.error('حدث خطأ في تحميل تصميم الكارنيه');
    }
  };

  const handlePrint = (trainee: Trainee) => {
    setTraineeToConfirm(trainee);
    setConfirmModalOpen(true);
  };

  const confirmPrint = async () => {
    if (!traineeToConfirm) return;
    setIsPrinting(true);
    try {
      const design = await idCardDesignsAPI.getDesignForTrainee(traineeToConfirm.id);
      await fetchAPI('/id-cards/print', {
        method: 'POST',
        body: JSON.stringify({ traineeId: traineeToConfirm.id, designId: design.id }),
      });
      toast.success('تم تسجيل طباعة الكارنيه بنجاح');
      loadTrainees(pagination.currentPage);
      const printUrl = `/print/id-card/${traineeToConfirm.id}/simple?designId=${design.id}`;
      const printWindow = window.open(printUrl, '_blank', 'width=900,height=700,scrollbars=no,resizable=yes,toolbar=no,menubar=no,location=no');
      if (printWindow) printWindow.focus();
      else toast.error('تعذر فتح نافذة الطباعة. تأكد من السماح للنوافذ المنبثقة.');
      setConfirmModalOpen(false);
      setTraineeToConfirm(null);
    } catch {
      toast.error('حدث خطأ أثناء طباعة الكارنيه');
    } finally {
      setIsPrinting(false);
    }
  };

  // ── دوال التحميل الجماعي ──

  const handleBulkDownload = async (type: 'selected' | 'program' | 'all', programId?: number) => {
    setBulkDownloading(true);
    try {
      let response;
      switch (type) {
        case 'selected':
          if (selectedTraineeIds.length === 0) { toast.error('يرجى تحديد المتدربين أولاً'); setBulkDownloading(false); return; }
          response = await bulkDownloadAPI.downloadSelectedTrainees(selectedTraineeIds);
          break;
        case 'program':
          if (!programId) { toast.error('يرجى تحديد البرنامج التدريبي'); setBulkDownloading(false); return; }
          response = await bulkDownloadAPI.downloadProgramIdCards(programId);
          break;
        case 'all':
          response = await bulkDownloadAPI.downloadAllIdCards();
          break;
        default:
          throw new Error('نوع التحميل غير صحيح');
      }
      bulkDownloadAPI.downloadFile(response.blob, response.fileName);
      toast.success(`تم تحميل ${response.totalCards} كارنيه بنجاح`);
      setBulkDownloadModalOpen(false);
      setSelectedTraineeIds([]);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحميل الكارنيهات');
    } finally {
      setBulkDownloading(false);
    }
  };

  const toggleTraineeSelection = (traineeId: number) => {
    setSelectedTraineeIds(prev =>
      prev.includes(traineeId) ? prev.filter(id => id !== traineeId) : [...prev, traineeId]
    );
  };

  const selectAllTrainees = () => setSelectedTraineeIds(trainees.map(t => t.id));
  const clearSelection = () => setSelectedTraineeIds([]);

  // ── مساعدات ──

  const getStatusBadge = (status: Trainee['idCardStatus']) => {
    const map: Record<string, string> = {
      gray: 'bg-slate-100 text-slate-700 border-slate-200',
      orange: 'bg-amber-50 text-amber-700 border-amber-200',
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status.statusColor] || map.gray}`}>
        {status.status}
      </span>
    );
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

  const resetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('');
    setProgramFilter('');
  };

  // ── الإحصائيات ──

  const STAT_CARDS = statistics ? [
    { label: 'إجمالي المتدربين', value: statistics.totalTrainees, icon: UsersIcon, iconBg: 'bg-tiba-primary-50', iconColor: 'text-tiba-primary-600' },
    { label: 'لم يتم الطباعة', value: statistics.notPrinted, icon: XMarkIcon, iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
    { label: 'مطبوع غير مُسلم', value: statistics.printedNotDelivered, icon: PrinterIcon, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: 'تم التسليم', value: statistics.delivered, icon: CheckCircleIcon, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  ] : [];

  // ── حساب بيانات الـ Pagination بالشكل المتوافق ──

  const paginationData = {
    page: pagination.currentPage,
    limit: pagination.itemsPerPage,
    total: pagination.totalItems,
    totalPages: pagination.totalPages,
    hasNext: pagination.hasNextPage,
    hasPrev: pagination.hasPreviousPage,
  };

  return (
    <div>
      <PageHeader
        title="إدارة الكارنيهات"
        description="متابعة وإدارة حالة طباعة وتسليم كارنيهات المتدربين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'إدارة الكارنيهات' },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setBulkDownloadModalOpen(true)}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
            >
              تحميل جماعي
            </Button>

            <Button
              onClick={() => window.open('/dashboard/trainees/id-cards/bulk-print', '_blank')}
              leftIcon={<PrinterIcon className="w-4 h-4" />}
              className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
            >
              طباعة جماعية
            </Button>
          </div>
        }
      />

      {/* ── الإحصائيات ── */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {STAT_CARDS.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          ))}

          {/* بطاقة نسبة التسليم المميزة */}
          <div className="bg-gradient-to-bl from-[#0A2647] to-[#143d65] rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/70">نسبة التسليم</span>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <TruckIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold">{statistics.deliveredPercentage}%</p>
          </div>
        </div>
      )}

      {/* ── الفلاتر ── */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* البحث */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي..."
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500 focus:bg-white transition-all"
            />
          </div>

          {/* حالة الكارنيه */}
          <SimpleSelect
            options={[
              { value: '', label: 'جميع الحالات' },
              { value: 'not_printed', label: 'لم يتم الطباعة' },
              { value: 'printed', label: 'مطبوع غير مُسلم' },
              { value: 'delivered', label: 'تم التسليم' },
            ]}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            placeholder="حالة الكارنيه"
          />

          {/* البرنامج */}
          <SearchableSelect
            options={[
              { value: '', label: 'جميع البرامج' },
              ...programs.map(p => ({ value: p.id.toString(), label: p.nameAr })),
            ]}
            value={programFilter}
            onChange={(v) => setProgramFilter(v)}
            placeholder="البرنامج التدريبي"
            instanceId="id-cards-program-filter"
          />

          {/* أزرار */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              title="إعادة تعيين الفلاتر"
            >
              <FunnelIcon className="w-4 h-4" />
              <span className="hidden sm:inline">مسح</span>
            </button>
            <button
              onClick={() => loadTrainees(pagination.currentPage)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="تحديث"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── شريط التحديد ── */}
      {selectedTraineeIds.length > 0 && (
        <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-tiba-primary-600" />
            <span className="text-sm font-medium text-tiba-primary-800">
              تم تحديد {selectedTraineeIds.length} متدرب
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkDownload('selected')}
              disabled={bulkDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-tiba-primary-600 border border-tiba-primary-600 rounded-lg hover:bg-tiba-primary-700 disabled:opacity-50 transition-colors"
            >
              {bulkDownloading ? (
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              )}
              تحميل المحددين
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* ── الجدول (ديسكتوب) ── */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="text-center text-xs font-medium text-slate-500 py-3 px-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedTraineeIds.length === trainees.length && trainees.length > 0}
                    onChange={(e) => e.target.checked ? selectAllTrainees() : clearSelection()}
                    className="h-4 w-4 rounded border-slate-300 text-tiba-primary-600 focus:ring-tiba-primary-500"
                  />
                </th>
                <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">المتدرب</th>
                <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">البرنامج</th>
                <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">الحالة</th>
                <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">الطباعة</th>
                <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">التسليم</th>
                <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ArrowPathIcon className="w-7 h-7 animate-spin text-tiba-primary-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">جاري تحميل البيانات...</p>
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <IdentificationIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">لا توجد نتائج</p>
                    <p className="text-xs text-slate-400 mt-1">جرب تغيير معايير البحث</p>
                  </td>
                </tr>
              ) : (
                trainees.map((trainee) => (
                  <tr key={trainee.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="text-center py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedTraineeIds.includes(trainee.id)}
                        onChange={() => toggleTraineeSelection(trainee.id)}
                        className="h-4 w-4 rounded border-slate-300 text-tiba-primary-600 focus:ring-tiba-primary-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <TraineeAvatar
                          photoUrl={trainee.photoUrl}
                          name={trainee.nameAr}
                          nationalId={trainee.nationalId || 'غير محدد'}
                          size="sm"
                          onOpenPhoto={(photoUrl, name, nationalId) => {
                            setSelectedPhoto({ photoUrl, name, nationalId });
                            setShowPhotoModal(true);
                          }}
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-900 block truncate">{trainee.nameAr}</span>
                          <span className="text-xs text-slate-500">{trainee.nationalId || 'لا يوجد رقم قومي'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                        {trainee.program?.nameAr || 'غير محدد'}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {getStatusBadge(trainee.idCardStatus)}
                    </td>
                    <td className="py-3 px-4">
                      {trainee.idCardStatus.printedAt ? (
                        <div>
                          <div className="text-xs text-slate-700">{formatDate(trainee.idCardStatus.printedAt)}</div>
                          <div className="text-xs text-slate-400">بواسطة: {trainee.idCardStatus.printedBy?.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {trainee.idCardStatus.deliveredAt ? (
                        <div>
                          <div className="text-xs text-slate-700">{formatDate(trainee.idCardStatus.deliveredAt)}</div>
                          <div className="text-xs text-slate-400">بواسطة: {trainee.idCardStatus.deliveredBy?.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePreview(trainee)} className="p-1.5 text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-lg transition-colors" title="معاينة">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {trainee.idCardStatus.canPrint && (
                          <button onClick={() => handlePrint(trainee)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="طباعة">
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                        )}
                        {trainee.idCardStatus.canDeliver && (
                          <button onClick={() => openDeliveryModal(trainee)} disabled={updating === trainee.idCardStatus.printId} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50" title="تسليم">
                            <TruckIcon className="w-4 h-4" />
                          </button>
                        )}
                        {trainee.idCardStatus.deliveredAt && (
                          <button onClick={() => openDeliveryModal(trainee)} disabled={updating === trainee.idCardStatus.printId} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="إلغاء التسليم">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── بطاقات (موبايل) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center">
              <ArrowPathIcon className="w-7 h-7 animate-spin text-tiba-primary-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">جاري تحميل البيانات...</p>
            </div>
          ) : trainees.length === 0 ? (
            <div className="py-12 text-center">
              <IdentificationIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">لا توجد نتائج</p>
            </div>
          ) : (
            trainees.map((trainee) => (
              <div key={trainee.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTraineeIds.includes(trainee.id)}
                      onChange={() => toggleTraineeSelection(trainee.id)}
                      className="h-4 w-4 rounded border-slate-300 text-tiba-primary-600 focus:ring-tiba-primary-500"
                    />
                    <TraineeAvatar
                      photoUrl={trainee.photoUrl}
                      name={trainee.nameAr}
                      nationalId={trainee.nationalId || 'غير محدد'}
                      size="sm"
                      onOpenPhoto={(photoUrl, name, nationalId) => {
                        setSelectedPhoto({ photoUrl, name, nationalId });
                        setShowPhotoModal(true);
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{trainee.nameAr}</div>
                      <div className="text-xs text-slate-500">{trainee.nationalId || 'غير محدد'}</div>
                    </div>
                  </div>
                  {getStatusBadge(trainee.idCardStatus)}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>البرنامج: <strong className="text-slate-700">{trainee.program?.nameAr || 'غير محدد'}</strong></span>
                </div>

                {(trainee.idCardStatus.printedAt || trainee.idCardStatus.deliveredAt) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {trainee.idCardStatus.printedAt && <span>الطباعة: {formatDate(trainee.idCardStatus.printedAt)}</span>}
                    {trainee.idCardStatus.deliveredAt && <span>التسليم: {formatDate(trainee.idCardStatus.deliveredAt)}</span>}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => handlePreview(trainee)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-tiba-primary-700 bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg active:bg-tiba-primary-100 transition-colors">
                    <EyeIcon className="w-4 h-4" />
                    معاينة
                  </button>
                  {trainee.idCardStatus.canPrint && (
                    <button onClick={() => handlePrint(trainee)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg active:bg-emerald-100 transition-colors">
                      <PrinterIcon className="w-4 h-4" />
                      طباعة
                    </button>
                  )}
                  {trainee.idCardStatus.canDeliver && (
                    <button onClick={() => openDeliveryModal(trainee)} disabled={updating === trainee.idCardStatus.printId} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg active:bg-amber-100 transition-colors disabled:opacity-50">
                      <TruckIcon className="w-4 h-4" />
                      تسليم
                    </button>
                  )}
                  {trainee.idCardStatus.deliveredAt && (
                    <button onClick={() => openDeliveryModal(trainee)} disabled={updating === trainee.idCardStatus.printId} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg active:bg-red-100 transition-colors disabled:opacity-50">
                      <XMarkIcon className="w-4 h-4" />
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── ترقيم الصفحات ── */}
        <div className="border-t border-slate-100">
          <Pagination
            pagination={paginationData}
            onPageChange={(p) => setPagination(prev => ({ ...prev, currentPage: p }))}
            onLimitChange={(newLimit) => setPagination(prev => ({ ...prev, itemsPerPage: newLimit, currentPage: 1 }))}
            isLoading={loading}
            showLimitSelector={true}
            limitOptions={[10, 20, 50, 100]}
          />
        </div>
      </div>

      {/* ── لايت بوكس الصورة ── */}
      {showPhotoModal && selectedPhoto && (
        <TraineePhotoLightbox
          photoUrl={selectedPhoto.photoUrl}
          name={selectedPhoto.name}
          nationalId={selectedPhoto.nationalId}
          onClose={() => { setShowPhotoModal(false); setSelectedPhoto(null); }}
        />
      )}

      {/* ── Modal تسليم الكارنيه ── */}
      <TibaModal
        open={showDeliveryModal && !!selectedTrainee}
        onClose={() => setShowDeliveryModal(false)}
        title={selectedTrainee?.idCardStatus.deliveredAt ? 'إلغاء تسليم الكارنيه' : 'تسليم الكارنيه'}
        subtitle={selectedTrainee?.nameAr}
        variant={selectedTrainee?.idCardStatus.deliveredAt ? 'danger' : 'primary'}
        size="sm"
        icon={selectedTrainee?.idCardStatus.deliveredAt ? <XMarkIcon className="w-5 h-5" /> : <TruckIcon className="w-5 h-5" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => selectedTrainee && handleDeliveryStatusUpdate(!selectedTrainee.idCardStatus.deliveredAt)}
              disabled={updating === selectedTrainee?.idCardStatus.printId}
              leftIcon={
                updating === selectedTrainee?.idCardStatus.printId
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : selectedTrainee?.idCardStatus.deliveredAt
                    ? <XMarkIcon className="w-4 h-4" />
                    : <CheckCircleIcon className="w-4 h-4" />
              }
              className={`flex-1 ${
                selectedTrainee?.idCardStatus.deliveredAt
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white'
              }`}
            >
              {selectedTrainee?.idCardStatus.deliveredAt ? 'إلغاء التسليم' : 'تأكيد التسليم'}
            </Button>
            <Button
              onClick={() => setShowDeliveryModal(false)}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </Button>
          </div>
        }
      >
        {selectedTrainee?.idCardStatus.deliveredAt ? (
          <div className="text-center py-2">
            <p className="text-sm text-slate-600 mb-2">هل أنت متأكد من إلغاء تسليم الكارنيه؟</p>
            <p className="text-xs text-slate-400">تم التسليم في: {formatDate(selectedTrainee.idCardStatus.deliveredAt)}</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات التسليم (اختياري)</label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="أدخل أي ملاحظات حول عملية التسليم..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-500 focus:border-tiba-primary-500 resize-none"
              rows={3}
            />
          </div>
        )}
      </TibaModal>

      {/* ── Modal تأكيد الطباعة ── */}
      <TibaModal
        open={confirmModalOpen && !!traineeToConfirm}
        onClose={() => { setConfirmModalOpen(false); setTraineeToConfirm(null); }}
        title="تأكيد طباعة الكارنيه"
        subtitle="هذا الإجراء سيتم تسجيله"
        variant="primary"
        size="sm"
        icon={<PrinterIcon className="w-5 h-5" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={confirmPrint}
              disabled={isPrinting}
              leftIcon={
                isPrinting
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <PrinterIcon className="w-4 h-4" />
              }
              className="flex-1 bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
            >
              {isPrinting ? 'جاري الطباعة...' : 'تأكيد الطباعة'}
            </Button>
            <Button
              onClick={() => { setConfirmModalOpen(false); setTraineeToConfirm(null); }}
              disabled={isPrinting}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </Button>
          </div>
        }
      >
        {traineeToConfirm && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-base font-bold text-slate-900">{traineeToConfirm.nameAr}</p>
              <p className="text-xs text-slate-500 mt-1">الرقم القومي: {traineeToConfirm.nationalId || 'غير محدد'}</p>
              <p className="text-xs text-slate-500">البرنامج: {traineeToConfirm.program?.nameAr || 'غير محدد'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">تنبيه هام:</p>
                <p>سيتم تسجيل عملية الطباعة في النظام وفتح نافذة طباعة جديدة.</p>
              </div>
            </div>
          </div>
        )}
      </TibaModal>

      {/* ── Modal معاينة الكارنيه ── */}
      <TibaModal
        open={previewModalOpen && !!previewTrainee && !!idCardDesign && !!settings}
        onClose={() => { setPreviewModalOpen(false); setPreviewTrainee(null); setQrCodeDataUrl(null); }}
        title="معاينة كارنيه المتدرب"
        subtitle={previewTrainee?.nameAr}
        variant="primary"
        size="lg"
        icon={<IdentificationIcon className="w-5 h-5" />}
        footer={
          <div className="flex gap-3 w-full justify-center">
            {previewTrainee?.idCardStatus.canPrint && (
              <Button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewTrainee(null);
                  setQrCodeDataUrl(null);
                  if (previewTrainee) handlePrint(previewTrainee);
                }}
                leftIcon={<PrinterIcon className="w-4 h-4" />}
                className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
              >
                طباعة الكارنيه
              </Button>
            )}
            <Button
              onClick={() => { setPreviewModalOpen(false); setPreviewTrainee(null); setQrCodeDataUrl(null); }}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إغلاق
            </Button>
          </div>
        }
      >
        {previewTrainee && idCardDesign && settings && (
          <div className="flex justify-center py-4">
            <IdCardPreview
              design={idCardDesign}
              traineeData={{
                nameAr: previewTrainee.nameAr,
                nationalId: previewTrainee.nationalId || '',
                photoUrl: previewTrainee.photoUrl,
                program: { nameAr: previewTrainee.program?.nameAr || '' },
                id: previewTrainee.id,
              }}
              centerData={{
                centerName: settings.centerName,
                centerLogo: settings.centerLogo,
              }}
              qrCodeDataUrl={qrCodeDataUrl || undefined}
              scale={1.2}
              className="shadow-xl border border-slate-200 rounded-lg"
            />
          </div>
        )}
      </TibaModal>

      {/* ── Modal التحميل الجماعي ── */}
      <TibaModal
        open={bulkDownloadModalOpen}
        onClose={() => setBulkDownloadModalOpen(false)}
        title="التحميل الجماعي للكارنيهات"
        subtitle="اختر نوع التحميل المطلوب"
        variant="primary"
        size="md"
        icon={<ArchiveBoxIcon className="w-5 h-5" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => handleBulkDownload('all')}
              disabled={bulkDownloading}
              leftIcon={
                bulkDownloading
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />
              }
              className="flex-1 bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
            >
              {bulkDownloading ? 'جاري التحميل...' : 'تحميل جميع الكارنيهات'}
            </Button>
            <Button
              onClick={() => setBulkDownloadModalOpen(false)}
              disabled={bulkDownloading}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إغلاق
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* تحميل المتدربين المحددين */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-tiba-primary-600" />
                <h4 className="text-sm font-bold text-slate-700">المتدربين المحددين</h4>
              </div>
              <span className="text-xs text-slate-400">({selectedTraineeIds.length} متدرب)</span>
            </div>
            {selectedTraineeIds.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">لم يتم تحديد أي متدربين</p>
            ) : (
              <button
                onClick={() => handleBulkDownload('selected')}
                disabled={bulkDownloading}
                className="w-full py-2.5 text-sm font-medium text-white bg-tiba-primary-600 rounded-lg hover:bg-tiba-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {bulkDownloading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
                تحميل المحددين ({selectedTraineeIds.length})
              </button>
            )}
          </div>

          {/* تحميل حسب البرنامج */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <IdentificationIcon className="w-4 h-4 text-tiba-primary-600" />
              <h4 className="text-sm font-bold text-slate-700">حسب البرنامج التدريبي</h4>
            </div>
            <div className="space-y-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleBulkDownload('program', program.id)}
                  disabled={bulkDownloading}
                  className="w-full p-3 text-right bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-slate-700">{program.nameAr}</span>
                  {bulkDownloading ? (
                    <ArrowPathIcon className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <ArrowDownTrayIcon className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ملاحظة */}
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span>سيتم تحميل كل كارنيه في صفحة منفصلة</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-tiba-primary-500 rounded-full" />
              <span>الملف سيحذف تلقائياً بعد التحميل</span>
            </div>
          </div>
        </div>
      </TibaModal>
    </div>
  );
}

export default function IdCardsManagementPage() {
  return (
    <PageGuard requiredPermission={{ resource: 'dashboard.id-cards', action: 'manage' }}>
      <IdCardsManagementPageContent />
    </PageGuard>
  );
}
