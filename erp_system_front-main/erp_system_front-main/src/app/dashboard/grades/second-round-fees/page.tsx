'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import PageHeader from '@/app/components/PageHeader';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { getFeeTypeLabel, getFeeTypeFullLabel } from '@/lib/translations';
import { TibaSelect } from '@/app/components/ui/Select';
import {
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CheckIcon,
  CheckCircleIcon,
  UsersIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  CreditCardIcon,
  CalendarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

/* ─── الأنواع ─── */
interface FailedSubject {
  content: { id: number; name: string; code: string };
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  appliedFees: any[];
  isApplied: boolean;
}

interface SecondRoundStudent {
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl: string | null;
    program: { id: number; nameAr: string; nameEn: string };
  };
  failedSubjects: FailedSubject[];
}

interface ClassroomGroup {
  classroom: { id: number; name: string };
  students: SecondRoundStudent[];
  totalStudents: number;
}

interface Fee {
  id: number;
  name: string;
  amount: number;
  type: string;
  academicYear: string;
  allowMultipleApply: boolean;
  safeId: string;
  safeName: string;
  appliedCount: number;
  appliedTotalAmount: number;
}

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Classroom {
  id: number;
  name: string;
}

/* ─── أيقونة ولون حسب نوع القيد ─── */
const feeTypeIcon: Record<string, typeof CurrencyDollarIcon> = {
  TUITION: BookOpenIcon,
  SERVICES: ShieldCheckIcon,
  TRAINING: ArrowTrendingUpIcon,
  ADDITIONAL: CreditCardIcon,
};
const feeTypeBadge: Record<string, string> = {
  TUITION: 'bg-blue-100 text-blue-700 border-blue-200',
  SERVICES: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  TRAINING: 'bg-violet-100 text-violet-700 border-violet-200',
  ADDITIONAL: 'bg-amber-100 text-amber-700 border-amber-200',
};

const getFeeDescription = (type: string): string => {
  switch (type) {
    case 'TUITION':
      return 'قيد مالي يُطبق على الرسوم الدراسية الأساسية للمتدرب. يتم خصمه من الخزينة المرتبطة عند التطبيق على كل مادة راسب فيها.';
    case 'SERVICES':
      return 'قيد خدمات يغطي رسوم الخدمات الإضافية المقدمة للمتدرب مثل المكتبة والمختبرات والأنشطة.';
    case 'TRAINING':
      return 'قيد تدريبي يُطبق على رسوم التدريب العملي أو الميداني. يشمل تكاليف المواد والأدوات التدريبية.';
    case 'ADDITIONAL':
      return 'قيد إضافي يُطبق على الرسوم التكميلية أو الإضافية غير المشمولة في الرسوم الأساسية.';
    default:
      return 'قيد مالي يُطبق على طلاب الدور الثاني لكل مادة راسب فيها المتدرب.';
  }
};

/* ═══════════════════════════════════════════
   مكوّن Combobox القيود المالية (بحث + قائمة)
   ═══════════════════════════════════════════ */
