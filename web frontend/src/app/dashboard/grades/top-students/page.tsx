'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { getTopStudentsByClassroom, ClassroomTopStudents } from '@/lib/top-students-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  TrophyIcon,
  UserIcon,
  PrinterIcon,
  XMarkIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

export default function TopStudentsPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades', action: 'view' }}>
      <TopStudentsContent />
    </ProtectedPage>
  );
}

function TopStudentsContent() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [topStudentsData, setTopStudentsData] = useState<ClassroomTopStudents[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printProgramId, setPrintProgramId] = useState<number | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadTopStudents();
    }
  }, [selectedProgram, limit]);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/training-programs');
      const programsArray = Array.isArray(data) ? data : (data?.programs || data?.data || []);
      setPrograms(programsArray);
      if (programsArray.length > 0) {
        setSelectedProgram(programsArray[0].id);
      }
    } catch (error: any) {
      console.error('Error loading programs:', error);
      toast.error(error.message || 'حدث خطأ في تحميل البرامج التدريبية');
    }
  };

  const loadTopStudents = async () => {
    try {
      setLoading(true);
      const data = await getTopStudentsByClassroom(selectedProgram || undefined, limit);
      setTopStudentsData(data);
    } catch (error: any) {
      console.error('Error loading top students:', error);
      toast.error(error.message || 'حدث خطأ في تحميل الأوائل');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-yellow-500 text-white';
    if (index === 1) return 'bg-gray-400 text-white';
    if (index === 2) return 'bg-orange-500 text-white';
    return 'bg-blue-600 text-white';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="رصد الأوائل"
        description="عرض الطلاب المتفوقين في كل فصل دراسي وبرنامج تدريبي"
        actions={
          <Button variant="outline" onClick={() => setShowPrintModal(true)}>
            <PrinterIcon className="w-4 h-4 ml-2" />
            طباعة كشف الأوائل
          </Button>
        }
      />

      {/* Modal اختيار البرنامج للطباعة */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPrintModal(false)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">اختر البرنامج للطباعة</h3>
                <p className="text-xs text-slate-500 mt-0.5">سيتم طباعة كشف أوائل البرنامج المحدد</p>
              </div>
              <button onClick={() => { setShowPrintModal(false); setPrintProgramId(null); }} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">البرنامج التدريبي</label>
                <TibaSelect
                  instanceId="print-program-select"
                  options={programs.map(p => ({ value: String(p.id), label: p.nameAr }))}
                  value={printProgramId ? String(printProgramId) : ''}
                  onChange={(val) => setPrintProgramId(val ? parseInt(val) : null)}
                  placeholder="اختر البرنامج"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowPrintModal(false); setPrintProgramId(null); }}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (printProgramId) {
                    window.open(`/print/top-students/${printProgramId}`, '_blank');
                    setShowPrintModal(false);
                    setPrintProgramId(null);
                  } else {
                    toast.error('يرجى اختيار البرنامج أولاً');
                  }
                }}
              >
                <PrinterIcon className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <h3 className="text-sm font-semibold text-slate-700">تصفية النتائج</h3>
        </div>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">البرنامج التدريبي</label>
              <TibaSelect
                instanceId="filter-program-select"
                options={programs.map(p => ({ value: String(p.id), label: p.nameAr }))}
                value={selectedProgram ? String(selectedProgram) : ''}
                onChange={(val) => setSelectedProgram(val ? parseInt(val) : null)}
                placeholder="اختر البرنامج"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">عدد الأوائل</label>
              <TibaSelect
                instanceId="limit-select"
                options={[
                  { value: '5', label: '5 متدربين' },
                  { value: '10', label: '10 متدربين' },
                  { value: '20', label: '20 متدرب' },
                ]}
                value={String(limit)}
                onChange={(val) => setLimit(parseInt(val) || 10)}
                placeholder="عدد الأوائل"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadTopStudents} disabled={loading} fullWidth isLoading={loading}>
                {loading ? 'جاري التحميل...' : 'عرض الأوائل'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* عرض الأوائل */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : topStudentsData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrophyIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">لا توجد بيانات للعرض</h3>
            <p className="text-sm text-slate-500">اختر برنامجاً تدريبياً للبدء</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {topStudentsData.map((classroomData) => (
            <div key={classroomData.classroom.id}>
              {/* عنوان الفصل */}
              <div className="mb-3 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-800">{classroomData.classroom.name}</h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {classroomData.topStudents.length} متدرب
                </span>
              </div>

              {/* الأوائل */}
              {classroomData.topStudents.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <p className="text-center text-sm text-slate-500">لا توجد درجات مسجلة في هذا الفصل</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Mobile View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {classroomData.topStudents.map((student, index) => (
                      <div key={student.trainee.id} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`w-8 h-8 rounded-full ${getRankBadge(index)} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                            {index + 1}
                          </span>
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                            {student.trainee.photoUrl ? (
                              <Image src={student.trainee.photoUrl} alt={student.trainee.nameAr} fill className="object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-full">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{student.trainee.nameAr}</p>
                            <p className="text-xs text-slate-500">{student.trainee.nationalId}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold text-blue-600">{student.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mr-11">
                          <span>{student.trainee.program.nameAr}</span>
                          <span>{student.subjectsCount} مادة</span>
                          <span>{student.totalMarks.toFixed(1)} / {student.maxMarks.toFixed(1)}</span>
                        </div>
                        <div className="mt-2 mr-11 w-full max-w-[200px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(student.percentage, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider w-20">الترتيب</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">المتدرب</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">الرقم القومي</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">البرنامج</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">عدد المواد</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">المجموع</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">النسبة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classroomData.topStudents.map((student, index) => (
                          <tr key={student.trainee.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`w-9 h-9 rounded-full ${getRankBadge(index)} flex items-center justify-center font-bold text-sm shadow-sm`}>
                                  {index + 1}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-slate-200">
                                  {student.trainee.photoUrl ? (
                                    <Image src={student.trainee.photoUrl} alt={student.trainee.nameAr} fill className="object-cover rounded-full" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-full">
                                      <UserIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-slate-800 text-sm">{student.trainee.nameAr}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{student.trainee.nationalId}</td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{student.trainee.program.nameAr}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                                {student.subjectsCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-sm">
                              <span className="font-bold text-blue-600">{student.totalMarks.toFixed(1)}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-slate-500">{student.maxMarks.toFixed(1)}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="text-base font-bold text-blue-600">{student.percentage.toFixed(1)}%</span>
                                <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(student.percentage, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
