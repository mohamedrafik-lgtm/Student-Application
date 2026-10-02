'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PrinterIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { fetchAPI, uploadFile } from '@/lib/api';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';

type DeliveryStatus =
  | 'NOT_DELIVERED'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'APPROVED_PLATFORM'
  | 'APPROVED_BRANCH'
  | 'DELIVERED';

type PrintReportType = 'REGISTERED' | 'UNREGISTERED' | 'PENDING_REVIEW' | 'ALL';

interface Program {
  id: number;
  nameAr: string;
}

interface ReviewDeclaration {
  id: string;
  status?: string;
  submissionMethod?: 'ONLINE' | 'BRANCH';
  declarationFileUrl?: string | null;
  declarationFileName?: string | null;
  declarationFileMimeType?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  branchReceivedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  reviewer?: { id: string; name: string } | null;
  branchReceiver?: { id: string; name: string } | null;
}

interface ReviewRow {
  trainee: {
    id: number;
    nameAr: string;
    nationalId?: string;
    phone?: string;
    photoUrl?: string;
    program?: { nameAr?: string };
  };
  declaration: ReviewDeclaration | null;
  deliveryStatus: DeliveryStatus | string;
  isDelivered: boolean;
}

interface ReviewRowTable extends ReviewRow {
  rowId: number;
}

interface ReviewStats {
  totalTrainees: number;
  delivered: number;
  notDelivered: number;
  pendingReview: number;
  rejected: number;
  approvedFromPlatform: number;
  approvedFromBranch: number;
  approvedTotal: number;
  submittedOnline: number;
  submittedBranch: number;
}

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const EMPTY_STATS: ReviewStats = {
  totalTrainees: 0,
  delivered: 0,
  notDelivered: 0,
  pendingReview: 0,
  rejected: 0,
  approvedFromPlatform: 0,
  approvedFromBranch: 0,
  approvedTotal: 0,
  submittedOnline: 0,
  submittedBranch: 0,
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; className: string; icon: React.ComponentType<any> }
> = {
  NOT_DELIVERED: {
    label: 'لم يتم التسليم',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: ExclamationTriangleIcon,
  },
  PENDING_REVIEW: {
    label: 'قيد المراجعة',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ClockIcon,
  },
  REJECTED: {
    label: 'مرفوض',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: ExclamationTriangleIcon,
  },
  APPROVED_PLATFORM: {
    label: 'موافق عليه من المنصة',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircleIcon,
  },
  APPROVED_BRANCH: {
    label: 'موافق عليه من الفرع',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: BuildingOffice2Icon,
  },
  DELIVERED: {
    label: 'تم التسليم',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: ShieldCheckIcon,
  },
};

const UNKNOWN_STATUS_META = {
  label: 'حالة غير معروفة',
  className: 'bg-slate-100 text-slate-700 border-slate-200',
  icon: ExclamationTriangleIcon,
};

function isAllowedFile(file: File) {
  if (file.type.startsWith('image/')) return true;
  if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|doc|docx)$/i.test(file.name);
}

function getStatusMeta(status?: string) {
  if (!status) return UNKNOWN_STATUS_META;
  return DELIVERY_STATUS_META[status as DeliveryStatus] || UNKNOWN_STATUS_META;
}

function unwrapPayload<T = any>(data: any): T {
  return ((data as any)?.data ?? data) as T;
}

function extractPaginatedResult<T>(response: any): {
  items: T[];
  pagination?: Partial<PaginationInfo>;
} {
  const raw = response as any;
  const payload = unwrapPayload<any>(response);

  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  const pagination =
    (payload && !Array.isArray(payload) ? payload.pagination : undefined) ||
    raw?.pagination;

  return {
    items,
    pagination,
  };
}

export default function MinistryExamDeclarationsReviewPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.ministry-exam-declarations-review', action: 'view' }}>
      <MinistryExamDeclarationsReviewContent />
    </ProtectedPage>
  );
}

