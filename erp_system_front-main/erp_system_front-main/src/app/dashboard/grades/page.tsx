'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { getTraineesForGrades, TraineeForGrades, getTraineeGradesDetailed } from '@/lib/grades-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  DocumentIcon,
  TableCellsIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Program {
  id: number;
  nameAr: string;
}

// Function to export all trainees grades to Excel
const exportAllGradesToExcel = async (traineesToExport: TraineeForGrades[]) => {
  if (traineesToExport.length === 0) {
    toast.error('لا يوجد متدربين للتصدير');
    return;
  }
  
  try {
    toast.loading(`جاري تجهيز ملف الإكسل لـ ${traineesToExport.length} متدرب...`);
    
    // Dynamic import of xlsx library
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default || xlsxModule;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    const rows: any[][] = [];
    let traineeNumber = 0;
    
    // Fetch grades for each trainee
    for (const trainee of traineesToExport) {
      traineeNumber++;
      
      // صف فارغ قبل كل متدرب (ما عدا الأول)
      if (traineeNumber > 1) {
        rows.push([]);
      }
      
      // صف بيانات المتدرب
      rows.push([`${traineeNumber}. ${trainee.nameAr}`, '', `الرقم القومي: ${trainee.nationalId}`, '', `البرنامج: ${trainee.program?.nameAr || '-'}`]);
      
      // صف رأس المواد
      rows.push(['', 'المادة', 'الدرجة']);
      
      try {
        const gradesData = await getTraineeGradesDetailed(trainee.id);
        const contentGrades = gradesData.contentGrades || [];
        
        if (contentGrades.length > 0) {
          contentGrades.forEach((cg: any) => {
            const grade = cg.grade;
            const yearWork = grade?.yearWorkMarks || 0;
            const practical = grade?.practicalMarks || 0;
            const written = grade?.writtenMarks || 0;
            const attendance = grade?.attendanceMarks || 0;
            const quizzes = grade?.quizzesMarks || 0;
            const finalExam = grade?.finalExamMarks || 0;
            const total = Math.round(yearWork + practical + written + attendance + quizzes + finalExam);
            
            rows.push(['', cg.content?.name || '-', total]);
          });
        } else {
          rows.push(['', 'لا توجد درجات مسجلة', '-']);
        }
      } catch (err) {
        rows.push(['', 'خطأ في جلب الدرجات', '-']);
      }
    }
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // تحسين عرض الأعمدة
    ws['!cols'] = [
      { wch: 40 },  // اسم المتدرب / فارغ
      { wch: 40 },  // المادة
      { wch: 15 },  // الدرجة / الرقم القومي
      { wch: 5 },   // فارغ
      { wch: 30 },  // البرنامج
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الدرجات');
    
    // Generate file
    const date = new Date().toISOString().split('T')[0];
    const fileName = `تقرير_درجات_المتدربين_${date}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    toast.dismiss();
    toast.success('تم تحميل ملف الإكسل بنجاح');
  } catch (error: any) {
    toast.dismiss();
    console.error('Excel export error:', error);
    toast.error('حدث خطأ في تصدير الملف');
  }
};

export default function GradesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades', action: 'view' }}>
      <GradesContent />
    </ProtectedPage>
  );
}

function GradesContent() {
  const router = useRouter();
  const [trainees, setTrainees] = useState<TraineeForGrades[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'print'>('excel');
  const [exportProgramId, setExportProgramId] = useState<number | undefined>(undefined);

  // Function to open export dialog
  const openExportDialog = (type: 'excel' | 'print') => {
    setExportType(type);
    setExportProgramId(undefined);
    setShowExportDialog(true);
  };

  // Function to handle export after program selection
  const handleExport = async () => {
    setShowExportDialog(false);
    
    if (exportType === 'print') {
      const params = new URLSearchParams();
      if (exportProgramId) params.set('programId', exportProgramId.toString());
      window.open(`/print/trainees-grades?${params.toString()}`, '_blank');
    } else {
      // Fetch trainees for selected program or all
      try {
        const data = await getTraineesForGrades(1, 10000, undefined, exportProgramId);
        await exportAllGradesToExcel(data.data || []);
      } catch (error: any) {
        toast.error('حدث خطأ في تحميل البيانات');
      }
    }
  };

  // Function to open print view for all trainees
  const openPrintView = () => {
    openExportDialog('print');
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadTrainees();
  }, [page, selectedProgram]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/programs');
      setPrograms(data || []);
    } catch (error: any) {
      console.error('Error loading programs:', error);
    }
  };

  const loadTrainees = async () => {
    try {
      setLoading(true);
      const data = await getTraineesForGrades(page, limit, searchTerm, selectedProgram);
      setTrainees(data.data || []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error('Error loading trainees:', error);
      toast.error(error.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadTrainees();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading && trainees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="درجات المتدربين"
        description="عرض وإدارة درجات المتدربين في جميع المواد التدريبية"
      />

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <Button
          variant="success"
          onClick={() => openExportDialog('excel')}
          disabled={loading}
        >
          <TableCellsIcon className="w-4 h-4 ml-2" />
          تصدير إكسل
        </Button>
        <Button
          variant="outline"
          onClick={() => openExportDialog('print')}
          disabled={loading}
        >
          <PrinterIcon className="w-4 h-4 ml-2" />
          عرض للطباعة
        </Button>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowExportDialog(false)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">
                {exportType === 'excel' ? 'تصدير ملف إكسل' : 'عرض تقرير للطباعة'}
              </h3>
              <button onClick={() => setShowExportDialog(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 text-center">اختر البرنامج التدريبي</p>
              <TibaSelect
                instanceId="export-program-select"
                options={[
                  { value: '', label: 'جميع البرامج التدريبية' },
                  ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
                ]}
                value={exportProgramId ? String(exportProgramId) : ''}
                onChange={(val) => setExportProgramId(val ? parseInt(val) : undefined)}
                placeholder="جميع البرامج التدريبية"
              />
              <div className="flex gap-3 pt-2">
                <Button onClick={handleExport} className="flex-1">
                  {exportType === 'excel' ? (
                    <><TableCellsIcon className="w-4 h-4 ml-2" /> تصدير</>
                  ) : (
                    <><PrinterIcon className="w-4 h-4 ml-2" /> عرض</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowExportDialog(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">المتدربين</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{total}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">تم الإدخال</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">
                {trainees.filter(t => t._count.grades > 0).length}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">بالانتظار</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">
                {trainees.filter(t => t._count.grades === 0).length}
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
            بحث وتصفية
          </h3>
        </div>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
            <div className="md:col-span-7">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">البحث</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الرقم القومي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pr-10 pl-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">البرنامج</label>
              <TibaSelect
                instanceId="filter-program-select"
                options={[
                  { value: '', label: 'جميع البرامج' },
                  ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
                ]}
                value={selectedProgram ? String(selectedProgram) : ''}
                onChange={(val) => {
                  setSelectedProgram(val ? parseInt(val) : undefined);
                  setPage(1);
                }}
                placeholder="جميع البرامج"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleSearch} disabled={loading} fullWidth>
                <MagnifyingGlassIcon className="w-4 h-4 ml-1" />
                بحث
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Trainees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {trainees.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">لا توجد نتائج</h3>
            <p className="text-sm text-slate-500">جرب تغيير معايير البحث أو الفلتر</p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {trainees.map((trainee) => (
                <div
                  key={trainee.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/grades/${trainee.id}`)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {trainee.photoUrl ? (
                      <Image
                        src={trainee.photoUrl}
                        alt={trainee.nameAr}
                        width={48}
                        height={48}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm mb-0.5">{trainee.nameAr}</p>
                      <p className="text-xs text-slate-500">{trainee.nationalId}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{trainee.program.nameAr}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{trainee.program._count.trainingContents}</p>
                      <p className="text-[10px] text-slate-500">مادة</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/grades/${trainee.id}`);
                    }}
                  >
                    إدارة الدرجات
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-right py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">المتدرب</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">الرقم القومي</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">البرنامج</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">عدد المواد</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trainees.map((trainee) => (
                    <tr
                      key={trainee.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/grades/${trainee.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {trainee.photoUrl ? (
                            <Image
                              src={trainee.photoUrl}
                              alt={trainee.nameAr}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <p className="font-medium text-slate-800 text-sm">{trainee.nameAr}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-slate-600">{trainee.nationalId}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-slate-600">{trainee.program.nameAr}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                          {trainee.program._count.trainingContents}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/grades/${trainee.id}`);
                          }}
                        >
                          إدارة الدرجات
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 px-4 md:px-5 py-4">
                <div className="text-xs text-slate-500 text-center mb-3">
                  عرض <span className="font-semibold text-slate-700">{((page - 1) * limit) + 1}</span> إلى{' '}
                  <span className="font-semibold text-slate-700">{Math.min(page * limit, total)}</span> من{' '}
                  <span className="font-semibold text-slate-700">{total}</span> متدرب
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                    <span className="hidden md:inline">السابق</span>
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="min-w-[32px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    <span className="hidden md:inline">التالي</span>
                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
