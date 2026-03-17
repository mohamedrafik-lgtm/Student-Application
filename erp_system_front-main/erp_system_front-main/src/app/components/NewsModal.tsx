'use client';
import Image from 'next/image';
import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { fetchAPI, getImageUrl, API_BASE_URL, uploadFile } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect } from '@/app/components/ui/Select';

interface News {
  id?: number;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
  slug: string;
}

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (news: News) => void;
  news?: News;
  mode: 'add' | 'edit';
}

const defaultNews: News = {
  title: '',
  content: '',
  excerpt: '',
  image: '',
  author: '',
  isPublished: true,
  slug: ''
};

export default function NewsModal({ isOpen, onClose, onSubmit, news, mode }: NewsModalProps) {
  const [formData, setFormData] = useState<News>(defaultNews);
  const [errors, setErrors] = useState<Partial<Record<keyof News, string>>>({});
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (news && mode === 'edit') {
      setFormData(news);
      setImagePreview(news.image);
    } else {
      setFormData(defaultNews);
      setImagePreview('');
    }
  }, [news, mode]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof News, string>> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'عنوان الخبر مطلوب';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'محتوى الخبر مطلوب';
    }
    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'ملخص الخبر مطلوب';
    }
    if (!formData.image.trim()) {
      newErrors.image = 'صورة الخبر مطلوبة';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'اسم الكاتب مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        image: 'يجب أن يكون الملف صورة'
      }));
      return;
    }

    try {
      setUploading(true);
      
      // استخدام دالة uploadFile بدلاً من fetch المباشر
      const responseData = await uploadFile(file);
      
      // استخدام URL الصورة من الاستجابة
      setFormData(prev => ({
        ...prev,
        image: responseData.url
      }));
      setImagePreview(responseData.url);
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    } catch (error) {
      console.error('خطأ أثناء رفع الصورة:', error);
      
      let errorMessage = 'حدث خطأ أثناء رفع الصورة';
      if (error instanceof Error) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      setErrors(prev => ({
        ...prev,
        image: errorMessage
      }));
    } finally {
      setUploading(false);
    }
  };

  // دالة لتحويل العنوان إلى slug
  const generateSlug = (title: string): string => {
    // تحويل الأحرف العربية إلى ما يقابلها باللاتينية (تبسيط)
    const arabicToLatinMap: Record<string, string> = {
      'أ': 'a', 'إ': 'a', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
      'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r',
      'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
      'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k',
      'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
      'ة': 'a', 'ى': 'a', 'ؤ': 'o', 'ئ': 'e'
    };

    let latinized = '';
    for (let i = 0; i < title.length; i++) {
      const char = title[i];
      latinized += arabicToLatinMap[char] || char;
    }

    // تحويل إلى أحرف صغيرة وإزالة الأحرف الخاصة
    return latinized
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // إزالة الأحرف الخاصة
      .replace(/\s+/g, '-') // استبدال المسافات بشرطات
      .replace(/--+/g, '-') // إزالة الشرطات المتكررة
      .trim()
      .replace(/^-+|-+$/g, ''); // إزالة الشرطات من البداية والنهاية
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // إضافة slug إلى البيانات قبل الإرسال إذا لم يكن موجودًا
      // وإزالة حقول id و createdAt و updatedAt قبل الإرسال
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...dataWithoutMetadata } = formData;
      
      const dataToSubmit = { ...dataWithoutMetadata };
      if (!dataToSubmit.slug || dataToSubmit.slug.trim() === '') {
        dataToSubmit.slug = generateSlug(dataToSubmit.title);
      }
      onSubmit(dataToSubmit);
    }
  };

  // تحديث معاينة الصورة
  const renderImagePreview = () => {
    if (!imagePreview) return null;
    
    return (
      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-tiba-gray-200">
        <img
          src={imagePreview}
          alt="معاينة"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/images/logo.png';
          }}
        />
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({ ...prev, image: '' }));
            setImagePreview('');
          }}
          className="absolute top-0 right-0 p-1 bg-tiba-danger-500/80 hover:bg-tiba-danger-500 transition-colors rounded-bl-lg"
        >
          <XMarkIcon className="h-3 w-3 text-white" />
        </button>
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-tiba-gray-900/75 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center sm:items-center pt-20 sm:pt-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-y-auto rounded-lg bg-white border border-tiba-gray-200 p-6 shadow-xl transition-all max-h-[calc(100vh-6rem)] my-4">
                <div className="sticky top-0 z-10 bg-white pt-1 pb-4 mb-6 border-b border-tiba-gray-200">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-xl sm:text-2xl font-bold text-tiba-gray-800">
                      {mode === 'add' ? 'إضافة خبر جديد' : 'تعديل الخبر'}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-tiba-gray-400 hover:text-tiba-gray-500 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6">
                    {/* العنوان والكاتب */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                          عنوان الخبر
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full bg-white text-tiba-gray-800 border border-tiba-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent placeholder-tiba-gray-400"
                          placeholder="مثال: افتتاح دورة جديدة..."
                        />
                        {errors.title && (
                          <p className="mt-1 text-sm text-tiba-danger-600">{errors.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                          الكاتب
                        </label>
                        <input
                          type="text"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                          className="w-full bg-white text-tiba-gray-800 border border-tiba-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent placeholder-tiba-gray-400"
                          placeholder="مثال: إدارة المركز"
                        />
                        {errors.author && (
                          <p className="mt-1 text-sm text-tiba-danger-600">{errors.author}</p>
                        )}
                      </div>
                    </div>

                    {/* الملخص */}
                    <div>
                      <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                        ملخص الخبر
                      </label>
                      <textarea
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        rows={2}
                        className="w-full bg-white text-tiba-gray-800 border border-tiba-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent placeholder-tiba-gray-400"
                        placeholder="اكتب ملخصاً مختصراً للخبر..."
                      />
                      {errors.excerpt && (
                        <p className="mt-1 text-sm text-tiba-danger-600">{errors.excerpt}</p>
                      )}
                    </div>

                    {/* المحتوى */}
                    <div>
                      <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                        محتوى الخبر
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className="w-full bg-white text-tiba-gray-800 border border-tiba-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent placeholder-tiba-gray-400"
                        placeholder="اكتب محتوى الخبر بالكامل..."
                      />
                      {errors.content && (
                        <p className="mt-1 text-sm text-tiba-danger-600">{errors.content}</p>
                      )}
                    </div>

                    {/* رفع الصورة */}
                    <div>
                      <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                        صورة الخبر
                      </label>
                      <div className="mt-1 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="image-upload"
                            />
                            <label
                              htmlFor="image-upload"
                              className={`flex items-center justify-center w-full border border-dashed rounded-lg px-4 py-4 cursor-pointer transition-all duration-300
                                ${uploading 
                                  ? 'bg-tiba-gray-50 border-tiba-gray-300' 
                                  : 'border-tiba-gray-300 hover:border-tiba-primary-400 hover:bg-tiba-gray-50'
                                }`}
                            >
                              <div className="flex items-center gap-2 text-tiba-gray-600">
                                <PhotoIcon className="h-6 w-6" />
                                <span>{uploading ? 'جاري رفع الصورة...' : 'اختر صورة للرفع'}</span>
                              </div>
                            </label>
                          </div>
                          {errors.image && (
                            <p className="mt-1 text-sm text-tiba-danger-600">{errors.image}</p>
                          )}
                        </div>
                        {renderImagePreview()}
                      </div>
                    </div>

                    {/* حالة النشر */}
                    <div>
                      <label className="block text-sm font-medium text-tiba-gray-700 mb-2">
                        حالة النشر
                      </label>
                      <SearchableSelect
                        options={[
                          { value: 'true', label: 'منشور' },
                          { value: 'false', label: 'مسودة' }
                        ]}
                        value={formData.isPublished.toString()}
                        onChange={(value) => setFormData({ ...formData, isPublished: value === 'true' })}
                        placeholder="اختر حالة النشر"
                      />
                    </div>
                  </div>

                  {/* أزرار الحفظ */}
                  <div className="sticky bottom-0 z-10 bg-white pt-4 mt-6 border-t border-tiba-gray-200">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="text-tiba-gray-700 border-tiba-gray-300 hover:bg-tiba-gray-50"
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                      >
                        {mode === 'add' ? 'إضافة الخبر' : 'حفظ التعديلات'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}