function MinistryExamDeclarationsReviewContent() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canOpenDeclarationPage = hasPermission('dashboard.ministry-exam-declarations', 'view');

  const [rows, setRows] = useState<ReviewRowTable[]>([]);
  const [stats, setStats] = useState<ReviewStats>(EMPTY_STATS);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL');
  const [submissionMethodFilter, setSubmissionMethodFilter] = useState('ALL');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);

  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<ReviewRowTable | null>(null);
  const [deliverNotes, setDeliverNotes] = useState('');
  const [saveScannedCopy, setSaveScannedCopy] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [printReportType, setPrintReportType] = useState<PrintReportType>('ALL');
  const [printIncludePhone, setPrintIncludePhone] = useState(true);
  const [printProgramMode, setPrintProgramMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [printProgramId, setPrintProgramId] = useState('');

  const programOptions = useMemo(
    () => [
      { value: 'ALL', label: 'كل البرامج التدريبية' },
      ...programs.map((program) => ({ value: String(program.id), label: program.nameAr })),
    ],
    [programs],
  );

  const printProgramOptions = useMemo(
    () => programs.map((program) => ({ value: String(program.id), label: program.nameAr })),
    [programs],
  );

  const submissionMethodOptions = [
    { value: 'ALL', label: 'كل طرق التسليم' },
    { value: 'NONE', label: 'بدون تسليم' },
    { value: 'ONLINE', label: 'أونلاين' },
    { value: 'BRANCH', label: 'من خلال الفرع' },
  ];

  const deliveryStatusOptions = [
    { value: 'ALL', label: 'كل حالات المراجعة' },
    { value: 'NOT_DELIVERED', label: 'لم يتم التسليم' },
    { value: 'PENDING_REVIEW', label: 'قيد المراجعة' },
    { value: 'REJECTED', label: 'مرفوض' },
    { value: 'APPROVED_PLATFORM', label: 'موافق من المنصة' },
    { value: 'APPROVED_BRANCH', label: 'موافق من الفرع' },
  ];

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/programs');
      const payload = unwrapPayload<any>(data);
      setPrograms(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Error loading programs:', error);
      setPrograms([]);
    }
  };

  const loadStats = async (nextSearch = searchQuery) => {
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      if (programFilter !== 'ALL') params.set('programId', programFilter);

      const query = params.toString();
      const data = await fetchAPI(`/ministry-exam-declarations/review/stats${query ? `?${query}` : ''}`);
      const payload = unwrapPayload<any>(data) || {};

      setStats({
        totalTrainees: payload.totalTrainees || 0,
        delivered: payload.delivered || 0,
        notDelivered: payload.notDelivered || 0,
        pendingReview: payload.pendingReview || 0,
        rejected: payload.rejected || 0,
        approvedFromPlatform: payload.approvedFromPlatform || 0,
        approvedFromBranch: payload.approvedFromBranch || 0,
        approvedTotal: payload.approvedTotal || 0,
        submittedOnline: payload.submittedOnline || 0,
        submittedBranch: payload.submittedBranch || 0,
      });
    } catch (error) {
      console.error('Error loading review stats:', error);
    }
  };

  const loadRows = async (page = 1, limit = pagination.limit, nextSearch = searchQuery) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      if (deliveryStatusFilter !== 'ALL') params.set('deliveryStatus', deliveryStatusFilter);
      if (submissionMethodFilter !== 'ALL') params.set('submissionMethod', submissionMethodFilter);
      if (programFilter !== 'ALL') params.set('programId', programFilter);

      const data = await fetchAPI(`/ministry-exam-declarations/review/trainees?${params.toString()}`);
      const { items: list, pagination: parsedPagination } = extractPaginatedResult<ReviewRow>(data);

      setRows(
        list.map((row: ReviewRow, index: number) => ({
          ...row,
          rowId: row.trainee?.id || index + 1,
        })),
      );

      const pg = parsedPagination || DEFAULT_PAGINATION;
      setPagination({
        page: pg.page || 1,
        limit: pg.limit || limit,
        total: pg.total || 0,
        totalPages: pg.totalPages || 1,
        hasNext: (pg.page || 1) < (pg.totalPages || 1),
        hasPrev: (pg.page || 1) > 1,
      });
    } catch (error: any) {
      console.error('Error loading review rows:', error);
      toast.error(error.message || 'تعذر تحميل بيانات المراجعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadStats(searchQuery);
    loadRows(1, pagination.limit, searchQuery);
  }, [deliveryStatusFilter, submissionMethodFilter, programFilter, searchQuery]);

  const refreshAll = async () => {
    await Promise.all([
      loadStats(searchQuery),
      loadRows(pagination.page, pagination.limit, searchQuery),
    ]);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleOpenPrintReport = () => {
    if (printProgramMode === 'SPECIFIC' && !printProgramId) {
      toast.error('يرجى اختيار برنامج تدريبي أولاً');
      return;
    }

    const params = new URLSearchParams({
      type: printReportType,
      includePhone: printIncludePhone ? '1' : '0',
    });

    if (printProgramMode === 'SPECIFIC' && printProgramId) {
      params.set('programId', printProgramId);
      const selectedProgram = printProgramOptions.find((opt) => opt.value === printProgramId);
      if (selectedProgram?.label) {
        params.set('programName', selectedProgram.label);
      }
    }

    const printUrl = `/print/ministry-exam-declarations-report?${params.toString()}`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
    setShowPrintReportModal(false);
  };

  const handleOpenPrint = async (row: ReviewRowTable) => {
    try {
      const data = await fetchAPI(`/ministry-exam-declarations/admin/trainee/${row.trainee.id}/public-link`);
      const payload = unwrapPayload<any>(data);
      const url = payload?.url || (payload?.path ? `${window.location.origin}${payload.path}` : '');

      if (!url) {
        toast.error('تعذر إنشاء رابط الطباعة');
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('Error opening print link:', error);
      toast.error(error.message || 'تعذر فتح نموذج الطباعة');
    }
  };

  const resetDeliverModal = () => {
    setDeliverModalOpen(false);
    setDeliverTarget(null);
    setDeliverNotes('');
    setSaveScannedCopy(false);
    setScannedFile(null);
    setSubmittingDelivery(false);
  };

  const openDeliverModal = async (row: ReviewRowTable) => {
    try {
      const data = await fetchAPI(`/ministry-exam-declarations/admin/trainee/${row.trainee.id}/delivery-status`);
      const payload = unwrapPayload<any>(data);

      if (payload?.canDeliver === false) {
        toast.error(payload?.message || 'تم استلام الإقرار مسبقاً');
        return;
      }
    } catch (error: any) {
      console.error('Error checking delivery status:', error);
      toast.error(error.message || 'تعذر التحقق من حالة التسليم');
      return;
    }

    setDeliverTarget(row);
    setDeliverNotes('');
    setSaveScannedCopy(false);
    setScannedFile(null);
    setDeliverModalOpen(true);
  };

  const handleScannedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setScannedFile(null);
      return;
    }

    if (!isAllowedFile(file)) {
      toast.error('الأنواع المسموحة: جميع الصور + PDF + Word');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب ألا يتجاوز 10MB');
      e.target.value = '';
      return;
    }

    setScannedFile(file);
  };

  const handleSubmitDelivery = async () => {
    if (!deliverTarget) return;

    if (saveScannedCopy && !scannedFile) {
      toast.error('يرجى رفع النسخة الضوئية أو اختيار عدم الحفظ');
      return;
    }

    try {
      setSubmittingDelivery(true);

      let payload: any = {
        deliveryMode: 'PAPER_ONLY',
        submissionNotes: deliverNotes.trim() || undefined,
      };

      if (saveScannedCopy && scannedFile) {
        const uploadResult = await uploadFile(scannedFile, 'ministry-declarations');
        payload = {
          ...payload,
          declarationFileUrl: uploadResult.url,
          declarationFileCloudinaryId: uploadResult.public_id || undefined,
          declarationFileName: uploadResult.originalname || scannedFile.name,
          declarationFileMimeType: uploadResult.mimetype || scannedFile.type,
        };
      }

      await fetchAPI(`/ministry-exam-declarations/admin/trainee/${deliverTarget.trainee.id}/deliver`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('تم تسجيل التسليم واعتماد الإقرار تلقائياً');
      resetDeliverModal();
      await refreshAll();
    } catch (error: any) {
      console.error('Error delivering declaration:', error);
      toast.error(error.message || 'تعذر تسجيل التسليم');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  const statusBadge = (status?: string) => {
    const meta = getStatusMeta(status);
    const StatusIcon = meta.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.className}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {meta.label}
      </span>
    );
  };

  const methodBadge = (method?: 'ONLINE' | 'BRANCH') => {
    if (!method) {
      return <span className="inline-flex px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-100 text-slate-700 border-slate-200">بدون تسليم</span>;
    }

    return (
      <span className={`inline-flex px-3 py-1.5 rounded-xl border text-xs font-bold ${
        method === 'ONLINE'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
      }`}>
        {method === 'ONLINE' ? 'أونلاين' : 'من خلال الفرع'}
      </span>
    );
  };

  const columns = [
    {
      header: 'المتدرب',
      accessor: (row: ReviewRowTable) => (
        <div className="space-y-1 min-w-[240px]">
          <div className="flex items-center gap-3 min-w-0">
            {row.trainee.photoUrl ? (
              <img
                src={row.trainee.photoUrl}
                alt={row.trainee.nameAr}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-slate-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{row.trainee.nameAr}</p>
              <p className="text-xs text-slate-500 truncate">{row.trainee.nationalId || 'بدون رقم قومي'}</p>
              <p className="text-xs text-slate-400 truncate" dir="ltr">{row.trainee.phone || 'بدون هاتف'}</p>
            </div>
          </div>

          {row.declaration?.rejectionReason && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
              سبب الرفض: {row.declaration.rejectionReason}
            </p>
          )}

          <div className="md:hidden flex flex-wrap items-center gap-2 pt-1">
            {methodBadge(row.declaration?.submissionMethod)}
            {statusBadge(row.deliveryStatus)}
          </div>
        </div>
      ),
    },
    {
      header: 'البرنامج التدريبي',
      accessor: (row: ReviewRowTable) => row.trainee.program?.nameAr || 'غير محدد',
      className: 'hidden lg:table-cell',
    },
    {
      header: 'طريقة التسليم',
      accessor: (row: ReviewRowTable) => methodBadge(row.declaration?.submissionMethod),
      className: 'hidden sm:table-cell',
    },
    {
      header: 'حالة المراجعة',
      accessor: (row: ReviewRowTable) => statusBadge(row.deliveryStatus),
      className: 'hidden xl:table-cell',
    },
    {
      header: 'آخر تحديث',
      accessor: (row: ReviewRowTable) => (
        <span className="text-xs font-medium text-slate-700">
          {row.declaration?.updatedAt
            ? new Date(row.declaration.updatedAt).toLocaleString('ar-EG')
            : 'لا يوجد'}
        </span>
      ),
      className: 'hidden xl:table-cell',
    },
    {
      header: 'الإجراءات',
      accessor: (row: ReviewRowTable) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-sky-600 hover:bg-sky-700 text-white"
            onClick={() => handleOpenPrint(row)}
          >
            طباعة
          </Button>

          {(() => {
            const isAlreadyDelivered =
              row.deliveryStatus === 'APPROVED_PLATFORM' ||
              row.deliveryStatus === 'APPROVED_BRANCH' ||
              row.deliveryStatus === 'DELIVERED' ||
              row.declaration?.status === 'APPROVED' ||
              row.declaration?.status === 'BRANCH_DELIVERED';

            if (isAlreadyDelivered) {
              return (
                <Button
                  size="sm"
                  className="bg-teal-600 text-white cursor-default"
                  disabled
                >
                  تم التسليم
                </Button>
              );
            }

            return (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  openDeliverModal(row);
                }}
              >
                تسليم
              </Button>
            );
          })()}

          {row.declaration?.declarationFileUrl && (
            <a
              href={row.declaration.declarationFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              الملف
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مراجعة إقرارات اختبار وزارة العمل"
        description="صفحة شاملة لكل المتدربين مع فلاتر البرنامج وحالة المراجعة والتسليم"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'طلبات المتدربين', href: '/dashboard/requests' },
          { label: 'مراجعة إقرارات اختبار وزارة العمل' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canOpenDeclarationPage && (
              <Button
                size="sm"
                onClick={() => router.push('/dashboard/requests/ministry-exam-declaration')}
                className="gap-2 bg-gradient-to-l from-sky-600 via-cyan-600 to-emerald-600 hover:from-sky-700 hover:via-cyan-700 hover:to-emerald-700 text-white border-0 shadow-lg shadow-cyan-200/60"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>إقرارات مقدمة من المنصة</span>
                <span className="mr-1 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black">
                  {stats.submittedOnline}
                </span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintReportType('ALL');
                setPrintIncludePhone(true);
                setPrintProgramMode('ALL');
                setPrintProgramId('');
                setShowPrintReportModal(true);
              }}
              className="group h-9 gap-2 border-slate-300 bg-white text-slate-800 hover:bg-sky-50/70 hover:border-sky-300 shadow-sm"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 group-hover:bg-sky-200 transition-colors">
                <PrinterIcon className="w-3.5 h-3.5" />
              </span>
              <span className="font-bold">طباعة تقرير</span>
              <span className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                4 أنواع
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              تحديث
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3 mb-6">
        <StatCard label="إجمالي المتدربين" value={stats.totalTrainees} />
        <StatCard label="تم التسليم" value={stats.delivered} />
        <StatCard label="لم يتم التسليم" value={stats.notDelivered} />
        <StatCard label="قيد المراجعة" value={stats.pendingReview} />
        <StatCard label="مرفوض" value={stats.rejected} />
        <StatCard label="موافق منصة" value={stats.approvedFromPlatform} />
        <StatCard label="موافق فرع" value={stats.approvedFromBranch} />
        <StatCard label="إجمالي الموافقات" value={stats.approvedTotal} />
        <StatCard label="تسليم أونلاين" value={stats.submittedOnline} />
        <StatCard label="تسليم فرع" value={stats.submittedBranch} />
      </div>

      <Card className="mb-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <Input
                placeholder="بحث باسم المتدرب أو الرقم القومي أو الهاتف..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-11"
              />
            </div>
            <Button className="h-11" onClick={handleSearch}>بحث</Button>
            {(searchInput || searchQuery) && (
              <Button variant="outline" className="h-11" onClick={handleClearSearch}>مسح</Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SearchableSelect
              options={programOptions}
              value={programFilter}
              onChange={(value) => setProgramFilter(value || 'ALL')}
              placeholder="تصفية حسب البرنامج التدريبي"
              instanceId="ministry-review-program-filter"
            />
            <SimpleSelect
              options={submissionMethodOptions}
              value={submissionMethodFilter}
              onChange={setSubmissionMethodFilter}
              instanceId="ministry-review-method-filter"
            />
            <SimpleSelect
              options={deliveryStatusOptions}
              value={deliveryStatusFilter}
              onChange={setDeliveryStatusFilter}
              instanceId="ministry-review-status-filter"
            />
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          data={rows}
          columns={columns as any}
          keyField="rowId"
          isLoading={loading}
          emptyMessage="لا توجد بيانات مطابقة"
        />

        {!loading && pagination.total > 0 && (
          <div className="mt-5">
            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => loadRows(nextPage, pagination.limit, searchQuery)}
              onLimitChange={(nextLimit) => loadRows(1, nextLimit, searchQuery)}
              isLoading={loading}
            />
          </div>
        )}
      </Card>

      {deliverModalOpen && deliverTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!submittingDelivery) {
              resetDeliverModal();
            }
          }}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">تسليم إقرار وزارة العمل</h3>
              <p className="text-xs text-slate-500 mt-1">
                المتدرب: {deliverTarget.trainee.nameAr} ({deliverTarget.trainee.nationalId || 'بدون رقم قومي'})
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800">طريقة التسليم</p>
                <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50">
                  <p className="text-sm font-bold text-slate-900">من خلال الفرع</p>
                  <p className="text-xs text-slate-600 mt-1">
                    التسليم من صفحة المراجعة يتم دائمًا كتسليم فرع، والحالة الأونلاين تظهر فقط عند رفع المتدرب للملف من المنصة.
                  </p>
                </div>
              </div>

              <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">هل تريد حفظ نسخة ضوئية من الإقرار؟</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveScannedCopy(false);
                      setScannedFile(null);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      !saveScannedCopy
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                    disabled={submittingDelivery}
                  >
                    لا
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveScannedCopy(true)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      saveScannedCopy
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                    disabled={submittingDelivery}
                  >
                    نعم، حفظ نسخة ضوئية
                  </button>
                </div>

                {saveScannedCopy && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">ارفع النسخة الضوئية</label>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleScannedFileChange}
                      disabled={submittingDelivery}
                      className="block w-full text-sm text-slate-700 file:ml-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-bold hover:file:bg-indigo-100"
                    />
                    {scannedFile ? (
                      <p className="text-xs text-indigo-700 font-medium">تم اختيار: {scannedFile.name}</p>
                    ) : (
                      <p className="text-xs text-slate-500">الأنواع المسموحة: الصور + PDF + Word (حد أقصى 10MB).</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">ملاحظات (اختياري)</label>
                <textarea
                  rows={3}
                  value={deliverNotes}
                  onChange={(e) => setDeliverNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية حول التسليم..."
                  disabled={submittingDelivery}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                بمجرد الحفظ سيتم تسجيل الإقرار كتسليم فرع واعتماده تلقائياً.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetDeliverModal}
                disabled={submittingDelivery}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitDelivery}
                isLoading={submittingDelivery}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                حفظ التسليم واعتماد الإقرار
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPrintReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPrintReportModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">إعدادات طباعة التقرير</h3>
              <p className="text-xs text-slate-500 mt-1">حدد نوع التقرير والبيانات المطلوب إظهارها قبل فتح صفحة الطباعة</p>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800">نوع التقرير</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintReportType('REGISTERED')}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                      printReportType === 'REGISTERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    تقرير المسجلين
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintReportType('UNREGISTERED')}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                      printReportType === 'UNREGISTERED'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    تقرير غير المسجلين
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintReportType('ALL')}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                      printReportType === 'ALL'
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    تقرير بالكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintReportType('PENDING_REVIEW')}
                    className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                      printReportType === 'PENDING_REVIEW'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    تقرير قيد المراجعة
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  المسجلين = لديه إقرار من أي وسيلة لكنه ليس قيد المراجعة. غير المسجلين = متدرب بدون أي إقرار. قيد المراجعة = تقرير مستقل.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800">عرض رقم الهاتف في التقرير</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintIncludePhone(true)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      printIncludePhone
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    نعم
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintIncludePhone(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      !printIncludePhone
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800">نطاق البرنامج التدريبي</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintProgramMode('ALL');
                      setPrintProgramId('');
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      printProgramMode === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    كل البرامج التدريبية
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintProgramMode('SPECIFIC')}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                      printProgramMode === 'SPECIFIC'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    برنامج تدريبي محدد
                  </button>
                </div>

                {printProgramMode === 'SPECIFIC' && (
                  <SearchableSelect
                    options={printProgramOptions}
                    value={printProgramId}
                    onChange={(value) => setPrintProgramId(value || '')}
                    placeholder="اختر البرنامج التدريبي"
                    instanceId="ministry-report-program-filter"
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPrintReportModal(false)}>إلغاء</Button>
              <Button
                onClick={handleOpenPrintReport}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                فتح صفحة الطباعة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3 bg-white border border-slate-200 shadow-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    </Card>
  );
}
