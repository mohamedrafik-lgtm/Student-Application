'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/app/components/PageHeader';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiEye, FiCalendar, FiClock, FiFileText, FiCamera, FiCheckCircle } from 'react-icons/fi';

export default function VisionAIPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/paper-exams');
      setExams(data || []);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل الاختبارات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header مع تصميم Vision AI */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Vision AI</h1>
            <p className="text-blue-100 text-lg">نظام التصحيح الذكي المتقدم</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black mb-1">{exams.length}</div>
            <div className="text-blue-100 text-sm">اختبار متاح</div>
          </div>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            🧠 تفكير عميق
          </div>
          <div className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            ⚡ تصحيح فوري
          </div>
          <div className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            ✨ دقة 99%
          </div>
        </div>
      </div>

      {/* قائمة الاختبارات */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
          <FiFileText className="text-blue-600" />
          الاختبارات الورقية المتاحة
        </h2>

        {exams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">لا توجد اختبارات متاحة</p>
            <p className="text-gray-400 text-sm">قم بإنشاء اختبار ورقي أولاً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam: any) => (
              <div 
                key={exam.id} 
                className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all group cursor-pointer"
                onClick={() => router.push(`/dashboard/paper-exams/${exam.id}/scan`)}
              >
                {/* العنوان */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-gray-600">{exam.trainingContent?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {exam.trainingContent?.program?.nameAr}
                  </p>
                </div>

                {/* المعلومات */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCalendar className="text-blue-500" />
                    <span>{new Date(exam.examDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="text-blue-500" />
                    <span>{exam.duration} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCheckCircle className="text-blue-500" />
                    <span>{exam.totalMarks} درجة</span>
                  </div>
                </div>

                {/* الإحصائيات */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{exam._count?.models || 0}</div>
                    <div className="text-xs text-gray-600">نموذج</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{exam._count?.answerSheets || 0}</div>
                    <div className="text-xs text-gray-600">ورقة</div>
                  </div>
                </div>

                {/* زر التصحيح */}
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/paper-exams/${exam.id}/scan`);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transform group-hover:scale-105 transition-all"
                >
                  <FiCamera className="ml-2" />
                  تصحيح ذكي بـ Vision AI
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* معلومات Vision AI */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <FiEye className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">عن Vision AI</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              نظام تصحيح ذكي متقدم يستخدم تقنية الذكاء الاصطناعي لتحليل أوراق الإجابة تلقائياً. 
              يوفر دقة فائقة وسرعة غير مسبوقة في التصحيح مع إمكانية المراجعة اليدوية.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <div className="font-bold text-gray-900">دقة عالية</div>
                  <div className="text-xs text-gray-600">99% accuracy</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="font-bold text-gray-900">سرعة فائقة</div>
                  <div className="text-xs text-gray-600">تصحيح فوري</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <div className="font-bold text-gray-900">موثوقية</div>
                  <div className="text-xs text-gray-600">نتائج مضمونة</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}