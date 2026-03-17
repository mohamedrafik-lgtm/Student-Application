'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/hooks/usePermissions';
import Image from 'next/image';
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
  photoUrl?: string;
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function UndistributedTraineesPage() {
  const { hasPermission } = usePermissions();
  
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramId, setFilterProgramId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // التحقق من الصلاحيات
  const canView = hasPermission('dashboard.trainees.distribution', 'view');
  const canTransfer = hasPermission('dashboard.trainees.distribution', 'transfer');

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadTrainees(1);
  }, [filterProgramId, filterType]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI<Program[]>('/programs');
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('حدث خطأ في تحميل البرامج');
    }
  };

  const loadTrainees = async (page: number) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      
      if (filterProgramId) params.append('programId', filterProgramId);
      if (filterType) params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetchAPI<{ trainees: Trainee[]; pagination: PaginationInfo }>(
        `/trainee-distribution/undistributed/trainees?${params.toString()}`
      );
      
      setTrainees(response.trainees);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading trainees:', error);
      toast.error('حدث خطأ في تحميل المتدربين');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTrainees(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    loadTrainees(newPage);
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="المتدربون غير الموزعين" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'المتدربين' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><ExclamationTriangleIcon className="w-7 h-7 text-red-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">غير مصرح</h3>
            <p className="text-sm text-slate-500">ليس لديك صلاحية لعرض هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  const programOptions = programs.map(p => ({ value: String(p.id), label: p.nameAr }));
  const typeOptions = [
    { value: 'THEORY', label: 'النظري' },
    { value: 'PRACTICAL', label: 'العملي' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المتدربون غير الموزعين"
        description="قائمة المتدربين الذين لم يتم توزيعهم على أي مجموعة"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'غير الموزعين' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.open(`/print/undistributed-trainees?programId=${filterProgramId}&type=${filterType}`, '_blank')}
              variant="outline"
              size="sm"
              leftIcon={<PrinterIcon className="w-4 h-4" />}
            >
              طباعة التقرير
            </Button>
            <Button onClick={() => loadTrainees(pagination.page)} variant="outline" size="sm" leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              تحديث
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TibaSelect
              label="البرنامج التدريبي"
              options={programOptions}
              value={filterProgramId}
              onChange={(val) => setFilterProgramId(val)}
              placeholder="جميع البرامج"
              isClearable
              instanceId="filter-program-undist"
            />
            <TibaSelect
              label="نوع التوزيع"
              options={typeOptions}
              value={filterType}
              onChange={(val) => setFilterType(val)}
              placeholder="جميع الأنواع"
              isClearable
              instanceId="filter-type-undist"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">البحث</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><MagnifyingGlassIcon className="w-4 h-4 text-slate-400" /></div>
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الرقم القومي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
                <Button onClick={handleSearch} variant="primary" size="sm" leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}>
                  بحث
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'إجمالي غير الموزعين', value: pagination.total, icon: UsersIcon, color: 'amber' },
            { label: 'الصفحة الحالية', value: `${pagination.page} / ${pagination.totalPages || 1}`, icon: BookOpenIcon, color: 'blue' },
            { label: 'عدد النتائج', value: trainees.length, icon: BeakerIcon, color: 'emerald' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-40 bg-slate-200 rounded" /><div className="h-3 w-24 bg-slate-100 rounded" /></div>
                  <div className="h-8 w-16 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-7 h-7 text-slate-400" /></div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد نتائج</h3>
              <p className="text-sm text-slate-500">
                {searchQuery || filterProgramId || filterType ? 'لم نجد أي متدربين غير موزعين حسب الفلاتر المحددة' : 'جميع المتدربين تم توزيعهم'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {trainees.map((trainee, index) => (
                  <div key={trainee.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden flex-shrink-0 ring-2 ring-slate-100">
                        {trainee.photoUrl ? (
                          <Image src={trainee.photoUrl} alt={trainee.nameAr} width={40} height={40} className="object-cover" />
                        ) : (
                          trainee.nameAr.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">#{(pagination.page - 1) * pagination.limit + index + 1}</span>
                        </div>
                        {trainee.nameEn && <p className="text-xs text-slate-400 truncate">{trainee.nameEn}</p>}
                        <p className="text-[11px] text-slate-500 font-mono mt-1">{trainee.nationalId}</p>
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100 mt-1.5">
                          {trainee.program.nameAr}
                        </span>
                        {canTransfer && (
                          <div className="mt-3">
                            <a
                              href={`/dashboard/trainees/${trainee.id}/transfer-group`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="success" size="sm" fullWidth leftIcon={<ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />}>
                                توزيع
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 w-12">#</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المتدرب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرقم القومي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">البرنامج</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trainees.map((trainee, index) => (
                      <tr key={trainee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden flex-shrink-0 ring-2 ring-slate-100">
                              {trainee.photoUrl ? (
                                <Image src={trainee.photoUrl} alt={trainee.nameAr} width={36} height={36} className="object-cover" />
                              ) : (
                                trainee.nameAr.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                              {trainee.nameEn && <p className="text-xs text-slate-400 truncate">{trainee.nameEn}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{trainee.nationalId}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                            {trainee.program.nameAr}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canTransfer ? (
                            <a
                              href={`/dashboard/trainees/${trainee.id}/transfer-group`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="success" size="sm" leftIcon={<ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />}>
                                توزيع
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">غير مصرح</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-200">
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

