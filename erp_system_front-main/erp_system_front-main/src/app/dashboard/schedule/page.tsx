'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  classrooms: Array<{
    id: number;
    name: string;
  }>;
}

const CARD_ACCENTS = [
  { border: 'border-t-blue-500', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  { border: 'border-t-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
  { border: 'border-t-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  { border: 'border-t-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
  { border: 'border-t-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
];

export default function SchedulePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI('/programs');
        setPrograms(data || []);
      } catch (error) {
        console.error('Error loading programs:', error);
        toast.error('فشل تحميل البرامج التدريبية');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.schedule', action: 'view' }}>
        <div className="space-y-6">
          <PageHeader
            title="الجدول الدراسي"
            description="اختر البرنامج التدريبي لإدارة الجداول الدراسية"
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'الجدول الدراسي' },
            ]}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 border-t-[3px] border-t-slate-200 p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 mb-3" />
                  <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                </div>
              ))}
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
          title="الجدول الدراسي"
          description="اختر البرنامج التدريبي لإدارة الجداول الدراسية"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الجدول الدراسي' },
          ]}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {programs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AcademicCapIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد برامج تدريبية</h3>
                <p className="text-sm text-slate-500">قم بإضافة برنامج تدريبي أولاً لإنشاء الجداول</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((program, idx) => {
                const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                return (
                  <Link key={program.id} href={`/dashboard/schedule/${program.id}`}>
                    <div className={`group relative bg-white rounded-xl border border-slate-200 ${accent.border} border-t-[3px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}>
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.iconBg}`}>
                            <AcademicCapIcon className={`w-5 h-5 ${accent.iconText}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {program.nameAr}
                            </h3>
                            <p className="text-xs text-slate-400 truncate mt-0.5" dir="ltr">
                              {program.nameEn}
                            </p>
                          </div>
                        </div>

                        {program.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{program.description}</p>
                        )}

                        <div className="h-px bg-slate-100 mb-3" />

                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-100">
                            <BuildingOfficeIcon className="w-3.5 h-3.5" />
                            {program.classrooms?.length || 0} فصل
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            عرض الجدول
                            <ChevronLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
