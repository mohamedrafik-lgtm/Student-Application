'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CubeIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LinkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyMaterials,
  type StudyMaterial,
} from '@/lib/study-materials-api';
import { fetchAPI } from '@/lib/api';
import ProtectedPage from '@/components/permissions/ProtectedPage';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

export default function StudyMaterialDeliveriesPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadMaterials();
    }
  }, [selectedProgram, searchQuery]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI('/training-programs');
      const programsData = Array.isArray(response) ? response : (response.data || response.programs || []);
      setPrograms(programsData);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('فشل تحميل البرامج التدريبية');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const response = await getStudyMaterials({
        programId: selectedProgram!.id,
        search: searchQuery,
        isActive: true,
      });
      setMaterials(response.materials);
    } catch (error: any) {
      console.error('Error loading materials:', error);
      toast.error('فشل تحميل الأدوات الدراسية');
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setSearchQuery('');
    setSearchInput('');
  };

  const handleBack = () => {
    setSelectedProgram(null);
    setMaterials([]);
    setSearchQuery('');
    setSearchInput('');
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleMaterialClick = (material: StudyMaterial) => {
    router.push(`/dashboard/study-materials/deliveries/${material.id}`);
  };

  return (
    <ProtectedPage permission={{ page: 'dashboard.study-materials', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={selectedProgram ? `تسليم الأدوات - ${selectedProgram.nameAr}` : 'تسليم الأدوات الدراسية'}
          description={selectedProgram ? 'اختر الأداة الدراسية لبدء عملية التسليم' : 'اختر البرنامج التدريبي لعرض الأدوات الدراسية'}
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'الأدوات الدراسية', href: '/dashboard/study-materials' },
            { label: 'التسليم' },
          ]}
          actions={
            selectedProgram ? (
              <Button onClick={handleBack} variant="outline" size="sm" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
                رجوع للبرامج
              </Button>
            ) : undefined
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {!selectedProgram ? (
            /* Programs Grid */
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 w-32 bg-slate-200 rounded" /><div className="h-3 w-24 bg-slate-100 rounded" /></div></div>
                  </div>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AcademicCapIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد برامج تدريبية</h3>
                <p className="text-sm text-slate-500">لم يتم العثور على أي برامج تدريبية متاحة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => handleProgramSelect(program)}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-right hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <ArrowLeftIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {program.nameAr}
                    </h3>
                    {program.nameEn && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{program.nameEn}</p>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            /* Materials Section */
            <>
              {/* Search */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="ابحث في الأدوات الدراسية..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full py-2.5 pr-10 pl-4 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {searchQuery && (
                    <button onClick={handleClearSearch} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium px-3 transition-colors">
                      <XMarkIcon className="w-3.5 h-3.5" /> مسح
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 bg-slate-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 w-32 bg-slate-200 rounded" /><div className="h-3 w-20 bg-slate-100 rounded" /></div></div>
                      <div className="h-16 bg-slate-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : materials.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-16 px-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CubeIcon className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5">
                    {searchQuery ? 'لا توجد نتائج تطابق البحث' : 'لا توجد أدوات دراسية لهذا البرنامج'}
                  </h3>
                  <p className="text-sm text-slate-500">جرب البحث بكلمة مختلفة أو ارجع لاختيار برنامج آخر</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => handleMaterialClick(material)}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-right hover:border-emerald-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <CubeIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <ArrowLeftIcon className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors mb-0.5">
                        {material.name}
                      </h3>
                      {material.nameEn && (
                        <p className="text-xs text-slate-400 mb-3 truncate">{material.nameEn}</p>
                      )}

                      {material.linkedFee ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5 mb-3">
                          <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">يتطلب سداد: {material.linkedFee.name} ({material.linkedFee.amount} ج.م)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 mb-3">
                          <CheckCircleIcon className="w-3 h-3 flex-shrink-0" />
                          <span>مجاني - لا يتطلب سداد رسوم</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          الكمية: <span className="font-bold text-blue-600">{material.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                          تم التسليم: <span className="font-bold text-slate-700">{material._count?.deliveries || 0}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
