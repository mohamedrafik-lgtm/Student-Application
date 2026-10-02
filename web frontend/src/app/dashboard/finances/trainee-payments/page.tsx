'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge
} from '@/components/ui';
import { getAllTraineePayments, getTraineesWithFinancialData } from '@/app/lib/api/finances';
import { getAllTrainees, searchTrainees } from '@/app/lib/api/trainees';
import { TraineePayment, PaymentStatus } from '@/app/types/finances';
import { Trainee } from '@/app/types/trainees';
import { AutocompleteSearch, AutocompleteOption } from '@/components/ui/AutocompleteSearch';
import { Pagination, PaginationInfo } from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { formatCurrency } from '@/app/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Search, CreditCard, User, Phone, IdCard, GraduationCap } from 'lucide-react';
import { getImageUrl } from '@/lib/api';
import DashboardShell from '../../components/DashboardShell';
import DashboardHeader from '../../components/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

// نوع المتدرب مع البيانات المالية
interface TraineeWithFinancialData extends Trainee {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentsCount: number;
  photoUrl?: string; // إضافة حقل الصورة
}

const normalizeSearchText = (value?: string) => {
  if (!value) return '';

  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const withLatinDigits = value
    .split('')
    .map((char) => {
      const idx = arabicDigits.indexOf(char);
      return idx >= 0 ? String(idx) : char;
    })
    .join('');

  return withLatinDigits
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isSubsequence = (needle: string, haystack: string) => {
  if (!needle) return true;
  if (!haystack) return false;

  let i = 0;
  let j = 0;
  while (i < needle.length && j < haystack.length) {
    if (needle[i] === haystack[j]) {
      i++;
    }
    j++;
  }

  return i === needle.length;
};

const extractTraineesFromResponse = (response: any): Trainee[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const calculateSearchScore = (query: string, trainee: Partial<Trainee>) => {
  const nameAr = normalizeSearchText(trainee.nameAr);
  const nameEn = normalizeSearchText(trainee.nameEn || '');
  const nationalId = normalizeSearchText(trainee.nationalId || '');
  const phone = normalizeSearchText(trainee.phone || '');
  const combined = [nameAr, nameEn, nationalId, phone].filter(Boolean).join(' ');

  if (!combined || !query) return 0;

  let score = 0;

  if (nameAr === query) score += 1200;
  if (combined === query) score += 1000;
  if (nameAr.startsWith(query)) score += 800;
  if (combined.includes(query)) score += 600;

  const queryTerms = query.split(' ').filter(Boolean);
  const matchedTerms = queryTerms.filter((term) => combined.includes(term));
  if (matchedTerms.length === queryTerms.length && queryTerms.length > 1) {
    score += 350;
  }
  score += matchedTerms.length * 90;

  const compactQuery = query.replace(/\s+/g, '');
  const compactNameAr = nameAr.replace(/\s+/g, '');
  if (isSubsequence(compactQuery, compactNameAr)) {
    score += 150;
  }

  if (nationalId && query.length >= 4 && nationalId.includes(query)) {
    score += 450;
  }

  if (phone && query.length >= 4 && phone.includes(query)) {
    score += 450;
  }

  return score;
};

function TraineePaymentsPageContent() {
  const { } = useAuth();
  const router = useRouter();
  const [trainees, setTrainees] = useState<TraineeWithFinancialData[]>([]);
  const [filteredTrainees, setFilteredTrainees] = useState<TraineeWithFinancialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<AutocompleteOption | null>(null);
  
  // Pagination states
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20, // زيادة الافتراضي لتحسين الأداء
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // جلب البيانات مع Pagination المحسن من الباك إند مباشرة
  const fetchData = async (page = 1, limit = 20, showSuccessMessage = false) => {
    try {
      setIsLoading(true);
      console.log(`🔄 جلب بيانات المتدربين المالية - صفحة ${page}، حد ${limit}`);
      
      // استخدام الـ API الجديد الذي يحسب البيانات المالية في الباك إند
      const response = await getTraineesWithFinancialData({ 
        page, 
        limit 
      });

      console.log(`✅ تم جلب ${response.data.length} متدرب من أصل ${response.pagination.total}`);

      // البيانات جاهزة مع الحسابات المالية من الباك إند
      const traineesWithFinancialData: TraineeWithFinancialData[] = response.data.map(trainee => ({
        ...trainee,
        // البيانات المالية محسوبة بالفعل من الباك إند
        totalAmount: trainee.totalAmount || 0,
        paidAmount: trainee.paidAmount || 0,
        remainingAmount: trainee.remainingAmount || 0,
        paymentStatus: trainee.paymentStatus || 'unpaid',
        paymentsCount: trainee.paymentsCount || 0
      }));

      setTrainees(traineesWithFinancialData);
      setFilteredTrainees(traineesWithFinancialData);
      setPagination(response.pagination);
      
      // رسالة نجاح عند تحديث البيانات (فقط عند التحديث اليدوي)
      if (showSuccessMessage && traineesWithFinancialData.length > 0) {
        const totalDebtors = traineesWithFinancialData.filter(t => t.remainingAmount > 0).length;
        const totalDebt = traineesWithFinancialData.reduce((sum, t) => sum + t.remainingAmount, 0);
        
        toast.success(`✅ تم تحديث البيانات بنجاح!
        
📊 إجمالي المتدربين: ${traineesWithFinancialData.length} متدرب
💰 إجمالي المديونيات: ${formatCurrency(totalDebt, 'EGP')}
👥 عدد المدينين: ${totalDebtors} متدرب`, {
          duration: 4000,
          style: {
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'pre-line'
          }
        });
      }
    } catch (error) {
      toast.error(`❌ حدث خطأ أثناء جلب البيانات
      
⚠️ تفاصيل الخطأ: ${(error as any)?.message || 'خطأ غير معروف'}
🔄 يرجى تحديث الصفحة والمحاولة مرة أخرى`, {
        duration: 6000,
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          whiteSpace: 'pre-line'
        }
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchData(1, pagination.limit);
  }, []);

  // دالة البحث التلقائي
  const handleSearch = async (query: string): Promise<AutocompleteOption[]> => {
    const normalizedQuery = normalizeSearchText(query);
    setSearchQuery(query);

    if (!normalizedQuery) {
      return [];
    }

    const candidateMap = new Map<number, Trainee>();

    const addCandidates = (items: Trainee[]) => {
      for (const trainee of items) {
        if (!trainee?.id) continue;
        if (!candidateMap.has(trainee.id)) {
          candidateMap.set(trainee.id, trainee);
        }
      }
    };

    // fallback محلي دائم من البيانات المحمّلة حالياً
    addCandidates(trainees as unknown as Trainee[]);

    try {
      const [quickSearch, broadSearch] = await Promise.allSettled([
        searchTrainees(query, 50),
        getAllTrainees({
          searchQuery: query,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      ]);

      if (quickSearch.status === 'fulfilled') {
        addCandidates(extractTraineesFromResponse(quickSearch.value));
      }

      if (broadSearch.status === 'fulfilled') {
        addCandidates(extractTraineesFromResponse(broadSearch.value));
      }
    } catch (error) {
      console.error('Search error:', error);
    }

    const rankCandidates = (candidates: Trainee[]) => candidates
      .map((trainee) => ({
        trainee,
        score: calculateSearchScore(normalizedQuery, trainee),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        const aName = normalizeSearchText(a.trainee.nameAr);
        const bName = normalizeSearchText(b.trainee.nameAr);
        return aName.localeCompare(bName, 'ar');
      });

    let candidates = Array.from(candidateMap.values());
    let ranked = rankCandidates(candidates);

    // fallback أخير: في حال فشل البحث المباشر، اجلب عينة أكبر وطبّق بحث تقريبي محلي
    if (!ranked.some((item) => item.score > 0)) {
      try {
        const financialResponse = await getTraineesWithFinancialData({
          page: 1,
          limit: 300,
        });

        addCandidates(extractTraineesFromResponse(financialResponse));
        candidates = Array.from(candidateMap.values());
        ranked = rankCandidates(candidates);
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
      }
    }

    const hasPositiveScore = ranked.some((item) => item.score > 0);
    const results = (hasPositiveScore ? ranked.filter((item) => item.score > 0) : ranked)
      .slice(0, 20)
      .map((item) => item.trainee);

    return results.map((trainee: Trainee) => ({
        id: trainee.id,
        label: trainee.nameAr,
        subtitle: `${trainee.phone} • ${trainee.nationalId}`,
        imageUrl: trainee.photoUrl ? getImageUrl(trainee.photoUrl) : undefined,
        data: trainee
      }));
  };

  // عند اختيار متدرب من البحث
  const handleTraineeSelect = (option: AutocompleteOption) => {
    const traineeId = option.id;
    console.log(`🚀 الانتقال لصفحة دفع المتدرب: ${option.label} (ID: ${traineeId})`);
    
    // الانتقال مباشرة لصفحة الدفع الخاصة بالمتدرب
    router.push(`/dashboard/finances/trainee-payments/${traineeId}`);
  };

  // عند مسح البحث
  const handleClearSearch = () => {
    setSelectedTrainee(null);
    setSearchQuery('');
    setFilteredTrainees(trainees);
  };

  // معالجات Pagination
  const handlePageChange = (newPage: number) => {
    console.log(`🔄 تغيير صفحة المدفوعات إلى: ${newPage}`);
    // تحديث الـ state أولاً
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    fetchData(newPage, pagination.limit);
    // التمرير لأعلى الجدول عند تغيير الصفحة
    document.querySelector('[data-payments-table]')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  const handleLimitChange = (newLimit: number) => {
    console.log(`🔄 تغيير عدد عناصر المدفوعات إلى: ${newLimit}`);
    // تحديث الـ state أولاً
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1 // العودة للصفحة الأولى
    }));
    fetchData(1, newLimit, true);
  };

  // إحصائيات المدفوعات
  const stats = {
    total: filteredTrainees.length,
    paid: filteredTrainees.filter(t => t.paymentStatus === 'paid').length,
    partial: filteredTrainees.filter(t => t.paymentStatus === 'partial').length,
    unpaid: filteredTrainees.filter(t => t.paymentStatus === 'unpaid').length,
    totalDebt: filteredTrainees.reduce((sum, t) => sum + t.remainingAmount, 0)
  };

  // فتح صفحة الدفع للمتدرب
  const openPaymentPage = (traineeId: number) => {
    // فتح في تاب جديد
    window.open(`/dashboard/finances/trainee-payments/${traineeId}`, '_blank');
  };

  // الحصول على لون حالة الدفع
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // الحصول على نص حالة الدفع
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع بالكامل';
      case 'partial': return 'مدفوع جزئياً';
      case 'unpaid': return 'غير مدفوع';
      default: return 'غير محدد';
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader 
        heading="💰 نظام المدفوعات" 
        description="البحث عن المتدربين وإدارة مدفوعاتهم" 
      />

      <div className="space-y-6">
        {/* شريط البحث */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <AutocompleteSearch
                    placeholder="🔍 ابحث عن متدرب..."
                    onSearch={handleSearch}
                    onSelect={handleTraineeSelect}
                    onClear={handleClearSearch}
                    value={selectedTrainee}
                    className="h-11 sm:h-12 text-sm sm:text-base"
                    minSearchLength={2}
                    maxResults={8}
                    emptyMessage="لا توجد متدربين مطابقين للبحث"
                    loadingMessage="جاري البحث عن المتدربين..."
                  />
                </div>
                <Button
                onClick={() => fetchData(pagination.page, pagination.limit, true)}
                  variant="outline"
                className="h-11 sm:h-12 px-4 sm:px-6 border-gray-300 hover:bg-gray-50 text-gray-700 w-full sm:w-auto"
              >
                🔄 تحديث
                </Button>
              </div>

            {/* معلومات البحث */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>📊 إجمالي المتدربين: <strong className="text-gray-800">{trainees.length}</strong></span>
              {searchQuery && (
                <span>🔍 نتائج البحث: <strong className="text-blue-600">{filteredTrainees.length}</strong></span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* جدول المتدربين */}
        <Card className="shadow-sm" data-payments-table>
          <CardHeader className="bg-gray-50 border-b p-4 sm:p-6">
            <CardTitle className="text-base sm:text-xl text-gray-800 flex items-center gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              قائمة المتدربين والبيانات المالية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
      </div>
            ) : filteredTrainees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? `لم يتم العثور على متدربين يطابقون "${searchQuery}"` : 'لم يتم العثور على أي متدربين'}
                </p>
            </div>
            ) : (
              <>
                {/* عرض الجدول على الشاشات الكبيرة */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-100">
                      <TableRow className="border-b-2 border-gray-200">
                        <TableHead className="text-right font-bold text-gray-800 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            بيانات المتدرب
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 py-4">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            البرنامج التدريبي
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 py-4">
                          💰 البيانات المالية
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 py-4">
                          📊 حالة الدفع
                        </TableHead>
                        <TableHead className="text-center font-bold text-gray-800 py-4">
                          ⚡ الإجراءات
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrainees.map((trainee) => (
                        <TableRow
                          key={trainee.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-gray-300 shadow-sm">
                                  {trainee.photoUrl ? (
                                    <img
                                      src={getImageUrl(trainee.photoUrl)}
                                      alt={trainee.nameAr}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg ${trainee.photoUrl ? 'hidden' : ''}`}>
                                    {trainee.nameAr?.charAt(0) || 'م'}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-gray-900 text-base">
                                  {trainee.nameAr}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <IdCard className="h-3 w-3" />
                                    <span>{trainee.nationalId}</span>
                                  </div>
                                  {trainee.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{trainee.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium text-gray-800">
                              {trainee.program?.nameAr || 'غير محدد'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">الإجمالي:</span>
                                  <div className="font-semibold text-gray-800">
                                    {formatCurrency(trainee.totalAmount, 'EGP')}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">المدفوع:</span>
                                  <div className="font-semibold text-green-600">
                                    {formatCurrency(trainee.paidAmount, 'EGP')}
                                  </div>
                                </div>
                              </div>
                              {trainee.remainingAmount > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-600">المتبقي:</span>
                                  <div className="font-bold text-red-600">
                                    {formatCurrency(trainee.remainingAmount, 'EGP')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <Badge
                                className={`${getPaymentStatusColor(trainee.paymentStatus)} border font-medium`}
                              >
                                {getPaymentStatusText(trainee.paymentStatus)}
                              </Badge>
                              {trainee.paymentsCount > 0 && (
                                <div className="text-xs text-gray-600">
                                  {trainee.paymentsCount} رسوم
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <div className="space-y-2">
                              <Button
                                onClick={() => openPaymentPage(trainee.id)}
                                size="sm"
                                className={`${
                                  trainee.remainingAmount > 0
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                } min-w-[80px]`}
                              >
                                <CreditCard className="mr-1 h-3 w-3" />
                                {trainee.remainingAmount > 0 ? 'دفع' : 'عرض'}
                              </Button>
                              {trainee.totalAmount === 0 && (
                                <div className="text-xs text-gray-500">
                                  لا توجد رسوم
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* عرض البطاقات على الهواتف */}
                <div className="md:hidden space-y-3 p-3">
                  {filteredTrainees.map((trainee) => (
                    <Card key={trainee.id} className="overflow-hidden border-2 hover:border-blue-300 transition-all">
                      <CardContent className="p-4">
                        {/* صف المتدرب */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                          <div className="relative w-14 h-14 overflow-hidden rounded-full border-2 border-gray-300 shadow-sm flex-shrink-0">
                            {trainee.photoUrl ? (
                              <img
                                src={getImageUrl(trainee.photoUrl)}
                                alt={trainee.nameAr}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-xl ${trainee.photoUrl ? 'hidden' : ''}`}>
                              {trainee.nameAr?.charAt(0) || 'م'}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 text-base mb-1 truncate">
                              {trainee.nameAr}
                            </div>
                            <div className="space-y-0.5 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <IdCard className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{trainee.nationalId}</span>
                              </div>
                              {trainee.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate" dir="ltr">{trainee.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* البرنامج التدريبي */}
                        <div className="mb-3 pb-3 border-b">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            <span>البرنامج التدريبي:</span>
                          </div>
                          <div className="text-sm font-medium text-gray-800 pr-5">
                            {trainee.program?.nameAr || 'غير محدد'}
                          </div>
                        </div>

                        {/* البيانات المالية */}
                        <div className="mb-3 pb-3 border-b">
                          <div className="text-xs text-gray-600 mb-2 font-medium">💰 البيانات المالية</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-xs text-gray-600 mb-0.5">الإجمالي</div>
                              <div className="font-semibold text-gray-800">
                                {formatCurrency(trainee.totalAmount, 'EGP')}
                              </div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-xs text-gray-600 mb-0.5">المدفوع</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(trainee.paidAmount, 'EGP')}
                              </div>
                            </div>
                          </div>
                          {trainee.remainingAmount > 0 && (
                            <div className="mt-2 bg-red-50 p-2 rounded">
                              <div className="text-xs text-gray-600 mb-0.5">المتبقي</div>
                              <div className="font-bold text-red-600">
                                {formatCurrency(trainee.remainingAmount, 'EGP')}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* حالة الدفع والزر */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <Badge
                              className={`${getPaymentStatusColor(trainee.paymentStatus)} border font-medium text-xs`}
                            >
                              {getPaymentStatusText(trainee.paymentStatus)}
                            </Badge>
                            {trainee.paymentsCount > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                {trainee.paymentsCount} رسوم
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => openPaymentPage(trainee.id)}
                            size="sm"
                            className={`${
                              trainee.remainingAmount > 0
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            } flex-shrink-0`}
                          >
                            <CreditCard className="mr-1 h-3 w-3" />
                            {trainee.remainingAmount > 0 ? 'دفع' : 'عرض'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* مكون Pagination */}
            {!isLoading && pagination.total > 0 && !selectedTrainee && (
              <div className="mt-6 px-6 pb-6">
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  isLoading={isLoading}
                  showLimitSelector={true}
                  limitOptions={[10, 20, 30, 50, 100]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* رسالة عدم وجود نتائج */}
        {!isLoading && pagination.total === 0 && !selectedTrainee && (
          <div className="text-center py-12">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8 rounded-xl border border-gray-200 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد بيانات مالية</h3>
              <p className="text-gray-600 text-sm">
                لم يتم العثور على بيانات مالية للمتدربين
              </p>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        {!isLoading && pagination.total > 0 && !selectedTrainee && (
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-blue-800">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">💡 نصيحة:</p>
                  <p className="text-xs sm:text-sm">اضغط على زر "دفع" لفتح صفحة منفصلة تحتوي على جميع مديونيات المتدرب والدفع الذكي</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
    );
}

export default function TraineePaymentsPage() {
  return (
    <FinancialPageGuard>
      <TraineePaymentsPageContent />
    </FinancialPageGuard>
  );
} 