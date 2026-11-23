'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { ArrowRightIcon, PrinterIcon } from '@heroicons/react/24/outline';

export default function CommitteesReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = parseInt(resolvedParams.id);
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sheetsData, examData] = await Promise.all([
        fetchAPI(`/paper-exams/${examId}/committees-sheets`),
        fetchAPI(`/paper-exams/${examId}`)
      ]);
      setData(sheetsData);
      setExam(examData);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || !exam) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-center text-slate-600">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title="تقرير اللجان المخصصة"
          description={exam.title}
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
            { label: 'تقرير اللجان' }
          ]}
        />

        <div className="flex gap-3 mb-6">
          <Button onClick={() => router.back()} variant="outline" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            رجوع
          </Button>
          <Button onClick={handlePrint} variant="primary" leftIcon={<PrinterIcon className="w-4 h-4" />}>
            طباعة التقرير
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2">
          <h1 className="text-3xl font-bold mb-2">{exam.trainingContent?.program?.nameAr}</h1>
          <h2 className="text-2xl font-bold text-blue-600 mb-4">{exam.title}</h2>
          <div className="flex justify-center gap-8 text-sm text-slate-600">
            <div>
              <span className="font-semibold">المدة:</span> {exam.duration} دقيقة
            </div>
            <div>
              <span className="font-semibold">الدرجات:</span> {exam.totalMarks} درجة
            </div>
            <div>
              <span className="font-semibold">عدد المجموعات:</span> {data.groupsCount}
            </div>
            <div>
              <span className="font-semibold">إجمالي الطلاب:</span> {data.totalSheets}
            </div>
          </div>
        </div>

        {/* إحصائيات عامة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm text-blue-600 font-semibold mb-1">عدد المجموعات</p>
              <p className="text-3xl font-bold text-blue-700">{data.groupsCount}</p>
            </div>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm text-green-600 font-semibold mb-1">إجمالي اللجان</p>
              <p className="text-3xl font-bold text-green-700">
                {data.groups.reduce((sum: number, g: any) => sum + g.committees.length, 0)}
              </p>
            </div>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm text-purple-600 font-semibold mb-1">إجمالي الطلاب</p>
              <p className="text-3xl font-bold text-purple-700">{data.totalSheets}</p>
            </div>
          </div>
        </div>

        {/* تفاصيل كل مجموعة */}
        {data.groups.map((group: any, groupIndex: number) => (
          <div key={groupIndex} className="mb-8 break-inside-avoid">
            <div className="bg-slate-700 text-white p-4 rounded-t-lg">
              <h3 className="text-xl font-bold">{group.groupName}</h3>
              <p className="text-sm opacity-90">
                {group.committees.length} لجنة - {group.committees.reduce((sum: number, c: any) => sum + c.sheetsCount, 0)} طالب
              </p>
            </div>

            <div className="border-2 border-purple-200 rounded-b-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-bold text-purple-900">اللجنة</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-purple-900">عدد الطلاب</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-purple-900">النماذج المستخدمة</th>
                  </tr>
                </thead>
                <tbody>
                  {group.committees.map((committee: any, committeeIndex: number) => {
                    // تجميع النماذج
                    const modelsCount = new Map();
                    committee.sheets.forEach((sheet: any) => {
                      const code = sheet.model.modelCode;
                      modelsCount.set(code, (modelsCount.get(code) || 0) + 1);
                    });

                    return (
                      <tr key={committeeIndex} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-lg text-orange-600">اللجنة {committee.committeeNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{committee.sheetsCount} طالب</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3 flex-wrap">
                            {Array.from(modelsCount.entries()).map(([code, count]) => (
                              <span key={code} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                                <span className="font-black text-base">{code}</span>
                                <span className="text-xs">({count})</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 text-center text-sm text-slate-600">
          <p>تم إنشاء التقرير في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
}
