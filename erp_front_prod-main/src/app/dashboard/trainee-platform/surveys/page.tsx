'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  PlayCircleIcon,
  StopCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';

export default function AdminSurveysPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.surveys', action: 'view' }}>
      <SurveysContent />
    </ProtectedPage>
  );
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  allPrograms: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  programs: { program: { id: number; nameAr: string } }[];
  _count: { responses: number; questions: number };
  createdBy?: { name: string };
}

interface Program {
  id: number;
  nameAr: string;
}

interface QuestionForm {
  text: string;
  options: { text: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  active: { label: 'فعّال', color: 'text-green-800', bgColor: 'bg-green-100', borderColor: 'border-green-300', icon: CheckCircleIcon },
  paused: { label: 'متوقف', color: 'text-gray-800', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', icon: PauseCircleIcon },
  upcoming: { label: 'لم يبدأ', color: 'text-blue-800', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', icon: ClockIcon },
  expired: { label: 'منتهي', color: 'text-red-800', bgColor: 'bg-red-100', borderColor: 'border-red-300', icon: XCircleIcon },
};

function SurveysContent() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    allPrograms: true,
    programIds: [] as number[],
    startDate: '',
    endDate: '',
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { text: '', options: [{ text: '' }, { text: '' }] },
  ]);

