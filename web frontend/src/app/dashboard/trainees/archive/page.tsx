'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocumentsCompletionStats } from '@/app/lib/api/trainee-documents';
import { getAllPrograms } from '@/app/lib/api/programs';
import { downloadFile } from '@/lib/api';
import {
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect, SimpleSelect } from '@/app/components/ui/Select';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { TibaModal } from '@/components/ui/tiba-modal';
import { TraineeAvatar, TraineePhotoLightbox } from '@/components/ui/trainee-avatar';

function TraineesArchivePageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    programId: '',
    completionStatus: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedProgramForPrint, setSelectedProgramForPrint] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{photoUrl: string; name: string; nationalId: string} | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const downloadingRef = useRef<Set<number>>(new Set());

  const fetchStats = async (page = 1, customLimit?: number) => {
    try {
      setLoading(true);
      
      const filterParams = {
        page,
        limit: customLimit || pagination.limit,
        search: searchQuery || undefined
      };
      
      if (filters.programId) filterParams.programId = parseInt(filters.programId);
      if (filters.completionStatus) filterParams.completionStatus = filters.completionStatus;
      
      const data = await getDocumentsCompletionStats(filterParams);
      setStats(data);
      
      // تحديث بيانات pagination
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأرشيف:', error);
      // في حالة الخطأ، استخدم بيانات محاكاة
      setStats({
        overallStats: {
          totalTrainees: 0,
          completeTrainees: 0,
          incompleteTrainees: 0,
          averageCompletion: 0
        },
        traineeStats: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const data = await getAllPrograms();
      setPrograms(data || []);
    } catch (err) {
      console.error('خطأ في جلب البرامج:', err);
      setPrograms([]);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchStats(1);
  }, []);

  useEffect(() => {
    fetchStats(1); // عند تغيير الفلاتر، ارجع للصفحة الأولى
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      programId: '',
      completionStatus: ''
    });
    setSearchQuery('');
  };

  const handlePageChange = (newPage) => {
    fetchStats(newPage);
  };

  const handleLimitChange = (newLimit) => {
    const newLimitNum = parseInt(newLimit);
    setPagination(prev => ({ ...prev, limit: newLimitNum, page: 1 }));
    fetchStats(1, newLimitNum); // تمرير الـ limit الجديد مباشرة
  };

  const handleSearch = () => {
    fetchStats(1); // ابحث وارجع للصفحة الأولى
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="أرشيف المتدربين" description="إدارة ومتابعة وثائق المتدربين وحالة الإكمال" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربين', href: '/dashboard/trainees' }, { label: 'الأرشيف' }]} />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-tiba-primary-200 border-t-tiba-primary-600 rounded-full"></div>
            <p className="text-sm text-slate-500">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <PageHeader title="أرشيف المتدربين" description="إدارة ومتابعة وثائق المتدربين وحالة الإكمال" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربين', href: '/dashboard/trainees' }, { label: 'الأرشيف' }]} />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">لا توجد بيانات متاحة</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm">
            لم نتمكن من العثور على أي بيانات أرشيف. تأكد من وجود متدربين مسجلين في النظام.
          </p>
          <Button
            onClick={() => router.push('/dashboard/trainees')}
            className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white text-sm"
          >
            إدارة المتدربين
          </Button>
        </div>
      </div>
    );
  }

  const handlePrintReport = () => {
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    // بناء رابط الطباعة مع الفلاتر
    const params = new URLSearchParams();
    
    if (selectedProgramForPrint) {
      params.append('programId', selectedProgramForPrint);
    }
    
    if (filters.completionStatus) {
      params.append('completionStatus', filters.completionStatus);
    }
    
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    
    const printUrl = `/print/trainees-archive?${params.toString()}`;
    window.open(printUrl, '_blank');
    setShowPrintModal(false);
    setSelectedProgramForPrint('');
  };

  const handleCancelPrint = () => {
    setShowPrintModal(false);
    setSelectedProgramForPrint('');
  };

  const handleDownloadArchive = async (traineeId: number, traineeName: string) => {
    // استخدام ref للتحقق من التحميل الجاري (لا يعاني من stale closure)
    if (downloadingRef.current.has(traineeId)) return;
    
    downloadingRef.current.add(traineeId);
    setDownloadingIds(new Set(downloadingRef.current));
    
    try {
      const blob = await downloadFile(`/trainees/${traineeId}/documents/download-archive`);

      if (!blob || blob.size === 0) {
        throw new Error('الملف فارغ أو لم يتم استلامه');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${traineeName}_${traineeId}.zip`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
      
      toast.success(`تم تحميل أرشيف ${traineeName} بنجاح`);
    } catch (error: any) {
      console.error('خطأ في تحميل الأرشيف:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحميل الأرشيف');
    } finally {
      downloadingRef.current.delete(traineeId);
      setDownloadingIds(new Set(downloadingRef.current));
    }
  };

  return (
    <div>
      <PageHeader
        title="أرشيف المتدربين"
        description="إدارة ومتابعة وثائق المتدربين وحالة الإكمال"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'الأرشيف' },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => router.push('/dashboard/trainees/archive/bulk-download')}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
            >
              تحميل جماعي
            </Button>
            <Button
              onClick={handlePrintReport}
              leftIcon={<PrinterIcon className="w-4 h-4" />}
              className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white text-sm px-4 py-3 sm:py-2 w-full sm:w-auto justify-center"
            >
              طباعة تقرير
            </Button>
          </div>
        }
      />

      {/* ── بطاقات الإحصائيات ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* إجمالي المتدربين */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">إجمالي المتدربين</span>
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-tiba-primary-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.overallStats.totalTrainees}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {Object.values(filters).some(v => v !== '') || searchQuery ? 'حسب الفلاتر' : 'جميع المتدربين'}
          </p>
        </div>

        {/* مكتملة الوثائق */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">مكتملة الوثائق</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.overallStats.completeTrainees}</div>
          <p className="text-[11px] text-slate-400 mt-1">أكملوا جميع الوثائق</p>
        </div>

        {/* ناقصة الوثائق */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">ناقصة الوثائق</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.overallStats.incompleteTrainees}</div>
          <p className="text-[11px] text-slate-400 mt-1">لم يكملوا الوثائق</p>
        </div>

        {/* متوسط الإكمال */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">متوسط الإكمال</span>
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-50 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-tiba-primary-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.overallStats.averageCompletion}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-tiba-primary-500 h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${stats.overallStats.averageCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── البحث والفلاتر ── */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 space-y-3">
        {/* شريط البحث */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث في أسماء المتدربين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full h-11 ps-9 pe-9 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); fetchStats(1); }}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            leftIcon={loading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
            className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white text-sm h-11 px-5"
          >
            بحث
          </Button>
        </div>

        {/* مؤشر البحث النشط */}
        {searchQuery && (
          <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-tiba-primary-600" />
                <span className="text-sm font-medium text-tiba-primary-800">
                  البحث: &quot;{searchQuery}&quot; — وجد {pagination.total} نتيجة
                </span>
              </div>
              <button
                onClick={() => { setSearchQuery(''); clearFilters(); fetchStats(1); }}
                className="text-tiba-primary-600 hover:text-tiba-primary-800 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* الفلاتر */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            options={[
              { value: '', label: 'جميع البرامج' },
              ...programs.map(p => ({ value: p.id.toString(), label: p.nameAr }))
            ]}
            value={filters.programId}
            onChange={(value) => handleFilterChange('programId', value)}
            placeholder="البرنامج التدريبي"
            instanceId="archive-program-filter"
          />
          <SimpleSelect
            options={[
              { value: '', label: 'جميع الحالات' },
              { value: 'complete', label: 'مكتمل (100%)' },
              { value: 'high', label: 'ممتاز (80%+)' },
              { value: 'medium', label: 'متوسط (50-79%)' },
              { value: 'low', label: 'ضعيف (أقل من 50%)' },
              { value: 'incomplete', label: 'غير مكتمل' },
            ]}
            value={filters.completionStatus}
            onChange={(value) => handleFilterChange('completionStatus', value)}
            instanceId="archive-status-filter"
          />
        </div>

        {/* زر مسح الفلاتر */}
        {(Object.values(filters).some(v => v !== '') || searchQuery) && (
          <div className="flex justify-center pt-1">
            <Button
              onClick={() => { clearFilters(); fetchStats(1); }}
              variant="outline"
              size="sm"
              className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
              leftIcon={<XMarkIcon className="w-3.5 h-3.5" />}
            >
              مسح جميع الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* ── جدول المتدربين ── */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {!stats.traineeStats || stats.traineeStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchQuery || Object.values(filters).some(v => v !== '')
                ? <MagnifyingGlassIcon className="w-7 h-7 text-slate-400" />
                : <DocumentTextIcon className="w-7 h-7 text-slate-400" />
              }
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              {searchQuery || Object.values(filters).some(v => v !== '') ? 'لا توجد نتائج' : 'لا توجد بيانات'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery || Object.values(filters).some(v => v !== '')
                ? 'لم نجد أي متدربين يطابقون معايير البحث'
                : 'لا توجد بيانات متدربين متاحة حالياً'}
            </p>
            <Button
              onClick={() => {
                if (searchQuery || Object.values(filters).some(v => v !== '')) {
                  clearFilters();
                  setSearchQuery('');
                  fetchStats(1);
                } else {
                  router.push('/dashboard/trainees');
                }
              }}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              {searchQuery || Object.values(filters).some(v => v !== '') ? 'مسح الفلاتر' : 'إدارة المتدربين'}
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">المتدرب</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-3 px-4">البرنامج</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">المطلوبة</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">الإجمالي</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">المحققة</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">الإكمال</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">الحالة</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-3 px-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.traineeStats.map((trainee) => (
                    <tr key={trainee.traineeId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <TraineeAvatar
                            photoUrl={trainee.photoUrl}
                            name={trainee.traineeName}
                            size="sm"
                            onOpenPhoto={(photoUrl, name) => {
                              setSelectedPhoto({ photoUrl, name, nationalId: '' });
                              setShowPhotoModal(true);
                            }}
                          />
                          <span className="text-sm font-medium text-slate-900">{trainee.traineeName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                          {trainee.programName}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold text-tiba-primary-700">{trainee.requiredDocuments}/4</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm text-slate-700">{trainee.totalDocuments}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-semibold text-emerald-700">{trainee.verifiedDocuments}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                trainee.completionPercentage >= 80 ? 'bg-emerald-500' :
                                trainee.completionPercentage >= 50 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${trainee.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{trainee.completionPercentage}%</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {trainee.isComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircleIcon className="w-3 h-3" /> مكتمل
                          </span>
                        ) : trainee.completionPercentage >= 80 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            ممتاز
                          </span>
                        ) : trainee.completionPercentage >= 50 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            متوسط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                            ضعيف
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => router.push(`/dashboard/trainees/${trainee.traineeId}/archive`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-tiba-primary-700 bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg hover:bg-tiba-primary-100 transition-colors"
                            title="عرض تفاصيل الأرشيف"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            عرض
                          </button>
                          <button
                            onClick={() => handleDownloadArchive(trainee.traineeId, trainee.traineeName)}
                            disabled={downloadingIds.has(trainee.traineeId)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              downloadingIds.has(trainee.traineeId)
                                ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-wait'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="تحميل أرشيف الوثائق (ZIP)"
                          >
                            {downloadingIds.has(trainee.traineeId) ? (
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            )}
                            {downloadingIds.has(trainee.traineeId) ? 'جاري...' : 'تحميل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {stats.traineeStats.map((trainee) => (
                <div key={trainee.traineeId} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TraineeAvatar
                        photoUrl={trainee.photoUrl}
                        name={trainee.traineeName}
                        size="sm"
                        onOpenPhoto={(photoUrl, name) => {
                          setSelectedPhoto({ photoUrl, name, nationalId: '' });
                          setShowPhotoModal(true);
                        }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{trainee.traineeName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{trainee.programName}</div>
                      </div>
                    </div>
                    {trainee.isComplete ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">مكتمل</span>
                    ) : trainee.completionPercentage >= 80 ? (
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">ممتاز</span>
                    ) : trainee.completionPercentage >= 50 ? (
                      <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">متوسط</span>
                    ) : (
                      <span className="text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">ضعيف</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          trainee.completionPercentage >= 80 ? 'bg-emerald-500' :
                          trainee.completionPercentage >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${trainee.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 min-w-[36px] text-left">{trainee.completionPercentage}%</span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>المطلوبة: <strong className="text-slate-700">{trainee.requiredDocuments}/4</strong></span>
                    <span>الإجمالي: <strong className="text-slate-700">{trainee.totalDocuments}</strong></span>
                    <span>المحققة: <strong className="text-emerald-700">{trainee.verifiedDocuments}</strong></span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => router.push(`/dashboard/trainees/${trainee.traineeId}/archive`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-tiba-primary-700 bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg active:bg-tiba-primary-100 transition-colors"
                    >
                      <EyeIcon className="w-4 h-4" />
                      عرض الأرشيف
                    </button>
                    <button
                      onClick={() => handleDownloadArchive(trainee.traineeId, trainee.traineeName)}
                      disabled={downloadingIds.has(trainee.traineeId)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                        downloadingIds.has(trainee.traineeId)
                          ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-wait'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 active:bg-emerald-100'
                      }`}
                    >
                      {downloadingIds.has(trainee.traineeId) ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      )}
                      {downloadingIds.has(trainee.traineeId) ? 'جاري التحميل...' : 'تحميل'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-100">
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={(newLimit) => handleLimitChange(String(newLimit))}
                isLoading={loading}
                showLimitSelector={true}
                limitOptions={[10, 20, 30, 50, 100]}
              />
            </div>
          </>
        )}
      </div>

      {/* لايت بوكس الصورة */}
      {showPhotoModal && selectedPhoto && (
        <TraineePhotoLightbox
          photoUrl={selectedPhoto.photoUrl}
          name={selectedPhoto.name}
          nationalId={selectedPhoto.nationalId}
          onClose={() => {
            setShowPhotoModal(false);
            setSelectedPhoto(null);
          }}
        />
      )}

      {/* ── مودال الطباعة ── */}
      <TibaModal
        open={showPrintModal}
        onClose={handleCancelPrint}
        title="طباعة التقرير"
        subtitle="اختر البرنامج المراد طباعة تقريره"
        variant="primary"
        size="sm"
        icon={<PrinterIcon className="w-5 h-5" />}
        bodyClassName="overflow-visible"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleConfirmPrint}
              leftIcon={<PrinterIcon className="w-4 h-4" />}
              className="flex-1 bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white"
            >
              طباعة
            </Button>
            <Button
              onClick={handleCancelPrint}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">البرنامج التدريبي</label>
          <SearchableSelect
            options={[
              { value: '', label: 'جميع البرامج' },
              ...programs.map(p => ({ value: p.id.toString(), label: p.nameAr }))
            ]}
            value={selectedProgramForPrint}
            onChange={(value) => setSelectedProgramForPrint(value)}
            placeholder="اختر البرنامج"
            instanceId="print-program-select"
          />
        </div>
      </TibaModal>
    </div>
  );
}

export default function TraineesArchivePage() {
  return (
    <PageGuard>
      <TraineesArchivePageContent />
    </PageGuard>
  );
}