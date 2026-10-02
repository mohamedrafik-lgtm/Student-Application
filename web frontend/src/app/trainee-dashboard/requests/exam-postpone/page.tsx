'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowRightIcon, PaperAirplaneIcon, CalendarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmeraldDatePicker from '@/components/ui/emerald-date-picker';

export default function ExamPostponePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    examType: 'MIDTERM' as 'MIDTERM' | 'FINAL',
    examDate: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.examDate || !formData.reason.trim()) {
      toast.error('يجب ملء جميع الحقول');
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
          type: 'EXAM_POSTPONE',
          reason: formData.reason,
          examType: formData.examType,
          examDate: formData.examDate,
        })
      });

      if (response.ok) {
        toast.success('تم إرسال طلبك بنجاح');
        router.push('/trainee-dashboard/requests');
      } else {
        const error = await response.json();
        const errorMessage =
          (Array.isArray(error?.message) ? error.message.join('، ') : error?.message) ||
          'حدث خطأ أثناء إرسال الطلب';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
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
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">طلب تأجيل اختبار</h1>
            <p className="text-sm text-slate-500 mt-1">قم بتعبئة النموذج أدناه لتقديم طلب تأجيل لاختبار محدد.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* نوع الاختبار */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              نوع الاختبار <span className="text-rose-500">*</span>
            </label>
            <Select
              value={formData.examType}
              onValueChange={(value: 'MIDTERM' | 'FINAL') => setFormData({...formData, examType: value})}
            >
              <SelectTrigger className="w-full h-[50px] px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900">
                <SelectValue placeholder="اختر نوع الاختبار" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl shadow-lg">
                <SelectItem value="MIDTERM" className="focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer py-3">اختبار نصفي (ميد تيرم)</SelectItem>
                <SelectItem value="FINAL" className="focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer py-3">اختبار نهائي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* تاريخ الاختبار */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              تاريخ الاختبار الأصلي <span className="text-rose-500">*</span>
            </label>
            <EmeraldDatePicker
              value={formData.examDate}
              onChange={(date) => setFormData({...formData, examDate: date})}
              placeholder="اختر تاريخ الاختبار"
            />
          </div>
        </div>

        {/* السبب */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            سبب طلب التأجيل <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-900 resize-none"
              rows={5}
              placeholder="يرجى توضيح سبب طلب تأجيل الاختبار بالتفصيل..."
              required
            />
            <DocumentTextIcon className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            سيتم مراجعة طلبك من قبل الإدارة الأكاديمية والرد عليك في أقرب وقت ممكن.
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