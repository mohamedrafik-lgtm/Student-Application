'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DataTable } from '@/app/components/ui/DataTable';

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

interface Session {
  id: number;
  title: string;
  type: string;
  date: string;
  chapter: number;
}

interface AttendanceRecord {
  sessionId: number;
  sessionTitle: string;
  sessionType: string;
  sessionDate: string;
  sessionChapter: number;
  status: string;
  notes?: string;
  recordedAt?: string;
  recordedBy?: {
    id: string;
    name: string;
  };
}

interface Trainee {
  id: number;
  nameAr?: string;
  nameEn?: string;
  nationalId: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  attendanceRecords: AttendanceRecord[];
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    notRecorded: number;
  };
  attendanceRate: number;
}

export default function CourseAttendancePage() {
  const params = useParams();
  const courseId = params.id as string;

  const [content, setContent] = useState<TrainingContent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    fetchData(1);
  }, [courseId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      const url = `/training-contents/${courseId}/attendance?page=${page}&limit=20${searchQuery ? `&search=${searchQuery}` : ''}`;
      const data = await fetchAPI(url);
      setContent(data.content);
      setSessions(data.sessions || []);
      setTrainees(data.trainees || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !content) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      PRESENT: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'حاضر' },
      ABSENT: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon, label: 'غائب' },
      LATE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'حاضر' }, // متأخر = حاضر
      EXCUSED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon, label: 'غائب' }, // معذور = غائب
      NOT_RECORDED: { bg: 'bg-gray-100', text: 'text-gray-600', icon: CalendarIcon, label: 'لم يُسجل' },
    };

    const config = configs[status as keyof typeof configs] || configs.NOT_RECORDED;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      header: '#',
      accessor: (row: Trainee) => {
        const index = trainees.indexOf(row);
        return <div className="font-semibold text-gray-900">{index + 1}</div>;
      },
    },
    {
      header: 'المتدرب',
      accessor: (row: Trainee) => (
        <div className="flex items-center gap-3">
          {row.photoUrl ? (
            <img
              src={row.photoUrl}
              alt={row.nameAr || row.nameEn || ''}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{row.nameAr || row.nameEn || 'غير محدد'}</p>
            <p className="text-xs text-gray-500">{row.nationalId}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'إجمالي الجلسات',
      accessor: (row: Trainee) => (
        <span className="font-semibold text-gray-900">{row.stats.total}</span>
      ),
    },
    {
      header: 'حاضر',
      accessor: (row: Trainee) => (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
          {row.stats.present}
        </span>
      ),
    },
    {
      header: 'غائب',
      accessor: (row: Trainee) => (
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-semibold">
          {row.stats.absent}
        </span>
      ),
    },
    {
      header: 'نسبة الحضور',
      accessor: (row: Trainee) => {
        const rate = row.attendanceRate;
        const color = rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-blue-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600';
        return (
          <span className={`text-2xl font-bold ${color}`}>
            {rate.toFixed(1)}%
          </span>
        );
      },
    },
    {
      header: 'الإجراءات',
      accessor: (row: Trainee) => (
        <button
          onClick={() => setSelectedTrainee(row)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          عرض التفاصيل
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">سجل الحضور والغياب</h1>
            <p className="text-blue-100">{content.name} - {content.code}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-100">عدد الجلسات</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-100">عدد المتدربين</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {pagination.total > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن متدرب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-gray-900"
            />
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {trainees.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد بيانات حضور</h3>
            <p className="text-gray-600">لا يوجد متدربون أو جلسات مسجلة بعد</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={trainees}
            keyField="id"
            emptyMessage="لا توجد بيانات"
          />
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-600">
            عرض <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> إلى{' '}
            <span className="font-semibold text-gray-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            من <span className="font-semibold text-gray-900">{pagination.total}</span> متدرب
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              السابق
            </button>

            <div className="flex items-center gap-1">
              {pagination.page > 2 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    1
                  </button>
                  {pagination.page > 3 && <span className="px-2">...</span>}
                </>
              )}

              {pagination.page > 1 && (
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {pagination.page - 1}
                </button>
              )}

              <button className="w-10 h-10 bg-blue-600 text-white rounded-lg font-semibold">
                {pagination.page}
              </button>

              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {pagination.page + 1}
                </button>
              )}

              {pagination.page < pagination.totalPages - 1 && (
                <>
                  {pagination.page < pagination.totalPages - 2 && <span className="px-2">...</span>}
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Trainee Details Modal */}
      {selectedTrainee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                {selectedTrainee.photoUrl ? (
                  <img
                    src={selectedTrainee.photoUrl}
                    alt={selectedTrainee.nameAr || selectedTrainee.nameEn || ''}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTrainee.nameAr || selectedTrainee.nameEn || 'غير محدد'}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedTrainee.nationalId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrainee(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">إجمالي الجلسات</p>
                  <p className="text-2xl font-bold text-gray-700">{selectedTrainee.stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">حاضر</p>
                  <p className="text-2xl font-bold text-green-700">{selectedTrainee.stats.present}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600 mb-1">غائب</p>
                  <p className="text-2xl font-bold text-red-700">{selectedTrainee.stats.absent}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">نسبة الحضور</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedTrainee.attendanceRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Attendance Records */}
              <h4 className="text-lg font-bold text-gray-900 mb-4">سجل الجلسات</h4>
              <div className="space-y-3">
                {selectedTrainee.attendanceRecords.map((record) => (
                  <div
                    key={record.sessionId}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-gray-900">{record.sessionTitle}</h5>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            الباب {record.sessionChapter}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {record.sessionType === 'THEORY' ? 'نظري' : 'عملي'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(record.sessionDate).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mt-2">
                            <span className="font-medium">ملاحظات:</span> {record.notes}
                          </p>
                        )}
                        {record.recordedBy && (
                          <p className="text-xs text-gray-500 mt-2">
                            سجل بواسطة: {record.recordedBy.name} - {new Date(record.recordedAt!).toLocaleString('ar-EG')}
                          </p>
                        )}
                      </div>
                      <div>
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


