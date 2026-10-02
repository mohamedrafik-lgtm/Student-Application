'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import PageHeader from '@/app/components/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserIcon,
  EyeIcon,
  PrinterIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { getTraineesWithAttendance, TraineeWithAttendance } from '@/lib/attendance-records-api';
import { fetchAPI } from '@/lib/api';

interface Program {
  id: number;
  nameAr: string;
}

export default function AttendanceRecordsPage() {
  const router = useRouter();

  const [trainees, setTrainees] = useState<TraineeWithAttendance[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  // Load Programs
  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const data = await fetchAPI('/programs');
        setPrograms(data || []);
      } catch (error) {
        console.error('Error loading programs:', error);
      }
    };
    loadPrograms();
  }, []);

  // Load Trainees
  useEffect(() => {
    loadTrainees();
  }, [pagination.page, search, selectedProgram]);

  const loadTrainees = async () => {
    try {
      setLoading(true);
      const response = await getTraineesWithAttendance({
        page: pagination.page,
        limit: pagination.limit,
        search,
        programId: selectedProgram ? +selectedProgram : undefined,
      });

      setTrainees(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
        hasNext: response.pagination.page < response.pagination.totalPages,
        hasPrev: response.pagination.page > 1,
      }));
    } catch (error) {
      console.error('Error loading trainees:', error);
      toast.error('فشل تحميل المتدربين');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Stats
  const totalPresent = trainees.reduce((sum, t) => sum + t.attendanceStats.present, 0);
  const totalAbsent = trainees.reduce((sum, t) => sum + t.attendanceStats.absent, 0);
  const noRecords = trainees.filter(t => t.attendanceStats.present === 0 && t.attendanceStats.absent === 0).length;

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance.records', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title="سجلات الحضور والغياب"
          description="استعراض سجلات حضور وغياب المتدربين"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'سجلات الحضور' },
          ]}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">بحث</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="بحث بالاسم، الرقم القومي، البريد، أو الهاتف..."
                    className="w-full py-3 pr-10 pl-20 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2"
                  >
                    بحث
                  </Button>
                </div>
              </div>
              <TibaSelect
                label="البرنامج"
                options={[
                  { value: '', label: 'جميع البرامج' },
                  ...programs.map(p => ({ value: String(p.id), label: p.nameAr })),
                ]}
                value={selectedProgram}
                onChange={(val) => {
                  setSelectedProgram(val);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                isSearchable={false}
                isClearable={false}
                instanceId="filter-program"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{pagination.total}</p>
                  <p className="text-xs text-slate-500">إجمالي المتدربين</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600 tabular-nums">{totalPresent}</p>
                  <p className="text-xs text-slate-500">إجمالي الحضور</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <XCircleIcon className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-600 tabular-nums">{totalAbsent}</p>
                  <p className="text-xs text-slate-500">إجمالي الغياب</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600 tabular-nums">{noRecords}</p>
                  <p className="text-xs text-slate-500">بدون سجلات</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trainees List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                  </div>
                  <div className="h-6 w-12 bg-slate-200 rounded" />
                  <div className="h-6 w-12 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد نتائج</h3>
              <p className="text-sm text-slate-500">جرب البحث بمصطلح آخر</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {trainees.map((trainee, index) => (
                  <div key={trainee.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {trainee.photoUrl ? (
                          <img src={trainee.photoUrl} alt={trainee.nameAr} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <UserIcon className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">#{(pagination.page - 1) * pagination.limit + index + 1}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{trainee.nationalId}</p>
                        <p className="text-[11px] text-violet-600 font-medium mt-0.5 truncate">{trainee.program.nameAr}</p>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircleIcon className="w-3 h-3" />
                              {trainee.attendanceStats.present}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                              <XCircleIcon className="w-3 h-3" />
                              {trainee.attendanceStats.absent}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => router.push(`/dashboard/attendance-records/${trainee.id}`)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors">
                              <EyeIcon className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            <button onClick={() => window.open(`/print/attendance-record/${trainee.id}`, '_blank')} className="inline-flex items-center text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-1.5 transition-colors">
                              <PrinterIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
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
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">#</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الرقم القومي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 hidden lg:table-cell">البرنامج</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الحضور</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">الغياب</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trainees.map((trainee, index) => (
                      <tr key={trainee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {trainee.photoUrl ? (
                                <img src={trainee.photoUrl} alt={trainee.nameAr} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <UserIcon className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{trainee.nameAr}</p>
                              <p className="text-xs text-slate-400 truncate">{trainee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono">{trainee.nationalId}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{trainee.program.nameAr}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[36px] text-xs font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">{trainee.attendanceStats.present}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[36px] text-xs font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-100">{trainee.attendanceStats.absent}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => router.push(`/dashboard/attendance-records/${trainee.id}`)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors">
                              <EyeIcon className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            <button onClick={() => window.open(`/print/attendance-record/${trainee.id}`, '_blank')} className="inline-flex items-center text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-1.5 transition-colors">
                              <PrinterIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200">
                <Pagination
                  pagination={pagination}
                  onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}

