'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
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

type DeclarationStatus =
  | 'PENDING_REVIEW'
  | 'NEEDS_RESUBMISSION'
  | 'APPROVED'
  | 'PENDING_BRANCH_DELIVERY'
  | 'BRANCH_DELIVERED';

interface Program {
  id: number;
  nameAr: string;
}

interface MinistryDeclaration {
  id: string;
  submissionMethod: 'ONLINE' | 'BRANCH';
  status: DeclarationStatus | string;
  declarationFileUrl?: string | null;
  declarationFileName?: string | null;
  declarationFileMimeType?: string | null;
  submissionCount?: number;
  submissionNotes?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  branchReceivedAt?: string | null;
  reviewer?: { id: string; name: string } | null;
  branchReceiver?: { id: string; name: string } | null;
  updatedAt: string;
  createdAt: string;
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
    phone?: string;
    photoUrl?: string;
    program?: { nameAr?: string };
  };
}

interface Stats {
  total: number;
  pendingReview: number;
  needsResubmission: number;
  approved: number;
  pendingBranchDelivery: number;
  branchDelivered: number;
  online: number;
  branch: number;
}

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const EMPTY_STATS: Stats = {
  total: 0,
  pendingReview: 0,
  needsResubmission: 0,
  approved: 0,
  pendingBranchDelivery: 0,
  branchDelivered: 0,
  online: 0,
  branch: 0,
};

const STATUS_META: Record<DeclarationStatus, { label: string; className: string; icon: React.ComponentType<any> }> = {
  PENDING_REVIEW: {
    label: 'قيد المراجعة (من المنصة)',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ClockIcon,
  },
  NEEDS_RESUBMISSION: {
    label: 'مرفوض - إعادة رفع مطلوبة',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: ExclamationTriangleIcon,
  },
  APPROVED: {
    label: 'تمت الموافقة (من المنصة)',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircleIcon,
  },
  PENDING_BRANCH_DELIVERY: {
    label: 'بانتظار تسليم الفرع',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: BuildingOffice2Icon,
  },
  BRANCH_DELIVERED: {
    label: 'تم تأكيد التسليم بالفرع',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: ShieldCheckIcon,
  },
};

const UNKNOWN_STATUS_META = {
  label: 'حالة غير معروفة',
  className: 'bg-slate-100 text-slate-700 border-slate-200',
  icon: ExclamationTriangleIcon,
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getStatusMeta(status?: string) {
  if (!status) return UNKNOWN_STATUS_META;
  return STATUS_META[status as DeclarationStatus] || UNKNOWN_STATUS_META;
}

function isAllowedFile(file: File) {
  if (file.type.startsWith('image/')) return true;
  if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|doc|docx)$/i.test(file.name);
}

function isImageAttachment(fileUrl?: string | null, mimeType?: string | null) {
  if (mimeType?.startsWith('image/')) return true;
  if (!fileUrl) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(fileUrl);
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

export default function MinistryExamDeclarationAdminPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.ministry-exam-declarations', action: 'view' }}>
      <MinistryExamDeclarationAdminContent />
    </ProtectedPage>
  );
}

