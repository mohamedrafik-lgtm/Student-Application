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
  TrashIcon,
  MagnifyingGlassIcon,
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

interface PhantomRecord {
  sessionId: number;
  traineeId: number;
  slotContent: string;
  distributionRoom: string;
  status: string;
  notes: string | null;
}

interface CleanupResult {
  classroomId: number;
  totalChecked: number;
  totalDeleted: number;
  phantomRecords: PhantomRecord[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'حاضر', color: 'bg-green-100 text-green-700' },
  LATE: { label: 'متأخر', color: 'bg-yellow-100 text-yellow-700' },
  EXCUSED: { label: 'معذور', color: 'bg-blue-100 text-blue-700' },
  ABSENT: { label: 'غائب', color: 'bg-red-100 text-red-700' },
};

export default function CleanupAttendancePage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
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

  const handleCleanup = async () => {
    if (!selectedClassroom) return;
    try {
      setLoading(true);
      setResult(null);
      setShowConfirm(false);

      const data: CleanupResult = await fetchAPI(`/attendance/cleanup-phantom-records/${selectedClassroom}`, {
        method: 'POST',
      });
      setResult(data);

      if (data.totalDeleted > 0) {
        toast.success(`تم حذف ${data.totalDeleted} سجل حضور وهمي بنجاح`);
      } else {
        toast.info('لا توجد سجلات وهمية — البيانات سليمة');
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
          title="تنظيف سجلات الحضور الوهمية"
          description="حذف سجلات حضور لمتدربين مسجلين في جلسات ليست مجموعتهم"
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
                تقوم هذه الأداة بفحص جميع سجلات الحضور في الفصل الدراسي المحدد، 
                والبحث عن سجلات <strong>وهمية</strong> — وهي سجلات لمتدربين تم تسجيلهم في 
                جلسات محاضرات تابعة لمجموعة توزيع <strong>ليست مجموعتهم</strong>.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-100">
                <p className="font-bold text-slate-800">مثال عن المشكلة:</p>
                <p>
                  المتدرب (أحمد) في <span className="font-bold text-blue-700">مجموعة النظري 1</span>.
                  مادة الأطفال لها حصتان: الأولى للمجموعة 1 والثانية للمجموعة 2.
                </p>
                <p>
                  بسبب خطأ سابق في النظام، تم تسجيل أحمد <span className="text-green-700 font-bold">حاضر</span> في 
                  حصة <span className="font-bold text-red-700">المجموعة 2</span> أيضاً — رغم أنها ليست مجموعته!
                </p>
                <p>
                  هذه الأداة ستحذف هذا السجل الوهمي وتبقي فقط السجل الصحيح في مجموعته.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-800">ملاحظات مهمة:</p>
                  <ul className="list-disc list-inside text-xs text-amber-700 mt-1 space-y-1">
                    <li>يتم فحص الجلسات المرتبطة بمجموعات توزيع فقط.</li>
                    <li>الجلسات العامة (بدون مجموعة) لا تتأثر.</li>
                    <li>سيتم <strong>حذف</strong> السجلات الوهمية نهائياً.</li>
                    <li>يُنصح بتشغيل هذه الأداة مرة واحدة لإصلاح البيانات القديمة.</li>
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
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
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
                    instanceId="cleanup-classroom-select"
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
                  variant="danger"
                >
                  <TrashIcon className="w-5 h-5 ml-2" />
                  فحص وتنظيف السجلات الوهمية
                </Button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-lg mx-auto space-y-4">
                  <div className="flex items-center gap-3 text-slate-800">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-amber-500" />
                    <p className="font-bold text-lg">هل أنت متأكد؟</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    سيتم فحص جميع سجلات الحضور في{' '}
                    <strong>{selectedClassroomData?.program.nameAr} — {selectedClassroomData?.name}</strong>{' '}
                    وحذف أي سجل لمتدرب في جلسة ليست مجموعته. هذا الإجراء <strong>لا يمكن التراجع عنه</strong>.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={handleCleanup}
                      disabled={loading}
                      variant="danger"
                    >
                      <ArrowPathIcon className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'جاري الفحص والتنظيف...' : 'نعم، تنفيذ الآن'}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-sm text-blue-600 font-medium">سجلات تم فحصها</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{result.totalChecked}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrashIcon className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">سجلات وهمية تم حذفها</p>
                </div>
                <p className="text-3xl font-bold text-red-700">{result.totalDeleted}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">سجلات سليمة</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{result.totalChecked - result.totalDeleted}</p>
              </div>
            </div>

            {/* تفاصيل السجلات المحذوفة */}
            {result.phantomRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <TrashIcon className="w-5 h-5 text-red-600" />
                    السجلات الوهمية المحذوفة ({result.phantomRecords.length}{result.phantomRecords.length >= 200 ? '+' : ''})
                  </h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-3 py-3 text-right font-bold text-slate-600">#</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">رقم الجلسة</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">رقم المتدرب</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">المادة</th>
                        <th className="px-3 py-3 text-center font-bold text-slate-600">الحالة</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-600">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.phantomRecords.map((record, index) => {
                        const sl = statusLabels[record.status] || { label: record.status, color: 'bg-slate-100 text-slate-700' };
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-red-50">
                            <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3 font-mono text-slate-600">{record.sessionId}</td>
                            <td className="px-3 py-3 font-mono text-slate-600">{record.traineeId}</td>
                            <td className="px-3 py-3 font-medium text-red-700">{record.slotContent}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sl.color}`}>
                                {sl.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                              {record.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.totalDeleted === 0 && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900">لا توجد سجلات وهمية!</h3>
                <p className="text-sm text-green-700 mt-1">
                  جميع سجلات الحضور في هذا الفصل الدراسي سليمة. كل متدرب مسجل فقط في جلسات مجموعته.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
