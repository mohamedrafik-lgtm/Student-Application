'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import PageHeader from '@/app/components/PageHeader';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { RequirePermission } from '@/components/permissions/PermissionGate';

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  programId: number;
  program: { nameAr: string };
  trainingContents: { id: number; name: string }[];
  _count: { scheduleSlots: number };
}

interface UnifyDetail {
  date: string;
  traineeId: number;
  traineeName: string;
  sourceContent: string;
  targetContent: string;
  status: string;
  action: string;
}

interface UnifyResult {
  classroomId: number;
  totalDaysProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalSessionsCreated: number;
  totalErrors: number;
  contentsCount: number;
  details: UnifyDetail[];
  errors: string[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'حاضر', color: 'bg-green-100 text-green-700' },
  LATE: { label: 'متأخر', color: 'bg-yellow-100 text-yellow-700' },
  EXCUSED: { label: 'معذور', color: 'bg-blue-100 text-blue-700' },
  ABSENT: { label: 'غائب', color: 'bg-red-100 text-red-700' },
};

export default function UnifyAttendancePage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnifyResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      const data = await fetchAPI('/attendance/classrooms-with-schedule');
      setClassrooms(data);
    } catch (err: any) {
      toast.error('فشل في تحميل الفصول الدراسية');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const handleUnify = async () => {
    if (!selectedClassroom) return;
    try {
      setLoading(true);
      setResult(null);
      setShowConfirm(false);

      const data: UnifyResult = await fetchAPI(`/attendance/unify-attendance/${selectedClassroom}`, {
        method: 'POST',
      });
      setResult(data);

      if (data.totalCreated > 0 || data.totalUpdated > 0) {
        toast.success(`تم توحيد ${data.totalCreated + data.totalUpdated} سجل حضور بنجاح (${data.totalCreated} جديد، ${data.totalUpdated} تحديث)`);
      } else {
        toast.info('جميع سجلات الحضور موحدة بالفعل، لا توجد سجلات جديدة');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setLoading(false);
    }
  };

  const selectedClassroomData = classrooms.find(c => c.id === selectedClassroom);

  return (
    <RequirePermission
      resource="dashboard.attendance-grades"
      action="manage"
      fallback={
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-red-700">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="توحيد الحضور عبر المواد"
          description="نسخ حضور المتدرب تلقائياً لجميع المواد في نفس اليوم بالفصل الدراسي"
        />

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 ml-2" />
            رجوع
          </Button>
        </div>

        {/* معلومات توضيحية */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <InformationCircleIcon className="w-6 h-6 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800">ماذا تفعل هذه الأداة؟</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                تقوم هذه الأداة بتوحيد سجلات الحضور داخل الفصل الدراسي المحدد.
                إذا كان المتدرب قد سُجّل حضوره في <strong>مادة واحدة</strong> في يوم معين،
                سيتم نسخ نفس حالة الحضور <strong>لجميع المواد الأخرى</strong> في نفس اليوم.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-100">
                <p className="font-bold text-slate-800">مثال توضيحي:</p>
                <p>
                  المتدرب (أحمد) لديه 3 مواد يوم الاثنين: <span className="font-bold">لغة عربية</span>، <span className="font-bold">رياضيات</span>، <span className="font-bold">علوم</span>.
                </p>
                <p>
                  إذا كان مسجّل <span className="text-green-700 font-bold">حاضر</span> في لغة عربية فقط ولم يُسجَل في الباقي →
                  سيتم تسجيله <span className="text-green-700 font-bold">حاضر</span> تلقائياً في رياضيات وعلوم.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-800">ملاحظات مهمة:</p>
                  <ul className="list-disc list-inside text-xs text-amber-700 mt-1 space-y-1">
                    <li>لا يتم نسخ حالة <strong>الغياب</strong> — فقط الحضور والتأخير والاعتذار.</li>
                    <li>لا يتم الكتابة فوق سجلات حضور موجودة بالفعل.</li>
                    <li>تعمل على البيانات التاريخية (السابقة) في الفصل المحدد.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* اختيار الفصل الدراسي */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DocumentDuplicateIcon className="w-5 h-5 text-slate-400" />
              اختر الفصل الدراسي
            </h3>
          </div>
          <div className="p-6">
            {loadingClassrooms ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-200 rounded-lg animate-pulse w-2/3" />
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>لا توجد فصول دراسية لديها جدول حضور</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full md:w-96">
                  <TibaSelect
                    instanceId="unify-classroom-select"
                    options={classrooms.map((c) => ({
                      value: String(c.id),
                      label: `${c.program.nameAr} — ${c.name} (${c.trainingContents.length} مادة، ${c._count.scheduleSlots} حصة)`,
                    }))}
                    value={selectedClassroom ? String(selectedClassroom) : ''}
                    onChange={(val) => {
                      setSelectedClassroom(val ? Number(val) : '');
                      setResult(null);
                      setShowConfirm(false);
                    }}
                    placeholder="-- اختر الفصل الدراسي --"
                  />
                </div>

                {/* معلومات الفصل المختار */}
                {selectedClassroomData && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-slate-800 mb-2">
                      المواد في هذا الفصل ({selectedClassroomData.trainingContents.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedClassroomData.trainingContents.map((content) => (
                        <span
                          key={content.id}
                          className="inline-flex items-center px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        >
                          {content.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* زر التنفيذ */}
        {selectedClassroom && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="text-center space-y-4">
              {!showConfirm ? (
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={loading}
                  size="lg"
                >
                  <DocumentDuplicateIcon className="w-5 h-5 ml-2" />
                  توحيد الحضور في الفصل المحدد
                </Button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-lg mx-auto space-y-4">
                  <div className="flex items-center gap-3 text-slate-800">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-amber-500" />
                    <p className="font-bold text-lg">هل أنت متأكد؟</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    سيتم توحيد الحضور لجميع المتدربين في{' '}
                    <strong>{selectedClassroomData?.program.nameAr} — {selectedClassroomData?.name}</strong>.
                    سيتم نسخ سجلات الحضور من المواد المسجلة إلى المواد غير المسجلة في نفس اليوم.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={handleUnify}
                      disabled={loading}
                    >
                      <ArrowPathIcon className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'جاري المعالجة...' : 'نعم، تنفيذ الآن'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirm(false)}
                      disabled={loading}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* نتيجة العملية */}
        {result && (
          <div className="space-y-4">
            {/* ملخص */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-sm text-blue-600 font-medium">أيام تمت معالجتها</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{result.totalDaysProcessed}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-sm text-purple-600 font-medium">عدد المواد</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{result.contentsCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <InformationCircleIcon className="w-4 h-4 text-cyan-600" />
                  <p className="text-sm text-cyan-600 font-medium">محاضرات تم إنشاؤها</p>
                </div>
                <p className="text-3xl font-bold text-cyan-700">{result.totalSessionsCreated}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">سجلات جديدة</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{result.totalCreated}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ArrowPathIcon className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-600 font-medium">تم تحديثها (غياب→حضور)</p>
                </div>
                <p className="text-3xl font-bold text-amber-700">{result.totalUpdated}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">أخطاء</p>
                </div>
                <p className="text-3xl font-bold text-red-700">{result.totalErrors}</p>
              </div>
            </div>

            {/* تفاصيل */}
            {result.details.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    سجلات الحضور الجديدة ({result.details.length}{result.details.length >= 200 ? '+' : ''})
                  </h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-3 py-3 text-right font-bold text-slate-600">#</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">التاريخ</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">المتدرب</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">المادة المصدر</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">المادة المنسوخ إليها</th>
                        <th className="px-3 py-3 text-center font-bold text-slate-600">الحالة</th>
                        <th className="px-3 py-3 text-center font-bold text-slate-600">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.map((detail, index) => {
                        const sl = statusLabels[detail.status] || { label: detail.status, color: 'bg-slate-100 text-slate-700' };
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3 font-medium text-slate-800">
                              {new Date(detail.date).toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-3 py-3 font-medium">{detail.traineeName}</td>
                            <td className="px-3 py-3 text-purple-700 font-medium">{detail.sourceContent}</td>
                            <td className="px-3 py-3 text-indigo-700 font-medium">{detail.targetContent}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sl.color}`}>
                                {sl.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                detail.action === 'تحديث' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {detail.action}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* أخطاء */}
            {result.errors.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  أخطاء أثناء المعالجة ({result.errors.length})
                </h3>
                <ul className="space-y-1 text-sm text-red-800">
                  {result.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.totalCreated === 0 && result.totalUpdated === 0 && result.totalErrors === 0 && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900">جميع السجلات موحدة بالفعل!</h3>
                <p className="text-sm text-green-700 mt-1">
                  لا توجد سجلات حضور ناقصة في هذا الفصل الدراسي. جميع المتدربين مسجلون في جميع المواد.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