function MinistryExamDeclarationAdminContent() {
  const { hasPermission } = usePermissions();
  const canReview = hasPermission('dashboard.ministry-exam-declarations', 'review');
  const canConfirmDelivery = hasPermission('dashboard.ministry-exam-declarations', 'confirm-delivery');

  const [items, setItems] = useState<MinistryDeclaration[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);

  const [reviewTarget, setReviewTarget] = useState<MinistryDeclaration | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'NEEDS_RESUBMISSION'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [branchTarget, setBranchTarget] = useState<MinistryDeclaration | null>(null);
  const [branchNotes, setBranchNotes] = useState('');
  const [saveScannedCopy, setSaveScannedCopy] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [confirmingBranch, setConfirmingBranch] = useState(false);

  const programOptions = useMemo(
    () => [
      { value: 'ALL', label: 'كل البرامج التدريبية' },
      ...programs.map((program) => ({ value: String(program.id), label: program.nameAr })),
    ],
    [programs],
  );

  const methodOptions = [
    { value: 'ALL', label: 'كل طرق التسليم' },
    { value: 'ONLINE', label: 'أونلاين' },
    { value: 'BRANCH', label: 'من خلال الفرع' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'كل الحالات' },
    { value: 'PENDING_REVIEW', label: 'قيد المراجعة' },
    { value: 'NEEDS_RESUBMISSION', label: 'مرفوض (مع سبب)' },
    { value: 'APPROVED', label: 'تمت الموافقة' },
    { value: 'PENDING_BRANCH_DELIVERY', label: 'بانتظار تسليم الفرع' },
    { value: 'BRANCH_DELIVERED', label: 'تم تأكيد التسليم بالفرع' },
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

  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (programFilter !== 'ALL') params.set('programId', programFilter);

      const query = params.toString();
      const data = await fetchAPI(`/ministry-exam-declarations/stats${query ? `?${query}` : ''}`);
      const payload = unwrapPayload<any>(data) || {};

      setStats({
        total: payload.total || 0,
        pendingReview: payload.pendingReview || 0,
        needsResubmission: payload.needsResubmission || 0,
        approved: payload.approved || 0,
        pendingBranchDelivery: payload.pendingBranchDelivery || 0,
        branchDelivered: payload.branchDelivered || 0,
        online: payload.online || 0,
        branch: payload.branch || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadItems = async (page = 1, limit = pagination.limit, nextSearch = searchQuery) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (methodFilter !== 'ALL') params.set('submissionMethod', methodFilter);
      if (programFilter !== 'ALL') params.set('programId', programFilter);

      const data = await fetchAPI(`/ministry-exam-declarations?${params.toString()}`);
      const { items: list, pagination: parsedPagination } = extractPaginatedResult<MinistryDeclaration>(data);

      setItems(list);

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
      console.error('Error loading declarations:', error);
      toast.error(error.message || 'تعذر تحميل الإقرارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadStats();
    loadItems(1, pagination.limit);
  }, [statusFilter, methodFilter, programFilter, searchQuery]);

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadItems(pagination.page, pagination.limit)]);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleReview = async () => {
    if (!reviewTarget) return;

    if (reviewStatus === 'NEEDS_RESUBMISSION' && !rejectionReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض ليظهر للمتدرب');
      return;
    }

    try {
      setReviewing(true);
      await fetchAPI(`/ministry-exam-declarations/${reviewTarget.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          status: reviewStatus,
          rejectionReason: reviewStatus === 'NEEDS_RESUBMISSION' ? rejectionReason : undefined,
        }),
      });

      toast.success(
        reviewStatus === 'APPROVED'
          ? 'تمت الموافقة على الإقرار'
          : 'تم رفض الإقرار مع إرسال السبب للمتدرب',
      );

      setReviewTarget(null);
      setReviewStatus('APPROVED');
      setRejectionReason('');
      await refreshAll();
    } catch (error: any) {
      toast.error(error.message || 'تعذر مراجعة الإقرار');
    } finally {
      setReviewing(false);
    }
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

  const handleConfirmBranchDelivery = async () => {
    if (!branchTarget) return;

    if (saveScannedCopy && !scannedFile) {
      toast.error('يرجى رفع الصورة الضوئية أو اختيار عدم الحفظ');
      return;
    }

    try {
      setConfirmingBranch(true);

      let payload: any = {
        branchDeliveryNotes: branchNotes || undefined,
        saveScannedCopy,
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

      await fetchAPI(`/ministry-exam-declarations/${branchTarget.id}/confirm-branch-delivery`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      toast.success('تم تأكيد استلام الإقرار في الفرع');
      setBranchTarget(null);
      setBranchNotes('');
      setSaveScannedCopy(false);
      setScannedFile(null);
      await refreshAll();
    } catch (error: any) {
      toast.error(error.message || 'تعذر تأكيد تسليم الفرع');
    } finally {
      setConfirmingBranch(false);
    }
  };

  const statusBadge = (status: string) => {
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
      return <span className="inline-flex px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-100 text-slate-700 border-slate-200">غير محدد</span>;
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
      accessor: (item: MinistryDeclaration) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3 min-w-0">
            {item.trainee.photoUrl ? (
              <img
                src={item.trainee.photoUrl}
                alt={item.trainee.nameAr}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-slate-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{item.trainee.nameAr}</p>
              <p className="text-xs text-slate-500 truncate">{item.trainee.nationalId}</p>
              <p className="text-xs text-slate-400 truncate" dir="ltr">{item.trainee.phone || 'بدون هاتف'}</p>
            </div>
          </div>

          <div className="md:hidden">
            {statusBadge(item.status)}
          </div>
        </div>
      ),
      className: 'min-w-[240px]',
    },
    {
      header: 'البرنامج التدريبي',
      accessor: (item: MinistryDeclaration) => item.trainee.program?.nameAr || 'غير محدد',
      className: 'hidden lg:table-cell',
    },
    {
      header: 'طريقة التسليم',
      accessor: (item: MinistryDeclaration) => methodBadge(item.submissionMethod),
      className: 'hidden sm:table-cell',
    },
    {
      header: 'الحالة',
      accessor: (item: MinistryDeclaration) => statusBadge(item.status),
      className: 'hidden xl:table-cell',
    },
    {
      header: 'آخر تحديث',
      accessor: (item: MinistryDeclaration) => (
        <span className="text-xs font-medium text-slate-700">{new Date(item.updatedAt).toLocaleString('ar-EG')}</span>
      ),
      className: 'hidden xl:table-cell',
    },
    {
      header: 'الإجراءات',
      accessor: (item: MinistryDeclaration) => (
        <div className="flex flex-wrap items-center gap-2">
          {item.declarationFileUrl && (
            <a
              href={item.declarationFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              الملف
            </a>
          )}

          {item.submissionMethod === 'ONLINE' &&
            (item.status === 'PENDING_REVIEW' || item.status === 'NEEDS_RESUBMISSION') && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (!canReview) {
                    toast.error('ليس لديك صلاحية مراجعة الإقرارات');
                    return;
                  }
                  setReviewTarget(item);
                  setReviewStatus('APPROVED');
                  setRejectionReason('');
                }}
              >
                مراجعة
              </Button>
            )}

          {item.submissionMethod === 'BRANCH' && item.status === 'PENDING_BRANCH_DELIVERY' && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                if (!canConfirmDelivery) {
                  toast.error('ليس لديك صلاحية تأكيد تسليم الفرع');
                  return;
                }
                setBranchTarget(item);
                setBranchNotes('');
                setSaveScannedCopy(false);
                setScannedFile(null);
              }}
            >
              تأكيد الاستلام
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة إقرارات اختبار وزارة العمل"
        description="مراجعة التسليم الأونلاين، رفض مع سبب، وتأكيد الاستلام من الفرع"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'طلبات المتدربين', href: '/dashboard/requests' },
          { label: 'مراجعة إقرارات اختبار وزارة العمل', href: '/dashboard/requests/ministry-exam-declarations-review' },
          { label: 'إقرار اختبار وزارة العمل' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            تحديث
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <StatCard label="الإجمالي" value={stats.total} />
        <StatCard label="قيد المراجعة" value={stats.pendingReview} />
        <StatCard label="مرفوض" value={stats.needsResubmission} />
        <StatCard label="تمت الموافقة" value={stats.approved} />
        <StatCard label="بانتظار الفرع" value={stats.pendingBranchDelivery} />
        <StatCard label="تم تسليم الفرع" value={stats.branchDelivered} />
        <StatCard label="تسليم أونلاين" value={stats.online} />
        <StatCard label="تسليم فرع" value={stats.branch} />
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
              instanceId="ministry-program-filter"
            />
            <SimpleSelect
              options={methodOptions}
              value={methodFilter}
              onChange={setMethodFilter}
              instanceId="ministry-method-filter"
            />
            <SimpleSelect
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              instanceId="ministry-status-filter"
            />
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          data={items}
          columns={columns as any}
          keyField="id"
          isLoading={loading}
          emptyMessage="لا توجد إقرارات مطابقة"
        />

        {!loading && pagination.total > 0 && (
          <div className="mt-5">
            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => loadItems(nextPage, pagination.limit)}
              onLimitChange={(nextLimit) => loadItems(1, nextLimit)}
              isLoading={loading}
            />
          </div>
        )}
      </Card>

      {reviewTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setReviewTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">مراجعة الإقرار الأونلاين</h3>
              <p className="text-xs text-slate-500 mt-1">{reviewTarget.trainee.nameAr}</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReviewStatus('APPROVED')}
                  className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                    reviewStatus === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  تمت الموافقة
                </button>
                <button
                  onClick={() => setReviewStatus('NEEDS_RESUBMISSION')}
                  className={`px-3 py-2.5 rounded-xl text-sm font-bold border ${
                    reviewStatus === 'NEEDS_RESUBMISSION'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  رفض مع طلب إعادة رفع
                </button>
              </div>

              <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">المرفق المقدم من المتدرب</p>

                {reviewTarget.declarationFileUrl ? (
                  isImageAttachment(reviewTarget.declarationFileUrl, reviewTarget.declarationFileMimeType) ? (
                    <div className="space-y-2">
                      <img
                        src={reviewTarget.declarationFileUrl}
                        alt={reviewTarget.declarationFileName || 'صورة الإقرار'}
                        className="w-full max-h-72 object-contain rounded-lg border border-slate-200 bg-white"
                      />
                      <a
                        href={reviewTarget.declarationFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-white"
                      >
                        <EyeIcon className="w-4 h-4" />
                        فتح الصورة بحجم كامل
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {reviewTarget.declarationFileName || 'ملف مرفق'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {reviewTarget.declarationFileMimeType || 'PDF / Word'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <a
                          href={reviewTarget.declarationFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <EyeIcon className="w-4 h-4" />
                          عرض الملف
                        </a>
                        <a
                          href={reviewTarget.declarationFileUrl}
                          download={reviewTarget.declarationFileName || undefined}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          تحميل الملف
                        </a>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500">لا يوجد مرفق مع هذا الإقرار.</p>
                )}
              </div>

              {reviewStatus === 'NEEDS_RESUBMISSION' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">سبب الرفض (سيظهر للمتدرب)</label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                    placeholder="اكتب سبب الرفض أو الملاحظات المطلوبة من المتدرب..."
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReviewTarget(null)}>إلغاء</Button>
                <Button onClick={handleReview} isLoading={reviewing}>حفظ المراجعة</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {branchTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setBranchTarget(null);
            setSaveScannedCopy(false);
            setScannedFile(null);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">تأكيد استلام إقرار الفرع</h3>
              <p className="text-xs text-slate-500 mt-1">{branchTarget.trainee.nameAr}</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات إدارية (اختياري)</label>
                <textarea
                  rows={4}
                  value={branchNotes}
                  onChange={(e) => setBranchNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  placeholder="اكتب أي ملاحظات تتعلق بعملية الاستلام..."
                />
              </div>

              <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">هل تريد حفظ صورة ضوئية من الإقرار؟</p>
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
                  >
                    نعم، حفظ صورة ضوئية
                  </button>
                </div>

                {saveScannedCopy && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">ارفع الصورة الضوئية</label>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleScannedFileChange}
                      disabled={confirmingBranch}
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBranchTarget(null);
                    setSaveScannedCopy(false);
                    setScannedFile(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleConfirmBranchDelivery}
                  isLoading={confirmingBranch}
                >
                  تأكيد التسليم
                </Button>
              </div>
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
