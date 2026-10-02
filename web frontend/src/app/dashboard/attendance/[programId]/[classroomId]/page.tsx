'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaModal } from '@/components/ui/tiba-modal';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import {
  BookOpenIcon,
  ArrowRightIcon,
  UserIcon,
  PrinterIcon,
  EyeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  classroomId: number;
  instructor: {
    id: string;
    name: string;
  };
  _count: {
    scheduleSlots: number;
  };
}

interface Classroom {
  id: number;
  name: string;
  program: {
    id: number;
    nameAr: string;
  };
}

const CARD_ACCENTS = [
  'border-t-violet-500',
  'border-t-blue-500',
  'border-t-emerald-500',
  'border-t-amber-500',
  'border-t-rose-500',
  'border-t-teal-500',
];

export default function ClassroomContentsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const classroomId = params.classroomId as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [printOptions, setPrintOptions] = useState({
    includeTraineePhone: false,
    includeGuardianPhone: false,
    includeNotes: false,
  });

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classroomData, contentsData] = await Promise.all([
        fetchAPI(`/programs/classroom/${classroomId}`),
        fetchAPI(`/training-contents?classroomId=${classroomId}`)
      ]);
      
      setClassroom(classroomData);
      // تصفية المواد حسب الفصل المحدد لضمان عدم ظهور مواد فصول أخرى للمستخدمين ذوي الصلاحيات المحدودة
      const filteredContents = (contentsData || []).filter(
        (c: TrainingContent) => c.classroomId === parseInt(classroomId)
      );
      setContents(filteredContents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintClick = (contentId: number) => {
    setSelectedContentId(contentId);
    setPrintDialogOpen(true);
  };

  const confirmPrint = () => {
    if (!selectedContentId) return;
    
    const params = new URLSearchParams();
    if (printOptions.includeTraineePhone) params.append('includeTraineePhone', 'true');
    if (printOptions.includeGuardianPhone) params.append('includeGuardianPhone', 'true');
    if (printOptions.includeNotes) params.append('includeNotes', 'true');
    
    const printUrl = `/print/content-attendance-report/${selectedContentId}?${params.toString()}`;
    window.open(printUrl, '_blank');
    setPrintDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="..." description="جاري التحميل..." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }, { label: '...' }]} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 bg-slate-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-200 rounded w-40" /><div className="h-3 bg-slate-100 rounded w-28" /></div></div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" /><div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="space-y-6">
        <PageHeader title="الفصل غير موجود" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }]} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><BuildingOfficeIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-3">الفصل غير موجود</h3>
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/attendance/${programId}`)} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>العودة للفصول</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'view' }}>
      <div className="space-y-6">
        <PageHeader
          title={classroom.name}
          description="اختر المادة التدريبية لعرض المحاضرات وتسجيل الحضور"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'رصد الحضور', href: '/dashboard/attendance' },
            { label: classroom.program.nameAr, href: `/dashboard/attendance/${programId}` },
            { label: classroom.name }
          ]}
        />

        {contents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-violet-50 rounded-full flex items-center justify-center mx-auto mb-4"><BookOpenIcon className="w-7 h-7 text-slate-400" /></div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد مواد تدريبية</h3>
              <p className="text-sm text-slate-500">لا توجد مواد متاحة في هذا الفصل</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contents.map((content, idx) => (
              <div key={content.id} className={`bg-white rounded-xl border border-slate-200 border-t-4 ${CARD_ACCENTS[idx % CARD_ACCENTS.length]} shadow-sm hover:shadow-md transition-all`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpenIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{content.code}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-3 line-clamp-2">{content.name}</h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{content.instructor.name}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/attendance/${programId}/${classroomId}/${content.id}`)}
                      leftIcon={<EyeIcon className="w-3.5 h-3.5" />}
                    >
                      المحاضرات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handlePrintClick(content.id); }}
                      leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}
                    >
                      طباعة
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Options Modal */}
      <TibaModal
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        variant="primary"
        size="md"
        title="خيارات طباعة تقرير الحضور"
        subtitle="اختر البيانات الإضافية التي تريد إضافتها للتقرير"
        icon={<PrinterIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-2 w-full">
            <Button size="sm" className="flex-1" onClick={confirmPrint} leftIcon={<PrinterIcon className="w-3.5 h-3.5" />}>طباعة الآن</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setPrintDialogOpen(false)}>إلغاء</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={printOptions.includeTraineePhone} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeTraineePhone: e.target.checked }))} className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
            <div><p className="text-sm font-bold text-slate-800">رقم هاتف المتدرب</p><p className="text-xs text-slate-500">سيتم إضافة عمود يحتوي على رقم هاتف كل متدرب</p></div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={printOptions.includeGuardianPhone} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeGuardianPhone: e.target.checked }))} className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
            <div><p className="text-sm font-bold text-slate-800">رقم هاتف ولي الأمر</p><p className="text-xs text-slate-500">سيتم إضافة عمود يحتوي على رقم هاتف ولي أمر كل متدرب</p></div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={printOptions.includeNotes} onChange={(e) => setPrintOptions(prev => ({ ...prev, includeNotes: e.target.checked }))} className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
            <div><p className="text-sm font-bold text-slate-800">ملاحظات المتدرب</p><p className="text-xs text-slate-500">سيتم إضافة عمود يحتوي على جميع ملاحظات كل متدرب</p></div>
          </label>
        </div>
      </TibaModal>
    </ProtectedPage>
  );
}

