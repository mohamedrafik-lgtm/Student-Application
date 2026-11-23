"use client";

import { useState, useEffect } from "react";
import { UserIcon, KeyIcon, EyeIcon, EyeSlashIcon, AcademicCapIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import PasswordResetModal from '@/components/auth/PasswordResetModal';
import { toast } from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';

interface SystemSettings {
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  licenseNumber: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // جلب إعدادات النظام
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log('🔄 جاري جلب إعدادات النظام...');
        // استخدام cache الإعدادات بدلاً من الطلب المباشر
        const { getSystemSettings } = await import('@/lib/settings-cache');
        const data = await getSystemSettings();
        console.log('✅ بيانات الإعدادات المستلمة:', data);
        setSettings(data);
        
        // تحديث عنوان الصفحة
        if (data.centerName) {
          document.title = `${data.centerName} - تسجيل الدخول`;
        }
      } catch (error) {
        console.error('❌ خطأ في جلب الإعدادات:', error);
      }
    };

    fetchSettings();
  }, []);
  
  // التحقق من وجود معلمة session_expired في URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionExpired = urlParams.get('session_expired');
      const accountArchived = urlParams.get('account_archived');
      
      if (sessionExpired === 'true') {
        console.log('صفحة تسجيل الدخول - تم اكتشاف انتهاء الجلسة');
        setError("انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول");
        
        // إزالة المعلمة من URL بعد عرض الرسالة
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
      
      if (accountArchived === 'true') {
        console.log('صفحة تسجيل الدخول - حساب مؤرشف');
        setError("تم إيقاف حسابك ولا يمكنك الوصول للمنصة الإدارية. تواصل مع الإدارة لمزيد من المعلومات.");
        
        // تنظيف localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailOrPhone = formData.get("emailOrPhone") as string;
    const password = formData.get("password") as string;

    console.log('صفحة تسجيل الدخول: بدء عملية تسجيل الدخول...');

    try {
      // التحقق من وجود ملفات تعريف الارتباط قبل تسجيل الدخول
      console.log('ملفات تعريف الارتباط الحالية:', document.cookie);
      
      const result = await login(emailOrPhone, password);
      console.log('صفحة تسجيل الدخول: نتيجة تسجيل الدخول:', result);

      if (!result.success) {
        console.error('صفحة تسجيل الدخول: فشل تسجيل الدخول:', result.error);
        setError(result.error || "بيانات تسجيل الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      console.log('صفحة تسجيل الدخول: تسجيل الدخول ناجح، جاري التوجيه...');
      
      // التحقق من وجود ملفات تعريف الارتباط بعد تسجيل الدخول
      console.log('ملفات تعريف الارتباط بعد تسجيل الدخول:', document.cookie);
      
      // التحقق من نوع الحساب
      const accountType = result.user?.accountType;
      console.log('نوع الحساب:', accountType);
      
      // التوجيه حسب نوع الحساب (موظف أو محاضر)
      const targetDashboard = accountType === 'INSTRUCTOR'
        ? '/instructor-dashboard'
        : '/dashboard';

      // زيادة التأخير قبل التوجيه
      setTimeout(() => {
        console.log('صفحة تسجيل الدخول: توجيه المستخدم إلى', targetDashboard);
        window.location.href = targetDashboard;
      }, 500);
    } catch (error) {
      console.error('صفحة تسجيل الدخول: خطأ غير متوقع أثناء تسجيل الدخول:', error);
      setError("حدث خطأ ما!");
      setLoading(false);
    }
  };

  const centerName = settings?.centerName || 'مركز تدريب مهني';

  return (
    <>
      <main dir="rtl" className="relative grid min-h-[100svh] w-full place-items-center overflow-hidden bg-[#f4f7ff] px-4 py-8 font-cairo selection:bg-blue-200 selection:text-blue-950 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(96,165,250,0.18),transparent_42%),radial-gradient(ellipse_at_15%_85%,rgba(167,139,250,0.16),transparent_38%),linear-gradient(135deg,#f8fbff_0%,#eef3ff_52%,#f7f5ff_100%)]" />
          <motion.div
            animate={prefersReducedMotion ? undefined : { x: [0, 18, 0], y: [0, -16, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-32 top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-300/35 blur-[110px]"
          />
          <motion.div
            animate={prefersReducedMotion ? undefined : { x: [0, -16, 0], y: [0, 18, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-40 -right-24 h-[34rem] w-[34rem] rounded-full bg-violet-300/30 blur-[120px]"
          />
          <motion.div
            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
            className="absolute left-1/2 top-1/2 h-[min(78vw,760px)] w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-900/[0.055]"
          />
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(30,64,175,.20)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,.20)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        </div>

        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[520px]"
        >
          <div className="overflow-hidden rounded-[1.65rem] border border-blue-100/90 bg-white/90 shadow-[0_20px_60px_-32px_rgba(59,91,168,0.32)] backdrop-blur-sm sm:rounded-[2rem] sm:border-blue-100/80 sm:bg-white sm:shadow-[0_28px_90px_-38px_rgba(59,91,168,0.32)]">
            <div className="relative isolate hidden h-[132px] overflow-hidden bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-500 px-9 py-5 text-white sm:block">
              <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(to_left,black,transparent_75%)]" />
              <motion.div
                aria-hidden="true"
                animate={prefersReducedMotion ? undefined : { rotate: [0, 10, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-8 -top-20 h-56 w-56 rounded-full border border-white/20"
              />
              <div aria-hidden="true" className="absolute -left-2 top-1 h-40 w-40 rounded-full border border-white/10" />
              <div className="relative flex h-full items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg shadow-blue-950/10 backdrop-blur-sm">
                    <AcademicCapIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-blue-100">منصة إدارة التدريب</p>
                    <p className="max-w-[245px] truncate text-sm font-bold leading-6 sm:text-base">{centerName}</p>
                  </div>
                </div>
                <span className="hidden shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-blue-50 backdrop-blur-sm sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
                  بوابة الدخول
                </span>
              </div>
            </div>
            <div className="px-5 pb-6 pt-6 sm:px-10 sm:pb-10 sm:pt-9">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="mb-5 flex items-center justify-center gap-2.5 sm:hidden"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
                  <AcademicCapIcon className="h-5 w-5" />
                </span>
                <span className="max-w-[250px] truncate text-sm font-bold text-slate-700">{centerName}</span>
              </motion.div>
              <motion.header
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.08 }}
                className="mb-5 text-center sm:mb-8"
              >
                <p className="mb-2 text-xs font-bold tracking-wide text-blue-700">أهلاً بعودتك</p>
                <h1 className="text-[1.75rem] font-extrabold tracking-tight text-slate-900 sm:text-3xl">تسجيل الدخول</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">أدخل بياناتك للوصول إلى حسابك.</p>
              </motion.header>

              {error && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700"
                >
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium leading-relaxed">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.14 }}
                  className="space-y-2"
                >
                  <label htmlFor="login-identity" className="block text-sm font-semibold text-slate-700">البريد الإلكتروني أو رقم الهاتف</label>
                  <div className="group relative">
                    <UserIcon className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="login-identity"
                      type="text"
                      name="emailOrPhone"
                      autoComplete="username"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-11 pl-3.5 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:py-3.5"
                      placeholder="أدخل البريد أو رقم الهاتف"
                      dir="rtl"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">كلمة المرور</label>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="shrink-0 rounded text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="group relative">
                    <KeyIcon className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-11 pl-12 text-base text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:py-3.5"
                      placeholder="أدخل كلمة المرور"
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.button
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.26 }}
                  whileHover={prefersReducedMotion || loading ? undefined : { y: -1 }}
                  whileTap={prefersReducedMotion || loading ? undefined : { scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 via-blue-600 to-indigo-600 px-4 py-3 text-base font-bold text-white shadow-[0_8px_28px_rgba(59,130,246,.24)] transition duration-300 hover:shadow-[0_10px_35px_rgba(59,130,246,.32)] disabled:cursor-wait disabled:opacity-70 sm:py-3.5"
                >
                  {loading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  ) : (
                    <><span>تسجيل الدخول</span><ArrowLeftIcon className="h-4 w-4" /></>
                  )}
                </motion.button>
              </form>
            </div>
          </div>
        </motion.section>
      </main>

      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </>
  );
}
