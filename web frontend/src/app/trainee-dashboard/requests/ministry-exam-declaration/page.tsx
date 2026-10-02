'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI, uploadFile } from '@/lib/api';

type DeclarationStatus =
  | 'PENDING_REVIEW'
  | 'NEEDS_RESUBMISSION'
  | 'APPROVED'
  | 'PENDING_BRANCH_DELIVERY'
  | 'BRANCH_DELIVERED';

interface MinistryDeclaration {
  id: string;
  submissionMethod: 'ONLINE' | 'BRANCH';
  status: DeclarationStatus | string;
  declarationFileUrl?: string | null;
  declarationFileName?: string | null;
  declarationFileMimeType?: string | null;
  submissionNotes?: string | null;
  rejectionReason?: string | null;
  submissionCount?: number;
  reviewedAt?: string | null;
  branchReceivedAt?: string | null;
  isLockedForTrainee?: boolean;
  canSubmitOnline?: boolean;
  canSubmitBranch?: boolean;
  finalizationMessage?: string | null;
  updatedAt: string;
  createdAt: string;
}

interface MinistrySubmissionPolicy {
  programId: number;
  programName: string;
  isConfigured: boolean;
  isRequestsOpen: boolean;
  submissionDeadline?: string | null;
  isDeadlinePassed: boolean;
  fee?: {
    id: number;
    name: string;
    amount: number;
  } | null;
  payment?: {
    requiredAmount: number;
    paidAmount: number;
    isFullyPaid: boolean;
  };
  isBlocked: boolean;
  blockReasonCode?: 'NOT_OPEN' | 'DEADLINE_UNPAID' | null;
  blockReason?: string | null;
}

