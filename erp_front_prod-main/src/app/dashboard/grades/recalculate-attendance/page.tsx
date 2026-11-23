'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
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
} from '@heroicons/react/24/outline';
import { RequirePermission } from '@/components/permissions/PermissionGate';

interface RecalcResult {
  total: number;
  updated: number;
  errors: number;
  details: Array<{
    traineeId: number;
    contentId: number;
    classroomId: number;
    oldGrade: number;
    newGrade: number;
  }>;
}

export default function RecalculateAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecalcResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      setResult(null);
      setShowConfirm(false);

      const data: RecalcResult = await fetchAPI('/attendance/recalculate-grades', {
        method: 'POST',
      });
      setResult(data);

      if (data.updated > 0) {
        toast.success(`تم تحديث درجات ${data.updated} سجل بنجاح`);
      } else {
        toast.info('جميع الدرجات صحيحة، لا يوجد تحديثات');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setLoading(false);
    }
  };

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
        title="إعادة حساب درجات الحضور"
        description="إعادة حساب درجات الحضور لجميع المتدربين بناءً على سجلات الحضور الفعلية"
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
            <p>تقوم هذه الأداة بإعادة حساب درجات الحضور لجميع المتدربين في جميع المواد التدريبية.</p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-100">
              <p className="font-bold text-slate-800">طريقة الحساب الصحيحة:</p>
              <p className="font-mono bg-slate-100 px-3 py-1 rounded inline-block text-slate-800">
                درجة الحضور = (عدد المحاضرات الحاضرة ÷ عدد المحاضرات المُسجَلة) × الدرجة القصوى
              </p>
              <p className="text-xs text-slate-500">
                * المحاضرات المُسجَلة = المحاضرات التي تم رصد حضور فيها فعلياً وليس كل المحاضرات المجدولة
              </p>
            </div>
            <p>
              <span className="font-bold">مثال:</span> متدرب حضر 9 محاضرات من أصل 11 محاضرة مسجلة، والدرجة القصوى 10 → 
              <span className="font-bold text-slate-800"> (9÷11) × 10 = 8.18 درجة</span>
            </p>
          </div>
        </div>
      </div>

      {/* زر التنفيذ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="text-center space-y-4">
          {!showConfirm ? (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              size="lg"
              variant="warning"
            >
              <ArrowPathIcon className="w-5 h-5 ml-2" />
              إعادة حساب درجات الحضور لجميع المتدربين
            </Button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-lg mx-auto space-y-4">
              <div className="flex items-center gap-3 text-slate-800">
                <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-amber-500" />
                <p className="font-bold text-lg">هل أنت متأكد؟</p>
              </div>
              <p className="text-sm text-slate-600">
                سيتم إعادة حساب درجات الحضور لجميع المتدربين في جميع المواد. هذه العملية قد تستغرق بعض الوقت.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleRecalculate}
                  disabled={loading}
                  variant="danger"
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

      {/* نتيجة العملية */}
      {result && (
        <div className="space-y-4">
          {/* ملخص */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <p className="text-sm text-blue-600 font-medium">إجمالي السجلات</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{result.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600 font-medium">تم تحديثها</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{result.updated}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600 font-medium">أخطاء</p>
              </div>
              <p className="text-3xl font-bold text-red-700">{result.errors}</p>
            </div>
          </div>

          {/* تفاصيل التحديثات */}
          {result.details.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  الدرجات التي تم تعديلها ({result.details.length})
                </h3>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-right font-bold text-slate-600">#</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600">معرف المتدرب</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600">معرف المادة</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600">معرف الفصل</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600">الدرجة القديمة</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600">الدرجة الجديدة</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600">الفرق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((detail, index) => {
                      const diff = detail.newGrade - detail.oldGrade;
                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-medium">{detail.traineeId}</td>
                          <td className="px-4 py-3">{detail.contentId}</td>
                          <td className="px-4 py-3">{detail.classroomId}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-red-600 font-semibold">{detail.oldGrade.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-green-600 font-semibold">{detail.newGrade.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              diff > 0 ? 'bg-green-100 text-green-700' : diff < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
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

          {result.details.length === 0 && result.errors === 0 && (
            <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-900">جميع الدرجات صحيحة!</h3>
              <p className="text-sm text-green-700 mt-1">لا يوجد أي تعديلات مطلوبة، درجات الحضور محسوبة بشكل صحيح.</p>
            </div>
          )}
        </div>
      )}
    </div>
    </RequirePermission>
  );
}
