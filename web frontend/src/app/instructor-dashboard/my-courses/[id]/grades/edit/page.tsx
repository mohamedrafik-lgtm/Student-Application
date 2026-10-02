'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { bulkUpdateGrades } from '@/lib/grades-api';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FaArrowRight, FaSave, FaUser, FaSearch } from 'react-icons/fa';

interface Trainee {
  id: number;
  nameAr?: string;
  nameEn?: string;
  email: string;
  photoUrl?: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroomId: number;
  classroom: {
    id: number;
    name: string;
  };
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
}

interface TraineeGrade {
  trainee: Trainee;
  grade: any | null;
}

export default function EditCourseGradesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  // استخراج traineeId من query params
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const traineeId = searchParams?.get('traineeId');

  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [traineeGrades, setTraineeGrades] = useState<TraineeGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedGrades, setEditedGrades] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    loadData();
  }, [courseId, traineeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch course data
      const courseData = await fetchAPI(`/training-contents/${courseId}`);
      setCourse(courseData);
      
      // Fetch grades for this content
      const gradesUrl = `/grades/content/${courseId}?classroomId=${courseData.classroomId}`;
      const gradesResponse = await fetchAPI(gradesUrl);
      
      let allGrades = gradesResponse.data || [];
      
      // إذا كان هناك traineeId محدد، نعرض فقط هذا المتدرب
      if (traineeId) {
        allGrades = allGrades.filter((tg: TraineeGrade) => tg.trainee.id === parseInt(traineeId));
      }
      
      setTraineeGrades(allGrades);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (traineeId: number, field: string, value: string, maxValue: number) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    // منع إدخال قيمة أكبر من القيمة القصوى
    if (numValue > maxValue) return;

    setEditedGrades((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(traineeId) || { 
        traineeId, 
        contentId: courseId, 
        classroomId: course?.classroomId 
      };
      newMap.set(traineeId, { ...current, [field]: numValue });
      return newMap;
    });
  };

  const calculateTotal = (traineeGrade: TraineeGrade) => {
    const edited = editedGrades.get(traineeGrade.trainee.id);
    const grade = traineeGrade.grade;

    const yearWork = edited?.yearWorkMarks ?? grade?.yearWorkMarks ?? 0;
    const practical = edited?.practicalMarks ?? grade?.practicalMarks ?? 0;
    const written = edited?.writtenMarks ?? grade?.writtenMarks ?? 0;
    const attendance = edited?.attendanceMarks ?? grade?.attendanceMarks ?? 0;
    const quizzes = edited?.quizzesMarks ?? grade?.quizzesMarks ?? 0;
    const finalExam = edited?.finalExamMarks ?? grade?.finalExamMarks ?? 0;

    return yearWork + practical + written + attendance + quizzes + finalExam;
  };

  const filteredTraineeGrades = useMemo(() => {
    if (!searchQuery.trim()) return traineeGrades;
    
    const query = searchQuery.toLowerCase();
    return traineeGrades.filter(tg => 
      tg.trainee.nameAr?.toLowerCase().includes(query) ||
      tg.trainee.nameEn?.toLowerCase().includes(query) ||
      tg.trainee.email?.toLowerCase().includes(query)
    );
  }, [traineeGrades, searchQuery]);

  const handleSaveAll = async () => {
    if (!course || editedGrades.size === 0) {
      toast.error('لا توجد تغييرات للحفظ');
      return;
    }

    // التحقق من أن المجموع لا يتجاوز الحد الأقصى
    for (const [traineeId, gradeData] of editedGrades.entries()) {
      const traineeGrade = traineeGrades.find(tg => tg.trainee.id === traineeId);
      if (traineeGrade) {
        const total = calculateTotal(traineeGrade);
        const maxTotal = course.yearWorkMarks + course.practicalMarks + course.writtenMarks + 
                        course.attendanceMarks + course.quizzesMarks + course.finalExamMarks;
        if (total > maxTotal) {
          const traineeName = traineeGrade.trainee.nameAr || traineeGrade.trainee.nameEn;
          toast.error(`مجموع درجات ${traineeName} لا يمكن أن يتجاوز ${maxTotal}`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      
      // تجميع التحديثات
      const grades = Array.from(editedGrades.values()).map(gradeData => {
        const traineeGrade = traineeGrades.find(tg => tg.trainee.id === gradeData.traineeId);
        const existingGrade = traineeGrade?.grade;
        
        return {
          traineeId: gradeData.traineeId,
          yearWorkMarks: gradeData.yearWorkMarks ?? existingGrade?.yearWorkMarks ?? 0,
          practicalMarks: gradeData.practicalMarks ?? existingGrade?.practicalMarks ?? 0,
          writtenMarks: gradeData.writtenMarks ?? existingGrade?.writtenMarks ?? 0,
          attendanceMarks: gradeData.attendanceMarks ?? existingGrade?.attendanceMarks ?? 0,
          quizzesMarks: gradeData.quizzesMarks ?? existingGrade?.quizzesMarks ?? 0,
          finalExamMarks: gradeData.finalExamMarks ?? existingGrade?.finalExamMarks ?? 0,
          notes: gradeData.notes ?? existingGrade?.notes ?? '',
        };
      });

      await bulkUpdateGrades({
        trainingContentId: courseId,
        classroomId: course.classroomId,
        grades,
      });

      toast.success('تم حفظ الدرجات بنجاح');
      setEditedGrades(new Map());
      await loadData();
    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast.error(error.message || 'حدث خطأ في حفظ الدرجات');
    } finally {
      setSaving(false);
    }
  };

  // حساب الإحصائيات
  const stats = useMemo(() => {
    let totalMarks = 0;
    let count = 0;
    let passed = 0;
    let failed = 0;
    
    traineeGrades.forEach(tg => {
      const total = calculateTotal(tg);
      if (total > 0) {
        totalMarks += total;
        count++;
        if (total >= 50) passed++;
        else failed++;
      }
    });

    return {
      average: count > 0 ? (totalMarks / count).toFixed(1) : '0',
      passed,
      failed,
      notEvaluated: traineeGrades.length - count,
    };
  }, [traineeGrades, editedGrades]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-gray-600">المادة التدريبية غير موجودة</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {traineeId ? 'تعديل درجات المتدرب' : 'تعديل درجات المتدربين'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {course.name} ({course.code})
            {traineeId && traineeGrades.length > 0 && (
              <span className="mr-2 text-blue-600 font-medium">
                - {traineeGrades[0].trainee.nameAr || traineeGrades[0].trainee.nameEn}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/instructor-dashboard/my-courses/${courseId}/grades`)}
            className="flex items-center gap-2"
          >
            <FaArrowRight />
            رجوع
          </Button>
          {editedGrades.size > 0 && (
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white shadow-md flex items-center gap-2"
            >
              <FaSave />
              {saving ? 'جاري الحفظ...' : `حفظ التغييرات (${editedGrades.size})`}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <h3 className="text-sm font-medium text-blue-600 mb-2">المتوسط العام</h3>
          <p className="text-4xl font-bold text-blue-900">{stats.average}%</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <h3 className="text-sm font-medium text-emerald-600 mb-2">الناجحون</h3>
          <p className="text-4xl font-bold text-emerald-900">{stats.passed}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <h3 className="text-sm font-medium text-red-600 mb-2">الراسبون</h3>
          <p className="text-4xl font-bold text-red-900">{stats.failed}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <h3 className="text-sm font-medium text-purple-600 mb-2">لم يتم التقييم</h3>
          <p className="text-4xl font-bold text-purple-900">{stats.notEvaluated}</p>
        </Card>
      </div>

      {/* Search - إخفاء البحث إذا كان هناك متدرب واحد محدد */}
      {traineeGrades.length > 1 && !traineeId && (
        <Card className="p-6">
          <div className="relative">
            <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="ابحث عن متدرب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12"
            />
          </div>
        </Card>
      )}

      {/* Grades Table */}
      {filteredTraineeGrades.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FaUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {traineeGrades.length === 0 ? 'لا يوجد متدربون' : 'لا توجد نتائج'}
            </h3>
            <p className="text-gray-600">
              {traineeGrades.length === 0
                ? 'لا يوجد متدربون لعرض درجاتهم'
                : 'لا توجد نتائج تطابق بحثك'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTraineeGrades.map((traineeGrade, index) => {
            const edited = editedGrades.get(traineeGrade.trainee.id);
            const grade = traineeGrade.grade;
            const total = calculateTotal(traineeGrade);
            const maxTotal = course.yearWorkMarks + course.practicalMarks + course.writtenMarks + 
                            course.attendanceMarks + course.quizzesMarks + course.finalExamMarks;
            const isOver = total > maxTotal;

            return (
              <Card key={traineeGrade.trainee.id} className="p-6 shadow-md hover:shadow-lg transition-shadow">
                {/* Trainee Info */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="text-gray-500 font-semibold text-lg">{index + 1}</div>
                  {traineeGrade.trainee.photoUrl ? (
                    <img
                      src={traineeGrade.trainee.photoUrl}
                      alt={traineeGrade.trainee.nameAr || traineeGrade.trainee.nameEn || ''}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <FaUser className="text-purple-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {traineeGrade.trainee.nameAr || traineeGrade.trainee.nameEn || 'غير محدد'}
                    </h3>
                    <p className="text-sm text-gray-600">{traineeGrade.trainee.email}</p>
                  </div>
                </div>

                {/* Grade Inputs */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <GradeInput
                    label="أعمال السنة"
                    value={edited?.yearWorkMarks ?? grade?.yearWorkMarks ?? 0}
                    max={course.yearWorkMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'yearWorkMarks', value, course.yearWorkMarks)}
                  />
                  <GradeInput
                    label="العملي"
                    value={edited?.practicalMarks ?? grade?.practicalMarks ?? 0}
                    max={course.practicalMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'practicalMarks', value, course.practicalMarks)}
                  />
                  <GradeInput
                    label="التحريري"
                    value={edited?.writtenMarks ?? grade?.writtenMarks ?? 0}
                    max={course.writtenMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'writtenMarks', value, course.writtenMarks)}
                  />
                  <AttendanceGradeInput
                    label="الحضور"
                    value={edited?.attendanceMarks ?? grade?.attendanceMarks ?? 0}
                    max={course.attendanceMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'attendanceMarks', value, course.attendanceMarks)}
                  />
                  <GradeInput
                    label="اختبارات اونلاين"
                    value={edited?.quizzesMarks ?? grade?.quizzesMarks ?? 0}
                    max={course.quizzesMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'quizzesMarks', value, course.quizzesMarks)}
                  />
                  <GradeInput
                    label="الميد تيرم"
                    value={edited?.finalExamMarks ?? grade?.finalExamMarks ?? 0}
                    max={course.finalExamMarks}
                    onChange={(value) => handleGradeChange(traineeGrade.trainee.id, 'finalExamMarks', value, course.finalExamMarks)}
                  />
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                    <p className="text-xs text-gray-600 font-medium mb-1">المجموع</p>
                    <p className={`text-2xl font-bold ${isOver ? 'text-red-600' : 'text-blue-700'}`}>
                      {total.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600">من {maxTotal}</p>
                    {isOver && <p className="text-xs text-red-600 font-semibold mt-1">تجاوز!</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
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
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-1">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={0}
        max={max}
        step={0.5}
        className={`text-center font-semibold ${
          isOver 
            ? 'border-red-500 text-red-600 bg-red-50' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
      />
      <p className="text-xs text-gray-500 text-center mt-1">من {max}</p>
      {isOver && <p className="text-xs text-red-600 text-center font-semibold">تجاوز!</p>}
    </div>
  );
}

function AttendanceGradeInput({
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
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-1">{label}</label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={0}
          max={max}
          step={0.5}
          className={`text-center font-semibold ${
            isOver 
              ? 'border-red-500 text-red-600 bg-red-50' 
              : 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50'
          }`}
        />
      </div>
      <p className="text-xs text-emerald-600 text-center mt-1 font-medium">
        يتم احتسابها تلقائياً
      </p>
      <p className="text-xs text-gray-500 text-center">من {max}</p>
      {isOver && <p className="text-xs text-red-600 text-center font-semibold">تجاوز!</p>}
    </div>
  );
}

