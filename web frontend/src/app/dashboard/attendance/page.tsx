'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { AcademicCapIcon, ChevronLeftIcon, UsersIcon } from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  _count: {
    classrooms: number;
  };
}

const CARD_ACCENTS = [
  'border-t-blue-500',
  'border-t-emerald-500',
  'border-t-violet-500',
  'border-t-amber-500',
  'border-t-rose-500',
  'border-t-teal-500',
];

export default function AttendancePage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/programs');
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('فشل تحميل البرامج التدريبية');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="رصد الحضور والغياب"
          description="اختر البرنامج التدريبي لعرض الفصول وتسجيل الحضور"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور' }
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-28" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title="رصد الحضور والغياب"
          description="اختر البرنامج التدريبي لعرض الفصول وتسجيل الحضور"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور' }
          ]}
        />

        {programs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد برامج تدريبية</h3>
              <p className="text-sm text-slate-500">لا توجد برامج متاحة حالياً</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program, idx) => (
              <div
                key={program.id}
                onClick={() => router.push(`/dashboard/attendance/${program.id}`)}
                className={`bg-white rounded-xl border border-slate-200 border-t-4 ${CARD_ACCENTS[idx % CARD_ACCENTS.length]} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AcademicCapIcon className="w-5 h-5 text-white" />
                    </div>
                    <ChevronLeftIcon className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1.5 line-clamp-1">
                    {program.nameAr}
                  </h3>
                  
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                    {program.description || 'لا يوجد وصف'}
                  </p>

                  <div className="flex items-center pt-3 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      <UsersIcon className="w-3.5 h-3.5" />
                      {program._count.classrooms} فصل دراسي
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
