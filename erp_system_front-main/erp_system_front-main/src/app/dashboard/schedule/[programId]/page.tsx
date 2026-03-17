'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  UserGroupIcon,
  ArrowRightIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  classrooms: Classroom[];
}

export default function ProgramSchedulePage() {
  const params = useParams();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(`/programs/${programId}`);
        setProgram(data);
      } catch (error) {
        console.error('Error loading program:', error);
        toast.error('فشل تحميل البرنامج');
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusInfo = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return null;
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `يبدأ بعد ${days} يوم`, bg: 'bg-amber-50', textColor: 'text-amber-700', border: 'border-amber-100' };
    } else if (now > end) {
      return { text: 'انتهى', bg: 'bg-slate-50', textColor: 'text-slate-500', border: 'border-slate-100' };
    } else {
      const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `${days} يوم متبقي`, bg: 'bg-emerald-50', textColor: 'text-emerald-700', border: 'border-emerald-100' };
    }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader
            title="الفصول الدراسية"
            description="جاري التحميل..."
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
              { label: '...' },
            ]}
            actions={
              <Link href="/dashboard/schedule">
                <Button variant="outline" leftIcon={<ArrowRightIcon className="h-4 w-4" />}>
                  العودة للبرامج
                </Button>
              </Link>
            }
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                    <div className="space-y-2 flex-1"><div className="h-4 w-20 bg-slate-200 rounded" /><div className="h-3 w-32 bg-slate-100 rounded" /></div>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex gap-2"><div className="h-7 w-28 bg-slate-100 rounded-lg" /><div className="h-7 w-28 bg-slate-100 rounded-lg" /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  /* ─── Not found ─── */
  if (!program) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader
            title="البرنامج غير موجود"
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
            ]}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HomeModernIcon className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">البرنامج غير موجود</h3>
              <p className="text-sm text-slate-500 mb-5">تعذّر العثور على البرنامج المطلوب</p>
              <Link href="/dashboard/schedule">
                <Button variant="outline">العودة للبرامج</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={program.nameAr}
          description="اختر الفصل الدراسي لإدارة جدوله"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الجدول الدراسي', href: '/dashboard/schedule' },
            { label: program.nameAr },
          ]}
          actions={
            <Link href="/dashboard/schedule">
              <Button variant="outline" leftIcon={<ArrowRightIcon className="h-4 w-4" />}>
                العودة للبرامج
              </Button>
            </Link>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {program.classrooms && program.classrooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {program.classrooms.map(classroom => {
                const status = getStatusInfo(classroom.startDate, classroom.endDate);
                return (
                  <Link key={classroom.id} href={`/dashboard/schedule/${programId}/${classroom.id}`}>
                    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                      <div className="p-5">
                        {/* Header: number badge + name */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                            <span className="text-lg font-bold text-blue-600">{classroom.classNumber}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {classroom.name}
                            </h3>
                            {status && (
                              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${status.bg} ${status.textColor} border ${status.border}`}>
                                {status.text}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dates */}
                        {(classroom.startDate || classroom.endDate) && (
                          <>
                            <div className="h-px bg-slate-100 mb-3" />
                            <div className="flex flex-wrap gap-2">
                              {classroom.startDate && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                                  من: {formatDate(classroom.startDate)}
                                </span>
                              )}
                              {classroom.endDate && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-rose-50 text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-100">
                                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                                  إلى: {formatDate(classroom.endDate)}
                                </span>
                              )}
                            </div>
                          </>
                        )}

                        {/* Footer CTA */}
                        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-blue-500 transition-colors font-medium">
                            إدارة الجدول
                            <ChevronLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserGroupIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد فصول دراسية</h3>
                <p className="text-sm text-slate-500">قم بإضافة فصل دراسي لهذا البرنامج أولاً</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
