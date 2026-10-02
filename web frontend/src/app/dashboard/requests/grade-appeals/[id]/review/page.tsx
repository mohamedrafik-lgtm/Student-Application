'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { RequirePermission } from '@/components/permissions/PermissionGate';
import {
  FiCheck,
  FiX,
  FiClock,
  FiUser,
  FiArrowRight,
  FiFileText,
  FiBookOpen,
  FiAward,
  FiCheckCircle,
  FiAlertCircle,
  FiBarChart2,
} from 'react-icons/fi';

// أنواع الاختبارات الورقية
const gradeTypeLabels: Record<string, string> = {
  YEAR_WORK: 'أعمال السنة',
  PRACTICAL: 'العملي',
  WRITTEN: 'التحريري',
  FINAL_EXAM: 'الميد تيرم',
};

// حالات ورقة الإجابة
const sheetStatusLabels: Record<string, string> = {
  NOT_SUBMITTED: 'لم تُسلم',
  SUBMITTED: 'تم التسليم',
  GRADED: 'تم التصحيح',
  VERIFIED: 'تم المراجعة',
};

export default function GradeAppealReviewPage() {
  const params = useParams();
  const router = useRouter();
  const appealId = params.id as string;

  const [appeal, setAppeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingSubject, setSubmittingSubject] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    subjectId: string;
    status: 'ACCEPTED' | 'REJECTED';
    subjectName: string;
  } | null>(null);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/grade-appeals/${appealId}/review-data`);
      setAppeal(data);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل بيانات التظلم');
    } finally {
      setLoading(false);
    }
  }, [appealId]);

  useEffect(() => {
    if (appealId) loadData();
  }, [appealId, loadData]);

  // مراجعة مادة
  const handleReviewSubject = async (subjectId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setConfirmAction(null);
    try {
      setSubmittingSubject(subjectId);
      await fetchAPI(`/grade-appeals/subjects/${subjectId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success(
        status === 'ACCEPTED'
          ? 'تم قبول المادة بنجاح'
          : 'تم رفض المادة وتطبيق الرسوم (إن وُجدت)'
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setSubmittingSubject(null);
    }
  };

  // حساب حالة التظلم
  const getAppealStatus = (subjects: any[]) => {
    const allPending = subjects.every((s: any) => s.status === 'PENDING');
    const allAccepted = subjects.every((s: any) => s.status === 'ACCEPTED');
    const allRejected = subjects.every((s: any) => s.status === 'REJECTED');
    const hasPending = subjects.some((s: any) => s.status === 'PENDING');

    if (allPending) return { label: 'قيد المراجعة', color: 'yellow', icon: <FiClock />, isComplete: false };
    if (allAccepted) return { label: 'مقبول بالكامل', color: 'green', icon: <FiCheck />, isComplete: true };
    if (allRejected) return { label: 'مرفوض بالكامل', color: 'red', icon: <FiX />, isComplete: true };
    if (hasPending) return { label: 'مراجعة جزئية', color: 'blue', icon: <FiClock />, isComplete: false };
    return { label: 'مراجعة مكتملة', color: 'emerald', icon: <FiCheckCircle />, isComplete: true };
  };

  // هل انتهت المراجعة؟
  const isReviewComplete = appeal?.subjects?.every((s: any) => s.status !== 'PENDING') ?? false;

  // هل يوجد درجات إضافية (أي مادة مقبولة)
  const hasAcceptedSubjects = appeal?.subjects?.some((s: any) => s.status === 'ACCEPTED') ?? false;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-tiba-primary-200 border-t-tiba-primary-600"></div>
          <p className="text-slate-600 font-medium text-lg">جاري تحميل بيانات المراجعة...</p>
        </div>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">لم يتم العثور على التظلم</h2>
          <Button onClick={() => router.back()} className="mt-4">
            <FiArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const subjects = appeal.subjects || [];
  const currentSubject = subjects[activeSubjectIndex];
  const appealStatus = getAppealStatus(subjects);

  return (
    <RequirePermission resource="dashboard.grade-appeals" action="review">
      <div className="min-h-screen bg-slate-50/50">
        {/* الشريط العلوي */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard/requests/grade-appeals')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="العودة لقائمة التظلمات"
                >
                  <FiArrowRight className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">مراجعة التظلم</h1>
                  <p className="text-xs text-slate-500">
                    {appeal.trainee?.nameAr} — {appeal.trainee?.nationalId}
                  </p>
                </div>
              </div>

              {/* حالة التظلم */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                appealStatus.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                appealStatus.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                appealStatus.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                appealStatus.color === 'blue' ? 'bg-tiba-primary-50 text-tiba-primary-700 border-tiba-primary-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {appealStatus.icon}
                {appealStatus.label}
              </div>
            </div>
          </div>
        </div>

        {/* رسالة انتهاء المراجعة */}
        {isReviewComplete && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
            <div className={`rounded-2xl p-6 border ${
              hasAcceptedSubjects
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  hasAcceptedSubjects ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  <FiCheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-semibold ${
                    hasAcceptedSubjects ? 'text-emerald-900' : 'text-amber-900'
                  }`}>
                    انتهت إعادة التصحيح
                  </h2>
                  <p className={`text-sm mt-1 ${
                    hasAcceptedSubjects ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {hasAcceptedSubjects
                      ? `تم قبول ${subjects.filter((s: any) => s.status === 'ACCEPTED').length} ${subjects.filter((s: any) => s.status === 'ACCEPTED').length === 1 ? 'مادة' : 'مواد'} من أصل ${subjects.length}`
                      : 'لا يوجد أي درجات إضافية للمتدرب'
                    }
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/dashboard/requests/grade-appeals')}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  <FiArrowRight className="w-4 h-4 ml-2" />
                  العودة للقائمة
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* الشريط الجانبي — بيانات المتدرب + قائمة المواد */}
            <div className="lg:col-span-4 space-y-4">
              {/* بطاقة المتدرب */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-tiba-primary-600 to-indigo-600 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-white min-w-0">
                      <p className="font-semibold text-base truncate">{appeal.trainee?.nameAr}</p>
                      <p className="text-tiba-primary-200 text-xs">{appeal.trainee?.program?.nameAr}</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">الرقم القومي</span>
                    <span className="font-semibold text-slate-800 font-mono">{appeal.trainee?.nationalId}</span>
                  </div>
                  {appeal.trainee?.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">الهاتف</span>
                      <span className="font-semibold text-slate-800 font-mono">{appeal.trainee?.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">تاريخ التظلم</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(appeal.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  {appeal.traineeNotes && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500 font-semibold mb-1">ملاحظات المتدرب:</p>
                      <p className="text-xs text-slate-700 bg-amber-50 rounded-lg p-2 border border-amber-100">
                        {appeal.traineeNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* قائمة المواد المتظلم منها */}
              <Card className="overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FiBookOpen className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold text-sm text-slate-800">
                      المواد المتظلم منها ({subjects.length})
                    </h3>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {subjects.map((subject: any, index: number) => {
                    const isActive = index === activeSubjectIndex;
                    const statusColor =
                      subject.status === 'PENDING' ? 'yellow' :
                      subject.status === 'ACCEPTED' ? 'green' : 'red';
                    const statusIcon =
                      subject.status === 'PENDING' ? <FiClock className="w-3 h-3" /> :
                      subject.status === 'ACCEPTED' ? <FiCheck className="w-3 h-3" /> :
                      <FiX className="w-3 h-3" />;

                    return (
                      <button
                        key={subject.id}
                        onClick={() => setActiveSubjectIndex(index)}
                        className={`w-full text-right px-4 py-3 transition-all ${
                          isActive
                            ? 'bg-tiba-primary-50 border-r-4 border-r-tiba-primary-500'
                            : 'hover:bg-slate-50 border-r-4 border-r-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                            isActive ? 'bg-tiba-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-tiba-primary-900' : 'text-slate-800'}`}>
                              {subject.content?.name}
                            </p>
                            <p className="text-xs text-slate-400">{subject.content?.code}</p>
                          </div>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                            statusColor === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            statusColor === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {statusIcon}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ملخص المراجعة */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <FiClock className="w-3 h-3" />
                      {subjects.filter((s: any) => s.status === 'PENDING').length} منتظر
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <FiCheck className="w-3 h-3" />
                      {subjects.filter((s: any) => s.status === 'ACCEPTED').length} مقبول
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                      <FiX className="w-3 h-3" />
                      {subjects.filter((s: any) => s.status === 'REJECTED').length} مرفوض
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* المحتوى الرئيسي — تفاصيل المادة المختارة */}
            <div className="lg:col-span-8 space-y-4">
              {currentSubject && (
                <>
                  {/* رأس المادة */}
                  <Card className="overflow-hidden">
                    <div className={`px-5 py-4 ${
                      currentSubject.status === 'PENDING' ? 'bg-gradient-to-l from-amber-50 to-white border-b border-amber-200' :
                      currentSubject.status === 'ACCEPTED' ? 'bg-gradient-to-l from-emerald-50 to-white border-b border-emerald-200' :
                      'bg-gradient-to-l from-red-50 to-white border-b border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            currentSubject.status === 'PENDING' ? 'bg-amber-500' :
                            currentSubject.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            <FiFileText className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">{currentSubject.content?.name}</h2>
                            <p className="text-xs text-slate-500">
                              كود المادة: {currentSubject.content?.code}
                              {currentSubject.content?.classroom?.name && (
                                <> — الفصل: {currentSubject.content.classroom.name}</>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* أزرار المراجعة */}
                        {currentSubject.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() =>
                                setConfirmAction({
                                  subjectId: currentSubject.id,
                                  status: 'ACCEPTED',
                                  subjectName: currentSubject.content?.name,
                                })
                              }
                              disabled={submittingSubject === currentSubject.id}
                              className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 text-sm font-semibold rounded-xl"
                            >
                              <FiCheck className="w-4 h-4 ml-1.5" />
                              قبول المادة
                            </Button>
                            <Button
                              onClick={() =>
                                setConfirmAction({
                                  subjectId: currentSubject.id,
                                  status: 'REJECTED',
                                  subjectName: currentSubject.content?.name,
                                })
                              }
                              disabled={submittingSubject === currentSubject.id}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 text-sm font-semibold rounded-xl"
                            >
                              <FiX className="w-4 h-4 ml-1.5" />
                              رفض المادة
                            </Button>
                          </div>
                        )}

                        {currentSubject.status !== 'PENDING' && (
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${
                            currentSubject.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {currentSubject.status === 'ACCEPTED' ? <FiCheck className="w-4 h-4" /> : <FiX className="w-4 h-4" />}
                            {currentSubject.status === 'ACCEPTED' ? 'تم القبول' : 'تم الرفض'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* بطاقة الدرجة عند التظلم */}
                  <Card className="overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <FiAward className="w-4 h-4 text-slate-500" />
                        <h3 className="font-semibold text-sm text-slate-800">الدرجة وقت التظلم</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-tiba-primary-50 rounded-xl border border-tiba-primary-100">
                          <p className="text-xs text-tiba-primary-600 font-medium mb-1">الدرجة الحالية</p>
                          <p className="text-2xl font-bold text-tiba-primary-800">
                            {currentSubject.currentScore}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500 font-medium mb-1">الدرجة الكاملة</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {currentSubject.maxScore}
                          </p>
                        </div>
                        <div className={`text-center p-3 rounded-xl border ${
                          currentSubject.percentage >= 50
                            ? 'bg-emerald-50 border-emerald-100'
                            : 'bg-red-50 border-red-100'
                        }`}>
                          <p className={`text-xs font-medium mb-1 ${
                            currentSubject.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'
                          }`}>النسبة المئوية</p>
                          <p className={`text-2xl font-bold ${
                            currentSubject.percentage >= 50 ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {currentSubject.percentage?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* تفاصيل الدرجات في النظام */}
                  {currentSubject.traineeGrades && (
                    <Card className="overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <FiBarChart2 className="w-4 h-4 text-slate-500" />
                          <h3 className="font-semibold text-sm text-slate-800">تفاصيل الدرجات في النظام</h3>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {[
                            { label: 'أعمال السنة', value: currentSubject.traineeGrades.yearWorkMarks, color: 'emerald' },
                            { label: 'العملي', value: currentSubject.traineeGrades.practicalMarks, color: 'blue' },
                            { label: 'التحريري', value: currentSubject.traineeGrades.writtenMarks, color: 'purple' },
                            { label: 'الحضور', value: currentSubject.traineeGrades.attendanceMarks, color: 'teal' },
                            { label: 'الاختبارات المصغرة', value: currentSubject.traineeGrades.quizzesMarks, color: 'orange' },
                            { label: 'الميد تيرم', value: currentSubject.traineeGrades.finalExamMarks, color: 'rose' },
                          ].map((grade, i) => (
                            <div key={i} className="text-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[10px] text-slate-500 font-medium mb-1">{grade.label}</p>
                              <p className="text-lg font-bold text-slate-800">{grade.value ?? 0}</p>
                            </div>
                          ))}
                          <div className="text-center p-2.5 bg-tiba-primary-50 rounded-lg border border-tiba-primary-200 col-span-2">
                            <p className="text-[10px] text-tiba-primary-600 font-semibold mb-1">المجموع الكلي</p>
                            <p className="text-xl font-bold text-tiba-primary-800">{currentSubject.traineeGrades.totalMarks ?? 0}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* الاختبارات الورقية */}
                  <Card className="overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiFileText className="w-4 h-4 text-slate-500" />
                          <h3 className="font-semibold text-sm text-slate-800">
                            الاختبارات الورقية ({currentSubject.paperExams?.length || 0})
                          </h3>
                        </div>
                      </div>
                    </div>
                    {currentSubject.paperExams && currentSubject.paperExams.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {currentSubject.paperExams.map((exam: any) => {
                          const sheet = exam.answerSheets?.[0];
                          return (
                            <div key={exam.id} className="px-5 py-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                    sheet?.passed ? 'bg-emerald-100 text-emerald-600' :
                                    sheet?.passed === false ? 'bg-red-100 text-red-600' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {sheet?.passed ? <FiCheck className="w-4 h-4" /> :
                                     sheet?.passed === false ? <FiX className="w-4 h-4" /> :
                                     <FiFileText className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">
                                        {gradeTypeLabels[exam.gradeType] || exam.gradeType}
                                      </span>
                                      <span>•</span>
                                      <span>{new Date(exam.examDate).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* حالة ورقة الإجابة */}
                                {sheet ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
                                    sheet.status === 'GRADED' || sheet.status === 'VERIFIED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : sheet.status === 'SUBMITTED'
                                      ? 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {sheetStatusLabels[sheet.status] || sheet.status}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                    لا توجد ورقة إجابة
                                  </span>
                                )}
                              </div>

                              {/* درجات الاختبار */}
                              {sheet && (sheet.status === 'GRADED' || sheet.status === 'VERIFIED') && (
                                <div className="grid grid-cols-4 gap-2 mt-2 bg-slate-50 rounded-xl p-3">
                                  <div className="text-center">
                                    <p className="text-[10px] text-slate-400 mb-0.5">الدرجة</p>
                                    <p className="text-sm font-bold text-slate-800">{sheet.score ?? '-'}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-slate-400 mb-0.5">الكاملة</p>
                                    <p className="text-sm font-bold text-slate-800">{sheet.totalPoints ?? exam.totalMarks}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-slate-400 mb-0.5">النسبة</p>
                                    <p className={`text-sm font-bold ${
                                      (sheet.percentage ?? 0) >= 50 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                      {sheet.percentage?.toFixed(1) ?? '-'}%
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-slate-400 mb-0.5">النتيجة</p>
                                    <p className={`text-sm font-bold ${sheet.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {sheet.passed ? 'ناجح' : 'راسب'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FiFileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">لا توجد اختبارات ورقية لهذه المادة</p>
                      </div>
                    )}
                  </Card>

                  {/* تنبيه الرسوم */}
                  {currentSubject.status === 'PENDING' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <p className="text-xs text-orange-800">
                        <FiAlertCircle className="w-3.5 h-3.5 inline ml-1" />
                        <span className="font-bold">تنبيه:</span> عند رفض هذه المادة سيتم تطبيق رسوم التظلم تلقائياً (إن كان القيد المالي مُعداً للبرنامج).
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* مودال التأكيد */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-scale-in">
              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  confirmAction.status === 'ACCEPTED' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {confirmAction.status === 'ACCEPTED'
                    ? <FiCheck className="w-7 h-7 text-emerald-600" />
                    : <FiX className="w-7 h-7 text-red-600" />
                  }
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {confirmAction.status === 'ACCEPTED' ? 'تأكيد قبول المادة' : 'تأكيد رفض المادة'}
                </h3>
                <p className="text-sm text-slate-600 mb-1">
                  المادة: <span className="font-semibold text-slate-900">{confirmAction.subjectName}</span>
                </p>
                <p className="text-sm text-slate-500 mb-5">
                  {confirmAction.status === 'ACCEPTED'
                    ? 'سيتم قبول التظلم على هذه المادة بدون رسوم.'
                    : <span className="text-red-600 font-medium">سيتم رفض التظلم وتطبيق رسوم التظلم على هذه المادة (إن وُجدت).</span>
                  }
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={() => handleReviewSubject(confirmAction.subjectId, confirmAction.status)}
                    disabled={submittingSubject === confirmAction.subjectId}
                    className={`flex-1 px-4 py-2.5 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 ${
                      confirmAction.status === 'ACCEPTED'
                        ? 'bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {submittingSubject === confirmAction.subjectId ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      confirmAction.status === 'ACCEPTED' ? 'نعم، قبول' : 'نعم، رفض'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
