'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { fetchAPI } from '@/lib/api';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import PageHeader from '@/app/components/PageHeader';
import { BanknotesIcon, CheckCircleIcon, ClockIcon, PlusIcon, PrinterIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';

type SalaryComponent = { id?: string; name: string; percentage: number; attendanceBased: boolean };
type PayrollProfileRow = { id: string; name: string; email: string; phone: string | null; isActive: boolean; payrollProfile: null | { id: string; baseSalary: number; kpiEnabled: boolean; kpiAmount: number; effectiveFrom: string; notes: string | null; isActive: boolean; components: SalaryComponent[]; salaryChanges: any[] } };
type Slip = { id: string; approvedAt?: string | null; approvedBy?: { id: string; name: string } | null; user: { id: string; name: string; email: string; phone: string | null }; profile: { kpiEnabled: boolean; kpiAmount: number }; baseSalary: number; componentTotal: number; kpiAmount: number; kpiDefaultAmount: number; kpiSpecified: boolean; additions: number; deductions: number; grossAmount: number; netAmount: number; paidAmount: number; remainingAmount: number; expectedWorkDays: number; attendedWorkDays: number; attendanceFactor: number; attendanceDetails: any; payoutStatus: string; items: Array<{ id: string; name: string; percentage: number; nominalAmount: number; payableAmount: number; attendanceBased: boolean }>; adjustments: Array<{ id: string; type: string; amount: number; reason: string; createdBy: { name: string } }>; payouts: Array<{ amount: number; safe: { name: string }; createdAt: string }> };
type PayrollPeriod = { id: string; year: number; month: number; status: string; totalNet: number; totalPaid: number; remaining: number };
const money = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function PayrollAdminPage() {
  const currentDate = new Date();
  const [profiles, setProfiles] = useState<PayrollProfileRow[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [profileListSearch, setProfileListSearch] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(currentDate.toISOString().slice(0, 10));
  const [salaryChangeReason, setSalaryChangeReason] = useState('');
  const [notes, setNotes] = useState('');
  const [kpiEnabled, setKpiEnabled] = useState(false);
  const [defaultKpiAmount, setDefaultKpiAmount] = useState('0');
  const [kpiInputs, setKpiInputs] = useState<Record<string, string>>({});
  const [components, setComponents] = useState<SalaryComponent[]>([{ name: 'الراتب الأساسي', percentage: 100, attendanceBased: false }]);
  const [advanceLimitPercent, setAdvanceLimitPercent] = useState('30');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [period, setPeriod] = useState<any>(null);
  const [selectedSlipId, setSelectedSlipId] = useState('');
  const [selectedApprovalSlipIds, setSelectedApprovalSlipIds] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'ADDITION' | 'DEDUCTION'>('ADDITION');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [approvalTargetIds, setApprovalTargetIds] = useState<string[] | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, periodRows, settings] = await Promise.all([fetchAPI('/payroll/profiles'), fetchAPI('/payroll/periods'), fetchAPI('/payroll/settings')]);
      setProfiles(Array.isArray(profileRows) ? profileRows : []);
      setPeriods(Array.isArray(periodRows) ? periodRows : []);
      setAdvanceLimitPercent(String(settings?.advanceLimitPercent ?? 30));
    } catch (error: any) { toast.error(error?.message || 'تعذر تحميل نظام الرواتب'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!selectedPeriodId) { setPeriod(null); return; }
    fetchAPI(`/payroll/periods/${selectedPeriodId}`).then(setPeriod).catch((error: any) => toast.error(error?.message || 'تعذر تحميل المسير'));
  }, [selectedPeriodId]);

  const selectedUser = profiles.find((user) => user.id === selectedUserId);
  const existingProfile = selectedUser?.payrollProfile;
  const filteredEmployees = profiles.filter((user) =>
    `${user.name} ${user.email} ${user.phone || ''}`.toLocaleLowerCase().includes(employeeSearch.trim().toLocaleLowerCase()),
  );
  const configuredProfiles = profiles.filter((user) => {
    if (!user.payrollProfile) return false;
    const query = profileListSearch.trim().toLocaleLowerCase();
    return !query || `${user.name} ${user.email} ${user.phone || ''}`.toLocaleLowerCase().includes(query);
  });
  const percentTotal = useMemo(() => components.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0), [components]);

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    const profile = profiles.find((user) => user.id === userId)?.payrollProfile;
    setBaseSalary(profile ? String(profile.baseSalary) : '');
    setEffectiveFrom(profile?.effectiveFrom ? new Date(profile.effectiveFrom).toISOString().slice(0, 10) : currentDate.toISOString().slice(0, 10));
    setSalaryChangeReason('');
    setNotes(profile?.notes || '');
    setKpiEnabled(profile?.kpiEnabled || false);
    setDefaultKpiAmount(String(profile?.kpiAmount ?? 0));
    setComponents(profile?.components?.length ? profile.components.map(({ name, percentage, attendanceBased }) => ({ name, percentage, attendanceBased })) : [{ name: 'الراتب الأساسي', percentage: 100, attendanceBased: false }]);
  };

  const editEmployeeSalary = (userId: string) => {
    selectUser(userId);
    setEmployeeDropdownOpen(false);
    setEmployeeSearch('');
    document.getElementById('payroll-profile-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('payroll-base-salary')?.focus(), 350);
  };

  const prepareEmployeeDeduction = async (userId: string) => {
    const draftPeriod = periods.find((item) => item.status === 'DRAFT' && item.year === year && item.month === month)
      || periods.find((item) => item.status === 'DRAFT');
    if (!draftPeriod) {
      toast.error('لإضافة خصم، أعد مسير الشهر أولاً ثم أضف الخصم قبل اعتماده.');
      return;
    }
    try {
      const draft = await fetchAPI(`/payroll/periods/${draftPeriod.id}`);
      const slip = draft?.slips?.find((item: Slip) => item.user.id === userId);
      if (!slip) {
        toast.error('لا يوجد مفرد راتب لهذا الموظف في المسير المحدد.');
        return;
      }
      setSelectedPeriodId(draftPeriod.id);
      setPeriod(draft);
      setSelectedSlipId(slip.id);
      setAdjustmentType('DEDUCTION');
      setAdjustmentAmount('');
      setAdjustmentReason('');
      window.setTimeout(() => document.getElementById(`payroll-slip-${slip.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر فتح مسير الموظف');
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      toast.error('اختر الموظف أولاً');
      return;
    }
    setSaving(true);
    try {
      await fetchAPI('/payroll/profiles', { method: 'POST', body: JSON.stringify({ userId: selectedUserId, baseSalary: Number(baseSalary), effectiveFrom, salaryChangeReason, notes, kpiEnabled, kpiAmount: Number(defaultKpiAmount), components }) });
      toast.success('تم حفظ ملف الراتب ومكوناته');
      await loadData();
      setSalaryChangeReason('');
    } catch (error: any) { toast.error(error?.message || 'تعذر حفظ ملف الراتب'); }
    finally { setSaving(false); }
  };

  const saveSettings = async () => {
    try { await fetchAPI('/payroll/settings', { method: 'PUT', body: JSON.stringify({ advanceLimitPercent: Number(advanceLimitPercent) }) }); toast.success('تم حفظ حد السلفة'); }
    catch (error: any) { toast.error(error?.message || 'تعذر حفظ الإعدادات'); }
  };

  const generatePeriod = async () => {
    setSaving(true);
    try {
      const result = await fetchAPI('/payroll/periods/generate', { method: 'POST', body: JSON.stringify({ year, month }) });
      toast.success('تم إعداد مسير الرواتب وربطه بحسابات الحضور والإجازات');
      await loadData();
      if (result?.id) setSelectedPeriodId(result.id);
    } catch (error: any) { toast.error(error?.message || 'تعذر إعداد المسير'); }
    finally { setSaving(false); }
  };

  const approvePeriod = async () => {
    if (!period) return;
    const pendingSlips: Slip[] = period.slips.filter((slip: Slip) => !slip.approvedAt && period.status === 'DRAFT');
    if (pendingSlips.some((slip) => slip.profile.kpiEnabled && slip.attendanceDetails?.kpiSpecified !== true)) {
      toast.error('أدخل أو أكد القيمة الشهرية لـ KPI لكل موظف غير معتمد قبل الاعتماد الجماعي.');
      return;
    }
    setSaving(true);
    try {
      await fetchAPI(`/payroll/periods/${period.id}/approve`, { method: 'POST' });
      const approvedPeriod = await fetchAPI(`/payroll/periods/${period.id}`);
      setPeriod(approvedPeriod);
      setSelectedApprovalSlipIds([]);
      toast.success('تم اعتماد الموظفين غير المعتمدين وإتاحة رواتبهم للصرف');
      setApprovalConfirmOpen(false);
      setApprovalTargetIds(null);
      await loadData();
    }
    catch (error: any) { toast.error(error?.message || 'تعذر اعتماد المسير'); }
    finally { setSaving(false); }
  };

  const approveSelectedSlips = async (slipIds: string[]) => {
    if (!period || !slipIds.length) return;
    const slips = period.slips.filter((slip: Slip) => slipIds.includes(slip.id) && !slip.approvedAt);
    if (!slips.length) return;
    if (slips.some((slip: Slip) => slip.profile.kpiEnabled && slip.attendanceDetails?.kpiSpecified !== true)) {
      toast.error('أكد قيمة KPI الشهرية لكل موظف محدد قبل الاعتماد.');
      return;
    }
    setSaving(true);
    try {
      const result = await fetchAPI(`/payroll/periods/${period.id}/approve-slips`, { method: 'POST', body: JSON.stringify({ slipIds: slips.map((slip: Slip) => slip.id) }) });
      setPeriod(await fetchAPI(`/payroll/periods/${period.id}`));
      setSelectedApprovalSlipIds((current) => current.filter((id) => !slipIds.includes(id)));
      toast.success(result?.pendingCount ? `تم اعتماد ${result.approvedCount} مفردة، والمتبقي ${result.pendingCount} دون اعتماد` : 'تم اعتماد جميع مفردات المسير وإتاحتها للصرف');
      setApprovalConfirmOpen(false);
      setApprovalTargetIds(null);
      await loadData();
    } catch (error: any) { toast.error(error?.message || 'تعذر اعتماد رواتب الموظفين المحددين'); }
    finally { setSaving(false); }
  };

  const confirmApproval = () => {
    if (approvalTargetIds === null) return void approvePeriod();
    return void approveSelectedSlips(approvalTargetIds);
  };

  const addAdjustment = async () => {
    if (!selectedSlipId) return;
    try {
      await fetchAPI(`/payroll/slips/${selectedSlipId}/adjustments`, { method: 'POST', body: JSON.stringify({ type: adjustmentType, amount: Number(adjustmentAmount), reason: adjustmentReason }) });
      toast.success('تم إضافة التعديل إلى مفردات الراتب');
      setAdjustmentAmount(''); setAdjustmentReason('');
      setPeriod(await fetchAPI(`/payroll/periods/${period.id}`));
    } catch (error: any) { toast.error(error?.message || 'تعذر إضافة التعديل'); }
  };

  const saveSlipKpi = async (slip: Slip) => {
    const amount = Number(kpiInputs[slip.id] ?? slip.kpiAmount);
    if (!Number.isFinite(amount) || amount < 0) return toast.error('أدخل مبلغ KPI صحيحاً');
    try {
      await fetchAPI(`/payroll/slips/${slip.id}/kpi`, { method: 'PATCH', body: JSON.stringify({ amount }) });
      toast.success('تم حفظ مبلغ KPI في مسير الموظف');
      const [updatedPeriod, updatedPeriods] = await Promise.all([fetchAPI(`/payroll/periods/${period.id}`), fetchAPI('/payroll/periods')]);
      setPeriod(updatedPeriod);
      setPeriods(Array.isArray(updatedPeriods) ? updatedPeriods : []);
    } catch (error: any) { toast.error(error?.message || 'تعذر حفظ مبلغ KPI'); }
  };

  const openPrintPage = (slipId?: string) => {
    if (!period?.id) return toast.error('اختر مسيراً أولاً');
    const target = `/print/payroll/${period.id}${slipId ? `?slipId=${encodeURIComponent(slipId)}` : ''}`;
    const printWindow = window.open(target, '_blank');
    if (!printWindow) toast.error('تعذر فتح تبويب الطباعة؛ اسمح بالنوافذ المنبثقة لهذا الموقع.');
  };
  const printPeriod = () => openPrintPage();
  const approvedSlipCount = period?.status === 'APPROVED'
    ? period.slips.length
    : period?.slips?.filter((slip: Slip) => Boolean(slip.approvedAt)).length ?? 0;
  const pendingSlipCount = period?.status === 'DRAFT' ? Math.max(0, (period?.slips?.length ?? 0) - approvedSlipCount) : 0;
  const approvalTargetSlips: Slip[] = period?.slips?.filter((slip: Slip) => !slip.approvedAt && (approvalTargetIds === null || approvalTargetIds.includes(slip.id))) ?? [];
  const statusLabel = period?.status === 'APPROVED' ? 'معتمد وجاهز للصرف' : period?.status === 'CLOSED' ? 'مغلق' : approvedSlipCount ? `اعتماد جزئي · ${approvedSlipCount} من ${period.slips.length}` : 'مسودة';

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <PageHeader title="نظام الرواتب" description="إعداد الرواتب ومكوناتها، احتساب الحضور آلياً، ثم اعتماد المسير للصرف." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الموارد البشرية' }, { label: 'نظام الرواتب' }]} actions={<Link href="/dashboard/hr/my-salary" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">عرض الموظف لراتبه</Link>} />

    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-blue-800"><UserGroupIcon className="h-5 w-5" />موظفون بملف راتب</div><div className="mt-2 text-2xl font-black text-blue-900">{profiles.filter((user) => user.payrollProfile?.isActive).length.toLocaleString('ar-EG')}</div></article>
      <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><BanknotesIcon className="h-5 w-5" />إجمالي المسيرات المسجلة</div><div className="mt-2 text-2xl font-black text-emerald-900">{periods.length.toLocaleString('ar-EG')}</div></article>
      <article className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"><div><div className="text-sm font-semibold text-amber-800">الحد الأعلى للسلفة</div><div className="mt-1 text-xs text-amber-700">نسبة من صافي المستحق الشهري</div></div><div className="flex items-center gap-2"><input aria-label="نسبة حد السلفة" type="number" min="0" max="100" value={advanceLimitPercent} onChange={(event) => setAdvanceLimitPercent(event.target.value)} className="h-9 w-20 rounded-lg border border-amber-200 bg-white px-2 text-center font-bold" /><button onClick={saveSettings} className="h-9 rounded-lg bg-amber-700 px-3 text-xs font-bold text-white">حفظ</button></div></article>
    </section>

    <section id="payroll-profile-form" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4"><h2 className="font-bold text-slate-900">إعداد راتب موظف</h2><p className="mt-1 text-xs text-slate-500">مجموع نسب المكونات الأساسية يجب أن يساوي 100%. مكونات الحضور تتأثر بأيام الغياب غير المبرر.</p></div>
      <form onSubmit={saveProfile} className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="text-xs font-semibold text-slate-600">
            <label htmlFor="payroll-employee-search">الموظف</label>
            <div className="relative z-30 mt-1.5">
              <input
                id="payroll-employee-search"
                type="search"
                role="combobox"
                aria-expanded={employeeDropdownOpen}
                aria-controls="payroll-employee-options"
                aria-autocomplete="list"
                autoComplete="off"
                value={employeeDropdownOpen ? employeeSearch : selectedUser ? `${selectedUser.name} — ${selectedUser.email}` : employeeSearch}
                onFocus={() => { setEmployeeSearch(''); setEmployeeDropdownOpen(true); }}
                onChange={(event) => { setEmployeeSearch(event.target.value); setEmployeeDropdownOpen(true); }}
                onBlur={() => window.setTimeout(() => setEmployeeDropdownOpen(false), 120)}
                placeholder="ابحث بالاسم أو البريد أو الهاتف"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pl-10 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              {employeeDropdownOpen && <div id="payroll-employee-options" role="listbox" aria-label="نتائج البحث عن الموظفين" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {filteredEmployees.length ? filteredEmployees.map((employee) => <button
                key={employee.id}
                type="button"
                role="option"
                aria-selected={selectedUserId === employee.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { selectUser(employee.id); setEmployeeSearch(''); setEmployeeDropdownOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right transition ${selectedUserId === employee.id ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}
              ><span className="min-w-0"><b className="block truncate text-sm">{employee.name}</b><small className="mt-0.5 block truncate font-normal text-slate-500">{employee.email}{employee.phone ? ` · ${employee.phone}` : ''}</small></span><span className="shrink-0 text-[10px] font-medium text-slate-400">{employee.payrollProfile ? 'ملف راتب موجود' : 'موظف جديد'}</span></button>)
                : <p className="px-3 py-6 text-center text-xs font-normal text-slate-500">لا يوجد موظف يطابق البحث.</p>}
              </div>}
            </div>
          </div>
          <label className="text-xs font-semibold text-slate-600">الراتب الأساسي<input id="payroll-base-salary" required type="number" min="0" step="0.01" value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="مثال: 8000" /></label>
          <label className="text-xs font-semibold text-slate-600">{existingProfile && Number(baseSalary) !== existingProfile.baseSalary ? 'تاريخ سريان تعديل الراتب' : 'تاريخ بدء استحقاق الراتب'}<input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /><small className="mt-1.5 block font-normal leading-5 text-slate-500">يحدد هذا التاريخ بداية تطبيق الراتب أو الزيادة. يُحتسب الراتب لكل شهر عند إعداد مسيره، وتُراعى الأيام عند سريان تعديل في منتصف الشهر.</small></label>
        </div>
        {existingProfile && Number(baseSalary) !== existingProfile.baseSalary && <label className="block text-xs font-semibold text-amber-800">سبب زيادة/تعديل الراتب — يحفظ في سجل التغييرات<textarea required value={salaryChangeReason} onChange={(event) => setSalaryChangeReason(event.target.value)} className="mt-1.5 min-h-16 w-full rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm" placeholder="مثال: زيادة سنوية بناءً على تقييم الأداء" /></label>}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-800">تقسيم الراتب الأساسي</h3><p className="mt-1 text-xs text-slate-500">الأجزاء المحددة للحضور يحسبها النظام تلقائياً من سجلات الدوام الشهرية، دون إدخال مبلغها يدوياً.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${Math.abs(percentTotal - 100) < .01 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>المجموع {percentTotal.toLocaleString('ar-EG')}%</span></div>
          <div className="space-y-2 p-3">
            {components.map((component, index) => {
              const otherComponentsTotal = components.reduce((sum, item, itemIndex) => itemIndex === index ? sum : sum + (Number(item.percentage) || 0), 0);
              const remainingPercent = Math.max(0, 100 - otherComponentsTotal);
              return <div key={index} className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[minmax(150px,1fr)_120px_minmax(180px,1fr)_40px] sm:items-center">
              <input aria-label="اسم جزء الراتب" value={component.name} onChange={(event) => setComponents((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="اسم الجزء" />
              <div className="relative"><input aria-label="النسبة المئوية" type="number" min="0" max={remainingPercent} step="0.01" value={component.percentage} onChange={(event) => { const entered = event.target.valueAsNumber; const percentage = Number.isFinite(entered) ? Math.max(0, Math.min(entered, remainingPercent)) : 0; setComponents((current) => current.map((item, i) => i === index ? { ...item, percentage } : item)); }} className="h-10 w-full rounded-lg border border-slate-200 px-3 pl-8 text-sm" /><span className="absolute left-3 top-3 text-xs text-slate-400">%</span></div>
              <label className="flex cursor-pointer items-start gap-2 text-xs font-semibold text-blue-800"><input type="checkbox" checked={component.attendanceBased} onChange={(event) => setComponents((current) => current.map((item, i) => i === index ? { ...item, attendanceBased: event.target.checked } : item))} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700" /><span><b>احتساب تلقائي حسب الحضور والانصراف</b>{component.attendanceBased && <small className="mt-1 block max-w-sm font-normal leading-5 text-slate-500">عند إعداد المسير، يستخرج النظام مستحق هذا الجزء من سجل الدوام ونسبة أيام العمل المحتسبة؛ لذلك لا يحتاج الموظف أو المسؤول لإدخال قيمته كل شهر. العطلات الرسمية والإجازات المعتمدة والراحة الأسبوعية لا تُحسب غياباً.</small>}</span></label>
              <button type="button" aria-label="حذف المكون" disabled={components.length === 1} onClick={() => setComponents((current) => current.filter((_, i) => i !== index))} className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30"><XMarkIcon className="h-4 w-4" /></button>
            </div>;
            })}
            <button type="button" onClick={() => setComponents((current) => [...current, { name: '', percentage: 0, attendanceBased: false }])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><PlusIcon className="h-4 w-4" />إضافة جزء راتب</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-xl border p-4 ${kpiEnabled ? 'border-violet-200 bg-violet-50/60' : 'border-slate-200 bg-slate-50'}`}>
            <label className="flex items-center justify-between gap-3"><span><b className="block text-sm text-slate-800">مكافأة KPI</b><small className="mt-1 block text-xs text-slate-500">إضافة على تقسيم الراتب الأساسي عند تفعيلها.</small></span><input type="checkbox" checked={kpiEnabled} onChange={(event) => setKpiEnabled(event.target.checked)} className="h-5 w-5 accent-violet-600" /></label>
            {kpiEnabled && <><label className="mt-3 block text-xs font-semibold text-violet-900">القيمة الافتراضية لـ KPI<input type="number" min="0" step="0.01" value={defaultKpiAmount} onChange={(event) => setDefaultKpiAmount(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-violet-200 bg-white px-3 text-sm text-slate-800" /></label><p className="mt-2 rounded-lg border border-violet-100 bg-white/80 p-3 text-xs leading-5 text-violet-800">تُستخدم هذه القيمة كبداية في كل مسير شهري. يمكنك إدخال قيمة صرف مختلفة لكل شهر قبل اعتماد المسير.</p></>}
          </div>
          <label className="block text-xs font-semibold text-slate-600">ملاحظات ملف الراتب<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="ملاحظات اختيارية" /></label>
        </div>
        {baseSalary && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">الراتب الأساسي الاسمي: <b className="text-slate-900">{money(Number(baseSalary))}</b>{kpiEnabled && <> · KPI الافتراضي: <b className="text-violet-800">{money(Number(defaultKpiAmount) || 0)}</b></>} قبل احتساب الحضور والإضافات والخصومات الشهرية.</div>}
        <div className="flex justify-end"><button disabled={saving || !selectedUserId || Math.abs(percentTotal - 100) > .01} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ إعداد الراتب'}</button></div>
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><h2 className="font-bold text-slate-900">الموظفون المسجل لهم راتب</h2><p className="mt-1 text-xs text-slate-500">عدّل مكونات الراتب أو سجّل زيادة، أو انتقل مباشرة لإضافة خصم لمسير مسودة.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{configuredProfiles.length} موظف</span><input type="search" value={profileListSearch} onChange={(event) => setProfileListSearch(event.target.value)} placeholder="ابحث عن موظف" aria-label="البحث في الموظفين المسجل لهم راتب" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm sm:w-64" /></div>
      </div>
      {loading ? <div className="p-6 text-center text-sm text-slate-500">جارٍ تحميل ملفات الرواتب...</div>
        : configuredProfiles.length ? <div className="divide-y divide-slate-100">{configuredProfiles.map((employee) => <article key={employee.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-slate-900">{employee.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${employee.payrollProfile?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{employee.payrollProfile?.isActive ? 'راتب نشط' : 'ملف متوقف'}</span></div><p className="mt-1 truncate text-xs text-slate-500">{employee.email}{employee.phone ? ` · ${employee.phone}` : ''}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600"><span className="rounded-md bg-slate-100 px-2 py-1">الأساسي: {money(employee.payrollProfile!.baseSalary)}</span><span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{employee.payrollProfile!.components.length} أجزاء راتب</span>{employee.payrollProfile!.kpiEnabled && <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700">KPI افتراضي: {money(employee.payrollProfile!.kpiAmount)}</span>}</div></div>
          <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => editEmployeeSalary(employee.id)} className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 hover:bg-blue-50">تعديل / زيادة الراتب</button><button type="button" onClick={() => void prepareEmployeeDeduction(employee.id)} className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-50">تطبيق خصم</button></div>
        </article>)}</div>
          : <div className="p-8 text-center text-sm text-slate-500">{profileListSearch ? 'لا توجد نتائج مطابقة.' : 'لم يتم إعداد رواتب للموظفين بعد.'}</div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">إعداد ومراجعة المسير الشهري</h2><p className="mt-1 text-xs text-slate-500">السحب يحتسب نسبة الحضور الفعلية، ويستثني العطلات الرسمية والإجازات المعتمدة.</p></div><div className="flex flex-wrap items-center gap-2"><select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select><input aria-label="السنة" type="number" min="2000" max="2200" value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm" /><button onClick={generatePeriod} disabled={saving || !profiles.some((user) => user.payrollProfile?.isActive)} className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">إعداد المسير</button></div></div>
      <div className="mb-4 flex flex-wrap gap-2">{periods.map((item) => <button key={item.id} onClick={() => { setSelectedPeriodId(item.id); setSelectedApprovalSlipIds([]); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedPeriodId === item.id ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{monthNames[item.month - 1]} {item.year} · {item.status === 'APPROVED' ? 'معتمد' : item.status === 'CLOSED' ? 'مغلق' : 'مسودة'}</button>)}</div>
      {period && <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><ClockIcon className="h-5 w-5 text-blue-600" />مسير {monthNames[period.month - 1]} {period.year}<span className="rounded-full bg-white px-2 py-1 text-xs text-blue-700">{statusLabel}</span></div><div className="flex flex-wrap gap-2 print:hidden"><button onClick={printPeriod} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><PrinterIcon className="h-4 w-4" />طباعة المسير جماعياً</button>{period.status === 'DRAFT' && <><button type="button" disabled={saving || !selectedApprovalSlipIds.length} onClick={() => { setApprovalTargetIds(selectedApprovalSlipIds); setApprovalConfirmOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"><CheckCircleIcon className="h-4 w-4" />اعتماد المحددين ({selectedApprovalSlipIds.length})</button>{pendingSlipCount > 0 && <button onClick={() => { setApprovalTargetIds(null); setApprovalConfirmOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircleIcon className="h-4 w-4" />اعتماد كل غير المعتمدين ({pendingSlipCount})</button>}</>}</div></div>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">الموظفون <b className="block mt-1 text-base text-slate-900">{period.slips.length}</b></div><div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">إجمالي المستحق <b className="block mt-1 text-base">{money(period.slips.reduce((sum: number, slip: Slip) => sum + slip.netAmount, 0))}</b></div><div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">المصروف <b className="block mt-1 text-base">{money(period.slips.reduce((sum: number, slip: Slip) => sum + slip.paidAmount, 0))}</b></div><div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">المتبقي <b className="block mt-1 text-base">{money(period.slips.reduce((sum: number, slip: Slip) => sum + slip.remainingAmount, 0))}</b></div></div>
        {period.status === 'DRAFT' && pendingSlipCount > 0 && <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={selectedApprovalSlipIds.length === pendingSlipCount} onChange={(event) => setSelectedApprovalSlipIds(event.target.checked ? period.slips.filter((slip: Slip) => !slip.approvedAt).map((slip: Slip) => slip.id) : [])} />تحديد كل الموظفين غير المعتمدين</label>}<div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full min-w-0 text-right text-sm"><thead className="hidden bg-slate-50 text-xs text-slate-500 sm:table-header-group"><tr><th className="px-3 py-3"><div className="flex items-center gap-2">{period.status === 'DRAFT' && <input aria-label="تحديد كل الموظفين غير المعتمدين" type="checkbox" checked={pendingSlipCount > 0 && selectedApprovalSlipIds.length === pendingSlipCount} onChange={(event) => setSelectedApprovalSlipIds(event.target.checked ? period.slips.filter((slip: Slip) => !slip.approvedAt).map((slip: Slip) => slip.id) : [])} />}الموظف</div></th><th className="px-3 py-3">الحضور</th><th className="px-3 py-3">إجمالي الراتب</th><th className="px-3 py-3">إضافات / خصومات</th><th className="px-3 py-3">الصافي</th><th className="px-3 py-3">المصروف</th><th className="px-3 py-3">المتبقي</th><th className="px-3 py-3">الإجراء</th></tr></thead><tbody className="block divide-y divide-slate-100 sm:table-row-group">{period.slips.map((slip: Slip) => <Fragment key={slip.id}>
          <tr id={`payroll-slip-${slip.id}`} key={slip.id} className="block rounded-xl border border-slate-200 bg-white p-3 sm:table-row sm:rounded-none sm:border-0 sm:p-0 sm:hover:bg-slate-50"><td data-label="الموظف" className="flex items-center justify-between gap-3 px-2 py-2 before:shrink-0 before:text-xs before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden"><div className="flex min-w-0 items-start gap-2">{period.status === 'DRAFT' && !slip.approvedAt && <input aria-label={`تحديد راتب ${slip.user.name} للاعتماد`} type="checkbox" checked={selectedApprovalSlipIds.includes(slip.id)} onChange={(event) => setSelectedApprovalSlipIds((current) => event.target.checked ? [...new Set([...current, slip.id])] : current.filter((id) => id !== slip.id))} className="mt-1 shrink-0" />}<span className="min-w-0 text-left sm:text-right"><b className="block truncate text-slate-800">{slip.user.name}</b><small className="mt-1 block truncate text-slate-500">{slip.user.email}</small>{slip.approvedAt && <small className="mt-1 block font-semibold text-emerald-700">معتمد للمحاسب{slip.approvedBy?.name ? ` · ${slip.approvedBy.name}` : ''}</small>}</span></div></td><td data-label="الحضور" className="flex items-center justify-between gap-3 px-2 py-2 text-xs text-slate-600 before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden">{slip.attendedWorkDays}/{slip.expectedWorkDays} يوم · {(slip.attendanceFactor * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%</td><td data-label="إجمالي الراتب" className="flex items-center justify-between gap-3 px-2 py-2 before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden">{money(slip.grossAmount)}</td><td data-label="إضافات / خصومات" className="flex items-center justify-between gap-3 px-2 py-2 text-xs before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden"><span><span className="text-emerald-700">+{money(slip.additions)}</span><span className="mx-1 text-slate-300">/</span><span className="text-rose-700">-{money(slip.deductions)}</span></span></td><td data-label="الصافي" className="flex items-center justify-between gap-3 px-2 py-2 font-bold text-blue-800 before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden">{money(slip.netAmount)}</td><td data-label="المصروف" className="flex items-center justify-between gap-3 px-2 py-2 text-emerald-700 before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden">{money(slip.paidAmount)}</td><td data-label="المتبقي" className="flex items-center justify-between gap-3 px-2 py-2 text-amber-700 before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden">{money(slip.remainingAmount)}</td><td data-label="الإجراء" className="flex flex-wrap items-center justify-between gap-2 px-2 pt-3 before:mr-auto before:shrink-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-3 sm:before:hidden"><div className="flex flex-wrap items-center gap-1.5">{period.status === 'DRAFT' && !slip.approvedAt && <button type="button" disabled={saving} onClick={() => { setApprovalTargetIds([slip.id]); setApprovalConfirmOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircleIcon className="h-3.5 w-3.5" />اعتماد</button>}<button onClick={() => setSelectedSlipId(selectedSlipId === slip.id ? '' : slip.id)} className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700">{selectedSlipId === slip.id ? 'إخفاء' : 'التفاصيل'}</button><button type="button" onClick={() => openPrintPage(slip.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><PrinterIcon className="h-3.5 w-3.5" />طباعة</button></div></td></tr>
          {selectedSlipId === slip.id && <tr key={`${slip.id}-details`} className="block sm:table-row"><td colSpan={8} className="block bg-slate-50 p-3 sm:table-cell sm:p-4"><div className="grid gap-4 lg:grid-cols-2"><div><h4 className="mb-2 text-sm font-bold text-slate-800">مكونات الراتب</h4><div className="space-y-1.5">{slip.items.map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs"><span>{item.name}{item.attendanceBased && <em className="mr-1 text-blue-600">(حسب الحضور)</em>} · {item.percentage}%</span><span>{money(item.payableAmount)}{item.attendanceBased && item.payableAmount < item.nominalAmount && <small className="mr-1 text-slate-400">بدلاً من {money(item.nominalAmount)}</small>}</span></div>)}{slip.profile?.kpiEnabled && <div className="flex justify-between rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800"><span>KPI · الافتراضي {money(slip.kpiDefaultAmount)}</span><b>قيمة الشهر {money(slip.kpiAmount)}</b></div>}</div>{period.status === 'DRAFT' && !slip.approvedAt && slip.profile?.kpiEnabled && <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3"><label className="block text-xs font-bold text-violet-900">قيمة KPI المراد صرفها هذا الشهر<input aria-label={`قيمة KPI المراد صرفها للموظف ${slip.user.name}`} type="number" min="0" step="0.01" value={kpiInputs[slip.id] ?? String(slip.kpiAmount)} onChange={(event) => setKpiInputs((current) => ({ ...current, [slip.id]: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-violet-200 bg-white px-3 text-sm text-slate-800" /></label><p className="mt-1.5 text-[11px] leading-5 text-violet-800">القيمة الافتراضية لهذا الموظف {money(slip.kpiDefaultAmount)}، ويمكن تغييرها لهذا الشهر. {slip.kpiSpecified ? 'تم تأكيد القيمة الشهرية.' : 'احفظ القيمة لتأكيدها؛ لن يمكن اعتماد المسير قبل التأكيد.'}</p><button type="button" onClick={() => void saveSlipKpi(slip)} className="mt-2 h-9 rounded-lg bg-violet-700 px-3 text-xs font-bold text-white hover:bg-violet-800">حفظ قيمة KPI الشهرية</button></div>}<div className="mt-2 text-[11px] text-slate-500">مستثنى من أيام العمل: {slip.attendanceDetails?.excluded?.holidays || 0} عطلة رسمية · {slip.attendanceDetails?.excluded?.approvedLeaves || 0} إجازة معتمدة · {slip.attendanceDetails?.excluded?.weeklyOffDays || 0} عطلة أسبوعية</div></div><div><h4 className="mb-2 text-sm font-bold text-slate-800">تعديلات وسجل الصرف</h4><div className="space-y-1.5">{slip.adjustments.map((item) => <div key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs"><b>{item.type === 'ADDITION' ? 'إضافة' : 'خصم'} {money(item.amount)}</b> · {item.reason} <small className="text-slate-400">— {item.createdBy.name}</small></div>)}{slip.payouts.map((item, i) => <div key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">تحويل {money(item.amount)} من {item.safe.name} إلى {item.transaction?.targetSafe?.name || 'الخزينة الوجهة'} بتاريخ {new Date(item.createdAt).toLocaleDateString('ar-EG')}</div>)}</div>{period.status === 'DRAFT' && !slip.approvedAt && <div className="mt-3 grid gap-2 sm:grid-cols-[130px_120px_1fr_auto]"><select value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as any)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="ADDITION">إضافة للراتب</option><option value="DEDUCTION">خصم</option></select><input aria-label="مبلغ التعديل" type="number" min="0.01" step="0.01" value={selectedSlipId === slip.id ? adjustmentAmount : ''} onChange={(event) => setAdjustmentAmount(event.target.value)} placeholder="المبلغ" className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs" /><input aria-label="سبب التعديل" value={selectedSlipId === slip.id ? adjustmentReason : ''} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder="سبب الإضافة أو الخصم" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs" /><button onClick={addAdjustment} className="h-9 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white">حفظ</button></div>}</div></div></td></tr>}
        </Fragment>)}</tbody></table></div>
      </>}
      {!period && !loading && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">اختر مسيراً سابقاً للمراجعة أو أعد مسير الشهر المحدد.</p>}
    </section>
    {approvalConfirmOpen && period && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setApprovalConfirmOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="payroll-approval-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircleIcon className="h-6 w-6" /></span><h2 id="payroll-approval-title" className="mt-3 text-lg font-black text-slate-900">{approvalTargetIds === null ? 'اعتماد جماعي للرواتب' : approvalTargetSlips.length === 1 ? 'اعتماد راتب الموظف' : 'اعتماد رواتب الموظفين'}</h2></div><button type="button" disabled={saving} onClick={() => setApprovalConfirmOpen(false)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><XMarkIcon className="h-5 w-5" /></button></div><p className="mt-2 text-sm leading-6 text-slate-600">تأكيد اعتماد {approvalTargetSlips.length} {approvalTargetSlips.length === 1 ? 'مفردة راتب' : 'مفردات راتب'} من مسير <b className="text-slate-900">{monthNames[period.month - 1]} {period.year}</b> وإتاحتها للمحاسب للصرف.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">موظفون سيعتمدون<b className="mt-1 block text-base text-slate-900">{approvalTargetSlips.length.toLocaleString('ar-EG')}</b></div><div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">إجمالي المستحق<b className="mt-1 block text-base">{money(approvalTargetSlips.reduce((sum: number, slip: Slip) => sum + slip.netAmount, 0))}</b></div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => setApprovalConfirmOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">مراجعة لاحقاً</button><button type="button" disabled={saving} onClick={confirmApproval} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? 'جارٍ الاعتماد...' : <><CheckCircleIcon className="h-4 w-4" />{approvalTargetIds === null ? 'اعتماد غير المعتمدين للصرف' : approvalTargetSlips.length === 1 ? 'تأكيد اعتماد الراتب' : 'تأكيد اعتماد الرواتب'}</>}</button></div></section></div>}
  </div>;
}

export default function PayrollPage() {
  return <ProtectedPage requiredPermission={{ resource: 'hr.payroll', action: 'view' }}><PayrollAdminPage /></ProtectedPage>;
}
