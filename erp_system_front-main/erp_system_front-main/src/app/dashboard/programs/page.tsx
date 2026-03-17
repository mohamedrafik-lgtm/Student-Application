'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilSquareIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  createdAt: string;
  _count: {
    trainees: number;
  };
}

/* ───── accent colors for program cards ───── */
const CARD_ACCENTS = [
  { border: 'border-t-blue-500', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  { border: 'border-t-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  { border: 'border-t-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  { border: 'border-t-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
  { border: 'border-t-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
  { border: 'border-t-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600' },
];

function ProgramsPageContent() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          const programsData = await fetchAPI('/programs');
          setPrograms(programsData || []);
        } catch (err) {
          setError('حدث خطأ أثناء تحميل البيانات');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isAuthenticated]);

  /* Close action menus when clicking outside */
  useEffect(() => {
    if (openMenuId === null) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  const handleDelete = async () => {
    if (!programToDelete) return;

    const originalPrograms = [...programs];
    const updatedPrograms = programs.filter(p => p.id !== programToDelete.id);
    setPrograms(updatedPrograms);

    try {
      await fetchAPI(`/programs/${programToDelete.id}`, { method: 'DELETE' });
      toast.success('تم حذف البرنامج بنجاح');
      setProgramToDelete(null);
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting program:', error);

      let errorMessage = 'فشل حذف البرنامج. يرجى المحاولة مرة أخرى.';

      if (error.message && error.message.includes('trainees associated')) {
        errorMessage =
          'لا يمكن حذف البرنامج التدريبي لأنه يحتوي على متدربين مسجلين. يرجى نقل المتدربين لبرنامج آخر أولاً أو إلغاء تسجيلهم.';
      } else if (error.data?.message) {
        if (error.data.message.includes('trainees') || error.data.message.includes('متدربين')) {
          errorMessage =
            'لا يمكن حذف البرنامج التدريبي لأنه يحتوي على متدربين مسجلين. يرجى نقل المتدربين لبرنامج آخر أولاً أو إلغاء تسجيلهم.';
        } else {
          errorMessage = error.data.message;
        }
      }

      toast.error(errorMessage);
      setPrograms(originalPrograms);
    }
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      const q = searchQuery.toLowerCase();
      return program.nameAr.toLowerCase().includes(q) || program.nameEn.toLowerCase().includes(q);
    });
  }, [searchQuery, programs]);

  /* ───── loading skeleton ───── */
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="إدارة البرامج"
          description="عرض وإدارة جميع البرامج التدريبية المتاحة."
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'البرامج' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* stat skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-6 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-slate-200 p-5 animate-pulse">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex gap-3">
                    <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                    <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                    <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const totalPrograms = programs.length;
  const programsThisYear = programs.filter(
    p => new Date(p.createdAt).getFullYear() === new Date().getFullYear(),
  ).length;
  const totalTraineesInPrograms = programs.reduce((acc, p) => acc + p._count.trainees, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة البرامج"
        description="عرض وإدارة جميع البرامج التدريبية المتاحة."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'البرامج' },
        ]}
        actions={
          <Link href="/dashboard/programs/new">
            <Button leftIcon={<PlusIcon className="w-4 h-4" />} className="text-sm px-4 py-2">
              إضافة برنامج جديد
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ─── Stats ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: BriefcaseIcon, label: 'إجمالي البرامج', value: totalPrograms, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: AcademicCapIcon, label: 'برامج هذا العام', value: programsThisYear, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: UserGroupIcon, label: 'إجمالي المسجلين', value: totalTraineesInPrograms, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Search bar ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                placeholder="ابحث عن برنامج بالاسم العربي أو الإنجليزي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            {searchQuery && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-200">
                  {filteredPrograms.length} نتيجة
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  مسح
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Programs card grid ─── */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                {searchQuery ? (
                  <MagnifyingGlassIcon className="w-7 h-7 text-slate-400" />
                ) : (
                  <AcademicCapIcon className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد برامج بعد'}
              </h3>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                {searchQuery
                  ? `لم يتم العثور على برامج تطابق "${searchQuery}"`
                  : 'ابدأ بإضافة أول برنامج تدريبي لمؤسستك.'}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/programs/new">
                  <Button leftIcon={<PlusIcon className="w-4 h-4" />} className="text-sm">
                    إضافة برنامج جديد
                  </Button>
                </Link>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  مسح البحث وعرض الكل
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((program, idx) => {
              const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
              const formattedPrice = program.price.toLocaleString('ar-EG', {
                style: 'currency',
                currency: 'EGP',
              });
              const formattedDate = new Date(program.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={program.id}
                  className={`group relative bg-white rounded-xl border border-slate-200 ${accent.border} border-t-[3px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}
                >
                  <div className="p-5">
                    {/* ── Header: icon + names + menu ── */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.iconBg}`}>
                        <AcademicCapIcon className={`w-5 h-5 ${accent.iconText}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{program.nameAr}</h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5" dir="ltr">
                          {program.nameEn}
                        </p>
                      </div>
                      {/* 3-dot menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === program.id ? null : program.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        {openMenuId === program.id && (
                          <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg border border-slate-200 shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <Link
                              href={`/print/program-report/${program.id}`}
                              target="_blank"
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <PrinterIcon className="w-4 h-4 text-slate-400" />
                              طباعة تقرير
                            </Link>
                            <Link
                              href={`/dashboard/programs/${program.id}/edit`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <PencilSquareIcon className="w-4 h-4 text-slate-400" />
                              تعديل البرنامج
                            </Link>
                            <button
                              onClick={() => {
                                setProgramToDelete(program);
                                setIsDeleteModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                            >
                              <TrashIcon className="w-4 h-4" />
                              حذف البرنامج
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Divider ── */}
                    <div className="h-px bg-slate-100 mb-4" />

                    {/* ── Stats pills ── */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                        <CurrencyDollarIcon className="w-3.5 h-3.5" />
                        {formattedPrice}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-100">
                        <UserGroupIcon className="w-3.5 h-3.5" />
                        {program._count.trainees} متدرب
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* ── Quick action buttons ── */}
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/programs/${program.id}/edit`} className="flex-1">
                        <button className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 transition-colors">
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                      </Link>
                      <Link href={`/print/program-report/${program.id}`} target="_blank" className="flex-1">
                        <button className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors">
                          <PrinterIcon className="w-3.5 h-3.5" />
                          تقرير
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal تأكيد الحذف */}
      <TibaModal
        open={isDeleteModalOpen && !!programToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        variant="danger"
        size="sm"
        title="تأكيد الحذف"
        subtitle={`حذف البرنامج: ${programToDelete?.nameAr}`}
        icon={<TrashIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              إلغاء
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">
              نعم، قم بالحذف
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          هل أنت متأكد أنك تريد حذف البرنامج{' '}
          <span className="font-bold text-slate-800">{programToDelete?.nameAr}</span>؟ سيتم حذف جميع المتدربين
          المسجلين فيه أيضًا.
        </p>
      </TibaModal>
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <PageGuard>
      <ProgramsPageContent />
    </PageGuard>
  );
}