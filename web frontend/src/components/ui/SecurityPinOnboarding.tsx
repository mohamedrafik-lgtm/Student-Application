'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface SecurityPinOnboardingProps {
  onComplete: () => void;
}

const steps = ['فكرة المفتاح', 'إنشاء المفتاح', 'تم التأمين'];

export default function SecurityPinOnboarding({ onComplete }: SecurityPinOnboardingProps) {
  const { user, updateUserSecurityPin } = useAuth();
  const [step, setStep] = useState(0);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setDigits = (value: string, setter: (value: string) => void) => {
    setter(value.replace(/\D/g, '').slice(0, 4));
    setError('');
  };

  const savePin = async () => {
    if (pin.length !== 4 || confirmation.length !== 4) {
      setError('يجب إدخال مفتاح مكون من 4 أرقام وتأكيده');
      return;
    }
    if (pin !== confirmation) {
      setError('مفتاح الأمان وتأكيده غير متطابقين');
      return;
    }
    if (!user?.id) return;

    try {
      setSaving(true);
      await fetchAPI(`/users/${user.id}/security-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      sessionStorage.setItem(`securityPinVerified:${user.id}`, 'true');
      updateUserSecurityPin(true);
      setStep(2);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ مفتاح الأمان');
    } finally {
      setSaving(false);
    }
  };

  const finishStep = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    onComplete();
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[100] h-[100dvh] min-h-0 overflow-y-auto overscroll-contain bg-slate-950 text-slate-900">
      <div className="grid min-h-full lg:grid-cols-[minmax(360px,0.85fr)_minmax(560px,1.15fr)]">
        <aside className="relative hidden overflow-hidden bg-[#102a43] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-[#102a43] shadow-lg shadow-cyan-950/30">
                <ShieldCheckIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-200">إعداد أمان الحساب</p>
                <p className="text-lg font-black tracking-normal">حسابك تحت حمايتك</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 my-12">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <LockClosedIcon className="h-6 w-6 text-cyan-200" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">حالة الحماية</p>
                    <p className="mt-1 text-sm font-bold">مفتاح أمان إضافي</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">مقترح</span>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-14 rounded-xl border border-white/15 bg-slate-950/20" />
                ))}
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-cyan-300/10 p-3 text-xs leading-6 text-cyan-100">
                <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <span>لن يستطيع أي شخص استخدام حسابك إذا تركت النظام مفتوحًا على جهاز مشترك.</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <p className="text-sm leading-7 text-slate-300">
              المفتاح طبقة حماية سريعة لحسابك. يبقى منفصلًا عن كلمة المرور، ويُطلب مرة أخرى عند فتح النظام أو بعد فترة من عدم النشاط.
            </p>
          </div>
        </aside>

        <main className="flex min-h-full min-w-0 flex-col bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-10 lg:px-14">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-900">حماية حسابك</span>
            </div>
            <div className="hidden text-sm font-bold text-slate-500 lg:block">خطوة بسيطة لحماية حسابك</div>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              تخطي الآن
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-6 sm:px-10 sm:py-12 lg:px-14 xl:px-24">
            <div className="mx-auto flex w-full max-w-2xl items-center gap-2 sm:gap-4" aria-label="مراحل إعداد مفتاح الأمان">
              {steps.map((label, index) => (
                <div key={label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${index <= step ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                    {index < step ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                  </div>
                  <span className={`hidden truncate text-xs font-bold sm:block ${index <= step ? 'text-blue-700' : 'text-slate-400'}`}>{label}</span>
                  {index < steps.length - 1 && <div className={`h-px flex-1 ${index < step ? 'bg-blue-300' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            <div className="flex flex-1 items-start justify-center py-6 sm:items-center sm:py-10">
              {step === 0 && (
                <div className="w-full max-w-2xl">
                  <div className="max-w-xl">
                    <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <LockClosedIcon className="h-9 w-9" />
                    </div>
                    <p className="text-sm font-bold text-blue-600">أولًا: حماية حسابك</p>
                    <h1 className="mt-3 text-3xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">لا تترك حسابك مكشوفًا</h1>
                    <p className="mt-5 max-w-xl text-base leading-8 text-slate-500 sm:text-lg">
                      إذا نسيت تسجيل الخروج من جهاز يستخدمه شخص آخر، يحافظ مفتاح الأمان على خصوصية حسابك ويمنع الوصول إلى النظام دون إذنك.
                    </p>
                  </div>

                  <div className="mt-7 grid gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-3">
                    <div className="flex items-start gap-3 border-t-2 border-blue-600 pt-3 sm:block sm:pt-4">
                      <KeyIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 sm:mt-3">4 أرقام فقط</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:leading-6">سريع وسهل التذكر</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 border-t-2 border-emerald-500 pt-3 sm:block sm:pt-4">
                      <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 sm:mt-3">خصوصية أفضل</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:leading-6">يحمي بياناتك عند ترك الجهاز مفتوحًا</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 border-t-2 border-amber-500 pt-3 sm:block sm:pt-4">
                      <LockClosedIcon className="h-6 w-6 text-amber-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 sm:mt-3">حماية تلقائية</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:leading-6">يُطلب عند الفتح وبعد 15 دقيقة</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="w-full max-w-md">
                  <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                    <KeyIcon className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">أنشئ مفتاح الأمان</h1>
                  <p className="mt-3 text-base leading-7 text-slate-500">اختر 4 أرقام تتذكرها بسهولة ولا تشاركها مع أي شخص.</p>

                  <div className="mt-8 space-y-5">
                    <div>
                      <label htmlFor="security-pin" className="mb-2 block text-sm font-bold text-slate-700">مفتاح الأمان</label>
                      <input
                        id="security-pin"
                        autoFocus
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        value={pin}
                        onChange={(event) => setDigits(event.target.value, setPin)}
                        className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-3xl font-black tracking-[0.8em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        aria-label="مفتاح الأمان"
                      />
                    </div>
                    <div>
                      <label htmlFor="security-pin-confirmation" className="mb-2 block text-sm font-bold text-slate-700">تأكيد المفتاح</label>
                      <input
                        id="security-pin-confirmation"
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        value={confirmation}
                        onChange={(event) => setDigits(event.target.value, setConfirmation)}
                        className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-3xl font-black tracking-[0.8em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        aria-label="تأكيد مفتاح الأمان"
                      />
                    </div>
                  </div>
                  {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
                  <div className="mt-5 flex items-start gap-2 text-xs leading-6 text-slate-500">
                    <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>يُحفظ المفتاح بشكل مشفّر، ولا يمكن عرضه داخل النظام بعد إنشائه.</span>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="w-full max-w-xl text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircleIcon className="h-16 w-16" />
                  </div>
                  <h1 className="mt-8 text-3xl font-black text-slate-950 sm:text-4xl">تم تأمين حسابك بنجاح</h1>
                  <p className="mx-auto mt-4 max-w-lg text-base leading-8 text-slate-500">
                    أصبح حسابك محميًا بمفتاح إضافي. سيُطلب منك إدخاله عند فتح النظام من جديد أو بعد 15 دقيقة من عدم النشاط.
                  </p>
                  <div className="mx-auto mt-8 max-w-md border border-emerald-100 bg-emerald-50/70 p-4 text-right">
                    <p className="text-sm font-bold text-emerald-900">تذكير مهم</p>
                    <p className="mt-1 text-xs leading-6 text-emerald-800">لا تشارك المفتاح، ويمكنك تغييره لاحقًا من صفحة حسابي باستخدام كلمة مرور الحساب.</p>
                  </div>
                </div>
              )}
            </div>

            <footer className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-between border-t border-slate-100 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-0">
              <button
                type="button"
                disabled={step === 0 || saving}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-0"
              >
                <ArrowRightIcon className="h-4 w-4" />
                السابق
              </button>

              {step === 0 && (
                <button type="button" onClick={finishStep} className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                  إنشاء مفتاح الأمان
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
              )}
              {step === 1 && (
                <button type="button" disabled={saving} onClick={savePin} className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'جارٍ الحفظ...' : 'حفظ وتأمين الحساب'}
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
              )}
              {step === 2 && (
                <button type="button" onClick={onComplete} className="inline-flex items-center gap-3 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700">
                  دخول النظام
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
              )}
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
