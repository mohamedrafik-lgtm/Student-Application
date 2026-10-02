'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/app/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/app/components/PageHeader';
import { createPaperExam } from '@/lib/paper-exams-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const paperExamSchema = z.object({
  trainingContentId: z.coerce.number().min(1, 'المادة التدريبية مطلوبة'),
  title: z.string().min(1, 'عنوان الاختبار مطلوب'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  examDate: z.string().min(1, 'تاريخ الاختبار مطلوب'),
  duration: z.coerce.number().min(1, 'مدة الاختبار مطلوبة'),
  gradeType: z.enum(['YEAR_WORK', 'PRACTICAL', 'WRITTEN', 'FINAL_EXAM']),
  totalMarks: z.coerce.number().min(1, 'إجمالي الدرجات مطلوب'),
  passingScore: z.coerce.number().min(0).max(100),
  academicYear: z.string().min(1, 'العام الدراسي مطلوب'),
  semester: z.enum(['FIRST', 'SECOND']).optional(),
  notes: z.string().optional(),
});

type PaperExamFormData = z.infer<typeof paperExamSchema>;

export default function NewPaperExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<any>(null);

  const form = useForm<PaperExamFormData>({
    resolver: zodResolver(paperExamSchema),
    defaultValues: {
      title: '',
      description: '',
      instructions: '',
      examDate: '',
      duration: 120,
      gradeType: 'WRITTEN',
      totalMarks: 20,
      passingScore: 50,
      academicYear: new Date().getFullYear().toString(),
      semester: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    loadTrainingContents();
  }, []);

  // تحديث الدرجات القصوى عند اختيار المادة ونوع الدرجة
  useEffect(() => {
    const contentId = form.watch('trainingContentId');
    const gradeType = form.watch('gradeType');
    
    if (contentId && gradeType && selectedContent) {
      const maxMarks = getMaxMarksForGradeType(selectedContent, gradeType);
      form.setValue('totalMarks', maxMarks);
    }
  }, [form.watch('trainingContentId'), form.watch('gradeType'), selectedContent]);

  const loadTrainingContents = async () => {
    try {
      const data = await fetchAPI('/training-contents');
      setTrainingContents(data || []);
    } catch (error) {
      toast.error('فشل تحميل المواد التدريبية');
    }
  };

  const getMaxMarksForGradeType = (content: any, gradeType: string): number => {
    const marksMap: { [key: string]: number } = {
      YEAR_WORK: content.yearWorkMarks,
      PRACTICAL: content.practicalMarks,
      WRITTEN: content.writtenMarks,
      FINAL_EXAM: content.finalExamMarks,
    };
    return marksMap[gradeType] || 0;
  };

  const onSubmit = async (values: PaperExamFormData) => {
    try {
      setLoading(true);
      const exam = await createPaperExam(values);
      toast.success('تم إنشاء الاختبار الورقي بنجاح!');
      router.push(`/dashboard/paper-exams/${exam.id}`);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إنشاء الاختبار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء اختبار ورقي جديد"
        description="إعداد اختبار ورقي بنماذج أسئلة وأوراق إجابة"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
          { label: 'إنشاء اختبار' },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* المادة التدريبية */}
            <FormField
              control={form.control}
              name="trainingContentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">المادة التدريبية *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const content = trainingContents.find(c => c.id === parseInt(value));
                      setSelectedContent(content);
                    }}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المادة التدريبية" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trainingContents.map((content) => (
                        <SelectItem key={content.id} value={content.id.toString()}>
                          {content.code} - {content.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* عنوان الاختبار */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">عنوان الاختبار *</FormLabel>
                    <FormControl>
                      <input placeholder="مثال: اختبار نهاية الفصل الأول" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* تاريخ الاختبار */}
              <FormField
                control={form.control}
                name="examDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">تاريخ الاختبار *</FormLabel>
                    <FormControl>
                      <input type="datetime-local" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* الوصف */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">وصف الاختبار</FormLabel>
                  <FormControl>
                    <Textarea placeholder="وصف اختياري للاختبار" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* التعليمات */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">تعليمات الاختبار</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="تعليمات للطلاب (اختياري)"
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* نوع الدرجة */}
              <FormField
                control={form.control}
                name="gradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">نوع الدرجة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الدرجة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="YEAR_WORK">أعمال السنة</SelectItem>
                        <SelectItem value="PRACTICAL">العملي</SelectItem>
                        <SelectItem value="WRITTEN">التحريري</SelectItem>
                        <SelectItem value="FINAL_EXAM">الميد تيرم</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* إجمالي الدرجات */}
              <FormField
                control={form.control}
                name="totalMarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">إجمالي الدرجات *</FormLabel>
                    <FormControl>
                      <input type="number" step="0.5" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    {selectedContent && form.watch('gradeType') && (
                      <p className="text-xs text-blue-600">
                        الحد الأقصى: {getMaxMarksForGradeType(selectedContent, form.watch('gradeType'))}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* درجة النجاح */}
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">درجة النجاح (%)</FormLabel>
                    <FormControl>
                      <input type="number" min="0" max="100" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* مدة الاختبار */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">مدة الاختبار (بالدقائق) *</FormLabel>
                    <FormControl>
                      <input type="number" min="1" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* العام الدراسي */}
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">العام الدراسي *</FormLabel>
                    <FormControl>
                      <input placeholder="مثال: 2024/2025" {...field} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* الفصل الدراسي */}
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">الفصل الدراسي</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل (اختياري)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIRST">الفصل الأول</SelectItem>
                        <SelectItem value="SECOND">الفصل الثاني</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">ملاحظات إدارية</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ملاحظات اختيارية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                leftIcon={<ArrowRightIcon className="w-4 h-4" />}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
              >
                إنشاء الاختبار
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}