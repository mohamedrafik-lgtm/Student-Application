'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import { TibaSelect } from '@/app/components/ui/Select';
import PageHeader from '@/app/components/PageHeader';
import { 
  getPaperExam, 
  createExamModel, 
  generateAnswerSheets,
  downloadGradesTemplate,
  uploadGradesExcel
} from '@/lib/paper-exams-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CheckCircleIcon,
  UsersIcon,
  CameraIcon,
  TrashIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

export default function PaperExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const examId = parseInt(resolvedParams.id);
  
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModelForm, setShowModelForm] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [modelCode, setModelCode] = useState('');
  const [modelName, setModelName] = useState('');
  const [autoSelectCount, setAutoSelectCount] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; modelId: number | null; modelName: string }>({ isOpen: false, modelId: null, modelName: '' });
  const [showMultipleModelsForm, setShowMultipleModelsForm] = useState(false);
  const [numberOfModels, setNumberOfModels] = useState('4');
  const [isCreatingMultiple, setIsCreatingMultiple] = useState(false);
  const [distributionMethod, setDistributionMethod] = useState<'alphabetical' | 'by_distribution' | 'single_room' | 'custom_committees' | 'custom_groups'>('alphabetical');
  const [availableDistributions, setAvailableDistributions] = useState<any[]>([]);
  const [selectedDistributionId, setSelectedDistributionId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excludeUsedQuestions, setExcludeUsedQuestions] = useState(false);
  const [numberOfCommittees, setNumberOfCommittees] = useState('5');
  const [modelsPerCommittee, setModelsPerCommittee] = useState('4');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [groupsSettings, setGroupsSettings] = useState<{[roomId: string]: {committees: string, models: string}}>({});

  // التحميل الأول فقط
  useEffect(() => {
    loadData(false);
    setIsFirstLoad(false);
  }, [examId]);

  // إعادة التحميل عند تغيير excludeUsedQuestions (مع الحفاظ على موضع الصفحة)
  useEffect(() => {
    if (!isFirstLoad) {
      loadData(true);
    }
  }, [excludeUsedQuestions]);

  useEffect(() => {
    if (exam) {
      loadDistributions();
    }
  }, [exam]);

  const loadData = async (keepScrollPosition = false) => {
    try {
      // حفظ موضع الـ scroll الحالي
      const scrollPosition = keepScrollPosition ? window.scrollY : 0;
      
      setLoading(true);
      const examData = await getPaperExam(examId);
      setExam(examData);
      
      // جلب الأسئلة المتاحة (اختيار من متعدد فقط)
      const questionsUrl = excludeUsedQuestions 
        ? `/questions/content/${examData.trainingContentId}?excludeUsedInPaperExams=true`
        : `/questions/content/${examData.trainingContentId}`;
      const questions = await fetchAPI(questionsUrl);
      const multipleChoiceOnly = (questions || []).filter((q: any) => q.options?.length > 2);
      setAvailableQuestions(multipleChoiceOnly);
      
      // استعادة موضع الـ scroll
      if (keepScrollPosition) {
        setTimeout(() => window.scrollTo(0, scrollPosition), 0);
      }
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل المجموعات عند اختيار التوزيع
  useEffect(() => {
    if (selectedDistributionId && (distributionMethod === 'single_room' || distributionMethod === 'custom_committees' || distributionMethod === 'custom_groups')) {
      const selectedDist = availableDistributions.find(d => d.id === selectedDistributionId);
      if (selectedDist && selectedDist.rooms) {
        setAvailableRooms(selectedDist.rooms);
      }
    } else {
      setAvailableRooms([]);
      setSelectedRoomId('');
    }
  }, [selectedDistributionId, distributionMethod, availableDistributions]);

  const loadDistributions = async () => {
    if (!exam) return;
    
    try {
      console.log('🔍 جلب التوزيعات للمادة:', exam.trainingContentId);
      
      // جلب المادة التدريبية مع البرنامج
      const contentData = await fetchAPI(`/training-contents/${exam.trainingContentId}`);
      console.log('📚 بيانات المادة:', contentData);
      
      const programId = contentData.classroom?.programId || contentData.programId;
      
      if (!programId) {
        console.warn('⚠️ لم يتم العثور على programId في بيانات المادة');
        return;
      }
      
      console.log('🎓 البرنامج:', programId);
      
      // جلب التوزيعات المتاحة لهذا البرنامج
      const distributions = await fetchAPI(`/trainee-distribution?programId=${programId}`);
      console.log('📋 التوزيعات المتاحة:', distributions);
      
      setAvailableDistributions(distributions || []);
      
      if (distributions && distributions.length > 0) {
        console.log(`✅ تم جلب ${distributions.length} توزيع`);
      } else {
        console.warn('⚠️ لا توجد توزيعات لهذا البرنامج');
      }
    } catch (error) {
      console.error('❌ Error loading distributions:', error);
    }
  };

  const handleAutoSelect = () => {
    const count = parseInt(autoSelectCount);
    if (!count || count <= 0) {
      toast.error('أدخل عدد صحيح من الأسئلة');
      return;
    }

    if (count > availableQuestions.length) {
      toast.error(`العدد المتاح فقط ${availableQuestions.length} سؤال`);
      return;
    }

    // اختيار أول N سؤال
    const selectedQs = availableQuestions.slice(0, count);
    
    // حساب الدرجة لكل سؤال مع ضمان المجموع يساوي totalMarks بالضبط
    const totalMarks = exam?.totalMarks || 100;
    const basePoints = Math.floor((totalMarks / count) * 100) / 100; // درجة أساسية
    
    // إنشاء الأسئلة مع الدرجة الأساسية
    const questionsWithPoints = selectedQs.map(q => ({
      ...q,
      points: basePoints
    }));
    
    // حساب المجموع الحالي
    const currentTotal = Math.round(basePoints * count * 100) / 100;
    
    // حساب الفرق المتبقي
    const difference = Math.round((totalMarks - currentTotal) * 100) / 100;
    
    // إضافة الفرق للسؤال الأخير
    if (questionsWithPoints.length > 0) {
      const lastQuestionPoints = Math.round((basePoints + difference) * 100) / 100;
      questionsWithPoints[questionsWithPoints.length - 1].points = lastQuestionPoints;
    }
    
    // التحقق من المجموع النهائي
    const finalTotal = questionsWithPoints.reduce((sum, q) => sum + q.points, 0);
    console.log(`التوزيع: ${count} سؤال، كل سؤال ${basePoints}، الأخير ${questionsWithPoints[questionsWithPoints.length - 1].points}، المجموع ${finalTotal}`);

    setSelectedQuestions(questionsWithPoints);
    toast.success(`تم اختيار ${count} سؤال وتوزيع ${totalMarks} درجة عليهم`);
  };

  const handleCreateModel = async () => {
    if (!modelCode || !modelName) {
      toast.error('يجب إدخال رمز واسم النموذج');
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error('يجب اختيار أسئلة للنموذج');
      return;
    }

    try {
      await createExamModel({
        paperExamId: examId,
        modelCode,
        modelName,
        questions: selectedQuestions.map((q, index) => ({
          questionId: q.id,
          orderInModel: index + 1,
          points: q.points || 1,
        })),
      });

      toast.success('تم إنشاء نموذج الأسئلة بنجاح!');
      setShowModelForm(false);
      setModelCode('');
      setModelName('');
      setSelectedQuestions([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إنشاء النموذج');
    }
  };

  const handleGenerateSheets = async (modelId: number) => {
    if (!confirm('هل أنت متأكد من توليد أوراق الإجابة لجميع المتدربين؟')) {
      return;
    }

    try {
      const result = await generateAnswerSheets(examId, modelId);
      toast.success(result.message || 'تم توليد أوراق الإجابة بنجاح!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في توليد أوراق الإجابة');
    }
  };

  const handleCreateMultipleModels = async () => {
    // للمجموعة الواحدة، نموذج واحد فقط
    // للجان المخصصة، عدد النماذج لكل لجنة
    let count;
    if (distributionMethod === 'single_room') {
      count = 1;
    } else if (distributionMethod === 'custom_committees') {
      count = parseInt(modelsPerCommittee);
    } else {
      count = parseInt(numberOfModels);
    }
    
    if (distributionMethod !== 'single_room' && distributionMethod !== 'custom_committees' && (!count || count < 2 || count > 8)) {
      toast.error('أدخل عدداً بين 2 و 8 نماذج');
      return;
    }
    
    if (distributionMethod === 'custom_committees') {
      const committees = parseInt(numberOfCommittees);
      if (!committees || committees < 1 || committees > 20) {
        toast.error('أدخل عدد لجان بين 1 و 20');
        return;
      }
      if (!count || count < 2 || count > 8) {
        toast.error('أدخل عدد نماذج بين 2 و 8 لكل لجنة');
        return;
      }
    }

    if (selectedQuestions.length === 0) {
      toast.error('يجب اختيار أسئلة أولاً');
      return;
    }
    
    if ((distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && !selectedRoomId) {
      toast.error('يجب اختيار المجموعة المحددة');
      return;
    }

    try {
      setIsCreatingMultiple(true);
      
      const requestBody: any = {
        numberOfModels: count,
        questions: selectedQuestions.map(q => ({
          questionId: q.id,
          points: q.points || 1,
        })),
        distributionMethod,
      };
      
      // إضافة معرف التوزيع إذا كان الترتيب حسب التوزيع
      if ((distributionMethod === 'by_distribution' || distributionMethod === 'single_room' || distributionMethod === 'custom_committees' || distributionMethod === 'custom_groups') && selectedDistributionId) {
        requestBody.distributionId = selectedDistributionId;
      }
      
      // إضافة معرف المجموعة إذا كان اختبار لمجموعة واحدة أو لجان مخصصة
      if ((distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && selectedRoomId) {
        requestBody.roomId = selectedRoomId;
      }
      
      // إضافة إعدادات اللجان المخصصة
      if (distributionMethod === 'custom_committees') {
        requestBody.numberOfCommittees = parseInt(numberOfCommittees);
        requestBody.modelsPerCommittee = parseInt(modelsPerCommittee);
      }
      
      // إضافة إعدادات المجموعات المخصصة
      if (distributionMethod === 'custom_groups') {
        requestBody.groupsSettings = Object.entries(groupsSettings).map(([roomId, settings]) => ({
          roomId,
          numberOfCommittees: parseInt(settings.committees),
          modelsPerCommittee: parseInt(settings.models)
        }));
      }
      
      const response = await fetchAPI(`/paper-exams/${examId}/create-multiple-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      toast.success(response.message || 'تم إنشاء النماذج بنجاح!');
      setShowMultipleModelsForm(false);
      setSelectedQuestions([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إنشاء النماذج');
    } finally {
      setIsCreatingMultiple(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('جاري تحضير الملف...', { id: 'download' });
      const blob = await downloadGradesTemplate(examId);
      
      // إنشاء رابط تحميل
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exam-${examId}-grades-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الملف بنجاح!', { id: 'download' });
    } catch (error: any) {
      toast.error(error.message || 'فشل تحميل الملف', { id: 'download' });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('يجب اختيار ملف Excel (.xlsx أو .xls)');
      return;
    }

    try {
      setUploadingExcel(true);
      toast.loading('جاري رفع الملف ومعالجة الدرجات...', { id: 'upload' });

      const result = await uploadGradesExcel(examId, file);
      
      toast.success(
        `${result.success} متدرب تم تحديث درجاتهم${result.failed > 0 ? ` - ${result.failed} فشل` : ''}`,
        { 
          id: 'upload',
          duration: 5000
        }
      );

      if (result.errors && result.errors.length > 0) {
        console.error('أخطاء معالجة Excel:', result.errors);
      }

      // إعادة تحميل البيانات
      loadData();
      
      // مسح input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل رفع الملف', { id: 'upload' });
    } finally {
      setUploadingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-12 bg-slate-100 rounded animate-pulse" />
            <div className="h-12 bg-slate-100 rounded animate-pulse" />
            <div className="h-12 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return <div>الاختبار غير موجود</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.title}
        description={exam.trainingContent.name}
        breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' }, { label: 'تفاصيل الاختبار' }]}
      />

      {/* معلومات الاختبار */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 text-slate-900">معلومات الاختبار</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600">تاريخ الاختبار</p>
            <p className="font-bold text-slate-900">{new Date(exam.examDate).toLocaleDateString('ar-EG')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">المدة</p>
            <p className="font-bold text-slate-900">{exam.duration} دقيقة</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">الدرجات</p>
            <p className="font-bold text-slate-900">{exam.totalMarks} درجة</p>
          </div>
        </div>
      </div>

      {/* نماذج الأسئلة */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-slate-900">نماذج الأسئلة ({exam.models?.length || 0})</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowModelForm(!showModelForm)}
              variant="primary"
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              إضافة نموذج
            </Button>
            <Button
              onClick={() => setShowMultipleModelsForm(!showMultipleModelsForm)}
              variant="primary"
              leftIcon={<UsersIcon className="w-4 h-4" />}
            >
              نماذج متعددة
            </Button>
          </div>
        </div>

        {/* نموذج نماذج متعددة */}
        {showMultipleModelsForm && (
          <div className="mb-6 p-6 border-2 border-purple-200 rounded-xl bg-purple-50">
            <h4 className="font-bold text-lg text-purple-900 mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              إنشاء نماذج متعددة وتوزيع تلقائي
            </h4>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 leading-relaxed">
                <strong>كيف يعمل:</strong><br/>
                1. اختر عدد النماذج (2-8)<br/>
                2. اختر طريقة الترتيب (أبجدي أو حسب التوزيع)<br/>
                3. اختر الأسئلة (سيتم خلطها لكل نموذج)<br/>
                4. ترتيب الأسئلة والخيارات سيكون مختلف لكل نموذج
              </p>
            </div>

            {/* اختيار طريقة الترتيب */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                طريقة ترتيب وتوزيع الطلاب *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDistributionMethod('alphabetical');
                    setSelectedDistributionId('');
                    setSelectedRoomId('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    distributionMethod === 'alphabetical'
                      ? 'border-blue-600 bg-blue-50 shadow-sm'
                      : 'border-slate-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      distributionMethod === 'alphabetical' ? 'bg-blue-600' : 'bg-slate-300'
                    }`}>
                      <span className="text-white text-lg font-bold">أ</span>
                    </div>
                    <div className="text-right flex-1">
                      <p className={`font-bold ${distributionMethod === 'alphabetical' ? 'text-blue-900' : 'text-slate-700'}`}>
                        ترتيب أبجدي
                      </p>
                      <p className="text-xs text-slate-600">جميع الطلاب</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDistributionMethod('by_distribution');
                    setSelectedRoomId('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    distributionMethod === 'by_distribution'
                      ? 'border-green-600 bg-green-50 shadow-sm'
                      : 'border-slate-300 bg-white hover:border-green-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      distributionMethod === 'by_distribution' ? 'bg-green-600' : 'bg-slate-300'
                    }`}>
                      <UsersIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right flex-1">
                      <p className={`font-bold ${distributionMethod === 'by_distribution' ? 'text-green-900' : 'text-slate-700'}`}>
                        حسب التوزيع الكامل
                      </p>
                      <p className="text-xs text-slate-600">كل المجموعات</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMethod('single_room')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    distributionMethod === 'single_room'
                      ? 'border-purple-600 bg-purple-50 shadow-sm'
                      : 'border-slate-300 bg-white hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      distributionMethod === 'single_room' ? 'bg-purple-600' : 'bg-slate-300'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                      </svg>
                    </div>
                    <div className="text-right flex-1">
                      <p className={`font-bold ${distributionMethod === 'single_room' ? 'text-purple-900' : 'text-slate-700'}`}>
                        مجموعة واحدة فقط
                      </p>
                      <p className="text-xs text-slate-600">اختبار لمجموعة محددة</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMethod('custom_committees')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    distributionMethod === 'custom_committees'
                      ? 'border-orange-600 bg-orange-50 shadow-sm'
                      : 'border-slate-300 bg-white hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      distributionMethod === 'custom_committees' ? 'bg-orange-600' : 'bg-slate-300'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"/>
                      </svg>
                    </div>
                    <div className="text-right flex-1">
                      <p className={`font-bold ${
                        distributionMethod === 'custom_committees' ? 'text-orange-900' : 'text-slate-700'
                      }`}>
                        لجان مخصصة
                      </p>
                      <p className="text-xs text-slate-600">تقسيم مجموعة واحدة إلى لجان</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="p-4 rounded-xl border-2 transition-all border-slate-200 bg-slate-100 cursor-not-allowed opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-400">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z"/>
                      </svg>
                    </div>
                    <div className="text-right flex-1">
                      <p className="font-bold text-slate-500">
                        مجموعات مخصصة
                      </p>
                      <p className="text-xs text-slate-500">قريباً - تحت التطوير</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* اختيار التوزيع إذا كان الترتيب حسب التوزيع */}
            {(distributionMethod === 'by_distribution' || distributionMethod === 'single_room' || distributionMethod === 'custom_committees' || distributionMethod === 'custom_groups') && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <label className="block text-sm font-medium text-green-900 mb-2">
                  اختر التوزيع المراد استخدامه *
                </label>
                <TibaSelect
                  options={availableDistributions.map((dist) => ({
                    value: String(dist.id),
                    label: `${dist.type === 'THEORY' ? 'توزيع النظري' : 'توزيع العملي'} - ${dist.numberOfRooms} مجموعات - (${dist.rooms.reduce((sum: number, r: any) => sum + (r._count?.assignments || 0), 0)} طالب)`
                  }))}
                  value={selectedDistributionId}
                  onChange={(val) => {
                    setSelectedDistributionId(val);
                    setSelectedRoomId('');
                  }}
                  placeholder="-- اختر التوزيع --"
                />
                <p className="text-xs text-green-700 mt-2">
                  {distributionMethod === 'single_room'
                    ? 'سيتم إنشاء أوراق فقط للطلاب في المجموعة المختارة'
                    : 'سيتم إنشاء أوراق فقط للطلاب الموزعين في هذا التوزيع'
                  }
                </p>
              </div>
            )}

            {/* اختيار المجموعة إذا كان اختبار لمجموعة واحدة أو لجان مخصصة */}
            {(distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && selectedDistributionId && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  اختر المجموعة المحددة *
                </label>
                <TibaSelect
                  options={availableRooms.map((room) => ({
                    value: String(room.id),
                    label: `${room.roomName} (${room._count?.assignments || 0} طالب)`
                  }))}
                  value={selectedRoomId}
                  onChange={(val) => setSelectedRoomId(val)}
                  placeholder="-- اختر المجموعة --"
                />
                <p className="text-xs text-purple-700 mt-2">
                  سيتم إنشاء نموذج واحد فقط للطلاب في هذه المجموعة
                </p>
              </div>
            )}

            {/* إعدادات المجموعات المخصصة */}
            {distributionMethod === 'custom_groups' && selectedDistributionId && (
              <div className="mb-4 p-4 bg-teal-50 border-2 border-teal-300 rounded-xl">
                <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z"/>
                  </svg>
                  إعدادات المجموعات المخصصة
                </h4>
                
                <div className="space-y-4">
                  {availableRooms.map((room) => (
                    <div key={room.id} className="p-4 bg-white border-2 border-teal-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-teal-900 text-lg">{room.roomName}</h5>
                        <span className="text-sm text-teal-700 bg-teal-100 px-3 py-1 rounded-full">
                          {room._count?.assignments || 0} طالب
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-teal-800 mb-1">
                            عدد اللجان *
                          </label>
                          <input
                            type="number"
                            value={groupsSettings[room.id]?.committees || '3'}
                            onChange={(e) => setGroupsSettings({
                              ...groupsSettings,
                              [room.id]: {
                                committees: e.target.value,
                                models: groupsSettings[room.id]?.models || '4'
                              }
                            })}
                            className="w-full px-3 py-2 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold"
                            min="1"
                            max="20"
                            placeholder="3"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-teal-800 mb-1">
                            عدد النماذج لكل لجنة *
                          </label>
                          <input
                            type="number"
                            value={groupsSettings[room.id]?.models || '4'}
                            onChange={(e) => setGroupsSettings({
                              ...groupsSettings,
                              [room.id]: {
                                committees: groupsSettings[room.id]?.committees || '3',
                                models: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold"
                            min="2"
                            max="8"
                            placeholder="4"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-white border-2 border-teal-200 rounded-lg">
                  <p className="text-sm text-teal-900 font-bold mb-2">مثال توضيحي:</p>
                  <ul className="text-xs text-teal-800 space-y-1">
                    <li>• كل مجموعة ستُقسم إلى لجان حسب العدد المحدد</li>
                    <li>• داخل كل لجنة، سيتم توزيع النماذج بالتتابع على الطلاب</li>
                    <li>• مثال: المجموعة أ (3 لجان × 4 نماذج)، المجموعة ب (2 لجان × 3 نماذج)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* إعدادات اللجان المخصصة */}
            {distributionMethod === 'custom_committees' && selectedRoomId && (
              <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl">
                <h4 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"/>
                  </svg>
                  إعدادات اللجان المخصصة
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-orange-900 mb-2">
                      عدد اللجان *
                    </label>
                    <input
                      type="number"
                      value={numberOfCommittees}
                      onChange={(e) => setNumberOfCommittees(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold text-lg"
                      min="1"
                      max="20"
                      placeholder="مثال: 5"
                    />
                    <p className="text-xs text-orange-700 mt-1">سيتم تقسيم الطلاب بالتساوي على اللجان</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-orange-900 mb-2">
                      عدد النماذج لكل لجنة *
                    </label>
                    <input
                      type="number"
                      value={modelsPerCommittee}
                      onChange={(e) => setModelsPerCommittee(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold text-lg"
                      min="2"
                      max="8"
                      placeholder="مثال: 4"
                    />
                    <p className="text-xs text-orange-700 mt-1">النماذج ستوزع بالتتابع داخل كل لجنة</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white border-2 border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-900 font-bold mb-2">مثال توضيحي:</p>
                  <ul className="text-xs text-orange-800 space-y-1">
                    <li>• إذا كان عدد الطلاب 100 وعدد اللجان 5 → كل لجنة 20 طالب</li>
                    <li>• إذا كان عدد النماذج 4 → الطالب 1 نموذج A، الطالب 2 نموذج B، الطالب 3 نموذج C، الطالب 4 نموذج D، الطالب 5 نموذج A مرة أخرى</li>
                    <li>• كل لجنة ستحصل على نفس النماذج الأربعة لكن بترتيب مختلف للطلاب</li>
                  </ul>
                </div>
              </div>
            )}

            {/* عدد النماذج - فقط إذا لم يكن single_room أو custom_committees أو custom_groups */}
            {distributionMethod !== 'single_room' && distributionMethod !== 'custom_committees' && distributionMethod !== 'custom_groups' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    عدد النماذج *
                  </label>
                  <input
                    type="number"
                    placeholder="مثال: 4"
                    value={numberOfModels}
                    onChange={(e) => setNumberOfModels(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    min="2"
                    max="8"
                  />
                  <p className="text-xs text-slate-600 mt-1">سيتم إنشاء نماذج A, B, C, D...</p>
                </div>
              </div>
            )}

            {/* اختيار تلقائي */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-3 text-blue-900">اختيار تلقائي للأسئلة</h4>
              
              {/* Checkbox لاستبعاد الأسئلة المستخدمة */}
              <div className="mb-3 p-3 bg-white border-2 border-green-300 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeUsedQuestions}
                    onChange={(e) => setExcludeUsedQuestions(e.target.checked)}
                    className="mt-1 w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">استبعاد الأسئلة المستخدمة في اختبارات سابقة</span>
                    <p className="text-xs text-slate-600 mt-1">
                      سيتم اختيار أسئلة جديدة فقط لم يتم استخدامها في أي اختبار ورقي سابق لنفس المادة التدريبية
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="عدد الأسئلة"
                  value={autoSelectCount}
                  onChange={(e) => setAutoSelectCount(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  min="1"
                />
                <Button
                  onClick={handleAutoSelect}
                  variant="primary"
                >
                  اختيار وتوزيع تلقائي
                </Button>
              </div>
            </div>

            {selectedQuestions.length > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">
                  تم اختيار {selectedQuestions.length} سؤال - المجموع: {selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0).toFixed(2)} درجة
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCreateMultipleModels}
                disabled={
                  isCreatingMultiple ||
                  selectedQuestions.length === 0 ||
                  (distributionMethod === 'by_distribution' && !selectedDistributionId) ||
                  ((distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && !selectedRoomId) ||
                  (distributionMethod === 'custom_groups' && !selectedDistributionId)
                }
                variant="success"
              >
                {isCreatingMultiple ? 'جاري الإنشاء...' : 
                  distributionMethod === 'custom_committees'
                    ? `إنشاء ${numberOfCommittees} لجان بـ ${modelsPerCommittee} نماذج لكل لجنة`
                    : distributionMethod === 'custom_groups'
                    ? `إنشاء نماذج لـ ${availableRooms.length} مجموعات مخصصة`
                    : `إنشاء ${numberOfModels || 0} نماذج وتوزيع الطلاب`
                }
              </Button>
              <Button onClick={() => {
                setShowMultipleModelsForm(false);
                setDistributionMethod('alphabetical');
                setSelectedDistributionId('');
                setSelectedRoomId('');
              }} variant="outline">
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {showModelForm && (
          <div className="mb-6 p-4 border rounded-lg bg-slate-50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="رمز النموذج (مثل: A)"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="اسم النموذج (مثل: نموذج أ)"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>

            {/* اختيار تلقائي */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-3 text-blue-900">اختيار تلقائي</h4>
              
              {/* Checkbox لاستبعاد الأسئلة المستخدمة */}
              <div className="mb-3 p-3 bg-white border-2 border-green-300 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeUsedQuestions}
                    onChange={(e) => setExcludeUsedQuestions(e.target.checked)}
                    className="mt-1 w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">استبعاد الأسئلة المستخدمة في اختبارات سابقة</span>
                    <p className="text-xs text-slate-600 mt-1">
                      سيتم اختيار أسئلة جديدة فقط لم يتم استخدامها في أي اختبار ورقي سابق لنفس المادة التدريبية
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="عدد الأسئلة (مثل: 70)"
                  value={autoSelectCount}
                  onChange={(e) => setAutoSelectCount(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  min="1"
                />
                <Button
                  onClick={handleAutoSelect}
                  variant="primary"
                >
                  اختيار وتوزيع تلقائي
                </Button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                سيتم اختيار الأسئلة الأولى وتوزيع {exam?.totalMarks || 0} درجة عليهم بالتساوي (مع مراعاة الكسور)
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">
                اختيار الأسئلة ({selectedQuestions.length}) -
                المجموع: {selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0).toFixed(2)} درجة
              </h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableQuestions.map((question) => {
                  const selected = selectedQuestions.find(q => q.id === question.id);
                  return (
                    <div key={question.id} className="flex items-center gap-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestions([...selectedQuestions, { ...question, points: 1 }]);
                          } else {
                            setSelectedQuestions(selectedQuestions.filter(q => q.id !== question.id));
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 text-sm">{question.text}</span>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs">درجة:</label>
                          <input
                            type="number"
                            value={selected.points || 1}
                            onChange={(e) => {
                              const newPoints = parseFloat(e.target.value) || 1;
                              setSelectedQuestions(
                                selectedQuestions.map(q =>
                                  q.id === question.id ? { ...q, points: newPoints } : q
                                )
                              );
                            }}
                            className="w-16 px-2 py-1 border rounded text-sm"
                            min="0.5"
                            step="0.5"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-700">
                  يمكنك تحديد درجة مختلفة لكل سؤال. المجموع يجب أن يساوي {exam?.totalMarks || 0} درجة
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateModel} variant="success">
                إنشاء النموذج
              </Button>
              <Button onClick={() => setShowModelForm(false)} variant="outline">
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {exam.models && exam.models.length > 0 ? (
          <div className="space-y-4">
            {/* إخفاء بطاقات النماذج في حالة اللجان/المجموعات المخصصة */}
            {exam.models.some((m: any) => m.distributionMethod === 'CUSTOM_COMMITTEES' || m.distributionMethod === 'CUSTOM_GROUPS') ? (
              <div className="space-y-4">
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <h4 className="font-bold text-blue-900">اختبار بنظام اللجان المخصصة</h4>
                      <p className="text-sm text-blue-700">تم إنشاء {exam.models.length} نماذج توزع بالتتابع داخل كل لجنة</p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800 mb-4">
                    النماذج المستخدمة: {exam.models.map((m: any) => m.modelCode).join(', ')}
                  </p>
                </div>

                {/* أزرار الطباعة للجان المخصصة */}
                {exam.models.some((m: any) => m.distributionMethod === 'CUSTOM_COMMITTEES') && (
                  <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"/>
                      </svg>
                      <h4 className="font-bold text-orange-900">طباعة اللجان المخصصة - مرتبة حسب اللجان</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button
                        size="sm"
                        onClick={() => window.open(`/print/committees-questions/${examId}`, '_blank')}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                        leftIcon={<PrinterIcon className="w-4 h-4" />}
                      >
                        أوراق الأسئلة (مرتبة)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(`/print/committees-answers/${examId}`, '_blank')}
                        variant="primary"
                        fullWidth
                        leftIcon={<PrinterIcon className="w-4 h-4" />}
                      >
                        أوراق الإجابة (مرتبة)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/dashboard/paper-exams/${examId}/committees-report`)}
                        variant="success"
                        fullWidth
                        leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                      >
                        تقرير اللجان
                      </Button>
                    </div>
                  </div>
                )}

                {/* أزرار الطباعة للمجموعات المخصصة */}
                {exam.models.some((m: any) => m.distributionMethod === 'CUSTOM_GROUPS') && (
                  <div className="border-2 border-teal-200 rounded-lg p-6 bg-teal-50">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z"/>
                      </svg>
                      <h4 className="font-bold text-teal-900">طباعة المجموعات المخصصة - مرتبة حسب المجموعات واللجان</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button
                        size="sm"
                        onClick={() => window.open(`/print/groups-questions/${examId}`, '_blank')}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                        leftIcon={<PrinterIcon className="w-4 h-4" />}
                      >
                        أوراق الأسئلة (مرتبة)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(`/print/groups-answers/${examId}`, '_blank')}
                        variant="primary"
                        fullWidth
                        leftIcon={<PrinterIcon className="w-4 h-4" />}
                      >
                        أوراق الإجابة (مرتبة)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/dashboard/paper-exams/${examId}/groups-report`)}
                        variant="success"
                        fullWidth
                        leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                      >
                        تقرير المجموعات
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              exam.models.map((model: any) => {
              // التحقق من طريقة التوزيع من حقل distributionMethod
              const isCustomCommittees = model.distributionMethod === 'CUSTOM_COMMITTEES';
              const isCustomGroups = model.distributionMethod === 'CUSTOM_GROUPS';
              
              return (
              <div key={model.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900">{model.modelName} ({model.modelCode})</h4>
                    <p className="text-sm text-slate-600">
                      {model.questions?.length || 0} سؤال - {model._count?.answerSheets || 0} ورقة إجابة
                    </p>
                    {(isCustomCommittees || isCustomGroups) && (
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        هذا النموذج مستخدم في جميع اللجان
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialog({ isOpen: true, modelId: model.id, modelName: model.modelName })}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
                {/* أزرار الطباعة العادية - تخفى للجان المخصصة والمجموعات المخصصة */}
                {!isCustomCommittees && !isCustomGroups && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.open(`/print/paper-exam-model/${model.id}`, '_blank')}
                    className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                    leftIcon={<PrinterIcon className="w-4 h-4" />}
                  >
                    ورقة الأسئلة
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateSheets(model.id)}
                    disabled={model._count?.answerSheets > 0}
                    className={`w-full ${
                      model._count?.answerSheets > 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={model._count?.answerSheets > 0 ? 'الأوراق مولدة بالفعل' : 'توليد أوراق الإجابة'}
                  >
                    {model._count?.answerSheets > 0 ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4 ml-1" />
                        مولدة ({model._count.answerSheets})
                      </>
                    ) : (
                      <>
                        <UsersIcon className="w-4 h-4 ml-1" />
                        توليد الأوراق
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(`/print/omr-answer-sheets-bulk/${examId}/${model.id}`, '_blank')}
                    variant="primary"
                    fullWidth
                    leftIcon={<PrinterIcon className="w-4 h-4" />}
                  >
                    إجابات جماعية
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/dashboard/paper-exams/${examId}/models/${model.id}/sheets-list`)}
                    variant="warning"
                    fullWidth
                    leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                  >
                    إجابات فردية
                  </Button>
                </div>
                )}
                
                {/* أزرار الطباعة للجان المخصصة */}
                {isCustomCommittees && (
                <div className="space-y-3">
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mb-3">
                    <p className="text-sm font-bold text-orange-900 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 12a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z"/>
                      </svg>
                      طباعة اللجان المخصصة - مرتبة حسب اللجان
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => window.open(`/print/committees-questions/${examId}`, '_blank')}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                      leftIcon={<PrinterIcon className="w-4 h-4" />}
                    >
                      أوراق الأسئلة (مرتبة)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(`/print/committees-answers/${examId}`, '_blank')}
                      variant="primary"
                      fullWidth
                      leftIcon={<PrinterIcon className="w-4 h-4" />}
                    >
                      أوراق الإجابة (مرتبة)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/paper-exams/${examId}/committees-report`)}
                      variant="success"
                      fullWidth
                      leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                    >
                      تقرير اللجان
                    </Button>
                  </div>
                </div>
                )}
                
                {/* أزرار الطباعة للمجموعات المخصصة */}
                {isCustomGroups && (
                <div className="space-y-3">
                  <div className="bg-teal-50 border-2 border-teal-300 rounded-lg p-3 mb-3">
                    <p className="text-sm font-bold text-teal-900 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z"/>
                      </svg>
                      طباعة المجموعات المخصصة - مرتبة حسب المجموعات واللجان
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => window.open(`/print/groups-questions/${examId}`, '_blank')}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                      leftIcon={<PrinterIcon className="w-4 h-4" />}
                    >
                      أوراق الأسئلة (مرتبة)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(`/print/groups-answers/${examId}`, '_blank')}
                      variant="primary"
                      fullWidth
                      leftIcon={<PrinterIcon className="w-4 h-4" />}
                    >
                      أوراق الإجابة (مرتبة)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/paper-exams/${examId}/groups-report`)}
                      variant="success"
                      fullWidth
                      leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                    >
                      تقرير المجموعات
                    </Button>
                  </div>
                </div>
                )}
              </div>
              );
            })
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>لم يتم إنشاء أي نماذج بعد</p>
          </div>
        )}
      </div>

      {/* التصحيح */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-slate-900">التصحيح والنتائج</h3>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Button
              onClick={() => router.push(`/dashboard/paper-exams/${examId}/scan`)}
              variant="success"
              leftIcon={<CameraIcon className="w-4 h-4" />}
            >
              تصحيح بالكاميرا
            </Button>
            <Button
              onClick={handleDownloadTemplate}
              variant="primary"
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              تحميل شيت Excel
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingExcel}
              variant="secondary"
              leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
            >
              {uploadingExcel ? 'جاري الرفع...' : 'رفع الدرجات'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* شرح سريع */}
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="w-5 h-5" />
              كيفية إدخال الدرجات عبر Excel:
            </strong>
            <span className="block mb-1"><strong>الخطوة 1:</strong> اضغط "تحميل شيت Excel" لتحميل ملف يحتوي على قائمة جميع المتدربين</span>
            <span className="block mb-1"><strong>الخطوة 2:</strong> افتح الملف وأدخل درجات المتدربين في عمود "الدرجة"</span>
            <span className="block"><strong>الخطوة 3:</strong> احفظ الملف ثم اضغط "رفع الدرجات" لإدخال الدرجات تلقائياً</span>
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{exam._count?.answerSheets || 0}</p>
            <p className="text-sm text-slate-600">إجمالي الأوراق</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              {exam.answerSheets?.filter((s: any) => s.status === 'GRADED').length || 0}
            </p>
            <p className="text-sm text-slate-600">تم التصحيح</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-700">
              {exam.answerSheets?.filter((s: any) => s.status === 'NOT_SUBMITTED').length || 0}
            </p>
            <p className="text-sm text-slate-600">لم تُصحح بعد</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => router.push(`/dashboard/paper-exams/${examId}/report?tab=all`)}
            variant="primary"
            fullWidth
            leftIcon={<DocumentTextIcon className="w-4 h-4" />}
          >
            التقرير الكامل
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/paper-exams/${examId}/report?tab=passed`)}
            variant="success"
            fullWidth
            leftIcon={<CheckCircleIcon className="w-4 h-4" />}
          >
            تقرير الناجحين
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/paper-exams/${examId}/report?tab=failed`)}
            variant="danger"
            fullWidth
            leftIcon={<UsersIcon className="w-4 h-4" />}
          >
            تقرير الراسبين
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/paper-exams/${examId}/report?tab=absent`)}
            variant="warning"
            fullWidth
            leftIcon={<UsersIcon className="w-4 h-4" />}
          >
            تقرير الغائبين
          </Button>
        </div>
      </div>

      {/* مربع تأكيد الحذف */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, modelId: null, modelName: '' })}
        onConfirm={async () => {
          if (deleteDialog.modelId) {
            try {
              await fetchAPI(`/paper-exams/models/${deleteDialog.modelId}`, { method: 'DELETE' });
              toast.success('تم حذف النموذج بنجاح');
              setDeleteDialog({ isOpen: false, modelId: null, modelName: '' });
              loadData();
            } catch (error: any) {
              toast.error(error.message || 'فشل حذف النموذج');
            }
          }
        }}
        title="حذف نموذج الأسئلة"
        description={`هل أنت متأكد من حذف ${deleteDialog.modelName}؟ سيتم حذف جميع أوراق الإجابة المرتبطة به.`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}