'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { EmojiPickerComponent, QuickEmojis } from '@/components/ui/emoji-picker';
import { motion } from 'framer-motion';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiArrowLeft,
  FiSave,
  FiX
} from 'react-icons/fi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  MessageTemplate,
  TemplateStats,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  getAllTemplates,
  getTemplatesStats,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  getCategoryDisplayName
} from '@/app/lib/api/campaigns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Schema for template form validation
const templateFormSchema = z.object({
  name: z.string().min(1, 'اسم القالب مطلوب'),
  content: z.string().min(1, 'محتوى القالب مطلوب'),
  description: z.string().optional(),
  category: z.string().min(1, 'فئة القالب مطلوبة'),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateFilters {
  category: string;
  search: string;
}

function TemplatesPageContent() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TemplateFilters>({
    category: 'all',
    search: ''
  });
  const [templateDialog, setTemplateDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    template?: MessageTemplate;
  }>({
    open: false,
    mode: 'create'
  });
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    content: string;
    variables: string[];
  }>({
    open: false,
    content: '',
    variables: []
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    templateId: string;
    templateName: string;
  }>({
    open: false,
    templateId: '',
    templateName: ''
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const router = useRouter();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      content: '',
      description: '',
      category: 'general'
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesResponse, statsResponse] = await Promise.all([
        getAllTemplates(),
        getTemplatesStats()
      ]);

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data || []);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    form.reset();
    setTemplateDialog({
      open: true,
      mode: 'create'
    });
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    form.reset({
      name: template.name,
      content: template.content,
      description: template.description || '',
      category: template.category
    });
    setTemplateDialog({
      open: true,
      mode: 'edit',
      template
    });
  };

  const handlePreviewTemplate = async (template: MessageTemplate) => {
    try {
      setActionLoading(template.id);
      const response = await previewTemplate(template.id);
      
      if (response.success) {
        setPreviewDialog({
          open: true,
          content: response.data?.content || '',
          variables: response.data?.variables || []
        });
      } else {
        toast.error('فشل في معاينة القالب');
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      toast.error('حدث خطأ أثناء معاينة القالب');
    } finally {
      setActionLoading(null);
    }
  };


  const handleDeleteTemplate = async () => {
    try {
      setActionLoading(deleteDialog.templateId);
      const response = await deleteTemplate(deleteDialog.templateId);
      
      if (response.success) {
        toast.success(`تم حذف القالب "${deleteDialog.templateName}" بنجاح`);
        fetchData();
        setDeleteDialog({ open: false, templateId: '', templateName: '' });
      } else {
        toast.error(response.message || 'فشل في حذف القالب');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('حدث خطأ أثناء حذف القالب');
    } finally {
      setActionLoading(null);
    }
  };

  const onSubmit = async (data: TemplateFormValues) => {
    try {
      setActionLoading('form');
      
      if (templateDialog.mode === 'create') {
        const response = await createTemplate(data);
        if (response.success) {
          toast.success('تم إنشاء القالب بنجاح');
          fetchData();
          setTemplateDialog({ open: false, mode: 'create' });
        } else {
          toast.error(response.message || 'فشل في إنشاء القالب');
        }
      } else if (templateDialog.template) {
        const response = await updateTemplate(templateDialog.template.id, data);
        if (response.success) {
          toast.success('تم تحديث القالب بنجاح');
          fetchData();
          setTemplateDialog({ open: false, mode: 'create' });
        } else {
          toast.error(response.message || 'فشل في تحديث القالب');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('حدث خطأ أثناء حفظ القالب');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (templateId: string, templateName: string) => {
    setDeleteDialog({
      open: true,
      templateId,
      templateName
    });
  };

  // دالة إدراج المتغيرات في القوالب
  const insertTemplateVariable = (variable: string) => {
    const textarea = document.getElementById('template-content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = form.getValues('content') || '';
      
      const newValue = 
        currentValue.substring(0, startPos) + 
        variable + 
        currentValue.substring(endPos);
      
      form.setValue('content', newValue);
      
      // العودة للتركيز على النص وتحديد الموقع
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + variable.length, startPos + variable.length);
      }, 0);
    }
  };

  // دالة إدراج الإيموجيز في القوالب
  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById('template-content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = form.getValues('content') || '';
      
      const newValue = 
        currentValue.substring(0, startPos) + 
        emoji + 
        currentValue.substring(endPos);
      
      form.setValue('content', newValue);
      
      // العودة للتركيز على النص وتحديد الموقع
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + emoji.length, startPos + emoji.length);
      }, 0);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const categoryMatch = filters.category === 'all' || template.category === filters.category;
    const searchMatch = filters.search === '' || 
      template.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      template.content.toLowerCase().includes(filters.search.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded-3xl h-32 mb-6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl h-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-green-600 rounded-3xl text-white p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm font-medium shadow-sm"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                رجوع
              </Button>
              <div className="bg-white/20 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-lg">
                <FiFileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">إدارة قوالب الرسائل</h1>
                <p className="text-white/90 text-base md:text-lg mb-3">إنشاء وإدارة قوالب الرسائل القابلة لإعادة الاستخدام</p>
              </div>
            </div>

            <Button
              onClick={handleCreateTemplate}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 shadow-md transition-all hover:scale-105"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              قالب جديد
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FiFileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">إجمالي القوالب</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <FiEye className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">القوالب النشطة</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FiFilter className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الفئات</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <FiFilter className="h-5 w-5 text-purple-600" />
                فلترة القوالب
              </CardTitle>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:border-purple-700 font-medium shadow-sm"
              >
                <FiRefreshCw className="h-4 w-4" />
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">البحث</label>
                <Input
                  placeholder="البحث في الاسم أو المحتوى..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="bg-white text-gray-900 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">الفئة</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                  style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    border: '2px solid #d1d5db !important'
                  }}
                >
                  <option value="all" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>جميع الفئات</option>
                  {categories.map(category => (
                    <option key={category} value={category} style={{
                      color: '#000000 !important', 
                      backgroundColor: '#ffffff !important',
                      fontWeight: '500 !important'
                    }}>
                      {getCategoryDisplayName(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => setFilters({ category: 'all', search: '' })}
                  variant="outline"
                  className="w-full bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:border-red-400 font-medium"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <FiFileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">لا توجد قوالب</h3>
              <p className="text-gray-600 mb-6">ابدأ بإنشاء قالب جديد لحفظ الرسائل المتكررة</p>
                  <Button onClick={handleCreateTemplate}>
                    <FiPlus className="w-4 h-4 mr-2" />
                    إنشاء قالب جديد
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{template.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryDisplayName(template.category)}
                        </Badge>
                      </div>

                      {template.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{template.description}</p>
                      )}

                      <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                        <p className="text-sm text-gray-800 line-clamp-3 font-medium">{template.content}</p>
                      </div>

                      {template.variables && template.variables.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">المتغيرات:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Button
                        onClick={() => handlePreviewTemplate(template)}
                        disabled={actionLoading === template.id}
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm"
                      >
                        <FiEye className="w-3 h-3 mr-1" />
                        معاينة
                      </Button>

                      <Button
                        onClick={() => handleEditTemplate(template)}
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0 bg-orange-600 text-white border-orange-600 hover:bg-orange-700 hover:border-orange-700 shadow-sm"
                      >
                        <FiEdit className="w-3 h-3 mr-1" />
                        تعديل
                      </Button>

                      <Button
                        onClick={() => openDeleteDialog(template.id, template.name)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 shadow-sm"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Template Dialog */}
      <Dialog open={templateDialog.open} onOpenChange={(open) => setTemplateDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {templateDialog.mode === 'create' ? 'إنشاء قالب جديد' : 'تعديل القالب'}
            </DialogTitle>
            <DialogDescription>
              {templateDialog.mode === 'create' 
                ? 'إنشاء قالب رسالة جديد قابل لإعادة الاستخدام'
                : 'تعديل القالب الحالي'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم القالب *</label>
                <Input
                  {...form.register('name')}
                  placeholder="مثال: قالب ترحيب المتدربين"
                  className={`bg-white text-gray-900 ${form.formState.errors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الفئة *</label>
                <select
                  {...form.register('category')}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                  style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    border: '2px solid #d1d5db !important'
                  }}
                >
                  <option value="general" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>عام</option>
                  <option value="welcome" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>ترحيب</option>
                  <option value="payment" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>دفع</option>
                  <option value="reminder" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>تذكير</option>
                  <option value="notification" style={{
                    color: '#000000 !important', 
                    backgroundColor: '#ffffff !important',
                    fontWeight: '500 !important'
                  }}>إشعار</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
              <Input
                {...form.register('description')}
                placeholder="وصف مختصر للقالب..."
                className="bg-white text-gray-900 border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">محتوى القالب *</label>
              <Textarea
                {...form.register('content')}
                placeholder="محتوى الرسالة... استخدم الأزرار أدناه لإدراج المتغيرات"
                rows={6}
                className={`bg-white text-gray-900 ${form.formState.errors.content ? 'border-red-500' : 'border-gray-300'}`}
                id="template-content-textarea"
              />
              {form.formState.errors.content && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.content.message}</p>
              )}
              
              {/* أزرار المتغيرات والإيموجيز */}
              <div className="mt-3 space-y-4">
                {/* أزرار المتغيرات */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">إدراج متغيرات:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{trainee_name}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors"
                    >
                      👤 اسم المتدرب
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{program_name}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-xs font-medium rounded-full hover:bg-green-200 transition-colors"
                    >
                      📚 اسم البرنامج
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{center_name}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full hover:bg-purple-200 transition-colors"
                    >
                      🏢 اسم المركز
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{registration_number}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full hover:bg-orange-200 transition-colors"
                    >
                      🔢 رقم التسجيل
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{current_date}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-teal-100 text-teal-800 text-xs font-medium rounded-full hover:bg-teal-200 transition-colors"
                    >
                      📅 التاريخ الحالي
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTemplateVariable('{{current_time}}')}
                      className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full hover:bg-indigo-200 transition-colors"
                    >
                      🕐 الوقت الحالي
                    </button>
                  </div>
                </div>

                {/* قسم الإيموجيز */}
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <p className="text-sm font-medium text-gray-700">إضافة إيموجيز:</p>
                    <EmojiPickerComponent 
                      onEmojiSelect={insertEmoji}
                      pickerPosition="bottom"
                      buttonClassName="text-xs w-full sm:w-auto"
                    />
                  </div>
                  <QuickEmojis 
                    onEmojiSelect={insertEmoji}
                    className="bg-gray-50 p-2 sm:p-3 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplateDialog({ open: false, mode: 'create' })}
                className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={actionLoading === 'form'}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md disabled:opacity-50"
              >
                <FiSave className="w-4 h-4 mr-2" />
                {templateDialog.mode === 'create' ? 'إنشاء القالب' : 'حفظ التغييرات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة القالب</DialogTitle>
            <DialogDescription>
              معاينة القالب مع بيانات تجريبية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">المحتوى المعاينة</h4>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-sm whitespace-pre-wrap text-gray-800 font-medium shadow-sm">
                {previewDialog.content}
              </div>
            </div>

            {previewDialog.variables.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">المتغيرات المستخدمة</h4>
                <div className="flex flex-wrap gap-2">
                  {previewDialog.variables.map((variable, i) => (
                    <Badge key={i} variant="outline">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setPreviewDialog({ open: false, content: '', variables: [] })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف القالب "{deleteDialog.templateName}"؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={actionLoading === deleteDialog.templateId}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'dashboard.whatsapp.templates', action: 'view' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح لك بالوصول</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة للوصول إلى قوالب الرسائل</p>
          </div>
        </div>
      }
    >
      <TemplatesPageContent />
    </ProtectedPage>
  );
}
