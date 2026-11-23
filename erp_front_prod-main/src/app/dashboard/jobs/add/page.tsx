'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRightIcon, 
  PlusIcon, 
  XMarkIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  ListBulletIcon,
  LightBulbIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/app/components/ui/Textarea';
import { Label } from '@/components/ui/label';

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

const FormField = ({ label, error, children, required }: { label: string, error?: string, children: React.ReactNode, required?: boolean }) => (
    <div className="flex flex-col space-y-2">
        <Label>
            {label} {required && <span className="text-tiba-danger-500">*</span>}
        </Label>
        {children}
        {error && <p className="text-sm text-tiba-danger-500 mt-1">{error}</p>}
    </div>
);

export default function AddJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Job>(defaultJob);
  const [errors, setErrors] = useState<Partial<Record<keyof Job, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // خيارات نوع الوظيفة والتخصص
  const jobTypeOptions = [
    { value: 'دوام كامل', label: 'دوام كامل' },
    { value: 'دوام جزئي', label: 'دوام جزئي' },
    { value: 'عن بعد', label: 'عن بعد' },
    { value: 'تدريب', label: 'تدريب' },
    { value: 'عقد مؤقت', label: 'عقد مؤقت' }
  ];

  const jobCategoryOptions = [
    { value: 'تطوير ويب', label: 'تطوير ويب' },
    { value: 'تطوير تطبيقات', label: 'تطوير تطبيقات' },
    { value: 'تصميم جرافيك', label: 'تصميم جرافيك' },
    { value: 'تسويق رقمي', label: 'تسويق رقمي' },
    { value: 'إدارة مشاريع', label: 'إدارة مشاريع' },
    { value: 'خدمة عملاء', label: 'خدمة عملاء' },
    { value: 'مبيعات', label: 'مبيعات' }
  ];

  const validateForm = () => {
    const newErrors: Partial<Record<keyof Job, string>> = {};
    
    if (!formData.title.trim()) newErrors.title = 'عنوان الوظيفة مطلوب';
    if (!formData.company.trim()) newErrors.company = 'اسم الشركة مطلوب';
    if (!formData.location.trim()) newErrors.location = 'الموقع مطلوب';
    if (!formData.type.trim()) newErrors.type = 'نوع الوظيفة مطلوب';
    if (!formData.category.trim()) newErrors.category = 'التخصص مطلوب';
    if (!formData.description.trim()) newErrors.description = 'الوصف الوظيفي مطلوب';
    if (!formData.requirements.some(req => req.trim())) newErrors.requirements = 'يجب إضافة متطلب واحد على الأقل';
    if (!formData.applyUrl.trim()) newErrors.applyUrl = 'رابط التقديم مطلوب';
    else if (!/^(ftp|http|https|):\/\/[^ "]+$/.test(formData.applyUrl)) newErrors.applyUrl = 'الرجاء إدخال رابط صحيح';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        const jobDataToSubmit = {
          ...formData,
          requirements: Array.isArray(formData.requirements) 
            ? formData.requirements.join('\n') 
            : formData.requirements
        };

        await fetchAPI('/jobs', {
          method: 'POST',
          body: JSON.stringify(jobDataToSubmit),
        });

        toast.success('تم إضافة الوظيفة بنجاح');
        router.push('/dashboard/jobs');
      } catch (error) {
        console.error('Error submitting job:', error);
        toast.error('حدث خطأ أثناء إضافة الوظيفة');
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

  return (
    <div>
      <PageHeader
        title="إضافة وظيفة جديدة"
        description="أضف تفاصيل الوظيفة الجديدة للنشر على المنصة"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الوظائف', href: '/dashboard/jobs' },
          { label: 'إضافة وظيفة' }
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/jobs')}
            leftIcon={<ArrowRightIcon className="h-4 w-4" />}
          >
            العودة للوظائف
          </Button>
        }
      />
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-tiba-primary-600" />
                  <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">
                    المعلومات الأساسية
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FormField label="عنوان الوظيفة" error={errors.title} required>
                      <Input
                        placeholder="مثال: مطور واجهات أمامية"
                        value={formData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <FormField label="اسم الشركة" error={errors.company} required>
                    <Input
                      placeholder="مثال: شركة البرمجيات المتقدمة"
                      value={formData.company}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </FormField>
                  <FormField label="الموقع" error={errors.location} required>
                    <Input
                      placeholder="مثال: المنصورة، مصر"
                      value={formData.location}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                    />
                   </FormField>
                  <FormField label="نوع الوظيفة" error={errors.type} required>
                    <SearchableSelect
                      options={jobTypeOptions}
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value })}
                      placeholder="اختر نوع الوظيفة..."
                      instanceId="job-type-select"
                    />
                  </FormField>
                  <FormField label="التخصص" error={errors.category} required>
                    <SearchableSelect
                      options={jobCategoryOptions}
                      value={formData.category}
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      placeholder="اختر التخصص..."
                      instanceId="job-category-select"
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="الراتب (اختياري)" error={errors.salary}>
                      <Input
                        placeholder="مثال: 5000 - 7000 جنيه"
                        value={formData.salary || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, salary: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              <hr className="border-tiba-gray-200" />
              
              <div className="p-6">
                <div className="flex items-center mb-6">
                    <PencilSquareIcon className="h-6 w-6 text-tiba-primary-600" />
                    <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">
                        الوصف الوظيفي
                    </h3>
                </div>
                <FormField label="الوصف" error={errors.description} required>
                  <Textarea
                    placeholder="اكتب وصفًا تفصيليًا للوظيفة..."
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                  />
                </FormField>
              </div>
              
              <hr className="border-tiba-gray-200" />
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className='flex items-center'>
                    <ListBulletIcon className="h-6 w-6 text-tiba-primary-600" />
                    <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">
                      المتطلبات
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addRequirement}
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    إضافة متطلب
                  </Button>
                </div>
                 {formData.requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center gap-3 mb-4">
                    <div className="flex-grow">
                      <Input
                        placeholder="مثال: خبرة في React.js"
                        value={requirement}
                        onChange={(e) => handleRequirementChange(index, e.target.value)}
                      />
                    </div>
                    {formData.requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirement(index)}
                        className="text-tiba-danger-500 hover:bg-tiba-danger-50"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                ))}
                {errors.requirements && <p className="text-sm text-tiba-danger-500 mt-1">{errors.requirements}</p>}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
             <Card>
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <LightBulbIcon className="h-6 w-6 text-tiba-primary-600" />
                    <h3 className="text-lg font-semibold text-tiba-gray-800 mr-3">
                      حالة النشر
                    </h3>
                  </div>
                   <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      <span className="ml-3 text-sm font-medium text-green-800">
                        الوظيفة ستكون نشطة عند النشر
                      </span>
                    </div>
                  </div>
                </div>
             </Card>
          </div>
        </div>

        <div className="mt-8 py-4 bg-white border-t border-gray-200 flex items-center justify-end gap-4 sticky bottom-0">
          <FormField label="رابط التقديم" error={errors.applyUrl} required>
            <Input
                placeholder="https://example.com/apply"
                value={formData.applyUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, applyUrl: e.target.value })}
            />
          </FormField>
          <Button
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<PaperAirplaneIcon className="h-5 w-5" />}
          >
            {isSubmitting ? 'جاري النشر...' : 'نشر الوظيفة'}
          </Button>
        </div>
      </form>
    </div>
  );
} 