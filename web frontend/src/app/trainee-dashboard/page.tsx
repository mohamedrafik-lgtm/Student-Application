'use client';

import Link from 'next/link';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  BookOpenIcon,
  TrophyIcon,
  ExclamationCircleIcon,
  IdentificationIcon,
  BellAlertIcon,
  StarIcon,
  LockClosedIcon,
  QrCodeIcon,
  SparklesIcon,
  MicrophoneIcon,
  ChatBubbleLeftEllipsisIcon,
  PlayIcon,
  VideoCameraIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from './hooks/useTraineeProfile';
import { useTraineePaymentStatus } from '@/hooks/useTraineePaymentStatus';
import { traineeAttendanceAPI, type TraineeAttendanceStats, type ClassroomGroup } from '@/lib/trainee-attendance-api';
import QRCodeDisplay from './components/QRCodeDisplay';
import PaymentReminderModal from './components/PaymentReminderModal';
import { useState, useEffect } from 'react';
import { fetchAPI, SERVER_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type MinistryDeclarationStatus =
  | 'PENDING_REVIEW'
  | 'NEEDS_RESUBMISSION'
  | 'APPROVED'
  | 'PENDING_BRANCH_DELIVERY'
  | 'BRANCH_DELIVERED';

interface MinistryDeclarationSummary {
  id: string;
  submissionMethod: 'ONLINE' | 'BRANCH';
  status: MinistryDeclarationStatus | string;
  rejectionReason?: string | null;
  updatedAt?: string;
}

interface MinistrySubmissionPolicy {
  isBlocked: boolean;
  isRequestsOpen: boolean;
  payment?: {
    isFullyPaid: boolean;
  };
  blockReasonCode?: 'NOT_OPEN' | 'DEADLINE_UNPAID' | null;
  blockReason?: string | null;
}

interface DeclarationUiState {
  label: string;
  hint: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  actionRequired: boolean;
}

const MINISTRY_DECLARATION_ROUTE = '/trainee-dashboard/requests/ministry-exam-declaration';

function normalizeDeclarationPayload(payload: any): MinistryDeclarationSummary | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !('id' in payload)) {
    return null;
  }

  return {
    id: String(payload.id),
    submissionMethod: payload.submissionMethod,
    status: String(payload.status || ''),
    rejectionReason: payload.rejectionReason || null,
    updatedAt: payload.updatedAt,
  };
}

function getDeclarationUiState(
  declaration: MinistryDeclarationSummary | null,
  submissionPolicy: MinistrySubmissionPolicy | null,
): DeclarationUiState {
  const normalizedStatus = String(declaration?.status || '').toUpperCase();

  if (normalizedStatus === 'APPROVED') {
    return {
      label: 'تم اعتماد الإقرار',
      hint: 'تم اعتماد إقرارك بنجاح.',
      tone: 'success',
      actionRequired: false,
    };
  }

  if (normalizedStatus === 'BRANCH_DELIVERED') {
    return {
      label: 'تم تأكيد التسليم بالفرع',
      hint: 'تم تأكيد استلام الإقرار في الفرع.',
      tone: 'success',
      actionRequired: false,
    };
  }

  if (
    !declaration &&
    submissionPolicy?.isRequestsOpen === true &&
    submissionPolicy?.payment?.isFullyPaid === false
  ) {
    return {
      label: 'يلزم سداد الرسم',
      hint: 'الطلبات مفتوحة، لكن يجب سداد الرسم المطلوب بالكامل قبل فتح صفحة الإقرار أو تقديم الطلب.',
      tone: 'warning',
      actionRequired: false,
    };
  }

  if (submissionPolicy?.isBlocked) {
    return {
      label:
        submissionPolicy.blockReasonCode === 'NOT_OPEN'
          ? 'الطلبات لم تُفتح بعد'
          : 'التقديم متوقف حالياً',
      hint:
        submissionPolicy.blockReason ||
        'لا يمكن تقديم إقرار اختبار وزارة العمل في الوقت الحالي.',
      tone: 'warning',
      actionRequired: false,
    };
  }

  if (!declaration) {
    return {
      label: 'غير مقدم بعد',
      hint: 'يجب تعبئة وتقديم إقرار دخول اختبار وزارة العمل.',
      tone: 'critical',
      actionRequired: true,
    };
  }

  if (normalizedStatus === 'NEEDS_RESUBMISSION') {
    return {
      label: 'مطلوب إعادة الرفع',
      hint: 'تم طلب إعادة تقديم الإقرار. يرجى التعديل والتقديم مرة أخرى.',
      tone: 'warning',
      actionRequired: true,
    };
  }

  if (normalizedStatus === 'PENDING_REVIEW') {
    return {
      label: 'تم التقديم - قيد المراجعة',
      hint: 'الإقرار تم تقديمه أونلاين وينتظر مراجعة الإدارة.',
      tone: 'info',
      actionRequired: false,
    };
  }

  if (normalizedStatus === 'PENDING_BRANCH_DELIVERY') {
    return {
      label: 'تم تسجيل التسليم من الفرع',
      hint: 'تم تسجيل اختيار التسليم عبر الفرع، بانتظار تأكيد الاستلام.',
      tone: 'info',
      actionRequired: false,
    };
  }

  return {
    label: 'حالة الإقرار غير معروفة',
    hint: 'يرجى فتح صفحة الإقرار للتحقق من الحالة الحالية.',
    tone: 'warning',
    actionRequired: true,
  };
}

