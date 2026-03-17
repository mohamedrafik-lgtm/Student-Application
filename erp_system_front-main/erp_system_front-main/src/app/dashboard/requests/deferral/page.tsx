'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';

export default function DeferralRequestsPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.deferral-requests', action: 'view' }}>
      <DeferralRequestsContent />
    </ProtectedPage>
  );
}

function DeferralRequestsContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'review'>('view');
  const [reviewData, setReviewData] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    adminResponse: '',
  });
  const [reviewing, setReviewing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [currentPage, pageLimit, filterStatus]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
      });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const response = await fetchAPI(`/deferral-requests?${params}`);
      setRequests(response.data || []);
      if (response.pagination) {
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          hasNext: response.pagination.page < response.pagination.totalPages,
          hasPrev: response.pagination.page > 1,
        });
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('حدث خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchAPI('/deferral-requests/stats');
      setStats({
        total: data.total || 0,
        pending: data.pending || data.PENDING || 0,
        approved: data.approved || data.APPROVED || 0,
        rejected: data.rejected || data.REJECTED || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    try {
      setReviewing(true);
      await fetchAPI(`/deferral-requests/${selectedRequest.id}/review`, {
        method: 'PUT',
        body: JSON.stringify(reviewData)
      });

      toast.success(reviewData.status === 'APPROVED' ? '✅ تم قبول الطلب وإنشاء الاستثناء' : '❌ تم رفض الطلب');
      setShowModal(false);
      setSelectedRequest(null);
      setReviewData({ status: 'APPROVED', adminResponse: '' });
      loadRequests();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في المراجعة');
    } finally {
      setReviewing(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let result = requests;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.trainee.nameAr.toLowerCase().includes(query) ||
        r.trainee.nationalId.includes(query) ||
        r.fee.name.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [requests, searchQuery]);

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tiba Gradient Header */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <CalendarDaysIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">إدارة طلبات التأجيل</h1>
              <p className="text-white/70 text-sm mt-0.5">مراجعة وإدارة طلبات تأجيل السداد</p>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/20">
          {[
            { label: 'إجمالي الطلبات', value: stats.total, Icon: CalendarDaysIcon },
            { label: 'قيد المراجعة', value: stats.pending, Icon: ClockIcon },
            { label: 'مقبول', value: stats.approved, Icon: CheckCircleIcon },
            { label: 'مرفوض', value: stats.rejected, Icon: XCircleIcon },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <stat.Icon className="w-4 h-4 text-white/80" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
                <p className="text-[11px] text-white/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الرقم القومي، أو اسم الرسم..."
              className="w-full h-11 pr-11 pl-4 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-tiba-primary-300 focus:ring-2 focus:ring-tiba-primary-100 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'ALL', label: 'الكل', count: stats.total },
              { key: 'PENDING', label: 'قيد المراجعة', count: stats.pending },
              { key: 'APPROVED', label: 'مقبول', count: stats.approved },
              { key: 'REJECTED', label: 'مرفوض', count: stats.rejected }
            ].map((status) => (
              <button
                key={status.key}
                onClick={() => handleFilterChange(status.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === status.key
                    ? 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {status.label} ({status.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="text-xs sm:text-sm text-slate-500">
          وجد {filteredRequests.length} نتيجة للبحث "{searchQuery}"
        </div>
      )}

      {/* Requests - Desktop Table + Mobile Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-tiba-primary-200 border-t-tiba-primary-600 mb-4"></div>
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 sm:p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <CalendarDaysIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد طلبات'}
          </h3>
          <p className="text-sm text-slate-400">{searchQuery ? 'جرب البحث بكلمات أخرى' : 'لم يتم تقديم أي طلبات تأجيل بعد'}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">المتدرب</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الرسم</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">التأجيل</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((request, index) => (
                    <tr key={request.id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {request.trainee.photoUrl ? (
                            <img src={request.trainee.photoUrl} alt={request.trainee.nameAr} className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200" />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-tiba-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm text-white font-bold text-sm">
                              {request.trainee.nameAr?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{request.trainee.nameAr}</p>
                            <p className="text-xs text-slate-400">{request.trainee.program.nameAr}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{request.fee.name}</p>
                          <p className="text-xs text-slate-400">{request.fee.amount.toLocaleString()} ج.م</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-tiba-primary-50 text-tiba-primary-700 px-3 py-1.5 rounded-lg font-semibold text-xs border border-tiba-primary-200">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          {request.requestedExtensionDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {request.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                            <ClockIcon className="w-3.5 h-3.5" />
                            قيد المراجعة
                          </span>
                        )}
                        {request.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            مقبول
                          </span>
                        )}
                        {request.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            مرفوض
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {request.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setModalMode('review');
                                  setReviewData({ status: 'APPROVED', adminResponse: '' });
                                  setShowModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-semibold text-xs flex items-center gap-1.5"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                قبول
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setModalMode('review');
                                  setReviewData({ status: 'REJECTED', adminResponse: '' });
                                  setShowModal(true);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-sm font-semibold text-xs flex items-center gap-1.5"
                              >
                                <XCircleIcon className="w-4 h-4" />
                                رفض
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setModalMode('view');
                                setShowModal(true);
                              }}
                              className="px-4 py-2 bg-slate-50 text-tiba-primary-700 rounded-xl hover:bg-tiba-primary-50 transition-all font-semibold text-xs flex items-center gap-1.5 border border-tiba-primary-200"
                            >
                              <EyeIcon className="w-4 h-4" />
                              عرض
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                {/* Trainee Info */}
                <div className="flex items-center gap-3">
                  {request.trainee.photoUrl ? (
                    <img src={request.trainee.photoUrl} alt={request.trainee.nameAr} className="w-11 h-11 rounded-xl object-cover shadow-sm ring-1 ring-slate-200 flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 bg-gradient-to-br from-tiba-primary-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {request.trainee.nameAr.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{request.trainee.nameAr}</p>
                    <p className="text-xs text-slate-400 truncate">{request.trainee.program.nameAr}</p>
                  </div>
                </div>

                {/* Fee Info */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">الرسم</p>
                  <p className="font-semibold text-sm text-slate-800">{request.fee.name}</p>
                  <p className="text-xs text-slate-500">{request.fee.amount.toLocaleString()} ج.م</p>
                </div>

                {/* Extension */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 bg-tiba-primary-50 text-tiba-primary-700 px-3 py-1.5 rounded-lg font-semibold text-xs border border-tiba-primary-200">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    تأجيل {request.requestedExtensionDays} يوم
                  </span>
                  {request.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200">
                      <ClockIcon className="w-3 h-3" />
                      قيد المراجعة
                    </span>
                  )}
                  {request.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
                      <CheckCircleIcon className="w-3 h-3" />
                      مقبول
                    </span>
                  )}
                  {request.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200">
                      <XCircleIcon className="w-3 h-3" />
                      مرفوض
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {request.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setModalMode('review');
                          setReviewData({ status: 'APPROVED', adminResponse: '' });
                          setShowModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-xs hover:bg-emerald-700 transition-colors"
                      >
                        ✓ قبول
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setModalMode('review');
                          setReviewData({ status: 'REJECTED', adminResponse: '' });
                          setShowModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-xl font-semibold text-xs hover:bg-red-700 transition-colors"
                      >
                        ✕ رفض
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setModalMode('view');
                        setShowModal(true);
                      }}
                        className="flex-1 px-3 py-2 bg-tiba-primary-600 text-white rounded-xl font-semibold text-xs hover:bg-tiba-primary-700 transition-colors"
                    >
                      👁️ عرض
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && filteredRequests.length > 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => { setPageLimit(limit); setCurrentPage(1); }}
          showLimitSelector
          isLoading={loading}
        />
      )}

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            
            <div className={`p-4 sm:p-6 border-b ${
              modalMode === 'review'
                ? reviewData.status === 'APPROVED' 
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' 
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                : 'bg-gradient-to-l from-tiba-primary-50 to-indigo-50 border-tiba-primary-100'
            }`}>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                {modalMode === 'review' 
                  ? (reviewData.status === 'APPROVED' ? '✅ قبول الطلب' : '❌ رفض الطلب')
                  : '📋 تفاصيل الطلب'
                }
              </h3>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">المتدرب</p>
                  <div className="flex items-center gap-3">
                    {selectedRequest.trainee.photoUrl ? (
                      <img src={selectedRequest.trainee.photoUrl} alt={selectedRequest.trainee.nameAr} className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-slate-200" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-tiba-primary-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base">
                        {selectedRequest.trainee.nameAr?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-base sm:text-lg">{selectedRequest.trainee.nameAr}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedRequest.trainee.nationalId}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">البرنامج التدريبي</p>
                  <p className="font-bold text-slate-800">{selectedRequest.trainee.program.nameAr}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-tiba-primary-50 to-indigo-50 rounded-xl p-4 border border-tiba-primary-200">
                  <p className="text-[10px] text-tiba-primary-600 mb-2 font-bold uppercase tracking-wider">الرسم المطلوب تأجيله</p>
                  <p className="font-bold text-slate-800 text-base sm:text-lg">{selectedRequest.fee.name}</p>
                  <p className="text-sm text-slate-600 mt-1">{selectedRequest.fee.amount.toLocaleString()} ج.م</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-[10px] text-emerald-600 mb-2 font-bold uppercase tracking-wider">مدة التأجيل المطلوبة</p>
                  <p className="font-black text-emerald-700 text-3xl">{selectedRequest.requestedExtensionDays}</p>
                  <p className="text-sm text-emerald-600 font-bold">يوم</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">سبب الطلب:</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{selectedRequest.reason}</p>
                </div>
              </div>

              {selectedRequest.adminResponse && modalMode === 'view' && (
                <div className={`rounded-xl p-4 border ${
                  selectedRequest.status === 'APPROVED' 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className="text-sm font-semibold text-slate-600 mb-2">رد الإدارة السابق:</p>
                  <p className="text-sm sm:text-base text-slate-700">{selectedRequest.adminResponse}</p>
                  {selectedRequest.reviewer && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                      المراجع: {selectedRequest.reviewer.name} • 
                      {new Date(selectedRequest.reviewedAt).toLocaleDateString('ar-EG')}
                    </div>
                  )}
                </div>
              )}

              {modalMode === 'review' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">
                      رد الإدارة {reviewData.status === 'REJECTED' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={reviewData.adminResponse}
                      onChange={(e) => setReviewData({ ...reviewData, adminResponse: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-100 focus:border-tiba-primary-300 text-sm sm:text-base outline-none transition-all bg-slate-50/50 focus:bg-white"
                      rows={4}
                      placeholder={
                        reviewData.status === 'APPROVED' 
                          ? 'سبب القبول (اختياري)...'
                          : 'يجب ذكر سبب الرفض...'
                      }
                    />
                  </div>

                  {reviewData.status === 'APPROVED' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        سيتم إنشاء استثناء تلقائي بتأجيل {selectedRequest.requestedExtensionDays} يوم
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 pt-4 border-t border-slate-100">
                <ClockIcon className="w-4 h-4" />
                <span>تاريخ الطلب: {new Date(selectedRequest.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</span>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t bg-slate-50 flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-slate-200 rounded-xl hover:bg-slate-100 font-semibold transition-all text-sm sm:text-base text-slate-600"
                disabled={reviewing}
              >
                {modalMode === 'view' ? 'إغلاق' : 'إلغاء'}
              </button>
              {modalMode === 'review' && (
                <button
                  onClick={handleReview}
                  disabled={reviewing || (reviewData.status === 'REJECTED' && !reviewData.adminResponse.trim())}
                  className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    reviewData.status === 'APPROVED'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                  }`}
                >
                  {reviewing ? 'جاري المعالجة...' : 'تأكيد'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}