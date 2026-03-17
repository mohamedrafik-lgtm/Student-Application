'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  QuestionMarkCircleIcon,
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DataTable } from '@/app/components/ui/DataTable';

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  skill: 'RECALL' | 'COMPREHENSION' | 'DEDUCTION';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  chapter: number;
  options?: QuestionOption[];
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function CourseQuestionsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'TRUE_FALSE',
    skill: 'RECALL' as 'RECALL' | 'COMPREHENSION' | 'DEDUCTION',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD',
    chapter: 1,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseData, questionsData] = await Promise.all([
        fetchAPI(`/training-contents/${courseId}`),
        fetchAPI(`/questions/content/${courseId}`), // استخدام الـ endpoint الصحيح
      ]);
      setCourse(courseData);
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate
      if (!formData.text.trim()) {
        toast.error('يجب إدخال نص السؤال');
        return;
      }

      if (formData.type === 'MULTIPLE_CHOICE') {
        const validOptions = formData.options.filter(opt => opt.text.trim());
        if (validOptions.length < 2) {
          toast.error('يجب إضافة خيارين على الأقل');
          return;
        }
        const correctOptions = validOptions.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          toast.error('يجب تحديد الإجابة الصحيحة');
          return;
        }
      }

      // إنشاء السؤال
      const questionData = {
        text: formData.text,
        type: formData.type,
        skill: formData.skill,
        difficulty: formData.difficulty,
        chapter: formData.chapter,
        contentId: Number(courseId),
        options: formData.type === 'MULTIPLE_CHOICE' 
          ? formData.options.filter(opt => opt.text.trim())
          : formData.type === 'TRUE_FALSE'
          ? [
              { text: 'صحيح', isCorrect: formData.options[0]?.isCorrect || false },
              { text: 'خطأ', isCorrect: !formData.options[0]?.isCorrect || false }
            ]
          : []
      };

      await fetchAPI('/questions', {
        method: 'POST',
        body: JSON.stringify(questionData),
      });

      // إعادة تحميل البيانات
      const questionsData = await fetchAPI(`/questions/content/${courseId}`);
      setQuestions(questionsData || []);

      toast.success('تم إضافة السؤال بنجاح');
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة السؤال');
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'MULTIPLE_CHOICE',
      skill: 'RECALL',
      difficulty: 'MEDIUM',
      chapter: 1,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
  };

  const updateOption = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...formData.options];
    if (field === 'isCorrect') {
      // Only one correct answer
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      newOptions[index].text = value as string;
    }
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.type === 'MULTIPLE_CHOICE' && formData.options.length < 6) {
      setFormData({
        ...formData,
        options: [...formData.options, { text: '', isCorrect: false }],
      });
    }
  };

  const removeOption = (index: number) => {
    if (formData.type === 'MULTIPLE_CHOICE' && formData.options.length > 2) {
      // لا يمكن حذف الإجابة الصحيحة
      if (formData.options[index].isCorrect) {
        toast.error('لا يمكن حذف الإجابة الصحيحة');
        return;
      }
      
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        options: newOptions,
      });
    }
  };

  const handleTypeChange = (type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE') => {
    let newOptions: QuestionOption[];
    
    if (type === 'TRUE_FALSE') {
      newOptions = [
        { text: 'صحيح', isCorrect: true },
        { text: 'خطأ', isCorrect: false },
      ];
    } else {
      if (formData.type === 'TRUE_FALSE') {
        newOptions = [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ];
      } else {
        newOptions = [...formData.options];
      }
    }
    
    setFormData({
      ...formData,
      type,
      options: newOptions,
    });
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      type: question.type,
      skill: question.skill,
      difficulty: question.difficulty,
      chapter: question.chapter,
      options: question.options || [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      // Validate
      if (!formData.text.trim()) {
        toast.error('يجب إدخال نص السؤال');
        return;
      }

      if (formData.type === 'MULTIPLE_CHOICE') {
        const validOptions = formData.options.filter(opt => opt.text.trim());
        if (validOptions.length < 2) {
          toast.error('يجب إضافة خيارين على الأقل');
          return;
        }
        const correctOptions = validOptions.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          toast.error('يجب تحديد الإجابة الصحيحة');
          return;
        }
      }

      // تحديث السؤال
      const questionData = {
        text: formData.text,
        type: formData.type,
        skill: formData.skill,
        difficulty: formData.difficulty,
        chapter: formData.chapter,
        contentId: Number(courseId),
        options: formData.type === 'MULTIPLE_CHOICE' 
          ? formData.options.filter(opt => opt.text.trim())
          : formData.type === 'TRUE_FALSE'
          ? [
              { text: 'صحيح', isCorrect: formData.options[0]?.isCorrect || false },
              { text: 'خطأ', isCorrect: !formData.options[0]?.isCorrect || false }
            ]
          : []
      };

      await fetchAPI(`/questions/${editingQuestion.id}`, {
        method: 'PATCH',
        body: JSON.stringify(questionData),
      });

      // إعادة تحميل البيانات
      const questionsData = await fetchAPI(`/questions/content/${courseId}`);
      setQuestions(questionsData || []);

      toast.success('تم تحديث السؤال بنجاح');
      setEditingQuestion(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث السؤال');
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      await fetchAPI(`/questions/${questionId}`, {
        method: 'DELETE',
      });

      // إعادة تحميل البيانات
      const questionsData = await fetchAPI(`/questions/content/${courseId}`);
      setQuestions(questionsData || []);

      toast.success('تم حذف السؤال بنجاح');
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف السؤال');
    }
  };

  if (loading || !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const typeLabels = {
    MULTIPLE_CHOICE: 'اختيار من متعدد',
    TRUE_FALSE: 'صح أو خطأ',
  };

  const skillLabels = {
    RECALL: 'التذكر',
    COMPREHENSION: 'الفهم',
    DEDUCTION: 'الاستنتاج',
  };

  const difficultyLabels = {
    EASY: 'سهل',
    MEDIUM: 'متوسط',
    HARD: 'صعب',
    VERY_HARD: 'صعب جداً',
  };

  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'ALL' && q.type !== filterType) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const columns = [
    {
      header: '#',
      accessor: (row: Question) => {
        const index = filteredQuestions.indexOf(row);
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700">
            {index + 1}
          </div>
        );
      },
    },
    {
      header: 'نص السؤال',
      accessor: (row: Question) => (
        <div className="font-medium text-gray-900 max-w-md line-clamp-2" title={row.text}>
          {row.text}
        </div>
      ),
    },
    {
      header: 'النوع',
      accessor: (row: Question) => (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
          {typeLabels[row.type]}
        </span>
      ),
    },
    {
      header: 'المهارة',
      accessor: (row: Question) => (
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
          {skillLabels[row.skill]}
        </span>
      ),
    },
    {
      header: 'الصعوبة',
      accessor: (row: Question) => {
        const colors = {
          EASY: 'bg-green-100 text-green-700',
          MEDIUM: 'bg-amber-100 text-amber-700',
          HARD: 'bg-red-100 text-red-700',
          VERY_HARD: 'bg-red-200 text-red-800',
        };
        return (
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[row.difficulty]}`}>
            {difficultyLabels[row.difficulty]}
          </span>
        );
      },
    },
    {
      header: 'الباب',
      accessor: (row: Question) => (
        <span className="font-semibold text-gray-900">الباب {row.chapter}</span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: (row: Question) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="تعديل"
          >
            <PencilSquareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">بنك الأسئلة</h1>
            <p className="text-blue-100">{course.name} - {course.code}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة سؤال
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع السؤال</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">الكل</option>
              <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
              <option value="TRUE_FALSE">صح أو خطأ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مستوى الصعوبة</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">الكل</option>
              <option value="EASY">سهل</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HARD">صعب</option>
              <option value="VERY_HARD">صعب جداً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <QuestionMarkCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {questions.length === 0 ? 'لا توجد أسئلة' : 'لا توجد نتائج'}
            </h3>
            <p className="text-gray-600 mb-4">
              {questions.length === 0
                ? 'لم يتم إضافة أي أسئلة لبنك الأسئلة بعد'
                : 'لا توجد أسئلة تطابق الفلاتر المحددة'}
            </p>
            {questions.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                إضافة أول سؤال
              </button>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredQuestions}
            keyField="id"
            emptyMessage="لا توجد أسئلة"
          />
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-900">إضافة سؤال جديد</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نص السؤال <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="أدخل نص السؤال..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع السؤال <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                    <option value="TRUE_FALSE">صح أو خطأ</option>
                  </select>
                </div>

                {/* Skill */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المهارة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.skill}
                    onChange={(e) => setFormData({ ...formData, skill: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="RECALL">التذكر</option>
                    <option value="COMPREHENSION">الفهم</option>
                    <option value="DEDUCTION">الاستنتاج</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مستوى الصعوبة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="EASY">سهل</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="HARD">صعب</option>
                    <option value="VERY_HARD">صعب جداً</option>
                  </select>
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الباب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Options for Multiple Choice */}
              {formData.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    الخيارات <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs mr-2">(حدد الإجابة الصحيحة)</span>
                  </label>
                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={option.isCorrect}
                          onChange={() => updateOption(index, 'isCorrect', true)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(index, 'text', e.target.value)}
                          className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder={`الخيار ${index + 1}`}
                        />
                        {formData.options.length > 2 && !option.isCorrect && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.options.length < 6 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-3 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <PlusIcon className="w-5 h-5" />
                      إضافة خيار
                    </button>
                  )}
                </div>
              )}

              {/* Options for True/False */}
              {formData.type === 'TRUE_FALSE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    الإجابة الصحيحة <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalseAnswer"
                        checked={formData.options[0]?.isCorrect}
                        onChange={() => updateOption(0, 'isCorrect', true)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-900">صحيح</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalseAnswer"
                        checked={!formData.options[0]?.isCorrect}
                        onChange={() => updateOption(0, 'isCorrect', false)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-900">خطأ</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إضافة السؤال
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-900">تعديل السؤال</h3>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نص السؤال <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="أدخل نص السؤال..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع السؤال <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                    <option value="TRUE_FALSE">صح أو خطأ</option>
                  </select>
                </div>

                {/* Skill */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المهارة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.skill}
                    onChange={(e) => setFormData({ ...formData, skill: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="RECALL">التذكر</option>
                    <option value="COMPREHENSION">الفهم</option>
                    <option value="DEDUCTION">الاستنتاج</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مستوى الصعوبة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="EASY">سهل</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="HARD">صعب</option>
                    <option value="VERY_HARD">صعب جداً</option>
                  </select>
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الباب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Options for Multiple Choice */}
              {formData.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    الخيارات <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs mr-2">(حدد الإجابة الصحيحة)</span>
                  </label>
                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correctAnswerEdit"
                          checked={option.isCorrect}
                          onChange={() => updateOption(index, 'isCorrect', true)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(index, 'text', e.target.value)}
                          className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder={`الخيار ${index + 1}`}
                        />
                        {formData.options.length > 2 && !option.isCorrect && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.options.length < 6 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-3 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <PlusIcon className="w-5 h-5" />
                      إضافة خيار
                    </button>
                  )}
                </div>
              )}

              {/* Options for True/False */}
              {formData.type === 'TRUE_FALSE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    الإجابة الصحيحة <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalseAnswerEdit"
                        checked={formData.options[0]?.isCorrect}
                        onChange={() => updateOption(0, 'isCorrect', true)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-900">صحيح</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trueFalseAnswerEdit"
                        checked={!formData.options[0]?.isCorrect}
                        onChange={() => updateOption(0, 'isCorrect', false)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-900">خطأ</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  تحديث السؤال
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}