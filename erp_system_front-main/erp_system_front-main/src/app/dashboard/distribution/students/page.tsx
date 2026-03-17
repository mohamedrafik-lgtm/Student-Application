'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { getAllTrainees } from '@/app/lib/api/trainees';
import { fetchAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  UsersIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { TraineeAvatar, TraineePhotoLightbox } from '@/components/ui/trainee-avatar';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photo?: string;
  photoUrl?: string;
  phone?: string;
  status?: string;
  program?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
}

export default function DistributionStudentsPage() {
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramId, setFilterProgramId] = useState<string>('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const canView = hasPermission('dashboard.trainees.distribution', 'view');
  const canEdit = hasPermission('dashboard.trainees.distribution', 'edit');

  // حالات modal الصورة
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{photoUrl: string; name: string; nationalId: string} | null>(null);

  const handleOpenPhoto = (photoUrl: string, name: string, nationalId: string) => {
    setSelectedPhoto({ photoUrl, name, nationalId });
    setShowPhotoModal(true);
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadTrainees(1);
  }, [filterProgramId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTrainees(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/programs') as Program[];
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadTrainees = async (page: number = 1) => {
    try {
      setLoading(true);
      const filters: any = {
        page,
        limit: pagination.limit,
        sortBy: 'name',
        sortOrder: 'asc',
      };
      if (filterProgramId) filters.programId = parseInt(filterProgramId);
      if (searchQuery.trim()) filters.searchQuery = searchQuery.trim();

      const response = await getAllTrainees(filters);

      if (response && response.data) {
        setTrainees(response.data);
        setPagination({
          page: response.pagination?.page || page,
          limit: pagination.limit,
          total: response.pagination?.total || response.data.length,
          totalPages: response.pagination?.totalPages || Math.ceil(response.data.length / pagination.limit),
        });
      } else if (Array.isArray(response)) {
        setTrainees(response);
        setPagination({
          page,
          limit: pagination.limit,
          total: response.length,
          totalPages: Math.ceil(response.length / pagination.limit),
        });
      } else {
        setTrainees([]);
        setPagination({ page: 1, limit: pagination.limit, total: 0, totalPages: 0 });
      }
    } catch (error: any) {
      console.error('Error loading trainees:', error);
      setTrainees([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    loadTrainees(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="المتدربون" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع' }, { label: '...' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200 rounded" /><div className="h-3 w-32 bg-slate-100 rounded" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="المتدربون" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'التوزيع' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">غير مصرح</h3>
            <p className="text-sm text-slate-500 mb-4">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
            <Button onClick={() => router.back()} variant="outline" size="sm">رجوع</Button>
          </div>
        </div>
      </div>
    );
  }

  const indexOfFirst = (pagination.page - 1) * pagination.limit;

  const STATUS_MAP: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
    ACTIVE: { label: 'نشط', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
    GRADUATED: { label: 'متخرج', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
    WITHDRAWN: { label: 'منسحب', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200' },
    SUSPENDED: { label: 'موقوف', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
  };

  const getStatusBadge = (status?: string) => {
    const s = STATUS_MAP[status || ''] || { label: status || '—', bgClass: 'bg-slate-50', textClass: 'text-slate-700', borderClass: 'border-slate-200' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.bgClass} ${s.textClass} ${s.borderClass}`}>{s.label}</span>;
  };

  const programOptions = programs.map(p => ({ value: String(p.id), label: p.nameAr }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="المتدربون"
        description="قائمة المتدربين — اضغط على زر التحويل لنقل متدرب بين المجموعات"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'التوزيع', href: '/dashboard/trainees/distribution' },
          { label: 'المتدربون' },
        ]}
        actions={
          <Button onClick={() => router.back()} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
            رجوع
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><MagnifyingGlassIcon className="w-4 h-4 text-slate-400" /></div>
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهوية أو رقم الجوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <TibaSelect
              options={programOptions}
              value={filterProgramId}
              onChange={(val) => setFilterProgramId(val)}
              placeholder="جميع البرامج"
              isClearable
              instanceId="filter-program"
            />
          </div>

          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Button onClick={() => loadTrainees(pagination.page)} variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}>
                تحديث
              </Button>
              <span className="text-xs text-slate-500">
                إجمالي: <strong className="text-slate-700">{pagination.total}</strong> متدرب
              </span>
            </div>
            {(filterProgramId || searchQuery) && (
              <button onClick={() => { setFilterProgramId(''); setSearchQuery(''); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
                <XMarkIcon className="w-3.5 h-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-4 w-40 bg-slate-200 rounded" /><div className="h-3 w-28 bg-slate-100 rounded" /></div>
                <div className="h-8 w-16 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : trainees.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد نتائج</h3>
            <p className="text-sm text-slate-500">لم يتم العثور على متدربين بهذه المعايير</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {trainees.map((trainee, index) => (
                <div key={trainee.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <TraineeAvatar
                      photoUrl={trainee.photoUrl || trainee.photo}
                      name={trainee.nameAr}
                      nationalId={trainee.nationalId}
                      size="sm"
                      onOpenPhoto={handleOpenPhoto}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                      {trainee.nameEn && <p className="text-xs text-slate-400 truncate">{trainee.nameEn}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">#{indexOfFirst + index + 1}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">الهوية</span><p className="text-slate-700 font-mono mt-0.5">{trainee.nationalId}</p></div>
                    <div><span className="text-slate-400">البرنامج</span><p className="text-slate-700 font-medium mt-0.5 truncate">{trainee.program?.nameAr || '—'}</p></div>
                    <div><span className="text-slate-400">الجوال</span><p className="text-slate-600 mt-0.5" dir="ltr">{trainee.phone || '—'}</p></div>
                    <div><span className="text-slate-400">الحالة</span><div className="mt-0.5">{getStatusBadge(trainee.status)}</div></div>
                  </div>
                  {canEdit && (
                    <div className="mt-3">
                      <Button
                        onClick={() => router.push(`/dashboard/distribution/students/transfer?traineeId=${trainee.id}`)}
                        variant="primary"
                        size="sm"
                        fullWidth
                        leftIcon={<ArrowsRightLeftIcon className="w-3.5 h-3.5" />}
                      >
                        تحويل
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 w-12">#</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المتدرب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">رقم الهوية</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">البرنامج</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الجوال</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                      {canEdit && <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trainees.map((trainee, index) => (
                      <tr key={trainee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">{indexOfFirst + index + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TraineeAvatar
                              photoUrl={trainee.photoUrl || trainee.photo}
                              name={trainee.nameAr}
                              nationalId={trainee.nationalId}
                              size="sm"
                              onOpenPhoto={handleOpenPhoto}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                              {trainee.nameEn && <p className="text-xs text-slate-400 truncate">{trainee.nameEn}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{trainee.nationalId}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-medium">{trainee.program?.nameAr || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600" dir="ltr">{trainee.phone || '—'}</td>
                        <td className="px-4 py-3">{getStatusBadge(trainee.status)}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              onClick={() => router.push(`/dashboard/distribution/students/transfer?traineeId=${trainee.id}`)}
                              variant="primary"
                              size="sm"
                              leftIcon={<ArrowsRightLeftIcon className="w-3.5 h-3.5" />}
                            >
                              تحويل
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <Pagination
              pagination={{
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasNext: pagination.page < pagination.totalPages,
                hasPrev: pagination.page > 1,
              }}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      {/* Modal عرض الصورة الشخصية */}
      {showPhotoModal && selectedPhoto && (
        <TraineePhotoLightbox
          photoUrl={selectedPhoto.photoUrl}
          name={selectedPhoto.name}
          nationalId={selectedPhoto.nationalId}
          onClose={() => { setShowPhotoModal(false); setSelectedPhoto(null); }}
        />
      )}
    </div>
  );
}
