'use client';

import { useEffect, useState } from 'react';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BookOpenIcon,
  LockClosedIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AppealSubject {
  id: string;
  contentId: number;
  currentScore: number;
  maxScore: number;
  percentage: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  content: {
    id: number;
    name: string;
    code: string;
  };
}

interface Appeal {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  traineeNotes: string | null;
  adminResponse: string | null;
  createdAt: string;
  reviewedAt: string | null;
  subjects: AppealSubject[];
  reviewer: { id: string; name: string } | null;
}

export default function TraineeAppealsPage() {
  const { profile: traineeData, loading: profileLoading } = useTraineeProfile();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [releasedData, setReleasedData] = useState<any>(null);

  // حالة تقديم تظلم جديد
  const [showForm, setShowForm] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [appealNotes, setAppealNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [appealsOpen, setAppealsOpen] = useState<boolean>(true);

  // إخفاء الإشعار تلقائياً بعد 8 ثوانٍ
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (traineeData?.trainee?.id) {
      fetchAppeals();
      fetchReleasedGrades();
      fetchAppealsStatus();
    }
  }, [traineeData]);

  const fetchAppealsStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals/appeals-status`
      );
      if (response.ok) {
        const data = await response.json();
        setAppealsOpen(data.acceptGradeAppeals ?? true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals/my-appeals`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('trainee_token')}` } }
      );
      if (response.ok) {
        setAppeals(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReleasedGrades = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trainee-grades/${traineeData?.trainee?.id}/released`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('trainee_token')}` } }
      );
      if (response.ok) {
        setReleasedData(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // جمع جميع المواد مع درجاتها
  const getAllSubjects = () => {
    if (!releasedData) return [];
    const subjects: { contentId: number; contentName: string; classroomName: string; currentScore: number; maxScore: number; percentage: number }[] = [];
    releasedData.classrooms?.forEach((cd: any) => {
      if (!cd.canView) return;
      cd.contents?.forEach((content: any) => {
        if (content.grade && content.maxMarks.total > 0) {
          subjects.push({
            contentId: content.content.id,
            contentName: content.content.name,
            classroomName: cd.classroom.name,
            currentScore: content.grade.total,
            maxScore: content.maxMarks.total,
            percentage: (content.grade.total / content.maxMarks.total) * 100,
          });
        }
      });
    });
    return subjects;
  };

  const hasExistingAppeal = (contentId: number): false | Appeal['status'] => {
    const found = appeals.find(a =>
      a.subjects?.some(s => s.contentId === contentId)
    );
    return found ? found.status : false;
  };

  const canCancelAppeal = (appeal: Appeal) => {
    const allPending = appeal.subjects.every(s => s.status === 'PENDING');
    if (!allPending) return false;
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(appeal.createdAt).getTime();
    return elapsed <= sixHoursMs;
  };

  const getRemainingCancelTime = (appeal: Appeal): string | null => {
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(appeal.createdAt).getTime();
    const remaining = sixHoursMs - elapsed;
    if (remaining <= 0) return null;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
    return `${minutes} دقيقة`;
  };

  const handleCancelAppeal = async (appealId: string) => {
    setConfirmCancelId(null);
    try {
      setCancellingId(appealId);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals/my-appeals/${appealId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('trainee_token')}` },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'فشل في إلغاء التظلم');
      }
      fetchAppeals();
      setToast({ type: 'success', message: 'تم إلغاء التظلم بنجاح.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'حدث خطأ أثناء إلغاء التظلم' });
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedSubjects.size === 0) return;
    const allSubjects = getAllSubjects();
    const subjects = allSubjects.filter(s => selectedSubjects.has(String(s.contentId)));

    try {
      setSubmitting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grade-appeals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('trainee_token')}`,
          },
          body: JSON.stringify({
            subjects: subjects.map(s => ({
              contentId: s.contentId,
              currentScore: s.currentScore,
              maxScore: s.maxScore,
              percentage: s.percentage,
            })),
            traineeNotes: appealNotes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'فشل في تقديم التظلم');
      }

      setShowForm(false);
      setSelectedSubjects(new Set());
      setAppealNotes('');
      fetchAppeals();
      setToast({ type: 'success', message: 'تم تقديم التظلم بنجاح. يمكنك إلغاء التظلم خلال 6 ساعات من الآن فقط، بعد ذلك لن تتمكن من الإلغاء.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'حدث خطأ أثناء تقديم التظلم' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-xs font-bold">
            <ClockIcon className="w-3.5 h-3.5" /> قيد المراجعة
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-xs font-bold">
            <CheckCircleIcon className="w-3.5 h-3.5" /> مقبول
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-xs font-bold">
            <XCircleIcon className="w-3.5 h-3.5" /> مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  if (loading || profileLoading) {
    return <LoadingScreen message="جاري تحميل التظلمات..." submessage="نجهز لك بيانات التظلمات" />;
  }

  // التحقق من وجود نتائج معلنة
  const hasReleasedGrades = getAllSubjects().length > 0;

  if (!hasReleasedGrades && appeals.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <LockClosedIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">التظلمات غير متاحة حالياً</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">لا توجد نتائج دراسية معلنة حالياً. سيتم تفعيل صفحة التظلمات تلقائياً بعد إعلان النتائج.</p>
          <a
            href="/trainee-dashboard/released-grades"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            <ChartBarIcon className="w-5 h-5" />
            الذهاب للنتائج الدراسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] animate-slide-in-top ${
            toast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm'
              : 'bg-rose-50 border border-rose-200 text-rose-800 shadow-sm'
          } rounded-lg px-4 py-3 flex items-start gap-3 backdrop-blur-sm`}>
            {toast.type === 'success'
              ? <CheckCircleIcon className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              : <XCircleIcon className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            }
            <p className="text-sm font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 transition-colors p-1">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">تظلمات الدرجات</h1>
                <p className="text-sm text-slate-500">تقديم ومتابعة طلبات التظلم على الدرجات</p>
              </div>
            </div>
            
            {appealsOpen ? (
              <button
                onClick={() => setShowForm(!showForm)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-lg transition-colors w-full sm:w-auto whitespace-nowrap ${
                  showForm 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {showForm ? 'إلغاء التقديم' : '+ تقديم تظلم جديد'}
              </button>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold text-sm rounded-lg border border-slate-200 w-full sm:w-auto whitespace-nowrap">
                <LockClosedIcon className="w-4 h-4" />
                باب التظلمات مغلق
              </span>
            )}
          </div>

          {/* تنبيه إغلاق التظلمات */}
          {!appealsOpen && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <LockClosedIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-800 leading-relaxed font-medium">
                تقديم التظلمات مغلق حالياً من قبل الإدارة. يرجى التواصل مع الإدارة للاستفسار.
              </p>
            </div>
          )}

          {/* التنبيه المالي */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <span className="text-lg leading-none">📌</span>
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">تنبيه مهم:</span> في حال قبول التظلم ووجود درجات مستحقة إضافية بعد إعادة التصحيح يكون التظلم <span className="font-bold text-emerald-700">مجاني</span>. في حال عدم وجود أي درجات إضافية ستُطبق رسوم <span className="font-bold text-rose-700">50 جنيه</span> مصروفات تظلم لكل مادة.
            </p>
          </div>
        </div>

        {/* نموذج تقديم تظلم جديد */}
        {showForm && appealsOpen && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <BookOpenIcon className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">نموذج تقديم تظلم جديد</h2>
            </div>

            {getAllSubjects().length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <p className="text-sm text-slate-500">لا توجد مواد متاحة للتظلم. تأكد من إعلان النتائج أولاً.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    اختر المواد المراد التظلم عليها <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAllSubjects().map((subject) => {
                      const key = String(subject.contentId);
                      const isSelected = selectedSubjects.has(key);
                      const appealStatus = hasExistingAppeal(subject.contentId);
                      const isDisabled = !!appealStatus;
                      const statusLabel = appealStatus === 'PENDING' ? 'قيد المراجعة'
                        : appealStatus === 'ACCEPTED' ? 'مقبول'
                        : appealStatus === 'REJECTED' ? 'مرفوض' : '';
                      const statusColor = appealStatus === 'PENDING' ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : appealStatus === 'ACCEPTED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : appealStatus === 'REJECTED' ? 'text-rose-700 bg-rose-50 border-rose-200' : '';
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                            isDisabled ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-75' :
                            isSelected ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500 cursor-pointer' : 'bg-white border-slate-200 hover:border-emerald-300 cursor-pointer'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => {
                                if (isDisabled) return;
                                const newSet = new Set(selectedSubjects);
                                if (isSelected) newSet.delete(key); else newSet.add(key);
                                setSelectedSubjects(newSet);
                              }}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 disabled:opacity-50"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{subject.contentName}</p>
                            <p className="text-xs text-slate-500 mt-1">{subject.classroomName}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700">{subject.currentScore}/{subject.maxScore}</span>
                                <span className={`text-xs font-bold ${subject.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({subject.percentage.toFixed(1)}%)
                                </span>
                              </div>
                              {isDisabled && <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{statusLabel}</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={appealNotes}
                    onChange={(e) => setAppealNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك أو توضيحات إضافية هنا..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none min-h-[100px]"
                  />
                </div>

                {selectedSubjects.size > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 leading-relaxed">
                      <span className="font-bold">عدد المواد المختارة:</span> {selectedSubjects.size} {selectedSubjects.size === 1 ? 'مادة' : selectedSubjects.size === 2 ? 'مادتان' : 'مواد'}
                      <br />
                      <span className="font-bold">الرسوم المحتملة (في حال عدم وجود درجات إضافية):</span> <span className="text-rose-600 font-bold">{selectedSubjects.size * 50} جنيه</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSubmit}
                    disabled={selectedSubjects.size === 0 || submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-lg transition-colors w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري التقديم...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4 rotate-180" />
                        تأكيد وتقديم التظلم
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* قائمة التظلمات */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-slate-500" />
            تظلماتي ({appeals.length})
          </h3>

          {appeals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <DocumentTextIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">لم تقم بتقديم أي تظلم بعد</p>
            </div>
          ) : (
            appeals.map((appeal) => (
              <div key={appeal.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* رأس التظلم */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(appeal.status)}
                    <span className="text-sm text-slate-500 font-medium">
                      {new Date(appeal.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 font-medium">
                      {appeal.subjects.length} {appeal.subjects.length === 1 ? 'مادة' : appeal.subjects.length === 2 ? 'مادتان' : 'مواد'}
                    </span>
                    {canCancelAppeal(appeal) && (
                      <button
                        onClick={() => setConfirmCancelId(appeal.id)}
                        disabled={cancellingId === appeal.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        {cancellingId === appeal.id ? 'جاري الإلغاء...' : 'إلغاء التظلم'}
                      </button>
                    )}
                  </div>
                </div>

                {/* رسالة مهلة الإلغاء */}
                {appeal.subjects.every(s => s.status === 'PENDING') && (() => {
                  const remaining = getRemainingCancelTime(appeal);
                  return remaining ? (
                    <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100">
                      <p className="text-xs text-amber-800 font-medium">
                        <ClockIcon className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                        يمكنك إلغاء هذا التظلم خلال <span className="font-bold">{remaining}</span> فقط. بعد ذلك لن تتمكن من الإلغاء.
                      </p>
                    </div>
                  ) : (
                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">
                        <ClockIcon className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                        انتهت مهلة إلغاء التظلم (6 ساعات من تاريخ التقديم).
                      </p>
                    </div>
                  );
                })()}

                {/* المواد */}
                <div className="p-5 space-y-3">
                  {appeal.subjects.map((subject) => {
                    const subjectStatusBg = subject.status === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200'
                      : subject.status === 'REJECTED' ? 'bg-rose-50 border-rose-200'
                      : 'bg-slate-50 border-slate-200';
                    const subjectBadge = subject.status === 'ACCEPTED'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-bold"><CheckCircleIcon className="w-3.5 h-3.5" /> مقبول</span>
                      : subject.status === 'REJECTED'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-xs font-bold"><XCircleIcon className="w-3.5 h-3.5" /> مرفوض</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold"><ClockIcon className="w-3.5 h-3.5" /> قيد المراجعة</span>;
                    return (
                      <div key={subject.id} className={`p-4 border rounded-lg ${subjectStatusBg}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-sm font-bold text-slate-900">{subject.content.name}</p>
                              {subjectBadge}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{subject.content.code}</p>
                          </div>
                          <div className="flex items-center gap-3 sm:text-left">
                            <p className="text-sm font-bold text-slate-700">{subject.currentScore}/{subject.maxScore}</p>
                            <p className={`text-sm font-bold ${subject.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ({subject.percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        {subject.status === 'REJECTED' && (
                          <div className="mt-3 p-3 bg-rose-100/50 border border-rose-200 rounded-lg">
                            <p className="text-sm text-rose-800 leading-relaxed">
                              <XCircleIcon className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                              <span className="font-bold">نتيجة المراجعة:</span> تم إعادة تصحيح المادة ولم يُوجد أي درجات إضافية مستحقة. تم تطبيق رسوم التظلم على حسابك المالي.
                            </p>
                          </div>
                        )}
                        {subject.status === 'ACCEPTED' && (
                          <div className="mt-3 p-3 bg-emerald-100/50 border border-emerald-200 rounded-lg">
                            <p className="text-sm text-emerald-800 leading-relaxed">
                              <CheckCircleIcon className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                              <span className="font-bold">نتيجة المراجعة:</span> تم قبول التظلم وإعادة تقييم الدرجة. التظلم مجاني.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ملاحظات المتدرب */}
                  {appeal.traineeNotes && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-xs font-bold text-slate-700 mb-1.5">ملاحظاتي:</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{appeal.traineeNotes}</p>
                    </div>
                  )}

                  {/* رد الإدارة */}
                  {appeal.adminResponse && (
                    <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-bold text-emerald-800 mb-1.5">رد الإدارة:</p>
                      <p className="text-sm text-emerald-900 leading-relaxed">{appeal.adminResponse}</p>
                      {appeal.reviewer && (
                        <p className="text-xs text-emerald-600 mt-2 font-medium">
                          بواسطة: {appeal.reviewer.name}
                          {appeal.reviewedAt && ` - ${new Date(appeal.reviewedAt).toLocaleDateString('ar-EG')}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirm Cancel Modal */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                <ExclamationTriangleIcon className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">تأكيد إلغاء التظلم</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                هل أنت متأكد من إلغاء هذا التظلم؟
                <br />
                <span className="text-rose-600 font-semibold">لن تتمكن من استرجاعه بعد الإلغاء.</span>
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setConfirmCancelId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
                >
                  تراجع
                </button>
                <button
                  onClick={() => handleCancelAppeal(confirmCancelId)}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  نعم، إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
