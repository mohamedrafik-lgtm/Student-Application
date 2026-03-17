'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAPI } from '@/lib/api';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';

import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import PageHeader from '@/app/components/PageHeader';
import { SimpleSelect } from '@/app/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { TraineeAvatar } from '@/components/ui/trainee-avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon,
  PrinterIcon,
  CheckIcon,
  XMarkIcon,
  UsersIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Trainee {
  id: number;
  nameAr: string;
  nameEn?: string;
  nationalId?: string;
  phone?: string;
  photoUrl?: string;
  program?: {
    id: number;
    nameAr: string;
  };
}

interface Program {
  id: number;
  nameAr: string;
}

export default function BulkPrintPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  
  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('');
  
  // pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50, // عدد أكبر للطباعة الجماعية
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // refs لتجنب race conditions
  const isLoadingRef = useRef(false);
  const currentRequestRef = useRef<AbortController | null>(null);
  const targetPageRef = useRef(pagination.currentPage);

  // تعريف دالة تحميل المتدربين أولاً
  const loadTrainees = useCallback(async (page = pagination.currentPage) => {
    // منع التحميل المتزامن
    if (isLoadingRef.current) {
      return;
    }

    // إلغاء الطلب السابق إن وجد
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // إنشاء مُتحكم جديد للطلب
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (programFilter) params.append('programId', programFilter);

      const response = await fetchAPI(`/id-cards/trainees-with-status?${params}`, {
        signal: abortController.signal
      });
      
      // التحقق من أن الطلب لم يتم إلغاؤه
      if (abortController.signal.aborted) {
        return;
      }
      
      setTrainees(response.data || []);
      
      // تحديث pagination مع الحفاظ على الصفحة الحالية
      setPagination(prev => ({
        ...response.pagination,
        currentPage: targetPageRef.current // استخدام الصفحة المستهدفة
      }));
      
      // تحديث targetPageRef للمرة القادمة
      targetPageRef.current = page;
      
      // تحديد جميع المتدربين بشكل افتراضي فقط في التحميل الأول
      if (page === 1 && !searchTerm && !programFilter && selectedTrainees.length === 0) {
        setSelectedTrainees(response.data?.map((t: Trainee) => t.id) || []);
      }
    } catch (error: any) {
      // تجاهل أخطاء الإلغاء
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error loading trainees:', error);
      toast.error('حدث خطأ في تحميل المتدربين');
      setTrainees([]);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      currentRequestRef.current = null;
    }
  }, [pagination.currentPage, pagination.itemsPerPage, searchTerm, programFilter, selectedTrainees.length]);

  const loadInitialData = async () => {
    try {
      const [programsResponse, settingsResponse] = await Promise.all([
        fetchAPI('/programs'),
        fetchAPI('/settings')
      ]);
      
      setPrograms(programsResponse || []);
      setSettings(settingsResponse.settings);
      // تحميل البيانات الأولية للمتدربين
      await loadTrainees(1);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('حدث خطأ في تحميل البيانات الأولية');
    } finally {
      setInitialLoading(false);
    }
  };

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
    
    // cleanup function
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  // تحميل المتدربين عند تغيير الفلاتر مع debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // إعادة تعيين الصفحة إلى 1 عند تغيير الفلاتر
      if (searchTerm || programFilter) {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        loadTrainees(1);
      } else if (!initialLoading) {
        // تحميل الصفحة الحالية فقط إذا لم يكن هناك فلاتر ولم نكن في التحميل الأولي
        loadTrainees(pagination.currentPage);
      }
    }, 500); // تأخير 500ms للبحث

    return () => clearTimeout(timeoutId);
  }, [searchTerm, programFilter, loadTrainees, pagination.currentPage, initialLoading]);

  const handleSelectAll = () => {
    if (selectedTrainees.length === trainees.length) {
      setSelectedTrainees([]);
    } else {
      setSelectedTrainees(trainees.map(t => t.id));
    }
  };

  const handleSelectTrainee = (traineeId: number) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId)
        ? prev.filter(id => id !== traineeId)
        : [...prev, traineeId]
    );
  };

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage && !isLoadingRef.current) {
      targetPageRef.current = newPage;
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      // تحميل البيانات مباشرة
      loadTrainees(newPage);
    }
  }, [pagination.totalPages, pagination.currentPage, loadTrainees]);

  const handleSearch = () => {
    // إعادة تعيين الصفحة إلى 1 عند البحث الجديد
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    // تحميل البيانات فوراً
    setTimeout(() => loadTrainees(1), 100);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setProgramFilter('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    // تحميل البيانات بعد إعادة تعيين الفلاتر
    setTimeout(() => loadTrainees(1), 100);
  };

  const handleBulkPrint = async () => {
    if (selectedTrainees.length === 0) {
      toast.error('يرجى اختيار متدربين للطباعة');
      return;
    }

    try {
      // تسجيل الطباعة الجماعية لجميع المتدربين المحددين
      const printPromises = selectedTrainees.map(async (traineeId) => {
        try {
          // تحميل التصميم المناسب لكل متدرب
          const design = await idCardDesignsAPI.getDesignForTrainee(traineeId);
          
          // تسجيل الطباعة
          await fetchAPI('/id-cards/print', {
            method: 'POST',
            body: JSON.stringify({
              traineeId,
              designId: design.id
            }),
          });
          
          return { success: true, traineeId };
        } catch (error) {
          console.error(`Error registering print for trainee ${traineeId}:`, error);
          return { success: false, traineeId };
        }
      });

      // انتظار تسجيل جميع عمليات الطباعة
      const results = await Promise.all(printPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        toast.success(`تم تسجيل طباعة ${successful} كارنيه بنجاح${failed > 0 ? ` (${failed} فشل)` : ''}`);
        
        // إعادة تحميل البيانات لتحديث الحالات
        await loadTrainees(pagination.currentPage);
      }

      if (failed === selectedTrainees.length) {
        toast.error('فشل تسجيل عمليات الطباعة');
        return;
      }

      // فتح صفحة الطباعة مع المتدربين المحددين
      const traineeIds = selectedTrainees.join(',');
      const printUrl = `/print/id-cards/bulk?traineeIds=${traineeIds}`;
      window.open(printUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
    } catch (error) {
      console.error('Error in bulk print:', error);
      toast.error('حدث خطأ أثناء تسجيل عمليات الطباعة');
    }
  };

  // شاشة التحميل الأولية
  if (initialLoading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.id-cards', action: 'manage' }}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-tiba-primary border-t-transparent" />
            <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  // Program options for SimpleSelect
  const programOptions = [
    { value: '', label: 'جميع البرامج' },
    ...programs.map((p) => ({ value: p.id.toString(), label: p.nameAr })),
  ];

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.id-cards', action: 'manage' }}>
      <div className="space-y-6">
        <PageHeader
          title="الطباعة الجماعية للكارنيهات"
          description="اختر المتدربين المراد طباعة كارنيهاتهم بشكل جماعي"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'إدارة المتدربين', href: '/dashboard/trainees' },
            { label: 'إدارة الكارنيهات', href: '/dashboard/trainees/id-cards' },
            { label: 'الطباعة الجماعية' }
          ]}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50">
                  <UsersIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">إجمالي المتدربين</p>
                  <p className="text-xl font-bold text-slate-800">{pagination.totalItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">محدد للطباعة</p>
                  <p className="text-xl font-bold text-slate-800">{selectedTrainees.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50">
                  <DocumentTextIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">صفحات الطباعة</p>
                  <p className="text-xl font-bold text-slate-800">{Math.ceil(selectedTrainees.length / 10)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* أدوات البحث والفلترة + الجدول */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="البحث بالاسم أو الرقم القومي..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pr-10 pl-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-tiba-primary/20 focus:border-tiba-primary outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
                
                <div className="lg:w-64">
                  <SimpleSelect
                    options={programOptions}
                    value={programFilter}
                    onChange={(val) => setProgramFilter(val)}
                    placeholder="جميع البرامج"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center justify-center p-2.5 rounded-lg bg-tiba-primary text-white hover:bg-tiba-primary/90 transition-colors"
                    title="بحث"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center justify-center p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    title="إعادة تعيين"
                  >
                    <FunnelIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => loadTrainees(pagination.currentPage)}
                    disabled={loading || isLoadingRef.current}
                    className="inline-flex items-center justify-center p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    title="تحديث البيانات"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${(loading || isLoadingRef.current) ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-tiba-primary text-white hover:bg-tiba-primary/90 transition-colors"
                  >
                    {selectedTrainees.length === trainees.length 
                      ? <XMarkIcon className="h-4 w-4" /> 
                      : <CheckIcon className="h-4 w-4" />
                    }
                    {selectedTrainees.length === trainees.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                  
                  <span className="text-xs text-slate-500">
                    تم تحديد <span className="font-semibold text-slate-700">{selectedTrainees.length}</span> من {trainees.length} متدرب
                  </span>
                </div>

                <button
                  onClick={handleBulkPrint}
                  disabled={selectedTrainees.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PrinterIcon className="h-4 w-4" />
                  طباعة المحدد ({selectedTrainees.length})
                </button>
              </div>
            </div>

            {/* جدول المتدربين */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-right">
                      <Checkbox
                        checked={selectedTrainees.length === trainees.length && trainees.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="h-[18px] w-[18px] rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      المتدرب
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      البرنامج
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      الرقم القومي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-tiba-primary border-t-transparent" />
                          <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
                        </div>
                      </td>
                    </tr>
                  ) : trainees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <UsersIcon className="h-10 w-10 text-slate-300" />
                          <p className="text-sm font-medium text-slate-400">لا توجد نتائج</p>
                          <p className="text-xs text-slate-400">جرب تغيير معايير البحث</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    trainees.map((trainee) => (
                      <tr 
                        key={trainee.id} 
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          selectedTrainees.includes(trainee.id) ? 'bg-tiba-primary/[0.03]' : ''
                        }`}
                        onClick={() => handleSelectTrainee(trainee.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTrainees.includes(trainee.id)}
                            onCheckedChange={() => handleSelectTrainee(trainee.id)}
                            className="h-[18px] w-[18px] rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TraineeAvatar
                              photoUrl={trainee.photoUrl}
                              name={trainee.nameAr}
                              size="sm"
                              showZoomHint={false}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {trainee.nameAr}
                              </p>
                              {trainee.phone && (
                                <p className="text-xs text-slate-500">{trainee.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {trainee.program?.nameAr || 'غير محدد'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 font-mono">
                            {trainee.nationalId || 'غير محدد'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  pagination={{
                    page: pagination.currentPage,
                    limit: pagination.itemsPerPage,
                    total: pagination.totalItems,
                    totalPages: pagination.totalPages,
                    hasNext: pagination.hasNextPage,
                    hasPrev: pagination.hasPreviousPage,
                  }}
                  onPageChange={handlePageChange}
                  isLoading={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
