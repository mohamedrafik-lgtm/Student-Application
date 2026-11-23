'use client';

import { useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BugAntIcon, CheckCircleIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL, getAuthToken } from '@/lib/api';
import { getTraineeAuthToken } from '@/lib/trainee-api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type Platform = 'admin' | 'trainee';

export default function TechnicalIssueReporter({ platform, placement = 'floating' }: { platform: Platform; placement?: 'floating' | 'topbar' }) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setDetails('');
    setImage(null);
    setError('');
    setSent(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (details.trim().length < 5) {
      setError('اكتب تفاصيل المشكلة (5 أحرف على الأقل).');
      return;
    }
    const token = platform === 'admin' ? getAuthToken() : getTraineeAuthToken();
    if (!token) {
      setError('انتهت الجلسة. سجّل الدخول مرة أخرى ثم أرسل البلاغ.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      let imageUrl: string | undefined;
      if (image) {
        const form = new FormData();
        form.append('file', image);
        const uploadResponse = await fetch(`${API_BASE_URL}/technical-reports/${platform}/image`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
        });
        const uploadResult = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploadResult.message || 'تعذر رفع الصورة');
        imageUrl = uploadResult.url;
      }

      const pageUrl = typeof window === 'undefined' ? pathname : `${window.location.pathname}${window.location.search}`;
      const pageTitle = typeof document === 'undefined' ? undefined : document.title;
      const response = await fetch(`${API_BASE_URL}/technical-reports/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl, pageTitle, details: details.trim(), imageUrl }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'تعذر إرسال البلاغ');

      setSent(true);
      setDetails('');
      setImage(null);
      window.setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر إرسال البلاغ');
    } finally {
      setBusy(false);
    }
  };

  const chooseImage = (file?: File) => {
    setError('');
    if (!file) { setImage(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('المرفق يجب أن يكون صورة بصيغة JPG أو PNG أو WEBP أو GIF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.'); return; }
    setImage(file);
  };

  return <>
    <button type="button" aria-label={platform === 'trainee' ? 'الإبلاغ عن مشكلة تقنية' : 'الإبلاغ عن مشكلة تقنية'} title="الإبلاغ عن مشكلة تقنية" onClick={() => setOpen(true)} className={placement === 'topbar'
      ? `group inline-flex h-10 w-auto shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 sm:gap-2 sm:px-3.5 sm:text-xs ${platform === 'admin' ? 'border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:ring-blue-300' : 'border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 focus:ring-emerald-300'}`
      : `fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 sm:bottom-5 sm:left-5 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:shadow-xl ${platform === 'admin' ? 'bg-blue-700 shadow-blue-900/25 hover:bg-blue-800 focus:ring-blue-300/60' : 'bg-emerald-700 shadow-emerald-900/25 hover:bg-emerald-800 focus:ring-emerald-300/60'}`}>
      <BugAntIcon className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className={placement === 'topbar' ? 'inline' : ''}>{platform === 'trainee' ? 'الإبلاغ عن مشكلة تقنية' : placement === 'topbar' ? 'بلاغ تقني' : 'الإبلاغ عن مشكلة'}</span>
    </button>

    <Dialog open={open} onOpenChange={value => { if (!value) close(); else setOpen(true); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 sm:max-w-lg">
        {sent ? <div className="py-7 text-center">
          <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-600" />
          <DialogTitle className="mt-4 text-xl font-black text-slate-900">تم استلام البلاغ</DialogTitle>
          <p className="mt-2 text-sm text-slate-500">شكراً لمساعدتنا على تحسين المنصة.</p>
        </div> : <>
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black text-slate-900">الإبلاغ عن مشكلة تقنية</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1.5 leading-6">
                {platform === 'trainee' ? <>
                  <p>هذا النموذج مخصص للإبلاغ عن الأعطال التقنية في المنصة فقط. أرسل تفاصيل المشكلة من الصفحة المفتوحة، ويمكنك إرفاق صورة لتوضيحها.</p>
                  <p>للمشكلات أو الطلبات غير التقنية، استخدم <Link href="/trainee-dashboard/complaints" onClick={close} className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">قسم الشكاوى والاقتراحات</Link>.</p>
                </> : <p>أرسل تفاصيل المشكلة من الصفحة المفتوحة، ويمكنك إرفاق صورة لتوضيحها.</p>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" dir="ltr">{pathname}</div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor={`technical-details-${platform}`} className="mb-1.5 block text-sm font-bold text-slate-700">تفاصيل المشكلة</label>
              <textarea id={`technical-details-${platform}`} value={details} onChange={event => setDetails(event.target.value)} rows={5} maxLength={10000} required placeholder="اشرح ما حدث والخطوات التي أدت إلى المشكلة..." className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <div className="mt-1 text-left text-[11px] text-slate-400">{details.length}/10000</div>
            </div>
            <div>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => chooseImage(event.target.files?.[0])} />
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50">
                <PaperClipIcon className="h-4 w-4" /> {image ? image.name : 'إرفاق صورة (اختياري)'}
              </button>
              {image && <button type="button" onClick={() => { setImage(null); if (inputRef.current) inputRef.current.value = ''; }} className="mr-2 inline-flex items-center gap-1 text-xs text-rose-600"><XMarkIcon className="h-4 w-4" /> إزالة</button>}
              <p className="mt-1 text-[11px] text-slate-400">صور فقط، بحد أقصى 5 ميجابايت.</p>
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <DialogFooter className="gap-2 sm:flex-row-reverse">
              <button type="submit" disabled={busy} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${platform === 'admin' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}>{busy ? 'جارٍ الإرسال...' : 'إرسال البلاغ'}</button>
              <button type="button" onClick={close} disabled={busy} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">إلغاء</button>
            </DialogFooter>
          </form>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
