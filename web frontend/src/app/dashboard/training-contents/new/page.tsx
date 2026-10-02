'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, createTrainingContent, generateTrainingContentCode } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BookOpenIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import { TibaSelect } from '@/app/components/ui/Select';
import Link from 'next/link';
import ProtectedPage from '@/components/permissions/ProtectedPage';

function NewTrainingContentPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [programId, setProgramId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [theorySessionsPerWeek, setTheorySessionsPerWeek] = useState(1);
  const [practicalSessionsPerWeek, setPracticalSessionsPerWeek] = useState(1);
  const [chaptersCount, setChaptersCount] = useState(1);
  
  // Marks
  const [yearWorkMarks, setYearWorkMarks] = useState(10);
  const [practicalMarks, setPracticalMarks] = useState(10);
  const [writtenMarks, setWrittenMarks] = useState(60);
  const [attendanceMarks, setAttendanceMarks] = useState(5);
  const [quizzesMarks, setQuizzesMarks] = useState(5);
  const [finalExamMarks, setFinalExamMarks] = useState(10);
  
  // نوع المحتوى (جديد)
  const [contentType, setContentType] = useState('UNSPECIFIED');
  
  // مسؤولو الحضور (جديد - array)
  const [attendanceRecorderIds, setAttendanceRecorderIds] = useState<string[]>([]);
  
  // Attendance responsibility (القديم - محتفظ به)
  const [theoryAttendanceRecorderId, setTheoryAttendanceRecorderId] = useState('');
  const [practicalAttendanceRecorderId, setPracticalAttendanceRecorderId] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          const [programsData, usersData] = await Promise.all([
            fetchAPI('/programs'),
            fetchAPI('/users')
          ]);
          setPrograms(programsData || []);
          setUsers(usersData || []);
          
          // توليد كود فريد عند تحميل الصفحة
          generateCode();
        } catch (err) {
          setError('حدث خطأ أثناء تحميل البيانات');
          console.error(err);
        }
      };
      fetchData();
    }
  }, [isAuthenticated]);

  // جلب الفصول الدراسية عند اختيار برنامج
  useEffect(() => {
    if (programId) {
      const selectedProgram = programs.find(p => p.id.toString() === programId);
      if (selectedProgram && selectedProgram.classrooms) {
        setClassrooms(selectedProgram.classrooms);
      } else {
        setClassrooms([]);
      }
      // إعادة تعيين الفصل المختار
      setClassroomId('');
    } else {
      setClassrooms([]);
      setClassroomId('');
    }
  }, [programId, programs]);
  
  const generateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const result = await generateTrainingContentCode();
      if (result && result.code) {
        setCode(result.code);
      }
    } catch (err) {
      console.error('خطأ في توليد كود المقرر:', err);
      toast.error('فشل توليد كود المقرر. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Calculate total marks
      const totalMarks = yearWorkMarks + practicalMarks + writtenMarks + 
                        attendanceMarks + quizzesMarks + finalExamMarks;
      
      if (totalMarks !== 100) {
        toast.error('مجموع الدرجات يجب أن يساوي 100');
        setLoading(false);
        return;
      }
      
      if (!programId || !classroomId) {
        toast.error('يرجى اختيار البرنامج التدريبي والفصل الدراسي');
        setLoading(false);
        return;
      }

      const data = {
        code,
        name,
        programId: parseInt(programId),
        classroomId: parseInt(classroomId),
        instructorId,
        contentType, // جديد
        attendanceRecorderIds, // جديد
        theoryAttendanceRecorderId: theoryAttendanceRecorderId || undefined,
        practicalAttendanceRecorderId: practicalAttendanceRecorderId || undefined,
        theorySessionsPerWeek,
        practicalSessionsPerWeek,
        chaptersCount,
        yearWorkMarks,
        practicalMarks,
        writtenMarks,
        attendanceMarks,
        quizzesMarks,
        finalExamMarks
      };
      
      await createTrainingContent(data);
      toast.success('تم إنشاء المحتوى التدريبي بنجاح');
      router.push('/dashboard/training-contents');
    } catch (error) {
      console.error('Error creating training content:', error);
      toast.error('فشل إنشاء المحتوى التدريبي. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const programOptions = programs.map(program => ({
    value: program.id.toString(),
    label: program.nameAr
  }));

  const classroomOptions = classrooms.map(classroom => ({
    value: classroom.id.toString(),
    label: classroom.name
  }));
  
  const userOptions = users.map(user => ({
    value: user.id,
    label: `${user.name} (${user.email})`
  }));

  const contentTypeOptions = [
    { value: 'UNSPECIFIED', label: 'لم يحدد' },
    { value: 'THEORY', label: 'نظري' },
    { value: 'PRACTICAL', label: 'عملي' },
    { value: 'BOTH', label: 'الاثنين معاً' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="إضافة محتوى تدريبي جديد"
        description="إنشاء محتوى تدريبي جديد في النظام."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المحتوى التدريبي', href: '/dashboard/training-contents' },
          { label: 'إضافة محتوى جديد' }
        ]}
        actions={
          <Link href="/dashboard/training-contents">
            <Button variant="outline" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
              العودة
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">معلومات أساسية</h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">كود المقرر</label>
              <div className="flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="مثال: CS101"
                  readOnly
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                <Button type="button" variant="outline" onClick={generateCode} disabled={isGeneratingCode}>
                  <ArrowPathIcon className={`h-4 w-4 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-slate-400">يتم توليد كود المقرر تلقائيًا</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">اسم المحتوى التدريبي <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="اسم المحتوى التدريبي"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">البرنامج التدريبي <span className="text-red-500">*</span></label>
              <TibaSelect
                options={programOptions}
                value={programId}
                onChange={(val) => setProgramId(val)}
                placeholder="اختر البرنامج التدريبي"
                isClearable
                instanceId="program-select"
              />
              <p className="text-xs text-slate-400">اختر البرنامج أولاً لعرض الفصول المتاحة</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">الفصل الدراسي <span className="text-red-500">*</span></label>
              <TibaSelect
                options={classroomOptions}
                value={classroomId}
                onChange={(val) => setClassroomId(val)}
                placeholder={programId ? "اختر الفصل الدراسي" : "اختر البرنامج أولاً"}
                disabled={!programId || classroomOptions.length === 0}
                isClearable
                instanceId="classroom-select"
              />
              {programId && classroomOptions.length === 0 && (
                <p className="text-xs text-amber-600">لا توجد فصول دراسية متاحة لهذا البرنامج</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">أستاذ المحتوى التدريبي <span className="text-red-500">*</span></label>
              <TibaSelect
                options={userOptions}
                value={instructorId}
                onChange={(val) => setInstructorId(val)}
                placeholder="اختر أستاذ المحتوى التدريبي"
                isClearable
                instanceId="instructor-select"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">نوع المحتوى التدريبي</label>
              <TibaSelect
                options={contentTypeOptions}
                value={contentType}
                onChange={(val) => setContentType(val || 'UNSPECIFIED')}
                placeholder="اختر نوع المحتوى"
                instanceId="content-type-select"
              />
            </div>
          </div>
        </div>

        {/* Content Details Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800">تفاصيل المحتوى</h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">مرات حضور النظري في الأسبوع</label>
              <input
                type="number"
                value={theorySessionsPerWeek}
                onChange={(e) => setTheorySessionsPerWeek(parseInt(e.target.value))}
                min={0}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">مرات حضور العملي في الأسبوع</label>
              <input
                type="number"
                value={practicalSessionsPerWeek}
                onChange={(e) => setPracticalSessionsPerWeek(parseInt(e.target.value))}
                min={0}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">عدد الأبواب</label>
              <input
                type="number"
                value={chaptersCount}
                onChange={(e) => setChaptersCount(parseInt(e.target.value))}
                min={1}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Marks Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800">درجات المقرر (المجموع 100)</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {[
                { label: 'أعمال السنة', value: yearWorkMarks, setter: setYearWorkMarks },
                { label: 'العملي', value: practicalMarks, setter: setPracticalMarks },
                { label: 'التحريري', value: writtenMarks, setter: setWrittenMarks },
                { label: 'الحضور', value: attendanceMarks, setter: setAttendanceMarks },
                { label: 'اختبارات اونلاين', value: quizzesMarks, setter: setQuizzesMarks },
                { label: 'الميد تيرم', value: finalExamMarks, setter: setFinalExamMarks },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setter(parseInt(e.target.value))}
                    min={0}
                    max={100}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <div className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${
              (yearWorkMarks + practicalMarks + writtenMarks + attendanceMarks + quizzesMarks + finalExamMarks) === 100
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              مجموع الدرجات: {yearWorkMarks + practicalMarks + writtenMarks + attendanceMarks + quizzesMarks + finalExamMarks} من 100
            </div>
          </div>
        </div>

        {/* Attendance Recorders Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-800">مسؤولو تسجيل الحضور (اختياري)</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">لا يوجد موظفين متاحين</p>
              ) : (
                users.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      attendanceRecorderIds.includes(user.id) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={attendanceRecorderIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAttendanceRecorderIds([...attendanceRecorderIds, user.id]);
                        } else {
                          setAttendanceRecorderIds(attendanceRecorderIds.filter(id => id !== user.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {attendanceRecorderIds.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <span>تم اختيار <strong>{attendanceRecorderIds.length}</strong> موظف</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} isLoading={loading}>
            إنشاء المحتوى التدريبي
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewTrainingContentPage() {
  return (
    <ProtectedPage>
      <NewTrainingContentPageContent />
    </ProtectedPage>
  );
}