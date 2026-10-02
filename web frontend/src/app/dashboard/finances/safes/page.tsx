'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Input, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
  Textarea, Badge,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { SimpleSelect } from '@/app/components/ui/Select';
import { DataTable, Column } from '@/app/components/ui/DataTable';
import PageHeader from '@/app/components/PageHeader';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/hooks/usePermissions';
import DashboardShell from '../../components/DashboardShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Wallet, RefreshCw, ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp, ShoppingCart, Building, FileText, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency } from '@/app/lib/utils';
import {
  getAllSafes, createSafe, updateSafe, deleteSafe, getSafeTransactions,
  createTransaction
} from '@/app/lib/api/finances';
import {
  Safe, Transaction, TransactionType, SafeCategory, SAFE_CATEGORY_LABELS
} from '@/app/types/finances';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';

// نموذج التحقق لإنشاء خزينة
const safeFormSchema = z.object({
  name: z.string().min(1, 'اسم الخزينة مطلوب'),
  description: z.string().optional(),
  category: z.nativeEnum(SafeCategory).default(SafeCategory.UNSPECIFIED),
  balance: z.number().min(0, 'الرصيد يجب أن يكون أكبر من أو يساوي صفر').default(0),
  isActive: z.boolean().default(true),
});

// نموذج التحقق لتعديل خزينة
const editSafeFormSchema = z.object({
  name: z.string().min(1, 'اسم الخزينة مطلوب'),
  description: z.string().optional(),
  category: z.nativeEnum(SafeCategory).optional(),
  isActive: z.boolean().optional(),
});

// نموذج التحقق للمعاملة
const transactionFormSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().optional(),
  sourceId: z.string().optional(),
  targetId: z.string().optional(),
}).refine((data) => {
  if (data.type === TransactionType.TRANSFER) {
    return data.targetId; // فقط نتحقق من وجود targetId
  }
  return true;
}, {
  message: 'يجب اختيار الخزينة المناسبة للمعاملة',
  path: ['targetId'],
});

