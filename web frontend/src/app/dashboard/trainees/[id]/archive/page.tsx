'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentUpload } from '@/components/ui/document-upload';
import { 
  getTraineeDocuments, 
  uploadTraineeDocument, 
  updateDocumentVerification,
  deleteTraineeDocument 
} from '@/app/lib/api/trainee-documents';
import { TraineeArchive, DocumentWithStatus, DocumentType } from '@/app/types/trainee-documents';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import PageHeader from '@/app/components/PageHeader';

export default function TraineeArchivePage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = Number(params.id);
  
  const [archive, setArchive] = useState<TraineeArchive | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    documentId: string;
    documentName: string;
    isVirtualPhoto: boolean;
  }>({
    isOpen: false,
    documentId: '',
    documentName: '',
    isVirtualPhoto: false
  });

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const data = await getTraineeDocuments(traineeId);
      setArchive(data);
    } catch (error) {
      console.error('خطأ في جلب أرشيف المتدرب:', error);
      toast.error('فشل في جلب بيانات الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traineeId) {
      fetchArchive();
    }
  }, [traineeId]);

  const handleDocumentUpload = async (documentType: DocumentType, documentData: any) => {
    try {
      setUpdating(documentType);
      await uploadTraineeDocument(traineeId, {
        ...documentData,
        documentType,
      });
      
      toast.success('تم رفع الوثيقة بنجاح');
      await fetchArchive();
    } catch (error) {
      console.error('خطأ في رفع الوثيقة:', error);
      toast.error('فشل في رفع الوثيقة');
    } finally {
      setUpdating(null);
    }
  };

  const handleVerificationToggle = async (documentId: string, isVerified: boolean) => {
    try {
      await updateDocumentVerification(documentId, { isVerified });
      toast.success(isVerified ? 'تم التحقق من الوثيقة' : 'تم إلغاء التحقق من الوثيقة');
      await fetchArchive();
    } catch (error: any) {
      console.error('خطأ في تحديث حالة التحقق:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'فشل في تحديث حالة التحقق';
      toast.error(errorMessage);
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    const isVirtualPhoto = documentId.startsWith('trainee-photo-');
    const documentName = archive?.documents.find(doc => doc.document?.id === documentId)?.nameAr || 'الوثيقة';
    
    setDeleteDialog({
      isOpen: true,
      documentId,
      documentName,
      isVirtualPhoto
    });
  };

  const confirmDeleteDocument = async () => {
    const { documentId, documentName, isVirtualPhoto } = deleteDialog;
    
    try {
      await deleteTraineeDocument(documentId);
      const successMessage = isVirtualPhoto 
        ? '✅ تم حذف الصورة الشخصية بنجاح! يمكنك رفع صورة جديدة من خلال النقر على زر "التقاط صورة".'
        : `✅ تم حذف "${documentName}" بنجاح! يمكنك رفع وثيقة جديدة من خلال الأزرار أدناه.`;
      toast.success(successMessage);
      await fetchArchive();
    } catch (error: any) {
      console.error('خطأ في حذف الوثيقة:', error);
      const baseErrorMessage = error?.response?.data?.message || error?.message || 'حدث خطأ غير متوقع';
      const errorMessage = isVirtualPhoto 
        ? `❌ فشل في حذف الصورة الشخصية: ${baseErrorMessage}. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.`
        : `❌ فشل في حذف "${documentName}": ${baseErrorMessage}. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.`;
      toast.error(errorMessage);
    }
  };

  const getStatusStyle = (doc: DocumentWithStatus) => {
    if (!doc.document) return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };
    if (doc.document.isVerified) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  };

  const getStatusText = (doc: DocumentWithStatus) => {
    if (!doc.document) return 'غير مرفوع';
    if (doc.document.isVerified) return 'محقق';
    return 'بانتظار التحقق';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-tiba-primary border-t-transparent" />
          <p className="text-sm text-slate-500">جارٍ تحميل أرشيف المتدرب...</p>
        </div>
      </div>
    );
  }

  if (!archive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <UserIcon className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">لم يتم العثور على بيانات المتدرب</h3>
        <p className="text-sm text-slate-500 mb-6">تأكد من صحة معرف المتدرب وحاول مرة أخرى</p>
        <button 
          onClick={() => router.push('/dashboard/trainees')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tiba-primary text-white text-sm font-medium hover:bg-tiba-primary/90 transition-colors"
        >
          <ArrowRightIcon className="h-4 w-4" />
          العودة للمتدربين
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`أرشيف المتدرب: ${archive.trainee.nameAr}`}
        description="إدارة وثائق ومستندات المتدرب"
        backUrl="/dashboard/trainees"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة المتدربين', href: '/dashboard/trainees' },
          { label: `أرشيف ${archive.trainee.nameAr}` },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Statistics */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-tiba-primary/10">
                <ChartBarIcon className="h-5 w-5 text-tiba-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">إحصائيات إكمال الوثائق</h2>
                <p className="text-xs text-slate-500">متابعة حالة جميع الوثائق المطلوبة والإضافية</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">نسبة الإكمال الإجمالية</span>
                <span className="text-sm font-bold text-tiba-primary">
                  {archive.stats.completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    archive.stats.completionPercentage >= 80 ? 'bg-emerald-500' :
                    archive.stats.completionPercentage >= 50 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${archive.stats.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-100 rtl:divide-x-reverse">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <DocumentTextIcon className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{archive.stats.uploadedRequired}</p>
              <p className="text-xs text-slate-500 mt-0.5">وثائق مطلوبة من {archive.stats.totalRequired}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{archive.stats.uploadedOptional}</p>
              <p className="text-xs text-slate-500 mt-0.5">وثائق إضافية من {archive.stats.totalOptional}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <ShieldCheckIcon className="h-5 w-5 text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{archive.stats.verifiedCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">وثائق محققة</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                {archive.stats.isComplete 
                  ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  : <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                }
              </div>
              <p className={`text-2xl font-bold ${archive.stats.isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                {archive.stats.isComplete ? '✓' : '!'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {archive.stats.isComplete ? 'مكتمل' : 'ناقص'}
              </p>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-tiba-primary/10">
              <DocumentTextIcon className="h-5 w-5 text-tiba-primary" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">قائمة الوثائق والمستندات</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archive.documents.map((doc) => {
              const status = getStatusStyle(doc);
              return (
                <div 
                  key={doc.type} 
                  className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <DocumentTextIcon className="h-4 w-4 text-tiba-primary shrink-0" />
                          <span className="truncate">{doc.nameAr}</span>
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {doc.required && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              مطلوب
                            </span>
                          )}
                          {doc.document && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                              <CheckCircleIcon className="h-3 w-3" />
                              مرفوع
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.text} border ${status.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {getStatusText(doc)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex-1">
                      <DocumentUpload
                        documentType={doc.type}
                        documentName={doc.nameAr}
                        currentDocument={doc.document}
                        onUploadComplete={(data) => handleDocumentUpload(doc.type, data)}
                        isRequired={doc.required}
                        isUploading={updating === doc.type}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    {doc.document && (
                      <div className="flex gap-2 pt-3 border-t border-slate-100 mt-auto">
                        {!doc.document.id.startsWith('trainee-photo-') ? (
                          <button
                            onClick={() => handleVerificationToggle(doc.document!.id, !doc.document!.isVerified)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              doc.document.isVerified 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            {doc.document.isVerified ? (
                              <>
                                <CheckIcon className="h-3.5 w-3.5" />
                                محقق
                              </>
                            ) : (
                              <>
                                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                تحقق
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-medium">
                            <CheckIcon className="h-3.5 w-3.5" />
                            صورة شخصية من ملف المتدرب
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleDeleteDocument(doc.document!.id)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteDocument}
        title={deleteDialog.isVirtualPhoto ? "حذف الصورة الشخصية" : "حذف الوثيقة"}
        description={deleteDialog.isVirtualPhoto 
          ? "هل أنت متأكد من حذف الصورة الشخصية للمتدرب؟ لن تتمكن من التراجع عن هذا الإجراء."
          : `هل أنت متأكد من حذف "${deleteDialog.documentName}"؟ لن تتمكن من التراجع عن هذا الإجراء.`
        }
        details={deleteDialog.isVirtualPhoto ? [
          "سيتم حذف الصورة نهائياً من النظام",
          "ستحتاج لرفع صورة جديدة لاحقاً إذا لزم الأمر",
          "ستفقد ارتباط الصورة بملف المتدرب"
        ] : [
          "سيتم حذف الوثيقة نهائياً من النظام",
          "ستفقد جميع البيانات المرتبطة بهذه الوثيقة",
          "ستحتاج لرفع الوثيقة مرة أخرى إذا لزم الأمر",
          "قد يؤثر هذا على اكتمال ملف المتدرب"
        ]}
        confirmText="حذف نهائياً"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}