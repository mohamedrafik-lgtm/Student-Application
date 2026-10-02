'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { KeyIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface SecurityPinGateProps {
  userId: string;
  onVerified: () => void;
}

export default function SecurityPinGate({ userId, onVerified }: SecurityPinGateProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [pin, setPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirmation, setNewPinConfirmation] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isResetting]);

  const verify = async () => {
    if (pin.length !== 4) {
      setError('أدخل مفتاح الأمان المكون من 4 أرقام');
      return;
    }

    try {
      setChecking(true);
      await fetchAPI(`/users/${userId}/security-pin/verify`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      onVerified();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'مفتاح الأمان غير صحيح');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setChecking(false);
    }
  };

  const resetPin = async () => {
    if (!currentPassword) {
      setError('أدخل كلمة مرور الحساب');
      return;
    }
    if (newPin.length !== 4 || newPinConfirmation.length !== 4) {
      setError('يجب إدخال مفتاح جديد مكون من 4 أرقام وتأكيده');
      return;
    }
    if (newPin !== newPinConfirmation) {
      setError('المفتاح الجديد وتأكيده غير متطابقين');
      return;
    }

    try {
      setChecking(true);
      await fetchAPI(`/users/${userId}/security-pin`, {
        method: 'PATCH',
        body: JSON.stringify({
          pin: newPin,
          currentPassword,
        }),
      });
      sessionStorage.setItem(`securityPinVerified:${userId}`, 'true');
      onVerified();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر إعادة إنشاء مفتاح الأمان');
    } finally {
      setChecking(false);
    }
  };

  const openResetForm = () => {
    setError('');
    setPin('');
    setCurrentPassword('');
    setNewPin('');
    setNewPinConfirmation('');
    setIsResetting(true);
  };

  const returnToVerification = () => {
    setError('');
    setIsResetting(false);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[110] min-h-screen overflow-y-auto bg-slate-950 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(360px,0.85fr)_minmax(560px,1.15fr)]">
        <aside className="relative hidden overflow-hidden bg-[#102a43] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-[#102a43] shadow-lg shadow-cyan-950/30">
              <ShieldCheckIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-200">حماية الحساب</p>
              <p className="text-lg font-black">الخصوصية أولًا</p>
            </div>
          </div>

          <div className="relative z-10 my-12 max-w-md">
            <div className="flex h-24 items-center justify-center gap-4 rounded-[2rem] border border-white/15 bg-white/[0.08] px-6 shadow-2xl backdrop-blur-sm">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-4 w-4 rounded-full bg-cyan-200 shadow-lg shadow-cyan-300/30" />
              ))}
            </div>
            <h2 className="mt-8 text-3xl font-black leading-tight">أنت على بُعد 4 أرقام من متابعة عملك بأمان.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">هذه الشاشة تحمي حسابك إذا بقي مفتوحًا على جهاز مشترك أو عدت إليه بعد فترة من عدم النشاط.</p>
          </div>

          <p className="relative z-10 max-w-md text-xs leading-6 text-slate-400">لا تشارك مفتاح الأمان مع أي شخص. يمكنك تغييره لاحقًا من صفحة حسابي باستخدام كلمة مرور الحساب.</p>
        </aside>

        <main className="flex min-h-screen flex-col bg-white">
          <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-10 lg:px-14">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LockClosedIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600">الحساب محمي</p>
              <p className="mt-1 text-sm font-black text-slate-900">أدخل مفتاح الأمان للمتابعة</p>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-24">
            <div className="w-full max-w-md">
              <div className={`mb-8 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xl ${isResetting ? 'bg-slate-800 shadow-slate-200' : 'bg-blue-600 shadow-blue-200'}`}>
                {isResetting ? <LockClosedIcon className="h-8 w-8" /> : <KeyIcon className="h-8 w-8" />}
              </div>
              <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">{isResetting ? 'إعادة إنشاء مفتاح الأمان' : 'مرحبًا بعودتك'}</h1>
              <p className="mt-3 text-base leading-7 text-slate-500">
                {isResetting ? 'أثبت ملكية الحساب بكلمة المرور ثم أنشئ مفتاحًا جديدًا من 4 أرقام.' : 'أدخل مفتاح الأمان المكون من 4 أرقام لفتح حسابك ومتابعة العمل.'}
              </p>

              <div className="mt-8 flex items-start gap-3 border border-blue-100 bg-blue-50/70 p-4">
                <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <p className="text-sm leading-7 text-slate-600">
                  {isResetting ? 'لا تحتاج إلى معرفة المفتاح القديم. كلمة مرور الحساب هي وسيلة التحقق المطلوبة لإنشاء مفتاح جديد.' : 'يظهر هذا الطلب عند فتح النظام أو بعد 15 دقيقة من عدم النشاط لحماية بياناتك إذا تركت الجهاز مفتوحًا.'}
                </p>
              </div>

              {isResetting ? (
                <div className="mt-7 space-y-4">
                  <div>
                    <label htmlFor="security-account-password" className="mb-2 block text-sm font-bold text-slate-700">كلمة مرور الحساب</label>
                    <input
                      ref={inputRef}
                      id="security-account-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value);
                        setError('');
                      }}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      aria-label="كلمة مرور الحساب"
                    />
                  </div>
                  <div>
                    <label htmlFor="security-new-pin" className="mb-2 block text-sm font-bold text-slate-700">المفتاح الجديد</label>
                    <input
                      id="security-new-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={4}
                      value={newPin}
                      onChange={(event) => {
                        setNewPin(event.target.value.replace(/\D/g, '').slice(0, 4));
                        setError('');
                      }}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl font-black tracking-[0.8em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      aria-label="المفتاح الجديد"
                    />
                  </div>
                  <div>
                    <label htmlFor="security-new-pin-confirmation" className="mb-2 block text-sm font-bold text-slate-700">تأكيد المفتاح الجديد</label>
                    <input
                      id="security-new-pin-confirmation"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={4}
                      value={newPinConfirmation}
                      onChange={(event) => {
                        setNewPinConfirmation(event.target.value.replace(/\D/g, '').slice(0, 4));
                        setError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void resetPin();
                      }}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl font-black tracking-[0.8em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      aria-label="تأكيد المفتاح الجديد"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label htmlFor="security-pin-gate" className="mt-8 mb-2 block text-sm font-bold text-slate-700">مفتاح الأمان</label>
                  <input
                    ref={inputRef}
                    id="security-pin-gate"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={pin}
                    onChange={(event) => {
                      setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
                      setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void verify();
                    }}
                    className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-3xl font-black tracking-[0.8em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    aria-label="مفتاح الأمان"
                  />
                </>
              )}
              {error && <p className="mt-3 text-center text-sm font-semibold text-rose-600">{error}</p>}
              <button
                type="button"
                disabled={checking}
                onClick={() => void (isResetting ? resetPin() : verify())}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isResetting ? <ShieldCheckIcon className="h-5 w-5" /> : <KeyIcon className="h-5 w-5" />}
                {checking ? 'جارٍ التحقق...' : isResetting ? 'حفظ المفتاح وفتح الحساب' : 'فتح الحساب'}
              </button>
              <button
                type="button"
                disabled={checking}
                onClick={isResetting ? returnToVerification : openResetForm}
                className="mt-4 w-full text-center text-sm font-bold text-blue-600 transition hover:text-blue-800 disabled:opacity-50"
              >
                {isResetting ? 'العودة إلى إدخال المفتاح' : 'نسيت المفتاح؟ إعادة إنشائه'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
