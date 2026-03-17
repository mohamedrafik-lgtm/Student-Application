'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAllPrograms } from '@/app/lib/api/programs';
import { downloadFile } from '@/lib/api';
import {
  ArrowDownTrayIcon,
  PhotoIcon,
  IdentificationIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  BriefcaseIcon,
  CheckIcon,
  ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect } from '@/app/components/ui/Select';

const DOCUMENT_TYPES = [
  { value: 'PERSONAL_PHOTO', label: 'الصورة الشخصية', icon: PhotoIcon },
  { value: 'ID_CARD_FRONT', label: 'البطاقة (وجه)', icon: IdentificationIcon },
  { value: 'ID_CARD_BACK', label: 'البطاقة (ظهر)', icon: IdentificationIcon },
  { value: 'QUALIFICATION_FRONT', label: 'المؤهل (وجه)', icon: AcademicCapIcon },
  { value: 'QUALIFICATION_BACK', label: 'المؤهل (ظهر)', icon: AcademicCapIcon },
  { value: 'EXPERIENCE_CERT', label: 'شهادة الخبرة', icon: BriefcaseIcon },
  { value: 'MINISTRY_CERT', label: 'شهادة الوزارة', icon: BuildingLibraryIcon },
  { value: 'PROFESSION_CARD', label: 'كارنيه المهنة', icon: IdentificationIcon },
  { value: 'SKILL_CERT', label: 'شهادة المهارة', icon: DocumentTextIcon },
];

function BulkDownloadPageContent() {
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const downloadingRef = useRef(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await getAllPrograms();
      setPrograms(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('فشل تحميل البرامج');
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const selectAll = () => {
    setSelectedTypes(prev =>
      prev.length === DOCUMENT_TYPES.length ? [] : DOCUMENT_TYPES.map(t => t.value)
    );
  };

  const handleDownload = async () => {
    if (selectedTypes.length === 0) {
      toast.error('يجب اختيار نوع وثيقة واحد على الأقل');
      return;
    }
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedProgram) params.append('programId', selectedProgram);
      params.append('documentTypes', selectedTypes.join(','));

      const blob = await downloadFile(`/trainees/documents/bulk-download-archives?${params.toString()}`);

      if (!blob || blob.size === 0) {
        throw new Error('الملف فارغ أو لم يتم استلامه');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archives_${selectedProgram || 'all'}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);

      toast.success('تم تحميل الأرشيفات بنجاح');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'فشل التحميل');
    } finally {
      setLoading(false);
      downloadingRef.current = false;
    }
  };

  const allSelected = selectedTypes.length === DOCUMENT_TYPES.length;

  return (
    <div>
      <PageHeader
        title="تحميل أرشيفات جماعية"
        description="تحميل ملف مضغوط يحتوي على أرشيفات متدربين متعددة"
        backUrl="/dashboard/trainees/archive"
        actions={
          <Button
            onClick={handleDownload}
            disabled={loading || selectedTypes.length === 0}
            leftIcon={
              loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <ArrowDownTrayIcon className="w-4 h-4" />
              )
            }
            className="bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white text-sm px-5 py-3 sm:py-2 w-full sm:w-auto justify-center"
          >
            {loading ? 'جاري التجهيز...' : `تحميل (${selectedTypes.length} نوع)`}
          </Button>
        }
      />

      <div className="space-y-5">
        {/* ── اختيار البرنامج ── */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <label className="block text-sm font-bold text-slate-700 mb-2">البرنامج التدريبي</label>
          <SearchableSelect
            options={[
              { value: '', label: 'جميع البرامج' },
              ...programs.map(p => ({ value: p.id.toString(), label: p.nameAr }))
            ]}
            value={selectedProgram}
            onChange={(value) => setSelectedProgram(value)}
            placeholder="اختر البرنامج"
            instanceId="bulk-program-select"
          />
          <p className="text-xs text-slate-400 mt-2">اتركه فارغاً لتحميل أرشيفات جميع المتدربين</p>
        </div>

        {/* ── أنواع الوثائق ── */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700">أنواع الوثائق</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedTypes.length === 0
                  ? 'اختر الوثائق المطلوب تحميلها'
                  : `تم اختيار ${selectedTypes.length} من ${DOCUMENT_TYPES.length}`}
              </p>
            </div>
            <button
              onClick={selectAll}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                allSelected
                  ? 'bg-tiba-primary-50 text-tiba-primary-700 border-tiba-primary-200 hover:bg-tiba-primary-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {DOCUMENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedTypes.includes(type.value);
              return (
                <button
                  key={type.value}
                  onClick={() => toggleType(type.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-right ${
                    isSelected
                      ? 'border-tiba-primary-400 bg-tiba-primary-50 shadow-sm'
                      : 'border-slate-150 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-tiba-primary-100 text-tiba-primary-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-tiba-primary-800' : 'text-slate-700'}`}>
                    {type.label}
                  </span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-tiba-primary-600 border-tiba-primary-600'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── زر التحميل (موبايل) ── */}
        <div className="sm:hidden">
          <button
            onClick={handleDownload}
            disabled={loading || selectedTypes.length === 0}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl font-bold text-sm text-white bg-tiba-secondary-600 hover:bg-tiba-secondary-700 active:bg-tiba-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري تجهيز الأرشيفات...
              </>
            ) : (
              <>
                <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                تحميل الأرشيفات ({selectedTypes.length} نوع)
              </>
            )}
          </button>
        </div>

        {/* ── ملاحظة ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">ملاحظة مهمة</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              قد يستغرق التحميل بعض الوقت حسب عدد المتدربين وحجم الوثائق. لا تغلق الصفحة أثناء التجهيز.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulkDownloadPage() {
  return (
    <PageGuard>
      <BulkDownloadPageContent />
    </PageGuard>
  );
}