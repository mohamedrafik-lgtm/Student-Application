'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { getTraineesWithFinancialData } from '@/app/lib/api/finances';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { SearchableSelect } from '@/app/components/ui/Select';
import { Checkbox } from '@/components/ui/checkbox';
import { TibaModal } from '@/components/ui/tiba-modal';
import TraineeAvatar from '@/components/ui/trainee-avatar';
import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Trainee {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  program: Program;
  totalDebt: number;
  photoUrl?: string;
}

function TraineeTransferPageContent() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteOldDebt, setDeleteOldDebt] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [programsResponse, traineesResponse] = await Promise.all([
        fetchAPI('/programs'),
        getTraineesWithFinancialData({ limit: 1000 })
      ]);

      console.log('Programs response:', programsResponse);
      console.log('Trainees response:', traineesResponse);

      if (programsResponse && Array.isArray(programsResponse)) {
        setPrograms(programsResponse);
      } else if (programsResponse.success) {
        setPrograms(programsResponse.data);
      } else if (programsResponse.data && Array.isArray(programsResponse.data)) {
        setPrograms(programsResponse.data);
      }

      if (traineesResponse.data && Array.isArray(traineesResponse.data)) {
        console.log('Trainees data:', traineesResponse.data);
        
        // البيانات المالية محسوبة بالفعل من الباك إند
        const traineesWithDebt = traineesResponse.data.map((trainee: any) => ({
          ...trainee,
          totalDebt: trainee.remainingAmount || 0 // المديونية هي المبلغ المتبقي
        }));
        
        console.log('Trainees with debt:', traineesWithDebt);
        setTrainees(traineesWithDebt);
      } else {
        console.error('Failed to fetch trainees:', traineesResponse);
        setError('فشل في جلب بيانات المتدربين');
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleTraineeSelect = (traineeId: string) => {
    const trainee = trainees.find(t => t.id.toString() === traineeId);
    setSelectedTrainee(trainee || null);
    setSelectedProgram(null);
    setShowConfirmation(false);
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(Number(programId));
    setShowConfirmation(false);
  };

  const handleTransfer = async () => {
    if (!selectedTrainee || !selectedProgram) {
      toast.error('يرجى اختيار المتدرب والبرنامج الجديد');
      return;
    }

    // السماح بالتحويل حتى لو كان هناك مديونية
    // سيتم تطبيق رسوم البرنامج الجديد بالإضافة للمديونية الحالية
    setShowConfirmation(true);
  };

  const showFinalConfirmationDialog = () => {
    setConfirmTimer(5); // إعادة تعيين المؤقت
    setShowFinalConfirmation(true);
  };

  // مؤقت العد التنازلي
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (showFinalConfirmation && confirmTimer > 0) {
      timer = setTimeout(() => {
        setConfirmTimer(confirmTimer - 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showFinalConfirmation, confirmTimer]);

  const confirmTransfer = async () => {
    if (!selectedTrainee || !selectedProgram) return;

    setShowFinalConfirmation(false);
    
    try {
      setTransferring(true);
      
      const response = await fetchAPI('/trainees/transfer', {
        method: 'POST',
        body: JSON.stringify({
          traineeId: selectedTrainee.id,
          newProgramId: selectedProgram,
          deleteOldDebt: deleteOldDebt
        })
      });

      if (response.success) {
        toast.success(deleteOldDebt ? 'تم تحويل المتدرب بنجاح مع حذف المديونية القديمة وتطبيق رسوم البرنامج الجديد' : 'تم تحويل المتدرب بنجاح وتم تطبيق الرسوم الدراسية للبرنامج الجديد');
        setSelectedTrainee(null);
        setSelectedProgram(null);
        setShowConfirmation(false);
        setDeleteOldDebt(false);
        fetchData(); // تحديث البيانات
      } else {
        throw new Error(response.message || 'فشل في تحويل المتدرب');
      }

    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحويل المتدرب');
    } finally {
      setTransferring(false);
    }
  };

  const cancelTransfer = () => {
    setShowConfirmation(false);
  };

  // فلترة المتدربين حسب البحث
  const filteredTrainees = trainees.filter(trainee => 
    trainee.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainee.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainee.nationalId.includes(searchTerm) ||
    trainee.program.nameAr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const programOptions = programs
    .filter(program => !selectedTrainee || program.id !== selectedTrainee.program.id)
    .map(program => ({
      value: program.id.toString(),
      label: program.nameAr
    }));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-tiba-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تحويل المتدربين بين البرامج"
        description="تحويل المتدربين من برنامج تدريبي إلى برنامج آخر"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'إدارة المتدربين', href: '/dashboard/trainees' },
          { label: 'تحويل المتدربين' }
        ]}
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
          {/* اختيار المتدرب */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-tiba-primary/10">
                  <UserGroupIcon className="w-4 h-4 text-tiba-primary" />
                </div>
                اختيار المتدرب
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  المتدرب المراد تحويله
                  <span className="text-slate-400 text-xs mr-2">
                    ({filteredTrainees.length} من {trainees.length})
                  </span>
                </label>
                
                {/* شريط البحث */}
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم أو الرقم القومي أو البرنامج..."
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-tiba-primary/20 focus:border-tiba-primary transition-colors placeholder:text-slate-400"
                  />
                </div>

                {/* قائمة المتدربين */}
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredTrainees.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">
                      {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد متدربين'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredTrainees.map((trainee) => (
                        <div
                          key={trainee.id}
                          onClick={() => handleTraineeSelect(trainee.id.toString())}
                          className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                            selectedTrainee?.id === trainee.id ? 'bg-tiba-primary/5 border-r-[3px] border-r-tiba-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <TraineeAvatar
                              photoUrl={trainee.photoUrl}
                              name={trainee.nameAr}
                              nationalId={trainee.nationalId}
                              size="sm"
                              showZoomHint={false}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-medium text-slate-800 truncate">{trainee.nameAr}</h4>
                                <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  trainee.totalDebt === 0 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {trainee.totalDebt === 0 ? 'مسدد' : `${trainee.totalDebt} ج.م`}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{trainee.nationalId}</p>
                              <p className="text-xs text-slate-400">{trainee.program.nameAr}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedTrainee && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">معلومات المتدرب</h4>
                  <div className="flex items-start gap-3">
                    <TraineeAvatar
                      photoUrl={selectedTrainee.photoUrl}
                      name={selectedTrainee.nameAr}
                      nationalId={selectedTrainee.nationalId}
                      size="md"
                      showZoomHint={false}
                    />
                    <div className="space-y-1.5 text-sm flex-1">
                      <p className="text-slate-700"><span className="font-medium text-slate-800">الاسم:</span> {selectedTrainee.nameAr}</p>
                      <p className="text-slate-700"><span className="font-medium text-slate-800">الرقم القومي:</span> {selectedTrainee.nationalId}</p>
                      <p className="text-slate-700"><span className="font-medium text-slate-800">البرنامج الحالي:</span> {selectedTrainee.program.nameAr}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">المديونية:</span>
                        {selectedTrainee.totalDebt === 0 ? (
                          <span className="flex items-center gap-1 text-sm text-emerald-600">
                            <CheckCircleIcon className="w-4 h-4" />
                            مسدد بالكامل
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-red-600">
                            <XCircleIcon className="w-4 h-4" />
                            {selectedTrainee.totalDebt} جنيه
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* اختيار البرنامج الجديد */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <AcademicCapIcon className="w-4 h-4 text-emerald-600" />
                </div>
                البرنامج الجديد
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  البرنامج التدريبي الجديد
                </label>
                <SearchableSelect
                  options={programOptions}
                  value={selectedProgram?.toString() || ''}
                  onChange={handleProgramSelect}
                  placeholder="اختر البرنامج الجديد"
                  disabled={!selectedTrainee}
                />
              </div>

              {selectedProgram && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                  <h4 className="text-xs font-semibold text-emerald-800 mb-1">البرنامج الجديد</h4>
                  <p className="text-sm text-emerald-700">
                    {programs.find(p => p.id === selectedProgram)?.nameAr}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* رسالة تأكيد التحويل */}
        {showConfirmation && (
          <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    تأكيد تحويل المتدرب
                  </h3>
                  <div className="space-y-3 text-sm text-amber-700">
                    <p>هل أنت متأكد من تحويل المتدرب التالي:</p>
                    <div className="bg-white p-3 rounded-lg border border-amber-100 space-y-1 text-slate-700">
                      <p><span className="font-medium text-slate-800">المتدرب:</span> {selectedTrainee?.nameAr}</p>
                      <p><span className="font-medium text-slate-800">من البرنامج:</span> {selectedTrainee?.program.nameAr}</p>
                      <p><span className="font-medium text-slate-800">إلى البرنامج:</span> {programs.find(p => p.id === selectedProgram)?.nameAr}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-red-700 text-xs font-medium">
                        ⚠️ تحذير: سيتم حذف المتدرب من البرنامج الحالي ونقله إلى البرنامج الجديد
                      </p>
                    </div>
                    <div className="bg-tiba-primary/5 p-3 rounded-lg border border-tiba-primary/10">
                      <p className="text-tiba-primary text-xs font-medium">
                        💰 سيتم تطبيق جميع الرسوم الدراسية للبرنامج الجديد تلقائياً
                      </p>
                    </div>
                    {selectedTrainee && selectedTrainee.totalDebt > 0 && (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <p className="text-orange-800 text-xs font-medium mb-3">
                          📊 المديونية الحالية: <span className="text-base font-bold">{selectedTrainee.totalDebt} ج.م</span>
                        </p>
                        <label className="flex items-start gap-3 cursor-pointer bg-white p-3 rounded-lg border border-orange-200 hover:border-red-300 transition-colors">
                          <Checkbox
                            checked={deleteOldDebt}
                            onCheckedChange={(checked) => setDeleteOldDebt(!!checked)}
                            className="mt-0.5 h-[18px] w-[18px] rounded"
                          />
                          <div>
                            <span className="text-xs font-bold text-red-800 block">حذف المديونية القديمة</span>
                            <span className="text-[11px] text-slate-500">سيتم حذف جميع الرسوم والمدفوعات القديمة وإرجاع أرصدة الخزائن قبل التحويل</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={showFinalConfirmationDialog}
                      disabled={transferring}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      متابعة للتأكيد النهائي
                    </Button>
                    <Button
                      onClick={cancelTransfer}
                      variant="outline"
                      disabled={transferring}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* زر التحويل */}
        {selectedTrainee && selectedProgram && !showConfirmation && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleTransfer}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              className={`${
                selectedTrainee.totalDebt > 0
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-tiba-primary hover:bg-tiba-primary-600'
              } text-white`}
            >
              تحويل المتدرب
              {selectedTrainee.totalDebt > 0 && (
                <span className="mr-2 text-xs opacity-80">(مع مديونية)</span>
              )}
            </Button>
          </div>
        )}

        {/* رسالة تحذير المديونية */}
        {selectedTrainee && selectedProgram && selectedTrainee.totalDebt > 0 && !showConfirmation && (
          <div className="mt-4 bg-orange-50 rounded-xl border border-orange-200 shadow-sm">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-orange-800">تنبيه: المتدرب لديه مديونية</h3>
                  <p className="text-xs text-orange-700 mt-1">
                    المتدرب لديه مديونية بقيمة {selectedTrainee.totalDebt} جنيه من البرنامج الحالي.
                  </p>
                  <p className="text-xs text-orange-700 mt-1.5">
                    ✅ يمكن التحويل بدون سداد المديونية&nbsp;&nbsp;💰 سيتم إضافة رسوم البرنامج الجديد بالإضافة للمديونية الحالية
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100">
                <ExclamationTriangleIcon className="w-4 h-4 text-slate-600" />
              </div>
              ملاحظات مهمة
            </h3>
          </div>
          
          <div className="p-5 space-y-2 text-sm text-slate-600">
            {[
              'يمكن التحويل حتى لو كان المتدرب عليه مديونية (ستضاف رسوم البرنامج الجديد للمديونية الحالية)',
              'سيتم حذف المتدرب من البرنامج الحالي وإضافته للبرنامج الجديد',
              'سيتم الاحتفاظ بجميع البيانات الشخصية والأكاديمية للمتدرب',
              'عملية التحويل لا يمكن التراجع عنها',
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="h-1 w-1 mt-2 rounded-full bg-tiba-primary flex-shrink-0" />
                <p>{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal التأكيد النهائي */}
      <TibaModal
        open={showFinalConfirmation && !!selectedTrainee}
        onClose={() => {
          setShowFinalConfirmation(false);
          setShowConfirmation(false);
          setConfirmTimer(5);
        }}
        variant="warning"
        size="lg"
        title="تأكيد التحويل النهائي"
        subtitle="هذا الإجراء لا يمكن التراجع عنه"
        icon={<ArrowPathIcon className="w-6 h-6" />}
        closeOnBackdrop={false}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => {
                setShowFinalConfirmation(false);
                setShowConfirmation(false);
                setConfirmTimer(5);
              }}
              variant="outline"
              disabled={transferring}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmTransfer}
              disabled={transferring || confirmTimer > 0}
              className={`flex-1 bg-orange-600 hover:bg-orange-700 text-white ${
                confirmTimer > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {transferring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  جاري التحويل...
                </span>
              ) : confirmTimer > 0 ? (
                `انتظر ${confirmTimer}s`
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4" />
                  تأكيد التحويل
                </span>
              )}
            </Button>
          </div>
        }
      >
        {selectedTrainee && (
          <div className="space-y-4">
            {/* معلومات المتدرب */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <TraineeAvatar
                  photoUrl={selectedTrainee.photoUrl}
                  name={selectedTrainee.nameAr}
                  nationalId={selectedTrainee.nationalId}
                  size="md"
                  showZoomHint={false}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{selectedTrainee.nameAr}</h4>
                  <p className="text-xs text-slate-500">{selectedTrainee.nationalId}</p>
                </div>
              </div>
              
              {/* البرامج */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex-1 bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-[10px] text-slate-500 mb-0.5">من البرنامج</p>
                  <p className="font-bold text-slate-800 text-xs">{selectedTrainee.program.nameAr}</p>
                </div>
                <ArrowPathIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 bg-white rounded-lg p-3 border border-emerald-200">
                  <p className="text-[10px] text-slate-500 mb-0.5">إلى البرنامج</p>
                  <p className="font-bold text-slate-800 text-xs">{programs.find(p => p.id === selectedProgram)?.nameAr}</p>
                </div>
              </div>

              {/* المديونية */}
              {selectedTrainee.totalDebt > 0 && (
                <div className={`border rounded-lg p-3 ${deleteOldDebt ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${deleteOldDebt ? 'text-red-700' : 'text-orange-700'}`}>المديونية الحالية:</span>
                    <span className={`text-sm font-bold ${deleteOldDebt ? 'text-red-600 line-through' : 'text-orange-600'}`}>{selectedTrainee.totalDebt} ج.م</span>
                  </div>
                  <p className={`text-[11px] mt-1 ${deleteOldDebt ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
                    {deleteOldDebt ? '🗑️ سيتم حذف المديونية القديمة بالكامل وإرجاع أرصدة الخزائن' : 'ستُضاف رسوم البرنامج الجديد لهذا المبلغ'}
                  </p>
                </div>
              )}
            </div>

            {/* تحذيرات */}
            <div className="space-y-2">
              {[
                { icon: <CheckCircleIcon className="w-3 h-3 text-tiba-primary" />, bg: 'bg-tiba-primary/10', text: 'سيتم نقل المتدرب للبرنامج الجديد' },
                { icon: <CreditCardIcon className="w-3 h-3 text-emerald-600" />, bg: 'bg-emerald-50', text: 'سيتم تطبيق رسوم البرنامج الجديد تلقائياً' },
                { icon: <XCircleIcon className="w-3 h-3 text-red-600" />, bg: 'bg-red-50', text: 'لا يمكن التراجع عن هذا الإجراء' },
              ].map(({ icon, bg, text }, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className={`w-5 h-5 ${bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {icon}
                  </div>
                  <p className={`text-slate-700 ${i === 2 ? 'font-medium' : ''}`}>{text}</p>
                </div>
              ))}
            </div>

            {/* مؤقت العد التنازلي */}
            {confirmTimer > 0 && (
              <div className="bg-tiba-primary/5 border border-tiba-primary/10 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-tiba-primary border-t-transparent" />
                  <p className="text-tiba-primary font-medium text-sm">
                    انتظر {confirmTimer} ثانية للتأكيد...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </TibaModal>
    </div>
  );
}

export default function TraineeTransferPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.trainees', action: 'transfer' }}>
      <TraineeTransferPageContent />
    </ProtectedPage>
  );
}
