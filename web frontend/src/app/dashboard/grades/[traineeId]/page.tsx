'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/components/ui/input';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { RequirePermission } from '@/components/permissions/PermissionGate';
import { getTraineeGradesDetailed, bulkUpdateGrades } from '@/lib/grades-api';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, UserIcon, CalendarDaysIcon, LockClosedIcon, LockOpenIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

interface TraineeInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photoUrl?: string;
  phone: string;
  email?: string;
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
}

interface ContentGrade {
  content: {
    id: number;
    name: string;
    code: string;
    maxMarks: {
      yearWorkMarks: number;
      practicalMarks: number;
      writtenMarks: number;
      attendanceMarks: number;
      quizzesMarks: number;
      finalExamMarks: number;
      total: number;
    };
    classroom: {
      id: number;
      name: string;
    };
  };
  grade: any | null;
}

export default function TraineeGradesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades', action: 'view' }}>
      <TraineeGradesContent />
    </ProtectedPage>
  );
}

function TraineeGradesContent() {
  const router = useRouter();
  const params = useParams();
  const traineeId = parseInt(params.traineeId as string);

  const [trainee, setTrainee] = useState<TraineeInfo | null>(null);
  const [contentGrades, setContentGrades] = useState<ContentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedGrades, setEditedGrades] = useState<Map<string, any>>(new Map());
  const [manualAttendanceEdit, setManualAttendanceEdit] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEditKey, setPendingEditKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [traineeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTraineeGradesDetailed(traineeId);
      setTrainee(data.trainee);
      setContentGrades(data.contentGrades || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (contentId: number, classroomId: number, field: string, value: string, maxValue: number) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    // منع إدخال قيمة أكبر من القيمة القصوى
    if (numValue > maxValue) return;

    const key = `${contentId}-${classroomId}`;
    setEditedGrades((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(key) || { traineeId, contentId, classroomId };
      newMap.set(key, { ...current, [field]: numValue });
      return newMap;
    });
  };

  const calculateTotal = (contentGrade: ContentGrade) => {
    const key = `${contentGrade.content.id}-${contentGrade.content.classroom.id}`;
    const edited = editedGrades.get(key);
    const grade = contentGrade.grade;

    const yearWork = edited?.yearWorkMarks ?? grade?.yearWorkMarks ?? 0;
    const practical = edited?.practicalMarks ?? grade?.practicalMarks ?? 0;
    const written = edited?.writtenMarks ?? grade?.writtenMarks ?? 0;
    const attendance = edited?.attendanceMarks ?? grade?.attendanceMarks ?? 0;
    const quizzes = edited?.quizzesMarks ?? grade?.quizzesMarks ?? 0;
    const finalExam = edited?.finalExamMarks ?? grade?.finalExamMarks ?? 0;

    return yearWork + practical + written + attendance + quizzes + finalExam;
  };

  // Group content grades by classroom
  const groupedByClassroom = useMemo(() => {
    const groups: { [key: string]: ContentGrade[] } = {};
    contentGrades.forEach((contentGrade) => {
      const classroomName = contentGrade.content.classroom.name;
      if (!groups[classroomName]) {
        groups[classroomName] = [];
      }
      groups[classroomName].push(contentGrade);
    });
    return groups;
  }, [contentGrades]);

  // حساب إجمالي الدرجات
  const totalStats = useMemo(() => {
    let maxTotal = 0;
    let earnedTotal = 0;

    contentGrades.forEach((contentGrade) => {
      maxTotal += contentGrade.content.maxMarks.total;
      earnedTotal += calculateTotal(contentGrade);
    });

    const percentage = maxTotal > 0 ? (earnedTotal / maxTotal) * 100 : 0;

    return {
      maxTotal,
      earnedTotal,
      percentage,
    };
  }, [contentGrades, editedGrades]);

  // حساب إجمالي درجات كل فصل دراسي
  const classroomStats = useMemo(() => {
    const stats: { [classroomName: string]: { maxTotal: number; earnedTotal: number; percentage: number } } = {};
    Object.keys(groupedByClassroom).forEach((classroomName) => {
      let maxTotal = 0;
      let earnedTotal = 0;
      groupedByClassroom[classroomName].forEach((contentGrade) => {
        maxTotal += contentGrade.content.maxMarks.total;
        earnedTotal += calculateTotal(contentGrade);
      });
      const percentage = maxTotal > 0 ? (earnedTotal / maxTotal) * 100 : 0;
      stats[classroomName] = { maxTotal, earnedTotal, percentage };
    });
    return stats;
  }, [groupedByClassroom, editedGrades]);

  // دالة تمكين التعديل اليدوي لدرجة الحضور
  const enableManualAttendanceEdit = (contentId: number, classroomId: number) => {
    const key = `${contentId}-${classroomId}`;
    setPendingEditKey(key);
    setShowConfirmModal(true);
  };

  const confirmManualEdit = () => {
    if (pendingEditKey) {
      setManualAttendanceEdit((prev) => {
        const newSet = new Set(prev);
        newSet.add(pendingEditKey);
        return newSet;
      });
      toast.success('تم تمكين التعديل اليدوي لدرجة الحضور');
    }
    setShowConfirmModal(false);
    setPendingEditKey(null);
  };

  const cancelManualEdit = () => {
    setShowConfirmModal(false);
    setPendingEditKey(null);
  };

  const handleSaveAll = async () => {
    if (editedGrades.size === 0) {
      toast.error('لا توجد تغييرات للحفظ');
      return;
    }

    // التحقق من أن المجموع لا يتجاوز 100 في كل مادة
    for (const [key, gradeData] of editedGrades.entries()) {
      const contentGrade = contentGrades.find(
        (cg) => `${cg.content.id}-${cg.content.classroom.id}` === key
      );
      if (contentGrade) {
        const total = calculateTotal(contentGrade);
        if (total > contentGrade.content.maxMarks.total) {
          toast.error(`مجموع الدرجات في مادة ${contentGrade.content.name} لا يمكن أن يتجاوز ${contentGrade.content.maxMarks.total}`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      
      // تجميع التحديثات حسب المادة والفصل
      const updates = new Map<string, any>();
      for (const [key, gradeData] of editedGrades.entries()) {
        const [contentId, classroomId] = key.split('-').map(Number);
        const updateKey = `${contentId}-${classroomId}`;
        
        if (!updates.has(updateKey)) {
          updates.set(updateKey, {
            trainingContentId: contentId,
            classroomId: classroomId,
            grades: [],
          });
        }
        
        updates.get(updateKey).grades.push({
          traineeId: gradeData.traineeId,
          yearWorkMarks: gradeData.yearWorkMarks,
          practicalMarks: gradeData.practicalMarks,
          writtenMarks: gradeData.writtenMarks,
          attendanceMarks: gradeData.attendanceMarks,
          quizzesMarks: gradeData.quizzesMarks,
          finalExamMarks: gradeData.finalExamMarks,
          notes: gradeData.notes,
        });
      }

      // إرسال التحديثات
      await Promise.all(
        Array.from(updates.values()).map((update) => bulkUpdateGrades(update))
      );

      toast.success('تم حفظ الدرجات بنجاح');
      setEditedGrades(new Map());
      setManualAttendanceEdit(new Set()); // إعادة تعيين حالة التعديل اليدوي
      await loadData();
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error(error.message || 'حدث خطأ في حفظ الدرجات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-slate-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-16 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse mx-auto" />
            <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse mx-auto" />
            <div className="h-3 w-full bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">المتدرب غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal التأكيد */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={cancelManualEdit}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <InformationCircleIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">تنبيه مهم</h3>
                  <p className="text-slate-500 text-sm">تمكين التعديل اليدوي لدرجة الحضور</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <LockClosedIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">الوضع الحالي</h4>
                    <p className="text-sm text-green-700">درجة الحضور يتم حسابها تلقائياً من نظام الحضور والغياب</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-r-4 border-orange-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <LockOpenIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">بعد التمكين</h4>
                    <p className="text-sm text-orange-700">ستتمكن من تعديل الدرجة يدوياً، لكن سيتم استبدالها تلقائياً عند تسجيل أي حضور جديد للمتدرب</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">ملاحظة</h4>
                    <p className="text-sm text-blue-700">يُنصح بالاعتماد على الحساب التلقائي لضمان دقة الدرجات</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={cancelManualEdit}
              >
                إلغاء
              </Button>
              <Button
                variant="warning"
                onClick={confirmManualEdit}
              >
                نعم، تمكين التعديل
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <PageHeader
          title={`درجات المتدرب: ${trainee.nameAr}`}
          description={trainee.program.nameAr}
        />

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4 ml-2" />
          رجوع
        </Button>

        <RequirePermission resource="dashboard.grades" action="edit">
          <Button
            onClick={handleSaveAll}
            disabled={saving || editedGrades.size === 0}
            className="mr-auto"
          >
            <CheckIcon className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : `حفظ التغييرات (${editedGrades.size})`}
          </Button>
        </RequirePermission>
      </div>

      {/* معلومات المتدرب والإحصائيات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* بطاقة معلومات المتدرب */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">اسم المتدرب</p>
          </div>
          <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              {trainee.photoUrl ? (
                <div className="relative">
                  <Image
                    src={trainee.photoUrl}
                    alt={trainee.nameAr}
                    width={100}
                    height={100}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-200 shadow-sm"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-blue-200 shadow-sm">
                    <UserIcon className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <p className="font-bold text-slate-800 text-2xl">{trainee.nameAr}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold mb-1">الرقم القومي</p>
                  <p className="font-semibold text-slate-800 text-lg">{trainee.nationalId}</p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold mb-1">البرنامج التدريبي</p>
                  <p className="font-semibold text-slate-800 text-sm">{trainee.program.nameAr}</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* بطاقة إجمالي الدرجات */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h3 className="text-sm font-semibold text-slate-800 text-center">إجمالي الدرجات</h3>
          </div>
          <div className="p-6">
          <div className="text-center space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-purple-700">{totalStats.earnedTotal.toFixed(1)}</span>
                <span className="text-2xl text-purple-500">/</span>
                <span className="text-3xl font-semibold text-purple-600">{totalStats.maxTotal.toFixed(1)}</span>
              </div>
              
              <div className="w-full bg-purple-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(totalStats.percentage, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-purple-700">{totalStats.percentage.toFixed(1)}%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                عدد المواد: <span className="font-semibold">{contentGrades.length}</span>
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* الدرجات */}
      {contentGrades.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12">
          <div className="text-center">
            <p className="text-slate-600">لا توجد مواد تدريبية مسجلة</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedByClassroom).map((classroomName, index) => (
            <div key={classroomName} className="space-y-4">
              {/* Classroom Header */}
              <div className="pb-3 border-b-2 border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{classroomName}</h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                      {groupedByClassroom[classroomName].length} مادة
                    </span>
                  </div>

                  {classroomStats[classroomName] && (
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-600">الإجمالي:</span>
                        <span className="text-lg font-bold text-indigo-700">{classroomStats[classroomName].earnedTotal.toFixed(1)}</span>
                        <span className="text-sm text-indigo-400">/</span>
                        <span className="text-base font-semibold text-indigo-500">{classroomStats[classroomName].maxTotal.toFixed(1)}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <span className={`text-lg font-bold ${
                        classroomStats[classroomName].percentage >= 60
                          ? 'text-emerald-600'
                          : classroomStats[classroomName].percentage >= 40
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {classroomStats[classroomName].percentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Cards */}
              <div className="space-y-4">
                {groupedByClassroom[classroomName].map((contentGrade) => {
                  const key = `${contentGrade.content.id}-${contentGrade.content.classroom.id}`;
                  const edited = editedGrades.get(key);
                  const grade = contentGrade.grade;
                  const total = calculateTotal(contentGrade);
                  const isOver = total > contentGrade.content.maxMarks.total;

                  return (
                    <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {contentGrade.content.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          كود المادة: {contentGrade.content.code}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        <GradeInput
                          label="أعمال السنة"
                          value={edited?.yearWorkMarks ?? grade?.yearWorkMarks ?? 0}
                          max={contentGrade.content.maxMarks.yearWorkMarks}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'yearWorkMarks', value, contentGrade.content.maxMarks.yearWorkMarks)}
                        />
                        <GradeInput
                          label="العملي"
                          value={edited?.practicalMarks ?? grade?.practicalMarks ?? 0}
                          max={contentGrade.content.maxMarks.practicalMarks}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'practicalMarks', value, contentGrade.content.maxMarks.practicalMarks)}
                        />
                        <GradeInput
                          label="التحريري"
                          value={edited?.writtenMarks ?? grade?.writtenMarks ?? 0}
                          max={contentGrade.content.maxMarks.writtenMarks}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'writtenMarks', value, contentGrade.content.maxMarks.writtenMarks)}
                        />
                        <AttendanceGradeInput
                          label="الحضور"
                          value={edited?.attendanceMarks ?? grade?.attendanceMarks ?? 0}
                          max={contentGrade.content.maxMarks.attendanceMarks}
                          contentId={contentGrade.content.id}
                          classroomId={contentGrade.content.classroom.id}
                          isManualEditEnabled={manualAttendanceEdit.has(key)}
                          onEnableManualEdit={() => enableManualAttendanceEdit(contentGrade.content.id, contentGrade.content.classroom.id)}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'attendanceMarks', value, contentGrade.content.maxMarks.attendanceMarks)}
                        />
                        <GradeInput
                          label="اختبارات اونلاين"
                          value={edited?.quizzesMarks ?? grade?.quizzesMarks ?? 0}
                          max={contentGrade.content.maxMarks.quizzesMarks}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'quizzesMarks', value, contentGrade.content.maxMarks.quizzesMarks)}
                        />
                        <GradeInput
                          label="الميد تيرم"
                          value={edited?.finalExamMarks ?? grade?.finalExamMarks ?? 0}
                          max={contentGrade.content.maxMarks.finalExamMarks}
                          onChange={(value) => handleGradeChange(contentGrade.content.id, contentGrade.content.classroom.id, 'finalExamMarks', value, contentGrade.content.maxMarks.finalExamMarks)}
                        />
                        <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">المجموع</p>
                          <p className={`text-2xl font-bold ${isOver ? 'text-red-600' : 'text-blue-700'}`}>
                            {total.toFixed(1)}
                          </p>
                          <p className="text-xs text-slate-600">من {contentGrade.content.maxMarks.total}</p>
                          {isOver && <p className="text-xs text-red-600 font-semibold mt-1">تجاوز!</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

function GradeInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const isOver = value > max;

  return (
    <RequirePermission
      resource="dashboard.grades"
      action="edit"
      fallback={
        <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 font-medium mb-1">{label}</p>
          <p className={`text-lg font-semibold ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
            {value}
          </p>
          <p className="text-xs text-slate-500">من {max}</p>
        </div>
      }
    >
      <div>
        <label className="block text-xs text-slate-600 font-medium mb-1">{label}</label>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={0}
          max={max}
          step={0.5}
          className={`text-center font-semibold ${isOver ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'}`}
        />
        <p className="text-xs text-slate-500 text-center mt-1">من {max}</p>
        {isOver && <p className="text-xs text-red-600 text-center font-semibold">تجاوز!</p>}
      </div>
    </RequirePermission>
  );
}

function AttendanceGradeInput({
  label,
  value,
  max,
  contentId,
  classroomId,
  isManualEditEnabled,
  onEnableManualEdit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  contentId: number;
  classroomId: number;
  isManualEditEnabled: boolean;
  onEnableManualEdit: () => void;
  onChange: (value: string) => void;
}) {
  const isOver = value > max;

  return (
    <RequirePermission
      resource="dashboard.grades"
      action="edit"
      fallback={
        <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
          <div className="flex items-center justify-center gap-1 mb-1">
            <LockClosedIcon className="w-3 h-3 text-green-600" />
            <p className="text-xs text-green-700 font-medium">{label}</p>
          </div>
          <p className={`text-lg font-semibold ${isOver ? 'text-red-600' : 'text-green-700'}`}>
            {value.toFixed(1)}
          </p>
          <p className="text-xs text-green-600">من {max}</p>
          <div className="mt-2 pt-2 border-t border-green-200">
            <p className="text-[10px] text-green-600 flex items-center justify-center gap-1">
              <InformationCircleIcon className="w-2.5 h-2.5" />
              محسوبة تلقائياً
            </p>
          </div>
        </div>
      }
    >
      {!isManualEditEnabled ? (
        <div className="relative">
          <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <LockClosedIcon className="w-3 h-3 text-green-600" />
              <p className="text-xs text-green-700 font-medium">{label}</p>
            </div>
            <p className={`text-lg font-semibold ${isOver ? 'text-red-600' : 'text-green-700'}`}>
              {value.toFixed(1)}
            </p>
            <p className="text-xs text-green-600 mb-2">من {max}</p>
            <div className="pt-2 border-t border-green-200 space-y-2">
              <p className="text-[10px] text-green-600 flex items-center justify-center gap-1">
                <InformationCircleIcon className="w-2.5 h-2.5" />
                محسوبة تلقائياً
              </p>
              <button
                onClick={onEnableManualEdit}
                className="w-full px-2 py-1 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center justify-center gap-1"
              >
                <LockOpenIcon className="w-2.5 h-2.5" />
                تمكين التعديل
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-600 font-medium">{label}</label>
            <div className="flex items-center gap-1 text-[10px] text-orange-600">
              <LockOpenIcon className="w-2.5 h-2.5" />
              <span>تعديل يدوي</span>
            </div>
          </div>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={0}
            max={max}
            step={0.5}
            className={`text-center font-semibold ${isOver ? 'border-red-500 text-red-600 bg-red-50' : 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-500'}`}
          />
          <p className="text-xs text-slate-500 text-center mt-1">من {max}</p>
          {isOver && <p className="text-xs text-red-600 text-center font-semibold">تجاوز!</p>}
          <p className="text-[10px] text-orange-600 text-center mt-1 flex items-center justify-center gap-1">
            <InformationCircleIcon className="w-2.5 h-2.5" />
            سيتم استبدالها عند تسجيل حضور
          </p>
        </div>
      )}
    </RequirePermission>
  );
}
