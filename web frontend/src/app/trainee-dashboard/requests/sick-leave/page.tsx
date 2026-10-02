'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowRightIcon, PaperAirplaneIcon, HeartIcon, DocumentTextIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

export default function SickLeavePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    attachmentUrl: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('يجب رفع صورة أو PDF فقط');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('trainee_token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData
      });

      const data = await response.json();
      setFormData({...formData, attachmentUrl: data.url});
      toast.success('تم رفع الملف بنجاح');
    } catch (error) {
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      toast.error('يجب كتابة السبب');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('trainee_token');

      const response = await fetch(`${API_BASE_URL}/trainee-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'SICK_LEAVE',
          reason: formData.reason,
          attachmentUrl: formData.attachmentUrl || undefined,
        })
      });

      if (response.ok) {
        toast.success('تم إرسال طلب الإجازة المرضية بنجاح');
        router.push('/trainee-dashboard/requests');
      } else {
        const error = await response.json().catch(() => null);
        const errorMessage =
          (Array.isArray(error?.message) ? error.message.join('، ') : error?.message) ||
          'حدث خطأ أثناء إرسال الطلب';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8">
        <Link 
          href="/trainee-dashboard/requests" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-6"
        >
          <ArrowRightIcon className="w-4 h-4" />
          العودة إلى الطلبات
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center flex-shrink-0">
            <HeartIcon className="w-7 h-7 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">طلب إجازة مرضية</h1>
            <p className="text-sm text-slate-500 mt-1">قم بتعبئة النموذج أدناه لتقديم طلب إجازة مرضية مع إرفاق العذر الطبي إن وجد.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        
        {/* السبب */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            سبب الإجازة المرضية <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-900 resize-none"
              rows={5}
              placeholder="يرجى توضيح سبب الإجازة المرضية بالتفصيل..."
              required
            />
            <DocumentTextIcon className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* رفع مرفق */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">
            المرفق الطبي (اختياري ولكن يفضل إرفاقه)
          </label>
          {formData.attachmentUrl ? (
            <div className="relative border-2 border-emerald-200 rounded-2xl p-6 bg-emerald-50/50 flex flex-col items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-base font-bold text-emerald-700">تم إرفاق التقرير الطبي بنجاح</p>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, attachmentUrl: ''})}
                className="mt-4 px-4 py-2 bg-white text-rose-600 rounded-xl hover:bg-rose-50 border border-rose-100 shadow-sm transition-colors text-sm font-bold"
              >
                إزالة المرفق وإعادة الرفع
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full py-10 px-6 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-base font-bold text-slate-700">جاري رفع التقرير الطبي...</p>
                  <p className="text-sm text-slate-500 mt-1">يرجى الانتظار لحظات</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mb-4 transition-colors">
                    <CloudArrowUpIcon className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <span className="text-lg font-bold text-slate-700 group-hover:text-emerald-700 transition-colors mb-1">
                    اضغط هنا لرفع التقرير الطبي
                  </span>
                  <span className="text-sm text-slate-500 mb-4">
                    أو قم بسحب وإفلات الملف هنا
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>يدعم ملفات PDF و الصور (الحد الأقصى 5MB)</span>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploading}
                  />
                </>
              )}
            </label>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            إلغاء وتراجع
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 sm:flex-none px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4 rotate-180" />
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}