"use client";

import { useState, useEffect } from "react";
import { BookOpenIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import PasswordResetModal from '@/components/auth/PasswordResetModal';

interface SystemSettings {
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  licenseNumber: string;
}

export default function InstructorLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // جلب إعدادات النظام
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getSystemSettings } = await import('@/lib/settings-cache');
        const data = await getSystemSettings();
        setSettings(data);
        
        if (data.centerName) {
          document.title = `${data.centerName} - تسجيل دخول المحاضرين`;
        }
      } catch (error) {
        console.error('خطأ في جلب الإعدادات:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailOrPhone = formData.get("emailOrPhone") as string;
    const password = formData.get("password") as string;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل تسجيل الدخول');
      }

      const data = await response.json();
      
      // التحقق من نوع الحساب - يجب أن يكون محاضر
      if (data.user.accountType !== 'INSTRUCTOR') {
        // حذف أي توكن محتمل
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        
        setError('هذا الحساب خاص بالموظفين الإداريين. يرجى استخدام صفحة تسجيل دخول الموظفين.');
        setLoading(false);
        return;
      }

      // التحقق من حالة الأرشفة
      if (data.user.isArchived) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        
        setError('تم إيقاف حسابك ولا يمكنك الوصول للمنصة. تواصل مع الإدارة لمزيد من المعلومات.');
        setLoading(false);
        return;
      }

      // حفظ التوكن في الكوكيز و localStorage
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      toast.success('تم تسجيل الدخول بنجاح!');
      
      // التوجيه إلى لوحة تحكم المحاضرين
      setTimeout(() => {
        window.location.href = '/instructor-dashboard';
      }, 500);
    } catch (error: any) {
      console.error('خطأ في تسجيل الدخول:', error);
      const errorMsg = error.message || '';
      if (errorMsg.includes('archived') || errorMsg.includes('مؤرشف') || errorMsg.includes('موقوف') || errorMsg.includes('suspended') || errorMsg.includes('deactivated')) {
        setError('تم إيقاف حسابك ولا يمكنك الوصول للمنصة. تواصل مع الإدارة لمزيد من المعلومات.');
      } else {
        setError(error.message || 'بيانات تسجيل الدخول غير صحيحة');
      }
      setLoading(false);
    }
  };

  const centerName = settings?.centerName || 'مركز تدريب مهني';

  return (
    <>
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="min-h-screen flex">
        {/* الجانب الأيسر - معلومات المحاضرين */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
          {/* خلفية متدرجة */}
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="absolute bottom-20 left-10 w-24 h-24 bg-white/5 rounded-full"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 transform rotate-45"></div>
          </div>

          <div className="flex flex-col justify-center px-12 py-8 w-full relative z-10">
            <div className="max-w-lg">
              <div className="mb-12">
                <div className="flex items-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl mr-4">
                    <BookOpenIcon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2 leading-tight">
                      {centerName}
                    </h1>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
                  <h2 className="text-xl font-bold text-white mb-3">لوحة تحكم المحاضرين</h2>
                  <p className="text-blue-100 leading-relaxed">
                    نظام متكامل للمحاضرين لإدارة المواد التدريبية، تسجيل الحضور، وإدخال الدرجات بسهولة
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">إدارة موادك التدريبية</h3>
                      <p className="text-blue-200 text-sm">عرض جميع المواد المخصصة لك ومتابعتها</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">تسجيل الحضور</h3>
                      <p className="text-blue-200 text-sm">تسجيل حضور الطلاب في المحاضرات بسهولة</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">إدارة الدرجات</h3>
                      <p className="text-blue-200 text-sm">إدخال ومتابعة درجات الطلاب</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الجانب الأيمن - نموذج تسجيل الدخول */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-xl">
                <BookOpenIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">تسجيل دخول المحاضرين</h2>
              <p className="text-gray-600">أدخل بيانات حسابك للوصول إلى لوحة التحكم</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="emailOrPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                    البريد الإلكتروني أو رقم الهاتف
                  </label>
                  <div className="relative">
                    <input
                      id="emailOrPhone"
                      name="emailOrPhone"
                      type="text"
                      required
                      className="w-full h-12 px-4 pr-11 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      placeholder="أدخل البريد الإلكتروني أو رقم الهاتف"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full h-12 px-4 pr-11 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      placeholder="أدخل كلمة المرور"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <KeyIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>جاري تسجيل الدخول...</span>
                    </div>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/auth-select"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  ← العودة لاختيار نوع الحساب
                </a>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                هل أنت موظف إداري؟{' '}
                <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  تسجيل دخول الموظفين
                </a>
              </p>
            </div>
          </div>
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

