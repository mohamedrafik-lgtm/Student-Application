'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';

interface Job {
  id?: number;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  description: string;
  requirements: string[];
  applyUrl: string;
  category: string;
  isActive: boolean;
  createdAt?: string;
}

const defaultJob: Job = {
  title: '',
  company: '',
  location: '',
  type: '',
  salary: null,
  description: '',
  requirements: [''],
  applyUrl: '',
  category: '',
  isActive: true
};

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // Usar React.use para acceder a los parámetros de ruta
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  
  const [formData, setFormData] = useState<Job>(defaultJob);
  const [errors, setErrors] = useState<Partial<Record<keyof Job, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAPI(`/jobs/${jobId}`);
        
        // تحويل المتطلبات من نص إلى مصفوفة للعرض في الفورم
        const formattedJob = {
          ...data,
          requirements: typeof data.requirements === 'string' 
            ? data.requirements.split('\n').filter(Boolean) 
            : data.requirements
        };
        
        if (formattedJob.requirements.length === 0) {
          formattedJob.requirements = [''];
        }
        
        setFormData(formattedJob);
      } catch (error) {
        console.error('Error fetching job:', error);
        toast.error('حدث خطأ في جلب بيانات الوظيفة');
        router.push('/dashboard/jobs');
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId, router]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof Job, string>> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'عنوان الوظيفة مطلوب';
    }
    if (!formData.company.trim()) {
      newErrors.company = 'اسم الشركة مطلوب';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'الموقع مطلوب';
    }
    if (!formData.type.trim()) {
      newErrors.type = 'نوع الوظيفة مطلوب';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'التخصص مطلوب';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'الوصف الوظيفي مطلوب';
    }
    if (!formData.requirements.some(req => req.trim())) {
      newErrors.requirements = 'يجب إضافة متطلب واحد على الأقل';
    }
    if (!formData.applyUrl.trim()) {
      newErrors.applyUrl = 'رابط التقديم مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // تحويل المتطلبات من مصفوفة إلى نص مفصول بسطور جديدة للإرسال
        const jobDataToSubmit = {
          ...formData,
          requirements: Array.isArray(formData.requirements) 
            ? formData.requirements.join('\n') 
            : formData.requirements
        };

        // حذف الحقول التي لا يجب إرسالها للتحديث
        const { id, createdAt, updatedAt, ...dataToUpdate } = jobDataToSubmit as any;

        await fetchAPI(`/jobs/${jobId}`, {
          method: 'PATCH',
          body: JSON.stringify(dataToUpdate),
        });

        toast.success('تم تحديث الوظيفة بنجاح');
        router.push('/dashboard/jobs');
      } catch (error) {
        console.error('Error updating job:', error);
        toast.error('حدث خطأ أثناء تحديث الوظيفة');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData({ ...formData, requirements: newRequirements });
  };

  const addRequirement = () => {
    setFormData({
      ...formData,
      requirements: [...formData.requirements, '']
    });
  };

  const removeRequirement = (index: number) => {
    if (formData.requirements.length > 1) {
      const newRequirements = formData.requirements.filter((_, i) => i !== index);
      setFormData({ ...formData, requirements: newRequirements });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تعديل الوظيفة</h1>
            <p className="text-gray-600 mt-1">تعديل تفاصيل الوظيفة وتحديثها</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/jobs')}
            leftIcon={<ArrowRightIcon className="h-4 w-4" />}
          >
            العودة للوظائف
          </Button>
        </div>

        {/* Form */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">معلومات الوظيفة</h2>
            <p className="mt-1 text-sm text-gray-500">
              قم بتعديل المعلومات المطلوبة لتحديث الوظيفة. الحقول المميزة بـ * إلزامية.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                المعلومات الأساسية
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان الوظيفة *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: مطور ويب"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الشركة *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: شركة التقنية"
                  />
                  {errors.company && (
                    <p className="mt-1 text-sm text-red-500">{errors.company}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الموقع *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: القاهرة"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-500">{errors.location}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الوظيفة *
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: دوام كامل"
                  />
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-500">{errors.type}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    التخصص *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: تطوير ويب"
                  />
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الراتب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value as string | null })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="مثال: 5000 - 7000 جنيه"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                تفاصيل الوظيفة
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوصف الوظيفي *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="اكتب وصفاً تفصيلياً للوظيفة..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      المتطلبات *
                    </label>
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="text-sm text-blue-900 hover:text-blue-700 transition-colors flex items-center gap-1"
                    >
                      <PlusIcon className="h-4 w-4" />
                      إضافة متطلب
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.requirements.map((req, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => handleRequirementChange(index, e.target.value)}
                          className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                          placeholder={`المتطلب ${index + 1}`}
                        />
                        {formData.requirements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.requirements && (
                    <p className="mt-1 text-sm text-red-500">{errors.requirements}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رابط التقديم *
                  </label>
                  <input
                    type="url"
                    value={formData.applyUrl}
                    onChange={(e) => setFormData({ ...formData, applyUrl: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                    placeholder="https://..."
                  />
                  {errors.applyUrl && (
                    <p className="mt-1 text-sm text-red-500">{errors.applyUrl}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                إعدادات النشر
              </h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 bg-white"
                />
                <label htmlFor="isActive" className="mr-2 text-sm text-gray-700">
                  الوظيفة نشطة
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push('/dashboard/jobs')}
              >
                إلغاء
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
} 