function getDeclarationToneClasses(tone: DeclarationUiState['tone']) {
  if (tone === 'critical') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  if (tone === 'warning') {
    return 'border-orange-200 bg-orange-50 text-orange-800';
  }
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  return 'border-teal-200 bg-teal-50 text-teal-800';
}

export default function TraineeDashboardPage() {
  const { profile, stats, loading, error } = useTraineeProfile();
  const { status: paymentStatus } = useTraineePaymentStatus();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [releasedClassrooms, setReleasedClassrooms] = useState<any[]>([]);
  const [dismissedGrades, setDismissedGrades] = useState<number[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<{ stats: TraineeAttendanceStats; classroomName: string } | null>(null);
  const [centerName, setCenterName] = useState('');
  const [mobileApp, setMobileApp] = useState<{ enabled: boolean; googlePlayUrl: string; appStoreUrl: string; status: string } | null>(null);
  const [declarationStatus, setDeclarationStatus] = useState<MinistryDeclarationSummary | null>(null);
  const [declarationPolicy, setDeclarationPolicy] = useState<MinistrySubmissionPolicy | null>(null);
  const [declarationLoading, setDeclarationLoading] = useState(true);
  const [showDeclarationOverlay, setShowDeclarationOverlay] = useState(false);

  // جلب اسم مركز التدريب
  useEffect(() => {
    const fetchCenterName = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.centerName) setCenterName(data.centerName);
        }
      } catch (err) {
        console.error('Error fetching center name:', err);
      }
    };
    fetchCenterName();
  }, []);

  // جلب إعدادات التطبيق
  useEffect(() => {
    const fetchMobileAppSettings = async () => {
      try {
        const res = await fetch('/api/developer-settings');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const settingsMap = new Map<string, string>();
            data.forEach((s: any) => settingsMap.set(s.key, s.value || ''));
            const enabled = settingsMap.get('MOBILE_APP_ENABLED') === 'true';
            if (enabled) {
              setMobileApp({
                enabled: true,
                googlePlayUrl: settingsMap.get('MOBILE_APP_GOOGLE_PLAY_URL') || '',
                appStoreUrl: settingsMap.get('MOBILE_APP_APPSTORE_URL') || '',
                status: settingsMap.get('MOBILE_APP_STATUS') || 'pre_registration',
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching mobile app settings:', err);
      }
    };
    fetchMobileAppSettings();
  }, []);

  // جلب نسبة الحضور للفصل الدراسي المفعل
  useEffect(() => {
    const fetchActiveAttendance = async () => {
      try {
        const data = await traineeAttendanceAPI.getMyAttendanceRecords();
        if (data.classroomGroups && data.classroomGroups.length > 0) {
          const now = new Date();
          const currentClassroom = data.classroomGroups.find((cg: ClassroomGroup) => {
            const start = cg.classroom.startDate ? new Date(cg.classroom.startDate) : null;
            const end = cg.classroom.endDate ? new Date(cg.classroom.endDate) : null;
            return start && end && now >= start && now <= end;
          });
          const selected = currentClassroom || data.classroomGroups[0];
          setActiveAttendance({
            stats: selected.stats,
            classroomName: selected.classroom.name,
          });
        }
      } catch (err) {
        console.error('Error fetching attendance stats:', err);
      }
    };
    fetchActiveAttendance();
  }, []);

  // جلب النتائج المعلنة
  useEffect(() => {
    if (profile?.trainee?.id) {
      fetchReleasedGrades();
    }
  }, [profile]);

  // جلب حالة إقرار دخول اختبار وزارة العمل
  useEffect(() => {
    const loadDeclarationStatus = async () => {
      let declarationFetchFailed = false;
      let normalizedDeclaration: MinistryDeclarationSummary | null = null;
      let policy: MinistrySubmissionPolicy | null = null;

      try {
        setDeclarationLoading(true);

        try {
          const policyResponse = await fetchAPI('/ministry-exam-declarations/my/submission-policy');
          const policyPayload = (policyResponse as any)?.data ?? policyResponse;
          if (policyPayload && typeof policyPayload === 'object') {
            policy = policyPayload as MinistrySubmissionPolicy;
            setDeclarationPolicy(policy);
          } else {
            setDeclarationPolicy(null);
          }
        } catch (policyError) {
          console.error('Error loading ministry submission policy:', policyError);
          setDeclarationPolicy(null);
        }

        const response = await fetchAPI('/ministry-exam-declarations/my-request');
        const payload = (response as any)?.data ?? response;
        normalizedDeclaration = normalizeDeclarationPayload(payload);
        setDeclarationStatus(normalizedDeclaration);

        const embeddedPolicy = (payload as any)?.submissionPolicy;
        if (embeddedPolicy && typeof embeddedPolicy === 'object') {
          policy = embeddedPolicy as MinistrySubmissionPolicy;
          setDeclarationPolicy(policy);
        }
      } catch (err) {
        console.error('Error loading ministry declaration status:', err);
        declarationFetchFailed = true;
        setDeclarationStatus(null);
      } finally {
        if (declarationFetchFailed) {
          setShowDeclarationOverlay(false);
        } else {
          const uiState = getDeclarationUiState(normalizedDeclaration, policy);
          setShowDeclarationOverlay(uiState.actionRequired);
        }
        setDeclarationLoading(false);
      }
    };

    loadDeclarationStatus();
  }, []);

  const fetchReleasedGrades = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trainee-grades/${profile?.trainee?.id}/released`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        if (result?.classrooms?.length > 0) {
          // جلب الإشعارات التي تم تجاهلها من localStorage
          const dismissed = JSON.parse(localStorage.getItem('dismissedGradeNotifications') || '[]');
          setDismissedGrades(dismissed);
          setReleasedClassrooms(result.classrooms);
        }
      }
    } catch (error) {
      console.log('Could not fetch released grades');
    }
  };

  const dismissGradeNotification = (classroomId: number) => {
    const updated = [...dismissedGrades, classroomId];
    setDismissedGrades(updated);
    localStorage.setItem('dismissedGradeNotifications', JSON.stringify(updated));
  };

  // عرض Modal تلقائياً عند وجود رسوم مستحقة
  useEffect(() => {
    if (showDeclarationOverlay) {
      setShowPaymentModal(false);
      return;
    }

    if (paymentStatus?.paymentInfo) {
      const hasPayments =
        (paymentStatus.paymentInfo.upcomingPayments?.length || 0) > 0 ||
        (paymentStatus.paymentInfo.overduePayments?.length || 0) > 0;
      
      if (hasPayments) {
        // تأخير بسيط لتحميل الصفحة أولاً
        const timer = setTimeout(() => {
          setShowPaymentModal(true);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [paymentStatus, showDeclarationOverlay]);

  // تعريب أسماء الوثائق
  const getDocumentTypeLabel = (documentType: string) => {
    const documentTypeLabels: { [key: string]: string } = {
      'PERSONAL_PHOTO': 'الصورة الشخصية',
      'ID_CARD_FRONT': 'صورة البطاقة (وجه)',
      'ID_CARD_BACK': 'صورة البطاقة (ظهر)',
      'QUALIFICATION_FRONT': 'صورة المؤهل الدراسي (وجه)',
      'QUALIFICATION_BACK': 'صورة المؤهل الدراسي (ظهر)',
      'EXPERIENCE_CERT': 'شهادة الخبرة',
      'MINISTRY_CERT': 'شهادة الوزارة',
      'PROFESSION_CARD': 'كارنيه مزاولة المهنة',
      'SKILL_CERT': 'شهادة قياس المهارة'
    };
    return documentTypeLabels[documentType] || documentType;
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${SERVER_BASE_URL}${url}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل بيانات المتدرب...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md border-rose-100 shadow-lg shadow-rose-100/50">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">حدث خطأ في تحميل البيانات</h3>
            <p className="text-slate-500 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20"
            >
              إعادة المحاولة
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md border-amber-100 shadow-lg shadow-amber-100/50">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">لا توجد بيانات متاحة</h3>
            <p className="text-slate-500">لم يتم العثور على بيانات المتدرب</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentDate = new Date();
  const greeting = currentDate.getHours() < 12 ? 'صباح الخير' : 
                  currentDate.getHours() < 17 ? 'مساء الخير' : 'مساء الخير';

  const traineeData = profile.trainee;
  const declarationUiState = getDeclarationUiState(
    declarationStatus,
    declarationPolicy,
  );
  const declarationToneClasses = getDeclarationToneClasses(declarationUiState.tone);

  return (
    <div className="space-y-8 pb-8 px-4 lg:px-8">
      {showDeclarationOverlay && !declarationLoading && (
        <div className="fixed inset-0 z-[90] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.22)] overflow-hidden">
            <div className="px-6 sm:px-8 py-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                    <DocumentTextIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-90 mb-1">تنبيه مهم للمتدرب</p>
                    <h2 className="text-xl sm:text-2xl font-black">إقرار دخول اختبار وزارة العمل</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeclarationOverlay(false)}
                  className="p-2 rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 transition-colors"
                  aria-label="إغلاق"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-7 space-y-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5 text-emerald-900">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="font-black mb-1">يرجى تعبئة وتقديم الإقرار الآن</p>
                    <p className="text-sm leading-7">
                      هذا التنبيه سيظهر في كل مرة عند فتح الصفحة الرئيسية للداشبورد
                      حتى تقوم بتقديم الإقرار.
                    </p>
                  </div>
                </div>
              </div>

              {String(declarationStatus?.status || '').toUpperCase() === 'NEEDS_RESUBMISSION' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm leading-7">
                  <p className="font-black mb-1">سبب إعادة التقديم</p>
                  <p>{declarationStatus?.rejectionReason || 'تم طلب إعادة رفع الإقرار مرة أخرى.'}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={MINISTRY_DECLARATION_ROUTE}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  الانتقال لتعبئة الإقرار
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDeclarationOverlay(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-sm transition-colors"
                >
                  متابعة لاحقًا
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header - Clean Style */}
      <div className="relative overflow-hidden bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right w-full md:w-auto">
            <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight text-slate-800">
              {greeting}، <span className="text-emerald-600">{traineeData?.nameAr?.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-slate-500 text-lg font-bold mb-6 max-w-xl">
              مرحباً بك في منصة المتدربين{centerName ? ` - ${centerName}` : ''}
            </p>
            <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-black text-slate-700">{traineeData?.program?.nameAr}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50/50 border border-slate-100 p-4 rounded-[2rem]">
            {/* صورة المتدرب */}
            <Avatar className="w-24 h-24 border-4 border-white shadow-md">
              <AvatarImage src={getImageUrl(traineeData?.photoUrl)} alt={traineeData?.nameAr} className="object-cover" />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-black">
                {traineeData?.nameAr?.charAt(0) || <UserIcon className="w-10 h-10" />}
              </AvatarFallback>
            </Avatar>
            
            {/* QR Code */}
            {traineeData?.nationalId && (
              <div className="flex flex-col items-center gap-2 pl-2 border-l border-slate-200">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                  <QRCodeDisplay 
                    nationalId={traineeData.nationalId}
                    size={72}
                  />
                </div>
                <span className="text-xs font-black text-slate-400 tracking-wider">كود الهوية</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card className={`border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] ${declarationToneClasses}`}>
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg sm:text-xl font-black">حالة إقرار اختبار وزارة العمل</h3>
                  {declarationUiState.actionRequired && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-white/80 border border-current/20">
                      مطلوب الآن
                    </span>
                  )}
                </div>
                {declarationLoading ? (
                  <p className="text-sm font-bold opacity-80">جاري التحقق من حالة الإقرار...</p>
                ) : (
                  <>
                    <p className="text-sm sm:text-base font-black mb-1">{declarationUiState.label}</p>
                    <p className="text-sm opacity-90">{declarationUiState.hint}</p>
                    {declarationStatus?.updatedAt && (
                      <p className="text-xs opacity-70 mt-2">
                        آخر تحديث: {new Date(declarationStatus.updatedAt).toLocaleString('ar-EG')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={MINISTRY_DECLARATION_ROUTE}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 font-black text-sm transition-colors"
              >
                <DocumentTextIcon className="w-4 h-4" />
                فتح صفحة الإقرار
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إشعار النتائج المعلنة */}
      {releasedClassrooms.filter(c => !dismissedGrades.includes(c.classroom.id)).length > 0 && (
        <div className="space-y-4">
          {releasedClassrooms
            .filter(c => !dismissedGrades.includes(c.classroom.id))
            .map((classroomData) => {
              const isLocked = !classroomData.canView;
              return (
                <Card
                  key={classroomData.classroom.id}
                  className={`relative overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] ${
                    isLocked
                      ? 'bg-rose-50/50'
                      : 'bg-emerald-50/50'
                  }`}
                >
                  <CardContent className="p-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isLocked
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isLocked ? (
                            <LockClosedIcon className="w-7 h-7" />
                          ) : (
                            <BellAlertIcon className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5">
                            <h3 className={`text-lg font-black ${
                              isLocked ? 'text-rose-900' : 'text-emerald-900'
                            }`}>
                              {isLocked ? '🔒' : '🎉'} تم إعلان نتائج {classroomData.classroom.name}
                            </h3>
                            <Badge variant={isLocked ? 'destructive' : 'default'} className={!isLocked ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>
                              {isLocked ? 'غير متاح' : 'جديد'}
                            </Badge>
                          </div>
                          {isLocked ? (
                            <p className="text-sm font-bold text-rose-700">
                              النتائج غير متاحة للعرض - {classroomData.reason || 'يرجى سداد الرسوم المستحقة لعرض النتائج'}
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-teal-700">
                              نتائج الفصل {classroomData.classroom.classNumber % 2 === 1 ? 'الأول' : 'الثاني'} متاحة للعرض الآن
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        {isLocked ? (
                          <Link
                            href="/trainee-dashboard/payments"
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-sm hover:-translate-y-0.5"
                          >
                            <CurrencyDollarIcon className="w-5 h-5" />
                            سداد الرسوم
                          </Link>
                        ) : (
                          <Link
                            href="/trainee-dashboard/released-grades"
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-sm hover:-translate-y-0.5"
                          >
                            <StarIcon className="w-5 h-5" />
                            عرض النتائج
                          </Link>
                        )}
                        <button
                          onClick={() => dismissGradeNotification(classroomData.classroom.id)}
                          className={`p-3 rounded-2xl transition-colors ${
                            isLocked
                              ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-100'
                              : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100'
                          }`}
                          title="إخفاء الإشعار"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Modal الإشعار المنبثق */}
      <PaymentReminderModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        upcomingPayments={paymentStatus?.paymentInfo?.upcomingPayments}
        overduePayments={paymentStatus?.paymentInfo?.overduePayments}
      />

      {/* Quick Stats - Bento Box Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CalendarDaysIcon className="w-7 h-7 text-blue-600" />
              </div>
              {activeAttendance && activeAttendance.stats.total > 0 ? (
                <Badge variant="outline" className={`font-black px-3 py-1 rounded-xl border-0 ${
                  activeAttendance.stats.attendanceRate >= 80 ? 'bg-emerald-50 text-emerald-700' : 
                  activeAttendance.stats.attendanceRate >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {activeAttendance.stats.attendanceRate}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-black px-3 py-1 rounded-xl border-0 bg-slate-100 text-slate-600">قريباً</Badge>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">نسبة الحضور</h3>
            {activeAttendance && activeAttendance.stats.total > 0 ? (
              <>
                <p className="text-slate-400 text-xs font-bold mb-3 line-clamp-1" title={activeAttendance.classroomName}>{activeAttendance.classroomName}</p>
                <p className="text-slate-600 text-sm font-black mb-4">
                  {activeAttendance.stats.present} من {activeAttendance.stats.total} محاضرة
                </p>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      activeAttendance.stats.attendanceRate >= 80 ? 'bg-emerald-500' :
                      activeAttendance.stats.attendanceRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${activeAttendance.stats.attendanceRate}%` }}
                  ></div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 text-sm font-black mb-2">
                  لم تبدأ الدراسة بعد
                </p>
                <p className="text-slate-400 text-xs font-bold">
                  سيتم تسجيل الحضور عند بدء الجلسات
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CurrencyDollarIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <Badge variant="outline" className={`font-black px-3 py-1 rounded-xl border-0 ${
                (stats?.remainingAmount || 0) === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {(stats?.remainingAmount || 0) === 0 ? 'مكتمل' : 'متبقي'}
              </Badge>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-4">الحالة المالية</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 font-bold">المدفوع:</span>
                <span className="text-slate-800 font-black">{stats?.paidAmount} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm bg-rose-50 p-3 rounded-xl">
                <span className="text-rose-600 font-bold">المتبقي:</span>
                <span className="text-rose-700 font-black">{stats?.remainingAmount} ج.م</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DocumentTextIcon className="w-7 h-7 text-purple-600" />
              </div>
              <Badge variant="outline" className={`font-black px-3 py-1 rounded-xl border-0 ${
                (stats?.verifiedDocuments || 0) >= 4 ? 'bg-emerald-50 text-emerald-700' :
                (stats?.verifiedDocuments || 0) >= 2 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {stats?.verifiedDocuments || 0}/4
              </Badge>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">الوثائق المطلوبة</h3>
            <p className="text-slate-400 text-sm font-bold mb-4">
              {stats?.verifiedDocuments || 0} من 4 وثائق أساسية
            </p>
            <div className="text-xs font-bold space-y-2.5">
              <p className="text-slate-600 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> الصورة الشخصية</p>
              <p className="text-slate-600 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> صورة البطاقة</p>
              <p className="text-slate-600 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> صورة المؤهل</p>
              <p className={`pt-2 flex items-center gap-2 ${
                (stats?.verifiedDocuments || 0) < 4 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {(stats?.verifiedDocuments || 0) < 4 ? '⚠️ يجب إكمال رفع الوثائق' : '✓ تم رفع جميع الوثائق'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* تسجيل الحضور */}
        <Link href="/trainee-dashboard/check-in" className="block h-full">
          <Card className="h-full border-0 bg-emerald-600 shadow-[0_8px_30px_rgb(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:-translate-y-1 rounded-[2rem] transition-all duration-300 group cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <CardContent className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 text-white">
                  <QrCodeIcon className="w-7 h-7" />
                </div>
                <Badge className="bg-white/20 text-white hover:bg-white/30 font-black px-3 py-1 rounded-xl border-0">
                  متاح
                </Badge>
              </div>
              <h3 className="text-xl font-black text-white mb-2">تسجيل الحضور</h3>
              <p className="text-emerald-100 text-sm font-bold mb-auto">
                سجّل حضورك عبر الكود أو مسح QR
              </p>
              <div className="flex items-center gap-2 text-white text-sm font-black group-hover:gap-3 transition-all mt-6 bg-white/10 p-3 rounded-xl justify-center">
                <span>ابدأ الآن</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* AI Assistant Teaser Banner - Interactive Preview */}
      <div className="relative overflow-hidden bg-emerald-50 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-emerald-100 group">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 opacity-60"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          {/* Text Content */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                <SparklesIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-slate-800">المساعد الذكي <span className="text-emerald-600">AI</span></h3>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 px-3 py-1 rounded-xl font-black animate-pulse">قريباً</Badge>
                </div>
                <p className="text-slate-500 font-bold text-sm">رفيقك الذكي في كل محاضرة</p>
              </div>
            </div>
            <p className="text-slate-600 font-bold text-base max-w-xl leading-relaxed mb-6">
              نعمل على تطوير مساعد شخصي بالذكاء الاصطناعي لمرافقتك في المحاضرات الأونلاين. سيتمكن من الإجابة على أسئلتك <span className="text-emerald-700">بالصوت والكتابة</span>، تلخيص المحاضرات، ومساعدتك في فهم المواد المعقدة لحظة بلحظة!
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center justify-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 font-black text-sm">
                <MicrophoneIcon className="w-5 h-5 text-emerald-600" />
                <span>تفاعل صوتي</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 font-black text-sm">
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-teal-600" />
                <span>محادثة نصية</span>
              </div>
            </div>
          </div>

          {/* Interactive Animation Preview */}
          <div className="w-full lg:w-[450px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col relative">
            {/* Video Player Mockup */}
            <div className="h-40 bg-slate-800 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                <PlayIcon className="w-6 h-6 text-white ml-1" />
              </div>
              <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                <div className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/3"></div>
                </div>
                <span className="text-white/70 text-[10px] font-bold">12:45 / 45:00</span>
              </div>
              <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-rose-500/20 text-rose-100 px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm border border-rose-500/30">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></div>
                LIVE
              </div>
            </div>

            {/* AI Chat Interface Mockup */}
            <div className="p-4 bg-slate-50 flex-1 flex flex-col gap-3 relative">
              {/* Chat Messages */}
              <div className="flex flex-col gap-3">
                {/* User Message */}
                <div className="self-end bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                  هل يمكنك شرح هذه النقطة مرة أخرى؟
                </div>
                
                {/* AI Typing Indicator */}
                <div className="self-start bg-white border border-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm flex items-center gap-2">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>

                {/* AI Voice Response Mockup */}
                <div className="self-start bg-white border border-emerald-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-2xl rounded-tl-sm w-full shadow-sm flex items-center gap-3 mt-1">
                  <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <MicrophoneIcon className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 flex items-center gap-0.5 h-3">
                    {/* Audio Waveform Animation */}
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1 bg-emerald-400 rounded-full animate-pulse"
                        style={{ 
                          height: `${Math.max(20, Math.random() * 100)}%`,
                          animationDuration: `${0.5 + Math.random() * 0.5}s`,
                          animationDelay: `${Math.random() * 0.5}s`
                        }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">0:15</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="mt-2 bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <MicrophoneIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs text-slate-400 font-medium">اسأل المساعد الذكي...</div>
                <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 rtl:-scale-x-100">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App Banner */}
      {mobileApp && mobileApp.enabled && (
        <div className="relative overflow-hidden bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 rounded-[2rem] shadow-lg shadow-emerald-600/15">
          {/* Decorative elements */}
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white/30 rounded-full animate-ping" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Phone Icon */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20">
                <DevicePhoneMobileIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    {mobileApp.status === 'published' ? '📱 حمّل التطبيق الآن!' : '🚀 التطبيق قادم قريباً!'}
                  </h3>
                  {mobileApp.status === 'pre_registration' && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full border border-white/20 flex-shrink-0">
                      <ClockIcon className="w-3 h-3" />
                      تسجيل مسبق
                    </span>
                  )}
                </div>
                <p className="text-emerald-100 text-xs sm:text-sm font-medium truncate">
                  {mobileApp.status === 'published'
                    ? 'تابع جدولك وحضورك وأقساطك — كل شيء في مكان واحد'
                    : 'سجّل مسبقاً وكن أول من يجربه'}
                </p>
              </div>

              {/* Store Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {mobileApp.googlePlayUrl && (
                  <a href={mobileApp.googlePlayUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white rounded-xl hover:bg-emerald-50 transition-all shadow-sm group">
                    <svg className="w-5 h-5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                    </svg>
                    <span className="hidden sm:block text-xs font-bold text-slate-800">Google Play</span>
                  </a>
                )}
                {mobileApp.appStoreUrl && (
                  <a href={mobileApp.appStoreUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white rounded-xl hover:bg-emerald-50 transition-all shadow-sm group">
                    <svg className="w-5 h-5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <span className="hidden sm:block text-xs font-bold text-slate-800">App Store</span>
                  </a>
                )}
                {!mobileApp.googlePlayUrl && !mobileApp.appStoreUrl && (
                  <span className="px-3 py-2 bg-white/20 rounded-xl text-white text-xs font-bold border border-white/20">
                    قريباً
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] bg-white">
          <CardHeader className="border-b border-slate-100 pb-5 pt-6 px-8">
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-slate-600" />
              </div>
              الأنشطة الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {/* Recent Attendance Records */}
              {traineeData.attendanceRecords.slice(0, 2).map((record) => (
                <div key={record.id} className="p-6 flex items-center gap-5 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 
                    record.status === 'ABSENT' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <CalendarDaysIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-black text-slate-800 mb-1">
                      {record.status === 'PRESENT' ? 'تم تسجيل الحضور' : 
                       record.status === 'ABSENT' ? 'تم تسجيل الغياب' : 'حضور متأخر'}
                    </p>
                    <p className="text-sm font-bold text-slate-400">
                      {record.session.title}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    {new Date(record.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              ))}

              {/* Recent Documents */}
              {traineeData.documents.slice(0, 1).map((doc) => (
                <div key={doc.id} className="p-6 flex items-center gap-5 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    doc.isVerified ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-black text-slate-800 mb-1">
                      {doc.isVerified ? 'تم التحقق من وثيقة' : 'تم رفع وثيقة جديدة'}
                    </p>
                    <p className="text-sm font-bold text-slate-400">
                      {getDocumentTypeLabel(doc.documentType)}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    {new Date(doc.uploadedAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              ))}

              {/* Recent Payments */}
              {traineeData.traineePayments.filter(p => p.status === 'PAID').slice(0, 1).map((payment) => (
                <div key={payment.id} className="p-6 flex items-center gap-5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CurrencyDollarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-black text-slate-800 mb-1">تم سداد دفعة</p>
                    <p className="text-sm font-bold text-slate-400">
                      {payment.fee.name} • <span className="text-emerald-600">{payment.paidAmount} ج.م</span>
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                  </div>
                </div>
              ))}

              {/* Fallback if no recent activities */}
              {traineeData.attendanceRecords.length === 0 && 
               traineeData.documents.length === 0 && 
               traineeData.traineePayments.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClockIcon className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-black text-lg">لا توجد أنشطة حديثة</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] bg-white">
          <CardHeader className="border-b border-slate-100 pb-5 pt-6 px-8">
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-slate-600" />
              </div>
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/trainee-dashboard/profile" className="p-5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-200 group block text-center">
                <div className="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UserIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-emerald-700">البيانات الشخصية</span>
              </Link>
              
              <Link href="/trainee-dashboard/payments" className="p-5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-200 group block text-center">
                <div className="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CurrencyDollarIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-emerald-700">المدفوعات</span>
              </Link>
              
              <Link href="/trainee-dashboard/id-card" className="p-5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-200 group block text-center">
                <div className="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <IdentificationIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-emerald-700">الكارنية</span>
              </Link>
              
              <Link href="/trainee-dashboard/documents" className="p-5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-200 group block text-center">
                <div className="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <DocumentTextIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-emerald-700">الوثائق</span>
              </Link>
              
              <Link href="/trainee-dashboard/content" className="col-span-2 p-5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all duration-200 group text-center flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpenIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-black text-slate-700 group-hover:text-emerald-700">المحتوى التعليمي</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
