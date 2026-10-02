'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { traineeAPI, isTokenExpiringSoon, handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';
import { useTraineePaymentStatus } from '@/hooks/useTraineePaymentStatus';
import { TraineeNotificationProvider } from '@/contexts/TraineeNotificationContext';
import TraineeSidebar from './components/TraineeSidebar';
import TraineeTopbar from './components/TraineeTopbar';
import './styles/layout.css';

interface MobileAppSettings {
  enabled: boolean;
  googlePlayUrl: string;
  appStoreUrl: string;
  status: string;
}

// استيراد أدوات الاختبار في وضع التطوير
if (process.env.NODE_ENV === 'development') {
  import('@/lib/trainee-token-test');
}

export default function TraineeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [traineeData, setTraineeData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileApp, setMobileApp] = useState<MobileAppSettings | null>(null);
  
  // فحص حالة الدفع
  const { status: paymentStatus, loading: paymentLoading } = useTraineePaymentStatus();

  useEffect(() => {
    let isMounted = true; // منع memory leaks

    const checkAuth = async () => {
      const token = localStorage.getItem('trainee_token');
      
      if (!token) {
        console.log('🔐 No token found, redirecting to login...');
        if (isMounted) {
          router.push('/trainee-auth');
        }
        return;
      }

      // مزامنة التوكن مع الكوكي (للمستخدمين المسجلين مسبقاً قبل التحديث)
      if (!document.cookie.includes('trainee_token=')) {
        document.cookie = `trainee_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }

      try {
        // جلب البيانات الحديثة من API المباشر
        const profileData = await traineeAPI.getProfile();
        
        if (isMounted) {
          setTraineeData(profileData.trainee);
          
          // تحديث البيانات المحفوظة محلياً
          localStorage.setItem('trainee_data', JSON.stringify(profileData.trainee));
        }
      } catch (error: any) {
        console.error('Error fetching trainee data:', error);
        
        // إذا كان الخطأ بسبب انتهاء صلاحية التوكن، لا نحاول استخدام البيانات المحفوظة
        if (isTokenExpiryError(error)) {
          handleTokenExpiry();
          return;
        }
        
        // في حالة الفشل لأسباب أخرى، استخدم البيانات المحفوظة محلياً كـ fallback
        const storedTraineeData = localStorage.getItem('trainee_data');
        if (storedTraineeData && isMounted) {
          try {
            const parsedTraineeData = JSON.parse(storedTraineeData);
            setTraineeData(parsedTraineeData);
            console.log('📱 Using cached trainee data as fallback');
          } catch (parseError) {
            console.error('Error parsing stored trainee data:', parseError);
            localStorage.removeItem('trainee_token');
            localStorage.removeItem('trainee_data');
            if (isMounted) {
              router.push('/trainee-auth');
            }
            return;
          }
        } else if (!storedTraineeData && isMounted) {
          localStorage.removeItem('trainee_token');
          router.push('/trainee-auth');
          return;
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false; // Cleanup
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        console.error('Error fetching mobile app settings:', err);
      }
    };
    fetchMobileAppSettings();
  }, []);

  // مراقبة صلاحية التوكن كل 5 دقائق
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('trainee_token');
      if (token) {
        if (isTokenExpiringSoon(token)) {
          console.log('⚠️ Token is expiring soon, showing warning...');
          // يمكن إضافة تنبيه للمستخدم هنا
        }
      }
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(tokenCheckInterval);
  }, []);

  // إرسال نبضة heartbeat كل 60 ثانية لتتبع النشاط
  useEffect(() => {
    if (isLoading) return;

    // إرسال نبضة فورية عند الدخول
    traineeAPI.heartbeat(pathname).catch(() => {});

    const heartbeatInterval = setInterval(() => {
      traineeAPI.heartbeat(pathname).catch(() => {});
    }, 60 * 1000); // كل 60 ثانية

    return () => clearInterval(heartbeatInterval);
  }, [isLoading, pathname]);

  // فحص حالة الدفع وإعادة التوجيه إذا لزم الأمر
  useEffect(() => {
    // تخطي الفحص إذا كنا بالفعل في صفحة الحجب
    if (pathname === '/trainee-dashboard/blocked') {
      return;
    }

    // انتظار اكتمال التحميلين
    if (isLoading || paymentLoading) {
      return;
    }

    // إذا كانت المنصة محجوبة، إعادة توجيه فورية
    if (paymentStatus && !paymentStatus.canAccess) {
      console.log('🚫 [PaymentGuard] المنصة محجوبة - إعادة توجيه لصفحة الحجب');
      router.push('/trainee-dashboard/blocked');
    }
  }, [paymentStatus, paymentLoading, isLoading, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('trainee_token');
    localStorage.removeItem('trainee_data');
    localStorage.removeItem('trainee_session_token');
    // مسح الكوكي
    document.cookie = 'trainee_token=; path=/; max-age=0; SameSite=Lax';
    router.push('/trainee-auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-full opacity-30 animate-bounce delay-500"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full opacity-30 animate-bounce delay-700"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          {/* Logo Area */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="mb-6">
            <div className="relative">
              {/* Main Spinner */}
              <div className="w-16 h-16 mx-auto relative">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-400 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-teal-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              
              {/* Pulse Rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-2 border-emerald-300 rounded-full animate-ping opacity-20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-teal-300 rounded-full animate-ping opacity-10 delay-300"></div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              منصة المتدربين
            </h2>
            <p className="text-emerald-700 font-medium text-lg animate-pulse">
              جاري تحميل بياناتك...
            </p>
            <p className="text-emerald-600 text-sm opacity-80">
              نحضر لك تجربة تعليمية مميزة
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mt-8">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></div>
          </div>

        </div>

        {/* Additional Visual Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // إذا كانت الصفحة محجوبة، عرض المحتوى بدون Layout
  if (pathname === '/trainee-dashboard/blocked') {
    return <>{children}</>;
  }

  // استخراج معرف المتدرب للإشعارات
  const traineeId = (traineeData as any)?.id?.toString() || null;

  return (
    <TraineeNotificationProvider traineeId={traineeId}>
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <TraineeSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        traineeData={traineeData}
      />

      {/* Main content */}
      <div className="lg:pr-64 xl:pr-72">
        {/* Top bar */}
        <TraineeTopbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          traineeData={traineeData}
          mobileApp={mobileApp}
        />

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <div className="trainee-container responsive-spacing">
            {children}
          </div>
        </main>
      </div>
    </div>
    </TraineeNotificationProvider>
  );
}
