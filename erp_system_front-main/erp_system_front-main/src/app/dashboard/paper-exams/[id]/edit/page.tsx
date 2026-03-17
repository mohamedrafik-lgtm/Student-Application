'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { getPaperExam, updatePaperExam } from '@/lib/paper-exams-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function EditPaperExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const examId = parseInt(resolvedParams.id);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    examDate: '',
    duration: 0,
    totalMarks: 0,
    passingScore: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      const exam = await getPaperExam(examId);
      setFormData({
        title: exam.title,
        description: exam.description || '',
        instructions: exam.instructions || '',
        examDate: new Date(exam.examDate).toISOString().split('T')[0],
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        passingScore: exam.passingScore,
      });
    } catch (error) {
      toast.error('فشل تحميل بيانات الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await updatePaperExam(examId, formData);
      toast.success('تم تحديث الاختبار بنجاح!');
      router.push(`/dashboard/paper-exams/${examId}`);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحديث الاختبار');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="تعديل الاختبار الورقي"
        description="تعديل بيانات الاختبار"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
          { label: 'تعديل' }
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">عنوان الاختبار</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">الوصف (اختياري)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">التعليمات (اختياري)</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                rows={4}
                placeholder="مثال: استخدم قلم رصاص، ظلل الدائرة بالكامل، لا تكتب خارج المربعات..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الاختبار</label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">المدة (دقيقة)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">إجمالي الدرجات</label>
                <input
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  min="1"
                  step="0.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">درجة النجاح (%)</label>
                <input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              disabled={saving}
              isLoading={saving}
              variant="success"
            >
              حفظ التغييرات
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              disabled={saving}
              leftIcon={<XMarkIcon className="w-4 h-4" />}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}