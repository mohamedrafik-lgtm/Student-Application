'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { Pagination, type PaginationInfo } from '@/components/ui/Pagination';
import PremiumLoader from '@/components/ui/PremiumLoader';
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  PlusIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLongLeftIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';

interface Safe {
  id: string;
  name: string;
  type?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  category?: 'DEBT' | 'INCOME' | 'EXPENSE' | 'ASSET';
  balance: number;
  description?: string;
}

interface FinancialEntry {
  id: number;
  amount: number;
  description: string;
  fromSafeId: number;
  toSafeId: number;
  fromSafe: Safe;
  toSafe: Safe;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  type: 'TRANSFER';
}

const SAFE_TYPE_LABELS: Record<string, string> = {
  DEBT: 'خزينة الديون',
  INCOME: 'خزينة الدخل',
  EXPENSE: 'خزينة المصروفات',
  ASSET: 'خزينة الأصول'
};

const SAFE_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  DEBT: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  INCOME: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  EXPENSE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ASSET: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export default function FinancialEntriesPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canViewBalances = hasPermission('finances.safes.balances', 'view');
  const [safes, setSafes] = useState<Safe[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10,
    hasNextPage: false, hasPreviousPage: false, startItem: 1, endItem: 10,
  });

  // Transfer form
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedFromSafe, setSelectedFromSafe] = useState<Safe | null>(null);
  const [selectedToSafe, setSelectedToSafe] = useState<Safe | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{
    fromSafe: Safe; toSafe: Safe; amount: number; description: string;
  } | null>(null);

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async (page = 1, search = searchQuery, limit = pagination.itemsPerPage) => {
    try {
      setLoading(true);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const limitParam = search ? 9999 : limit;
      const [safesResponse, entriesResponse] = await Promise.all([
        fetchAPI('/finances/safes'),
        fetchAPI(`/finances/entries?page=${page}&limit=${limitParam}${searchParam}`)
      ]);
      const safesData = Array.isArray(safesResponse) ? safesResponse : (safesResponse.data || []);
      setSafes(safesData);
      setEntries(entriesResponse.data || []);
      if (entriesResponse.pagination) setPagination(entriesResponse.pagination);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFromSafe || !selectedToSafe || !amount || !description) {
      toast.error('يرجى ملء جميع الحقول المطلوبة'); return;
    }
    if (selectedFromSafe.id === selectedToSafe.id) {
      toast.error('لا يمكن إنشاء قيد من خزينة إلى نفسها'); return;
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح'); return;
    }
    if (selectedFromSafe.balance < transferAmount) {
      toast.error(`الرصيد غير كافي. الرصيد المتاح: ${selectedFromSafe.balance.toLocaleString()} جنيه`); return;
    }
    setPendingTransfer({ fromSafe: selectedFromSafe, toSafe: selectedToSafe, amount: transferAmount, description: description.trim() });
    setShowConfirmDialog(true);
  };

  const confirmTransfer = async () => {
    if (!pendingTransfer) return;
    try {
      setTransferLoading(true);
      const response = await fetchAPI('/finances/transfer', {
        method: 'POST',
        body: JSON.stringify({ fromSafeId: pendingTransfer.fromSafe.id, toSafeId: pendingTransfer.toSafe.id, amount: pendingTransfer.amount, description: pendingTransfer.description })
      });
      if (response.success) {
        toast.success('تم إنشاء القيد بنجاح');
        setSelectedFromSafe(null); setSelectedToSafe(null); setAmount(''); setDescription('');
        setShowTransferForm(false); setShowConfirmDialog(false); setPendingTransfer(null);
        await loadData(pagination.currentPage);
      } else {
        throw new Error(response.message || 'فشل في إنشاء القيد');
      }
    } catch (error) {
      console.error('Entry creation error:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ في إنشاء القيد');
    } finally {
      setTransferLoading(false);
    }
  };

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  const formatCurrency = (amt: number) => amt.toLocaleString('ar-EG') + ' جنيه';

  const getIncomeSafes = () => safes.filter(safe => safe.type === 'INCOME' || safe.category === 'INCOME');

  const incomeSafeOptions = safes
    .filter(safe => safe.type === 'INCOME' || safe.category === 'INCOME')
    .map(safe => ({ value: safe.id, label: canViewBalances ? `${safe.name}  ${formatCurrency(safe.balance)}` : safe.name }));

  const toSafeOptions = safes
    .filter(safe => !selectedFromSafe || safe.id !== selectedFromSafe.id)
    .map(safe => {
      const safeType = (safe.type || safe.category) as string;
      const typeLabel = SAFE_TYPE_LABELS[safeType] || '';
      return { value: safe.id, label: typeLabel ? `${safe.name} (${typeLabel})` : safe.name };
    });

  const getSafeTypeInfo = (safe: Safe) => {
    const type = (safe.type || safe.category) as string;
    return {
      label: SAFE_TYPE_LABELS[type] || '',
      colors: SAFE_TYPE_COLORS[type] || { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' },
    };
  };

  const paginationInfo: PaginationInfo = {
    page: pagination.currentPage, limit: pagination.itemsPerPage, total: pagination.totalItems,
    totalPages: pagination.totalPages, hasNext: pagination.hasNextPage, hasPrev: pagination.hasPreviousPage,
  };

  if (loading && entries.length === 0) {
    return (
      <ProtectedPage requiredPermission={{ resource: 'dashboard.financial', action: 'manage' }}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <PremiumLoader type="data" message="جاري تحميل القيود المالية..." />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.financial', action: 'manage' }}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="القيود المالية"
          description="إدارة القيود المالية والتحويلات بين الخزائن"
          breadcrumbs={[
            { label: 'لوحة التحكم', href: '/dashboard' },
            { label: 'المالية', href: '/dashboard/finances/safes' },
            { label: 'القيود المالية' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" leftIcon={<PrinterIcon className="w-4 h-4" />}
                onClick={() => router.push('/dashboard/finances/entries/report')}>
                التقارير
              </Button>
              <Button variant="default" leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setShowTransferForm(true)}>
                + قيد جديد
              </Button>
            </div>
          }
        />

        {/* Income Safes Overview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <WalletIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">خزائن الدخل</h2>
              <p className="text-xs text-slate-400">أرصدة خزائن الدخل المتاحة</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {getIncomeSafes().length === 0 ? (
              <Card hover={false} className="col-span-full !p-8 text-center">
                <WalletIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">لا توجد خزائن دخل</p>
                <p className="text-xs text-slate-300 mt-1">لم يتم العثور على خزائن دخل متاحة</p>
              </Card>
            ) : (
              getIncomeSafes().map((safe) => (
                <Card key={safe.id} hover={true} className="!p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      خزينة دخل
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <BanknotesIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{safe.name}</h3>
                  <p className="text-lg font-black text-emerald-600 mb-1">
                    {canViewBalances ? formatCurrency(safe.balance) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                        <EyeSlashIcon className="w-3.5 h-3.5" /> لا توجد صلاحية
                      </span>
                    )}
                  </p>
                  {safe.description && <p className="text-[11px] text-slate-400 line-clamp-1">{safe.description}</p>}
                  {canViewBalances && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${safe.balance > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-medium ${safe.balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {safe.balance > 0 ? 'متاح' : 'رصيد صفر'}
                      </span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Entries Table */}
        <Card hover={false} className="!p-0 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ArrowsRightLeftIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">سجل المعاملات</h2>
                  <p className="text-[11px] text-slate-400">{pagination.totalItems} معاملة</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadData(1, searchQuery); }}
                    placeholder="بحث بالوصف، الخزينة، المبلغ..."
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" />
                </div>
                <Button variant="default" size="sm" leftIcon={<MagnifyingGlassIcon className="w-3.5 h-3.5" />}
                  onClick={() => loadData(1, searchQuery)} disabled={loading}>
                  بحث
                </Button>
                {searchQuery && (
                  <Button variant="ghost" size="icon"
                    onClick={() => { setSearchQuery(''); setPagination(prev => ({ ...prev, itemsPerPage: 10 })); loadData(1, '', 10); }}
                    className="!w-8 !h-8">
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">من خزينة</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">إلى خزينة</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">المبلغ</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">الوصف</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">المستخدم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <ArrowsRightLeftIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-400">لا توجد معاملات مالية</p>
                      <p className="text-xs text-slate-300 mt-1">ابدأ بإنشاء أول تحويل بين الخزائن</p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const fromInfo = getSafeTypeInfo(entry.fromSafe);
                    const toInfo = getSafeTypeInfo(entry.toSafe);
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5"><span className="text-xs font-bold text-slate-500">#{entry.id}</span></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${fromInfo.colors.dot}`} />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{entry.fromSafe.name}</p>
                              <p className="text-[10px] text-slate-400">{fromInfo.label}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${toInfo.colors.dot}`} />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{entry.toSafe.name}</p>
                              <p className="text-[10px] text-slate-400">{toInfo.label}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><span className="text-xs font-black text-emerald-600">{formatCurrency(entry.amount)}</span></td>
                        <td className="px-4 py-3.5"><ExpandableDescription text={entry.description} variant="table" /></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            <span className="text-[11px]">{formatDate(entry.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <UserCircleIcon className="w-4 h-4 text-slate-300" />
                            <span className="text-xs text-slate-600">{entry.createdBy.name}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          {entries.length > 0 && (
            <div className="md:hidden divide-y divide-slate-100">
              {entries.map((entry) => {
                const fromInfo = getSafeTypeInfo(entry.fromSafe);
                const toInfo = getSafeTypeInfo(entry.toSafe);
                return (
                  <div key={entry.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-slate-400">#{entry.id}</span>
                      <span className="text-sm font-black text-emerald-600">{formatCurrency(entry.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${fromInfo.colors.dot}`} />
                          <span className="text-[10px] text-slate-400">من</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">{entry.fromSafe.name}</p>
                      </div>
                      <ArrowLongLeftIcon className="w-5 h-5 text-slate-300 shrink-0" />
                      <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${toInfo.colors.dot}`} />
                          <span className="text-[10px] text-slate-400">إلى</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">{entry.toSafe.name}</p>
                      </div>
                    </div>
                    {entry.description && <ExpandableDescription text={entry.description} variant="card" className="mb-2" />}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" /><span>{formatDate(entry.createdAt)}</span></div>
                      <div className="flex items-center gap-1"><UserCircleIcon className="w-3 h-3" /><span>{entry.createdBy.name}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {entries.length === 0 && !loading && (
            <div className="md:hidden p-12 text-center">
              <ArrowsRightLeftIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">لا توجد معاملات</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages >= 1 && entries.length > 0 && (
            <div className="border-t border-slate-100">
              <Pagination
                pagination={paginationInfo}
                onPageChange={(page) => loadData(page, searchQuery)}
                onLimitChange={(limit) => { setPagination(prev => ({ ...prev, itemsPerPage: limit })); loadData(1, searchQuery, limit); }}
                showLimitSelector
                limitOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Transfer Modal */}
      <TibaModal
        open={showTransferForm}
        onClose={() => setShowTransferForm(false)}
        variant="secondary"
        size="md"
        title="قيد جديد بين الخزائن"
        subtitle="تحويل مبلغ مالي من خزينة إلى أخرى"
        icon={<ArrowsRightLeftIcon className="w-full h-full" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="success" fullWidth isLoading={transferLoading} leftIcon={<ArrowsRightLeftIcon className="w-4 h-4" />}
              onClick={handleTransfer as any}>
              تأكيد القيد
            </Button>
            <Button variant="outline" onClick={() => setShowTransferForm(false)}>إلغاء</Button>
          </div>
        }
      >
        <form onSubmit={handleTransfer} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">من خزينة <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={incomeSafeOptions}
              value={selectedFromSafe?.id || ''}
              onChange={(value) => { const safe = safes.find(s => s.id === value); setSelectedFromSafe(safe || null); setSelectedToSafe(null); }}
              placeholder="اختر خزينة الدخل..."
              instanceId="from-safe-select"
              menuPortalTarget={null}
            />
            <p className="text-[10px] text-slate-400 mt-1">خزائن الدخل فقط (يجب أن يكون الرصيد كافياً)</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">إلى خزينة <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={toSafeOptions}
              value={selectedToSafe?.id || ''}
              onChange={(value) => { const safe = safes.find(s => s.id === value); setSelectedToSafe(safe || null); }}
              placeholder="اختر الخزينة الهدف..."
              disabled={!selectedFromSafe}
              instanceId="to-safe-select"
              menuPortalTarget={null}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ (جنيه) <span className="text-red-500">*</span></label>
            <div className="relative">
              <CurrencyDollarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="أدخل المبلغ" required />
            </div>
            {selectedFromSafe && canViewBalances && (
              <p className="text-[10px] text-slate-400 mt-1">الرصيد المتاح: <span className="font-bold text-emerald-600">{formatCurrency(selectedFromSafe.balance)}</span></p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف القيد <span className="text-red-500">*</span></label>
            <div className="relative">
              <DocumentTextIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="اكتب وصف تفصيلي للقيد..." rows={3} required />
            </div>
          </div>
        </form>
      </TibaModal>

      {/* Confirmation Modal */}
      <TibaModal
        open={showConfirmDialog}
        onClose={() => { setShowConfirmDialog(false); setPendingTransfer(null); }}
        variant="warning"
        size="md"
        title="تأكيد القيد المالي"
        subtitle="يرجى مراجعة تفاصيل القيد قبل التأكيد"
        icon={<ExclamationTriangleIcon className="w-full h-full" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="success" fullWidth isLoading={transferLoading} leftIcon={<CheckCircleIcon className="w-4 h-4" />}
              onClick={confirmTransfer}>
              تأكيد القيد
            </Button>
            <Button variant="outline" onClick={() => { setShowConfirmDialog(false); setPendingTransfer(null); }} disabled={transferLoading}>إلغاء</Button>
          </div>
        }
      >
        {pendingTransfer && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500">من خزينة:</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{pendingTransfer.fromSafe.name}</p>
                  {canViewBalances && <p className="text-[10px] text-slate-400">الرصيد: {formatCurrency(pendingTransfer.fromSafe.balance)}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500">إلى خزينة:</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{pendingTransfer.toSafe.name}</p>
                  {canViewBalances && <p className="text-[10px] text-slate-400">الرصيد: {formatCurrency(pendingTransfer.toSafe.balance)}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500">المبلغ:</span>
                <p className="text-xl font-black text-emerald-600">{formatCurrency(pendingTransfer.amount)}</p>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-500">الوصف:</span>
                <p className="text-xs text-slate-700 text-left max-w-[200px]">{pendingTransfer.description}</p>
              </div>
            </div>
            {canViewBalances && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">الرصيد المتوقع بعد التحويل</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">{pendingTransfer.fromSafe.name}:</span>
                  <span className="font-bold text-red-600">{formatCurrency(pendingTransfer.fromSafe.balance - pendingTransfer.amount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">{pendingTransfer.toSafe.name}:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(pendingTransfer.toSafe.balance + pendingTransfer.amount)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </TibaModal>
    </ProtectedPage>
  );
}