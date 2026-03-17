'use client';

import { useEffect, useState } from 'react';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  GiftIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// نسبة النجاح المطلوبة (50% فأكثر)
const PASSING_PERCENTAGE = 50;

// دالة حساب التقدير بناءً على النسبة المئوية
function getGradeRating(percentage: number): { label: string; color: string; bgColor: string; borderColor: string } {
  if (percentage >= 80) {
    return { label: 'امتياز', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' };
  } else if (percentage >= 70) {
    return { label: 'جيد جداً', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
  } else if (percentage >= 60) {
    return { label: 'جيد', color: 'text-cyan-700', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-300' };
  } else if (percentage >= 50) {
    return { label: 'مقبول', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' };
  } else {
    return { label: 'راسب', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
  }
}

interface ContentGrade {
  content: {
    id: number;
    name: string;
    code: string;
  };
  grade: {
    yearWorkMarks: number | null;
    practicalMarks: number | null;
    writtenMarks: number | null;
    attendanceMarks: number | null;
    quizzesMarks: number | null;
    finalExamMarks: number | null;
    total: number;
  } | null;
  maxMarks: {
    yearWorkMarks: number;
    practicalMarks: number;
    writtenMarks: number;
    attendanceMarks: number;
    quizzesMarks: number;
    finalExamMarks: number;
    total: number;
  };
}

interface ClassroomData {
  classroom: {
    id: number;
    name: string;
    classNumber: number;
    startDate: string | null;
    endDate: string | null;
  };
  releaseInfo: {
    releasedAt: Date | null;
    requirePayment: boolean;
    linkedFeeType: string | null;
    notes: string | null;
  };
  canView: boolean;
  reason?: string;
  contents: ContentGrade[];
  totalStats: {
    maxTotal: number;
    earnedTotal: number;
    percentage: number;
  };
}

interface TraineeReleasedGrades {
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    program: {
      nameAr: string;
      nameEn: string;
    };
  };
  classrooms: ClassroomData[];
}

export default function ReleasedGradesPage() {
  const { profile: traineeData, loading: profileLoading } = useTraineeProfile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TraineeReleasedGrades | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [myAppeals, setMyAppeals] = useState<any[]>([]);
  const [mercyGrades, setMercyGrades] = useState<any[]>([]);
  const [appealsOpen, setAppealsOpen] = useState<boolean>(true);

  useEffect(() => {
    if (traineeData?.trainee?.id) {
      fetchReleasedGrades();
      fetchMercyGrades();
    }
  }, [traineeData]);

  const fetchReleasedGrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trainee-grades/${traineeData?.trainee?.id}/released`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('فشل في تحميل البيانات');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // جلب تظلماتي السابقة
  const fetchMyAppeals = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals/my-appeals`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('trainee_token')}` } }
      );
      if (response.ok) {
        const result = await response.json();
        setMyAppeals(result);
      }
    } catch (err) {
      console.error('خطأ في جلب التظلمات:', err);
    }
  };

  // جلب درجات الرأفة المطبقة
  const fetchMercyGrades = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trainee-grades/${traineeData?.trainee?.id}/mercy-grades`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        setMercyGrades(result);
      }
    } catch (err) {
      console.error('خطأ في جلب درجات الرأفة:', err);
    }
  };

  useEffect(() => {
    if (traineeData?.trainee?.id) {
      fetchMyAppeals();
      fetchAppealsStatus();
    }
  }, [traineeData]);

  const fetchAppealsStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals/appeals-status`
      );
      if (response.ok) {
        const result = await response.json();
        setAppealsOpen(result.acceptGradeAppeals ?? true);
      }
    } catch (err) {
      console.error(err);
    }
  };



  if (loading || profileLoading) {
    return <LoadingScreen message="جاري تحميل النتائج الدراسية..." submessage="نجهز لك درجاتك المعلنة" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.classrooms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">النتائج الدراسية</h1>
                <p className="text-xs md:text-sm text-gray-600">عرض الدرجات المعلنة للفصول الدراسية</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 md:p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-yellow-900 mb-2">لا توجد نتائج معلنة</h3>
            <p className="text-sm md:text-base text-yellow-700">لم يتم إعلان أي نتائج دراسية حتى الآن</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2 sm:px-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">النتائج الدراسية</h1>
            <p className="text-slate-500 text-sm sm:text-base">عرض الدرجات المعلنة للفصول الدراسية الخاصة بك</p>
          </div>
        </div>

        {/* Trainee Info Card - Emerald Theme */}
        <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                <AcademicCapIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{data.trainee.nameAr}</h2>
                <p className="text-emerald-100 text-sm sm:text-base mt-1">{data.trainee.program.nameAr}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 sm:p-4 border border-white/10">
                <CheckCircleIcon className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-white">
                  <span className="font-bold">معيار النجاح:</span> الحصول على نسبة {PASSING_PERCENTAGE}% فأكثر في كل مادة
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/10 rounded-2xl p-4 sm:p-5 border border-white/20 shadow-inner">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm sm:text-base mb-0.5">هل يوجد خطأ في النتيجة؟</h4>
                    <p className="text-xs sm:text-sm text-emerald-100">
                      في حال وجود خطأ، يمكنك تقديم طلب تظلم لمراجعة درجاتك.
                    </p>
                  </div>
                </div>
                {appealsOpen ? (
                  <a
                    href="/trainee-dashboard/appeals"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition-all hover:scale-105 hover:shadow-lg active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    تقديم تظلم
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-black/20 text-white/80 text-sm font-bold rounded-xl border border-white/10 whitespace-nowrap w-full sm:w-auto">
                    <LockClosedIcon className="w-4 h-4" />
                    باب التظلمات مغلق
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* تظلماتي السابقة */}
        {myAppeals.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-slate-500" />
                تظلماتي السابقة
              </h4>
              <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {myAppeals.length} تظلمات
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {myAppeals.map((appeal: any) => (
                <div key={appeal.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        appeal.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        appeal.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {appeal.status === 'PENDING' ? 'قيد المراجعة' : appeal.status === 'ACCEPTED' ? 'مقبول' : 'مرفوض'}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {appeal.subjects?.map((s: any) => s.content?.name).join('، ')}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
                      {new Date(appeal.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  {appeal.adminResponse && (
                    <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">رد الإدارة: </span>
                      {appeal.adminResponse}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classrooms */}
        {data.classrooms.map((classroomData) => (
          <div key={classroomData.classroom.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Classroom Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{classroomData.classroom.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                      <AcademicCapIcon className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-medium">الفصل {classroomData.classroom.classNumber % 2 === 1 ? 'الأول' : 'الثاني'}</span>
                    </div>
                    {classroomData.classroom.startDate && classroomData.classroom.endDate && (
                      <div className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                        <ClockIcon className="w-4 h-4" />
                        <span className="text-xs sm:text-sm font-medium">
                          {new Date(classroomData.classroom.startDate).toLocaleDateString('ar-EG')} - {new Date(classroomData.classroom.endDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {classroomData.canView && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">النسبة الكلية</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{classroomData.totalStats.percentage.toFixed(1)}%</p>
                        <p className="text-xs font-bold text-slate-400">{Math.round(classroomData.totalStats.earnedTotal * 100) / 100} / {Math.round(classroomData.totalStats.maxTotal)}</p>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${classroomData.totalStats.percentage >= PASSING_PERCENTAGE ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {classroomData.totalStats.percentage >= PASSING_PERCENTAGE ? '✓ ناجح' : '✗ راسب'}
                      </span>
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                        {getGradeRating(classroomData.totalStats.percentage).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-0">
              {!classroomData.canView ? (
                <div className="p-6 sm:p-8">
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-rose-100">
                      <LockClosedIcon className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-rose-900 mb-1">الدرجات غير متاحة للعرض</h3>
                      <p className="text-sm text-rose-700 mb-3">{classroomData.reason}</p>
                      {classroomData.releaseInfo.linkedFeeType && (
                        <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-rose-700 bg-white px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm font-medium">
                          <CurrencyDollarIcon className="w-4 h-4" />
                          <span>الرسم المطلوب: {classroomData.releaseInfo.linkedFeeType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  // حساب الأعمدة المستخدمة فعلياً في هذا الفصل
                  const hasYearWork = classroomData.contents.some(c => c.maxMarks.yearWorkMarks > 0);
                  const hasPractical = classroomData.contents.some(c => c.maxMarks.practicalMarks > 0);
                  const hasWritten = classroomData.contents.some(c => c.maxMarks.writtenMarks > 0);
                  const hasAttendance = classroomData.contents.some(c => c.maxMarks.attendanceMarks > 0);
                  const hasQuizzes = classroomData.contents.some(c => c.maxMarks.quizzesMarks > 0);
                  const hasFinal = classroomData.contents.some(c => c.maxMarks.finalExamMarks > 0);
                  const visibleColCount = [hasYearWork, hasPractical, hasWritten, hasAttendance, hasQuizzes, hasFinal].filter(Boolean).length;

                  return (
                <>
                  {/* عرض الجدول على الشاشات الكبيرة فقط */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-4 text-sm font-bold text-slate-700">المادة</th>
                          {hasYearWork && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">أعمال السنة</th>}
                          {hasPractical && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">العملي</th>}
                          {hasWritten && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">التحريري</th>}
                          {hasAttendance && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">الحضور</th>}
                          {hasQuizzes && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">اختبارات اونلاين</th>}
                          {hasFinal && <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">الميد تيرم</th>}
                          <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">الإجمالي</th>
                          <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">النسبة</th>
                          <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">التقدير</th>
                          <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classroomData.contents.map((content, index) => {
                          const total = content.grade?.total ?? 0;
                          const maxTotal = content.maxMarks.total;
                          const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                          const isPassing = percentage >= PASSING_PERCENTAGE;
                          
                          return (
                            <tr
                              key={index}
                              className={`transition-colors duration-150 ${
                                isPassing 
                                  ? 'hover:bg-slate-50/80' 
                                  : 'bg-rose-50/50 hover:bg-rose-50'
                              }`}
                            >
                              <td className="px-4 py-4 text-sm font-bold text-slate-900">{content.content.name}</td>
                              {hasYearWork && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.yearWorkMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.yearWorkMarks != null ? Math.round(content.grade.yearWorkMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.yearWorkMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              {hasPractical && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.practicalMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.practicalMarks != null ? Math.round(content.grade.practicalMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.practicalMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              {hasWritten && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.writtenMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.writtenMarks != null ? Math.round(content.grade.writtenMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.writtenMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              {hasAttendance && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.attendanceMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.attendanceMarks != null ? Math.round(content.grade.attendanceMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.attendanceMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              {hasQuizzes && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.quizzesMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.quizzesMarks != null ? Math.round(content.grade.quizzesMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.quizzesMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              {hasFinal && (
                                <td className="px-4 py-4 text-sm text-center text-slate-600">
                                  {content.maxMarks.finalExamMarks > 0 ? (
                                    <span className="font-medium">{content.grade?.finalExamMarks != null ? Math.round(content.grade.finalExamMarks * 100) / 100 : '-'}<span className="text-slate-400 text-xs mr-1">/{content.maxMarks.finalExamMarks}</span></span>
                                  ) : <span className="text-slate-300">-</span>}
                                </td>
                              )}
                              <td className="px-4 py-4 text-sm text-center font-black text-slate-900">
                                {Math.round(total * 100) / 100} <span className="text-slate-400 text-xs font-medium">/ {Math.round(maxTotal)}</span>
                              </td>
                              <td className={`px-4 py-4 text-sm text-center font-black ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {percentage.toFixed(1)}%
                              </td>
                              <td className="px-4 py-4 text-center">
                                {(() => {
                                  const rating = getGradeRating(percentage);
                                  return (
                                    <span className={`inline-flex items-center px-3 py-1 ${rating.bgColor} ${rating.color} rounded-full text-xs font-bold`}>
                                      {rating.label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {isPassing ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    ناجح
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
                                    <XCircleIcon className="w-3.5 h-3.5" />
                                    راسب
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={visibleColCount + 1} className="px-4 py-5 text-left text-sm font-bold text-slate-600">
                            الإجمالي الكلي للفصل الدراسي
                          </td>
                          <td className="px-4 py-5 text-center text-base font-black text-slate-900">
                            {Math.round(classroomData.totalStats.earnedTotal * 100) / 100} <span className="text-slate-400 text-xs font-medium">/ {Math.round(classroomData.totalStats.maxTotal)}</span>
                          </td>
                          <td className="px-4 py-5 text-center text-lg font-black text-emerald-600">
                            {classroomData.totalStats.percentage.toFixed(1)}%
                          </td>
                          <td className="px-4 py-5 text-center">
                            {(() => {
                              const rating = getGradeRating(classroomData.totalStats.percentage);
                              return (
                                <span className={`inline-flex items-center px-3 py-1.5 ${rating.bgColor} ${rating.color} rounded-full text-sm font-bold`}>
                                  {rating.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* عرض البطاقات على الشاشات الصغيرة والمتوسطة */}
                  <div className="lg:hidden p-4 sm:p-6 space-y-4 bg-slate-50/50">
                    {classroomData.contents.map((content, index) => {
                      const total = content.grade?.total ?? 0;
                      const maxTotal = content.maxMarks.total;
                      const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                      const isPassing = percentage >= PASSING_PERCENTAGE;

                      return (
                        <div key={index} className={`bg-white rounded-2xl border ${isPassing ? 'border-slate-200' : 'border-rose-200'} shadow-sm overflow-hidden`}>
                          {/* رأس البطاقة */}
                          <div className={`px-4 py-3 border-b ${isPassing ? 'border-slate-100 bg-slate-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{content.content.name}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{content.content.code}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isPassing ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {isPassing ? (
                                  <>
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    ناجح
                                  </>
                                ) : (
                                  <>
                                    <XCircleIcon className="w-3.5 h-3.5" />
                                    راسب
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* تفاصيل الدرجات */}
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {content.maxMarks.yearWorkMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">أعمال السنة</span>
                                  <span className="font-bold text-slate-900">{content.grade?.yearWorkMarks != null ? Math.round(content.grade.yearWorkMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.yearWorkMarks}</span></span>
                                </div>
                              )}
                              {content.maxMarks.practicalMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">العملي</span>
                                  <span className="font-bold text-slate-900">{content.grade?.practicalMarks != null ? Math.round(content.grade.practicalMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.practicalMarks}</span></span>
                                </div>
                              )}
                              {content.maxMarks.writtenMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">التحريري</span>
                                  <span className="font-bold text-slate-900">{content.grade?.writtenMarks != null ? Math.round(content.grade.writtenMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.writtenMarks}</span></span>
                                </div>
                              )}
                              {content.maxMarks.attendanceMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">الحضور</span>
                                  <span className="font-bold text-slate-900">{content.grade?.attendanceMarks != null ? Math.round(content.grade.attendanceMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.attendanceMarks}</span></span>
                                </div>
                              )}
                              {content.maxMarks.quizzesMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">اختبارات</span>
                                  <span className="font-bold text-slate-900">{content.grade?.quizzesMarks != null ? Math.round(content.grade.quizzesMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.quizzesMarks}</span></span>
                                </div>
                              )}
                              {content.maxMarks.finalExamMarks > 0 && (
                                <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <span className="text-slate-500 text-xs">الميد تيرم</span>
                                  <span className="font-bold text-slate-900">{content.grade?.finalExamMarks != null ? Math.round(content.grade.finalExamMarks * 100) / 100 : '-'}<span className="text-slate-400 text-[10px] mr-1">/{content.maxMarks.finalExamMarks}</span></span>
                                </div>
                              )}
                            </div>

                            {/* الإجمالي والنسبة */}
                            <div className={`flex items-center justify-between rounded-xl px-4 py-3 mt-2 border ${
                              isPassing ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
                            }`}>
                              <div>
                                <p className="text-[10px] text-slate-500 mb-0.5">الإجمالي</p>
                                <p className="font-black text-base text-slate-900">{Math.round(total * 100) / 100} <span className="text-slate-400 text-xs font-medium">/ {Math.round(maxTotal)}</span></p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-1">التقدير</p>
                                {(() => {
                                  const rating = getGradeRating(percentage);
                                  return (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 ${rating.bgColor} ${rating.color} rounded-full text-[10px] font-bold`}>
                                      {rating.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] text-slate-500 mb-0.5">النسبة</p>
                                <p className={`font-black text-base ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {percentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ملخص الإجمالي الكلي للموبايل */}
                    <div className="rounded-2xl p-5 bg-slate-900 text-white shadow-lg mt-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">الإجمالي الكلي</p>
                          <p className="text-xl font-black text-white">
                            {Math.round(classroomData.totalStats.earnedTotal * 100) / 100} <span className="text-slate-500 text-sm font-medium">/ {Math.round(classroomData.totalStats.maxTotal)}</span>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 mb-1.5">التقدير العام</p>
                          {(() => {
                            const rating = getGradeRating(classroomData.totalStats.percentage);
                            return (
                              <span className={`inline-flex items-center px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full text-xs font-bold`}>
                                {rating.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-left">
                          <p className="text-2xl font-black text-emerald-400">
                            {classroomData.totalStats.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>);
                })()  
              )}
            </div>
          </div>
        ))}

        {/* تنبيه المواد الراسبة + درجات الرأفة */}
        {(() => {
          // جمع جميع المواد الراسبة من كل الفصول
          const weakSubjects: { contentName: string; classroomName: string; percentage: number }[] = [];
          data.classrooms.forEach(classroomData => {
            if (!classroomData.canView) return;
            classroomData.contents.forEach(content => {
              if (content.grade && content.maxMarks.total > 0) {
                const pct = (content.grade.total / content.maxMarks.total) * 100;
                if (pct < 50) {
                  weakSubjects.push({
                    contentName: content.content.name,
                    classroomName: classroomData.classroom.name,
                    percentage: pct,
                  });
                }
              }
            });
          });

          const hasWeak = weakSubjects.length > 0;
          const hasMercy = mercyGrades.length > 0;

          if (!hasWeak && !hasMercy) return null;

          return (
            <div className={`grid gap-4 sm:gap-6 ${hasWeak && hasMercy ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* المواد الراسبة */}
              {hasWeak && (
                <div className="bg-white border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
                  <div className="flex items-start gap-3 sm:gap-4 mb-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-rose-100">
                      <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">تنبيه بخصوص المواد الراسبة</h3>
                      <p className="text-xs sm:text-sm text-slate-500">لديك {weakSubjects.length} {weakSubjects.length === 1 ? 'مادة' : weakSubjects.length === 2 ? 'مادتان' : weakSubjects.length <= 10 ? 'مواد' : 'مادة'} بتقدير راسب</p>
                    </div>
                  </div>

                  {/* قائمة المواد الراسبة */}
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 mb-5 space-y-2 flex-1 border border-slate-100">
                    {weakSubjects.map((subject, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-800">{subject.contentName}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline-block">({subject.classroomName})</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{subject.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>

                  {/* الرسالة */}
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                    <span className="text-lg">📢</span>
                    <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                      أي مادة تظهر لك بتقدير <span className="font-bold text-rose-600">"راسب"</span> ستتمكن من إعادة اختبارها مرة أخرى في <span className="font-bold text-amber-700">الدور الثاني</span>، وسيكون سعر المادة <span className="font-bold text-emerald-600">100 جنيه</span>، وسيتم إعلانك بجدول الدور الثاني من قبل المركز.
                    </p>
                  </div>
                </div>
              )}

              {/* درجات الرأفة */}
              {hasMercy && (
                <div className="bg-white border border-emerald-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                  <div className="flex items-start gap-3 sm:gap-4 mb-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
                      <GiftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">تم تطبيق درجات الرأفة</h3>
                      <p className="text-xs sm:text-sm text-slate-500">
                        تم إضافة درجات رأفة على {mercyGrades.length}{' '}
                        {mercyGrades.length === 1 ? 'مادة' : mercyGrades.length === 2 ? 'مادتين' : mercyGrades.length <= 10 ? 'مواد' : 'مادة'}
                      </p>
                    </div>
                  </div>

                  {/* قائمة المواد التي تم تطبيق الرأفة عليها */}
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 space-y-2 flex-1 border border-slate-100">
                    {mercyGrades.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <GiftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-800">{item.contentName}</span>
                          {item.classroomName && (
                            <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline-block">({item.classroomName})</span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+{item.addedPoints} درجة</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}


      </div>
    </div>
  );
}