const STATUS_META: Record<DeclarationStatus, { label: string; className: string; icon: React.ComponentType<any> }> = {
  PENDING_REVIEW: {
    label: 'قيد المراجعة',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ClockIcon,
  },
  NEEDS_RESUBMISSION: {
    label: 'مطلوب إعادة الرفع',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: ExclamationTriangleIcon,
  },
  APPROVED: {
    label: 'تم اعتماد الإقرار',
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

function getStatusMeta(status?: string) {
  if (!status) return UNKNOWN_STATUS_META;
  return STATUS_META[status as DeclarationStatus] || UNKNOWN_STATUS_META;
}

function sanitizeFinalMessage(message?: string | null) {
  if (!message) return null;

  if (message.includes('تم استلام الإقرار مسبقاً') || message.includes('تم اعتماد')) {
    return 'تم اعتماد/استلام الإقرار مسبقًا ولا يمكن تعديله.';
  }

  return message;
}

function sanitizeErrorMessage(message?: string) {
  if (!message) return '';

  if (message.includes('تم استلام الإقرار مسبقاً') || message.includes('تم اعتماد')) {
    return 'تم اعتماد/استلام الإقرار مسبقًا ولا يمكن تعديله.';
  }

  return message;
}

function formatMoney(value?: number) {
  return Number(value || 0).toLocaleString('ar-EG');
}

function hasUnpaidRequiredFee(policy?: MinistrySubmissionPolicy | null) {
  if (!policy?.isConfigured || !policy?.fee) return false;
  if (policy.isRequestsOpen !== true) return false;
  return policy.payment?.isFullyPaid === false;
}

function getPolicyClientBlockReason(policy?: MinistrySubmissionPolicy | null) {
  if (!policy) return null;

  if (hasUnpaidRequiredFee(policy)) {
    const feeName = policy.fee?.name || 'رسم اختبار وزارة العمل';
    const feeAmount = policy.fee?.amount ?? policy.payment?.requiredAmount;
    const feeLabel = feeAmount
      ? `${feeName} (${formatMoney(feeAmount)} ج.م)`
      : feeName;

    return `الطلبات مفتوحة، لكن يجب سداد الرسم المطلوب بالكامل قبل فتح رابط الإقرار أو تقديم الطلب. الرسم المطلوب: ${feeLabel}.`;
  }

  return policy.blockReason || null;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function isAllowedFile(file: File) {
  if (file.type.startsWith('image/')) return true;
  if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|doc|docx)$/i.test(file.name);
}

export default function MinistryExamDeclarationPage() {
  const [loading, setLoading] = useState(true);
  const [declaration, setDeclaration] = useState<MinistryDeclaration | null>(null);
  const [publicPrintLink, setPublicPrintLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submittingOnline, setSubmittingOnline] = useState(false);
  const [submittingBranch, setSubmittingBranch] = useState(false);
  const [showShareHintModal, setShowShareHintModal] = useState(false);
  const [submissionPolicy, setSubmissionPolicy] = useState<MinistrySubmissionPolicy | null>(null);
  const [publicLinkError, setPublicLinkError] = useState('');

  const normalizedStatus = String(declaration?.status || '').toUpperCase();
  const isFinalStatus = declaration
    ? declaration.isLockedForTrainee ??
      (normalizedStatus === 'APPROVED' || normalizedStatus === 'BRANCH_DELIVERED')
    : false;

  const blockedByPolicy = submissionPolicy?.isBlocked === true;
  const blockedByUnpaidFee = hasUnpaidRequiredFee(submissionPolicy);
  const isSubmissionBlocked = blockedByPolicy || blockedByUnpaidFee;
  const submissionBlockedMessage =
    getPolicyClientBlockReason(submissionPolicy) ||
    'لا يمكن تقديم الإقرار في الوقت الحالي.';
  const blockedPrintButtonLabel = blockedByUnpaidFee
    ? 'يجب سداد الرسم أولاً'
    : 'الطباعة غير متاحة حالياً';

  const canSubmitOnline = declaration
    ? declaration.canSubmitOnline ?? (!isFinalStatus && normalizedStatus !== 'PENDING_REVIEW' && !isSubmissionBlocked)
    : !isSubmissionBlocked;

  const onlineBlockedMessage = isSubmissionBlocked
    ? submissionBlockedMessage
    : normalizedStatus === 'PENDING_REVIEW'
      ? 'لا يمكن رفع الإقرار مرة أخرى طالما أن الطلب الحالي قيد المراجعة ولم يتم رفضه بعد.'
      : 'تم اعتماد الإقرار بالفعل أو استلامه من الفرع، ولا يمكن إعادة الرفع.';

  const canSubmitBranch = declaration
    ? declaration.canSubmitBranch ??
      (!isFinalStatus && normalizedStatus !== 'PENDING_BRANCH_DELIVERY' && !isSubmissionBlocked)
    : !isSubmissionBlocked;

  const loadMyDeclaration = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/ministry-exam-declarations/my-request');
      const payload = (data as any)?.data ?? data;

      if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'id' in payload) {
        const normalizedPayload: MinistryDeclaration = {
          ...(payload as MinistryDeclaration),
          finalizationMessage: sanitizeFinalMessage((payload as MinistryDeclaration).finalizationMessage),
        };

        const embeddedPolicy = (payload as any)?.submissionPolicy;
        if (embeddedPolicy && typeof embeddedPolicy === 'object') {
          setSubmissionPolicy(embeddedPolicy as MinistrySubmissionPolicy);
        }

        // Defensive cleanup to avoid exposing staff names if an old API payload still includes them.
        delete (normalizedPayload as any).reviewer;
        delete (normalizedPayload as any).branchReceiver;

        setDeclaration(normalizedPayload);
        if (normalizedPayload.submissionNotes) {
          setSubmissionNotes(normalizedPayload.submissionNotes || '');
        }
      } else {
        setDeclaration(null);
      }
    } catch (error) {
      console.error('Error loading declaration:', error);
      toast.error('تعذر تحميل حالة الإقرار');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionPolicy = async (): Promise<MinistrySubmissionPolicy | null> => {
    try {
      const data = await fetchAPI('/ministry-exam-declarations/my/submission-policy');
      const payload = (data as any)?.data ?? data;
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const policy = payload as MinistrySubmissionPolicy;
        setSubmissionPolicy(policy);
        return policy;
      }
      setSubmissionPolicy(null);
      return null;
    } catch (error) {
      console.error('Error loading submission policy:', error);
      setSubmissionPolicy(null);
      return null;
    }
  };

  const loadPublicPrintLink = async (policy?: MinistrySubmissionPolicy | null) => {
    const effectivePolicy = policy ?? submissionPolicy;
    const clientBlockReason = getPolicyClientBlockReason(effectivePolicy);

    if (effectivePolicy?.isBlocked || hasUnpaidRequiredFee(effectivePolicy)) {
      setPublicPrintLink('');
      setPublicLinkError(
        clientBlockReason || 'لا يمكن فتح رابط الطباعة في الوقت الحالي.',
      );
      return;
    }

    try {
      const data = await fetchAPI('/ministry-exam-declarations/my/public-link');
      const payload = (data as any)?.data ?? data;
      const path = typeof payload?.path === 'string' ? payload.path : '';
      const normalizedPath = path
        ? path.startsWith('/')
          ? path
          : `/${path}`
        : '';
      const link = normalizedPath
        ? `${window.location.origin}${normalizedPath}`
        : payload?.url || '';
      setPublicPrintLink(link || '');
      setPublicLinkError('');
    } catch (error) {
      console.error('Error loading public print link:', error);
      setPublicPrintLink('');
      setPublicLinkError(
        sanitizeErrorMessage((error as any)?.message) ||
          'تعذر إنشاء رابط الطباعة في الوقت الحالي.',
      );
    }
  };

  useEffect(() => {
    const loadPageData = async () => {
      const policy = await loadSubmissionPolicy();
      await Promise.all([loadMyDeclaration(), loadPublicPrintLink(policy)]);
    };

    loadPageData();
  }, []);

  const handleOpenDeclarationLink = () => {
    if (isSubmissionBlocked) {
      toast.error(submissionBlockedMessage);
      return;
    }

    if (!publicPrintLink) {
      if (publicLinkError) {
        toast.error(publicLinkError);
      }
      return;
    }
    setShowShareHintModal(true);
  };

  const handleOpenPrintLinkDirectly = () => {
    if (!publicPrintLink) return;
    window.open(publicPrintLink, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPrintLink = async () => {
    if (!publicPrintLink) return;
    try {
      await navigator.clipboard.writeText(publicPrintLink);
      toast.success('تم نسخ الرابط بنجاح');
    } catch (error) {
      console.error('Copy print link error:', error);
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleShareOnWhatsApp = () => {
    if (!publicPrintLink) return;
    const text = `رابط نموذج إقرار اختبار وزارة العمل:\n${publicPrintLink}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setSelectedFile(file);
  };

  const handleSubmitBranch = async () => {
    if (!canSubmitBranch) {
      toast.error(
        isSubmissionBlocked
          ? submissionBlockedMessage
          : 'لا يمكن تقديم طلب جديد بعد اعتماد الإقرار أو استلامه من الفرع',
      );
      return;
    }

    try {
      setSubmittingBranch(true);
      await fetchAPI('/ministry-exam-declarations/my/branch', {
        method: 'POST',
        body: JSON.stringify({ submissionNotes: submissionNotes || undefined }),
      });
      toast.success('تم تسجيل اختيار التسليم من الفرع بنجاح');
      await loadMyDeclaration();
    } catch (error: any) {
      toast.error(sanitizeErrorMessage(error.message) || 'تعذر حفظ طلب التسليم من الفرع');
    } finally {
      setSubmittingBranch(false);
    }
  };

  const handleSubmitOnline = async () => {
    if (!canSubmitOnline) {
      toast.error(onlineBlockedMessage);
      return;
    }

    if (!selectedFile) {
      toast.error('يرجى اختيار ملف الإقرار أولاً');
      return;
    }

    try {
      setSubmittingOnline(true);

      const uploadResult = await uploadFile(selectedFile, 'ministry-declarations');

      await fetchAPI('/ministry-exam-declarations/my/online', {
        method: 'POST',
        body: JSON.stringify({
          declarationFileUrl: uploadResult.url,
          declarationFileCloudinaryId: uploadResult.public_id || undefined,
          declarationFileName: uploadResult.originalname || selectedFile.name,
          declarationFileMimeType: uploadResult.mimetype || selectedFile.type,
          submissionNotes: submissionNotes || undefined,
        }),
      });

      setSelectedFile(null);
      toast.success('تم رفع الإقرار بنجاح وهو الآن قيد المراجعة');
      await loadMyDeclaration();
    } catch (error: any) {
      toast.error(sanitizeErrorMessage(error.message) || 'تعذر رفع الإقرار');
    } finally {
      setSubmittingOnline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل بيانات الإقرار...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <Link
          href="/trainee-dashboard/requests"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-5"
        >
          <ArrowRightIcon className="w-4 h-4" />
          العودة إلى صفحة الطلبات
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center">
              <DocumentTextIcon className="w-7 h-7 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">إقرار دخول اختبار وزارة العمل</h1>
              <p className="text-sm text-slate-500 mt-1">
                هذا الإقرار خاص بالمتدرب: افتح النموذج واطبعه ثم وقّع في خانة اسم المتدرب وتوقيع المتدرب، ثم اختر طريقة التسليم المناسبة.
              </p>
            </div>
          </div>

          {publicPrintLink ? (
            <button
              type="button"
              onClick={handleOpenDeclarationLink}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              فتح نموذج الإقرار
            </button>
          ) : publicLinkError ? (
            <button
              type="button"
              onClick={handleOpenDeclarationLink}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 text-sm font-bold"
            >
              <ExclamationTriangleIcon className="w-5 h-5" />
              {blockedPrintButtonLabel}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-300 text-white text-sm font-bold cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              جاري تجهيز الرابط المميز...
            </button>
          )}
        </div>

        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 leading-7">
          <p className="font-bold mb-1">تعليمات مهمة قبل التسليم</p>
          <p>
            هذا النموذج مخصص لك كمتدرب. يرجى طباعته من أي مكتبة، ثم التوقيع في خانة اسم المتدرب
            وتوقيع المتدرب، وبعدها يمكنك تسليمه عبر الفرع أو رفعه أونلاين.
          </p>
        </div>

        {submissionPolicy && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm leading-7 ${
              isSubmissionBlocked
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}
          >
            <p className="font-bold mb-1">حالة طلبات إقرار وزارة العمل لبرنامجك</p>
            <p className="mb-1">
              البرنامج: <span className="font-bold">{submissionPolicy.programName || '-'}</span>
            </p>
            <p className="mb-1">
              الرسم المطلوب:{' '}
              <span className="font-bold">
                {submissionPolicy.fee?.name || 'غير محدد'}
                {submissionPolicy.fee ? ` (${formatMoney(submissionPolicy.fee.amount)} ج.م)` : ''}
              </span>
            </p>
            <p className="mb-1">
              آخر موعد للتقديم:{' '}
              <span className="font-bold">
                {submissionPolicy.submissionDeadline
                  ? new Date(submissionPolicy.submissionDeadline).toLocaleDateString('ar-EG')
                  : 'غير محدد'}
              </span>
            </p>
            <p className="mb-1">
              حالة السداد:{' '}
              <span className="font-bold">
                {submissionPolicy.payment?.isFullyPaid
                  ? 'مسدد بالكامل'
                  : `غير مسدد بالكامل (${formatMoney(submissionPolicy.payment?.paidAmount)} / ${formatMoney(submissionPolicy.payment?.requiredAmount)} ج.م)`}
              </span>
            </p>
            <p className="font-bold mt-2">
              {isSubmissionBlocked
                ? submissionBlockedMessage
                : submissionPolicy.isRequestsOpen
                  ? 'استقبال الطلبات مفتوح لهذا البرنامج.'
                  : 'استقبال الطلبات مغلق لهذا البرنامج.'}
            </p>
          </div>
        )}
      </div>

      {declaration && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">الحالة الحالية</h2>
            {(() => {
              const meta = getStatusMeta(declaration.status);
              const StatusIcon = meta.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${meta.className}`}>
                  <StatusIcon className="w-4 h-4" />
                  {meta.label}
                </span>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-slate-500 mb-1">طريقة التسليم</p>
              <p className="font-bold text-slate-800">
                {declaration.submissionMethod === 'ONLINE' ? 'أونلاين' : 'من خلال الفرع'}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-slate-500 mb-1">آخر تحديث</p>
              <p className="font-bold text-slate-800">
                {new Date(declaration.updatedAt).toLocaleString('ar-EG')}
              </p>
            </div>
          </div>

          {isFinalStatus && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sm text-sky-800">
              تم اعتماد/استلام الإقرار مسبقًا ولا يمكن تعديله.
            </div>
          )}

          {declaration.declarationFileUrl && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm">
              <p className="text-slate-500 mb-1">الملف المرفوع</p>
              <a
                href={declaration.declarationFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:text-emerald-800 underline"
              >
                عرض الملف المرفوع
              </a>
            </div>
          )}

          {declaration.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm">
              <p className="font-bold text-rose-800 mb-1">سبب طلب إعادة الرفع</p>
              <p className="text-rose-700 leading-relaxed">{declaration.rejectionReason}</p>
            </div>
          )}

          {declaration.branchReceivedAt && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm">
              <p className="font-bold text-teal-800 mb-1">تم تأكيد الاستلام بالفرع</p>
              <p className="text-teal-700">
                {new Date(declaration.branchReceivedAt).toLocaleString('ar-EG')}
              </p>
            </div>
          )}
        </div>
      )}

      {isFinalStatus ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
          تم اعتماد الإقرار أو تأكيد استلامه من الفرع، لذلك لا يمكن تقديم طلب جديد للفرع أو رفع ملف أونلاين مرة أخرى.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <BuildingOffice2Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">التسليم من خلال الفرع</h3>
                  <p className="text-xs text-slate-500">لمن سيقوم بتسليم الورقة يدويًا داخل الفرع</p>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800 leading-6">
                <p className="font-bold mb-1">خطوات التسليم عبر الفرع:</p>
                <p>
                  1) طباعة نموذج الإقرار من أي مكتبة.
                  <br />
                  2) التوقيع في خانة اسم المتدرب وتوقيع المتدرب.
                  <br />
                  3) التوجه إلى الفرع وتسليم النموذج يدويًا.
                </p>
              </div>

              <button
                onClick={handleSubmitBranch}
                disabled={!canSubmitBranch || submittingBranch}
                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingBranch ? 'جاري الحفظ...' : 'تسجيل تسليم من الفرع'}
              </button>

              {!canSubmitBranch && (
                <p className="text-xs text-slate-500">
                  {isSubmissionBlocked
                    ? submissionBlockedMessage
                    : 'لا يمكن تعديل اختيار الفرع في الحالة الحالية.'}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <CloudArrowUpIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">التسليم أونلاين</h3>
                  <p className="text-xs text-slate-500">لمن سيقوم برفع النموذج عبر المنصة</p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800 leading-6">
                <p className="font-bold mb-1">خطوات التسليم أونلاين:</p>
                <p>
                  1) طباعة نموذج الإقرار من أي مكتبة.
                  <br />
                  2) التوقيع في خانة اسم المتدرب وتوقيع المتدرب.
                  <br />
                  3) تصوير الورقة بصورة واضحة بهاتفك.
                  <br />
                  4) رفع الصورة/الملف من خلال المنصة.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">اختر ملف الإقرار</label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  disabled={!canSubmitOnline || submittingOnline}
                  className="block w-full text-sm text-slate-700 file:ml-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold hover:file:bg-emerald-100 disabled:opacity-60"
                />
                {selectedFile && (
                  <p className="text-xs text-emerald-700 font-medium">تم اختيار: {selectedFile.name}</p>
                )}
              </div>

              <button
                onClick={handleSubmitOnline}
                disabled={!canSubmitOnline || submittingOnline || !selectedFile}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingOnline ? 'جاري الرفع...' : 'رفع الإقرار أونلاين'}
              </button>

              {!canSubmitOnline && (
                <p className="text-xs text-slate-500">{onlineBlockedMessage}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <label className="block text-sm font-bold text-slate-700">ملاحظات إضافية (اختياري)</label>
            <textarea
              rows={3}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="أي ملاحظات تريد إضافتها للإدارة..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
            />
            <p className="text-xs text-slate-500">
              الأنواع المسموحة للتسليم الأونلاين: جميع الصور + PDF + Word (DOC/DOCX).
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            في حال رفع ملف غير صالح، ستقوم الإدارة بإرسال سبب الرفض ليظهر لك هنا لتتمكن من إعادة الرفع مرة أخرى.
          </div>
        </>
      )}

      {showShareHintModal && publicPrintLink && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShareHintModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">تنبيه بخصوص رابط نموذج الإقرار</h3>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800 leading-7">
                يرجى العلم أن هذا الرابط قابل للمشاركة. إذا كنت تريد طباعة النموذج من إحدى المكتبات يمكنك
                إرساله للطباعة مباشرة دون مشاركة بيانات حسابك الشخصي على المنصة.
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 break-all" dir="ltr">
                {publicPrintLink}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPrintLinkDirectly}
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                >
                  فتح الرابط
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrintLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  نسخ الرابط
                </button>
                <button
                  type="button"
                  onClick={handleShareOnWhatsApp}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold"
                >
                  <ShareIcon className="w-4 h-4" />
                  مشاركة واتساب
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareHintModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
