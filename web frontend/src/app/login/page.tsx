"use client";

import { useState, useEffect } from "react";
import { UserIcon, KeyIcon, EyeIcon, EyeSlashIcon, ChartBarIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import PasswordResetModal from '@/components/auth/PasswordResetModal';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface SystemSettings {
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  licenseNumber: string;
}

export default function LoginPage() {
  const { login } = useAuth();
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
      
      // إذا كان محاضر، اعرض رسالة خطأ
      if (accountType === 'INSTRUCTOR') {
        // حذف التوكن المخزن فوراً لأن هذا ليس المكان الصحيح للمحاضرين
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        
        setError('هذا الحساب خاص بالمحاضرين. يرجى استخدام صفحة تسجيل دخول المحاضرين.');
        setLoading(false);
        return;
      }
      
      // زيادة التأخير قبل التوجيه
      setTimeout(() => {
        console.log('صفحة تسجيل الدخول: توجيه الموظف إلى لوحة التحكم الإدارية...');
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('صفحة تسجيل الدخول: خطأ غير متوقع أثناء تسجيل الدخول:', error);
      setError("حدث خطأ ما!");
      setLoading(false);
    }
  };

  const centerName = settings?.centerName || 'مركز تدريب مهني';
  const licenseNumber = settings?.licenseNumber || '29';
  
  // تسجيل ما يُعرض على الشاشة
  console.log('🏢 اسم المركز المعروض:', centerName);
  console.log('📄 رقم الترخيص المعروض:', licenseNumber);
  console.log('⚙️ إعدادات محملة:', settings);

  return (
    <>
    <main className="min-h-screen w-full font-cairo flex bg-slate-50 selection:bg-blue-500 selection:text-white overflow-hidden">
      
      {/* ================= RIGHT SIDE: FORM (RTL) ================= */}
      <div className="w-full lg:w-[55%] flex flex-col relative z-10 bg-white shadow-2xl shadow-slate-200/50 lg:rounded-l-[3rem] overflow-hidden">

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 py-12 max-w-[650px] mx-auto w-full">
          
          <div className="mb-10 text-center lg:text-right">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-6 border border-blue-100 shadow-sm">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
              تسجيل الدخول
            </h1>
            <p className="text-slate-500 text-lg font-medium">
              مرحباً بك في نظام إدارة {centerName}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-600">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-bold leading-relaxed">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">البريد الإلكتروني أو رقم الهاتف</label>
                <div className="relative group">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <input 
                    type="text" 
                    name="emailOrPhone" 
                    required
                    className="w-full pr-14 pl-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                    placeholder="أدخل البريد الإلكتروني أو رقم الهاتف" 
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-slate-700">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <KeyIcon className="w-6 h-6" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    required
                    className="w-full pr-14 pl-12 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                    placeholder="أدخل كلمة المرور" 
                    dir="rtl"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center mt-8"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>

        </div>
      </div>

      {/* ================= LEFT SIDE: ABSTRACT VISUALS ================= */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-slate-950 overflow-hidden items-center justify-center">
        
        {/* Modern Mesh Gradient Background */}
        <div className="absolute inset-0 z-0 opacity-80">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-950" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, -30, 0] }} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/40 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], x: [0, -60, 0], y: [0, 60, 0] }} 
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-800/40 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[80px]" 
          />
        </div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] z-0 opacity-50" />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-lg px-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-lg shadow-black/20">
              <SparklesIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-50 tracking-wide">نظام الإدارة المتكامل</span>
            </div>

            {/* Typography */}
            <h2 className="text-5xl font-black text-white leading-[1.4] mb-6 tracking-tight">
              إدارة ذكية <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200">
                لأداء أفضل
              </span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed mb-12 font-medium">
              حل شامل ومتكامل لإدارة جميع جوانب المراكز التدريبية من المتدربين والبرامج إلى الشؤون المالية والتقارير.
            </p>

            {/* Glassmorphism Stats Cards */}
            <div className="grid grid-cols-2 gap-5">
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl shadow-black/20 group">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                  <ChartBarIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">تقارير</h3>
                <p className="text-sm text-slate-400 font-medium">إحصائيات شاملة ودقيقة</p>
              </motion.div>

              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl shadow-black/20 group">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-colors">
                  <ShieldCheckIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">تحكم</h3>
                <p className="text-sm text-slate-400 font-medium">إدارة كاملة للصلاحيات</p>
              </motion.div>
            </div>

          </motion.div>
        </div>
      </div>
    </main>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </>
  );
}