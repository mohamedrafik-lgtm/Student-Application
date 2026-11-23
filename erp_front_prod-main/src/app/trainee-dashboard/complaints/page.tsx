'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { API_BASE_URL } from '@/lib/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Complaint {
  id: string;
  type: 'COMPLAINT' | 'SUGGESTION';
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminResponse?: string;
  reviewer?: { name: string };
  reviewedAt?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: ClockIcon },
  IN_PROGRESS: { label: 'جاري المعالجة', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: WrenchScrewdriverIcon },
  RESOLVED: { label: 'تم الحل', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: CheckCircleIcon },
  CLOSED: { label: 'مغلق', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircleIcon },
};

export default function ComplaintsPage() {
  const { profile: traineeData, loading: profileLoading } = useTraineeProfile();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'COMPLAINT' | 'SUGGESTION'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const [formData, setFormData] = useState({
    type: 'COMPLAINT' as 'COMPLAINT' | 'SUGGESTION',
    subject: '',
    description: '',
    attachmentUrl: '',
    attachmentCloudinaryId: '',
  });

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('trainee_token');
      const response = await fetch(`${API_BASE_URL}/complaints/my-complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setComplaints(data || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يجب رفع صورة فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5MB');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('trainee_token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/upload?folder=complaints`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      });

      const data = await response.json();
      if (data.url) {
        setFormData({
          ...formData,
          attachmentUrl: data.url || data.secure_url,
          attachmentCloudinaryId: data.public_id || '',
        });
        toast.success('تم رفع الصورة');
      } else {
        toast.error('فشل رفع الصورة');
      }
    } catch (error) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('يجب ملء العنوان والتفاصيل');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('trainee_token');

      const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: formData.type,
          subject: formData.subject,
          description: formData.description,
          attachmentUrl: formData.attachmentUrl || undefined,
          attachmentCloudinaryId: formData.attachmentCloudinaryId || undefined,
        }),
      });

      if (response.ok) {
        toast.success(
          formData.type === 'COMPLAINT' ? 'تم إرسال الشكوى بنجاح' : 'تم إرسال الاقتراح بنجاح'
        );
        setShowForm(false);
        setFormData({
          type: 'COMPLAINT',
          subject: '',
          description: '',
          attachmentUrl: '',
          attachmentCloudinaryId: '',
        });
        loadComplaints();
      } else {
        const err = await response.json();
        toast.error(err.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredComplaints = activeTab === 'all' ? complaints : complaints.filter((c) => c.type === activeTab);

  if (profileLoading) {
    return <LoadingScreen message="جاري تحضير الصفحة..." submessage="لحظات من فضلك" />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/trainee-dashboard" className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الشكاوي والاقتراحات</h1>
            <p className="text-slate-500 text-sm mt-1">تواصل معنا لتحسين خدماتنا</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
          إرسال جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold text-slate-900">{complaints.length}</p>
          <p className="text-sm font-medium text-slate-500">الإجمالي</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm flex flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold text-amber-700">
            {complaints.filter((c) => c.status === 'PENDING').length}
          </p>
          <p className="text-sm font-medium text-amber-700">قيد المراجعة</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm flex flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold text-blue-700">
            {complaints.filter((c) => c.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-sm font-medium text-blue-700">جاري المعالجة</p>
        </div>
        <div className="bg-teal-50 rounded-2xl p-5 border border-teal-100 shadow-sm flex flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold text-teal-700">
            {complaints.filter((c) => c.status === 'RESOLVED').length}
          </p>
          <p className="text-sm font-medium text-teal-700">تم الحل</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'COMPLAINT', label: 'شكاوي' },
          { key: 'SUGGESTION', label: 'اقتراحات' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-600"></div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <ChatBubbleLeftRightIcon className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-900 text-xl font-bold mb-2">لا توجد شكاوي أو اقتراحات بعد</p>
          <p className="text-slate-500">اضغط على &quot;إرسال جديد&quot; لإنشاء طلب</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredComplaints.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status];
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedComplaint(item)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-1 h-full transform origin-right scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ${
                  item.type === 'COMPLAINT' ? 'bg-rose-500' : 'bg-amber-500'
                }`}></div>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                      item.type === 'COMPLAINT' 
                        ? 'bg-rose-50 border-rose-100' 
                        : 'bg-amber-50 border-amber-100'
                    }`}
                  >
                    {item.type === 'COMPLAINT' ? (
                      <ExclamationTriangleIcon className="w-6 h-6 text-rose-600" />
                    ) : (
                      <LightBulbIcon className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2">{item.subject}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap flex-shrink-0 ${statusConfig.color}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">{item.description}</p>
                    <div className="flex items-center gap-4 text-sm font-medium text-slate-500 pt-4 border-t border-slate-100">
                      <span className={`flex items-center gap-1.5 ${item.type === 'COMPLAINT' ? 'text-rose-600' : 'text-amber-600'}`}>
                        {item.type === 'COMPLAINT' ? 'شكوى' : 'اقتراح'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="w-4 h-4 text-slate-400" />
                        {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                      {item.attachmentUrl && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1.5 text-emerald-600">
                            <PhotoIcon className="w-4 h-4" />
                            مرفق
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Response Preview */}
                {item.adminResponse && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 px-6 pb-6">
                    <p className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1.5">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      رد الإدارة:
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{item.adminResponse}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Complaint Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 rounded-3xl border-slate-200 overflow-hidden flex flex-col gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">إرسال شكوى أو اقتراح</DialogTitle>
          
          {/* Header - Fixed */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between flex-shrink-0">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">إرسال شكوى أو اقتراح</h3>
              <p className="text-sm sm:text-base text-slate-500">نحن هنا للاستماع إليك ومساعدتك</p>
            </div>
            <button 
              onClick={() => setShowForm(false)} 
              className="p-2 hover:bg-slate-200 rounded-xl flex-shrink-0 transition-colors bg-white border border-slate-200 shadow-sm"
            >
              <XMarkIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <form id="complaint-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* نوع الطلب */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                نوع الطلب <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'COMPLAINT' })}
                  className={`p-5 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3 ${
                    formData.type === 'COMPLAINT'
                      ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-rose-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    formData.type === 'COMPLAINT' ? 'bg-rose-100' : 'bg-slate-100'
                  }`}>
                    <ExclamationTriangleIcon
                      className={`w-6 h-6 ${
                        formData.type === 'COMPLAINT' ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <p className={`font-bold text-base ${formData.type === 'COMPLAINT' ? 'text-rose-900' : 'text-slate-600'}`}>
                    شكوى
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'SUGGESTION' })}
                  className={`p-5 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3 ${
                    formData.type === 'SUGGESTION'
                      ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    formData.type === 'SUGGESTION' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <LightBulbIcon
                      className={`w-6 h-6 ${
                        formData.type === 'SUGGESTION' ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <p className={`font-bold text-base ${formData.type === 'SUGGESTION' ? 'text-amber-900' : 'text-slate-600'}`}>
                    اقتراح
                  </p>
                </button>
              </div>
            </div>

            {/* العنوان */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                العنوان <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 text-base transition-colors bg-slate-50/50 focus:bg-white"
                placeholder="اكتب عنواناً مختصراً يصف طلبك..."
                required
              />
            </div>

            {/* التفاصيل */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                التفاصيل <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 text-base transition-colors bg-slate-50/50 focus:bg-white resize-none"
                rows={5}
                placeholder="اشرح تفاصيل طلبك بوضوح..."
                required
              />
            </div>

            {/* رفع صورة */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                إرفاق صورة (اختياري)
              </label>
              {formData.attachmentUrl ? (
                <div className="relative border-2 border-emerald-200 rounded-2xl p-4 bg-emerald-50/50">
                  <img
                    src={formData.attachmentUrl}
                    alt="مرفق"
                    className="w-full h-48 object-cover rounded-xl border border-emerald-100 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, attachmentUrl: '', attachmentCloudinaryId: '' })
                    }
                    className="absolute top-6 left-6 p-2 bg-white text-rose-500 rounded-xl hover:bg-rose-50 border border-rose-100 shadow-sm transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  <div className="flex items-center justify-center gap-2 mt-4 text-emerald-700 font-bold text-sm">
                    <CheckCircleIcon className="w-5 h-5" />
                    تم رفع الصورة بنجاح
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mb-3 transition-colors">
                    <PhotoIcon className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">
                    {uploading ? 'جاري الرفع...' : 'اضغط هنا لرفع صورة'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG (الحد الأقصى 5MB)</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </form>

          {/* Footer - Fixed */}
          <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="complaint-form"
              disabled={submitting || uploading}
              className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
                  إرسال الطلب
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => { if (!open) setSelectedComplaint(null); }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 rounded-3xl border-slate-200 overflow-hidden flex flex-col gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">تفاصيل الطلب</DialogTitle>
          
          {selectedComplaint && (
            <>
              {/* Header - Fixed */}
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                      selectedComplaint.type === 'COMPLAINT' 
                        ? 'bg-rose-50 border-rose-100' 
                        : 'bg-amber-50 border-amber-100'
                    }`}
                  >
                    {selectedComplaint.type === 'COMPLAINT' ? (
                      <ExclamationTriangleIcon className="w-7 h-7 text-rose-600" />
                    ) : (
                      <LightBulbIcon className="w-7 h-7 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedComplaint.subject}</h3>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <span className={selectedComplaint.type === 'COMPLAINT' ? 'text-rose-600' : 'text-amber-600'}>
                        {selectedComplaint.type === 'COMPLAINT' ? 'شكوى' : 'اقتراح'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      {new Date(selectedComplaint.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedComplaint(null)} 
                  className="p-2 hover:bg-slate-200 rounded-xl flex-shrink-0 transition-colors bg-white border border-slate-200 shadow-sm"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                {/* الحالة */}
                {(() => {
                  const statusConfig = STATUS_CONFIG[selectedComplaint.status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${statusConfig.color}`}>
                      <StatusIcon className="w-5 h-5" />
                      الحالة: {statusConfig.label}
                    </div>
                  );
                })()}

                {/* التفاصيل */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-slate-400" />
                    التفاصيل:
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* المرفق */}
                {selectedComplaint.attachmentUrl && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <PhotoIcon className="w-5 h-5 text-slate-400" />
                      المرفق:
                    </p>
                    <img
                      src={selectedComplaint.attachmentUrl}
                      alt="مرفق"
                      className="w-full rounded-xl border border-slate-100 shadow-sm"
                    />
                  </div>
                )}

                {/* رد الإدارة */}
                {selectedComplaint.adminResponse && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                    <p className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                      رد الإدارة:
                    </p>
                    <p className="text-base text-emerald-800 leading-relaxed mb-4">{selectedComplaint.adminResponse}</p>
                    {selectedComplaint.reviewer && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600/80 pt-4 border-t border-emerald-200/50">
                        <span>المراجع: {selectedComplaint.reviewer.name}</span>
                        {selectedComplaint.reviewedAt && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                            <span>{new Date(selectedComplaint.reviewedAt).toLocaleDateString('ar-EG')}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Fixed */}
              <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex-shrink-0">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="w-full px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}