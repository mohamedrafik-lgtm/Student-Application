'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { API_BASE_URL, getImageUrl } from '@/lib/api';

interface PublicTraineeData {
  id: number;
  nameAr: string;
  nationalId: string;
  phone?: string | null;
  photoUrl?: string | null;
  createdAt?: string;
  program?: {
    nameAr?: string | null;
  } | null;
}

interface PublicSettings {
  centerName?: string | null;
  licenseNumber?: string | null;
  centerLogo?: string | null;
}

interface PublicDeclarationResponse {
  trainee: PublicTraineeData;
  declaration?: {
    status?: string;
    submissionMethod?: string;
    updatedAt?: string;
    createdAt?: string;
  } | null;
  generatedAt?: string;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(value?: string | Date | null): string {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveImageSrc(path?: string | null): string {
  if (!path) return '';
  return getImageUrl(path);
}

export default function PrintMinistryExamDeclarationByTokenPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<PublicDeclarationResponse | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [printedAt, setPrintedAt] = useState<Date>(new Date());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  const centerLogoSrc = resolveImageSrc(settings?.centerLogo);
  const traineePhotoSrc = resolveImageSrc(payload?.trainee?.photoUrl);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setError('الرابط غير صالح');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/ministry-exam-declarations/public/${encodeURIComponent(token)}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error('الرابط غير صالح أو منتهي الصلاحية');
        }

        const data = await response.json();
        const resolvedPayload = (data as any)?.data ?? data;

        if (!resolvedPayload?.trainee) {
          throw new Error('تعذر تحميل بيانات المتدرب');
        }

