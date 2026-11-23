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
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

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
  const [programs, setPrograms] = useState<any[]>([]);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [showProgramList, setShowProgramList] = useState(true);
  const [showContentList, setShowContentList] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');

  const form = useForm<PaperExamFormData>({
    resolver: zodResolver(paperExamSchema),
    defaultValues: {
      trainingContentId: 0,
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
    loadPrograms();
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

  const loadPrograms = async () => {
    try {
      const response = await fetchAPI('/programs');
      const data = response?.programs || response || [];
      setPrograms(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('فشل تحميل البرامج التدريبية');
    } finally {
      setLoadingPrograms(false);
    }
  };

  const openProgram = async (program: any) => {
    setSelectedProgram(program);
    setSelectedContent(null);
    setTrainingContents([]);
    setContentSearch('');
    setShowProgramList(false);
    setShowContentList(true);
    form.setValue('trainingContentId', 0, { shouldDirty: true, shouldValidate: false });
    form.clearErrors('trainingContentId');
    setLoadingContents(true);
    try {
      const data = await fetchAPI(`/training-contents?programId=${program.id}`);
      setTrainingContents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('فشل تحميل مواد البرنامج التدريبي');
    } finally {
      setLoadingContents(false);
    }
  };

  const chooseTrainingContent = (content: any) => {
    setSelectedContent(content);
    form.setValue('trainingContentId', content.id, { shouldValidate: true, shouldDirty: true });
    setShowContentList(false);
  };

  const changeProgram = () => {
    setSelectedProgram(null);
    setSelectedContent(null);
    setTrainingContents([]);
    setShowProgramList(true);
    setShowContentList(false);
    form.setValue('trainingContentId', 0, { shouldDirty: true, shouldValidate: false });
    form.clearErrors('trainingContentId');
  };

  const filteredPrograms = programs.filter((program) => {
    const query = programSearch.trim().toLowerCase();
    return !query || `${program.nameAr || ''} ${program.nameEn || ''} ${program.code || ''}`.toLowerCase().includes(query);
  });

  const filteredContents = trainingContents.filter((content) => {
    const query = contentSearch.trim().toLowerCase();
    return !query || `${content.name || ''} ${content.code || ''}`.toLowerCase().includes(query);
  });

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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* اختيار البرنامج ثم المادة */}
            <FormField
              control={form.control}
              name="trainingContentId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <input type="hidden" {...field} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <FormLabel className="text-base font-bold text-slate-900">المادة التدريبية *</FormLabel>
                      <p className="mt-1 text-sm text-slate-500">ابدأ باختيار البرنامج التدريبي، ثم اختر مادة من مواده.</p>
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <div className={`flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex-none ${selectedProgram ? 'bg-blue-50 text-blue-700' : 'bg-blue-600 text-white'}`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-blue-700">١</span>
                        البرنامج
                      </div>
                      <div className="h-px w-5 bg-slate-200" />
                      <div className={`flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex-none ${selectedContent ? 'bg-emerald-50 text-emerald-700' : selectedProgram ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-700">٢</span>
                        المادة
                      </div>
                    </div>
                  </div>

                  {selectedContent ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm"><BookOpenIcon className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-emerald-700">{selectedProgram?.nameAr || 'البرنامج التدريبي'}</p>
                          <p className="truncate font-bold text-slate-900">{selectedContent.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">رمز المادة: {selectedContent.code || '—'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setShowContentList(true)}>تغيير المادة</Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={changeProgram}>تغيير البرنامج</Button>
                      </div>
                    </div>
                  ) : null}

                  {showProgramList && !selectedContent && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">اختر البرنامج التدريبي</h3>
                          <p className="mt-1 text-xs text-slate-500">اضغط على البرنامج لعرض المواد التابعة له.</p>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="ابحث عن برنامج..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-9 ps-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                        </div>
                      </div>
                      {loadingPrograms ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
                      ) : filteredPrograms.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">{programs.length ? 'لا توجد برامج تطابق البحث.' : 'لا توجد برامج تدريبية متاحة.'}</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredPrograms.map((program) => (
                            <button key={program.id} type="button" onClick={() => openProgram(program)} className="group flex min-h-24 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                              <span className="rounded-xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><AcademicCapIcon className="h-6 w-6" /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-slate-900">{program.nameAr || program.nameEn || 'برنامج تدريبي'}</span>
                                {program.nameEn && program.nameAr && <span className="mt-1 block truncate text-xs text-slate-500">{program.nameEn}</span>}
                                <span className="mt-1 block text-xs font-medium text-blue-700">عرض المواد ←</span>
                              </span>
                              <ArrowLeftIcon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedProgram && showContentList && (
                    <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="rounded-lg bg-white p-2 text-blue-700 shadow-sm"><AcademicCapIcon className="h-5 w-5" /></span>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">المواد التابعة للبرنامج</p>
                            <h3 className="truncate font-bold text-slate-900">{selectedProgram.nameAr || selectedProgram.nameEn}</h3>
                          </div>
                        </div>
                        <div className="flex w-full gap-2 sm:w-auto">
                          <Button type="button" variant="outline" className="shrink-0" onClick={() => { setShowProgramList(true); setShowContentList(false); }}>
                            <ArrowRightIcon className="ms-1 h-4 w-4" /> البرامج
                          </Button>
                          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                            <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} placeholder="ابحث عن مادة..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-9 ps-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                          </div>
                        </div>
                      </div>
                      {loadingContents ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
                      ) : filteredContents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">{trainingContents.length ? 'لا توجد مواد تطابق البحث.' : 'لا توجد مواد مسجلة لهذا البرنامج.'}</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredContents.map((content) => (
                            <button key={content.id} type="button" onClick={() => chooseTrainingContent(content)} className="group flex min-h-20 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><BookOpenIcon className="h-5 w-5" /></span>
                              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{content.name}</span><span className="mt-1 block text-xs text-slate-500">{content.code || 'بدون رمز'}</span></span>
                              <CheckCircleIcon className="h-5 w-5 shrink-0 text-slate-200 transition group-hover:text-emerald-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