function SafesPageContent() {
  const { } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewBalances = hasPermission('finances.safes.balances', 'view');
  const router = useRouter();
  const [safes, setSafes] = useState<Safe[]>([]);
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [openNewSafeDialog, setOpenNewSafeDialog] = useState(false);
  const [openEditSafeDialog, setOpenEditSafeDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [safeToEdit, setSafeToEdit] = useState<Safe | null>(null);
  const [safeToDelete, setSafeToDelete] = useState<Safe | null>(null);
  const [activeCategory, setActiveCategory] = useState<SafeCategory | 'ALL'>('ALL');

  // حالة إخفاء/إظهار تفاصيل الرصيد
  const [hideBalances, setHideBalances] = useState(false);

  // تحميل حالة إخفاء الأرصدة من التخزين المحلي
  useEffect(() => {
    const saved = localStorage.getItem('safes_hide_balances');
    if (saved === 'true') setHideBalances(true);
  }, []);

  const toggleHideBalances = () => {
    setHideBalances(prev => {
      const newVal = !prev;
      localStorage.setItem('safes_hide_balances', String(newVal));
      return newVal;
    });
  };

  // هل يجب إظهار الأرصدة؟ (يجب أن يمتلك الصلاحية + لم يخفيها يدوياً)
  const showBalances = canViewBalances && !hideBalances;

  // نموذج إنشاء خزينة
  const safeForm = useForm<z.infer<typeof safeFormSchema>>({
    resolver: zodResolver(safeFormSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: SafeCategory.UNSPECIFIED,
      balance: 0,
      isActive: true,
    },
  });

  // نموذج تعديل خزينة
  const editSafeForm = useForm<z.infer<typeof editSafeFormSchema>>({
    resolver: zodResolver(editSafeFormSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: SafeCategory.UNSPECIFIED,
      isActive: true,
    },
  });

  // نموذج المعاملة
  const transactionForm = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema) as any,
    defaultValues: {
      type: TransactionType.DEPOSIT,
      amount: 0,
      description: '',
      sourceId: '',
      targetId: '',
    },
  });

  // تحميل قائمة الخزائن
  const fetchSafes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllSafes();
      setSafes(data);
    } catch (error) {
      console.error('خطأ في تحميل الخزائن:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل معاملات خزينة محددة
  const fetchSafeTransactions = async (safeId: string) => {
    try {
      setIsTransactionsLoading(true);
      const response = await getSafeTransactions(safeId, 20);
      // التعامل مع الاستجابة الجديدة من الـ API
      if (response && (response as any).data) {
        setTransactions((response as any).data);
      } else if (Array.isArray(response)) {
        // للتوافق مع الإصدارات القديمة
        setTransactions(response);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('خطأ في تحميل المعاملات:', error);
      setTransactions([]);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  // تجميع الخزائن حسب التصنيف
  const safesByCategory = useMemo(() => {
    const grouped = {
      [SafeCategory.DEBT]: safes.filter(safe => safe.category === SafeCategory.DEBT),
      [SafeCategory.INCOME]: safes.filter(safe => safe.category === SafeCategory.INCOME),
      [SafeCategory.EXPENSE]: safes.filter(safe => safe.category === SafeCategory.EXPENSE),
      [SafeCategory.ASSETS]: safes.filter(safe => safe.category === SafeCategory.ASSETS),
      [SafeCategory.UNSPECIFIED]: safes.filter(safe => safe.category === SafeCategory.UNSPECIFIED),
    };
    return grouped;
  }, [safes]);

  // الخزائن المفلترة حسب التصنيف النشط
  const filteredSafes = useMemo(() => {
    if (activeCategory === 'ALL') return safes;
    return safesByCategory[activeCategory] || [];
  }, [safes, activeCategory, safesByCategory]);

  // إحصائيات التصنيفات
  const categoryStats = useMemo(() => {
    return {
      [SafeCategory.DEBT]: {
        count: safesByCategory[SafeCategory.DEBT].length,
        total: safesByCategory[SafeCategory.DEBT].reduce((sum, safe) => sum + safe.balance, 0),
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <CreditCard className="w-4 h-4 text-red-600" />,
        activeIcon: <CreditCard className="w-4 h-4 text-white" />,
        emoji: '💳'
      },
      [SafeCategory.INCOME]: {
        count: safesByCategory[SafeCategory.INCOME].length,
        total: safesByCategory[SafeCategory.INCOME].reduce((sum, safe) => sum + safe.balance, 0),
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <TrendingUp className="w-4 h-4 text-green-600" />,
        activeIcon: <TrendingUp className="w-4 h-4 text-white" />,
        emoji: '💰'
      },
      [SafeCategory.EXPENSE]: {
        count: safesByCategory[SafeCategory.EXPENSE].length,
        total: safesByCategory[SafeCategory.EXPENSE].reduce((sum, safe) => sum + safe.balance, 0),
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <ShoppingCart className="w-4 h-4 text-orange-600" />,
        activeIcon: <ShoppingCart className="w-4 h-4 text-white" />,
        emoji: '💸'
      },
      [SafeCategory.ASSETS]: {
        count: safesByCategory[SafeCategory.ASSETS].length,
        total: safesByCategory[SafeCategory.ASSETS].reduce((sum, safe) => sum + safe.balance, 0),
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Building className="w-4 h-4 text-blue-600" />,
        activeIcon: <Building className="w-4 h-4 text-white" />,
        emoji: '🏦'
      },
      [SafeCategory.UNSPECIFIED]: {
        count: safesByCategory[SafeCategory.UNSPECIFIED].length,
        total: safesByCategory[SafeCategory.UNSPECIFIED].reduce((sum, safe) => sum + safe.balance, 0),
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Wallet className="w-4 h-4 text-gray-600" />,
        activeIcon: <Wallet className="w-4 h-4 text-white" />,
        emoji: '❓'
      }
    };
  }, [safesByCategory]);

  // منطق التحويل - تحديد الخزائن المسموح التحويل إليها
  const getAllowedTargetSafes = (sourceSafe: Safe) => {
    // خزائن المديونية: ممنوع التحويل منها
    if (sourceSafe.category === SafeCategory.DEBT) {
      return [];
    }

    // خزائن المصروفات والأصول: ممنوع التحويل منها (إيداع فقط)
    if (sourceSafe.category === SafeCategory.EXPENSE || sourceSafe.category === SafeCategory.ASSETS) {
      return [];
    }

    // خزائن الدخل: يمكن التحويل لخزائن دخل أخرى + مصروفات + أصول (وليس لنفسها)
    if (sourceSafe.category === SafeCategory.INCOME) {
      return safes.filter(safe =>
        safe.id !== sourceSafe.id &&
        (safe.category === SafeCategory.INCOME || safe.category === SafeCategory.EXPENSE || safe.category === SafeCategory.ASSETS)
      );
    }

    // خزائن غير محددة: يمكن التحويل لأي خزينة عدا نفسها
    return safes.filter(safe => safe.id !== sourceSafe.id);
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchSafes();
  }, []);

  // إنشاء خزينة جديدة
  const onSubmitSafe = async (values: z.infer<typeof safeFormSchema>) => {
    try {
      console.log('📤 Frontend - البيانات المرسلة:', values);
      await createSafe(values);
      await fetchSafes();
      setOpenNewSafeDialog(false);
      safeForm.reset();
      toast.success('تم إنشاء الخزينة بنجاح');
    } catch (error: any) {
      console.error('❌ Frontend Error:', error);
      toast.error('حدث خطأ في إنشاء الخزينة');
    }
  };

  // تعديل خزينة
  const onSubmitEditSafe = async (values: z.infer<typeof editSafeFormSchema>) => {
    if (!safeToEdit) return;
    try {
      await updateSafe(safeToEdit.id, values);
      await fetchSafes();
      setOpenEditSafeDialog(false);
      editSafeForm.reset();
      setSafeToEdit(null);
      toast.success('تم تعديل الخزينة بنجاح');
    } catch (error) {
      console.error('خطأ في تعديل الخزينة:', error);
      toast.error('حدث خطأ في تعديل الخزينة');
    }
  };

  // حذف خزينة
  const handleDeleteSafe = async () => {
    if (!safeToDelete) return;
    try {
      await deleteSafe(safeToDelete.id);
      await fetchSafes();
      setOpenDeleteDialog(false);
      setSafeToDelete(null);
      if (selectedSafe?.id === safeToDelete.id) {
        setSelectedSafe(null);
      }
      toast.success('تم حذف الخزينة بنجاح');
    } catch (error) {
      console.error('خطأ في حذف الخزينة:', error);
      toast.error('حدث خطأ أثناء حذف الخزينة');
    }
  };

  // إنشاء معاملة (مع التأكيد)
  const onSubmitTransaction = async (values: z.infer<typeof transactionFormSchema>) => {
    // التحقق من صحة التحويل
    if (values.type === TransactionType.TRANSFER && selectedSafe) {
      // التحقق من أن الخزينة المصدر والهدف مختلفان
      if (selectedSafe.id === values.targetId) {
        toast.error('لا يمكن التحويل من الخزينة إلى نفسها');
        return;
      }

      // التحقق من الرصيد الكافي للتحويل
      if (selectedSafe.balance < values.amount) {
        toast.error(`الرصيد غير كافي. الرصيد الحالي: ${formatCurrency(selectedSafe.balance, selectedSafe.currency)}`);
        return;
      }
    }

    // حفظ البيانات لعرض التأكيد
    setPendingTransaction(values);
    setOpenConfirmDialog(true);
  };

  // تنفيذ المعاملة بعد التأكيد
  const executeTransaction = async () => {
    if (!pendingTransaction) return;

    try {
      // إضافة sourceId للمعاملة إذا كانت تحويل
      const transactionData = {
        ...pendingTransaction,
        sourceId: pendingTransaction.type === TransactionType.TRANSFER ? selectedSafe?.id : undefined,
        targetId: pendingTransaction.type === TransactionType.DEPOSIT ? selectedSafe?.id : pendingTransaction.targetId,
      };

      await createTransaction(transactionData);
      await fetchSafes();
      if (selectedSafe) {
        await fetchSafeTransactions(selectedSafe.id);
      }

      // إغلاق النوافذ وإعادة تعيين النماذج
      setOpenTransactionDialog(false);
      setOpenConfirmDialog(false);
      transactionForm.reset();
      setPendingTransaction(null);

      // رسالة نجاح مفصلة
      const operationType = pendingTransaction.type === TransactionType.DEPOSIT ? 'الإيداع' : 'التحويل';
      const amount = formatCurrency(pendingTransaction.amount, selectedSafe?.currency || 'EGP');

      if (pendingTransaction.type === TransactionType.TRANSFER) {
        const targetSafe = safes.find(s => s.id === pendingTransaction.targetId);
        toast.success(`✅ تم ${operationType} بنجاح! تم تحويل ${amount} من "${selectedSafe?.name}" إلى "${targetSafe?.name}"`, {
          duration: 5000,
        });
      } else {
        toast.success(`✅ تم ${operationType} بنجاح! تم إيداع ${amount} في "${selectedSafe?.name}"`, {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('خطأ في إنشاء المعاملة:', error);
      toast.error('حدث خطأ في إنشاء المعاملة');
      setOpenConfirmDialog(false);
    }
  };

  // تحديث الخزينة المحددة عند تحديث قائمة الخزائن
  useEffect(() => {
    if (selectedSafe && safes.length > 0) {
      const updatedSafe = safes.find(safe => safe.id === selectedSafe.id);
      if (updatedSafe && updatedSafe.balance !== selectedSafe.balance) {
        setSelectedSafe(updatedSafe);
      }
    }
  }, [safes]);

  // إعداد تعديل خزينة
  const handleEditSafe = (safe: Safe) => {
    setSafeToEdit(safe);
    editSafeForm.reset({
      name: safe.name,
      description: safe.description || '',
      category: safe.category,
      isActive: safe.isActive,
    });
    setOpenEditSafeDialog(true);
  };

  // إعداد حذف خزينة
  const handleDeleteSafeClick = (safe: Safe) => {
    setSafeToDelete(safe);
    setOpenDeleteDialog(true);
  };

  const columns: Column<Safe>[] = [
    {
      header: 'اسم الخزينة',
      accessor: 'name',
      cell: (safe) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedSafe?.id === safe.id ? 'bg-blue-100 ring-2 ring-blue-300' : 'bg-gray-50 border border-gray-200'}`}>
            {categoryStats[safe.category]?.icon}
          </div>
          <div>
            <p className="font-medium text-gray-900">{safe.name}</p>
            <p className="text-sm text-gray-600">{safe.description || 'بدون وصف'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'التصنيف',
      accessor: 'category',
      cell: (safe) => (
        <Badge className={categoryStats[safe.category]?.color}>
          {categoryStats[safe.category]?.icon} {SAFE_CATEGORY_LABELS[safe.category]}
        </Badge>
      )
    },
    {
      header: 'الرصيد',
      accessor: 'balance',
      cell: (safe) => (
        <span className="font-semibold text-gray-900 bg-white px-2 py-1 rounded">
          {showBalances ? formatCurrency(safe.balance, safe.currency) : (
            <span className="flex items-center gap-1 text-gray-400 text-xs"><EyeOff className="w-3 h-3" /> {canViewBalances ? '••••••' : 'لا توجد صلاحية'}</span>
          )}
        </span>
      )
    },
    {
      header: 'الإجراءات',
      accessor: 'id',
      cell: (safe) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/finances/safes/${safe.id}/report`);
            }}
            className="h-8 w-8 p-0 hover:bg-purple-100"
            title="تقرير المعاملات"
          >
            <FileText className="h-4 w-4 text-purple-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEditSafe(safe);
            }}
            className="h-8 w-8 p-0 hover:bg-blue-100"
          >
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSafeClick(safe);
            }}
            className="h-8 w-8 p-0 hover:bg-red-100"
            disabled={(safe.balance !== 0 && safe.balance != null) || safe.hasTransactions}
          >
            <Trash2 className={`h-4 w-4 ${((safe.balance !== 0 && safe.balance != null) || safe.hasTransactions) ? 'text-gray-400' : 'text-red-600'}`} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="إدارة الخزائن"
        description="إنشاء وإدارة الخزائن والمعاملات المالية"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'إدارة الخزائن' }
        ]}
        actions={
          <div className="flex gap-2">
            {canViewBalances && (
              <Button
                variant="outline"
                className="bg-white border-gray-300 text-gray-800 hover:bg-gray-50 flex gap-2 items-center"
                onClick={toggleHideBalances}
              >
                {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {hideBalances ? 'إظهار الأرصدة' : 'إخفاء الأرصدة'}
              </Button>
            )}
            <Dialog open={openNewSafeDialog} onOpenChange={setOpenNewSafeDialog}>
              <DialogTrigger asChild>
                <Button className="flex gap-2 items-center">
                  <Plus className="w-4 h-4" />
                  إنشاء خزينة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-visible bg-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">إنشاء خزينة جديدة</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    أدخل بيانات الخزينة الجديدة
                  </DialogDescription>
                </DialogHeader>
                <Form {...safeForm}>
                  <form onSubmit={safeForm.handleSubmit(onSubmitSafe)} className="space-y-4">
                    <FormField
                      control={safeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-900 font-medium">اسم الخزينة</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="أدخل اسم الخزينة"
                              {...field}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </FormControl>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={safeForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-900 font-medium">الوصف</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="وصف اختياري للخزينة"
                              {...field}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </FormControl>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                      <FormField
                        control={safeForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-900 font-medium">التصنيف</FormLabel>
                            <SimpleSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="اختر تصنيف الخزينة"
                              options={Object.entries(SAFE_CATEGORY_LABELS).map(([value, label]) => ({
                                value,
                                label
                              }))}
                              menuPortalTarget={null}
                            />
                            <FormMessage className="text-red-600" />
                          </FormItem>
                        )}
                      />
                    <FormField
                      control={safeForm.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-900 font-medium">الرصيد الابتدائي</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </FormControl>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                        إنشاء الخزينة
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Category Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2" dir="rtl">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeCategory === 'ALL'
                ? 'bg-blue-600 shadow-md ring-2 ring-blue-300'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              style={activeCategory === 'ALL' ? { color: 'white' } : { color: '#374151' }}
            >
              <Building className="w-4 h-4" style={activeCategory === 'ALL' ? { color: 'white' } : { color: '#2563eb' }} />
              جميع الخزائن
              <span
                className="rounded-full px-2 py-px text-xs font-bold"
                style={activeCategory === 'ALL'
                  ? { backgroundColor: 'white', color: '#1d4ed8' }
                  : { backgroundColor: '#e5e7eb', color: '#374151' }
                }
              >{safes.length}</span>
            </button>

            {Object.entries(categoryStats).map(([category, stats]) => {
              const isActive = activeCategory === category;
              const colors: Record<string, { bg: string; ring: string; badge: string; icon: string }> = {
                [SafeCategory.DEBT]: { bg: '#dc2626', ring: '#fca5a5', badge: '#b91c1c', icon: '#dc2626' },
                [SafeCategory.INCOME]: { bg: '#16a34a', ring: '#86efac', badge: '#15803d', icon: '#16a34a' },
                [SafeCategory.EXPENSE]: { bg: '#ea580c', ring: '#fdba74', badge: '#c2410c', icon: '#ea580c' },
                [SafeCategory.ASSETS]: { bg: '#2563eb', ring: '#93c5fd', badge: '#1d4ed8', icon: '#2563eb' },
                [SafeCategory.UNSPECIFIED]: { bg: '#4b5563', ring: '#d1d5db', badge: '#374151', icon: '#6b7280' },
              };
              const c = colors[category] || colors[SafeCategory.UNSPECIFIED];
              return (
                <button
                  type="button"
                  key={category}
                  onClick={() => setActiveCategory(isActive ? 'ALL' : category as SafeCategory)}
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'shadow-md'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  style={isActive
                    ? { backgroundColor: c.bg, color: 'white', boxShadow: `0 0 0 2px ${c.ring}` }
                    : { color: '#374151' }
                  }
                >
                  {React.cloneElement(
                    isActive ? stats.activeIcon : stats.icon,
                    { style: isActive ? { color: 'white' } : { color: c.icon } }
                  )}
                  {SAFE_CATEGORY_LABELS[category as SafeCategory]}
                  <span
                    className="rounded-full px-2 py-px text-xs font-bold"
                    style={isActive
                      ? { backgroundColor: 'white', color: c.badge }
                      : { backgroundColor: '#e5e7eb', color: '#374151' }
                    }
                  >{stats.count}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Safes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-gray-900 font-bold">
              {activeCategory === 'ALL'
                ? `جميع الخزائن (${safes.length})`
                : `${SAFE_CATEGORY_LABELS[activeCategory]} (${filteredSafes.length})`
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredSafes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-3">
                {activeCategory === 'ALL' ? '🏛️' : categoryStats[activeCategory as SafeCategory]?.icon}
              </div>
              <p>
                {activeCategory === 'ALL'
                  ? 'لا توجد خزائن'
                  : `لا توجد خزائن من نوع ${SAFE_CATEGORY_LABELS[activeCategory]}`
                }
              </p>
              <p className="text-sm mt-1">قم بإنشاء خزينة جديدة</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg mx-2 my-2 border border-slate-200">
              <DataTable
                data={filteredSafes}
                columns={columns}
                keyField="id"
                isLoading={isLoading}
                onRowClick={(row) => {
                  setSelectedSafe(row);
                  fetchSafeTransactions(row.id);
                  if (typeof document !== 'undefined') {
                    setTimeout(() => {
                      document.getElementById('safe-details-card')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safe Details */}
      {!selectedSafe && filteredSafes.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  اختر خزينة لعرض التفاصيل
                </h3>
                <p className="text-gray-600">
                  اضغط على أي خزينة من القائمة أعلاه لعرض تفاصيلها وإجراء المعاملات
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSafe && (
        <div id="safe-details-card">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-gray-900 font-bold">
                    خزينة: {selectedSafe.name}
                  </CardTitle>
                  <p className="text-gray-700 mt-1 font-medium">
                    الرصيد الحالي: {showBalances ? formatCurrency(selectedSafe.balance, selectedSafe.currency) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-sm"><EyeOff className="w-3 h-3" /> {canViewBalances ? '••••••' : 'لا توجد صلاحية لعرض الرصيد'}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedSafe) {
                        fetchSafeTransactions(selectedSafe.id);
                      }
                    }}
                    className="text-gray-800 border-gray-300 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    تحديث
                  </Button>
                  <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        معاملة جديدة
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-visible bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">إضافة معاملة مالية</DialogTitle>
                        <DialogDescription className="text-gray-600">
                          إضافة إيداع أو تحويل لخزينة {selectedSafe?.name}
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...transactionForm}>
                        <form onSubmit={transactionForm.handleSubmit(onSubmitTransaction)} className="space-y-4">
                          <FormField
                            control={transactionForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-900 font-medium">نوع المعاملة</FormLabel>
                                <SimpleSelect
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  placeholder="اختر نوع المعاملة"
                                  options={[
                                    { value: TransactionType.DEPOSIT, label: 'إيداع' },
                                    ...(selectedSafe &&
                                      selectedSafe.category !== SafeCategory.DEBT &&
                                      selectedSafe.category !== SafeCategory.EXPENSE &&
                                      selectedSafe.category !== SafeCategory.ASSETS
                                      ? [{ value: TransactionType.TRANSFER, label: 'تحويل' }]
                                      : [])
                                  ]}
                                  menuPortalTarget={null}
                                />
                                <FormMessage className="text-red-600" />
                              </FormItem>
                            )}
                          />

                          {transactionForm.watch('type') === TransactionType.TRANSFER && selectedSafe && (
                            <FormField
                              control={transactionForm.control}
                              name="targetId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-900 font-medium">التحويل إلى</FormLabel>
                                  <SimpleSelect
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="اختر الخزينة المستهدفة"
                                    options={getAllowedTargetSafes(selectedSafe).map((safe) => ({
                                      value: safe.id,
                                      label: `${safe.name} - ${SAFE_CATEGORY_LABELS[safe.category]}`
                                    }))}
                                    menuPortalTarget={null}
                                  />
                                  <FormMessage className="text-red-600" />
                                  {selectedSafe.category === SafeCategory.INCOME && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✅ يمكن التحويل من خزائن الدخل إلى خزائن دخل أخرى أو خزائن المصروفات والأصول
                                    </p>
                                  )}
                                  {(selectedSafe.category === SafeCategory.EXPENSE || selectedSafe.category === SafeCategory.ASSETS) && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      ℹ️ خزائن المصروفات والأصول تدعم الإيداع فقط، لا يمكن التحويل منها
                                    </p>
                                  )}
                                  {selectedSafe.category === SafeCategory.DEBT && (
                                    <p className="text-xs text-red-600 mt-1">
                                      🚫 خزائن المديونية تدعم الإيداع فقط، لا يمكن التحويل منها
                                    </p>
                                  )}
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={transactionForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-900 font-medium">المبلغ</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="bg-white border-gray-300 text-gray-900"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-600" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={transactionForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-900 font-medium">الوصف (اختياري)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="وصف المعاملة (اختياري)"
                                    {...field}
                                    className="bg-white border-gray-300 text-gray-900"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-600" />
                              </FormItem>
                            )}
                          />

                          <DialogFooter>
                            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                              إتمام المعاملة
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Safe Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-700 mb-1 font-medium">الرصيد الحالي</p>
                    <p className="text-xl font-bold text-gray-900">
                      {showBalances ? formatCurrency(selectedSafe.balance, selectedSafe.currency) : (
                        <span className="flex items-center gap-1 text-gray-400 text-base"><EyeOff className="w-4 h-4" /> {canViewBalances ? '••••••' : 'لا توجد صلاحية'}</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-700 mb-1 font-medium">العملة</p>
                    <p className="font-semibold text-gray-900">{selectedSafe.currency}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-700 mb-1 font-medium">التصنيف</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryStats[selectedSafe.category]?.icon}</span>
                      <p className="font-semibold text-gray-900">{SAFE_CATEGORY_LABELS[selectedSafe.category]}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-700 mb-1 font-medium">الحالة</p>
                    <Badge className={selectedSafe.isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}>
                      {selectedSafe.isActive ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {selectedSafe.description && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-700 mb-1 font-medium">الوصف</p>
                    <p className="text-gray-900">{selectedSafe.description}</p>
                  </div>
                )}

                {/* Transactions */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">المعاملات الأخيرة</h3>
                  {isTransactionsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="font-medium">لا توجد معاملات مسجلة</p>
                    </div>
                  ) : (
                    <DataTable
                      data={transactions.slice(0, 50)}
                      keyField="id"
                      columns={[
                        {
                          header: 'النوع',
                          accessor: 'type',
                          cell: (tx: any) => {
                            const typeLabels: Record<string, string> = {
                              DEPOSIT: 'إيداع',
                              TRANSFER: 'تحويل',
                              WITHDRAW: 'سحب',
                              PAYMENT: 'دفع',
                              FEE: 'رسوم',
                            };
                            const typeLabel = typeLabels[tx.type] || tx.type;
                            const isDeposit = tx.type === TransactionType.DEPOSIT || tx.type === 'PAYMENT' || tx.type === 'FEE';
                            const isTransfer = tx.type === TransactionType.TRANSFER;
                            return (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${isDeposit ? 'bg-green-100 text-green-800' : isTransfer ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {isDeposit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : isTransfer ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                                {typeLabel}
                              </div>
                            );
                          }
                        },
                        {
                          header: 'المبلغ',
                          accessor: 'amount',
                          cell: (tx: any) => (
                            <span className={`font-bold whitespace-nowrap ${tx.type === TransactionType.DEPOSIT ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === TransactionType.DEPOSIT ? '+' : '-'} {formatCurrency(tx.amount, selectedSafe?.currency)}
                            </span>
                          )
                        },
                        { header: 'التاريخ', accessor: 'createdAt', cell: (tx: any) => new Date(tx.createdAt).toLocaleDateString('ar-EG') },
                        { header: 'الوصف', accessor: 'description', cell: (tx: any) => tx.description || '-' },
                        { header: 'بواسطة', accessor: 'id', cell: (tx: any) => tx.createdBy?.name || '-' }
                      ]}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Safe Dialog */}
      <Dialog open={openEditSafeDialog} onOpenChange={setOpenEditSafeDialog}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-visible bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">تعديل الخزينة</DialogTitle>
            <DialogDescription className="text-gray-600">
              تعديل بيانات الخزينة
            </DialogDescription>
          </DialogHeader>
          <Form {...editSafeForm}>
            <form onSubmit={editSafeForm.handleSubmit(onSubmitEditSafe)} className="space-y-4">
              <FormField
                control={editSafeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">اسم الخزينة</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="أدخل اسم الخزينة"
                        {...field}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />
              <FormField
                control={editSafeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="وصف اختياري للخزينة"
                        {...field}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />
              <FormField
                control={editSafeForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-medium">التصنيف</FormLabel>
                    <SimpleSelect
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="اختر تصنيف الخزينة"
                      options={Object.entries(SAFE_CATEGORY_LABELS).map(([value, label]) => ({
                        value,
                        label
                      }))}
                      menuPortalTarget={null}
                    />
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  حفظ التغييرات
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Safe Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-gray-600">
              هل أنت متأكد من حذف الخزينة "{safeToDelete?.name}"؟
              هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={handleDeleteSafe}>
              حذف الخزينة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-blue-600">
              تأكيد العملية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              {pendingTransaction && (
                <div className="space-y-2">
                  <p className="font-medium">
                    {pendingTransaction.type === TransactionType.DEPOSIT ? 'تأكيد عملية الإيداع' : 'تأكيد عملية التحويل'}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p><strong>المبلغ:</strong> {formatCurrency(pendingTransaction.amount, selectedSafe?.currency || 'EGP')}</p>
                    {pendingTransaction.type === TransactionType.TRANSFER ? (
                      <>
                        <p><strong>من:</strong> {selectedSafe?.name}</p>
                        <p><strong>إلى:</strong> {safes.find(s => s.id === pendingTransaction.targetId)?.name}</p>
                      </>
                    ) : (
                      <p><strong>إلى الخزينة:</strong> {selectedSafe?.name}</p>
                    )}
                    {pendingTransaction.description && (
                      <p><strong>الوصف:</strong> {pendingTransaction.description}</p>
                    )}
                  </div>
                  <p className="text-sm text-amber-600">
                    هل أنت متأكد من المتابعة؟
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-600">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeTransaction}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              تأكيد العملية
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

export default function SafesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'finances.safes', action: 'view' }}>
      <SafesPageContent />
    </ProtectedPage>
  );
} 