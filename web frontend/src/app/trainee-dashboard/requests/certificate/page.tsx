'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowRightIcon, PaperAirplaneIcon, DocumentDuplicateIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

export default function CertificatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('يجب كتابة سبب الطلب');
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
          type: 'CERTIFICATE',
          reason: reason,
        })
      });

      if (response.ok) {
        toast.success('تم إرسال طلب الإفادة بنجاح');
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
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <DocumentDuplicateIcon className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">طلب إفادة</h1>
            <p className="text-sm text-slate-500 mt-1">قم بتعبئة النموذج أدناه لطلب إفادة رسمية من المعهد.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            سبب الطلب والجهة الموجه إليها <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-900 resize-none"
              rows={5}
              placeholder="مثال: للتقديم في دورة تدريبية، للجهات الرسمية، أو أي جهة أخرى..."
              required
            />
            <DocumentTextIcon className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            يرجى توضيح الغرض من الإفادة والجهة التي سيتم تقديمها إليها.
          </p>
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
            disabled={loading}
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