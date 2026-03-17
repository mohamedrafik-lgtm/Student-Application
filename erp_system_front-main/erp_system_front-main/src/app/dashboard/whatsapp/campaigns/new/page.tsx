'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { EmojiPickerComponent, QuickEmojis } from '@/components/ui/emoji-picker';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiSave,
  FiUsers,
  FiTarget,
  FiMessageSquare,
  FiFileText,
  FiCheck,
  FiFilter
} from 'react-icons/fi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  MessageTemplate,
  CreateCampaignRequest,
  createCampaign,
  getAllTemplates,
  previewTemplate
} from '@/app/lib/api/campaigns';
import { getAllTrainees } from '@/app/lib/api/trainees';
import { getAllPrograms } from '@/app/lib/api/programs';

// Schema for form validation
const campaignFormSchema = z.object({
  name: z.string().min(1, 'اسم الحملة مطلوب'),
  description: z.string().optional(),
  templateId: z.string().optional(),
  message: z.string().min(1, 'محتوى الرسالة مطلوب'),
  delayBetweenMessages: z.number().min(30, 'التأخير يجب أن يكون على الأقل 30 ثانية').max(300, 'التأخير لا يمكن أن يزيد عن 5 دقائق'),
  targetType: z.enum(['all', 'program', 'custom']),
  targetProgramId: z.number().optional(),
  targetTraineeIds: z.array(z.number()).optional(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface Trainee {
  id: number;
  nameAr: string;
  phone: string;
  program: {
    id: number;
    nameAr: string;
  };
}

interface Program {
  id: number;
  nameAr: string;
}

function NewCampaignPageContent() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<number[]>([]);
  const [traineeSearch, setTraineeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Target Selection, 3: Review

  const router = useRouter();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      message: '',
      delayBetweenMessages: 30,
      targetType: 'all',
      targetTraineeIds: []
    }
  });

  const watchedValues = form.watch();
  const targetType = form.watch('targetType');
  const targetProgramId = form.watch('targetProgramId');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (watchedValues.targetType === 'custom') {
      form.setValue('targetTraineeIds', selectedTrainees);
    }
  }, [selectedTrainees, watchedValues.targetType, form]);

  useEffect(() => {
    console.log('Trainees state updated:', trainees.length, trainees);
  }, [trainees]);

  useEffect(() => {
    console.log('📊 تحديث حالة البرامج:', {
      count: programs.length,
      programs: programs.map(p => ({ id: p.id, name: p.nameAr }))
    });
  }, [programs]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 بدء جلب البيانات الأولية...');
      
      const [templatesRes, traineesRes, programsRes] = await Promise.all([
        getAllTemplates(true),
        getAllTrainees(),
        getAllPrograms()
      ]);

      console.log('📋 استجابة القوالب:', templatesRes);
      console.log('👥 استجابة المتدربين:', traineesRes);
      console.log('🎓 استجابة البرامج:', programsRes);

      // معالجة القوالب
      if (templatesRes.success) {
        setTemplates(templatesRes.data || []);
        console.log('✅ تم تعيين القوالب:', templatesRes.data?.length || 0);
      } else {
        console.warn('⚠️ فشل في جلب القوالب:', templatesRes);
      }

      // معالجة المتدربين - API يرجع البيانات مباشرة
      if (Array.isArray(traineesRes)) {
        setTrainees(traineesRes);
        console.log('✅ تم تعيين المتدربين:', traineesRes.length);
      } else {
        console.warn('⚠️ المتدربين ليس مصفوفة:', traineesRes);
        setTrainees([]);
      }

      // معالجة البرامج - API يرجع البيانات مباشرة
      if (Array.isArray(programsRes)) {
        setPrograms(programsRes);
        console.log('✅ تم تعيين البرامج:', programsRes.length);
      } else {
        console.warn('⚠️ البرامج ليس مصفوفة:', programsRes);
        setPrograms([]);
      }

    } catch (error) {
      console.error('❌ خطأ في جلب البيانات الأولية:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
      
      // تعيين قيم فارغة في حالة الخطأ
      setTemplates([]);
      setTrainees([]);
      setPrograms([]);
    } finally {
      setLoading(false);
      console.log('🏁 انتهاء جلب البيانات الأولية');
    }
  };

  const handleTemplateSelect = async (template: MessageTemplate) => {
    form.setValue('templateId', template.id);
    form.setValue('message', template.content);
    setShowTemplates(false);
    
    // Preview the template
    try {
      const response = await previewTemplate(template.id);
      if (response.success) {
        setPreviewContent(response.data?.content || '');
      }
    } catch (error) {
      console.error('Error previewing template:', error);
    }
  };

  const handleTraineeToggle = (traineeId: number) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId)
        ? prev.filter(id => id !== traineeId)
        : [...prev, traineeId]
    );
  };

  const handleSelectAllTrainees = () => {
    const filteredTraineeIds = filteredTrainees.map(t => t.id);
    if (selectedTrainees.length === filteredTraineeIds.length) {
      setSelectedTrainees([]);
    } else {
      setSelectedTrainees(filteredTraineeIds);
    }
  };

  // دالة إدراج المتغيرات
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = form.getValues('message') || '';
      
      const newValue = 
        currentValue.substring(0, startPos) + 
        variable + 
        currentValue.substring(endPos);
      
      form.setValue('message', newValue);
      
      // العودة للتركيز على النص وتحديد الموقع
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + variable.length, startPos + variable.length);
      }, 0);
    }
  };

  // دالة إدراج الإيموجيز
  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = form.getValues('message') || '';
      
      const newValue = 
        currentValue.substring(0, startPos) + 
        emoji + 
        currentValue.substring(endPos);
      
      form.setValue('message', newValue);
      
      // العودة للتركيز على النص وتحديد الموقع
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + emoji.length, startPos + emoji.length);
      }, 0);
    }
  };

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      // التحقق الإضافي من الحد الأدنى للمؤقت
      if (data.delayBetweenMessages < 30) {
        toast.error('التأخير بين الرسائل يجب أن يكون على الأقل 30 ثانية');
        return;
      }
      
      setSaving(true);
      
      const campaignData: CreateCampaignRequest = {
        ...data,
        targetTraineeIds: data.targetType === 'custom' ? selectedTrainees : undefined
      };

      const response = await createCampaign(campaignData);
      
      if (response.success) {
        toast.success('تم إنشاء الحملة بنجاح!');
        router.push('/dashboard/whatsapp/campaigns');
      } else {
        toast.error(response.message || 'فشل في إنشاء الحملة');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('حدث خطأ أثناء إنشاء الحملة');
    } finally {
      setSaving(false);
    }
  };

  const filteredTrainees = trainees.filter(trainee =>
    trainee.nameAr.toLowerCase().includes(traineeSearch.toLowerCase()) ||
    trainee.phone.includes(traineeSearch)
  );

  const targetCount = useMemo(() => {
    console.log('Calculating targetCount:', { targetType, targetProgramId, traineeCount: trainees.length, selectedCount: selectedTrainees.length });
    
    switch (targetType) {
      case 'all':
        return trainees.length;
      case 'program':
        if (!targetProgramId) return 0;
        const programTrainees = trainees.filter(t => t.program && t.program.id === targetProgramId);
        console.log('Program trainees:', programTrainees);
        return programTrainees.length;
      case 'custom':
        return selectedTrainees.length;
      default:
        return 0;
    }
  }, [targetType, targetProgramId, trainees.length, selectedTrainees.length]);

  const getEstimatedDuration = () => {
    const delay = watchedValues.delayBetweenMessages || 30;
    const totalSeconds = targetCount * delay;
    
    if (totalSeconds < 60) {
      return `${totalSeconds} ثانية`;
    } else if (totalSeconds < 3600) {
      const minutes = Math.ceil(totalSeconds / 60);
      return `${minutes} دقيقة`;
    } else {
      const hours = Math.ceil(totalSeconds / 3600);
      return `${hours} ساعة`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="bg-gray-200 rounded-xl h-32"></div>
            <div className="bg-gray-200 rounded-xl h-64"></div>
            <div className="bg-gray-200 rounded-xl h-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white p-6 shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm font-medium shadow-sm"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                رجوع
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">إنشاء حملة جديدة</h1>
                <p className="text-white/90 mt-1 font-medium">إعداد حملة رسائل واتساب جماعية</p>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <FiTarget className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6 bg-white">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: 'المعلومات الأساسية', icon: FiFileText },
                { step: 2, title: 'اختيار المستهدفين', icon: FiUsers },
                { step: 3, title: 'المراجعة والإرسال', icon: FiCheck }
              ].map(({ step: stepNum, title, icon: Icon }) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold ${
                    step >= stepNum 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-500 border-gray-300'
                  }`}>
                    {step > stepNum ? <FiCheck className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className={`mr-3 text-base font-semibold ${
                    step >= stepNum ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {title}
                  </span>
                  {stepNum < 3 && (
                    <div className={`w-16 h-2 mr-6 rounded-full ${
                      step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <FiFileText className="h-5 w-5 text-blue-600" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم الحملة *</label>
                      <Input
                        {...form.register('name')}
                        placeholder="مثال: حملة ترحيب المتدربين الجدد"
                        className={`bg-white text-gray-900 ${form.formState.errors.name ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {form.formState.errors.name && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">التأخير بين الرسائل (ثانية) *</label>
                      <Input
                        type="number"
                        min="30"
                        max="300"
                        step="1"
                        {...form.register('delayBetweenMessages', { 
                          valueAsNumber: true,
                          min: { value: 30, message: 'التأخير يجب أن يكون على الأقل 30 ثانية' },
                          max: { value: 300, message: 'التأخير لا يمكن أن يزيد عن 5 دقائق' }
                        })}
                        onChange={(e) => {
                          let value = parseInt(e.target.value);
                          if (value < 30 && value !== 0 && !isNaN(value)) {
                            e.target.value = "30";
                            form.setValue('delayBetweenMessages', 30);
                          } else if (value > 300) {
                            e.target.value = "300";
                            form.setValue('delayBetweenMessages', 300);
                          } else if (!isNaN(value)) {
                            form.setValue('delayBetweenMessages', value);
                          }
                        }}
                        onBlur={(e) => {
                          let value = parseInt(e.target.value);
                          if (isNaN(value) || value < 30) {
                            e.target.value = "30";
                            form.setValue('delayBetweenMessages', 30);
                          }
                        }}
                        placeholder="30"
                        className={`bg-white text-gray-900 ${form.formState.errors.delayBetweenMessages ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {form.formState.errors.delayBetweenMessages && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.delayBetweenMessages.message}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">الحد الأدنى: 30 ثانية، الحد الأقصى: 300 ثانية (5 دقائق)</p>
                      {watchedValues.delayBetweenMessages !== undefined && watchedValues.delayBetweenMessages < 30 && (
                        <p className="text-red-500 text-xs mt-1">⚠️ القيمة أقل من الحد الأدنى المطلوب (30 ثانية)</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">وصف الحملة</label>
                    <Textarea
                      {...form.register('description')}
                      placeholder="وصف مختصر للحملة وأهدافها..."
                      rows={3}
                      className="bg-white text-gray-900 border-gray-300"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <FiMessageSquare className="h-5 w-5 text-blue-600" />
                    محتوى الرسالة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">يمكنك اختيار قالب جاهز أو كتابة رسالة مخصصة</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 hover:border-purple-400 font-medium"
                    >
                      <FiFileText className="w-4 h-4 mr-2" />
                      اختيار قالب
                    </Button>
                  </div>

                  {showTemplates && (
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                      <h4 className="font-medium mb-3 text-purple-800">القوالب المتاحة</h4>
                      <div className="grid gap-3 max-h-48 overflow-y-auto">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className="p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-sm text-gray-800">{template.name}</h5>
                                <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">محتوى الرسالة *</label>
                    <Textarea
                      {...form.register('message')}
                      placeholder="اكتب محتوى الرسالة هنا... استخدم الأزرار أدناه لإدراج المتغيرات"
                      rows={6}
                      className={`bg-white text-gray-900 ${form.formState.errors.message ? 'border-red-500' : 'border-gray-300'}`}
                      id="message-textarea"
                    />
                    {form.formState.errors.message && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>
                    )}
                    
                    {/* أزرار المتغيرات والإيموجيز */}
                    <div className="mt-3 space-y-4">
                      {/* أزرار المتغيرات */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">إدراج متغيرات:</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => insertVariable('{{trainee_name}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors"
                          >
                            👤 اسم المتدرب
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('{{program_name}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-xs font-medium rounded-full hover:bg-green-200 transition-colors"
                          >
                            📚 اسم البرنامج
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('{{center_name}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full hover:bg-purple-200 transition-colors"
                          >
                            🏢 اسم المركز
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('{{registration_number}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full hover:bg-orange-200 transition-colors"
                          >
                            🔢 رقم التسجيل
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('{{current_date}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-teal-100 text-teal-800 text-xs font-medium rounded-full hover:bg-teal-200 transition-colors"
                          >
                            📅 التاريخ الحالي
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('{{current_time}}')}
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full hover:bg-indigo-200 transition-colors"
                          >
                            🕐 الوقت الحالي
                          </button>
                        </div>
                      </div>

                      {/* قسم الإيموجيز */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-700">إضافة إيموجيز:</p>
                          <EmojiPickerComponent 
                            onEmojiSelect={insertEmoji}
                            pickerPosition="bottom"
                            buttonClassName="text-xs"
                          />
                        </div>
                        <QuickEmojis 
                          onEmojiSelect={insertEmoji}
                          className="bg-gray-50 p-3 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {previewContent && (
                    <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-2 text-blue-800">معاينة الرسالة</h4>
                      <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border-2 border-blue-200 shadow-sm text-gray-800">
                        {previewContent}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!form.getValues('name') || !form.getValues('message')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 shadow-md"
                >
                  التالي: اختيار المستهدفين
                  <FiUsers className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Target Selection */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <FiUsers className="h-5 w-5 text-blue-600" />
                    اختيار المستهدفين
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-3">نوع الاستهداف</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'all', label: 'كل المتدربين', icon: FiUsers },
                        { value: 'program', label: 'برنامج محدد', icon: FiTarget },
                        { value: 'custom', label: 'مخصص', icon: FiFilter }
                      ].map(option => (
                        <div
                          key={option.value}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            watchedValues.targetType === option.value
                              ? 'border-blue-600 bg-blue-50 shadow-md'
                              : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-sm'
                          }`}
                          onClick={() => form.setValue('targetType', option.value as 'all' | 'program' | 'custom')}
                        >
                          <div className="flex items-center gap-3">
                            <option.icon className={`h-6 w-6 ${
                              watchedValues.targetType === option.value ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div>
                              <p className={`font-medium ${
                                watchedValues.targetType === option.value ? 'text-blue-600' : 'text-gray-800'
                              }`}>{option.label}</p>
                              <p className="text-sm text-gray-600 font-medium">
                                {option.value === 'all' && `${trainees.length} متدرب`}
                                {option.value === 'program' && (
                                  watchedValues.targetProgramId
                                    ? `${trainees.filter(t => t.program?.id === watchedValues.targetProgramId).length} متدرب`
                                    : programs.length > 0 ? 'اختر البرنامج أولاً' : 'لا توجد برامج'
                                )}
                                {option.value === 'custom' && `${selectedTrainees.length} متدرب`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {watchedValues.targetType === 'program' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اختيار البرنامج</label>
                    <select
                      {...form.register('targetProgramId', { valueAsNumber: true })}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      disabled={loading}
                    >
                      <option value="" className="text-gray-600">
                        {loading ? 'جاري تحميل البرامج...' : 'اختر البرنامج...'}
                      </option>
                      {!loading && programs.length > 0 ? (
                        programs.map(program => (
                          <option key={program.id} value={program.id} className="text-gray-900 bg-white">
                            {program.nameAr}
                          </option>
                        ))
                      ) : !loading && programs.length === 0 ? (
                        <option value="" disabled className="text-gray-500">لا توجد برامج متاحة</option>
                      ) : null}
                    </select>
                    {!loading && programs.length === 0 && (
                      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800 mb-2">
                          ⚠️ لم يتم العثور على برامج تدريبية.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchInitialData}
                          className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 text-xs"
                        >
                          🔄 إعادة المحاولة
                        </Button>
                      </div>
                    )}
                  </div>
                  )}

                  {watchedValues.targetType === 'custom' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium">اختيار المتدربين المحددين</label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="البحث بالاسم أو رقم الهاتف..."
                            value={traineeSearch}
                            onChange={(e) => setTraineeSearch(e.target.value)}
                            className="w-64"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllTrainees}
                            className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 font-medium"
                          >
                            {selectedTrainees.length === filteredTrainees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                          </Button>
                        </div>
                      </div>

                      <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                        {filteredTrainees.map(trainee => (
                          <div
                            key={trainee.id}
                            className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                              selectedTrainees.includes(trainee.id) ? 'bg-blue-100 border-blue-200' : 'bg-white'
                            }`}
                            onClick={() => handleTraineeToggle(trainee.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{trainee.nameAr}</p>
                                <p className="text-sm text-gray-600">{trainee.phone} • {trainee.program?.nameAr}</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedTrainees.includes(trainee.id)}
                                onChange={() => handleTraineeToggle(trainee.id)}
                                className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600">
                        تم تحديد {selectedTrainees.length} من {filteredTrainees.length} متدرب
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400 font-medium px-6 py-2 shadow-sm"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  السابق
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={targetCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  التالي: المراجعة
                  <FiCheck className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiCheck className="h-5 w-5" />
                    مراجعة الحملة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-gray-800">معلومات الحملة</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الاسم:</span>
                          <span className="font-medium text-gray-900">{watchedValues.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">التأخير:</span>
                          <span className="font-medium text-gray-900">{watchedValues.delayBetweenMessages} ثانية</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">نوع الاستهداف:</span>
                          <span className="font-medium text-gray-900">
                            {watchedValues.targetType === 'all' && 'كل المتدربين'}
                            {watchedValues.targetType === 'program' && 'برنامج محدد'}
                            {watchedValues.targetType === 'custom' && 'مخصص'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 text-gray-800">إحصائيات الإرسال</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">عدد المستهدفين:</span>
                          <span className="font-medium text-blue-600">{targetCount} متدرب</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">المدة المتوقعة:</span>
                          <span className="font-medium text-green-600">{getEstimatedDuration()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-gray-800">معاينة الرسالة</h4>
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                      <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border text-gray-800 shadow-sm">
                        {watchedValues.message
                          ?.replace(/\{\{trainee_name\}\}/g, 'أحمد محمد')
                          ?.replace(/\{\{program_name\}\}/g, 'مساعد خدمات صحية')
                          ?.replace(/\{\{center_name\}\}/g, 'مركز طيبة للتدريب')
                          ?.replace(/\{\{registration_number\}\}/g, '000123')
                          ?.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('ar-EG'))
                          ?.replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString('ar-EG'))
                        }
                      </div>
                    </div>
                  </div>

                  {watchedValues.description && (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-800">الوصف</h4>
                      <p className="text-sm text-gray-700">{watchedValues.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400 font-medium px-6 py-2 shadow-sm"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  السابق
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    variant="outline"
                    onClick={() => {
                      // Save as draft logic
                      form.handleSubmit(onSubmit)();
                    }}
                    className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 hover:border-orange-400 font-medium px-6 py-2 shadow-sm disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    حفظ كمسودة
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || (watchedValues.delayBetweenMessages ? watchedValues.delayBetweenMessages < 30 : false)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTarget className="w-4 h-4 mr-2" />
                    إنشاء الحملة
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.whatsapp.campaigns', action: 'create' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح لك بالوصول</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة لإنشاء حملات الواتساب</p>
          </div>
        </div>
      }
    >
      <NewCampaignPageContent />
    </ProtectedPage>
  );
}
