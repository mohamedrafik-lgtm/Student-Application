'use client';

import { useState, useEffect, Fragment } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
  UsersIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface FailedSubject {
  content: { id: number; name: string; code: string };
  totalMarks: number;
  maxMarks: number;
  percentage: number;
}

interface SecondRoundStudent {
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl?: string;
    program: { id: number; nameAr: string; nameEn: string };
  };
  failedSubjects: FailedSubject[];
}

interface ClassroomSecondRound {
  classroom: { id: number; name: string };
  students: SecondRoundStudent[];
  totalStudents: number;
}

export default function SecondRoundPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades.second-round', action: 'manage' }}>
      <SecondRoundContent />
    </ProtectedPage>
  );
}

function SecondRoundContent() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: number; name: string }[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [data, setData] = useState<ClassroomSecondRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPrograms();
  }, []);

  // عند تغيير البرنامج → تحميل الفصول
  useEffect(() => {
    if (selectedProgram) {
      loadClassrooms(selectedProgram);
      // مسح البيانات السابقة
      setData([]);
      setHasSearched(false);
      setSelectedClassroom('all');
    }
  }, [selectedProgram]);

  const loadPrograms = async () => {
    try {
      const res = await fetchAPI('/training-programs');
      const arr = Array.isArray(res) ? res : (res?.programs || res?.data || []);
      setPrograms(arr);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحميل البرامج التدريبية');
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      setLoadingClassrooms(true);
      const program = await fetchAPI(`/programs/${programId}`);
      const arr = Array.isArray(program?.classrooms) ? program.classrooms : [];
      setClassrooms(arr);
    } catch (error: any) {
      console.error('Error loading classrooms:', error);
      setClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const loadData = async () => {
    if (!selectedProgram) {
      toast.error('يرجى اختيار البرنامج التدريبي أولاً');
      return;
    }
    try {
      setLoading(true);
      setHasSearched(true);
      const params = new URLSearchParams();
      params.append('programId', selectedProgram.toString());
      const result = await fetchAPI(`/grades/second-round?${params.toString()}`);

      // فلترة حسب الفصل الدراسي إذا تم اختياره
      let filtered = result;
      if (selectedClassroom !== 'all') {
        filtered = result.filter((c: ClassroomSecondRound) => c.classroom.id === parseInt(selectedClassroom));
      }

      setData(filtered);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (key: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // فلترة حسب البحث
  const filteredData = data.map((classroomData) => {
    if (!searchQuery.trim()) return classroomData;
    const q = searchQuery.trim().toLowerCase();
    const filteredStudents = classroomData.students.filter(
      (s) =>
        s.trainee.nameAr.toLowerCase().includes(q) ||
        s.trainee.nationalId.includes(q) ||
        s.failedSubjects.some((f) => f.content.name.toLowerCase().includes(q)),
    );
    return { ...classroomData, students: filteredStudents, totalStudents: filteredStudents.length };
  }).filter((c) => c.totalStudents > 0);

  // إحصائيات عامة
  const totalStudents = filteredData.reduce((sum, c) => sum + c.totalStudents, 0);
  const totalFailedSubjects = filteredData.reduce(
    (sum, c) => sum + c.students.reduce((s, st) => s + st.failedSubjects.length, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="رصد طلاب الدور الثاني"
        description="عرض المتدربين الذين لديهم مواد بنسبة أقل من 50% في كل فصل دراسي"
        actions={
          <Button variant="outline" onClick={() => setShowPrintModal(true)}>
            <PrinterIcon className="w-4 h-4 ml-2" />
            طباعة كشف الدور الثاني
          </Button>
        }
      />

      {/* Modal اختيار البرنامج والفصل للطباعة */}
      {showPrintModal && (
        <PrintModal
          programs={programs}
          onClose={() => setShowPrintModal(false)}
        />
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
                instanceId="sr-program-select"
                options={programs.map(p => ({ value: String(p.id), label: p.nameAr }))}
                value={selectedProgram ? String(selectedProgram) : ''}
                onChange={(val) => setSelectedProgram(val ? parseInt(val) : null)}
                placeholder="اختر البرنامج"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">الفصل الدراسي</label>
              <TibaSelect
                instanceId="sr-classroom-select"
                options={[
                  { value: 'all', label: 'جميع الفصول' },
                  ...classrooms.map(c => ({ value: String(c.id), label: c.name })),
                ]}
                value={selectedClassroom}
                onChange={(val) => setSelectedClassroom(val || 'all')}
                placeholder={loadingClassrooms ? 'جاري التحميل...' : 'اختر الفصل الدراسي'}
                disabled={!selectedProgram || loadingClassrooms}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadData} disabled={loading || !selectedProgram} fullWidth isLoading={loading}>
                {loading ? 'جاري التحميل...' : 'عرض طلاب الدور الثاني'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* بحث */}
      {hasSearched && data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي أو اسم المادة..."
              className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* إحصائيات */}
      {hasSearched && filteredData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">إجمالي الطلاب</p>
                <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">إجمالي المواد الراسبة</p>
                <p className="text-2xl font-bold text-slate-800">{totalFailedSubjects}</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <BookOpenIcon className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">فصول دراسية</p>
                <p className="text-2xl font-bold text-slate-800">{filteredData.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* عرض البيانات */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(j => <div key={j} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : !hasSearched ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">اختر البرنامج والفصل الدراسي ثم اضغط عرض</h3>
            <p className="text-sm text-slate-500">حدد البرنامج التدريبي والفصل الدراسي لعرض طلاب الدور الثاني</p>
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">{searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد طلاب لديهم مواد دور ثاني'}</h3>
            <p className="text-sm text-slate-500">{searchQuery ? 'جرّب تغيير كلمة البحث' : 'جميع المتدربين نجحوا بنسبة 50% أو أكثر في جميع المواد'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map((classroomData) => (
            <div key={classroomData.classroom.id}>
              {/* عنوان الفصل */}
              <div className="mb-3 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-800">{classroomData.classroom.name}</h2>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                  {classroomData.totalStudents} طالب
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {classroomData.students.map((student, index) => {
                    const key = `${classroomData.classroom.id}-${student.trainee.id}`;
                    const isExpanded = expandedStudents.has(key);
                    return (
                      <div key={key}>
                        <div className="p-4 cursor-pointer" onClick={() => toggleStudent(key)}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {index + 1}
                            </span>
                            {student.trainee.photoUrl ? (
                              <Image src={student.trainee.photoUrl} alt={student.trainee.nameAr} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{student.trainee.nameAr}</p>
                              <p className="text-xs text-slate-500">{student.trainee.nationalId}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {student.failedSubjects.length} مواد
                              </span>
                              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-2">
                            {student.failedSubjects.map((subject, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-red-50/50 border border-red-100 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-slate-700">{subject.content.name}</span>
                                </div>
                                <span className="text-xs font-bold text-red-600">{subject.percentage.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider w-12">#</th>
                        <th className="text-right py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">المتدرب</th>
                        <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">الرقم القومي</th>
                        <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">البرنامج</th>
                        <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider">عدد المواد الراسبة</th>
                        <th className="text-center py-3 px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classroomData.students.map((student, index) => {
                        const key = `${classroomData.classroom.id}-${student.trainee.id}`;
                        const isExpanded = expandedStudents.has(key);
                        return (
                          <Fragment key={key}>
                            <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleStudent(key)}>
                              <td className="py-3 px-4 text-center">
                                <span className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs mx-auto">
                                  {index + 1}
                                </span>
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
                              <td className="py-3 px-4 text-center text-sm text-slate-600 font-mono">{student.trainee.nationalId}</td>
                              <td className="py-3 px-4 text-center text-sm text-slate-600">{student.trainee.program.nameAr}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                  {student.failedSubjects.length} {student.failedSubjects.length === 1 ? 'مادة' : student.failedSubjects.length === 2 ? 'مادتان' : 'مواد'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform mx-auto ${isExpanded ? 'rotate-180' : ''}`} />
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="p-0">
                                  <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-600 mb-2">المواد الراسبة:</p>
                                    <div className="space-y-2">
                                      {student.failedSubjects.map((subject, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            <span className="text-sm font-medium text-slate-700">{subject.content.name}</span>
                                            {subject.content.code && <span className="text-xs text-slate-400">({subject.content.code})</span>}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">{subject.totalMarks} / {subject.maxMarks}</span>
                                            <span className="text-sm font-bold text-red-600">{subject.percentage.toFixed(1)}%</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// مكون Modal الطباعة مع اختيار البرنامج والفصل
function PrintModal({ programs, onClose }: { programs: Program[]; onClose: () => void }) {
  const [printProgramId, setPrintProgramId] = useState<number | null>(null);
  const [printClassroomId, setPrintClassroomId] = useState<string>('all');
  const [printClassrooms, setPrintClassrooms] = useState<{ id: number; name: string }[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  useEffect(() => {
    if (printProgramId) {
      loadClassrooms(printProgramId);
    } else {
      setPrintClassrooms([]);
      setPrintClassroomId('all');
    }
  }, [printProgramId]);

  const loadClassrooms = async (programId: number) => {
    try {
      setLoadingClassrooms(true);
      const program = await fetchAPI(`/programs/${programId}`);
      const arr = Array.isArray(program?.classrooms) ? program.classrooms : [];
      setPrintClassrooms(arr);
      setPrintClassroomId('all');
    } catch {
      setPrintClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const handlePrint = () => {
    if (!printProgramId) {
      toast.error('يرجى اختيار البرنامج أولاً');
      return;
    }
    const classroomParam = printClassroomId !== 'all' ? `?classroomId=${printClassroomId}` : '';
    window.open(`/print/second-round/${printProgramId}${classroomParam}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">طباعة كشف الدور الثاني</h3>
            <p className="text-xs text-slate-500 mt-0.5">اختر البرنامج والفصل الدراسي للطباعة</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">البرنامج التدريبي</label>
            <TibaSelect
              instanceId="print-sr-program-select"
              options={programs.map(p => ({ value: String(p.id), label: p.nameAr }))}
              value={printProgramId ? String(printProgramId) : ''}
              onChange={(val) => setPrintProgramId(val ? parseInt(val) : null)}
              placeholder="اختر البرنامج"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">الفصل الدراسي</label>
            <TibaSelect
              instanceId="print-sr-classroom-select"
              options={[
                { value: 'all', label: 'جميع الفصول' },
                ...printClassrooms.map(c => ({ value: String(c.id), label: c.name })),
              ]}
              value={printClassroomId}
              onChange={(val) => setPrintClassroomId(val || 'all')}
              placeholder={loadingClassrooms ? 'جاري التحميل...' : 'اختر الفصل الدراسي'}
              disabled={!printProgramId || loadingClassrooms}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handlePrint}>
            <PrinterIcon className="w-4 h-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>
    </div>
  );
}
