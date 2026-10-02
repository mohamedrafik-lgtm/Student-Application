'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

type ReportType = 'REGISTERED' | 'UNREGISTERED' | 'PENDING_REVIEW' | 'ALL';

type SubmissionMethod = 'ONLINE' | 'BRANCH';

interface ReviewDeclaration {
  status?: string;
  submissionMethod?: SubmissionMethod;
  updatedAt?: string;
}

interface ReviewRow {
  trainee: {
    id: number;
    nameAr: string;
    nationalId?: string;
    phone?: string;
    program?: { nameAr?: string };
  };
  declaration: ReviewDeclaration | null;
  deliveryStatus: string;
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  NOT_DELIVERED: 'لم يتم التسليم',
  PENDING_REVIEW: 'قيد المراجعة',
  REJECTED: 'مرفوض',
  APPROVED_PLATFORM: 'موافق عليه من المنصة',
  APPROVED_BRANCH: 'موافق عليه من الفرع',
  DELIVERED: 'تم التسليم',
};

function unwrapPayload<T = any>(data: any): T {
  return ((data as any)?.data ?? data) as T;
}

function extractRows(response: any): ReviewRow[] {
  const raw = response as any;
  const payload = unwrapPayload<any>(response);

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function hasDeclaration(row: ReviewRow): boolean {
  return Boolean(row.declaration);
}

function isPendingReviewByDefinition(row: ReviewRow): boolean {
  return row.deliveryStatus === 'PENDING_REVIEW' || row.declaration?.status === 'PENDING_REVIEW';
}

function isRegisteredByDefinition(row: ReviewRow): boolean {
  return hasDeclaration(row) && !isPendingReviewByDefinition(row);
}

function getReportTitle(reportType: ReportType): string {
  if (reportType === 'REGISTERED') return 'تقرير المسجلين';
  if (reportType === 'UNREGISTERED') return 'تقرير غير المسجلين';
  if (reportType === 'PENDING_REVIEW') return 'تقرير قيد المراجعة';
  return 'تقرير شامل بالكل';
}

function normalizeReportType(rawType: string | null): ReportType {
  if (
    rawType === 'REGISTERED' ||
    rawType === 'UNREGISTERED' ||
    rawType === 'PENDING_REVIEW' ||
    rawType === 'ALL'
  ) {
    return rawType;
  }

  // توافق رجعي مع الروابط القديمة
  if (rawType === 'DELIVERED') return 'REGISTERED';
  if (rawType === 'NOT_DELIVERED') return 'UNREGISTERED';

  return 'ALL';
}

function formatMethod(row: ReviewRow): string {
  const method = row.declaration?.submissionMethod;

  if (method === 'ONLINE') return 'أونلاين';
  if (method === 'BRANCH') return 'من خلال الفرع';
  if (row.declaration) return 'وسيلة أخرى';
  return 'غير مسجل';
}

function formatStatus(deliveryStatus?: string): string {
  if (!deliveryStatus) return '-';
  return DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus;
}

export default function PrintMinistryExamDeclarationsReportPage() {
  const searchParams = useSearchParams();

  const reportType = normalizeReportType(searchParams.get('type'));
  const includePhone = searchParams.get('includePhone') !== '0';
  const programId = searchParams.get('programId') || '';
  const programName = searchParams.get('programName') || 'كل البرامج التدريبية';

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          page: '1',
          limit: '100000',
        });

        if (programId) {
          params.set('programId', programId);
        }

        const data = await fetchAPI(`/ministry-exam-declarations/review/trainees?${params.toString()}`);
        const allRows = extractRows(data);

        const filteredRows = allRows.filter((row) => {
          if (reportType === 'ALL') return true;
          if (reportType === 'REGISTERED') return isRegisteredByDefinition(row);
          if (reportType === 'UNREGISTERED') return !hasDeclaration(row);
          return isPendingReviewByDefinition(row);
        });

        filteredRows.sort((a, b) => a.trainee.nameAr.localeCompare(b.trainee.nameAr, 'ar'));

        setRows(filteredRows);
        setGeneratedAt(new Date());
      } catch (err: any) {
        console.error('Error loading ministry declaration report:', err);
        setError(err?.message || 'تعذر تحميل التقرير');
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, [reportType, programId]);

  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [loading, error, rows.length]);

  const summary = useMemo(() => {
    const registeredCount = rows.filter((row) => isRegisteredByDefinition(row)).length;
    const unregisteredCount = rows.filter((row) => !hasDeclaration(row)).length;
    const pendingReviewCount = rows.filter((row) => isPendingReviewByDefinition(row)).length;
    const submittedOnlineCount = rows.filter(
      (row) => row.declaration?.submissionMethod === 'ONLINE',
    ).length;
    const submittedBranchCount = rows.filter(
      (row) => row.declaration?.submissionMethod === 'BRANCH',
    ).length;
    const submittedOtherCount = rows.filter(
      (row) => row.declaration && row.declaration.submissionMethod !== 'ONLINE' && row.declaration.submissionMethod !== 'BRANCH',
    ).length;

    return {
      total: rows.length,
      registeredCount,
      unregisteredCount,
      pendingReviewCount,
      submittedOnlineCount,
      submittedBranchCount,
      submittedOtherCount,
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">جاري تجهيز تقرير الطباعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <p className="text-rose-700 font-bold mb-2">تعذر إنشاء التقرير</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-cairo" dir="rtl">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 8mm; }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-wrap {
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
          >
            طباعة الآن
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>

      <div className="print-wrap max-w-[210mm] mx-auto p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="h-2 bg-gradient-to-l from-sky-600 via-cyan-600 to-emerald-600"></div>

          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <h1 className="text-2xl font-black text-slate-900">إقرار اختبار وزارة العمل</h1>
            <p className="text-sm text-slate-600 mt-1">{getReportTitle(reportType)}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs">
              <p className="text-slate-600">تاريخ الإصدار: <span className="font-bold text-slate-900">{generatedAt.toLocaleString('ar-EG')}</span></p>
              <p className="text-slate-600">البرنامج التدريبي: <span className="font-bold text-slate-900">{programName}</span></p>
              <p className="text-slate-600">إظهار رقم الهاتف: <span className="font-bold text-slate-900">{includePhone ? 'نعم' : 'لا'}</span></p>
              <p className="text-slate-600">إجمالي السجلات: <span className="font-bold text-slate-900">{summary.total}</span></p>
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-slate-200 bg-white">
            <SummaryCard label="الإجمالي" value={summary.total} />
            <SummaryCard label="المسجلين" value={summary.registeredCount} />
            <SummaryCard label="غير المسجلين" value={summary.unregisteredCount} />
            <SummaryCard label="قيد المراجعة" value={summary.pendingReviewCount} />
            <SummaryCard label="تسجيل أونلاين" value={summary.submittedOnlineCount} />
            <SummaryCard label="تسجيل فرع" value={summary.submittedBranchCount} />
          </div>

          {summary.submittedOtherCount > 0 && (
            <div className="px-6 pt-3 text-xs text-slate-600">
              تسجيل بوسائل أخرى: <span className="font-bold text-slate-900">{summary.submittedOtherCount}</span>
            </div>
          )}

          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">#</th>
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">اسم المتدرب</th>
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">الرقم القومي</th>
                    {includePhone && (
                      <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">رقم الهاتف</th>
                    )}
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">البرنامج</th>
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">طريقة التسليم</th>
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">الحالة</th>
                    <th className="border border-slate-300 px-2 py-2 font-black text-slate-800">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, index) => (
                      <tr key={`${row.trainee.id}-${index}`} className={index % 2 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 px-2 py-2 text-center font-bold">{index + 1}</td>
                        <td className="border border-slate-300 px-2 py-2 font-bold text-slate-900">{row.trainee.nameAr}</td>
                        <td className="border border-slate-300 px-2 py-2 text-center" dir="ltr">{row.trainee.nationalId || '-'}</td>
                        {includePhone && (
                          <td className="border border-slate-300 px-2 py-2 text-center" dir="ltr">{row.trainee.phone || '-'}</td>
                        )}
                        <td className="border border-slate-300 px-2 py-2">{row.trainee.program?.nameAr || 'غير محدد'}</td>
                        <td className="border border-slate-300 px-2 py-2 text-center">{formatMethod(row)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-bold">{formatStatus(row.deliveryStatus)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-center">
                          {row.declaration?.updatedAt
                            ? new Date(row.declaration.updatedAt).toLocaleString('ar-EG')
                            : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={includePhone ? 8 : 7}
                        className="border border-slate-300 px-4 py-6 text-center text-slate-500"
                      >
                        لا توجد بيانات مطابقة لإعدادات التقرير الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
    </div>
  );
}