function FeeCombobox({
  fees,
  selectedFee,
  onSelect,
}: {
  fees: Fee[];
  selectedFee: Fee | null;
  onSelect: (fee: Fee | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق عند النقر خارج
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = fees.filter(f => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      getFeeTypeLabel(f.type).includes(q) ||
      getFeeTypeFullLabel(f.type).includes(q) ||
      f.amount.toString().includes(q) ||
      f.academicYear?.includes(q)
    );
  });

  return (
    <div ref={ref} className="relative">
      {/* حقل الإدخال */}
      <div
        className={`flex items-center border rounded-xl bg-white transition-colors cursor-pointer ${
          open ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400'
        }`}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center flex-1 px-3 py-2.5 gap-2">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {open ? (
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث في القيود المالية..."
              className="flex-1 text-sm outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <span className={`flex-1 text-sm truncate ${selectedFee ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {selectedFee ? (
                <span className="flex items-center gap-2">
                  {selectedFee.name}
                  <span className="text-xs text-slate-500">— {selectedFee.amount.toLocaleString()} جنيه</span>
                </span>
              ) : (
                'كل القيود المالية'
              )}
            </span>
          )}
        </div>
        {selectedFee && (
          <button
            onClick={e => {
              e.stopPropagation();
              onSelect(null);
              setQuery('');
            }}
            className="px-2 py-1 mx-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
        <div className="px-2 py-1 border-r border-slate-200">
          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* القائمة المنسدلة */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-auto">
          {/* خيار "كل القيود" */}
          <div
            className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 ${
              !selectedFee ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'
            }`}
            onClick={() => {
              onSelect(null);
              setQuery('');
              setOpen(false);
            }}
          >
            <span className="text-sm">كل القيود المالية</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <MagnifyingGlassIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">لا توجد قيود تطابق البحث</p>
            </div>
          ) : (
            filtered.map(fee => {
              const Icon = feeTypeIcon[fee.type] || CreditCardIcon;
              const badge = feeTypeBadge[fee.type] || feeTypeBadge.ADDITIONAL;
              const isSelected = selectedFee?.id === fee.id;

              return (
                <div
                  key={fee.id}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onSelect(fee);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className={`text-sm ${isSelected ? 'font-bold text-blue-700' : 'font-medium text-slate-900'}`}>
                          {fee.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-bold border ${badge}`}>
                            {getFeeTypeLabel(fee.type)}
                          </span>
                          {fee.academicYear && (
                            <span className="text-[10px] text-slate-400">{fee.academicYear}</span>
                          )}
                          {fee.appliedCount > 0 && (
                            <span className="text-[10px] text-green-600 font-medium">
                              ({fee.appliedCount} تطبيق)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">{fee.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">جنيه</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   المكون الرئيسي
   ═══════════════════════════════════════════ */
export default function SecondRoundFeesPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | ''>('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [classroomGroups, setClassroomGroups] = useState<ClassroomGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [applying, setApplying] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [collapsedClassrooms, setCollapsedClassrooms] = useState<Set<number>>(new Set());

  // ── جلب البرامج ──
  useEffect(() => {
    fetchAPI('/training-programs')
      .then(data => setPrograms(Array.isArray(data) ? data : data.programs || data.data || []))
      .catch(() => toast.error('فشل في جلب البرامج'));
  }, []);

  // ── جلب الفصول عند اختيار البرنامج ──
  useEffect(() => {
    if (!selectedProgram) {
      setClassrooms([]);
      setSelectedClassroom('all');
      setFees([]);
      setClassroomGroups([]);
      setHasSearched(false);
      setSelectedFee(null);
      return;
    }
    setLoadingClassrooms(true);
    fetchAPI(`/programs/${selectedProgram}`)
      .then(program => setClassrooms(Array.isArray(program?.classrooms) ? program.classrooms : []))
      .catch(() => {
        toast.error('فشل في جلب الفصول الدراسية');
        setClassrooms([]);
      })
      .finally(() => setLoadingClassrooms(false));
  }, [selectedProgram]);

  // ── البحث ──
  const handleSearch = useCallback(async () => {
    if (!selectedProgram) return;
    try {
      setLoading(true);
      setHasSearched(true);
      setSelectedFee(null);

      const [feesData, studentsData] = await Promise.all([
        fetchAPI(`/second-round-fees/fees?programId=${selectedProgram}`),
        fetchAPI(`/second-round-fees/students?programId=${selectedProgram}`),
      ]);

      setFees(feesData || []);
      let filtered: ClassroomGroup[] = studentsData || [];
      if (selectedClassroom !== 'all') {
        filtered = filtered.filter(c => c.classroom.id === parseInt(selectedClassroom));
      }
      setClassroomGroups(filtered);
    } catch {
      toast.error('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [selectedProgram, selectedClassroom]);

  // ── عند اختيار/إلغاء قيد ──
  const handleSelectFee = useCallback(async (fee: Fee | null) => {
    setSelectedFee(fee);
    if (!selectedProgram) return;
    try {
      const feeParam = fee ? `&feeId=${fee.id}` : '';
      const data: ClassroomGroup[] = await fetchAPI(
        `/second-round-fees/students?programId=${selectedProgram}${feeParam}`,
      );
      let filtered = data || [];
      if (selectedClassroom !== 'all') {
        filtered = filtered.filter(c => c.classroom.id === parseInt(selectedClassroom));
      }
      setClassroomGroups(filtered);
    } catch {
      // silent
    }
  }, [selectedProgram, selectedClassroom]);

  // ── تطبيق القيد ──
  const handleApplyFee = async () => {
    if (!selectedProgram || !selectedFee) return;
    setConfirmApply(false);
    try {
      setApplying(true);
      const result = await fetchAPI('/second-round-fees/apply', {
        method: 'POST',
        body: JSON.stringify({ programId: Number(selectedProgram), feeId: selectedFee.id }),
      });
      toast.success(result.message || 'تم تطبيق القيد بنجاح');
      // تحديث البيانات
      const [feesData] = await Promise.all([
        fetchAPI(`/second-round-fees/fees?programId=${selectedProgram}`),
        handleSelectFee(selectedFee),
      ]);
      setFees(feesData || []);
      const updated = (feesData || []).find((f: Fee) => f.id === selectedFee.id);
      if (updated) setSelectedFee(updated);
    } catch (err: any) {
      toast.error(err.message || 'فشل في تطبيق القيد');
    } finally {
      setApplying(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedStudents(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleClassroom = (id: number) => {
    setCollapsedClassrooms(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── إحصائيات ──
  const totalStudents = classroomGroups.reduce((s, c) => s + c.totalStudents, 0);
  const totalFailedSubjects = classroomGroups.reduce(
    (s, c) => s + c.students.reduce((ss, st) => ss + st.failedSubjects.length, 0), 0,
  );
  const appliedCount = classroomGroups.reduce(
    (s, c) => s + c.students.reduce((ss, st) => ss + st.failedSubjects.filter(fs => fs.isApplied).length, 0), 0,
  );
  const notAppliedCount = totalFailedSubjects - appliedCount;

  // ── فلترة الطلاب ──
  const filteredData = classroomGroups
    .map(group => {
      if (!studentSearchQuery.trim()) return group;
      const q = studentSearchQuery.trim().toLowerCase();
      const f = group.students.filter(
        s =>
          s.trainee.nameAr.toLowerCase().includes(q) ||
          s.trainee.nationalId.includes(q) ||
          s.failedSubjects.some(fs => fs.content.name.toLowerCase().includes(q)),
      );
      return { ...group, students: f, totalStudents: f.length };
    })
    .filter(c => c.totalStudents > 0);

  return (
    <ProtectedPage requiredPermissions={[{ resource: 'dashboard.grades.second-round-fees', action: 'manage' }]}>
      <div className="space-y-6">
        <PageHeader
          title="رسوم الدور الثاني"
          description="تطبيق القيود المالية على طلاب الدور الثاني (الراسبين) لكل مادة"
        />

        {/* ─── الفلاتر ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">البرنامج التدريبي</label>
              <TibaSelect
                instanceId="program-select"
                value={selectedProgram ? String(selectedProgram) : ''}
                onChange={(val) => {
                  setSelectedProgram(val ? Number(val) : '');
                  setClassroomGroups([]);
                  setHasSearched(false);
                  setSelectedClassroom('all');
                  setSelectedFee(null);
                }}
                options={programs.map(p => ({ value: String(p.id), label: p.nameAr }))}
                placeholder="اختر البرنامج..."
                isClearable
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">الفصل الدراسي</label>
              <TibaSelect
                instanceId="classroom-select"
                value={selectedClassroom}
                onChange={(val) => setSelectedClassroom(val || 'all')}
                options={[
                  { value: 'all', label: loadingClassrooms ? 'جاري التحميل...' : 'جميع الفصول' },
                  ...classrooms.map(c => ({ value: String(c.id), label: c.name })),
                ]}
                placeholder={loadingClassrooms ? 'جاري التحميل...' : 'جميع الفصول'}
                disabled={!selectedProgram || loadingClassrooms}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={!selectedProgram || loading}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                {loading ? 'جاري البحث...' : 'بحث'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── التحميل ─── */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-24 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        )}

        {/* ─── الإحصائيات ─── */}
        {hasSearched && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-600 rounded-xl p-3.5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-medium">الطلاب الراسبون</p>
                  <p className="text-2xl font-bold mt-0.5">{totalStudents}</p>
                </div>
                <UsersIcon className="w-7 h-7 text-blue-200" />
              </div>
            </div>
            <div className="bg-amber-500 rounded-xl p-3.5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-medium">المواد الراسبة</p>
                  <p className="text-2xl font-bold mt-0.5">{totalFailedSubjects}</p>
                </div>
                <BookOpenIcon className="w-7 h-7 text-amber-200" />
              </div>
            </div>
            <div className="bg-green-600 rounded-xl p-3.5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs font-medium">تم تطبيق القيد</p>
                  <p className="text-2xl font-bold mt-0.5">{appliedCount}</p>
                </div>
                <CheckCircleIcon className="w-7 h-7 text-green-200" />
              </div>
            </div>
            <div className="bg-red-500 rounded-xl p-3.5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs font-medium">لم يُطبق بعد</p>
                  <p className="text-2xl font-bold mt-0.5">{notAppliedCount}</p>
                </div>
                <ExclamationTriangleIcon className="w-7 h-7 text-red-200" />
              </div>
            </div>
          </div>
        )}

        {/* ─── لا يوجد طلاب ─── */}
        {hasSearched && !loading && totalStudents === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">لا يوجد طلاب دور ثاني</h3>
            <p className="text-sm text-slate-400">لا يوجد متدربين راسبين في هذا البرنامج</p>
          </div>
        )}

        {/* ════════════════════════════════════════════
            قسم القيود المالية + البحث + الطلاب
            ════════════════════════════════════════════ */}
        {hasSearched && !loading && totalStudents > 0 && (
          <>
            {/* Combobox القيود المالية */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <CreditCardIcon className="w-4 h-4 text-blue-600" />
                    اختر القيد المالي
                  </label>
                  <FeeCombobox fees={fees} selectedFee={selectedFee} onSelect={handleSelectFee} />
                </div>

                {/* زر التطبيق */}
                {selectedFee && notAppliedCount > 0 && (
                  <button
                    onClick={() => setConfirmApply(true)}
                    disabled={applying}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    {applying ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CurrencyDollarIcon className="w-4 h-4" />}
                    تطبيق القيد على الكل ({notAppliedCount})
                  </button>
                )}
              </div>

              {/* معلومات القيد المحدد */}
              {selectedFee && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {(() => {
                          const Icon = feeTypeIcon[selectedFee.type] || CreditCardIcon;
                          return <Icon className="w-5 h-5 text-blue-600" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{selectedFee.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${feeTypeBadge[selectedFee.type] || feeTypeBadge.ADDITIONAL}`}>
                            {getFeeTypeFullLabel(selectedFee.type)}
                          </span>
                          {selectedFee.academicYear && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <CalendarIcon className="w-2.5 h-2.5" />
                              {selectedFee.academicYear}
                            </span>
                          )}
                        </div>
                        {/* الوصف */}
                        <div className="mt-2 flex items-start gap-1.5">
                          <InformationCircleIcon className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700 leading-relaxed">{getFeeDescription(selectedFee.type)}</p>
                        </div>
                      </div>
                    </div>

                    {/* تفاصيل مالية */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200 min-w-[180px] space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">المبلغ/مادة:</span>
                        <span className="font-bold text-slate-800">{selectedFee.amount.toLocaleString()} جنيه</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">الخزينة:</span>
                        <span className="font-medium text-slate-600">{selectedFee.safeName}</span>
                      </div>
                      {selectedFee.appliedCount > 0 && (
                        <div className="flex justify-between text-sm pt-1 border-t border-slate-100">
                          <span className="text-slate-500">تم تطبيقه:</span>
                          <span className="font-bold text-green-600">
                            {selectedFee.appliedCount} مرة
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* بحث الطلاب */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الرقم القومي أو المادة..."
                  value={studentSearchQuery}
                  onChange={e => setStudentSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* ════ الطلاب مجمّعين حسب الفصل ════ */}
            {filteredData.map(group => {
              const isCollapsed = collapsedClassrooms.has(group.classroom.id);
              const clApplied = group.students.reduce(
                (s, st) => s + st.failedSubjects.filter(fs => fs.isApplied).length, 0,
              );
              const clTotal = group.students.reduce(
                (s, st) => s + st.failedSubjects.length, 0,
              );
              const allDone = clApplied === clTotal && clTotal > 0;

              return (
                <div key={group.classroom.id} className="space-y-2">
                  {/* رأس الفصل */}
                  <div
                    className={`rounded-xl p-4 cursor-pointer transition-colors border-2 ${
                      allDone
                        ? 'bg-green-50 border-green-300 hover:bg-green-100'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => toggleClassroom(group.classroom.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${allDone ? 'bg-green-200 text-green-700' : 'bg-blue-200 text-blue-700'}`}>
                          <Squares2X2Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800">{group.classroom.name}</h3>
                          <p className="text-xs text-slate-500">{group.totalStudents} طالب — {clTotal} مادة راسبة</p>
                        </div>
                        {allDone && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-xs font-bold">
                            <CheckCircleIcon className="w-3 h-3" /> تم تطبيق الكل
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">مطبّق</p>
                          <p className={`text-lg font-bold ${allDone ? 'text-green-600' : 'text-amber-600'}`}>{clApplied}/{clTotal}</p>
                        </div>
                        {isCollapsed ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronUpIcon className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* الطلاب */}
                  {!isCollapsed && (
                    <div className="space-y-2 mr-4">
                      {group.students.map(student => {
                        const key = `${group.classroom.id}-${student.trainee.id}`;
                        const isExpanded = expandedStudents.has(key);
                        const stApplied = student.failedSubjects.filter(fs => fs.isApplied).length;
                        const stTotal = student.failedSubjects.length;
                        const allApplied = stApplied === stTotal;

                        return (
                          <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div
                              className={`p-4 cursor-pointer transition-colors ${allApplied ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-slate-50'}`}
                              onClick={() => toggleExpand(key)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                                  {student.trainee.photoUrl ? (
                                    <Image src={getImageUrl(student.trainee.photoUrl)} alt={student.trainee.nameAr} width={40} height={40} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                                      {student.trainee.nameAr.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-800 truncate">{student.trainee.nameAr}</h4>
                                    {allApplied && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded-full text-[10px] font-bold">
                                        <CheckCircleIcon className="w-3 h-3" /> تم التطبيق
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">{student.trainee.nationalId}</p>
                                </div>
                                <div className="text-left flex items-center gap-3">
                                  <div className="text-center">
                                    <p className="text-xs text-slate-500">راسب</p>
                                    <p className="text-lg font-bold text-red-600">{stTotal}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-slate-500">مطبّق</p>
                                    <p className={`text-lg font-bold ${allApplied ? 'text-green-600' : 'text-amber-600'}`}>{stApplied}/{stTotal}</p>
                                  </div>
                                  {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50 p-4">
                                <div className="space-y-2">
                                  {student.failedSubjects.map(subject => (
                                    <div
                                      key={subject.content.id}
                                      className={`flex items-center justify-between p-3 rounded-xl border ${subject.isApplied ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-semibold text-slate-800">{subject.content.name}</p>
                                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{subject.content.code}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {subject.totalMarks} / {subject.maxMarks} ({subject.percentage.toFixed(1)}%)
                                        </p>
                                      </div>
                                      <div>
                                        {subject.isApplied ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-xs font-bold">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            تم التطبيق
                                            {subject.appliedFees.length > 0 && (
                                              <span className="text-green-600">({subject.appliedFees[0].fee?.name})</span>
                                            )}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-xs font-bold">
                                            <ExclamationTriangleIcon className="w-3 h-3" />
                                            لم يُطبق
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredData.length === 0 && classroomGroups.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
                <MagnifyingGlassIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">لا توجد نتائج تطابق &quot;{studentSearchQuery}&quot;</p>
              </div>
            )}
          </>
        )}

        {/* ─── مودال تأكيد التطبيق ─── */}
        {confirmApply && selectedFee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmApply(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-amber-500 px-6 py-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  تأكيد تطبيق القيد المالي
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">القيد المالي:</span>
                    <span className="font-bold text-slate-800">{selectedFee.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">النوع:</span>
                    <span className="font-bold text-slate-600">{getFeeTypeFullLabel(selectedFee.type)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">المبلغ لكل مادة:</span>
                    <span className="font-bold text-emerald-700">{selectedFee.amount.toLocaleString()} جنيه</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">عدد المواد:</span>
                    <span className="font-bold text-slate-800">{notAppliedCount} مادة</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">الإجمالي المتوقع:</span>
                    <span className="font-bold text-red-600 text-base">
                      {(selectedFee.amount * notAppliedCount).toLocaleString()} جنيه
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سيتم تطبيق هذا القيد على جميع المواد الراسب فيها الطلاب والتي لم يُطبق عليها هذا القيد بعد. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmApply(false)}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleApplyFee}
                    disabled={applying}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {applying ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                    تأكيد التطبيق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
