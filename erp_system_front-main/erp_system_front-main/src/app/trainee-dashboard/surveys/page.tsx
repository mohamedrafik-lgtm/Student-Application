'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { API_BASE_URL } from '@/lib/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface SurveyOption {
  id: string;
  text: string;
  sortOrder: number;
}

interface SurveyQuestion {
  id: string;
  text: string;
  sortOrder: number;
  options: SurveyOption[];
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isAnswered: boolean;
  questions: SurveyQuestion[];
  _count: { questions: number };
}

export default function TraineeSurveysPage() {
  const { profile: traineeData, loading: profileLoading } = useTraineeProfile();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('trainee_token');
      const response = await fetch(`${API_BASE_URL}/surveys/my-surveys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSurveys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSurvey) return;

    // التحقق من إجابة جميع الأسئلة
    const unanswered = selectedSurvey.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`يجب الإجابة على جميع الأسئلة (${unanswered.length} سؤال متبقي)`);
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('trainee_token');

      const response = await fetch(`${API_BASE_URL}/surveys/${selectedSurvey.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, optionId]) => ({
            questionId,
            optionId,
          })),
        }),
      });

      if (response.ok) {
        toast.success('تم إرسال إجاباتك بنجاح، شكراً لمشاركتك!');
        setSelectedSurvey(null);
        setAnswers({});
        loadSurveys();
      } else {
        const err = await response.json();
        toast.error(err.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ في إرسال الإجابات');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (profileLoading) {
    return <LoadingScreen message="جاري تحضير الصفحة..." submessage="لحظات من فضلك" />;
  }

  const availableSurveys = surveys.filter((s) => !s.isAnswered);
  const answeredSurveys = surveys.filter((s) => s.isAnswered);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
        <Link href="/trainee-dashboard" className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الاستبيانات</h1>
          <p className="text-slate-500 text-sm mt-1">شاركنا رأيك لتحسين خدماتنا</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
            <ClipboardDocumentListIcon className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{availableSurveys.length}</p>
            <p className="text-sm font-medium text-slate-500">استبيانات متاحة</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
            <CheckCircleIcon className="w-7 h-7 text-teal-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{answeredSurveys.length}</p>
            <p className="text-sm font-medium text-slate-500">تمت الإجابة عليها</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-600"></div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <ClipboardDocumentListIcon className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-900 text-xl font-bold mb-2">لا توجد استبيانات متاحة حالياً</p>
          <p className="text-slate-500">ستظهر الاستبيانات هنا عند توفرها</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available */}
          {availableSurveys.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                استبيانات تحتاج إجابتك
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSurveys.map((survey) => {
                  const daysLeft = getDaysRemaining(survey.endDate);
                  return (
                    <div
                      key={survey.id}
                      onClick={() => {
                        setSelectedSurvey(survey);
                        setAnswers({});
                      }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500 transform origin-right scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{survey.title}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                          daysLeft <= 3 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <ClockIcon className="w-4 h-4" />
                          {daysLeft <= 0 ? 'آخر يوم' : `${daysLeft} يوم متبقي`}
                        </span>
                      </div>
                      {survey.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 pt-4 border-t border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <ClipboardDocumentListIcon className="w-4 h-4 text-slate-400" />
                          {survey._count.questions} سؤال
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                          حتى {new Date(survey.endDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Answered */}
          {answeredSurveys.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
                تمت الإجابة عليها
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {answeredSurveys.map((survey) => (
                  <div key={survey.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 opacity-80">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircleIcon className="w-5 h-5 text-teal-600" />
                      </div>
                      <h3 className="font-bold text-slate-700 text-lg">{survey.title}</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mr-11">
                      تمت الإجابة • {survey._count.questions} سؤال
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Survey Answer Dialog - Portal based */}
      <Dialog open={!!selectedSurvey} onOpenChange={(open) => { if (!open) { setSelectedSurvey(null); setAnswers({}); } }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 rounded-3xl border-slate-200 overflow-hidden flex flex-col gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">الإجابة على الاستبيان</DialogTitle>
          {selectedSurvey && (
            <>
              {/* Header - Fixed */}
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between flex-shrink-0">
                <div className="pr-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{selectedSurvey.title}</h3>
                  {selectedSurvey.description && (
                    <p className="text-sm sm:text-base text-slate-500 leading-relaxed">{selectedSurvey.description}</p>
                  )}
                </div>
                <button 
                  onClick={() => { setSelectedSurvey(null); setAnswers({}); }} 
                  className="p-2 hover:bg-slate-200 rounded-xl flex-shrink-0 transition-colors bg-white border border-slate-200 shadow-sm"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Questions - Scrollable */}
              <div className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1">
                {selectedSurvey.questions.map((question, qIdx) => (
                  <div key={question.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <p className="font-bold text-slate-900 text-lg mb-5 flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold flex-shrink-0 border border-emerald-100">
                        {qIdx + 1}
                      </span>
                      <span className="pt-1 leading-relaxed">{question.text}</span>
                    </p>
                    <div className="space-y-3 mr-11">
                      {question.options.map((option) => {
                        const isSelected = answers[question.id] === option.id;
                        return (
                          <label
                            key={option.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'border-emerald-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                            </div>
                            <input
                              type="radio"
                              name={question.id}
                              checked={isSelected}
                              onChange={() => setAnswers({ ...answers, [question.id]: option.id })}
                              className="hidden"
                            />
                            <span className={`text-base ${
                              isSelected ? 'font-bold text-emerald-900' : 'font-medium text-slate-700'
                            }`}>
                              {option.text}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer - Fixed */}
              <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex gap-4 flex-shrink-0">
                <button
                  onClick={() => { setSelectedSurvey(null); setAnswers({}); }}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    `إرسال الإجابات (${Object.keys(answers).length}/${selectedSurvey.questions.length})`
                  )}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
