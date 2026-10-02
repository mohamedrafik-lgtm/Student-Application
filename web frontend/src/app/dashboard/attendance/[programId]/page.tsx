'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  _count: {
    trainingContents: number;
  };
}

interface Program {
  id: number;
  nameAr: string;
  classrooms: Classroom[];
}

const CARD_ACCENTS = [
  'border-t-emerald-500',
  'border-t-blue-500',
  'border-t-violet-500',
  'border-t-amber-500',
  'border-t-rose-500',
  'border-t-teal-500',
];

export default function ProgramClassroomsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgram();
  }, [programId]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/programs/${programId}`);
      setProgram(data);
    } catch (error) {
      console.error('Error loading program:', error);
      toast.error('فشل تحميل البرنامج');
    } finally {
      setLoading(false);
    }
  };

  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="..." description="جاري التحميل..." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }, { label: '...' }]} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 bg-slate-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-200 rounded w-36" /><div className="h-3 bg-slate-100 rounded w-24" /></div></div>
              <div className="space-y-2 pt-3 border-t border-slate-100"><div className="h-3 bg-slate-100 rounded w-full" /><div className="h-3 bg-slate-100 rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <PageHeader title="البرنامج غير موجود" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }]} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><BuildingOfficeIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-3">البرنامج غير موجود</h3>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/attendance')} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>العودة للبرامج</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={program.nameAr}
          description="اختر الفصل الدراسي لعرض المواد وتسجيل الحضور"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور', href: '/dashboard/attendance' },
            { label: program.nameAr }
          ]}
        />

        {program.classrooms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><BuildingOfficeIcon className="w-7 h-7 text-slate-400" /></div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد فصول دراسية</h3>
              <p className="text-sm text-slate-500">لا توجد فصول متاحة في هذا البرنامج</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {program.classrooms.map((classroom, idx) => {
              const remainingDays = getRemainingDays(classroom.endDate);
              const isExpired = remainingDays !== null && remainingDays < 0;
              return (
                <div key={classroom.id} onClick={() => router.push(`/dashboard/attendance/${programId}/${classroom.id}`)} className={`bg-white rounded-xl border border-slate-200 border-t-4 ${CARD_ACCENTS[idx % CARD_ACCENTS.length]} shadow-sm hover:shadow-md transition-all cursor-pointer group ${isExpired ? 'opacity-60' : ''}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">{classroom.classNumber}</span></div>
                      <ChevronLeftIcon className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 line-clamp-1">{classroom.name}</h3>
                    {classroom.startDate && classroom.endDate && (
                      <div className="space-y-1.5 mb-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center justify-between text-xs"><span className="text-slate-500 flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" />البداية</span><span className="font-medium text-slate-700">{new Date(classroom.startDate).toLocaleDateString('ar-EG')}</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="text-slate-500 flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" />النهاية</span><span className="font-medium text-slate-700">{new Date(classroom.endDate).toLocaleDateString('ar-EG')}</span></div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100"><BookOpenIcon className="w-3.5 h-3.5" />{classroom._count?.trainingContents || 0} مادة</span>
                      {remainingDays !== null && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${isExpired ? 'bg-rose-50 text-rose-700 border-rose-100' : remainingDays <= 30 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}><ClockIcon className="w-3 h-3" />{isExpired ? 'منتهي' : `${remainingDays} يوم`}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

