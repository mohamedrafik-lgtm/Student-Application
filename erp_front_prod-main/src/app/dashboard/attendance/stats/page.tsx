'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';

interface TraineeStats {
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
  };
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export default function AttendanceStatsPage() {
  const [stats, setStats] = useState<TraineeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<number | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadClassrooms(selectedProgram);
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedClassroom) {
      loadContents(selectedClassroom);
    }
  }, [selectedClassroom]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/programs');
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('فشل تحميل البرامج');
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      const data = await fetchAPI(`/programs/${programId}`);
      setClassrooms(data.classrooms || []);
      setSelectedClassroom(null);
      setContents([]);
      setSelectedContent(null);
    } catch (error) {
      console.error('Error loading classrooms:', error);
      toast.error('فشل تحميل الفصول');
    }
  };

  const loadContents = async (classroomId: number) => {
    try {
      const data = await fetchAPI(`/training-content?classroomId=${classroomId}`);
      setContents(data || []);
      setSelectedContent(null);
    } catch (error) {
      console.error('Error loading contents:', error);
      toast.error('فشل تحميل المواد');
    }
  };

  const loadStats = async () => {
    if (!selectedContent) {
      toast.error('يرجى اختيار المادة');
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement backend endpoint for content attendance stats
      toast.info('جاري تنفيذ هذه الميزة...');
      setStats([]);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const programOptions = programs.map(p => ({ value: p.id, label: p.nameAr }));
  const classroomOptions = classrooms.map(c => ({ value: c.id, label: c.name }));
  const contentOptions = contents.map(c => ({ value: c.id, label: c.name }));

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'stats' }}>
      <div className="space-y-6">
        <PageHeader
          title="تقارير الحضور والغياب"
          description="عرض إحصائيات الحضور للمتدربين"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور', href: '/dashboard/attendance' },
            { label: 'التقارير' }
          ]}
        />

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-violet-500">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TibaSelect
                label="البرنامج التدريبي"
                options={programOptions}
                value={selectedProgram || ''}
                onChange={(val) => setSelectedProgram(val || null)}
                placeholder="اختر البرنامج"
                icon={<AcademicCapIcon className="w-4 h-4" />}
                isSearchable
                isClearable
                instanceId="stats-program"
              />

              <TibaSelect
                label="الفصل الدراسي"
                options={classroomOptions}
                value={selectedClassroom || ''}
                onChange={(val) => setSelectedClassroom(val || null)}
                placeholder="اختر الفصل"
                icon={<BuildingOfficeIcon className="w-4 h-4" />}
                isSearchable
                isClearable
                instanceId="stats-classroom"
                disabled={!selectedProgram}
              />

              <TibaSelect
                label="المادة"
                options={contentOptions}
                value={selectedContent || ''}
                onChange={(val) => setSelectedContent(val || null)}
                placeholder="اختر المادة"
                icon={<BookOpenIcon className="w-4 h-4" />}
                isSearchable
                isClearable
                instanceId="stats-content"
                disabled={!selectedClassroom}
              />
            </div>

            <div className="mt-4">
              <Button
                onClick={loadStats}
                disabled={!selectedContent}
                size="sm"
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              >
                عرض الإحصائيات
              </Button>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 text-xs">إجمالي المتدربين</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><UserIcon className="w-4 h-4 text-blue-600" /></div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 text-xs">متوسط الحضور</span>
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" /></div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {Math.round(stats.reduce((acc, s) => acc + s.attendanceRate, 0) / stats.length)}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 text-xs">أعلى حضور</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><ArrowTrendingUpIcon className="w-4 h-4 text-blue-600" /></div>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.max(...stats.map(s => s.attendanceRate))}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-red-500">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 text-xs">أقل حضور</span>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowTrendingDownIcon className="w-4 h-4 text-red-600" /></div>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {Math.min(...stats.map(s => s.attendanceRate))}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trainees Stats Table */}
        {stats.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900 mb-4">إحصائيات المتدربين</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">#</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الاسم</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">المجموع</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">حاضر</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">غائب</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">متأخر</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">بعذر</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">نسبة الحضور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.map((stat, index) => (
                      <tr key={stat.trainee.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-700">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{stat.trainee.nameAr}</p>
                            <p className="text-xs text-slate-500">{stat.trainee.nationalId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                          {stat.totalSessions}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                            {stat.present}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                            {stat.absent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                            {stat.late}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                            {stat.excused}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            stat.attendanceRate >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : stat.attendanceRate >= 60
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {stat.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-violet-50 rounded-full flex items-center justify-center mx-auto mb-4"><ChartBarIcon className="w-7 h-7 text-slate-400" /></div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">اختر المادة لعرض الإحصائيات</h3>
              <p className="text-sm text-slate-500">قم باختيار البرنامج والفصل والمادة من الأعلى</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}


