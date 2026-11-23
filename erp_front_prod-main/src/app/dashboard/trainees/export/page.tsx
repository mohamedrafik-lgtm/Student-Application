'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, API_BASE_URL, getAuthToken } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import { 
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhoneIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Distribution {
  id: number;
  type: 'THEORY' | 'PRACTICAL';
  academicYear: string;
  program: Program;
  rooms: Array<{
    id: number;
    roomName: string;
    roomNumber: string;
    assignments: Array<{
      id: number;
      trainee: {
        id: number;
        nameAr: string;
        nationalId: string;
      };
    }>;
  }>;
}

interface ExportOptions {
  programId?: number;
  includePersonalData: boolean;
  includeContactData: boolean;
  includeAddressData: boolean;
  includeProgramData: boolean;
  includeAcademicData: boolean;
  includeGradesData: boolean;
  includeDistributionData: boolean;
  includeNotes: boolean;
  // إضافة خيارات مفصلة للبيانات الأكاديمية
  academicDataDetails: {
    educationType: boolean;
    schoolName: boolean;
    educationalAdministration: boolean;
    graduationDate: boolean;
    totalGrade: boolean;
    gradePercentage: boolean;
  };
  // إضافة خيارات مفصلة للبيانات الشخصية
  personalDataDetails: {
    nationalId: boolean;
    birthDate: boolean;
    gender: boolean;
    nationality: boolean;
    religion: boolean;
    maritalStatus: boolean;
    idIssueDate: boolean;
    idExpiryDate: boolean;
  };
  // إضافة خيارات مفصلة لبيانات الاتصال
  contactDataDetails: {
    phone: boolean;
    email: boolean;
    guardianPhone: boolean;
    guardianEmail: boolean;
    guardianName: boolean;
  };
  // إضافة خيارات مفصلة لبيانات العنوان
  addressDataDetails: {
    country: boolean;
    governorate: boolean;
    city: boolean;
    address: boolean;
    residenceAddress: boolean;
  };
  // إضافة خيارات مفصلة لبيانات البرنامج
  programDataDetails: {
    programName: boolean;
    programType: boolean;
    enrollmentType: boolean;
    academicYear: boolean;
    classLevel: boolean;
    traineeStatus: boolean;
  };
}

function TraineeExportPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [selectedDistributions, setSelectedDistributions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includePersonalData: true,
    includeContactData: true,
    includeAddressData: true,
    includeProgramData: true,
    includeAcademicData: true,
    includeGradesData: false,
    includeDistributionData: false,
    includeNotes: true,
    personalDataDetails: {
      nationalId: true,
      birthDate: true,
      gender: true,
      nationality: true,
      religion: true,
      maritalStatus: true,
      idIssueDate: false,
      idExpiryDate: false,
    },
    contactDataDetails: {
      phone: true,
      email: true,
      guardianPhone: true,
      guardianEmail: true,
      guardianName: true,
    },
    addressDataDetails: {
      country: true,
      governorate: true,
      city: true,
      address: true,
      residenceAddress: true,
    },
    programDataDetails: {
      programName: true,
      programType: true,
      enrollmentType: true,
      academicYear: true,
      classLevel: true,
      traineeStatus: true,
    },
    academicDataDetails: {
      educationType: true,
      schoolName: true,
      educationalAdministration: true,
      graduationDate: true,
      totalGrade: true,
      gradePercentage: true,
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [programsRes, distributionsRes] = await Promise.all([
        fetchAPI('/programs'),
        fetchAPI('/trainee-distribution')
      ]);

      if (programsRes.success && programsRes.data) {
        setPrograms(programsRes.data);
      } else if (Array.isArray(programsRes)) {
        setPrograms(programsRes);
      }

      if (distributionsRes.success && distributionsRes.data) {
        setDistributions(distributionsRes.data);
      } else if (Array.isArray(distributionsRes)) {
        setDistributions(distributionsRes);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const exportData = {
        programId: exportOptions.programId,
        includePersonalData: exportOptions.includePersonalData,
        includeContactData: exportOptions.includeContactData,
        includeAddressData: exportOptions.includeAddressData,
        includeProgramData: exportOptions.includeProgramData,
        includeAcademicData: exportOptions.includeAcademicData,
        includeGradesData: exportOptions.includeGradesData,
        includeDistributionData: exportOptions.includeDistributionData,
        includeNotes: exportOptions.includeNotes,
        personalDataDetails: exportOptions.personalDataDetails,
        contactDataDetails: exportOptions.contactDataDetails,
        addressDataDetails: exportOptions.addressDataDetails,
        programDataDetails: exportOptions.programDataDetails,
        academicDataDetails: exportOptions.academicDataDetails,
      };

      // الحصول على الـ token من الدالة المشتركة
      const token = getAuthToken();
      
      if (!token) {
        toast.error('يرجى تسجيل الدخول أولاً');
        return;
      }
      
      // استخدام API_BASE_URL من المتغيرات البيئية المشتركة
      const response = await fetch(`${API_BASE_URL}/trainees/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trainees_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('تم استخراج البيانات بنجاح');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في استخراج البيانات');
      }

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'حدث خطأ أثناء استخراج البيانات');
    } finally {
      setExporting(false);
    }
  };

  const programOptions = [
    { value: '', label: 'جميع البرامج' },
    ...programs.map(program => ({
      value: program.id.toString(),
      label: program.nameAr
    }))
  ];

  const distributionOptions = distributions
    .filter(dist => !exportOptions.programId || dist.program.id === exportOptions.programId)
    .map(dist => ({
      value: dist.id,
      label: `${dist.program.nameAr} - ${dist.type === 'THEORY' ? 'نظري' : 'عملي'} (${dist.academicYear})`,
      type: dist.type,
      programName: dist.program.nameAr,
      academicYear: dist.academicYear,
    }));

  const toggleOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const toggleDistribution = (distributionId: number) => {
    setSelectedDistributions(prev => 
      prev.includes(distributionId) 
        ? prev.filter(id => id !== distributionId)
        : [...prev, distributionId]
    );
  };

  const selectAllDistributions = () => {
    setSelectedDistributions(distributionOptions.map(opt => opt.value));
  };

  const clearAllDistributions = () => {
    setSelectedDistributions([]);
  };

  const selectTheoryDistributions = () => {
    const theoryDistributions = distributionOptions
      .filter(opt => opt.type === 'THEORY')
      .map(opt => opt.value);
    setSelectedDistributions(theoryDistributions);
  };

  const toggleDetailOption = (group: string, option: string) => {
    setExportOptions(prev => ({
      ...prev,
      [`${group}Details`]: {
        ...prev[`${group}Details` as keyof ExportOptions] as any,
        [option]: !(prev[`${group}Details` as keyof ExportOptions] as any)[option]
      }
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-tiba-primary border-t-transparent" />
          <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="استخراج بيانات المتدربين"
        description="استخراج بيانات المتدربين في ملفات Excel مع خيارات متقدمة للتصفية والتصدير."
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'استخراج البيانات' }
        ]}
        actions={
          <Button
            onClick={handleExport}
            disabled={exporting}
            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {exporting ? 'جاري الاستخراج...' : 'استخراج البيانات'}
          </Button>
        }
      />

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* خيارات التصفية */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-tiba-primary/10">
                  <FunnelIcon className="w-4 h-4 text-tiba-primary" />
                </div>
                خيارات التصفية
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  البرنامج التدريبي
                </label>
                <SearchableSelect
                  options={programOptions}
                  value={exportOptions.programId?.toString() || ''}
                  onChange={(value) => {
                    setExportOptions(prev => ({
                      ...prev,
                      programId: value ? Number(value) : undefined,
                    }));
                    setSelectedDistributions([]);
                  }}
                  placeholder="اختر البرنامج التدريبي"
                />
              </div>
            </div>
          </div>

          {/* خيارات التصدير */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <DocumentArrowDownIcon className="w-4 h-4 text-emerald-600" />
                </div>
                خيارات التصدير
              </h3>
            </div>
            
            <div className="p-5 space-y-3">
              {/* البيانات الشخصية */}
              <ExportSection
                icon={<IdentificationIcon className="w-4 h-4 text-blue-600" />}
                label="البيانات الشخصية"
                checked={exportOptions.includePersonalData}
                onToggle={() => toggleOption('includePersonalData')}
              >
                {exportOptions.includePersonalData && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pr-6">
                    {Object.entries(exportOptions.personalDataDetails).map(([key, value]) => (
                      <DetailCheckbox
                        key={key}
                        checked={value}
                        onChange={() => toggleDetailOption('personalData', key)}
                        label={personalDataLabels[key] || key}
                      />
                    ))}
                  </div>
                )}
              </ExportSection>

              {/* بيانات الاتصال */}
              <ExportSection
                icon={<PhoneIcon className="w-4 h-4 text-emerald-600" />}
                label="بيانات الاتصال"
                checked={exportOptions.includeContactData}
                onToggle={() => toggleOption('includeContactData')}
              >
                {exportOptions.includeContactData && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pr-6">
                    {Object.entries(exportOptions.contactDataDetails).map(([key, value]) => (
                      <DetailCheckbox
                        key={key}
                        checked={value}
                        onChange={() => toggleDetailOption('contactData', key)}
                        label={contactDataLabels[key] || key}
                      />
                    ))}
                  </div>
                )}
              </ExportSection>

              {/* بيانات العنوان */}
              <ExportSection
                icon={<MapPinIcon className="w-4 h-4 text-violet-600" />}
                label="بيانات العنوان"
                checked={exportOptions.includeAddressData}
                onToggle={() => toggleOption('includeAddressData')}
              >
                {exportOptions.includeAddressData && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pr-6">
                    {Object.entries(exportOptions.addressDataDetails).map(([key, value]) => (
                      <DetailCheckbox
                        key={key}
                        checked={value}
                        onChange={() => toggleDetailOption('addressData', key)}
                        label={addressDataLabels[key] || key}
                      />
                    ))}
                  </div>
                )}
              </ExportSection>

              {/* بيانات البرنامج */}
              <ExportSection
                icon={<AcademicCapIcon className="w-4 h-4 text-indigo-600" />}
                label="بيانات البرنامج"
                checked={exportOptions.includeProgramData}
                onToggle={() => toggleOption('includeProgramData')}
              >
                {exportOptions.includeProgramData && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pr-6">
                    {Object.entries(exportOptions.programDataDetails).map(([key, value]) => (
                      <DetailCheckbox
                        key={key}
                        checked={value}
                        onChange={() => toggleDetailOption('programData', key)}
                        label={programDataLabels[key] || key}
                      />
                    ))}
                  </div>
                )}
              </ExportSection>

              {/* البيانات الأكاديمية */}
              <ExportSection
                icon={<CalendarDaysIcon className="w-4 h-4 text-amber-600" />}
                label="البيانات الأكاديمية"
                checked={exportOptions.includeAcademicData}
                onToggle={() => toggleOption('includeAcademicData')}
              >
                {exportOptions.includeAcademicData && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pr-6">
                    {Object.entries(exportOptions.academicDataDetails).map(([key, value]) => (
                      <DetailCheckbox
                        key={key}
                        checked={value}
                        onChange={() => toggleDetailOption('academicData', key)}
                        label={academicDataLabels[key] || key}
                      />
                    ))}
                  </div>
                )}
              </ExportSection>

              {/* باقي الخيارات */}
              {[
                { key: 'includeGradesData', label: 'الدرجات', icon: <ChartBarIcon className="w-4 h-4 text-blue-600" /> },
                { key: 'includeDistributionData', label: 'بيانات التوزيع', icon: <BuildingOfficeIcon className="w-4 h-4 text-red-600" /> },
                { key: 'includeNotes', label: 'الملاحظات', icon: <ChatBubbleLeftRightIcon className="w-4 h-4 text-slate-500" /> },
              ].map(({ key, label, icon }) => (
                <ExportSection
                  key={key}
                  icon={icon}
                  label={label}
                  checked={!!exportOptions[key as keyof ExportOptions]}
                  onToggle={() => toggleOption(key as keyof ExportOptions)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100">
                <UserGroupIcon className="w-4 h-4 text-slate-600" />
              </div>
              معلومات الاستخراج
            </h3>
          </div>
          
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-800 mb-2">البيانات المتاحة للاستخراج:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> الاسم بالعربية والإنجليزية</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> الرقم القومي وتواريخ البطاقة</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> تاريخ الميلاد والجنس والجنسية</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> أرقام الهواتف والبريد الإلكتروني</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> بيانات العنوان والعنوان التفصيلي</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> معلومات البرنامج والسنة الأكاديمية</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-tiba-primary" /> البيانات الأكاديمية والتوزيع</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium text-slate-800 mb-2">ملاحظات مهمة:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-amber-500" /> سيتم استخراج البيانات حسب الفلاتر المحددة</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-amber-500" /> الملف سيتم تحميله بصيغة Excel</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-amber-500" /> يمكن اختيار البيانات المراد استخراجها</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-amber-500" /> البيانات الحساسة محمية بصلاحيات خاصة</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-amber-500" /> يمكن استخراج بيانات برنامج محدد أو جميع البرامج</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Label Maps ─── */
const personalDataLabels: Record<string, string> = {
  nationalId: 'الرقم القومي', birthDate: 'تاريخ الميلاد', gender: 'الجنس',
  nationality: 'الجنسية', religion: 'الديانة', maritalStatus: 'الحالة الاجتماعية',
  idIssueDate: 'تاريخ إصدار البطاقة', idExpiryDate: 'تاريخ انتهاء البطاقة',
};
const contactDataLabels: Record<string, string> = {
  phone: 'رقم الهاتف', email: 'البريد الإلكتروني', guardianPhone: 'رقم هاتف ولي الأمر',
  guardianEmail: 'البريد الإلكتروني لولي الأمر', guardianName: 'اسم ولي الأمر',
};
const addressDataLabels: Record<string, string> = {
  country: 'الدولة', governorate: 'المحافظة', city: 'المدينة',
  address: 'العنوان', residenceAddress: 'عنوان الإقامة',
};
const programDataLabels: Record<string, string> = {
  programName: 'اسم البرنامج', programType: 'نوع البرنامج', enrollmentType: 'نوع الالتحاق',
  academicYear: 'السنة الأكاديمية', classLevel: 'المستوى الدراسي', traineeStatus: 'حالة المتدرب',
};
const academicDataLabels: Record<string, string> = {
  educationType: 'نوع التعليم', schoolName: 'اسم المدرسة/المعهد',
  educationalAdministration: 'الإدارة التعليمية', graduationDate: 'تاريخ التخرج',
  totalGrade: 'الدرجة الإجمالية', gradePercentage: 'نسبة الدرجة',
};

/* ─── Sub-components ─── */
function ExportSection({ icon, label, checked, onToggle, children }: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="h-[18px] w-[18px] rounded"
        />
      </div>
      {children}
    </div>
  );
}

function DetailCheckbox({ checked, onChange, label }: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-4 rounded"
      />
      <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">{label}</span>
    </label>
  );
}

export default function TraineeExportPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.trainees', action: 'export_data' }}>
      <TraineeExportPageContent />
    </ProtectedPage>
  );
}
