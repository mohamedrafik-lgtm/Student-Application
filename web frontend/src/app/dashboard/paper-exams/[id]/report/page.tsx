'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { getExamReport } from '@/lib/paper-exams-api';
import { toast } from 'react-hot-toast';
import { PrinterIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, UserMinusIcon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type TabType = 'all' | 'passed' | 'failed' | 'absent';

// دالة حساب التقدير
function getGradeRating(percentage: number) {
  if (percentage >= 80) return { label: 'امتياز', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' };
  if (percentage >= 70) return { label: 'جيد جداً', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
  if (percentage >= 60) return { label: 'جيد', color: 'text-cyan-700', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-300' };
  if (percentage >= 50) return { label: 'مقبول', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' };
  return { label: 'ضعيف', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
}

export default function PaperExamReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = parseInt(resolvedParams.id);
  const initialTab = (searchParams.get('tab') as TabType) || 'all';
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReport();
  }, [examId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await getExamReport(examId);
      setReport(data);
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل التقرير');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // فلترة حسب البحث
  const filterBySearch = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item: any) => {
      const name = (item.trainee?.nameAr || item.nameAr || '').toLowerCase();
      const nid = (item.trainee?.nationalId || item.nationalId || '').toLowerCase();
      return name.includes(q) || nid.includes(q);
    });
  };

  const getFilteredSheets = () => {
    if (!report) return [];
    let sheets = report.answerSheets;
    if (activeTab === 'passed') sheets = sheets.filter((s: any) => s.passed);
    if (activeTab === 'failed') sheets = sheets.filter((s: any) => !s.passed);
    return filterBySearch(sheets);
  };

  const getFilteredAbsent = () => {
    if (!report) return [];
    return filterBySearch(report.traineesWhoDidNotTake);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'all': return 'جميع النتائج';
      case 'passed': return 'تقرير الناجحين';
      case 'failed': return 'تقرير الراسبين';
      case 'absent': return 'تقرير الغائبين';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3 animate-pulse"></div>
        <div className="h-4 bg-slate-200 rounded-lg w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3 mx-auto"></div>
              <div className="h-8 bg-slate-200 rounded animate-pulse w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return <div>التقرير غير متاح</div>;
  }

  const tabs: { key: TabType; label: string; icon: any; count: number; color: string; bg: string }[] = [
    { key: 'all', label: 'الكل', icon: ListBulletIcon, count: report.stats.total, color: 'text-blue-700', bg: 'bg-blue-600 text-white' },
    { key: 'passed', label: 'ناجحون', icon: CheckCircleIcon, count: report.stats.passed, color: 'text-green-700', bg: 'bg-blue-600 text-white' },
    { key: 'failed', label: 'راسبون', icon: XCircleIcon, count: report.stats.failed, color: 'text-red-700', bg: 'bg-blue-600 text-white' },
    { key: 'absent', label: 'غائبون', icon: UserMinusIcon, count: report.traineesWhoDidNotTake.length, color: 'text-orange-700', bg: 'bg-blue-600 text-white' },
  ];

  const filteredSheets = getFilteredSheets();
  const filteredAbsent = getFilteredAbsent();

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <PageHeader
        title={`تقرير: ${report.paperExam.title}`}
        description={`${report.paperExam.trainingContent.name}${report.paperExam.trainingContent.classroom?.name ? ' - ' + report.paperExam.trainingContent.classroom.name : ''}`}
        breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' }, { label: 'التقرير' }]}
      />

      {/* أزرار التنقل - تخفى في الطباعة */}
      <div className="flex items-center gap-3 print:hidden">
        <Button onClick={() => router.back()} variant="outline" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
          رجوع
        </Button>
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white" leftIcon={<PrinterIcon className="w-4 h-4" />}>
          طباعة {getTabTitle()}
        </Button>
      </div>

      {/* عنوان الطباعة */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-xl font-bold">{getTabTitle()}</h2>
        <p className="text-sm text-slate-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:grid-cols-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg inline-flex mx-auto mb-2">
            <ListBulletIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-slate-600 mb-1">إجمالي المتقدمين</p>
          <p className="text-2xl font-bold text-slate-800">{report.stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <div className="p-3 bg-green-50 rounded-lg inline-flex mx-auto mb-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs text-slate-600 mb-1">ناجحون</p>
          <p className="text-2xl font-bold text-slate-800">{report.stats.passed}</p>
          <p className="text-xs text-green-600">{report.stats.total > 0 ? ((report.stats.passed / report.stats.total) * 100).toFixed(0) : 0}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <div className="p-3 bg-red-50 rounded-lg inline-flex mx-auto mb-2">
            <XCircleIcon className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-xs text-slate-600 mb-1">راسبون</p>
          <p className="text-2xl font-bold text-slate-800">{report.stats.failed}</p>
          <p className="text-xs text-red-600">{report.stats.total > 0 ? ((report.stats.failed / report.stats.total) * 100).toFixed(0) : 0}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <div className="p-3 bg-orange-50 rounded-lg inline-flex mx-auto mb-2">
            <UserMinusIcon className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-xs text-slate-600 mb-1">غائبون</p>
          <p className="text-2xl font-bold text-slate-800">{report.traineesWhoDidNotTake.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <div className="p-3 bg-purple-50 rounded-lg inline-flex mx-auto mb-2">
            <ListBulletIcon className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs text-slate-600 mb-1">متوسط الدرجات</p>
          <p className="text-2xl font-bold text-slate-800">{report.stats.averagePercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* التبويبات - تخفى في الطباعة */}
      <div className="print:hidden">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white bg-opacity-70 text-blue-600' : 'bg-slate-200'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* حقل البحث - يخفى في الطباعة */}
      <div className="print:hidden">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم القومي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* محتوى التبويب */}
      {activeTab !== 'absent' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 md:p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {activeTab === 'all' && <><ListBulletIcon className="w-5 h-5 text-blue-600 print:hidden" /> جميع النتائج ({filteredSheets.length})</>}
              {activeTab === 'passed' && <><CheckCircleIcon className="w-5 h-5 text-green-600 print:hidden" /> الطلاب الناجحون ({filteredSheets.length})</>}
              {activeTab === 'failed' && <><XCircleIcon className="w-5 h-5 text-red-600 print:hidden" /> الطلاب الراسبون ({filteredSheets.length})</>}
            </h3>
            
            {filteredSheets.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : activeTab === 'passed' ? 'لا يوجد طلاب ناجحون' : activeTab === 'failed' ? 'لا يوجد طلاب راسبون' : 'لم يتم تصحيح أي أوراق بعد'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-slate-50">
                      <th className="text-right py-3 px-3 font-bold text-slate-700">#</th>
                      <th className="text-right py-3 px-3 font-bold text-slate-700">اسم المتدرب</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">الرقم القومي</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">النموذج</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">الدرجة</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">النسبة</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">التقدير</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSheets.map((sheet: any, index: number) => {
                      const rating = getGradeRating(sheet.percentage);
                      return (
                        <tr key={sheet.id} className={`hover:bg-slate-50 ${!sheet.passed ? 'bg-red-50/30' : ''}`}>
                          <td className="py-3 px-3 text-slate-500">{index + 1}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">{sheet.trainee.nameAr}</td>
                          <td className="py-3 px-3 text-center text-slate-600">{sheet.trainee.nationalId}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{sheet.model.modelCode}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold">{sheet.score}/{sheet.totalPoints}</td>
                          <td className={`py-3 px-3 text-center font-bold ${sheet.passed ? 'text-green-700' : 'text-red-700'}`}>
                            {sheet.percentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${rating.bgColor} ${rating.color} border ${rating.borderColor}`}>
                              {rating.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              sheet.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {sheet.passed ? '✓ ناجح' : '✗ ضعيف'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* تقرير الغائبين */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 md:p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-700">
              <UserMinusIcon className="w-5 h-5 print:hidden" />
              المتدربون الذين لم يحضروا الاختبار ({filteredAbsent.length})
            </h3>

            {filteredAbsent.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'جميع المتدربين أدوا الاختبار'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-orange-50">
                      <th className="text-right py-3 px-3 font-bold text-slate-700">#</th>
                      <th className="text-right py-3 px-3 font-bold text-slate-700">اسم المتدرب</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">الرقم القومي</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAbsent.map((trainee: any, index: number) => (
                      <tr key={trainee.id} className="hover:bg-orange-50/50">
                        <td className="py-3 px-3 text-slate-500">{index + 1}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{trainee.nameAr}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{trainee.nationalId}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                            <UserMinusIcon className="w-3 h-3" />
                            غائب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}