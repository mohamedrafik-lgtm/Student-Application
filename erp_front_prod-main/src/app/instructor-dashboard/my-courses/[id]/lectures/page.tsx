'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  VideoCameraIcon,
  BookOpenIcon,
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI, uploadFile } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DataTable } from '@/app/components/ui/DataTable';

interface Lecture {
  id: number;
  title: string;
  description?: string;
  chapter: number;
  order: number;
  type: 'VIDEO' | 'PDF' | 'BOTH';
  youtubeUrl?: string;
  pdfFile?: string;
  contentId: number;
  createdAt: string;
  updatedAt: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function CourseLecturesPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'VIDEO' as 'VIDEO' | 'PDF' | 'BOTH',
    chapter: 1,
    order: 1,
    youtubeUrl: '',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseData, lecturesData] = await Promise.all([
        fetchAPI(`/training-contents/${courseId}`),
        fetchAPI(`/lectures/content/${courseId}`), // استخدام نفس endpoint الجانب الإداري
      ]);
      setCourse(courseData);
      setLectures(lecturesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const validateYoutubeUrl = (url: string): string => {
    if (!url) return url;
    
    let videoId = '';
    const standardPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
    const shortPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/;
    const embedPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/;
    
    let match = url.match(standardPattern) || url.match(shortPattern) || url.match(embedPattern);
    
    if (match && match[1]) {
      videoId = match[1];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    return url;
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('يرجى اختيار ملف PDF');
        return;
      }
      setPdfFile(file);
      setPdfFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.title.trim()) {
        toast.error('يجب إدخال عنوان المحاضرة');
        return;
      }

      if (formData.type === 'VIDEO' || formData.type === 'BOTH') {
        if (!formData.youtubeUrl.trim()) {
          toast.error('يجب إدخال رابط YouTube');
          return;
        }
      }

      if ((formData.type === 'PDF' || formData.type === 'BOTH') && !pdfFile) {
        toast.error('يرجى اختيار ملف PDF');
        return;
      }

      // رفع ملف PDF إذا وجد
      let pdfFileUrl = '';
      if (pdfFile) {
        const uploadResult = await uploadFile(pdfFile, 'lectures');
        pdfFileUrl = uploadResult.url;
      }

      // Validar y formatear la URL de YouTube
      const formattedYoutubeUrl = formData.type === 'VIDEO' || formData.type === 'BOTH' ? validateYoutubeUrl(formData.youtubeUrl) : null;

      // إنشاء محاضرة جديدة
      const lectureData = {
        title: formData.title,
        description: formData.description,
        chapter: formData.chapter,
        order: formData.order,
        type: formData.type,
        youtubeUrl: formattedYoutubeUrl,
        pdfFile: formData.type === 'PDF' || formData.type === 'BOTH' ? pdfFileUrl : null,
        contentId: Number(courseId)
      };

      const result = await fetchAPI('/lectures', {
        method: 'POST',
        body: JSON.stringify(lectureData),
      });

      // إعادة تحميل البيانات
      const lecturesData = await fetchAPI(`/lectures/content/${courseId}`);
      setLectures(lecturesData || []);

      toast.success('تم إضافة المحاضرة بنجاح');
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating lecture:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة المحاضرة');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'VIDEO',
      chapter: 1,
      order: 1,
      youtubeUrl: '',
    });
    setPdfFile(null);
    setPdfFileName('');
  };

  const handleEdit = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      description: lecture.description || '',
      type: lecture.type,
      chapter: lecture.chapter,
      order: lecture.order,
      youtubeUrl: lecture.youtubeUrl || '',
    });
    // ملاحظة: لن نستطيع تحميل ملف PDF الموجود، لكن يمكن رفع ملف جديد
    setPdfFile(null);
    setPdfFileName('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLecture) return;

    try {
      if (!formData.title.trim()) {
        toast.error('يجب إدخال عنوان المحاضرة');
        return;
      }

      if (formData.type === 'VIDEO' || formData.type === 'BOTH') {
        if (!formData.youtubeUrl.trim()) {
          toast.error('يجب إدخال رابط YouTube');
          return;
        }
      }

      // رفع ملف PDF جديد إذا تم اختياره
      let pdfFileUrl = editingLecture.pdfFile; // الاحتفاظ بالملف القديم
      if (pdfFile) {
        const uploadResult = await uploadFile(pdfFile, 'lectures');
        pdfFileUrl = uploadResult.url;
      } else if (formData.type === 'PDF' || formData.type === 'BOTH') {
        if (!editingLecture.pdfFile) {
          toast.error('يرجى اختيار ملف PDF');
          return;
        }
      }

      const formattedYoutubeUrl = formData.type === 'VIDEO' || formData.type === 'BOTH' ? validateYoutubeUrl(formData.youtubeUrl) : null;

      const lectureData = {
        title: formData.title,
        description: formData.description,
        chapter: formData.chapter,
        order: formData.order,
        type: formData.type,
        youtubeUrl: formattedYoutubeUrl,
        pdfFile: formData.type === 'PDF' || formData.type === 'BOTH' ? pdfFileUrl : null,
        contentId: Number(courseId)
      };

      await fetchAPI(`/lectures/${editingLecture.id}`, {
        method: 'PATCH',
        body: JSON.stringify(lectureData),
      });

      // إعادة تحميل البيانات
      const lecturesData = await fetchAPI(`/lectures/content/${courseId}`);
      setLectures(lecturesData || []);

      toast.success('تم تحديث المحاضرة بنجاح');
      setEditingLecture(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating lecture:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث المحاضرة');
    }
  };

  const handleDelete = async (lectureId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;

    try {
      await fetchAPI(`/lectures/${lectureId}`, {
        method: 'DELETE',
      });

      // إعادة تحميل البيانات
      const lecturesData = await fetchAPI(`/lectures/content/${courseId}`);
      setLectures(lecturesData || []);

      toast.success('تم حذف المحاضرة بنجاح');
    } catch (error: any) {
      console.error('Error deleting lecture:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف المحاضرة');
    }
  };

  if (loading || !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    VIDEO: 'فيديو',
    PDF: 'ملف PDF',
    BOTH: 'فيديو وملف PDF',
  };

  const columns = [
    {
      header: '#',
      accessor: (row: Lecture) => (
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700">
          {row.order}
        </div>
      ),
    },
    {
      header: 'المحاضرة',
      accessor: (row: Lecture) => (
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${row.type === 'VIDEO' ? 'bg-red-100 text-red-600' : row.type === 'PDF' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'} rounded-lg flex items-center justify-center`}>
            {row.type === 'VIDEO' || row.type === 'BOTH' ? (
              <VideoCameraIcon className="w-6 h-6" />
            ) : (
              <BookOpenIcon className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{row.title}</div>
            {row.description && (
              <div className="text-sm text-gray-500 line-clamp-1">{row.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'النوع',
      accessor: (row: Lecture) => (
        <span className={`px-3 py-1 ${row.type === 'VIDEO' ? 'bg-red-100 text-red-700' : row.type === 'PDF' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'} rounded-lg text-sm font-medium`}>
          {typeLabels[row.type]}
        </span>
      ),
    },
    {
      header: 'الباب',
      accessor: (row: Lecture) => (
        <span className="font-semibold text-gray-900">الباب {row.chapter}</span>
      ),
    },
    {
      header: 'المحتوى',
      accessor: (row: Lecture) => (
        <div className="flex items-center gap-2">
          {row.youtubeUrl && (
            <a
              href={row.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
            >
              YouTube
            </a>
          )}
          {row.pdfFile && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
              PDF
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: (row: Lecture) => (
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
            <h1 className="text-2xl font-bold mb-1">المحاضرات</h1>
            <p className="text-blue-100">{course.name} - {course.code}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة محاضرة
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {lectures.length === 0 ? (
          <div className="p-12 text-center">
            <VideoCameraIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد محاضرات</h3>
            <p className="text-gray-600 mb-4">لم يتم إضافة أي محاضرات بعد</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              إضافة أول محاضرة
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={lectures}
            keyField="id"
            emptyMessage="لا توجد محاضرات"
          />
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-900">إضافة محاضرة جديدة</h3>
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
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان المحاضرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="مثال: محاضرة 1 - مقدمة"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="وصف مختصر للمحاضرة..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    النوع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="VIDEO">فيديو</option>
                    <option value="PDF">ملف PDF</option>
                    <option value="BOTH">فيديو وملف PDF</option>
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

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الترتيب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* YouTube URL (conditional) */}
              {(formData.type === 'VIDEO' || formData.type === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط YouTube <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required={formData.type === 'VIDEO' || formData.type === 'BOTH'}
                  />
                </div>
              )}

              {/* PDF Upload (conditional) */}
              {(formData.type === 'PDF' || formData.type === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملف PDF <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors bg-gray-50">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <BookOpenIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {pdfFileName || 'اختر ملف PDF'}
                        </span>
                      </div>
                    </label>
                    {pdfFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setPdfFileName('');
                        }}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {pdfFileName && (
                    <p className="text-xs text-green-600 mt-2">✓ تم اختيار: {pdfFileName}</p>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إضافة المحاضرة
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

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-900">تعديل المحاضرة</h3>
              <button
                onClick={() => {
                  setEditingLecture(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان المحاضرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="مثال: محاضرة 1 - مقدمة"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="وصف مختصر للمحاضرة..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    النوع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="VIDEO">فيديو</option>
                    <option value="PDF">ملف PDF</option>
                    <option value="BOTH">فيديو وملف PDF</option>
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

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الترتيب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* YouTube URL (conditional) */}
              {(formData.type === 'VIDEO' || formData.type === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط YouTube <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required={formData.type === 'VIDEO' || formData.type === 'BOTH'}
                  />
                </div>
              )}

              {/* PDF Upload (conditional) */}
              {(formData.type === 'PDF' || formData.type === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملف PDF {!editingLecture.pdfFile && <span className="text-red-500">*</span>}
                    {editingLecture.pdfFile && <span className="text-sm text-gray-500 mr-2">(اختياري - اترك فارغاً للاحتفاظ بالملف الحالي)</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors bg-gray-50">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <BookOpenIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {pdfFileName || 'اختر ملف PDF جديد'}
                        </span>
                      </div>
                    </label>
                    {pdfFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setPdfFileName('');
                        }}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {pdfFileName && (
                    <p className="text-xs text-green-600 mt-2">✓ تم اختيار: {pdfFileName}</p>
                  )}
                  {!pdfFileName && editingLecture.pdfFile && (
                    <p className="text-xs text-blue-600 mt-2">✓ يوجد ملف PDF حالي</p>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  تحديث المحاضرة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLecture(null);
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