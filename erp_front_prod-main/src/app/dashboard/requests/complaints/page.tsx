'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  XMarkIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import ProtectedPage from '@/components/permissions/ProtectedPage';

export default function ComplaintsManagementPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.complaints', action: 'view' }}>
      <ComplaintsContent />
    </ProtectedPage>
  );
}

interface Complaint {
  id: string;
  type: 'COMPLAINT' | 'SUGGESTION';
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminResponse?: string;
  reviewer?: { name: string };
  reviewedAt?: string;
  createdAt: string;
  trainee?: {
    nameAr: string;
    nationalId: string;
    phone?: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  PENDING: { label: 'قيد المراجعة', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: ClockIcon },
  IN_PROGRESS: { label: 'جاري المعالجة', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: WrenchScrewdriverIcon },
  RESOLVED: { label: 'تم الحل', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: CheckCircleIcon },
  CLOSED: { label: 'مغلق', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-200', icon: XCircleIcon },
};

function ComplaintsContent() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'COMPLAINT' | 'SUGGESTION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'review'>('view');
  const [reviewData, setReviewData] = useState({
    status: 'RESOLVED' as 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
    adminResponse: '',
  });
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI('/complaints');
      setComplaints(response.data || response || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
      toast.error('حدث خطأ في تحميل الشكاوي والاقتراحات');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedComplaint) return;

    try {
      setReviewing(true);
      await fetchAPI(`/complaints/${selectedComplaint.id}/review`, {
        method: 'PUT',
        body: JSON.stringify(reviewData),
      });

      const statusLabels: Record<string, string> = {
        IN_PROGRESS: 'تم تحويل الحالة إلى جاري المعالجة',
        RESOLVED: 'تم حل الشكوى بنجاح',
        CLOSED: 'تم إغلاق الطلب',
      };
      toast.success(statusLabels[reviewData.status] || 'تم تحديث الحالة');
      setShowModal(false);
      setSelectedComplaint(null);
      setReviewData({ status: 'RESOLVED', adminResponse: '' });
      loadComplaints();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في المراجعة');
    } finally {
      setReviewing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await fetchAPI(`/complaints/${id}`, { method: 'DELETE' });
      toast.success('تم حذف الطلب');
      loadComplaints();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في الحذف');
    }
  };

  const openModal = (complaint: Complaint, mode: 'view' | 'review') => {
    setSelectedComplaint(complaint);
    setModalMode(mode);
    setReviewData({ status: 'RESOLVED', adminResponse: '' });
    setShowModal(true);
  };

