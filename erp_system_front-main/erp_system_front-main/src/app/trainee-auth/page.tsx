'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { traineeAPI } from '@/lib/trainee-api';
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  PhoneIcon,
  ChartBarIcon,
  IdentificationIcon,
  CalendarIcon,
  LockClosedIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import TraineePasswordResetModal from '@/components/auth/TraineePasswordResetModal';
import DatePicker from '@/app/trainee-register/components/DatePicker';

type Step = 'identify' | 'login' | 'register-verify' | 'register-phone' | 'register-password';

export default function TraineeAuthPage() {
  const [step, setStep] = useState<Step>('identify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileApp, setMobileApp] = useState<{ enabled: boolean; googlePlayUrl: string; appStoreUrl: string; status: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // جلب إعدادات التطبيق
  useEffect(() => {
    const fetchMobileAppSettings = async () => {
      try {
        const res = await fetch('/api/developer-settings');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const settingsMap = new Map<string, string>();
            data.forEach((s: any) => settingsMap.set(s.key, s.value || ''));
            const enabled = settingsMap.get('MOBILE_APP_ENABLED') === 'true';
            if (enabled) {
              setMobileApp({
                enabled: true,
                googlePlayUrl: settingsMap.get('MOBILE_APP_GOOGLE_PLAY_URL') || '',
                appStoreUrl: settingsMap.get('MOBILE_APP_APPSTORE_URL') || '',
                status: settingsMap.get('MOBILE_APP_STATUS') || 'pre_registration',
              });
            }
          }
        }
      } catch (err) {
        // Silently fail - mobile app section is optional 
      }
    };
    fetchMobileAppSettings();
  }, []);

  const [formData, setFormData] = useState({
    nationalId: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    phone: '',
  });

  const [traineeData, setTraineeData] = useState<{
    name: string;
    nationalId: string;
    hasAccount: boolean;
    phoneHint?: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (e.target.name === 'nationalId') value = value.replace(/\D/g, '').slice(0, 14);
    if (e.target.name === 'phone') value = value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
    setError('');
  };

  const handleDateChange = useCallback((date: string) => {
    setFormData(prev => ({ ...prev, birthDate: date }));
    setError('');
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.nationalId.length !== 14) { setError('الرقم القومي يجب أن يكون 14 رقماً'); return; }
    setLoading(true); setError('');
    try {
      const data = await traineeAPI.checkNationalId(formData.nationalId);
      setTraineeData(data);
      if (data.hasAccount) {
        setStep('login');
        setSuccess('مرحباً بك مجدداً! يرجى إدخال كلمة المرور.');
      } else {
        setStep('register-verify');
        setSuccess('رقمك مسجل لدينا. لنقم بإنشاء حسابك الآن.');
      }
    } catch {
      setError('عفواً، هذا الرقم غير مسجل في قاعدة بيانات المركز.');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await traineeAPI.login(formData.nationalId, formData.password);
      localStorage.setItem('trainee_token', data.access_token);
      localStorage.setItem('trainee_data', JSON.stringify(data.trainee));
      // حفظ التوكن كـ cookie ليقرأه الـ middleware
      document.cookie = `trainee_token=${data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      setSuccess('تم تسجيل الدخول بنجاح! جاري التحويل...');
      setTimeout(() => { window.location.href = '/trainee-dashboard'; }, 800);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'كلمة المرور غير صحيحة');
    } finally { setLoading(false); }
  };

  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.birthDate) { setError('يرجى اختيار تاريخ الميلاد'); return; }
    setLoading(true); setError('');
    try {
      const birthDateISO = new Date(formData.birthDate + 'T00:00:00.000Z').toISOString();
      const data = await traineeAPI.verifyTrainee(formData.nationalId, birthDateISO);
      setTraineeData(data);
      setStep('register-phone');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تاريخ الميلاد لا يتطابق مع السجلات');
    } finally { setLoading(false); }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length !== 11) { setError('رقم الهاتف يجب أن يكون 11 رقماً'); return; }
    setLoading(true); setError('');
    try {
      await traineeAPI.verifyPhone(formData.nationalId, formData.phone);
      setStep('register-password');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'رقم الهاتف غير متطابق');
    } finally { setLoading(false); }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (formData.password !== formData.confirmPassword) { setError('كلمات المرور غير متطابقة'); return; }
    setLoading(true); setError('');
    try {
      const birthDateISO = new Date(formData.birthDate + 'T00:00:00.000Z').toISOString();
      await traineeAPI.createPassword(formData.nationalId, formData.password, formData.confirmPassword, birthDateISO);
      setSuccess('تم إنشاء الحساب بنجاح! جاري الدخول...');
      try {
        const loginData = await traineeAPI.login(formData.nationalId, formData.password);
        localStorage.setItem('trainee_token', loginData.access_token);
        localStorage.setItem('trainee_data', JSON.stringify(loginData.trainee));
        // حفظ التوكن كـ cookie ليقرأه الـ middleware
        document.cookie = `trainee_token=${loginData.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        setTimeout(() => { window.location.href = '/trainee-dashboard'; }, 1000);
      } catch {
        setTimeout(() => { window.location.href = '/trainee-auth'; }, 1500);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'حدث خطأ في إنشاء الحساب');
    } finally { setLoading(false); }
  };

  const goBack = () => {
    setError(''); setSuccess('');
    switch (step) {
      case 'login': setStep('identify'); setFormData(p => ({ ...p, password: '' })); break;
      case 'register-verify': setStep('identify'); setFormData(p => ({ ...p, birthDate: '' })); break;
      case 'register-phone': setStep('register-verify'); setFormData(p => ({ ...p, phone: '' })); break;
      case 'register-password': setStep('register-phone'); setFormData(p => ({ ...p, password: '', confirmPassword: '' })); break;
    }
  };

  if (!mounted) return null;

  const formVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  // Progress Steps Logic (only for registration flow)
  const registrationSteps = [
    { id: 'register-verify', label: 'التحقق', icon: CalendarIcon },
    { id: 'register-phone', label: 'الهاتف', icon: PhoneIcon },
    { id: 'register-password', label: 'كلمة المرور', icon: LockClosedIcon },
  ];

  const currentStepIndex = registrationSteps.findIndex(s => s.id === step);
  const isRegistrationFlow = step !== 'login' && step !== 'identify';

  return (
    <main className="min-h-screen w-full font-cairo flex bg-slate-50 selection:bg-emerald-500 selection:text-white overflow-hidden">
      
      {/* ================= RIGHT SIDE: FORM (RTL) ================= */}
      <div className="w-full lg:w-[55%] flex flex-col relative z-10 bg-white shadow-2xl shadow-slate-200/50 lg:rounded-l-[3rem] overflow-hidden">
        
        {/* Header Navigation */}
        <div className="absolute top-0 left-0 w-full p-6 sm:p-8 flex justify-between items-center z-20">
          <Link href="/auth-select" className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100">
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 py-12 max-w-[650px] mx-auto w-full">
          
          {/* Branding */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-emerald-100/50 shadow-inner shadow-white">
              <AcademicCapIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              بوابة المتدربين
            </h1>
            <p className="text-slate-500 text-base font-medium">
              {step === 'login' ? 'أهلاً بك مجدداً، أدخل بياناتك للمتابعة' : 'أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك'}
            </p>
          </motion.div>

          {/* Progress Indicator (Only for Registration Flow) */}
          <AnimatePresence>
            {isRegistrationFlow && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-10"
              >
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
                  <div 
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500 ease-out"
                    style={{ width: `${(Math.max(0, currentStepIndex) / (registrationSteps.length - 1)) * 100}%` }}
                  />
                  
                  {registrationSteps.map((s, idx) => {
                    const isActive = idx === Math.max(0, currentStepIndex);
                    const isCompleted = idx < Math.max(0, currentStepIndex);
                    const Icon = s.icon;
                    
                    return (
                      <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                          isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-110' :
                          isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {isCompleted ? <CheckIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        <span className={`text-xs font-bold absolute -bottom-6 whitespace-nowrap transition-colors ${
                          isActive ? 'text-emerald-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                <div className="p-4 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-start gap-3 shadow-sm">
                  <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-rose-800">{error}</p>
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-2xl flex items-start gap-3 shadow-sm">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-emerald-800">{success}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Form Steps */}
          <div className="relative mt-4">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: IDENTIFY */}
              {step === 'identify' && (
                <motion.form key="identify" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleIdentify} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">الرقم القومي</label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                        <IdentificationIcon className="w-6 h-6" />
                      </div>
                      <input type="text" name="nationalId" value={formData.nationalId} onChange={handleInputChange}
                        className="w-full pr-14 pl-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                        placeholder="أدخل الرقم القومي" dir="ltr" inputMode="numeric" autoFocus required maxLength={14} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || formData.nationalId.length !== 14}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 disabled:opacity-50 disabled:hover:bg-emerald-600 flex items-center justify-center gap-3 group">
                    {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span>متابعة</span>
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}

              {/* STEP 2A: LOGIN */}
              {step === 'login' && (
                <motion.form key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleLogin} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                        <UserIcon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-0.5">الحساب الحالي</p>
                        <p className="text-base font-black text-slate-900 tracking-wider" dir="ltr">{formData.nationalId}</p>
                      </div>
                    </div>
                    <button type="button" onClick={goBack} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors">تغيير</button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-slate-700">كلمة المرور</label>
                      <button type="button" onClick={() => setShowResetModal(true)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">نسيت الكلمة؟</button>
                    </div>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                        <KeyIcon className="w-6 h-6" />
                      </div>
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                        className="w-full pr-14 pl-12 py-4 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                        placeholder="••••••••" autoFocus required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1">
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || !formData.password}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>تسجيل الدخول</span>}
                  </button>
                </motion.form>
              )}

              {/* STEP 2B: VERIFY IDENTITY */}
              {step === 'register-verify' && (
                <motion.form key="register-verify" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleVerifyIdentity} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">تاريخ الميلاد (للتحقق)</label>
                    <div className="relative">
                      <DatePicker value={formData.birthDate} onChange={handleDateChange} required />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={goBack} className="px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">رجوع</button>
                    <button type="submit" disabled={loading || !formData.birthDate}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 disabled:opacity-50 flex items-center justify-center">
                      {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>التحقق من الهوية</span>}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 3: PHONE VERIFY */}
              {step === 'register-phone' && (
                <motion.form key="register-phone" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleVerifyPhone} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">رقم الهاتف المسجل</label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                        <PhoneIcon className="w-6 h-6" />
                      </div>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange}
                        className="w-full pr-14 pl-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                        placeholder="11 رقم" dir="ltr" inputMode="tel" autoFocus required />
                    </div>
                  </div>
                  {traineeData?.phoneHint && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                      <SparklesIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800 font-medium">
                        تلميح: رقمك ينتهي بـ <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md mx-1" dir="ltr">**{traineeData.phoneHint}</span>
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={goBack} className="px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">رجوع</button>
                    <button type="submit" disabled={loading || formData.phone.length !== 11}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 disabled:opacity-50 flex items-center justify-center">
                      {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>تأكيد الهاتف</span>}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 4: CREATE PASSWORD */}
              {step === 'register-password' && (
                <motion.form key="register-password" variants={formVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleCreatePassword} className="space-y-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">كلمة المرور الجديدة</label>
                      <div className="relative group">
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                          <KeyIcon className="w-6 h-6" />
                        </div>
                        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                          className="w-full pr-14 pl-12 py-4 bg-slate-50/50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                          placeholder="6 أحرف على الأقل" autoFocus required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1">
                          {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">تأكيد كلمة المرور</label>
                      <div className="relative group">
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                          <KeyIcon className="w-6 h-6" />
                        </div>
                        <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                          className={`w-full pr-14 pl-12 py-4 bg-slate-50/50 border focus:bg-white focus:ring-4 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm ${
                            formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'
                          }`}
                          placeholder="أعد إدخال كلمة المرور" required minLength={6} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1">
                          {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={goBack} className="px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">رجوع</button>
                    <button type="submit" disabled={loading || formData.password.length < 6 || formData.password !== formData.confirmPassword}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center">
                      {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>إنشاء الحساب</span>}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile App Download - Mobile Only */}
          {mobileApp && mobileApp.enabled && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 lg:hidden"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 border border-slate-700/50 shadow-xl">
                {/* Decorative blurs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 shrink-0">
                      <DevicePhoneMobileIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-white">
                        {mobileApp.status === 'published' ? 'حمّل التطبيق الآن' : 'التطبيق قادم قريباً'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {mobileApp.status === 'published' ? 'تجربة أفضل على هاتفك' : 'سجّل مسبقاً وكن أول من يجربه'}
                      </p>
                    </div>
                    {mobileApp.status === 'pre_registration' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30 shrink-0">
                        <ClockIcon className="w-3 h-3" />
                        قريباً
                      </span>
                    )}
                    {mobileApp.status === 'published' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 shrink-0">
                        <CheckCircleIcon className="w-3 h-3" />
                        متاح
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2.5">
                    {mobileApp.googlePlayUrl && (
                      <a href={mobileApp.googlePlayUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-emerald-500/30 text-white rounded-xl transition-all duration-300 active:scale-95">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                        </svg>
                        <div className="text-right">
                          <div className="text-[8px] font-medium opacity-60 leading-none">
                            {mobileApp.status === 'published' ? 'متاح على' : 'سجّل على'}
                          </div>
                          <div className="text-[11px] font-black leading-tight">Google Play</div>
                        </div>
                      </a>
                    )}
                    {mobileApp.appStoreUrl && (
                      <a href={mobileApp.appStoreUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-emerald-500/30 text-white rounded-xl transition-all duration-300 active:scale-95">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                        </svg>
                        <div className="text-right">
                          <div className="text-[8px] font-medium opacity-60 leading-none">
                            {mobileApp.status === 'published' ? 'متاح على' : 'سجّل على'}
                          </div>
                          <div className="text-[11px] font-black leading-tight">App Store</div>
                        </div>
                      </a>
                    )}
                    {!mobileApp.googlePlayUrl && !mobileApp.appStoreUrl && (
                      <div className="flex-1 text-center py-2.5 text-slate-400 text-xs font-medium">
                        سيتم إضافة روابط التحميل قريباً
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
            className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/40 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], x: [0, -60, 0], y: [0, 60, 0] }} 
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-teal-800/40 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-emerald-400/20 rounded-full blur-[80px]" 
          />
        </div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] z-0 opacity-50" />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-lg px-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-lg shadow-black/20">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-50 tracking-wide">الجيل الجديد من التعليم</span>
            </div>

            {/* Typography */}
            <h2 className="text-5xl font-black text-white leading-[1.4] mb-6 tracking-tight">
              منصة ذكية <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                لمستقبل أفضل
              </span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed mb-12 font-medium">
              نظام متكامل يجمع بين سهولة الاستخدام والتقنيات المتقدمة لتوفير تجربة تعليمية استثنائية تليق بطموحاتك.
            </p>

            {/* Glassmorphism Stats Cards */}
            <div className="grid grid-cols-2 gap-5">
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl shadow-black/20 group">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
                  <ChartBarIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">أداء</h3>
                <p className="text-sm text-slate-400 font-medium">متابعة دقيقة لمستواك</p>
              </motion.div>

              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl shadow-black/20 group">
                <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-4 border border-teal-500/30 group-hover:bg-teal-500/30 transition-colors">
                  <ShieldCheckIcon className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">أمان</h3>
                <p className="text-sm text-slate-400 font-medium">حماية تامة لبياناتك</p>
              </motion.div>
            </div>

            {/* Mobile App Download Section */}
            {mobileApp && mobileApp.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-8"
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl shadow-black/20">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                      <DevicePhoneMobileIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-black text-white">
                        {mobileApp.status === 'published' ? 'حمّل التطبيق' : 'التطبيق قادم قريباً'}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {mobileApp.status === 'published' ? 'متوفر الآن للتحميل' : 'سجّل مسبقاً وكن أول من يجربه'}
                      </p>
                    </div>
                    {mobileApp.status === 'pre_registration' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                        <ClockIcon className="w-3 h-3" />
                        تسجيل مسبق
                      </span>
                    )}
                    {mobileApp.status === 'published' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                        <CheckCircleIcon className="w-3 h-3" />
                        متاح الآن
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {mobileApp.googlePlayUrl && (
                      <a href={mobileApp.googlePlayUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-2xl transition-all duration-300 group">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                        </svg>
                        <div className="text-right">
                          <div className="text-[9px] font-medium opacity-60 leading-none">
                            {mobileApp.status === 'published' ? 'متاح على' : 'سجّل على'}
                          </div>
                          <div className="text-xs font-black leading-tight">Google Play</div>
                        </div>
                      </a>
                    )}
                    {mobileApp.appStoreUrl && (
                      <a href={mobileApp.appStoreUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-2xl transition-all duration-300 group">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.7 12.56 5.7C13.34 5.7 14.84 4.63 16.39 4.8C17.04 4.83 18.82 5.06 19.96 6.71C19.87 6.77 17.57 8.12 17.59 10.93C17.62 14.26 20.49 15.36 20.53 15.37C20.5 15.45 20.07 16.87 19.07 18.33L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                        </svg>
                        <div className="text-right">
                          <div className="text-[9px] font-medium opacity-60 leading-none">
                            {mobileApp.status === 'published' ? 'متاح على' : 'سجّل على'}
                          </div>
                          <div className="text-xs font-black leading-tight">App Store</div>
                        </div>
                      </a>
                    )}
                    {!mobileApp.googlePlayUrl && !mobileApp.appStoreUrl && (
                      <div className="flex-1 text-center py-3 text-slate-400 text-xs font-medium">
                        سيتم إضافة روابط التحميل قريباً
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>

      <TraineePasswordResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
    </main>
  );
}
