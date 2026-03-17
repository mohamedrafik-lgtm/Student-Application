'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

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

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (job: Job) => void;
  job?: Job;
  mode: 'add' | 'edit';
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

export default function JobModal({ isOpen, onClose, onSubmit, job, mode }: JobModalProps) {
  const [formData, setFormData] = useState<Job>(defaultJob);
  const [errors, setErrors] = useState<Partial<Record<keyof Job, string>>>({});

  useEffect(() => {
    if (job && mode === 'edit') {
      setFormData(job);
    } else {
      setFormData(defaultJob);
    }
  }, [job, mode]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // إزالة حقول id و createdAt قبل إرسال البيانات
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, ...jobDataToSubmit } = formData;
      onSubmit(jobDataToSubmit as Job);
      onClose();
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
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-y-auto rounded-lg bg-white border border-gray-200 p-4 sm:p-6 shadow-xl transition-all max-h-[calc(100vh-6rem)] my-4">
                <div className="sticky top-0 z-10 bg-white pt-1 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-xl sm:text-2xl font-bold text-gray-900">
                      {mode === 'add' ? 'إضافة وظيفة جديدة' : 'تعديل الوظيفة'}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-6">
                    {/* Title & Company */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          عنوان الوظيفة
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          اسم الشركة
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
                    </div>

                    {/* Location & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الموقع
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع الوظيفة
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
                    </div>

                    {/* Category & Salary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          التخصص
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الوصف الوظيفي
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                        placeholder="اكتب وصفاً تفصيلياً للوظيفة..."
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                      )}
                    </div>

                    {/* Requirements */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          المتطلبات
                        </label>
                        <button
                          type="button"
                          onClick={addRequirement}
                          className="text-sm text-blue-900 hover:text-blue-700 transition-colors"
                        >
                          + إضافة متطلب
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

                    {/* Apply URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رابط التقديم
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

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 bg-white"
                      />
                      <label className="mr-2 text-sm text-gray-700">
                        الوظيفة نشطة
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="sticky bottom-0 z-10 bg-white pt-4 mt-6">
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-md transition-all duration-300 font-medium text-sm sm:text-base w-full sm:w-auto"
                      >
                        {mode === 'add' ? 'إضافة الوظيفة' : 'حفظ التعديلات'}
                      </button>
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