  const filteredComplaints = useMemo(() => {
    let result = complaints;

    if (filterStatus !== 'ALL') {
      result = result.filter((r) => r.status === filterStatus);
    }

    if (filterType !== 'ALL') {
      result = result.filter((r) => r.type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.trainee?.nameAr?.toLowerCase().includes(query) ||
          r.trainee?.nationalId?.includes(query) ||
          r.subject.toLowerCase().includes(query)
      );
    }

    return result;
  }, [complaints, filterStatus, filterType, searchQuery]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter((r) => r.status === 'PENDING').length,
    inProgress: complaints.filter((r) => r.status === 'IN_PROGRESS').length,
    resolved: complaints.filter((r) => r.status === 'RESOLVED').length,
    complaints: complaints.filter((r) => r.type === 'COMPLAINT').length,
    suggestions: complaints.filter((r) => r.type === 'SUGGESTION').length,
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tiba Gradient Header */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">الشكاوي والاقتراحات</h1>
              <p className="text-white/70 text-sm mt-0.5">إدارة ومراجعة الشكاوي والاقتراحات المقدمة من المتدربين</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-white/70 text-[11px] mt-0.5">إجمالي الطلبات</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-white/70 text-[11px] mt-0.5">قيد المراجعة</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-white/70 text-[11px] mt-0.5">جاري المعالجة</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-white/70 text-[11px] mt-0.5">تم الحل</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.complaints}</p>
              <p className="text-white/70 text-[11px] mt-0.5">شكاوي</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.suggestions}</p>
              <p className="text-white/70 text-[11px] mt-0.5">اقتراحات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-tiba-primary-100 flex items-center justify-center">
            <MagnifyingGlassIcon className="w-4 h-4 text-tiba-primary-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">بحث وتصفية</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، رقم الهوية، أو العنوان..."
              className="w-full h-11 pr-11 pl-4 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-tiba-primary-300 focus:ring-2 focus:ring-tiba-primary-100 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">الحالة:</span>
            {[
              { key: 'ALL', label: 'الكل' },
              { key: 'PENDING', label: '⏳ قيد المراجعة' },
              { key: 'IN_PROGRESS', label: '🔧 جاري المعالجة' },
              { key: 'RESOLVED', label: '✅ تم الحل' },
              { key: 'CLOSED', label: '🔒 مغلق' }
            ].map((status) => (
              <button
                key={status.key}
                onClick={() => setFilterStatus(status.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === status.key
                    ? 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {status.label}
              </button>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-1 self-center hidden sm:block"></div>
            <span className="text-xs font-semibold text-slate-500">النوع:</span>
            {[
              { key: 'ALL', label: 'الكل' },
              { key: 'COMPLAINT', label: '⚠️ شكاوي' },
              { key: 'SUGGESTION', label: '💡 اقتراحات' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === t.key
                    ? 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="text-xs text-slate-500">
          وجد {filteredComplaints.length} نتيجة للبحث &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-tiba-primary-200 border-t-tiba-primary-600 mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 sm:p-16 text-center border border-slate-200">
          <ChatBubbleLeftRightIcon className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد شكاوي أو اقتراحات'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">المتدرب</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">النوع</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">العنوان</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">التاريخ</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredComplaints.map((item, index) => {
                    const statusConfig = STATUS_CONFIG[item.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              item.type === 'COMPLAINT'
                                ? 'bg-red-100'
                                : 'bg-amber-100'
                            }`}>
                              {item.type === 'COMPLAINT' ? (
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                              ) : (
                                <LightBulbIcon className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{item.trainee?.nameAr || 'غير محدد'}</p>
                              <p className="text-[11px] text-slate-400">{item.trainee?.nationalId || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            item.type === 'COMPLAINT'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.type === 'COMPLAINT' ? 'شكوى' : 'اقتراح'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-sm text-slate-800 truncate max-w-[250px]">{item.subject}</p>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[250px] mt-0.5">{item.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.color} rounded-lg text-[11px] font-semibold border ${statusConfig.borderColor}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openModal(item, 'view')}
                              className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all text-xs font-semibold flex items-center gap-1 border border-slate-200"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            {(item.status === 'PENDING' || item.status === 'IN_PROGRESS') && (
                              <button
                                onClick={() => openModal(item, 'review')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs font-semibold flex items-center gap-1"
                              >
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                مراجعة
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-200"
                              title="حذف"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredComplaints.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status];
              const StatusIcon = statusConfig.icon;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'COMPLAINT'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                    }`}>
                      {item.type === 'COMPLAINT' ? (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                      ) : (
                        <LightBulbIcon className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{item.trainee?.nameAr || 'غير محدد'}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.type === 'COMPLAINT' ? 'شكوى' : 'اقتراح'} • {item.trainee?.nationalId || ''}
                      </p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">العنوان</p>
                    <p className="font-semibold text-slate-800 text-sm">{item.subject}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                    )}
                  </div>

                  {/* Status & Date */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.color} rounded-lg text-[11px] font-semibold border ${statusConfig.borderColor}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openModal(item, 'view')}
                      className="flex-1 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg font-semibold text-xs hover:bg-slate-100 transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <EyeIcon className="w-4 h-4" />
                      عرض
                    </button>
                    {(item.status === 'PENDING' || item.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => openModal(item, 'review')}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        مراجعة
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedComplaint.type === 'COMPLAINT'
                    ? 'bg-red-100'
                    : 'bg-amber-100'
                }`}>
                  {selectedComplaint.type === 'COMPLAINT' ? (
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  ) : (
                    <LightBulbIcon className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    {modalMode === 'review' ? 'مراجعة الطلب' : 'تفاصيل الطلب'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedComplaint.type === 'COMPLAINT' ? 'شكوى' : 'اقتراح'} •{' '}
                    {new Date(selectedComplaint.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-[11px] text-slate-400 mb-1 font-semibold">المتدرب</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedComplaint.trainee?.nameAr || 'غير محدد'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedComplaint.trainee?.nationalId || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-[11px] text-slate-400 mb-1 font-semibold">معلومات التواصل</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedComplaint.trainee?.phone || '-'}</p>
                  <div className="mt-1.5">
                    {(() => {
                      const sc = STATUS_CONFIG[selectedComplaint.status];
                      const SI = sc.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                          <SI className="w-3 h-3" />
                          {sc.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="bg-tiba-primary-50 rounded-xl p-3.5 border border-tiba-primary-200">
                <p className="text-[11px] text-tiba-primary-600 mb-1 font-semibold">العنوان</p>
                <p className="font-bold text-slate-800 text-sm">{selectedComplaint.subject}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">التفاصيل:</p>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>
              </div>

              {/* Attachment */}
              {selectedComplaint.attachmentUrl && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <PhotoIcon className="w-4 h-4" />
                    المرفق
                  </p>
                  <img
                    src={selectedComplaint.attachmentUrl}
                    alt="مرفق"
                    className="w-full rounded-xl border border-slate-200 max-h-64 object-contain bg-slate-50"
                  />
                </div>
              )}

              {/* Previous Admin Response */}
              {selectedComplaint.adminResponse && modalMode === 'view' && (
                <div className={`rounded-xl p-3.5 border ${
                  selectedComplaint.status === 'RESOLVED'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-xs font-semibold mb-1.5">رد الإدارة:</p>
                  <p className="text-sm text-slate-700">{selectedComplaint.adminResponse}</p>
                  {selectedComplaint.reviewer && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-400">
                      المراجع: {selectedComplaint.reviewer.name}
                      {selectedComplaint.reviewedAt &&
                        ` • ${new Date(selectedComplaint.reviewedAt).toLocaleDateString('ar-EG')}`}
                    </div>
                  )}
                </div>
              )}

              {/* Review Form */}
              {modalMode === 'review' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">تغيير الحالة</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'IN_PROGRESS', label: '🔧 جاري المعالجة', activeColor: 'border-blue-300 bg-blue-50 text-blue-700' },
                        { key: 'RESOLVED', label: '✅ تم الحل', activeColor: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                        { key: 'CLOSED', label: '🔒 إغلاق', activeColor: 'border-slate-300 bg-slate-100 text-slate-700' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setReviewData({ ...reviewData, status: s.key as any })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            reviewData.status === s.key ? s.activeColor + ' shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">الرد على المتدرب</label>
                    <textarea
                      value={reviewData.adminResponse}
                      onChange={(e) => setReviewData({ ...reviewData, adminResponse: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-tiba-primary-300 focus:ring-2 focus:ring-tiba-primary-100 outline-none transition-all"
                      rows={4}
                      placeholder="اكتب ردك هنا..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>تاريخ الطلب: {new Date(selectedComplaint.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 font-semibold transition-all text-sm text-slate-600"
                disabled={reviewing}
              >
                {modalMode === 'view' ? 'إغلاق' : 'إلغاء'}
              </button>
              {modalMode === 'review' && (
                <button
                  onClick={handleReview}
                  disabled={reviewing}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {reviewing ? 'جاري الحفظ...' : 'حفظ المراجعة'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
