'use client';

import { useState, useEffect, use } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { PrinterIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SheetsListPage({
  params
}: {
  params: Promise<{ id: string; modelId: string }>
}) {
  const resolvedParams = use(params);
  const examId = parseInt(resolvedParams.id);
  const modelId = parseInt(resolvedParams.modelId);
  
  const [sheets, setSheets] = useState<any[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSheets();
  }, [modelId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sheets.filter(sheet =>
        sheet.trainee.nameAr.includes(searchTerm) ||
        sheet.trainee.nationalId.includes(searchTerm) ||
        sheet.sheetCode.includes(searchTerm)
      );
      setFilteredSheets(filtered);
    } else {
      setFilteredSheets(sheets);
    }
  }, [searchTerm, sheets]);

  const loadSheets = async () => {
    try {
      const sheetsData = await fetchAPI(`/paper-exams/${examId}/models/${modelId}/sheets`);
      setSheets(sheetsData || []);
      setFilteredSheets(sheetsData || []);
    } catch (error) {
      toast.error('فشل تحميل أوراق الإجابة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-14 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-36 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="طباعة أوراق الإجابة الفردية"
        description={`إجمالي ${sheets.length} ورقة إجابة`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
          { label: 'أوراق الإجابة' }
        ]}
      />

      {/* شريط البحث */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الرقم القومي أو كود الورقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
          />
        </div>
        {searchTerm && (
          <p className="text-xs text-slate-500 mt-2">
            نتائج البحث: {filteredSheets.length} من {sheets.length}
          </p>
        )}
      </div>

      {/* قائمة الطلاب */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSheets.map((sheet) => (
          <div key={sheet.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate text-sm">{sheet.trainee.nameAr}</h3>
                <p className="text-xs text-slate-500">{sheet.trainee.nationalId}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sheet.sheetCode}</p>
              </div>
            </div>
            
            <Button
              onClick={() => {
                const url = `/print/omr-answer-sheets-bulk/${examId}/${modelId}?singleSheet=${sheet.id}`;
                window.open(url, '_blank');
              }}
              size="sm"
              fullWidth
              leftIcon={<PrinterIcon className="w-4 h-4" />}
            >
              طباعة
            </Button>
          </div>
        ))}
      </div>

      {filteredSheets.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          {searchTerm ? (
            <p className="text-slate-500">لا توجد نتائج للبحث "{searchTerm}"</p>
          ) : (
            <p className="text-slate-500">لا توجد أوراق إجابة. قم بتوليدها أولاً.</p>
          )}
        </div>
      )}
    </div>
  );
}