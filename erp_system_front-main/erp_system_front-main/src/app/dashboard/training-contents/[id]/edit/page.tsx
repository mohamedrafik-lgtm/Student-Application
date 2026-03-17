'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, fetchTrainingContent, updateTrainingContent } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import { TibaSelect } from '@/app/components/ui/Select';
import Link from 'next/link';
import { use } from 'react';
import ProtectedPage from '@/components/permissions/ProtectedPage';

function EditTrainingContentPageContent({ id }: { id: string }) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

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
  
  // Content type and attendance recorders
  const [contentType, setContentType] = useState('UNSPECIFIED');
  const [attendanceRecorderIds, setAttendanceRecorderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          const [contentData, programsData, usersData] = await Promise.all([
            fetchTrainingContent(id),
            fetchAPI('/programs'),
            fetchAPI('/users')
          ]);
          
          setPrograms(programsData || []);
          setUsers(usersData || []);
          
          if (contentData) {
            setCode(contentData.code);
            setName(contentData.name);
            setProgramId(contentData.programId?.toString() || '');
            setClassroomId(contentData.classroomId?.toString() || '');
            setInstructorId(contentData.instructorId);
            setTheorySessionsPerWeek(contentData.theorySessionsPerWeek);
            setPracticalSessionsPerWeek(contentData.practicalSessionsPerWeek);
            setChaptersCount(contentData.chaptersCount);
            setYearWorkMarks(contentData.yearWorkMarks);
            setPracticalMarks(contentData.practicalMarks);
            setWrittenMarks(contentData.writtenMarks);
            setAttendanceMarks(contentData.attendanceMarks);
            setQuizzesMarks(contentData.quizzesMarks);
            setFinalExamMarks(contentData.finalExamMarks);
            setContentType(contentData.contentType || 'UNSPECIFIED');
            
            // Load attendance recorders
            if (contentData.attendanceRecorders && Array.isArray(contentData.attendanceRecorders)) {
              setAttendanceRecorderIds(contentData.attendanceRecorders.map((ar: any) => ar.userId));
            }
            
            // Load classrooms for the selected program
            if (contentData.programId) {
              const selectedProgram = programsData.find((p: any) => p.id === contentData.programId);
              if (selectedProgram && selectedProgram.classrooms) {
                setClassrooms(selectedProgram.classrooms);
              }
            }
          }
        } catch (err) {
          setError('حدث خطأ أثناء تحميل البيانات');
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchData();
    }
  }, [isAuthenticated, id]);

  // Load classrooms when program changes
  useEffect(() => {
    if (programId) {
      const selectedProgram = programs.find(p => p.id.toString() === programId);
      if (selectedProgram && selectedProgram.classrooms) {
        setClassrooms(selectedProgram.classrooms);
      } else {
        setClassrooms([]);
      }
      // Don't reset classroomId here during initial load
    } else {
      setClassrooms([]);
      setClassroomId('');
    }
  }, [programId, programs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
        contentType,
        attendanceRecorderIds,
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
      
      await updateTrainingContent(id, data);
      toast.success('تم تحديث المحتوى التدريبي بنجاح');
      router.push('/dashboard/training-contents');
    } catch (error) {
      console.error('Error updating training content:', error);
      setError('فشل تحديث المحتوى التدريبي. يرجى المحاولة مرة أخرى.');
      toast.error('فشل تحديث المحتوى التدريبي. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const totalMarks = yearWorkMarks + practicalMarks + writtenMarks + 
                    attendanceMarks + quizzesMarks + finalExamMarks;

  if (authLoading || initialLoading) {
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

  const programOptions = programs.map(p => ({ value: p.id.toString(), label: p.nameAr }));
  const classroomOpts = classrooms.map(c => ({ value: c.id.toString(), label: c.name }));
  const userOptions = users.map(u => ({ value: u.id, label: u.name }));
  const contentTypeOptions = [
    { value: 'UNSPECIFIED', label: 'لم يحدد' },
    { value: 'THEORY', label: 'نظري' },
    { value: 'PRACTICAL', label: 'عملي' },
    { value: 'BOTH', label: 'الاثنين معاً' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="تعديل محتوى تدريبي"
        description="تحديث بيانات المحتوى التدريبي"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المحتوى التدريبي', href: '/dashboard/training-contents' },
          { label: 'تعديل' }
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">معلومات المحتوى الأساسية</h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">كود المحتوى التدريبي <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="مثال: CS101"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">اسم المحتوى التدريبي <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="مثال: مقدمة في البرمجة"
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
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">الفصل الدراسي <span className="text-red-500">*</span></label>
              <TibaSelect
                options={classroomOpts}
                value={classroomId}
                onChange={(val) => setClassroomId(val)}
                placeholder="اختر الفصل الدراسي"
                disabled={!programId || classrooms.length === 0}
                isClearable
                instanceId="classroom-select"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">المحاضر المسؤول <span className="text-red-500">*</span></label>
              <TibaSelect
                options={userOptions}
                value={instructorId}
                onChange={(val) => setInstructorId(val)}
                placeholder="اختر المحاضر"
                isClearable
                instanceId="instructor-select"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">عدد الفصول <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={chaptersCount}
                onChange={(e) => setChaptersCount(parseInt(e.target.value))}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sessions per week */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800">عدد الحصص الأسبوعية ونوع المحتوى</h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">عدد الحصص النظرية <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                value={theorySessionsPerWeek}
                onChange={(e) => setTheorySessionsPerWeek(parseInt(e.target.value))}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">مرات حضور العملي <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                value={practicalSessionsPerWeek}
                onChange={(e) => setPracticalSessionsPerWeek(parseInt(e.target.value))}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">نوع المحتوى <span className="text-red-500">*</span></label>
              <TibaSelect
                options={contentTypeOptions}
                value={contentType}
                onChange={(val) => setContentType(val || 'UNSPECIFIED')}
                placeholder="اختر نوع المحتوى"
                instanceId="content-type-select"
              />
              <p className="text-xs text-slate-400">اختر نوع المحتوى التدريبي (نظري، عملي، أو الاثنين معاً)</p>
            </div>
          </div>
        </div>

        {/* Attendance Recorders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-800">مسؤولو تسجيل الحضور</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 max-h-60 overflow-y-auto space-y-1.5">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">لا يوجد مستخدمون متاحون</p>
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
                          setAttendanceRecorderIds(attendanceRecorderIds.filter((rid) => rid !== user.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{user.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">اختر المستخدمين المسؤولين عن تسجيل الحضور لهذا المحتوى</p>
          </div>
        </div>

        {/* Marks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800">توزيع الدرجات</h3>
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
                  <label className="block text-sm font-medium text-slate-700">{label} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setter(parseInt(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <div className={`mt-4 p-3 rounded-lg flex items-center justify-between ${
              totalMarks === 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <span className="text-sm font-medium text-slate-700">المجموع الكلي:</span>
              <span className={`text-lg font-bold ${totalMarks === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalMarks} / 100
              </span>
            </div>
            {totalMarks !== 100 && (
              <p className="text-sm text-red-600 mt-2 text-center">يجب أن يكون مجموع الدرجات يساوي 100</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard/training-contents">
            <Button type="button" variant="outline" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              إلغاء
            </Button>
          </Link>
          <Button type="submit" disabled={loading || totalMarks !== 100} isLoading={loading}>
            تحديث المحتوى التدريبي
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditTrainingContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <ProtectedPage>
      <EditTrainingContentPageContent id={id} />
    </ProtectedPage>
  );
}