  useEffect(() => {
    loadSurveys();
    loadPrograms();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/surveys');
      setSurveys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading surveys:', error);
      toast.error('حدث خطأ في تحميل الاستبيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/training-programs');
      setPrograms(Array.isArray(data) ? data : data?.programs || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const data = await fetchAPI(`/surveys/${id}`);
      setSelectedSurvey(data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('حدث خطأ في تحميل التفاصيل');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await fetchAPI(`/surveys/${id}/toggle`, { method: 'PUT' });
      toast.success('تم تحديث الحالة');
      loadSurveys();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاستبيان؟ سيتم حذف جميع الإجابات المرتبطة.')) return;
    try {
      await fetchAPI(`/surveys/${id}`, { method: 'DELETE' });
      toast.success('تم حذف الاستبيان');
      loadSurveys();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: [{ text: '' }, { text: '' }] }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].text = text;
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push({ text: '' });
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    if (questions[qIdx].options.length <= 2) return;
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx].text = text;
    setQuestions(updated);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', allPrograms: true, programIds: [], startDate: '', endDate: '' });
    setQuestions([{ text: '', options: [{ text: '' }, { text: '' }] }]);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return toast.error('عنوان الاستبيان مطلوب');
    if (!formData.startDate || !formData.endDate) return toast.error('يجب تحديد فترة الاستبيان');
    if (!formData.allPrograms && formData.programIds.length === 0) return toast.error('يجب اختيار برنامج واحد على الأقل');

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) return toast.error(`السؤال ${i + 1} فارغ`);
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].text.trim()) return toast.error(`الخيار ${j + 1} في السؤال ${i + 1} فارغ`);
      }
    }

    try {
      setSubmitting(true);
      await fetchAPI('/surveys', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          questions: questions.map((q, qIdx) => ({
            text: q.text,
            sortOrder: qIdx,
            options: q.options.map((o, oIdx) => ({ text: o.text, sortOrder: oIdx })),
          })),
        }),
      });
      toast.success('تم إنشاء الاستبيان بنجاح');
      setShowCreateModal(false);
      resetForm();
      loadSurveys();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusKey = (survey: Survey): string => {
    const now = new Date();
    if (!survey.isActive) return 'paused';
    if (new Date(survey.startDate) > now) return 'upcoming';
    if (new Date(survey.endDate) < now) return 'expired';
    return 'active';
  };

  const filteredSurveys = useMemo(() => {
    let result = surveys;
    if (filterStatus !== 'ALL') {
      result = result.filter((s) => getStatusKey(s) === filterStatus);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.createdBy?.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [surveys, filterStatus, searchQuery]);

  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => getStatusKey(s) === 'active').length,
    totalResponses: surveys.reduce((sum, s) => sum + s._count.responses, 0),
    totalQuestions: surveys.reduce((sum, s) => sum + s._count.questions, 0),
    paused: surveys.filter((s) => getStatusKey(s) === 'paused').length,
    expired: surveys.filter((s) => getStatusKey(s) === 'expired').length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">إدارة الاستبيانات</h1>
          <p className="text-sm sm:text-base text-gray-600">إنشاء وإدارة استطلاعات الرأي للمتدربين</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl transition-all font-bold text-sm flex items-center gap-2 shadow-lg self-start sm:self-auto"
        >
          <PlusIcon className="w-5 h-5" />
          استبيان جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 border shadow-sm hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-xs sm:text-sm text-gray-600">إجمالي الاستبيانات</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 sm:p-5 border-2 border-green-200 hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">{stats.active}</p>
          <p className="text-xs sm:text-sm text-green-700 font-medium">فعّال الآن</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 sm:p-5 border-2 border-orange-200 hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-orange-700 mb-1">{stats.totalResponses}</p>
          <p className="text-xs sm:text-sm text-orange-700 font-medium">إجمالي الإجابات</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 sm:p-5 border-2 border-blue-200 hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">{stats.totalQuestions}</p>
          <p className="text-xs sm:text-sm text-blue-700 font-medium">إجمالي الأسئلة</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border-2 border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-gray-700 mb-1">{stats.paused}</p>
          <p className="text-xs sm:text-sm text-gray-700 font-medium">متوقف</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 sm:p-5 border-2 border-red-200 hover:shadow-md transition-shadow">
          <p className="text-2xl sm:text-3xl font-bold text-red-700 mb-1">{stats.expired}</p>
          <p className="text-xs sm:text-sm text-red-700 font-medium">منتهي</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border shadow-sm space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بعنوان الاستبيان أو المنشئ..."
            className="w-full pr-10 pl-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-gray-700">الحالة:</span>
          {[
            { key: 'ALL', label: 'الكل' },
            { key: 'active', label: '✅ فعّال' },
            { key: 'paused', label: '⏸️ متوقف' },
            { key: 'upcoming', label: '⏳ لم يبدأ' },
            { key: 'expired', label: '🔴 منتهي' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filterStatus === s.key
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="mb-4 text-xs sm:text-sm text-gray-600">
          وجد {filteredSurveys.length} نتيجة للبحث &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="bg-white rounded-xl p-12 sm:p-16 text-center border">
          <ClipboardDocumentListIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-base sm:text-lg">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد استبيانات بعد'}
          </p>
          {!searchQuery && (
            <p className="text-gray-400 text-sm mt-2">اضغط على &quot;استبيان جديد&quot; لإنشاء استطلاع رأي</p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الاستبيان</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">البرامج</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الفترة</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الأسئلة</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الإجابات</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الحالة</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSurveys.map((survey, index) => {
                    const statusKey = getStatusKey(survey);
                    const statusConfig = STATUS_CONFIG[statusKey];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={survey.id} className={`hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-amber-600">
                              <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate max-w-[220px]">{survey.title}</p>
                              {survey.description && (
                                <p className="text-xs text-gray-500 truncate max-w-[220px]">{survey.description}</p>
                              )}
                              {survey.createdBy && (
                                <p className="text-xs text-gray-400">بواسطة: {survey.createdBy.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            survey.allPrograms
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            {survey.allPrograms ? 'جميع البرامج' : `${survey.programs.length} برنامج`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-xs text-gray-600">
                            <p>{new Date(survey.startDate).toLocaleDateString('ar-EG')}</p>
                            <p className="text-gray-400">إلى</p>
                            <p>{new Date(survey.endDate).toLocaleDateString('ar-EG')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm">
                            {survey._count.questions}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold text-sm">
                            {survey._count.responses}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 ${statusConfig.bgColor} ${statusConfig.color} rounded-full text-sm font-bold border-2 ${statusConfig.borderColor}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => viewDetail(survey.id)}
                              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-bold text-sm flex items-center gap-1.5 border-2 border-blue-200"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                              النتائج
                            </button>
                            <button
                              onClick={() => handleToggle(survey.id)}
                              className={`p-2 rounded-lg transition-colors border ${
                                survey.isActive
                                  ? 'hover:bg-yellow-100 text-yellow-600 border-yellow-200'
                                  : 'hover:bg-green-100 text-green-600 border-green-200'
                              }`}
                              title={survey.isActive ? 'إيقاف' : 'تفعيل'}
                            >
                              {survey.isActive ? <PauseCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(survey.id)}
                              className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors border border-red-200"
                              title="حذف"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredSurveys.map((survey) => {
              const statusKey = getStatusKey(survey);
              const statusConfig = STATUS_CONFIG[statusKey];
              const StatusIcon = statusConfig.icon;
              return (
                <div key={survey.id} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-600">
                      <ClipboardDocumentListIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{survey.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {survey.allPrograms ? 'جميع البرامج' : `${survey.programs.length} برنامج`}
                        {survey.createdBy ? ` • ${survey.createdBy.name}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {new Date(survey.startDate).toLocaleDateString('ar-EG')} - {new Date(survey.endDate).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                        {survey._count.questions} سؤال
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3.5 h-3.5" />
                        {survey._count.responses} إجابة
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${statusConfig.bgColor} ${statusConfig.color} rounded-full text-xs font-bold border-2 ${statusConfig.borderColor}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {new Date(survey.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => viewDetail(survey.id)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-200 flex items-center justify-center gap-1.5"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                      النتائج
                    </button>
                    <button
                      onClick={() => handleToggle(survey.id)}
                      className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border ${
                        survey.isActive
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                      }`}
                    >
                      {survey.isActive ? <PauseCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}
                      {survey.isActive ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b-2 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-amber-600">
                    <PlusIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">إنشاء استبيان جديد</h3>
                    <p className="text-xs sm:text-sm text-gray-500">أنشئ استطلاع رأي وحدد البرامج والفترة الزمنية</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* العنوان */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  عنوان الاستبيان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  placeholder="مثال: استبيان تقييم البرنامج التدريبي"
                />
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  rows={2}
                  placeholder="وصف مختصر عن الاستبيان..."
                />
              </div>

              {/* الفترة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    من تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    إلى تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* البرامج المستهدفة */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">البرامج المستهدفة</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allPrograms: true, programIds: [] })}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      formData.allPrograms ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-md' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    🌐 جميع البرامج
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allPrograms: false })}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      !formData.allPrograms ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-md' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    🎯 برامج محددة
                  </button>
                </div>
                {!formData.allPrograms && (
                  <div className="border-2 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                    {programs.map((prog) => (
                      <label key={prog.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all ${
                        formData.programIds.includes(prog.id) ? 'bg-orange-50 border border-orange-200' : 'hover:bg-white border border-transparent'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.programIds.includes(prog.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, programIds: [...formData.programIds, prog.id] });
                            } else {
                              setFormData({ ...formData, programIds: formData.programIds.filter((id) => id !== prog.id) });
                            }
                          }}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">{prog.nameAr}</span>
                      </label>
                    ))}
                    {programs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد برامج تدريبية</p>}
                  </div>
                )}
              </div>

              {/* الأسئلة */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">
                    الأسئلة <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal mr-2">({questions.length} سؤال)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    إضافة سؤال
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="border-2 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold flex items-center justify-center">
                            {qIdx + 1}
                          </span>
                          السؤال {qIdx + 1}
                        </span>
                        {questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors">
                            <MinusCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestion(qIdx, e.target.value)}
                        className="w-full px-4 py-2.5 border-2 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
                        placeholder="نص السؤال..."
                      />
                      <div className="space-y-2">
                        {q.options.map((o, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0 border border-orange-200">
                              {String.fromCharCode(1571 + oIdx)}
                            </span>
                            <input
                              type="text"
                              value={o.text}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                              className="flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder={`الخيار ${oIdx + 1}`}
                            />
                            {q.options.length > 2 && (
                              <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-red-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(qIdx)}
                          className="text-xs text-orange-600 font-bold hover:text-orange-700 mr-9 mt-1 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                        >
                          + إضافة خيار
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t-2 bg-gray-50 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-bold transition-all text-sm sm:text-base"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
              >
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الاستبيان'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Results Modal */}
      {showDetailModal && selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-blue-500 to-indigo-600">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedSurvey.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {selectedSurvey._count?.responses || 0} إجابة • {selectedSurvey.questions?.length || 0} سؤال
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-xs text-gray-600 mb-2 font-medium">الفترة الزمنية</p>
                  <p className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-orange-500" />
                    {new Date(selectedSurvey.startDate).toLocaleDateString('ar-EG')} - {new Date(selectedSurvey.endDate).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-xs text-gray-600 mb-2 font-medium">البرامج المستهدفة</p>
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5 text-purple-500" />
                    {selectedSurvey.allPrograms ? 'جميع البرامج' : selectedSurvey.programs?.map((p: any) => p.program.nameAr).join('، ')}
                  </p>
                </div>
              </div>

              {/* Questions with Results */}
              {selectedSurvey.questions?.map((question: any, qIdx: number) => {
                const totalAnswers = question.options.reduce((sum: number, o: any) => sum + (o._count?.answers || 0), 0);
                return (
                  <div key={question.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border-2 border-blue-200">
                    <p className="font-bold text-gray-900 mb-4 text-base sm:text-lg flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold flex-shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <span>{question.text}</span>
                    </p>
                    <div className="space-y-3 mr-10">
                      {question.options.map((option: any, oIdx: number) => {
                        const count = option._count?.answers || 0;
                        const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                        const isTop = totalAnswers > 0 && count === Math.max(...question.options.map((o: any) => o._count?.answers || 0));
                        return (
                          <div key={option.id} className={`rounded-xl p-3 border-2 transition-all ${isTop && totalAnswers > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className={`font-bold ${isTop && totalAnswers > 0 ? 'text-orange-700' : 'text-gray-700'}`}>{option.text}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isTop && totalAnswers > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isTop && totalAnswers > 0 ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalAnswers > 0 && (
                      <p className="text-xs text-gray-500 mt-3 mr-10 flex items-center gap-1">
                        <UsersIcon className="w-3.5 h-3.5" />
                        إجمالي الإجابات: {totalAnswers}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 pt-4 border-t">
                <ClockIcon className="w-4 h-4" />
                <span>تاريخ الإنشاء: {new Date(selectedSurvey.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}</span>
                {selectedSurvey.createdBy && (
                  <span>• بواسطة: {selectedSurvey.createdBy.name}</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t-2 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-bold transition-all text-sm sm:text-base"
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
