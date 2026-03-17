'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Checkbox,
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAllTraineeFees, createTraineeFee, applyTraineeFee, getTraineeFeeById, updateTraineeFee, deleteTraineeFee } from '@/app/lib/api/finances';
import { getAllSafes } from '@/app/lib/api/finances';
import { getAllPrograms } from '@/app/lib/api/programs';
import { getAllTrainees } from '@/app/lib/api/trainees';
import { TraineeFee, FeeType, Safe, SafeCategory, SAFE_CATEGORY_LABELS } from '@/app/types/finances';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/app/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Plus, FileText, Check, AlertCircle, Loader2, BarChart, Search, Filter, Eye, Edit, Trash2, DollarSign, Calendar, BookOpen, Users, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

// نموذج إنشاء رسوم المتدربين
const feeFormSchema = z.object({
  name: z.string().min(1, { message: 'اسم الرسوم مطلوب' }),
  amount: z.coerce.number().min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  type: z.enum(['TUITION', 'SERVICES', 'TRAINING', 'ADDITIONAL']),
  academicYear: z.string().min(1, { message: 'العام الدراسي مطلوب' }),
  allowMultipleApply: z.boolean().default(false),
  programId: z.coerce.number().min(1, { message: 'البرنامج التدريبي مطلوب' }),
  safeId: z.string().min(1, { message: 'الخزينة مطلوبة' }),
});

// نموذج تطبيق الرسوم
const applyFeeFormSchema = z.object({
  traineeIds: z.array(z.number()).optional(),
  description: z.string().optional(),
});

function TraineeFeesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  
  // State للبيانات
  const [fees, setFees] = useState<TraineeFee[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);

  // فلترة خزائن المديونية فقط (خزائن الرسوم)
  const debtSafes = safes.filter(safe => safe.category === SafeCategory.DEBT);
  const [programs, setPrograms] = useState<any[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedFee, setSelectedFee] = useState<TraineeFee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State للحوارات
  const [openNewFeeDialog, setOpenNewFeeDialog] = useState(false);
  const [openEditFeeDialog, setOpenEditFeeDialog] = useState(false);
  const [openApplyFeeDialog, setOpenApplyFeeDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [feeToEdit, setFeeToEdit] = useState<TraineeFee | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<TraineeFee | null>(null);
  const [selectedTrainees, setSelectedTrainees] = useState<number[]>([]);
  const [selectAllTrainees, setSelectAllTrainees] = useState(false);
  const [traineeSearchQuery, setTraineeSearchQuery] = useState('');

  // State للفلاتر والبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FeeType | 'ALL'>('ALL');
  const [filterProgram, setFilterProgram] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPLIED' | 'NOT_APPLIED'>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Forms
  const feeForm = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      name: '',
      amount: 0,
      type: 'TUITION',
      academicYear: new Date().getFullYear().toString(),
      allowMultipleApply: false,
      programId: undefined,
      safeId: '',
    },
  });

  const editFeeForm = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      name: '',
      amount: 0,
      type: 'TUITION',
      academicYear: new Date().getFullYear().toString(),
      allowMultipleApply: false,
      programId: undefined,
      safeId: '',
    },
  });

  const applyFeeForm = useForm<z.infer<typeof applyFeeFormSchema>>({
    resolver: zodResolver(applyFeeFormSchema),
    defaultValues: {
      traineeIds: [],
      description: '',
    },
  });

  // جلب البيانات
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [feesData, safesData, programsData] = await Promise.all([
        getAllTraineeFees(),
        getAllSafes(),
        getAllPrograms()
      ]);
      setFees(feesData);
      setSafes(safesData);
      setPrograms(programsData);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب البيانات');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // جلب المتدربين حسب البرنامج
  const fetchTraineesByProgram = async (programId: number) => {
    try {
      const data = await getAllTrainees({ programId });
      setTrainees(data);
      setSelectedTrainees([]);
      setSelectAllTrainees(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب بيانات المتدربين');
      console.error(error);
    }
  };

  // إنشاء رسوم جديدة
  const onSubmitFee = async (values: z.infer<typeof feeFormSchema>) => {
    // منع التقديم المتكرر
    if (isCreating) {
      toast.warning('جاري إنشاء الرسوم، يرجى الانتظار...');
      return;
    }

    try {
      setIsCreating(true);
      const newFee = await createTraineeFee(values);
      
      const safeName = debtSafes.find(s => s.id === values.safeId)?.name || 'غير محدد';
      const programName = programs.find(p => p.id === values.programId)?.nameAr || 'غير محدد';
      
      toast.success('تم إنشاء رسوم جديدة بنجاح!', {
        duration: 4000,
      });
      
      setOpenNewFeeDialog(false);
      feeForm.reset();
      await fetchData();
    } catch (error: any) {
      console.error('خطأ في إنشاء الرسوم:', error);
      const errorMessage = error.response?.data?.message || 'حدث خطأ غير متوقع';
      toast.error(`فشل في إنشاء الرسوم: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  // تطبيق الرسوم على المتدربين
  const onApplyFee = async (values: z.infer<typeof applyFeeFormSchema>) => {
    if (!selectedFee) return;

    // منع التقديم المتكرر
    if (isApplying) {
      toast.warning('جاري تطبيق الرسوم، يرجى الانتظار...');
      return;
    }

    try {
      setIsApplying(true);
      const data = await applyTraineeFee(selectedFee.id, {
        traineeIds: selectedTrainees,
        description: values.description,
      });
      
      toast.success('تم تطبيق الرسوم بنجاح!', {
        duration: 4000,
      });
      
      setOpenApplyFeeDialog(false);
      setOpenConfirmDialog(false);
      setSelectedFee(null);
      setSelectedTrainees([]);
      applyFeeForm.reset();
      await fetchData();
    } catch (error: any) {
      console.error('خطأ في تطبيق الرسوم:', error);
      const errorMessage = error.response?.data?.message || 'حدث خطأ غير متوقع';
      toast.error(`فشل في تطبيق الرسوم: ${errorMessage}`);
    } finally {
      setIsApplying(false);
    }
  };

  // تحديد رسوم للتطبيق
  const handleSelectFeeToApply = async (fee: TraineeFee) => {
    setSelectedFee(fee);
    setTraineeSearchQuery(''); // إعادة تعيين البحث
    await fetchTraineesByProgram(fee.programId);
    setOpenApplyFeeDialog(true);
  };

  // فلترة المتدربين حسب البحث
  const filteredTrainees = trainees.filter(trainee =>
    trainee.nameAr.toLowerCase().includes(traineeSearchQuery.toLowerCase()) ||
    trainee.nationalId?.includes(traineeSearchQuery) ||
    trainee.phone?.includes(traineeSearchQuery)
  );

  // تحديد رسوم للتعديل
  const handleSelectFeeToEdit = (fee: TraineeFee) => {
    if (fee.isApplied) {
      toast.error('لا يمكن تعديل الرسوم المطبقة', {
        description: `رسوم "${fee.name}" مطبقة على المتدربين ولا يمكن تعديلها. يمكنك إنشاء رسوم جديدة بدلاً من ذلك.`,
        duration: 5000,
      });
      return;
    }
    
    setFeeToEdit(fee);
    editFeeForm.reset({
      name: fee.name,
      amount: fee.amount,
      type: fee.type,
      academicYear: fee.academicYear,
      allowMultipleApply: fee.allowMultipleApply,
      programId: fee.programId,
      safeId: fee.safeId,
    });
    setOpenEditFeeDialog(true);
  };

  // تحديث الرسوم
  const handleUpdateFee = async (values: z.infer<typeof feeFormSchema>) => {
    if (!feeToEdit) return;

    // منع التقديم المتكرر
    if (isUpdating) {
      toast.warning('جاري تحديث الرسوم، يرجى الانتظار...');
      return;
    }

    try {
      setIsUpdating(true);
      await updateTraineeFee(feeToEdit.id, values);
      
      toast.success('تم تحديث الرسوم بنجاح!', {
        duration: 4000,
      });
      
      setOpenEditFeeDialog(false);
      setFeeToEdit(null);
      editFeeForm.reset();
      await fetchData();
    } catch (error: any) {
      console.error('خطأ في تحديث الرسوم:', error);
      const errorMessage = error.response?.data?.message || 'حدث خطأ غير متوقع';
      toast.error(`فشل في تحديث الرسوم: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // تحديد رسوم للحذف
  const handleSelectFeeToDelete = (fee: TraineeFee) => {
    if (fee.isApplied) {
      toast.error('لا يمكن حذف الرسوم المطبقة', {
        description: `رسوم "${fee.name}" مطبقة على المتدربين ولا يمكن حذفها. لحذفها يجب أولاً إلغاء تطبيقها.`,
        duration: 5000,
      });
      return;
    }
    
    setFeeToDelete(fee);
    setOpenDeleteDialog(true);
  };

  // حذف الرسوم
  const handleDeleteFee = async () => {
    if (!feeToDelete) return;

    // منع التقديم المتكرر
    if (isDeleting) {
      toast.warning('جاري حذف الرسوم، يرجى الانتظار...');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTraineeFee(feeToDelete.id);
      
      toast.success('تم حذف الرسوم بنجاح!', {
        duration: 4000,
      });
      
      setOpenDeleteDialog(false);
      setFeeToDelete(null);
      await fetchData();
    } catch (error: any) {
      console.error('خطأ في حذف الرسوم:', error);
      const errorMessage = error.response?.data?.message || 'حدث خطأ غير متوقع';
      toast.error(`فشل في حذف الرسوم: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // تحويل نوع الرسوم إلى نص عربي
  const getFeeTypeText = (type: FeeType) => {
    switch (type) {
      case FeeType.TUITION:
        return 'رسوم دراسية';
      case FeeType.SERVICES:
        return 'خدمات';
      case FeeType.TRAINING:
        return 'تدريب';
      case FeeType.ADDITIONAL:
        return 'رسوم إضافية';
      default:
        return type;
    }
  };

  // التعامل مع تحديد جميع المتدربين
  const handleSelectAllTrainees = () => {
    if (selectAllTrainees) {
      setSelectedTrainees([]);
    } else {
      setSelectedTrainees(trainees.map(trainee => trainee.id));
    }
    setSelectAllTrainees(!selectAllTrainees);
  };

  // التعامل مع تحديد متدرب
  const handleSelectTrainee = (traineeId: number) => {
    if (selectedTrainees.includes(traineeId)) {
      setSelectedTrainees(selectedTrainees.filter(id => id !== traineeId));
    } else {
      setSelectedTrainees([...selectedTrainees, traineeId]);
    }
  };

  // فلترة الرسوم
  const filteredFees = fees.filter(fee => {
    const matchesSearch = fee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         fee.program?.nameAr?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || fee.type === filterType;
    const matchesProgram = filterProgram === 'ALL' || fee.programId.toString() === filterProgram;
    const matchesStatus = filterStatus === 'ALL' || 
                         (filterStatus === 'APPLIED' && fee.isApplied) ||
                         (filterStatus === 'NOT_APPLIED' && !fee.isApplied);
    const matchesYear = filterYear === 'ALL' || fee.academicYear === filterYear;

    return matchesSearch && matchesType && matchesProgram && matchesStatus && matchesYear;
  });

  // الحصول على السنوات الأكاديمية المتاحة
  const availableYears = Array.from(new Set(fees.map(fee => fee.academicYear))).sort();

  // إحصائيات سريعة
  const totalFees = fees.length;
  const appliedFees = fees.filter(fee => fee.isApplied).length;
  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header الصفحة */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">رسوم المتدربين</h1>
          <p className="text-sm sm:text-base text-gray-600">إنشاء وإدارة رسوم المتدربين</p>
        </div>
        
        <div className="space-y-6">
          {/* الإحصائيات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">نظرة عامة</h2>
                <p className="text-sm sm:text-base text-gray-600">إحصائيات رسوم المتدربين</p>
              </div>
              <Dialog open={openNewFeeDialog} onOpenChange={setOpenNewFeeDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md w-full sm:w-auto">
                    <Plus className="ml-2 h-4 w-4" />
                    رسوم جديدة
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-blue-600">إجمالي الرسوم</p>
                    <p className="text-2xl font-bold text-blue-900">{totalFees}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-green-600">مطبقة</p>
                    <p className="text-2xl font-bold text-green-900">{appliedFees}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-purple-600">إجمالي المبالغ</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalAmount, 'ج.م')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* البحث والفلاتر */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              {/* البحث */}
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث في الرسوم والبرامج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 border-gray-300 focus:border-blue-500 text-gray-900"
                />
              </div>
              
              {/* زر الفلاتر */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-gray-300 hover:bg-gray-50 w-full sm:w-auto"
              >
                <Filter className="ml-2 h-4 w-4" />
                فلاتر
                {(filterType !== 'ALL' || filterProgram !== 'ALL' || filterStatus !== 'ALL' || filterYear !== 'ALL') && (
                  <span className="mr-2 bg-blue-600 text-white rounded-full px-2 py-1 text-xs">●</span>
                )}
              </Button>
            </div>

            {/* الفلاتر المتقدمة */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                {/* فلتر النوع */}
                <div>
                  <label className="text-sm font-semibold text-blue-800 mb-2 block">نوع الرسوم</label>
                  <Select value={filterType} onValueChange={(value) => setFilterType(value as FeeType | 'ALL')}>
                    <SelectTrigger className="border-blue-300 bg-white text-gray-900 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL" className="text-gray-900">جميع الأنواع</SelectItem>
                      <SelectItem value="TUITION" className="text-gray-900">رسوم دراسية</SelectItem>
                      <SelectItem value="SERVICES" className="text-gray-900">خدمات</SelectItem>
                      <SelectItem value="TRAINING" className="text-gray-900">تدريب</SelectItem>
                      <SelectItem value="ADDITIONAL" className="text-gray-900">رسوم إضافية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* فلتر البرنامج */}
                <div>
                  <label className="text-sm font-semibold text-blue-800 mb-2 block">البرنامج</label>
                  <Select value={filterProgram} onValueChange={setFilterProgram}>
                    <SelectTrigger className="border-blue-300 bg-white text-gray-900 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL" className="text-gray-900">جميع البرامج</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()} className="text-gray-900">
                          {program.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* فلتر الحالة */}
                <div>
                  <label className="text-sm font-semibold text-blue-800 mb-2 block">الحالة</label>
                  <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'ALL' | 'APPLIED' | 'NOT_APPLIED')}>
                    <SelectTrigger className="border-blue-300 bg-white text-gray-900 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL" className="text-gray-900">جميع الحالات</SelectItem>
                      <SelectItem value="APPLIED" className="text-gray-900">مطبقة</SelectItem>
                      <SelectItem value="NOT_APPLIED" className="text-gray-900">غير مطبقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* فلتر السنة */}
                <div>
                  <label className="text-sm font-semibold text-blue-800 mb-2 block">السنة الأكاديمية</label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="border-blue-300 bg-white text-gray-900 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL" className="text-gray-900">جميع السنوات</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year} className="text-gray-900">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* جدول الرسوم المحسن */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">قائمة الرسوم</CardTitle>
                  <CardDescription className="text-gray-600">
                    عرض {filteredFees.length} من أصل {fees.length} رسوم
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredFees.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد رسوم</h3>
                  <p className="text-gray-600 mb-4">
                    {fees.length === 0 ? 'لم يتم إنشاء أي رسوم بعد' : 'لا توجد نتائج تطابق البحث'}
                  </p>
                </div>
              ) : (
                <>
                  {/* عرض الجدول للشاشات الكبيرة */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-right font-semibold text-gray-900">اسم الرسوم</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900">النوع</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900">المبلغ</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900">البرنامج</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900">السنة الأكاديمية</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900">الحالة</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredFees.map((fee) => (
                        <TableRow key={fee.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium text-gray-900">
                            <div>
                              <p className="font-semibold">{fee.name}</p>
                              <p className="text-sm text-gray-500">#{fee.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                fee.type === 'TUITION' ? 'default' :
                                fee.type === 'SERVICES' ? 'secondary' :
                                fee.type === 'TRAINING' ? 'outline' : 'destructive'
                              }
                              className="text-xs font-medium"
                            >
                              {getFeeTypeText(fee.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(fee.amount, 'ج.م')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <BookOpen className="h-4 w-4 text-gray-400 ml-2" />
                              <span className="text-gray-900">{fee.program?.nameAr || 'غير محدد'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 ml-2" />
                              <span className="text-gray-900">{fee.academicYear}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={fee.isApplied ? 'default' : 'secondary'}
                              className={`text-xs font-medium ${
                                fee.isApplied ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}
                            >
                              {fee.isApplied ? 'مطبقة' : 'غير مطبقة'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/* على الشاشات الكبيرة - أزرار مع نص */}
                            <div className="hidden lg:flex items-center justify-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                                  >
                                    <BarChart className="ml-1 h-4 w-4" />
                                    تقرير
                                    <ChevronDown className="mr-1 h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72 p-2">
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid`)}
                                      className="justify-start text-sm"
                                    >
                                      <Check className="ml-2 h-4 w-4 text-green-600" />
                                      <span>المسددين للرسم</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid`)}
                                      className="justify-start text-sm"
                                    >
                                      <AlertCircle className="ml-2 h-4 w-4 text-red-600" />
                                      <span>الغير مسددين للرسم</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid-all-previous`)}
                                      className="justify-start text-sm"
                                    >
                                      <Check className="ml-2 h-4 w-4 text-blue-600" />
                                      <span>المسددين للرسم وكل الرسوم السابقة</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid-any-previous`)}
                                      className="justify-start text-sm"
                                    >
                                      <AlertCircle className="ml-2 h-4 w-4 text-orange-600" />
                                      <span>الغير مسددين للرسم الحالي وأي رسم سابق</span>
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                size="sm"
                                onClick={() => handleSelectFeeToEdit(fee)}
                                disabled={fee.isApplied}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Edit className="ml-1 h-4 w-4" />
                                تعديل
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSelectFeeToApply(fee)}
                                disabled={fee.isApplied && !fee.allowMultipleApply}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Users className="ml-1 h-4 w-4" />
                                {fee.isApplied && fee.allowMultipleApply ? "إعادة تطبيق" : "تطبيق"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSelectFeeToDelete(fee)}
                                disabled={fee.isApplied}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="ml-1 h-4 w-4" />
                                حذف
                              </Button>
                            </div>

                            {/* على الشاشات الصغيرة - أيقونات فقط */}
                            <div className="flex lg:hidden items-center justify-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                    title="التقارير"
                                  >
                                    <BarChart className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-64 p-2">
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid`)}
                                      className="justify-start text-sm"
                                    >
                                      <Check className="ml-2 h-4 w-4 text-green-600" />
                                      <span>المسددين للرسم</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid`)}
                                      className="justify-start text-sm"
                                    >
                                      <AlertCircle className="ml-2 h-4 w-4 text-red-600" />
                                      <span>الغير مسددين للرسم</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid-all-previous`)}
                                      className="justify-start text-sm"
                                    >
                                      <Check className="ml-2 h-4 w-4 text-blue-600" />
                                      <span>المسددين للرسم وكل الرسوم السابقة</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid-any-previous`)}
                                      className="justify-start text-sm"
                                    >
                                      <AlertCircle className="ml-2 h-4 w-4 text-orange-600" />
                                      <span>الغير مسددين للرسم الحالي وأي رسم سابق</span>
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectFeeToEdit(fee)}
                                disabled={fee.isApplied}
                                className="h-8 w-8 p-0 hover:bg-yellow-50 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={fee.isApplied ? "لا يمكن تعديل الرسوم المطبقة" : "تعديل الرسوم"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectFeeToApply(fee)}
                                disabled={fee.isApplied && !fee.allowMultipleApply}
                                className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                  fee.isApplied && !fee.allowMultipleApply 
                                    ? "الرسوم مطبقة ولا تسمح بالتطبيق المتعدد" 
                                    : fee.isApplied && fee.allowMultipleApply
                                    ? "إعادة تطبيق الرسوم"
                                    : "تطبيق الرسوم"
                                }
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectFeeToDelete(fee)}
                                disabled={fee.isApplied}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={fee.isApplied ? "لا يمكن حذف الرسوم المطبقة" : "حذف الرسوم"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>

                  {/* عرض البطاقات للشاشات الصغيرة */}
                  <div className="block md:hidden space-y-4 p-4">
                    {filteredFees.map((fee) => (
                      <div key={fee.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{fee.name}</h3>
                            <p className="text-sm text-gray-500">#{fee.id}</p>
                          </div>
                          <Badge
                            variant={fee.isApplied ? 'default' : 'secondary'}
                            className={`text-xs font-medium ${
                              fee.isApplied ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}
                          >
                            {fee.isApplied ? 'مطبقة' : 'غير مطبقة'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">النوع:</span>
                            <Badge
                              variant={
                                fee.type === 'TUITION' ? 'default' :
                                fee.type === 'SERVICES' ? 'secondary' :
                                fee.type === 'TRAINING' ? 'outline' : 'destructive'
                              }
                              className="text-xs font-medium bg-white text-gray-800 border border-gray-300"
                            >
                              {getFeeTypeText(fee.type)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">المبلغ:</span>
                            <span className="font-semibold text-green-700">{formatCurrency(fee.amount, 'ج.م')}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">البرنامج:</span>
                            <span className="text-sm text-gray-900 font-medium">{fee.program?.nameAr || 'غير محدد'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">السنة الأكاديمية:</span>
                            <span className="text-sm text-gray-900 font-medium">{fee.academicYear}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                              >
                                <BarChart className="ml-1 h-3 w-3" />
                                <span>تقرير</span>
                                <ChevronDown className="mr-1 h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid`)}
                                  className="justify-start text-sm"
                                >
                                  <Check className="ml-2 h-4 w-4 text-green-600" />
                                  <span>المسددين للرسم</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid`)}
                                  className="justify-start text-sm"
                                >
                                  <AlertCircle className="ml-2 h-4 w-4 text-red-600" />
                                  <span>الغير مسددين للرسم</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=paid-all-previous`)}
                                  className="justify-start text-sm"
                                >
                                  <Check className="ml-2 h-4 w-4 text-blue-600" />
                                  <span>المسددين للرسم وكل الرسوم السابقة</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => router.push(`/dashboard/finances/trainee-fees/${fee.id}/report?type=unpaid-any-previous`)}
                                  className="justify-start text-sm"
                                >
                                  <AlertCircle className="ml-2 h-4 w-4 text-orange-600" />
                                  <span>الغير مسددين للرسم الحالي وأي رسم سابق</span>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectFeeToEdit(fee)}
                            disabled={fee.isApplied}
                            className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 disabled:opacity-50 text-xs"
                          >
                            <Edit className="ml-1 h-3 w-3" />
                            <span className="hidden sm:inline">تعديل</span>
                            <span className="sm:hidden">تعديل</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectFeeToApply(fee)}
                            disabled={fee.isApplied && !fee.allowMultipleApply}
                            className="text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50 text-xs"
                          >
                            <Users className="ml-1 h-3 w-3" />
                            <span className="hidden sm:inline">{fee.isApplied && fee.allowMultipleApply ? "إعادة تطبيق" : "تطبيق"}</span>
                            <span className="sm:hidden">تطبيق</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectFeeToDelete(fee)}
                            disabled={fee.isApplied}
                            className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 text-xs"
                          >
                            <Trash2 className="ml-1 h-3 w-3" />
                            <span className="hidden sm:inline">حذف</span>
                            <span className="sm:hidden">حذف</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* مربع حوار إنشاء رسوم جديدة */}
      <Dialog 
        open={openNewFeeDialog} 
        onOpenChange={(open) => !isCreating && setOpenNewFeeDialog(open)}
      >
        <DialogContent className="sm:max-w-[550px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-black font-bold text-xl">إنشاء رسوم جديدة</DialogTitle>
            <DialogDescription className="text-gray-700">
              أدخل بيانات الرسوم الجديدة
            </DialogDescription>
          </DialogHeader>
          <Form {...feeForm}>
            <form onSubmit={feeForm.handleSubmit(onSubmitFee)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={feeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">اسم الرسوم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الرسوم" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={feeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">المبلغ</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={feeForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">نوع الرسوم</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر نوع الرسوم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          <SelectItem value="TUITION" className="text-black">رسوم دراسية</SelectItem>
                          <SelectItem value="SERVICES" className="text-black">خدمات</SelectItem>
                          <SelectItem value="TRAINING" className="text-black">تدريب</SelectItem>
                          <SelectItem value="ADDITIONAL" className="text-black">رسوم إضافية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={feeForm.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">العام الدراسي</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: 2023/2024" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={feeForm.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">البرنامج التدريبي</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر البرنامج" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id.toString()} className="text-black">
                              {program.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={feeForm.control}
                  name="safeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">خزينة الرسوم</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر خزينة المديونية (الرسوم)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          {debtSafes.length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              <p className="text-sm">لا توجد خزائن مديونية متاحة</p>
                              <p className="text-xs mt-1">يجب إنشاء خزائن مديونية أولاً</p>
                            </div>
                          ) : (
                            debtSafes.map((safe) => (
                              <SelectItem key={safe.id} value={safe.id} className="text-black">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600">💳</span>
                                  <span>{safe.name}</span>
                                  <span className="text-xs text-gray-500">({SAFE_CATEGORY_LABELS[SafeCategory.DEBT]})</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                      <p className="text-xs text-blue-600 mt-1">
                        ℹ️ يتم عرض خزائن المديونية فقط لتطبيق الرسوم عليها
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={feeForm.control}
                name="allowMultipleApply"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4 bg-white shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-gray-400"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none mr-2">
                      <FormLabel className="text-black font-semibold">السماح بتطبيق الرسوم أكثر من مرة</FormLabel>
                      <p className="text-sm text-gray-700">
                        تمكين هذا الخيار يسمح بتطبيق الرسوم على نفس المتدربين أكثر من مرة
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الرسوم'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تطبيق الرسوم */}
      <Dialog 
        open={openApplyFeeDialog} 
        onOpenChange={(open) => !isApplying && setOpenApplyFeeDialog(open)}
      >
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-black font-bold text-xl">تطبيق الرسوم على المتدربين</DialogTitle>
            <DialogDescription className="text-gray-700">
              {selectedFee && (
                <>
                  تطبيق رسوم &quot;{selectedFee.name}&quot; على المتدربين في برنامج &quot;{selectedFee.program?.nameAr}&quot;
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...applyFeeForm}>
            <form onSubmit={applyFeeForm.handleSubmit(() => setOpenConfirmDialog(true))} className="space-y-4">
              {/* حقل البحث في المتدربين */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث في المتدربين (الاسم، الرقم القومي، الهاتف)..."
                  value={traineeSearchQuery}
                  onChange={(e) => setTraineeSearchQuery(e.target.value)}
                  className="pr-10 border-gray-300 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div className="border rounded-lg overflow-hidden border-gray-200">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox
                      id="select-all"
                      checked={selectAllTrainees}
                      onCheckedChange={handleSelectAllTrainees}
                      className="mr-2 border-gray-400"
                    />
                    <label htmlFor="select-all" className="text-black font-semibold cursor-pointer">
                      تحديد الكل
                    </label>
                  </div>
                  <span className="text-sm text-gray-600">
                    {filteredTrainees.length} من {trainees.length} متدرب
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto p-2">
                  {trainees.length === 0 ? (
                    <div className="text-center py-4 text-gray-700">
                      <p>لا يوجد متدربين في هذا البرنامج</p>
                    </div>
                  ) : filteredTrainees.length === 0 ? (
                    <div className="text-center py-4 text-gray-600">
                      <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p>لا توجد نتائج للبحث "{traineeSearchQuery}"</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTrainees.map((trainee) => (
                        <div key={trainee.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            id={`trainee-${trainee.id}`}
                            checked={selectedTrainees.includes(trainee.id)}
                            onCheckedChange={() => handleSelectTrainee(trainee.id)}
                            className="mr-2 border-gray-400"
                          />
                          <label htmlFor={`trainee-${trainee.id}`} className="text-black cursor-pointer flex-1">
                            <div>
                              <div className="font-medium">{trainee.nameAr}</div>
                              <div className="text-xs text-gray-500">
                                {trainee.nationalId} • {trainee.phone}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <FormField
                control={applyFeeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="أي ملاحظات إضافية" className="border-gray-300 focus:border-primary-500" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={selectedTrainees.length === 0 || isApplying}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isApplying ? 'جاري التطبيق...' : 'تطبيق الرسوم'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد تطبيق الرسوم */}
      <AlertDialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black font-bold">تأكيد تطبيق الرسوم</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              هل أنت متأكد من تطبيق الرسوم على {selectedTrainees.length} متدرب؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedFee && (
            <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">تفاصيل الرسوم:</h4>
              <div className="text-sm text-blue-800">
                <p><span className="font-medium">الاسم:</span> {selectedFee.name}</p>
                <p><span className="font-medium">المبلغ:</span> {formatCurrency(selectedFee.amount, 'ج.م')}</p>
                <p><span className="font-medium">النوع:</span> {getFeeTypeText(selectedFee.type)}</p>
                <p><span className="font-medium">إجمالي المبلغ:</span> {formatCurrency(selectedFee.amount * selectedTrainees.length, 'ج.م')}</p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setOpenConfirmDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => applyFeeForm.handleSubmit(onApplyFee)()}
              disabled={isApplying}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              تأكيد التطبيق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* مربع حوار تعديل الرسوم */}
      <Dialog 
        open={openEditFeeDialog} 
        onOpenChange={(open) => !isUpdating && setOpenEditFeeDialog(open)}
      >
        <DialogContent className="sm:max-w-[550px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-black font-bold text-xl">تعديل الرسوم</DialogTitle>
            <DialogDescription className="text-gray-700">
              تعديل بيانات الرسوم المحددة
            </DialogDescription>
          </DialogHeader>
          <Form {...editFeeForm}>
            <form onSubmit={editFeeForm.handleSubmit(handleUpdateFee)} className="space-y-4">
              {/* نفس الحقول كما في إنشاء رسوم جديدة */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editFeeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">اسم الرسوم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الرسوم" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editFeeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">المبلغ</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editFeeForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">نوع الرسوم</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر نوع الرسوم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          <SelectItem value="TUITION" className="text-black">رسوم دراسية</SelectItem>
                          <SelectItem value="SERVICES" className="text-black">خدمات</SelectItem>
                          <SelectItem value="TRAINING" className="text-black">تدريب</SelectItem>
                          <SelectItem value="ADDITIONAL" className="text-black">رسوم إضافية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editFeeForm.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">العام الدراسي</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: 2023/2024" className="border-gray-300 focus:border-primary-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editFeeForm.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">البرنامج التدريبي</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر البرنامج" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id.toString()} className="text-black">
                              {program.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editFeeForm.control}
                  name="safeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-black font-semibold">خزينة الرسوم</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary-500 text-gray-900">
                            <SelectValue placeholder="اختر خزينة المديونية (الرسوم)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white">
                          {debtSafes.length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              <p className="text-sm">لا توجد خزائن مديونية متاحة</p>
                              <p className="text-xs mt-1">يجب إنشاء خزائن مديونية أولاً</p>
                            </div>
                          ) : (
                            debtSafes.map((safe) => (
                              <SelectItem key={safe.id} value={safe.id} className="text-black">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600">💳</span>
                                  <span>{safe.name}</span>
                                  <span className="text-xs text-gray-500">({SAFE_CATEGORY_LABELS[SafeCategory.DEBT]})</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600" />
                      <p className="text-xs text-blue-600 mt-1">
                        ℹ️ يتم عرض خزائن المديونية فقط لتطبيق الرسوم عليها
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editFeeForm.control}
                name="allowMultipleApply"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4 bg-white shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-gray-400"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none mr-2">
                      <FormLabel className="text-black font-semibold">السماح بتطبيق الرسوم أكثر من مرة</FormLabel>
                      <p className="text-sm text-gray-700">
                        تمكين هذا الخيار يسمح بتطبيق الرسوم على نفس المتدربين أكثر من مرة
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* مربع حوار حذف الرسوم */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black font-bold text-xl">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              هل أنت متأكد من حذف الرسوم "{feeToDelete?.name}"؟
              <br />
              <span className="text-red-600 font-medium">هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setOpenDeleteDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </AlertDialogCancel>
                        <AlertDialogAction
              onClick={handleDeleteFee}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TraineeFeesPage() {
  return (
    <FinancialPageGuard>
      <TraineeFeesPageContent />
    </FinancialPageGuard>
  );
}