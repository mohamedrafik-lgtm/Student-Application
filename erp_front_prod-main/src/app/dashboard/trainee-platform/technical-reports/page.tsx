'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, BugAntIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { Pagination, type PaginationInfo } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TechnicalReport {
  id: string;
  platform: 'ADMIN' | 'TRAINEE';
  pageTitle: string | null;
  pageUrl: string;
  details: string;
  imageUrl: string | null;
  status: 'OPEN' | 'RESOLVED';
  resolutionReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  trainee: { id: number; nameAr: string; nationalId: string; phone: string } | null;
  adminUser: { id: string; name: string } | null;
  resolvedBy: { name: string } | null;
}

const LIMIT = 20;

export default function TechnicalReportsPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: LIMIT, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [platform, setPlatform] = useState('ALL');
  const [selected, setSelected] = useState<TechnicalReport | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ page: String(page), limit: String(LIMIT), search, status, platform });
    try {
      const result = await fetchAPI(`/technical-reports?${query}`);
      setReports(result.data || []);
      setPagination({
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || LIMIT,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
        hasNext: (result.pagination?.page || page) < (result.pagination?.totalPages || 0),
        hasPrev: (result.pagination?.page || page) > 1,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل البلاغات');
    } finally {
      setLoading(false);
    }
  }, [page, platform, search, status]);

  useEffect(() => { if (hasPermission('dashboard.technical-reports', 'view')) void loadReports(); }, [hasPermission, loadReports]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const saveResolution = async (resolved: boolean) => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const updated = await fetchAPI(`/technical-reports/${selected.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved, reason: resolved ? resolutionReason.trim() : undefined }),
      });
      setSelected(updated);
      await loadReports();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ حالة البلاغ');
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) return <div className="p-8 text-center text-slate-500">جارٍ التحقق من الصلاحيات...</div>;
  if (!hasPermission('dashboard.technical-reports', 'view')) return <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center font-bold text-rose-800">ليست لديك صلاحية عرض البلاغات التقنية.</div>;

  const canManage = hasPermission('dashboard.technical-reports', 'manage');

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <PageHeader title={<span className="inline-flex items-center gap-2">بلاغات تقنية <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold tabular-nums text-blue-700">{pagination.total.toLocaleString('ar-EG')}</span></span>} description="استقبل بلاغات أعطال المنصتين، وابحث فيها وتابع معالجة كل بلاغ." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'منصة المتدربين' }, { label: 'بلاغات تقنية' }]} />

    <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-[#2049bd] via-[#183b9d] to-[#10265f] p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-blue-100"><BugAntIcon className="h-4 w-4" /> مركز الدعم الفني</div><h1 className="text-2xl font-black">بلاغات المنصة</h1><p className="mt-2 text-sm text-blue-100">ابحث في البلاغات، صفِّها حسب المنصة أو حالة المعالجة، وسجل سبب الحل عند إغلاقها.</p></div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
        <label className="relative block"><span className="sr-only">البحث في البلاغات</span><MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="ابحث بالتفاصيل أو اسم المبلّغ أو الرقم القومي أو الصفحة" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
        <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <FunnelIcon className="h-4 w-4 shrink-0 text-blue-500" /><span className="shrink-0 text-xs font-bold text-slate-500">الحالة</span>
          <Select value={status} onValueChange={value => changeFilter(setStatus, value)}><SelectTrigger aria-label="فلترة حسب الحالة" className="h-8 min-w-0 flex-1 justify-end gap-1 rounded-lg border-0 bg-transparent px-1 py-0 text-sm font-semibold text-slate-800 shadow-none focus:border-0 focus:ring-0"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="ALL" className="focus:bg-blue-50 focus:text-blue-800">كل الحالات</SelectItem><SelectItem value="OPEN" className="focus:bg-blue-50 focus:text-blue-800">مفتوح</SelectItem><SelectItem value="RESOLVED" className="focus:bg-blue-50 focus:text-blue-800">تم الحل</SelectItem></SelectContent></Select>
        </div>
        <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <FunnelIcon className="h-4 w-4 shrink-0 text-blue-500" /><span className="shrink-0 text-xs font-bold text-slate-500">المنصة</span>
          <Select value={platform} onValueChange={value => changeFilter(setPlatform, value)}><SelectTrigger aria-label="فلترة حسب المنصة" className="h-8 min-w-0 flex-1 justify-end gap-1 rounded-lg border-0 bg-transparent px-1 py-0 text-sm font-semibold text-slate-800 shadow-none focus:border-0 focus:ring-0"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="ALL" className="focus:bg-blue-50 focus:text-blue-800">كل المنصات</SelectItem><SelectItem value="ADMIN" className="focus:bg-blue-50 focus:text-blue-800">الإدارية</SelectItem><SelectItem value="TRAINEE" className="focus:bg-blue-50 focus:text-blue-800">المتدربين</SelectItem></SelectContent></Select>
        </div>
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><MagnifyingGlassIcon className="h-4 w-4" /> بحث</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {[['ALL', 'الكل'], ['OPEN', 'مفتوح'], ['RESOLVED', 'تم الحل']].map(([key, label]) => <button key={key} type="button" onClick={() => changeFilter(setStatus, key)} className={`rounded-full border px-3 py-1.5 font-bold transition ${status === key ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{label}</button>)}
        {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 font-bold text-rose-600 hover:bg-rose-50"><XMarkIcon className="h-3.5 w-3.5" /> مسح البحث</button>}
      </div>
    </section>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-black text-slate-900">سجل البلاغات</h2><p className="mt-1 text-xs text-slate-500">{pagination.total.toLocaleString('ar-EG')} بلاغ</p></div>{loading && <span className="text-xs font-semibold text-blue-600">جارٍ التحديث...</span>}</div>
      {reports.length ? <>
        <div className="grid gap-3 p-3 lg:hidden">
          {reports.map(report => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{report.trainee?.nameAr || report.adminUser?.name || 'حساب غير متاح'}</h3>{report.trainee?.nationalId && <p className="mt-1 text-xs text-slate-500">{report.trainee.nationalId}</p>}</div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${report.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{report.status === 'RESOLVED' ? 'تم الحل' : 'مفتوح'}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${report.platform === 'TRAINEE' ? 'bg-cyan-50 text-cyan-800' : 'bg-blue-50 text-blue-700'}`}>{report.platform === 'TRAINEE' ? 'منصة المتدربين' : 'المنصة الإدارية'}</span>
              <span className="text-[11px] text-slate-500">{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.createdAt))}</span>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-blue-800">{report.pageTitle || 'صفحة داخل المنصة'}</p>
              <p dir="ltr" className="mt-1 truncate text-right text-[10px] text-slate-400">{report.pageUrl}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{report.details}</p>
            {report.imageUrl && <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><PhotoIcon className="h-4 w-4" /> مرفق صورة</span>}
            <button type="button" onClick={() => { setSelected(report); setResolutionReason(report.resolutionReason || ''); }} className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-100">عرض التفاصيل ومعالجة البلاغ</button>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[880px] text-right">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500"><tr><th className="px-5 py-3">المبلّغ</th><th className="px-5 py-3">المنصة</th><th className="px-5 py-3">الصفحة</th><th className="px-5 py-3">التفاصيل</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">تاريخ البلاغ</th><th className="px-5 py-3">الإجراء</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{reports.map(report => <tr key={report.id} className="text-sm hover:bg-slate-50/70">
            <td className="px-5 py-4"><div className="font-bold text-slate-800">{report.trainee?.nameAr || report.adminUser?.name || 'حساب غير متاح'}</div>{report.trainee?.nationalId && <div className="mt-1 text-xs text-slate-400">{report.trainee.nationalId}</div>}</td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${report.platform === 'TRAINEE' ? 'bg-cyan-50 text-cyan-800' : 'bg-blue-50 text-blue-700'}`}>{report.platform === 'TRAINEE' ? 'منصة المتدربين' : 'المنصة الإدارية'}</span></td>
            <td className="max-w-[200px] px-5 py-4"><a href={report.pageUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-blue-700 hover:underline">{report.pageTitle || 'صفحة داخل المنصة'}</a><span className="mt-1 block truncate text-[10px] text-slate-400" dir="ltr">{report.pageUrl}</span></td>
            <td className="max-w-[260px] px-5 py-4"><p className="truncate text-slate-600">{report.details}</p>{report.imageUrl && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><PhotoIcon className="h-3.5 w-3.5" /> مرفق صورة</span>}</td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${report.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{report.status === 'RESOLVED' ? 'تم الحل' : 'مفتوح'}</span></td>
            <td className="px-5 py-4 text-xs text-slate-500">{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.createdAt))}</td>
            <td className="px-5 py-4"><button type="button" onClick={() => { setSelected(report); setResolutionReason(report.resolutionReason || ''); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">التفاصيل</button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="p-4"><Pagination pagination={pagination} onPageChange={setPage} onLimitChange={() => undefined} showLimitSelector={false} isLoading={loading} /></div>
      </> : <div className="px-5 py-14 text-center"><BugAntIcon className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">{loading ? 'جارٍ تحميل البلاغات...' : 'لا توجد بلاغات مطابقة'}</p><p className="mt-1 text-sm text-slate-400">جرّب تغيير البحث أو الفلاتر.</p></div>}
    </section>

    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
      {selected && <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader className="text-right"><DialogTitle className="text-xl font-black text-slate-900">تفاصيل البلاغ التقني</DialogTitle><DialogDescription>رقم البلاغ: {selected.id}</DialogDescription></DialogHeader>
        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><span className="text-xs text-slate-500">المبلّغ</span><p className="mt-1 font-bold text-slate-800">{selected.trainee?.nameAr || selected.adminUser?.name || 'حساب غير متاح'}</p></div><div><span className="text-xs text-slate-500">المنصة</span><p className="mt-1 font-bold text-slate-800">{selected.platform === 'TRAINEE' ? 'منصة المتدربين' : 'المنصة الإدارية'}</p></div><div className="sm:col-span-2"><span className="text-xs text-slate-500">الصفحة التي حدثت بها المشكلة</span><p className="mt-1 font-bold text-slate-800">{selected.pageTitle || 'صفحة داخل المنصة'}</p><p dir="ltr" className="mt-1 break-all text-left text-xs font-medium text-blue-700">{selected.pageUrl}</p></div><div className="sm:col-span-2"><span className="text-xs text-slate-500">تفاصيل المشكلة</span><p className="mt-1 whitespace-pre-wrap leading-7 text-slate-800">{selected.details}</p></div></div>
        {selected.imageUrl && <a href={getImageUrl(selected.imageUrl)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-200"><img src={getImageUrl(selected.imageUrl)} alt="الصورة المرفقة بالبلاغ" className="max-h-80 w-full bg-slate-50 object-contain" /></a>}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><h3 className="font-black text-slate-800">حالة المعالجة</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{selected.status === 'RESOLVED' ? 'تم الحل' : 'مفتوح'}</span></div>
          {selected.status === 'RESOLVED' && selected.resolutionReason && <div className="mt-3 rounded-lg bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-800">سبب الحل</p><p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{selected.resolutionReason}</p>{selected.resolvedBy?.name && <p className="mt-2 text-[11px] text-emerald-700">سُجل بواسطة {selected.resolvedBy.name}</p>}</div>}
          {canManage && <>
            {selected.status === 'OPEN' && <div className="mt-3"><label htmlFor="resolution-reason" className="mb-1.5 block text-sm font-bold text-slate-700">سبب الحل</label><textarea id="resolution-reason" value={resolutionReason} onChange={event => setResolutionReason(event.target.value)} rows={3} maxLength={10000} placeholder="اكتب ما تم لمعالجة المشكلة..." className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>}
            <DialogFooter className="mt-4 gap-2 sm:flex-row-reverse">
              {selected.status === 'OPEN' ? <button type="button" onClick={() => void saveResolution(true)} disabled={saving || resolutionReason.trim().length < 3} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'تم حل المشكلة'}</button> : <button type="button" onClick={() => void saveResolution(false)} disabled={saving} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100">إعادة فتح البلاغ</button>}
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">إغلاق</button>
            </DialogFooter>
          </>}
        </div>
      </DialogContent>}
    </Dialog>
  </div>;
}
