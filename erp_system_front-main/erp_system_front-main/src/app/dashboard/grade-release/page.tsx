'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { toast } from 'react-hot-toast';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  numberOfClassrooms: number;
  classrooms: Classroom[];
  availableSemesters: string[];
  gradeReleaseSettings: GradeReleaseSetting[];
  traineeFees: TraineeFee[];
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate: string | null;
  endDate: string | null;
}

interface GradeReleaseSetting {
  id: string;
  programId: number;
  classroomId?: number; // ربط بفصل دراسي محدد
  semester: 'FIRST' | 'SECOND';
  academicYear: string;
  isReleased: boolean;
  releasedAt: string | null;
  releasedBy: string | null;
  requirePayment: boolean;
  linkedFeeType: string | null;
  notes: string | null;
}

interface TraineeFee {
  id: number;
  name: string;
  type: string;
  amount: number;
}

function GradeReleasePageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear] = useState('2024-2025');
  
  // حالة الـ dialog
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [requirePayment, setRequirePayment] = useState(false);
  const [linkedFeeType, setLinkedFeeType] = useState('');
  const [notes, setNotes] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [settingToCancel, setSettingToCancel] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        // استخدام نفس API المستخدم في صفحة classrooms للحصول على بيانات الفصول الكاملة
        const programsData = await fetchAPI('/programs');
        
        // جلب إعدادات إعلان الدرجات
        const settingsData = await fetchAPI('/grade-release/programs');
        
        // دمج البيانات: استخدام classrooms من /programs وإعدادات من /grade-release/programs
        const mergedPrograms = programsData.map((program: any) => {
          const programSettings = settingsData.find((p: any) => p.id === program.id);
          return {
            ...program,
            gradeReleaseSettings: programSettings?.gradeReleaseSettings || [],
            traineeFees: programSettings?.traineeFees || [],
          };
        });
        
        setPrograms(mergedPrograms);
      } catch (error: any) {
        console.error('Error fetching programs:', error);
        toast.error(error.message || 'فشل في تحميل البرامج التدريبية');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPrograms();
    }
  }, [user]);

  // دالة لفتح dialog لإعلان درجات فصل دراسي
  const handleOpenReleaseDialog = (classroom: Classroom, programId: number) => {
    const existingSetting = getSettingForClassroom(programId, classroom.id, classroom.classNumber);
    
    if (existingSetting?.isReleased) {
      // إذا كان معلناً بالفعل، إلغاء الإعلان مباشرة
      handleCancelRelease(existingSetting.id);
    } else {
      // فتح dialog لإدخال البيانات
      setSelectedClassroom(classroom);
      setSelectedProgramId(programId);
      setRequirePayment(false);
      setLinkedFeeType('');
      setNotes('');
      setShowDialog(true);
    }
  };

  // دالة لإلغاء الإعلان
  const handleCancelRelease = async (settingId: string) => {
    setSettingToCancel(settingId);
    setShowCancelDialog(true);
  };

  // تأكيد الإلغاء
  const confirmCancelRelease = async () => {
    if (!settingToCancel) return;

    try {
      await fetchAPI(`/grade-release/${settingToCancel}`, {
        method: 'DELETE',
      });
      
      toast.success('تم إلغاء إعلان الدرجات');
      setShowCancelDialog(false);
      setSettingToCancel(null);
      await reloadData();
    } catch (error: any) {
      toast.error(error.message || 'فشل في إلغاء الإعلان');
    }
  };

  // دالة لحفظ إعلان الدرجات
  const handleSaveRelease = async () => {
    if (!selectedClassroom || !selectedProgramId) return;

    try {
      // استخدم semester فريد لكل فصل بناءً على رقم الفصل
      const semester = selectedClassroom.classNumber % 2 === 1 ? 'FIRST' : 'SECOND';
      // استخدم academicYear مختلف لكل فصل ولكل برنامج
      const uniqueYear = `${academicYear}-P${selectedProgramId}-C${selectedClassroom.classNumber}`;
      
      await fetchAPI('/grade-release', {
        method: 'POST',
        body: JSON.stringify({
          programId: selectedProgramId,
          semester: semester,
          academicYear: uniqueYear,
          requirePayment,
          linkedFeeType: requirePayment ? linkedFeeType : null,
          notes: `إعلان درجات ${selectedClassroom.name} (الفصل ${selectedClassroom.classNumber})`,
        }),
      });
      
      toast.success('تم إعلان الدرجات بنجاح ✅');
      setShowDialog(false);
      await reloadData();
    } catch (error: any) {
      toast.error(error.message || 'فشل في إعلان الدرجات');
    }
  };

  // دالة لإعادة تحميل البيانات
  const reloadData = async () => {
    const programsData = await fetchAPI('/programs');
    const settingsData = await fetchAPI('/grade-release/programs');
    const mergedPrograms = programsData.map((program: any) => {
      const programSettings = settingsData.find((p: any) => p.id === program.id);
      return {
        ...program,
        gradeReleaseSettings: programSettings?.gradeReleaseSettings || [],
        traineeFees: programSettings?.traineeFees || [],
      };
    });
    setPrograms(mergedPrograms);
  };

  // دالة للحصول على إعداد الدرجات لفصل دراسي معين
  const getSettingForClassroom = (programId: number, _classroomId: number, classroomNumber: number) => {
    for (const program of programs) {
      // استخدم نفس المنطق: semester حسب رقم الفصل، و academicYear فريد لكل برنامج
      const semester = classroomNumber % 2 === 1 ? 'FIRST' : 'SECOND';
      const uniqueYear = `${academicYear}-P${programId}-C${classroomNumber}`;
      
      const setting = program.gradeReleaseSettings.find(
        (s) => s.semester === semester && s.academicYear === uniqueYear
      );
      if (setting) return setting;
    }
    return null;
  };

  if (isLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-slate-200 rounded-lg w-56 animate-pulse" />
        <div className="h-24 bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="إدارة إعلان الدرجات"
        description="إعلان درجات الفصول الدراسية كاملة مع إمكانية ربط شرط سداد رسم مالي معين"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إعلان الدرجات' }
        ]}
      />

      {/* بطاقة توضيحية */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">كيفية استخدام هذه الصفحة</h3>
        </div>
        <div className="p-5 space-y-2 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 font-bold">◆</span>
            <span>هذه الصفحة مخصصة <strong className="text-slate-800">لإعلان درجات الفصل الدراسي كاملاً</strong> (وليس فقط تعديل بياناته)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 font-bold">◆</span>
            <span>يمكنك <strong className="text-slate-800">ربط شرط</strong> أن يكون الطالب <strong className="text-slate-800">مسدداً لرسم مالي معين</strong> قبل رؤية الدرجات</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 font-bold">◆</span>
            <span>الافتراضي: جميع الفصول في حالة <strong className="text-slate-800">&quot;غير معلن&quot;</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 font-bold">◆</span>
            <span>عند الضغط على زر <strong className="text-slate-800">&quot;إعلان النتيجة&quot;</strong> سيطلب منك إدخال تفاصيل الإعلان</span>
          </div>
        </div>
      </div>

      {/* البرامج التدريبية */}
      <div className="grid gap-5">
        {programs.map((program) => (
          <div key={program.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <AcademicCapIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{program.nameAr}</h3>
                    <p className="text-xs text-slate-500">{program.nameEn}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {program.classrooms?.length || 0} فصل دراسي
                </span>
              </div>
            </div>

            <div className="p-5">
              {/* الفصول الدراسية الحقيقية */}
              <div className="space-y-3">
                {program.classrooms && program.classrooms.length > 0 ? (
                  program.classrooms.map((classroom) => {
                    const setting = getSettingForClassroom(program.id, classroom.id, classroom.classNumber);
                    const isReleased = setting?.isReleased || false;

                    return (
                      <div
                        key={classroom.id}
                        className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors bg-white"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">{classroom.classNumber}</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 text-sm">
                                  {classroom.name}
                                </h4>
                                {classroom.startDate && classroom.endDate && (
                                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {new Date(classroom.startDate).toLocaleDateString('ar-EG')} - {new Date(classroom.endDate).toLocaleDateString('ar-EG')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              {isReleased ? (
                                <>
                                  <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                                  <span className="text-xs font-medium text-emerald-700">
                                    تم إعلان الدرجات
                                  </span>
                                  {setting?.releasedAt && (
                                    <span className="text-[10px] text-slate-400 mr-1">
                                      ({new Date(setting.releasedAt).toLocaleDateString('ar-EG')})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="h-4 w-4 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    لم يتم الإعلان بعد
                                  </span>
                                </>
                              )}
                            </div>

                            {setting?.requirePayment && (
                              <div className="flex items-center gap-1.5 text-amber-600 mt-2">
                                <CurrencyDollarIcon className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">يتطلب سداد: {setting.linkedFeeType || 'رسوم'}</span>
                              </div>
                            )}
                          </div>

                          {/* زر إعلان النتيجة */}
                          <Button
                            onClick={() => handleOpenReleaseDialog(classroom, program.id)}
                            variant={isReleased ? 'danger' : 'success'}
                            size="sm"
                            leftIcon={isReleased ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                          >
                            {isReleased ? 'إلغاء الإعلان' : 'إعلان النتيجة'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 text-sm">لا توجد فصول دراسية لهذا البرنامج</p>
                    <p className="text-xs text-slate-400 mt-1">قم بإضافة فصول دراسية من صفحة إدارة الفصول</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog لإعلان الدرجات */}
      <TibaModal
        open={showDialog && !!selectedClassroom}
        onClose={() => setShowDialog(false)}
        title={`إعلان نتيجة ${selectedClassroom?.name || ''}`}
        subtitle={`الفصل رقم ${selectedClassroom?.classNumber || ''}`}
        variant="primary"
        size="md"
        icon={<AcademicCapIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleSaveRelease}
              disabled={requirePayment && !linkedFeeType}
              variant="success"
              fullWidth
              leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            >
              إعلان النتيجة
            </Button>
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              fullWidth
            >
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* معلومات الفصل */}
          {selectedClassroom?.startDate && selectedClassroom?.endDate && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="h-4 w-4 text-slate-600" />
                <span className="font-medium text-slate-700 text-sm">معلومات الفصل</span>
              </div>
              <p className="text-sm text-slate-600">
                من {new Date(selectedClassroom.startDate).toLocaleDateString('ar-EG')}
                {' '} إلى {' '}
                {new Date(selectedClassroom.endDate).toLocaleDateString('ar-EG')}
              </p>
            </div>
          )}

          {/* شرط السداد */}
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setRequirePayment(!requirePayment)}
            >
              <input
                type="checkbox"
                id="requirePayment"
                checked={requirePayment}
                onChange={(e) => setRequirePayment(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="requirePayment" className="text-sm font-medium text-slate-700 cursor-pointer flex-1 flex items-center gap-1.5">
                <CurrencyDollarIcon className="h-4 w-4 text-amber-600" />
                يتطلب سداد رسم مالي
              </label>
            </div>

            {requirePayment && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  اختر نوع الرسم المطلوب
                </label>
                <TibaSelect
                  options={
                    (programs
                      .find((p) => p.id === selectedProgramId)
                      ?.traineeFees.map((fee) => ({
                        value: fee.name,
                        label: `${fee.name} - ${fee.amount.toLocaleString()} جنيه`,
                      })) || [])
                  }
                  value={
                    linkedFeeType
                      ? {
                          value: linkedFeeType,
                          label: (() => {
                            const fee = programs
                              .find((p) => p.id === selectedProgramId)
                              ?.traineeFees.find((f) => f.name === linkedFeeType);
                            return fee ? `${fee.name} - ${fee.amount.toLocaleString()} جنيه` : linkedFeeType;
                          })(),
                        }
                      : null
                  }
                  onChange={(opt: any) => setLinkedFeeType(opt?.value || '')}
                  placeholder="اختر نوع الرسم..."
                  isClearable
                  instanceId="fee-type-select"
                />
                {!linkedFeeType && (
                  <p className="text-xs text-amber-700 mt-2">يجب اختيار نوع الرسم</p>
                )}
              </div>
            )}
          </div>

          {/* ملاحظات */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="أضف ملاحظات إضافية إن وجدت..."
            />
          </div>
        </div>
      </TibaModal>

      {/* Dialog لتأكيد إلغاء الإعلان */}
      <TibaModal
        open={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setSettingToCancel(null);
        }}
        title="تأكيد إلغاء الإعلان"
        subtitle="سيتم إخفاء الدرجات عن المتدربين ولن يتمكنوا من رؤيتها"
        variant="danger"
        size="sm"
        icon={<XCircleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={confirmCancelRelease}
              variant="danger"
              fullWidth
            >
              نعم، إلغاء الإعلان
            </Button>
            <Button
              onClick={() => {
                setShowCancelDialog(false);
                setSettingToCancel(null);
              }}
              variant="outline"
              fullWidth
            >
              تراجع
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            هل أنت متأكد من إلغاء إعلان الدرجات؟ سيتم إخفاء الدرجات عن المتدربين ولن يتمكنوا من رؤيتها.
          </p>
        </div>
      </TibaModal>
    </div>
  );
}

export default function GradeReleasePage() {
  return (
    <ProtectedPage>
      <GradeReleasePageContent />
    </ProtectedPage>
  );
}
