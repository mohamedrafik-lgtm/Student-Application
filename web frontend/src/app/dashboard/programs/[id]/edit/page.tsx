'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

import { 
  ArrowRightIcon, 
  AcademicCapIcon,
  CurrencyDollarIcon,
  ChatBubbleBottomCenterTextIcon,
  BookmarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/app/components/ui/Textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import PageGuard from '@/components/permissions/PageGuard';

const formSchema = z.object({
  nameAr: z.string().min(3, "يجب أن يكون الاسم 3 أحرف على الأقل"),
  nameEn: z.string().min(3, "Name must be at least 3 characters"),
  price: z.coerce.number().min(0, "يجب أن يكون السعر أكبر من أو يساوي 0"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function EditProgramPageContent({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProgram = async () => {
        setLoading(true);
        try {
          const programData = await fetchAPI(`/programs/${id}`);
          if (programData) {
            form.reset({
              nameAr: programData.nameAr || "",
              nameEn: programData.nameEn || "",
              price: programData.price || 0,
              description: programData.description || "",
            });
          } else {
            setError('لم يتم العثور على البرنامج المطلوب.');
          }
        } catch (err) {
          setError('حدث خطأ أثناء تحميل بيانات البرنامج');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProgram();
    }
  }, [isAuthenticated, id, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await fetchAPI(`/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      toast.success('تم تحديث البرنامج بنجاح');
      router.push('/dashboard/programs');
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('فشل في تحديث البرنامج. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="تعديل البرنامج"
          description="قم بتحديث بيانات البرنامج أدناه."
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'البرامج', href: '/dashboard/programs' },
            { label: 'تعديل برنامج' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-slate-200 rounded-lg" /><div className="h-4 w-36 bg-slate-200 rounded" /></div>
                  <div className="h-px bg-slate-100" />
                  <div className="grid grid-cols-2 gap-4">{[1,2].map(j => <div key={j} className="h-10 bg-slate-100 rounded-lg" />)}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-fit space-y-4">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-slate-200 rounded-lg" /><div className="h-4 w-20 bg-slate-200 rounded" /></div>
              <div className="h-px bg-slate-100" />
              <div className="h-10 bg-emerald-50 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center p-8">
          <div className="p-3 rounded-full bg-red-50 w-fit mx-auto mb-4">
            <AcademicCapIcon className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">حدث خطأ</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/programs')}
            className="mt-4"
          >
            العودة للبرامج
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تعديل البرنامج"
        description="قم بتحديث بيانات البرنامج أدناه."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'البرامج', href: '/dashboard/programs' },
          { label: 'تعديل برنامج' }
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/programs')}
            leftIcon={<ArrowRightIcon className="h-4 w-4" />}
          >
            العودة للبرامج
          </Button>
        }
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* البيانات الأساسية */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-tiba-primary/10">
                        <AcademicCapIcon className="w-4 h-4 text-tiba-primary" />
                      </div>
                      البيانات الأساسية للبرنامج
                    </h3>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="nameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-600">اسم البرنامج (عربي)</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: دبلومة المساحة والإنشاءات" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-600">Program Name (English)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Surveying and Construction Diploma" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-600">السعر (بالجنيه المصري)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CurrencyDollarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                              <Input type="number" placeholder="أدخل سعر البرنامج" {...field} className="pr-9" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* الوصف */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-50">
                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-violet-600" />
                      </div>
                      الوصف التفصيلي
                    </h3>
                  </div>
                  <div className="p-5">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-600">الوصف (اختياري)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="أدخل وصفًا موجزًا للبرنامج، مثل المحتوى، المدة، والجمهور المستهدف..."
                              className="resize-vertical min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </div>

              {/* الشريط الجانبي */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-50">
                        <BookmarkIcon className="w-4 h-4 text-amber-600" />
                      </div>
                      الحالة
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-emerald-700">
                        البرنامج منشور حاليًا.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      تأكد من مراجعة جميع البيانات قبل الحفظ. ستظهر التغييرات على الفور.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* زر الحفظ */}
            <div className="mt-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 px-6 rounded-b-xl">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'جاري التحديث...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function EditProgramPage({ params }: { params: { id: string } }) {
  return (
    <PageGuard>
      <EditProgramPageContent params={params} />
    </PageGuard>
  );
}