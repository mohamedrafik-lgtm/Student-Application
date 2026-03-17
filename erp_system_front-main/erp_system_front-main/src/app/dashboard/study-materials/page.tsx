'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { Pagination } from '@/components/ui/Pagination';
import { TibaSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  PrinterIcon,
  ArrowPathIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyMaterials,
  deleteStudyMaterial,
  getStudyMaterialsStats,
  type StudyMaterial,
  type StudyMaterialStats,
} from '@/lib/study-materials-api';
import ProtectedPage from '@/components/permissions/ProtectedPage';

export default function StudyMaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [stats, setStats] = useState<StudyMaterialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pendingPrintAction, setPendingPrintAction] = useState<{ materialId: string; type: 'delivered' | 'not-delivered' } | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    loadMaterials();
    loadStats();
  }, [pagination.page, searchQuery, filterStatus]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const isActive = filterStatus === '' ? undefined : filterStatus === 'active';
      const response = await getStudyMaterials({
        search: searchQuery,
        isActive,
        page: pagination.page,
        limit: pagination.limit,
      });
      setMaterials(response.materials);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error loading materials:', error);
      toast.error('فشل تحميل الأدوات الدراسية');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getStudyMaterialsStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudyMaterial(id);
      toast.success('تم حذف الأداة الدراسية بنجاح');
      setShowDeleteConfirm(null);
      loadMaterials();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast.error(error.message || 'فشل حذف الأداة الدراسية');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const statusOptions = [
    { value: 'active', label: 'نشط فقط' },
    { value: 'inactive', label: 'غير نشط فقط' },
  ];

  return (
    <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title="الأدوات الدراسية"
          description="إدارة وتتبع الأدوات والمستلزمات الدراسية"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الأدوات الدراسية' },
          ]}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => window.open('/print/study-materials/overview', '_blank')} variant="outline" size="sm" leftIcon={<PrinterIcon className="w-4 h-4" />}>
                طباعة التقرير
              </Button>
              <Button onClick={() => router.push('/dashboard/study-materials/new')} variant="primary" size="sm" leftIcon={<PlusIcon className="w-4 h-4" />}>
                إضافة أداة جديدة
              </Button>
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'إجمالي الأدوات', value: stats.totalMaterials, icon: CubeIcon, color: 'blue' },
                { label: 'الأدوات النشطة', value: stats.activeMaterials, icon: CheckCircleIcon, color: 'emerald' },
                { label: 'إجمالي التسليمات', value: stats.totalDeliveries, icon: TruckIcon, color: 'violet' },
                { label: 'قيد الانتظار', value: stats.pendingDeliveries, icon: XCircleIcon, color: 'amber' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-${stat.color}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold text-${stat.color}-600 tabular-nums`}>{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="ابحث في الأدوات الدراسية..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <TibaSelect
                options={statusOptions}
                value={filterStatus}
                onChange={(val) => { setFilterStatus(val); setPagination((prev) => ({ ...prev, page: 1 })); }}
                placeholder="جميع الأدوات"
                isClearable
                instanceId="filter-status"
              />
            </div>
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Button onClick={() => { loadMaterials(); loadStats(); }} variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}>
                  تحديث
                </Button>
                <span className="text-xs text-slate-500">إجمالي: <strong className="text-slate-700">{pagination.total}</strong></span>
              </div>
              {(searchQuery || filterStatus) && (
                <button onClick={() => { handleClearSearch(); setFilterStatus(''); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
                  <XMarkIcon className="w-3.5 h-3.5" />
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200 rounded" /><div className="h-3 w-32 bg-slate-100 rounded" /></div>
                  <div className="h-8 w-20 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CubeIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                {searchQuery || filterStatus ? 'لا توجد نتائج تطابق البحث' : 'لا توجد أدوات دراسية بعد'}
              </h3>
              <p className="text-sm text-slate-500">ابدأ بإضافة أول أداة دراسية من خلال الزر أعلاه</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <CubeIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{material.name}</p>
                          {material.nameEn && <p className="text-xs text-slate-400 truncate">{material.nameEn}</p>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0 ${material.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {material.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>

                    {material.linkedFee && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5 mb-3">
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">مرتبط برسم: {material.linkedFee.name}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div><span className="text-slate-400">البرنامج</span><p className="text-slate-700 font-medium mt-0.5 truncate">{material.program?.nameAr || '—'}</p></div>
                      <div><span className="text-slate-400">الكمية</span><p className="text-slate-900 font-bold mt-0.5">{material.quantity}</p></div>
                      <div><span className="text-slate-400">التسليمات</span><p className="text-slate-700 font-medium mt-0.5">{material._count?.deliveries || 0}</p></div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={() => router.push(`/dashboard/study-materials/${material.id}`)} variant="primary" size="sm" className="flex-1" leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />}>
                        تعديل
                      </Button>
                      <Button onClick={() => { setPendingPrintAction({ materialId: material.id, type: 'delivered' }); setShowPhoneModal(true); }} variant="outline" size="sm" leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}>
                        المستلمين
                      </Button>
                      <button onClick={() => setShowDeleteConfirm(material.id)} className="inline-flex items-center text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-2 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">اسم الأداة</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">البرنامج</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الكمية</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الحالة</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">التسليمات</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.map((material) => (
                        <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <CubeIcon className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{material.name}</p>
                                {material.nameEn && <p className="text-xs text-slate-400 truncate">{material.nameEn}</p>}
                                {material.linkedFee && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-1">
                                    <LinkIcon className="w-2.5 h-2.5" />
                                    {material.linkedFee.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{material.program?.nameAr || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{material.quantity}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${material.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {material.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[36px] text-xs font-bold px-2 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-100">
                              {material._count?.deliveries || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <Button onClick={() => router.push(`/dashboard/study-materials/${material.id}`)} variant="primary" size="sm" leftIcon={<PencilSquareIcon className="w-3.5 h-3.5" />}>
                                تعديل
                              </Button>
                              <Button onClick={() => { setPendingPrintAction({ materialId: material.id, type: 'delivered' }); setShowPhoneModal(true); }} variant="outline" size="sm" leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}>
                                المستلمين
                              </Button>
                              <Button onClick={() => { setPendingPrintAction({ materialId: material.id, type: 'not-delivered' }); setShowPhoneModal(true); }} variant="warning" size="sm" leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}>
                                الغير مستلمين
                              </Button>
                              <button onClick={() => setShowDeleteConfirm(material.id)} className="inline-flex items-center text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-1.5 transition-colors">
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>

      {/* Print Options Modal */}
      <TibaModal
        open={showPhoneModal && !!pendingPrintAction}
        onClose={() => { setShowPhoneModal(false); setPendingPrintAction(null); }}
        title="خيارات الطباعة"
        subtitle="هل تريد تضمين أرقام هواتف المتدربين في التقرير؟"
        variant="primary"
        size="sm"
        icon={<PrinterIcon className="w-6 h-6" />}
      >
        <div className="space-y-3">
          <Button
            onClick={() => {
              if (pendingPrintAction) window.open(`/print/study-materials/${pendingPrintAction.materialId}/${pendingPrintAction.type}?includePhone=true`, '_blank');
              setShowPhoneModal(false);
              setPendingPrintAction(null);
            }}
            variant="primary"
            fullWidth
          >
            نعم، مع أرقام الهواتف
          </Button>
          <Button
            onClick={() => {
              if (pendingPrintAction) window.open(`/print/study-materials/${pendingPrintAction.materialId}/${pendingPrintAction.type}?includePhone=false`, '_blank');
              setShowPhoneModal(false);
              setPendingPrintAction(null);
            }}
            variant="outline"
            fullWidth
          >
            لا، بدون أرقام الهواتف
          </Button>
        </div>
      </TibaModal>

      {/* Delete Confirm Modal */}
      <TibaModal
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="حذف الأداة الدراسية"
        subtitle="هل أنت متأكد من حذف هذه الأداة الدراسية؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
        size="sm"
        icon={<TrashIcon className="w-6 h-6" />}
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="danger" className="flex-1" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} leftIcon={<TrashIcon className="w-4 h-4" />}>
              تأكيد الحذف
            </Button>
          </div>
        }
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">سيتم حذف هذه الأداة الدراسية وجميع بياناتها بشكل نهائي.</p>
        </div>
      </TibaModal>
    </ProtectedPage>
  );
}
