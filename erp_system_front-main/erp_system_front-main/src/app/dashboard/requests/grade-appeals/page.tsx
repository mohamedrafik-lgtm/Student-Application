'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/app/components/PageHeader';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { RequirePermission } from '@/components/permissions/PermissionGate';
import {
  FiCheck,
  FiX,
  FiClock,
  FiFilter,
  FiUser,
  FiMessageSquare,
  FiSearch,
  FiXCircle,
  FiAlertCircle,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiToggleLeft,
  FiToggleRight,
  FiLock,
  FiUnlock,
  FiSettings,
  FiRefreshCw,
  FiAward,
} from 'react-icons/fi';
import { PermissionGate } from '@/components/permissions/PermissionGate';

type FilterStatus = '' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export default function GradeAppealsPage() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
  });
  const [expandedAppeal, setExpandedAppeal] = useState<string | null>(null);
  const [submittingSubject, setSubmittingSubject] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ subjectId: string; status: 'ACCEPTED' | 'REJECTED'; subjectName: string } | null>(null);
  const [appealsOpen, setAppealsOpen] = useState<boolean>(true);
  const [togglingAppeals, setTogglingAppeals] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // حالات إعادة المراجعة
  const [reReviewAppeal, setReReviewAppeal] = useState<any>(null);
  const [reReviewStage, setReReviewStage] = useState<'loading' | 'grading' | 'results' | 'saved'>('loading');
  const [reReviewData, setReReviewData] = useState<any>(null);
  const [reReviewVisibleSubjects, setReReviewVisibleSubjects] = useState<number>(0);

  const loadData = useCallback(async (pg = pagination.page, lim = pagination.limit, search = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      params.set('page', String(pg));
      params.set('limit', String(lim));

      const [appealsData, statsData, settingsData] = await Promise.all([
        fetchAPI(`/grade-appeals?${params.toString()}`),
        fetchAPI('/grade-appeals/stats'),
        fetchAPI('/grade-appeals/appeals-status'),
      ]);

      setAppeals(appealsData.data);
      setStats(statsData);
      setAppealsOpen(settingsData.acceptGradeAppeals ?? true);
      setPagination({
        page: appealsData.pagination.page,
        limit: appealsData.pagination.limit,
        total: appealsData.pagination.total,
        totalPages: appealsData.pagination.totalPages,
        hasNext: appealsData.pagination.page < appealsData.pagination.totalPages,
        hasPrev: appealsData.pagination.page > 1,
      });
    } catch (error: any) {
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    loadData(1, pagination.limit, searchQuery);
  }, [filterStatus]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    loadData(1, pagination.limit, searchInput);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    loadData(1, pagination.limit, '');
  };

  // إعادة مراجعة التظلم
  const handleReReview = async (appeal: any) => {
    setReReviewAppeal(appeal);
    setReReviewStage('loading');
    setReReviewData(null);
    setReReviewVisibleSubjects(0);

    try {
      // جلب بيانات الدرجات
      const data = await fetchAPI(`/grade-appeals/${appeal.id}/review-data`);
      setReReviewData(data);

      // مرحلة عرض المواد واحدة تلو الأخرى
      setReReviewStage('grading');
      const subjects = data.subjects || [];
      for (let i = 0; i < subjects.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        setReReviewVisibleSubjects(i + 1);
      }

      // انتظار لحظة قبل عرض النتائج
      await new Promise(resolve => setTimeout(resolve, 3000));
      setReReviewStage('results');

      // حفظ حالة المراجعة في قاعدة البيانات
      await new Promise(resolve => setTimeout(resolve, 2500));
      try {
        await fetchAPI(`/grade-appeals/${appeal.id}/mark-reviewed`, {
          method: 'PUT',
        });
      } catch (saveErr: any) {
        console.error('خطأ في حفظ حالة المراجعة:', saveErr);
      }
      setReReviewStage('saved');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إعادة المراجعة');
      setReReviewAppeal(null);
    }
  };

  const closeReReviewModal = () => {
    setReReviewAppeal(null);
    setReReviewData(null);
    loadData(pagination.page, pagination.limit, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    loadData(newPage, pagination.limit, searchQuery);
    document.querySelector('[data-appeals-container]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLimitChange = (newLimit: number) => {
    loadData(1, newLimit, searchQuery);
  };

  const handleToggleAppeals = async () => {
    try {
      setTogglingAppeals(true);
      const newStatus = !appealsOpen;
      await fetchAPI('/grade-appeals/toggle', {
        method: 'PATCH',
        body: JSON.stringify({ accept: newStatus }),
      });
      setAppealsOpen(newStatus);
      toast.success(newStatus ? 'تم فتح التظلمات بنجاح' : 'تم إغلاق التظلمات بنجاح');
    } catch (err: any) {
      toast.error('حدث خطأ في تغيير حالة التظلمات');
    } finally {
      setTogglingAppeals(false);
    }
  };

  // مراجعة مادة واحدة
  const handleReviewSubject = async (subjectId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setConfirmAction(null);
    try {
      setSubmittingSubject(subjectId);
      await fetchAPI(`/grade-appeals/subjects/${subjectId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success(
        status === 'ACCEPTED'
          ? 'تم قبول المادة بنجاح'
          : 'تم رفض المادة وتطبيق الرسوم (إن وُجدت)'
      );
      loadData(pagination.page, pagination.limit, searchQuery);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setSubmittingSubject(null);
    }
  };

  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'md') => {
    const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
    const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    switch (status) {
      case 'PENDING':
        return <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold`}><FiClock className={iconSize} /> قيد المراجعة</span>;
      case 'ACCEPTED':
        return <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold`}><FiCheck className={iconSize} /> مقبول</span>;
      case 'REJECTED':
        return <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold`}><FiX className={iconSize} /> مرفوض</span>;
      default:
        return null;
    }
  };

  // حساب حالة التظلم من حالات المواد
  const getAppealDisplayStatus = (appeal: any) => {
    const subjects = appeal.subjects || [];
    const allPending = subjects.every((s: any) => s.status === 'PENDING');
    const allAccepted = subjects.every((s: any) => s.status === 'ACCEPTED');
    const allRejected = subjects.every((s: any) => s.status === 'REJECTED');
    const hasPending = subjects.some((s: any) => s.status === 'PENDING');

    if (allPending) return { label: 'قيد المراجعة', color: 'amber', icon: <FiClock className="w-3 h-3" /> };
    if (allAccepted) return { label: 'مقبول بالكامل', color: 'emerald', icon: <FiCheck className="w-3 h-3" /> };
    if (allRejected) return { label: 'مرفوض بالكامل', color: 'red', icon: <FiX className="w-3 h-3" /> };
    if (hasPending) return { label: 'مراجعة جزئية', color: 'blue', icon: <FiClock className="w-3 h-3" /> };
    return { label: 'مراجعة مكتملة', color: 'teal', icon: <FiCheck className="w-3 h-3" /> };
  };

  const renderAppealStatusBadge = (appeal: any) => {
    const info = getAppealDisplayStatus(appeal);
    const colorMap: Record<string, string> = {
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      teal: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${colorMap[info.color]} border rounded-lg text-xs font-semibold`}>
        {info.icon} {info.label}
      </span>
    );
  };

  // عدد المواد حسب الحالة
  const getSubjectCounts = (subjects: any[]) => {
    return {
      pending: subjects.filter(s => s.status === 'PENDING').length,
      accepted: subjects.filter(s => s.status === 'ACCEPTED').length,
      rejected: subjects.filter(s => s.status === 'REJECTED').length,
    };
  };

  const statusFilters: { value: FilterStatus; label: string; icon: React.ReactNode; color: string; count?: number }[] = [
    { value: '', label: 'الكل', icon: <FiFileText className="w-3.5 h-3.5" />, color: 'tiba', count: stats?.total },
    { value: 'PENDING', label: 'قيد المراجعة', icon: <FiClock className="w-3.5 h-3.5" />, color: 'amber', count: stats?.pending },
    { value: 'ACCEPTED', label: 'مقبول', icon: <FiCheck className="w-3.5 h-3.5" />, color: 'emerald', count: stats?.accepted },
    { value: 'REJECTED', label: 'مرفوض', icon: <FiX className="w-3.5 h-3.5" />, color: 'red', count: stats?.rejected },
  ];

  const getFilterClasses = (color: string, active: boolean) => {
    if (!active) return 'text-slate-500 hover:bg-slate-100 border border-transparent';
    return 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200 shadow-sm';
  };

  return (
    <RequirePermission resource="dashboard.grade-appeals" action="view">
      <div className="space-y-5 sm:space-y-6">
        {/* Tiba Gradient Header */}
        <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
          </div>
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <FiAward className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">إدارة التظلمات</h1>
                  <p className="text-white/70 text-sm mt-0.5">إدارة ومراجعة تظلمات المتدربين على الدرجات</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  appealsOpen
                    ? 'bg-emerald-50/20 border-white/30 text-white'
                    : 'bg-red-50/20 border-white/30 text-white'
                }`}>
                  {appealsOpen ? <FiUnlock className="w-3.5 h-3.5" /> : <FiLock className="w-3.5 h-3.5" />}
                  {appealsOpen ? 'التظلمات مفتوحة' : 'التظلمات مغلقة'}
                </span>
                <PermissionGate resource="dashboard.grade-appeals" action="settings">
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all cursor-pointer"
                  >
                    <FiSettings className="w-3.5 h-3.5" />
                    الإعدادات
                  </button>
                </PermissionGate>
              </div>
            </div>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-white/70 text-[11px] mt-0.5">إجمالي التظلمات</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-white/70 text-[11px] mt-0.5">قيد المراجعة</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                  <p className="text-white/70 text-[11px] mt-0.5">مقبولة</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-white/70 text-[11px] mt-0.5">مرفوضة</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-tiba-primary-100 rounded-lg flex items-center justify-center">
                    <FiSettings className="w-4 h-4 text-tiba-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-sm">إعدادات التظلمات</h3>
                    <p className="text-slate-400 text-[11px]">التحكم في قبول التظلمات من المتدربين</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* الحالة الحالية */}
                <div className={`rounded-xl p-3.5 flex items-center gap-3 border ${
                  appealsOpen
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    appealsOpen ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    {appealsOpen ? <FiUnlock className="w-5 h-5 text-white" /> : <FiLock className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-xs ${appealsOpen ? 'text-emerald-800' : 'text-red-800'}`}>
                      الحالة الحالية: {appealsOpen ? 'مفتوحة' : 'مغلقة'}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${appealsOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                      {appealsOpen
                        ? 'يمكن للمتدربين تقديم تظلمات جديدة من المنصة'
                        : 'لا يمكن للمتدربين تقديم تظلمات جديدة حالياً'}
                    </p>
                  </div>
                </div>

                {/* معلومات */}
                <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-xl p-3">
                  <p className="text-[11px] text-tiba-primary-800 leading-relaxed">
                    <span className="font-bold">📌 ملاحظة:</span> عند إغلاق باب التظلمات، لن يتمكن المتدربون من تقديم تظلمات جديدة. التظلمات الموجودة حالياً لن تتأثر ويمكنك الاستمرار في مراجعتها.
                  </p>
                </div>

                {/* زر التغيير */}
                <button
                  onClick={async () => {
                    await handleToggleAppeals();
                    setShowSettingsModal(false);
                  }}
                  disabled={togglingAppeals}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    appealsOpen
                      ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white'
                  } ${togglingAppeals ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {togglingAppeals ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : appealsOpen ? (
                    <FiLock className="w-4 h-4" />
                  ) : (
                    <FiUnlock className="w-4 h-4" />
                  )}
                  {appealsOpen ? 'إغلاق باب التظلمات' : 'فتح باب التظلمات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* تنبيه حالة التظلمات */}
        {!appealsOpen && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
            <FiLock className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-semibold text-xs">التظلمات مغلقة حالياً</p>
              <p className="text-red-600 text-[11px] mt-0.5">لن يتمكن المتدربون من تقديم تظلمات جديدة من منصة المتدربين.</p>
            </div>
          </div>
        )}

        {/* البحث والفلاتر */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-100 flex items-center justify-center">
              <FiSearch className="w-4 h-4 text-tiba-primary-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">بحث وتصفية</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="بحث بالاسم، الرقم القومي، أو الهاتف..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full pr-4 pl-4 h-11 text-sm border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-tiba-primary-300 focus:ring-tiba-primary-100"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-11 px-5 bg-gradient-to-r from-tiba-primary-600 to-indigo-600 hover:from-tiba-primary-700 hover:to-indigo-700 text-white rounded-xl shadow-sm"
              >
                <FiSearch className="w-4 h-4 ml-2" />
                بحث
              </Button>
              {(searchInput || searchQuery) && (
                <Button onClick={handleClearSearch} variant="outline" className="h-11 px-4 rounded-xl border-slate-200">
                  <FiXCircle className="w-4 h-4 ml-1" />
                  مسح
                </Button>
              )}
            </div>

            {searchQuery && (
              <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-tiba-primary-800">
                  <FiSearch className="w-3.5 h-3.5 inline ml-1" />
                  البحث النشط: &quot;{searchQuery}&quot; — وُجد <span className="font-bold">{pagination.total}</span> نتيجة
                </span>
                <button onClick={handleClearSearch} className="text-tiba-primary-600 hover:text-tiba-primary-800 text-xs font-semibold">مسح البحث</button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <FiFilter className="text-slate-400 w-4 h-4" />
              {statusFilters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => { setFilterStatus(filter.value); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${getFilterClasses(filter.color, filterStatus === filter.value)}`}
                >
                  {filter.icon}
                  {filter.label}
                  {filter.count !== undefined && (
                    <span className={`mr-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${filterStatus === filter.value ? 'bg-tiba-primary-100 text-tiba-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* قائمة التظلمات */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" data-appeals-container>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 bg-tiba-primary-50 px-5 py-4 rounded-xl border border-tiba-primary-200">
                <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-tiba-primary-200 border-t-tiba-primary-600"></div>
                <span className="text-tiba-primary-700 font-medium text-sm">جاري تحميل التظلمات...</span>
              </div>
            </div>
          ) : appeals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiAlertCircle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-sm mb-1">لا توجد تظلمات</p>
              <p className="text-xs text-slate-400">
                {searchQuery ? `لم يتم العثور على نتائج تطابق "${searchQuery}"` : filterStatus ? 'لا توجد تظلمات بهذه الحالة' : 'لم يتم تقديم أي تظلمات بعد'}
              </p>
              {(searchQuery || filterStatus) && (
                <Button onClick={() => { handleClearSearch(); setFilterStatus(''); }} variant="outline" size="sm" className="mt-4">
                  مسح الفلاتر وعرض الكل
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {appeals.map((appeal: any) => {
                  const isExpanded = expandedAppeal === appeal.id;
                  const counts = getSubjectCounts(appeal.subjects);
                  const hasPendingSubjects = counts.pending > 0;

                  return (
                    <div key={appeal.id} className="transition-colors">
                      {/* صف التظلم الرئيسي */}
                      <button
                        onClick={() => setExpandedAppeal(isExpanded ? null : appeal.id)}
                        className="w-full text-right hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5">
                          {/* أيقونة التوسيع */}
                          <div className="flex-shrink-0 text-slate-400">
                            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </div>

                          {/* أفاتار */}
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-tiba-primary-100">
                            {appeal.trainee.photoUrl ? (
                              <Image
                                src={getImageUrl(appeal.trainee.photoUrl)}
                                alt={appeal.trainee.nameAr}
                                fill
                                style={{ objectFit: 'cover' }}
                                loading="lazy"
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-tiba-primary-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                                {appeal.trainee.nameAr?.charAt(0) || 'م'}
                              </div>
                            )}
                          </div>

                          {/* معلومات المتدرب */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 truncate">{appeal.trainee.nameAr}</p>
                              <span className="text-[11px] text-slate-400 hidden sm:inline">({appeal.trainee.nationalId})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">{appeal.trainee.program?.nameAr}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-400">
                                {appeal.subjects.length} {appeal.subjects.length === 1 ? 'مادة' : appeal.subjects.length === 2 ? 'مادتان' : 'مواد'}
                              </span>
                            </div>
                          </div>

                          {/* عدادات المواد */}
                          <div className="hidden md:flex items-center gap-1.5">
                            {counts.pending > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded text-[10px] font-bold">
                                <FiClock className="w-2.5 h-2.5" /> {counts.pending}
                              </span>
                            )}
                            {counts.accepted > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-[10px] font-bold">
                                <FiCheck className="w-2.5 h-2.5" /> {counts.accepted}
                              </span>
                            )}
                            {counts.rejected > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold">
                                <FiX className="w-2.5 h-2.5" /> {counts.rejected}
                              </span>
                            )}
                          </div>

                          {/* حالة التظلم */}
                          <div className="flex-shrink-0">
                            {renderAppealStatusBadge(appeal)}
                          </div>

                          {/* التاريخ */}
                          <div className="hidden lg:block flex-shrink-0 text-left">
                            <p className="text-xs text-slate-400">
                              {new Date(appeal.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* محتوى التظلم الموسع */}
                      {isExpanded && (
                        <div className="px-4 md:px-5 pb-4 border-t border-slate-100 bg-slate-50/30">
                          {/* ملاحظات المتدرب */}
                          {appeal.traineeNotes && (
                            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-semibold text-amber-800 mb-1">
                                <FiMessageSquare className="w-3 h-3 inline ml-1" /> ملاحظات المتدرب:
                              </p>
                              <p className="text-xs text-amber-900">{appeal.traineeNotes}</p>
                            </div>
                          )}

                          {/* زر إعادة المراجعة */}
                          <PermissionGate resource="dashboard.grade-appeals" action="review">
                            <div className="mt-3">
                              <button
                                onClick={() => handleReReview(appeal)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                                إعادة مراجعة
                              </button>
                            </div>
                          </PermissionGate>

                          {/* جدول المواد مع أزرار القبول/الرفض لكل مادة */}
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {/* رأس جدول المواد */}
                            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              <div className="col-span-4">المادة</div>
                              <div className="col-span-2 text-center">الدرجة</div>
                              <div className="col-span-2 text-center">النسبة</div>
                              <div className="col-span-2 text-center">الحالة</div>
                              <div className="col-span-2 text-center">إجراء</div>
                            </div>

                            {/* صفوف المواد */}
                            <div className="divide-y divide-slate-100">
                              {appeal.subjects.map((subject: any) => (
                                <div key={subject.id} className={`transition-colors ${subject.status === 'PENDING' ? 'bg-white' : subject.status === 'ACCEPTED' ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                                  {/* ديسكتوب */}
                                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                    <div className="col-span-4">
                                      <p className="text-sm font-semibold text-slate-800">{subject.content.name}</p>
                                      <p className="text-[11px] text-slate-400">{subject.content.code}</p>
                                      {subject.lastReviewedAt && (
                                        <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                                          <FiRefreshCw className="w-2.5 h-2.5" />
                                          آخر مراجعة: {new Date(subject.lastReviewedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      )}
                                    </div>
                                    <div className="col-span-2 text-center">
                                      <span className="text-sm font-bold text-slate-800">{subject.currentScore}/{subject.maxScore}</span>
                                    </div>
                                    <div className="col-span-2 text-center">
                                      <span className={`text-sm font-bold ${subject.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {subject.percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="col-span-2 text-center">
                                      {getStatusBadge(subject.status, 'sm')}
                                    </div>
                                    <div className="col-span-2 text-center">
                                      {subject.status === 'PENDING' ? (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => setConfirmAction({ subjectId: subject.id, status: 'ACCEPTED', subjectName: subject.content.name })}
                                            disabled={submittingSubject === subject.id}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50 text-[11px] font-semibold shadow-sm"
                                          >
                                            <FiCheck className="w-3 h-3" />
                                            قبول
                                          </button>
                                          <button
                                            onClick={() => setConfirmAction({ subjectId: subject.id, status: 'REJECTED', subjectName: subject.content.name })}
                                            disabled={submittingSubject === subject.id}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 text-[11px] font-semibold shadow-sm"
                                          >
                                            <FiX className="w-3 h-3" />
                                            رفض
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">تمت المراجعة</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* موبايل */}
                                  <div className="sm:hidden p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{subject.content.name}</p>
                                        <p className="text-[11px] text-slate-400">{subject.content.code}</p>
                                        {subject.lastReviewedAt && (
                                          <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                                            <FiRefreshCw className="w-2.5 h-2.5" />
                                            آخر مراجعة: {new Date(subject.lastReviewedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        )}
                                      </div>
                                      {getStatusBadge(subject.status, 'sm')}
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-600">الدرجة: <span className="font-bold">{subject.currentScore}/{subject.maxScore}</span></span>
                                      <span className={`font-bold ${subject.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {subject.percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                    {subject.status === 'PENDING' && (
                                      <div className="flex gap-2 pt-1">
                                        <button
                                          onClick={() => setConfirmAction({ subjectId: subject.id, status: 'ACCEPTED', subjectName: subject.content.name })}
                                          disabled={submittingSubject === subject.id}
                                          className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                                        >
                                          <FiCheck className="w-3.5 h-3.5" /> قبول التظلم
                                        </button>
                                        <button
                                          onClick={() => setConfirmAction({ subjectId: subject.id, status: 'REJECTED', subjectName: subject.content.name })}
                                          disabled={submittingSubject === subject.id}
                                          className="flex-1 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                                        >
                                          <FiX className="w-3.5 h-3.5" /> رفض التظلم
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* تنبيه الرسوم */}
                          {hasPendingSubjects && (
                            <div className="mt-3 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                              <p className="text-xs text-orange-800">
                                <FiAlertCircle className="w-3.5 h-3.5 inline ml-1" />
                                <span className="font-bold">تنبيه:</span> عند رفض مادة سيتم تطبيق رسوم التظلم تلقائياً عن تلك المادة فقط (إن كان القيد المالي مُعداً للبرنامج).
                              </p>
                            </div>
                          )}

                          {/* رد الإدارة */}
                          {appeal.adminResponse && (
                            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-bold text-blue-800 mb-0.5">رد الإدارة:</p>
                              <p className="text-xs text-blue-900">{appeal.adminResponse}</p>
                              {appeal.reviewer && (
                                <p className="text-xs text-blue-500 mt-1">
                                  بواسطة: {appeal.reviewer.name} — {appeal.reviewedAt && new Date(appeal.reviewedAt).toLocaleDateString('ar-EG')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* الترقيم */}
              {!loading && pagination.total > 0 && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    isLoading={loading}
                    showLimitSelector={true}
                    limitOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Review Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                confirmAction.status === 'ACCEPTED' ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {confirmAction.status === 'ACCEPTED'
                  ? <FiCheck className="w-6 h-6 text-emerald-600" />
                  : <FiX className="w-6 h-6 text-red-600" />
                }
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                {confirmAction.status === 'ACCEPTED' ? 'تأكيد قبول التظلم' : 'تأكيد رفض التظلم'}
              </h3>
              <p className="text-xs text-slate-600 mb-1">
                المادة: <span className="font-bold text-slate-800">{confirmAction.subjectName}</span>
              </p>
              <p className="text-xs text-slate-500 mb-4">
                {confirmAction.status === 'ACCEPTED'
                  ? 'سيتم قبول التظلم على هذه المادة بدون رسوم.'
                  : <span className="text-red-600 font-medium">سيتم رفض التظلم وتطبيق رسوم التظلم على هذه المادة (إن وُجدت).</span>
                }
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  تراجع
                </button>
                <button
                  onClick={() => handleReviewSubject(confirmAction.subjectId, confirmAction.status)}
                  className={`flex-1 px-4 py-2 text-white font-semibold text-sm rounded-xl transition-colors ${
                    confirmAction.status === 'ACCEPTED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmAction.status === 'ACCEPTED' ? 'نعم، قبول التظلم' : 'نعم، رفض التظلم'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-Review Modal */}
      {reReviewAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FiRefreshCw className={`w-5 h-5 text-white ${reReviewStage === 'loading' || reReviewStage === 'grading' ? 'animate-spin' : ''}`} />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-base">إعادة مراجعة التظلم</h3>
                  <p className="text-amber-100 text-xs">{reReviewAppeal.trainee?.nameAr}</p>
                </div>
              </div>
            </div>

            {/* Body - scrollable */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* مرحلة التحميل الأولي */}
              {reReviewStage === 'loading' && (
                <div className="flex flex-col items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-amber-200 border-t-amber-500 mb-4"></div>
                  <p className="text-slate-700 font-semibold text-sm">جاري تحميل بيانات الدرجات...</p>
                </div>
              )}

              {/* مرحلة إعادة التصحيح مع عرض المواد */}
              {reReviewStage === 'grading' && reReviewData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-[3px] border-amber-200 border-t-amber-500 flex-shrink-0"></div>
                    <p className="text-amber-700 font-semibold text-sm">جاري إعادة تصحيح المواد...</p>
                  </div>
                  <div className="space-y-2">
                    {reReviewData.subjects.map((subject: any, index: number) => (
                      <div
                        key={subject.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                          index < reReviewVisibleSubjects
                            ? 'bg-amber-50 border-amber-200 opacity-100 translate-x-0'
                            : 'bg-slate-50 border-slate-200 opacity-30 translate-x-4'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          index < reReviewVisibleSubjects ? 'bg-amber-500' : 'bg-slate-300'
                        }`}>
                          {index < reReviewVisibleSubjects ? (
                            <FiRefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                          ) : (
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate flex-1">{subject.content?.name}</p>
                        {index < reReviewVisibleSubjects && (
                          <span className="text-xs text-amber-600 font-bold flex-shrink-0">جاري التصحيح...</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* مرحلة النتائج */}
              {(reReviewStage === 'results' || reReviewStage === 'saved') && reReviewData && (
                <div className="space-y-3">
                  {/* درجات المواد */}
                  {reReviewData.subjects.map((subject: any) => (
                    <div key={subject.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-slate-800 truncate flex-1 ml-3">{subject.content?.name}</p>
                        <div className={`text-left flex-shrink-0 ${subject.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className="text-base font-bold">{subject.currentScore}/{subject.maxScore}</span>
                          <span className="text-xs font-medium mr-1.5">({subject.percentage?.toFixed(1)}%)</span>
                        </div>
                      </div>
                      {subject.traineeGrades && (
                        <div className="grid grid-cols-6 gap-2 mt-2 pt-2 border-t border-slate-200">
                          {[
                            { label: 'أعمال السنة', value: subject.traineeGrades.yearWorkMarks },
                            { label: 'العملي', value: subject.traineeGrades.practicalMarks },
                            { label: 'التحريري', value: subject.traineeGrades.writtenMarks },
                            { label: 'الحضور', value: subject.traineeGrades.attendanceMarks },
                            { label: 'اختبارات اونلاين', value: subject.traineeGrades.quizzesMarks },
                            { label: 'الميد تيرم', value: subject.traineeGrades.finalExamMarks },
                          ].map((g, i) => (
                            <div key={i} className="text-center">
                              <p className="text-[10px] text-slate-400 leading-tight">{g.label}</p>
                              <p className="text-sm font-bold text-slate-700">{g.value ?? 0}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* رسالة النتيجة النهائية */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiAward className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm">انتهت إعادة التصحيح</h4>
                        <p className="text-xs text-amber-700 mt-0.5">لا يوجد أي درجات إضافية مستحقة للمتدرب</p>
                      </div>
                    </div>
                  </div>

                  {reReviewStage === 'saved' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                      <FiCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <p className="text-sm text-emerald-800 font-semibold">تم عرض حالة الدرجات بنجاح</p>
                    </div>
                  )}

                  {reReviewStage === 'results' && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent"></div>
                      جاري تحميل النتيجة...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {reReviewStage === 'saved' && (
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                <button
                  onClick={closeReReviewModal}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