        try {
          const settingsResponse = await fetch(`${API_BASE_URL}/settings/public`, {
            method: 'GET',
            cache: 'no-store',
          });

          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            const normalizedSettings =
              (settingsData as any)?.settings ??
              (settingsData as any)?.data?.settings ??
              (settingsData as any)?.data ??
              null;
            setSettings(normalizedSettings);
          } else {
            setSettings(null);
          }
        } catch {
          setSettings(null);
        }

        setPayload(resolvedPayload);
        setPrintedAt(new Date());
      } catch (err: any) {
        setError(err?.message || 'حدث خطأ أثناء تحميل بيانات الإقرار');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  useEffect(() => {
    const nationalId = payload?.trainee?.nationalId?.trim();
    if (!nationalId) {
      setQrCodeDataUrl('');
      return;
    }

    const generateQrCode = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(nationalId, {
          width: 220,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (qrError) {
        console.error('Failed to generate declaration QR:', qrError);
        setQrCodeDataUrl('');
      }
    };

    generateQrCode();
  }, [payload?.trainee?.nationalId]);

  useEffect(() => {
    setLogoLoaded(!centerLogoSrc);
  }, [centerLogoSrc]);

  useEffect(() => {
    setPhotoLoaded(!traineePhotoSrc);
  }, [traineePhotoSrc]);

  useEffect(() => {
    const hasNationalId = Boolean(payload?.trainee?.nationalId?.trim());
    const qrReady = !hasNationalId || Boolean(qrCodeDataUrl);
    const assetsReady = logoLoaded && photoLoaded;

    if (!loading && payload && !error && qrReady && assetsReady) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [loading, payload, error, qrCodeDataUrl, logoLoaded, photoLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500" dir="rtl">
        جاري تحميل بيانات الإقرار...
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-700" dir="rtl">
        {error || 'تعذر عرض الإقرار'}
      </div>
    );
  }

  const trainee = payload.trainee;
  const programName = trainee.program?.nameAr?.trim() || '-';

  return (
    <div className="min-h-screen bg-white text-black">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            font-size: 13px !important;
            line-height: 1.45 !important;
          }

          .declaration-sheet {
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm 9mm 7mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .declaration-header,
          .declaration-card,
          .declaration-body,
          .declaration-footer,
          .declaration-signatures {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        body {
          background: #ffffff;
          font-family: 'Tahoma', 'Arial', sans-serif;
        }
      `}</style>

      <div
        className="declaration-sheet mx-auto w-full max-w-[210mm] px-4 sm:px-6 py-6 sm:py-6 text-[14px] leading-7"
        dir="rtl"
      >
        <header className="declaration-header mb-4 border-b border-black pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="h-[76px] w-[76px] shrink-0 border border-black bg-white flex items-center justify-center overflow-hidden">
              {centerLogoSrc ? (
                <img
                  src={centerLogoSrc}
                  alt="لوجو مركز التدريب"
                  className="h-full w-full object-contain"
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoLoaded(true)}
                />
              ) : (
                <span className="text-[11px] text-slate-500 text-center px-1">لوجو المركز</span>
              )}
            </div>

            <div className="flex-1 text-center pt-1">
              <h1 className="text-[24px] font-black leading-tight mb-1">إقرار دخول اختبار وزارة العمل</h1>
              <p className="text-[18px] font-bold mb-0.5">غير مصرح لحملة الشهادة الإعدادية</p>
              <p className="text-[18px] font-bold">مركز طيبة ترخيص وزارة العمل رقم 29</p>
            </div>

            <div className="h-[76px] w-[76px] shrink-0" aria-hidden="true" />
          </div>
        </header>

        <section className="declaration-card mb-4 border border-black p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[15px]">
            <p><span className="font-bold">الاسم:</span> {trainee.nameAr || '-'}</p>
            <p><span className="font-bold">الرقم القومي:</span> {trainee.nationalId || '-'}</p>
            <p><span className="font-bold">رقم الهاتف:</span> {trainee.phone || '-'}</p>
            <p><span className="font-bold">البرنامج التدريبي:</span> {programName}</p>
            <p className="sm:col-span-2"><span className="font-bold">تاريخ الالتحاق:</span> {formatDate(trainee.createdAt)}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-black bg-gradient-to-b from-white to-slate-50 p-3">
              <p className="text-sm font-bold mb-1 text-center">صورة المتدرب</p>
              <div className="h-[138px] rounded-md border-2 border-slate-300 bg-white p-2 flex items-center justify-center">
                {traineePhotoSrc ? (
                  <img
                    src={traineePhotoSrc}
                    alt="صورة المتدرب"
                    className="h-full w-full object-contain"
                    onLoad={() => setPhotoLoaded(true)}
                    onError={() => setPhotoLoaded(true)}
                  />
                ) : (
                  <span className="text-xs text-slate-500">لا توجد صورة طالب</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-black bg-gradient-to-b from-white to-slate-50 p-3">
              <p className="text-sm font-bold mb-1 text-center">QR المتدرب (الموجود بالكارنيه)</p>
              <div className="h-[138px] rounded-md border-2 border-slate-300 bg-white p-2 flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <div className="h-full w-full rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="h-[112px] w-[112px] object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">لا يوجد QR</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="declaration-body text-[14px] leading-7">
          <p className="mb-1">
            أقر أنا المذكور أعلاه بكامل رغبتي للتقديم لإجراء الاختبار، وأتحمل كامل المسؤولية
            عن صحة البيانات المقدمة للإدارة أعلاه.
          </p>
          <p className="mb-1">
            علمًا بأن المركز غير مسؤول عن نتيجة اختبارات وزارة العمل، وأعلم أن النتيجة نجاح
            ورسوب، وفي حالة الرسوب لابد من رفع ملف تجديد وزارة العمل للإعادة.
          </p>

          <ul className="list-disc pr-6 space-y-0.5">
            <li>الالتزام بالحضور في الموعد المحدد، وفي حالة عدم حضور الاختبار يعتبر الاختبار لاغيًا بدون استرداد رسوم الاختبار.</li>
            <li>الالتزام بتعليمات الجهة المنظمة للاختبار.</li>
            <li>ميعاد الاختبار يحدد من قبل الوزارة من حيث التاريخ والمكان لانعقاد لجان الاختبار.</li>
            <li>عدم اصطحاب أي مواد أو أجهزة غير مسموح بها أثناء الاختبار.</li>
            <li>عدم محاولة الغش أو خرق أنظمة الاختبار بأي شكل من الأشكال، وإلا يعتبر الاختبار لاغيًا.</li>
          </ul>
        </section>

        <footer className="declaration-footer mt-5">
          <p className="mb-6 text-[13px]">
            تاريخ / {formatDate(printedAt)} الموافق بالميلادي اليوم والساعة {formatTime(printedAt)}
          </p>

          <div className="declaration-signatures w-full max-w-[430px] ml-auto space-y-4 text-[15px]">
            <div className="flex items-end gap-3">
              <p className="min-w-[130px]">اسم المتدرب /</p>
              <div className="flex-1 border-b border-black h-6" />
            </div>

            <div className="flex items-end gap-3">
              <p className="min-w-[130px]">توقيع المتدرب /</p>
              <div className="flex-1 border-b border-black h-6" />
            </div>

            <div className="flex items-end gap-3">
              <p className="min-w-[130px]">الموظف المسؤول /</p>
              <div className="flex-1 border-b border-black h-6" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
