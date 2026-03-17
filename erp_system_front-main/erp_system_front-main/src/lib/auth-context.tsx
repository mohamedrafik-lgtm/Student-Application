'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithCredentials } from './auth-service';
import { API_BASE_URL } from './api';

// تعريف نوع الدور
export interface Role {
  id: string;
  name: string;
  displayName: string;
  color?: string;
  icon?: string;
  priority: number;
}

// تعريف نوع المستخدم
export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  roles?: Role[];
  primaryRole?: Role;
  isArchived?: boolean;
}

// تعريف سياق المصادقة
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkTokenValidity: () => Promise<boolean>;
  updateUserPhoto: (photoUrl: string | null) => void;
}

// إنشاء سياق المصادقة
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// مزود سياق المصادقة
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // cache للتحقق من الجلسة لتجنب الطلبات المتكررة
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);
  const VALIDATION_CACHE_DURATION = 30 * 1000; // 30 ثانية
  
  // دالة للتحقق من صلاحية التوكن مع معالجة أخطاء الشبكة وcache
  const checkTokenValidity = async (useCache: boolean = true): Promise<boolean> => {
    const currentTime = Date.now();
    
    // استخدام cache إذا كان التحقق الأخير حديث
    if (useCache && currentTime - lastValidationTime < VALIDATION_CACHE_DURATION) {
      console.log('AuthContext - استخدام cache التحقق السابق');
      return true;
    }
    
    console.log('AuthContext - التحقق من صلاحية التوكن...');
    const currentToken = localStorage.getItem('auth_token');
    
    if (!currentToken) {
      console.log('AuthContext - لا يوجد توكن للتحقق منه');
      return false;
    }
    
    try {
      // محاولة الوصول إلى نقطة نهاية محمية للتحقق من صلاحية التوكن
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // مهلة 10 ثواني
      
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // التحقق من حالة الأرشفة في بيانات الملف الشخصي
        try {
          const profileData = await response.json();
          if (profileData.isArchived) {
            console.log('AuthContext - الحساب تم أرشفته، جاري طرد المستخدم...');
            handleArchivedUser();
            return false;
          }
        } catch (e) {
          // إذا فشل parsing الـ JSON، نعتبر التوكن صالح
        }
        console.log('AuthContext - التوكن صالح');
        setLastValidationTime(currentTime);
        return true;
      } else if (response.status === 401) {
        console.log('AuthContext - التوكن غير صالح أو منتهي الصلاحية');
        return false;
      } else if (response.status === 403) {
        // التحقق من حالة الأرشفة في 403
        try {
          const errorData = await response.json();
          if (errorData.isArchived || errorData.message?.includes('archived') || errorData.message?.includes('مؤرشف') || errorData.message?.includes('موقوف') || errorData.message?.includes('إيقاف')) {
            console.log('AuthContext - الحساب مؤرشف (403)، جاري طرد المستخدم...');
            handleArchivedUser();
            return false;
          }
        } catch (e) {}
        return true;
      } else {
        console.log('AuthContext - خطأ في الخادم، سيتم المحاولة لاحقاً');
        return true;
      }
    } catch (error: any) {
      console.error('AuthContext - خطأ أثناء التحقق من صلاحية التوكن:', error);
      
      // التمييز بين أنواع الأخطاء
      if (error.name === 'AbortError') {
        console.log('AuthContext - انتهت مهلة الطلب، ربما الشبكة بطيئة');
        return true; // افتراض أن التوكن لا يزال صالحاً
      } else if (
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.cause?.code === 'ECONNREFUSED'
      ) {
        console.log('AuthContext - الخادم غير متاح، الحفاظ على الجلسة مؤقتاً');
        return true; // الحفاظ على الجلسة عند انقطاع الخادم
      } else {
        console.log('AuthContext - خطأ غير متوقع في التحقق من التوكن');
        return true; // افتراض أن التوكن لا يزال صالحاً
      }
    }
  };

  // دالة تسجيل الخروج التلقائي عند أرشفة الحساب
  const handleArchivedUser = () => {
    try {
      console.log('AuthContext - تم اكتشاف أرشفة الحساب، جاري طرد المستخدم...');
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      
      setToken(null);
      setUser(null);
      
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?account_archived=true';
        }
      }, 100);
    } catch (error) {
      console.error('AuthContext - خطأ أثناء طرد المستخدم المؤرشف:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login?account_archived=true';
      }
    }
  };

  // دالة تسجيل الخروج التلقائي عند انتهاء صلاحية التوكن
  const handleTokenExpiry = () => {
    try {
      console.log('AuthContext - تم اكتشاف انتهاء صلاحية التوكن، جاري تسجيل الخروج...');
      
      // إزالة البيانات من localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // إزالة التوكن من ملفات تعريف الارتباط (cookies)
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      
      // تحديث الحالة
      setToken(null);
      setUser(null);
      
      console.log('AuthContext - تم تسجيل الخروج التلقائي بنجاح');
      
      // إعادة توجيه آمنة مع رسالة انتهاء الجلسة
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session_expired=true';
        }
      }, 100);
      
    } catch (error) {
      console.error('AuthContext - خطأ أثناء تسجيل الخروج التلقائي:', error);
      // إعادة توجيه في حالة الخطأ
      if (typeof window !== 'undefined') {
        window.location.href = '/login?session_expired=true';
      }
    }
  };

  // التحقق من وجود جلسة مخزنة عند تحميل الصفحة - محسن للسرعة
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedToken && storedUser) {
          // تحميل الجلسة فوراً دون انتظار التحقق من الخادم
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsLoading(false); // إنهاء التحميل فوراً
          console.log('AuthContext - تم استرداد الجلسة بسرعة');
          
          // التحقق من صلاحية التوكن في الخلفية (بدون تأثير على UI)
          checkTokenValidity(false).then(isValid => { // false = لا تستخدم cache في التحقق الأولي
            if (!isValid) {
              console.log('AuthContext - التوكن المخزن غير صالح، جاري تسجيل الخروج...');
              handleTokenExpiry();
            } else {
              console.log('AuthContext - تم تأكيد صلاحية الجلسة في الخلفية');
            }
          }).catch(error => {
            console.error('AuthContext - خطأ في التحقق الخلفي:', error);
            // لا نسجل خروج في حالة خطأ الشبكة
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthContext - خطأ أثناء تهيئة المصادقة:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // فحص دوري لصلاحية التوكن مع آلية إعادة المحاولة
  useEffect(() => {
    if (!user || !token) return;

    const interval = setInterval(async () => {
      console.log('AuthContext - فحص دوري لصلاحية التوكن...');
      
      let retries = 3;
      let isValid = true;
      
      while (retries > 0) {
        try {
          isValid = await checkTokenValidity();
          
          if (isValid) {
            console.log('AuthContext - التحقق نجح، التوكن صالح');
            break;
          } else {
            console.log('AuthContext - التوكن غير صالح، جاري تسجيل الخروج...');
            handleTokenExpiry();
            return;
          }
        } catch (error) {
          console.error(`AuthContext - فشل الفحص، المحاولات المتبقية: ${retries - 1}`, error);
          retries--;
          
          if (retries > 0) {
            console.log('AuthContext - انتظار قبل إعادة المحاولة...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // انتظار 5 ثواني
          } else {
            console.log('AuthContext - فشلت جميع المحاولات، لكن سنحافظ على الجلسة');
            // لا نسجل خروج حتى لو فشلت جميع المحاولات (ربما مشكلة شبكة مؤقتة)
          }
        }
      }
    }, 60 * 1000); // فحص كل دقيقة

    return () => {
      clearInterval(interval);
      console.log('AuthContext - تم إيقاف الفحص الدوري للتوكن');
    };
  }, [user, token]);

  // دالة تسجيل الدخول
  const login = async (emailOrPhone: string, password: string) => {
    setIsLoading(true);
    console.log('بدء عملية تسجيل الدخول في AuthContext...');
    try {
      const response = await loginWithCredentials(emailOrPhone, password);
      console.log('استجابة تسجيل الدخول:', response ? 'تم استلام البيانات' : 'لا توجد بيانات');
      
      if (response && response.access_token) {
        console.log('تم استلام توكن صالح، جاري إعداد بيانات المستخدم...');
        
        // التحقق من حالة الأرشفة
        if (response.user.isArchived) {
          console.log('AuthContext - الحساب مؤرشف، رفض تسجيل الدخول');
          setIsLoading(false);
          return { success: false, error: 'تم إيقاف حسابك ولا يمكنك الوصول للمنصة الإدارية. تواصل مع الإدارة لمزيد من المعلومات.' };
        }
        
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          photoUrl: response.user.photoUrl || undefined,
          roles: response.user.roles || [],
          primaryRole: response.user.primaryRole || null,
          isArchived: response.user.isArchived || false,
        };
        
        // تخزين بيانات المستخدم والتوكن في localStorage
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        console.log('تم تخزين البيانات في localStorage');
        
        // تخزين التوكن في ملفات تعريف الارتباط (cookies) للوصول إليه من middleware
        // زيادة مدة صلاحية التوكن إلى 7 أيام
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        
        document.cookie = `auth_token=${response.access_token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        console.log('تم تخزين التوكن في ملفات تعريف الارتباط (cookies)');
        
        setToken(response.access_token);
        setUser(userData);
        console.log('تم تحديث حالة المصادقة في السياق');
        
        setIsLoading(false);
        // إرجاع بيانات المستخدم مع accountType لاستخدامها في التوجيه
        return { 
          success: true, 
          user: {
            ...userData,
            accountType: response.user.accountType, // إضافة نوع الحساب
          }
        };
      } else {
        console.error('لم يتم استلام توكن صالح من الخادم');
        setIsLoading(false);
        return { success: false, error: 'فشل تسجيل الدخول' };
      }
    } catch (error: any) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      setIsLoading(false);
      
      // التحقق من رسائل الأرشفة من الباكند
      const errorMsg = error.message || '';
      if (errorMsg.includes('archived') || errorMsg.includes('مؤرشف') || errorMsg.includes('موقوف') || errorMsg.includes('إيقاف') || errorMsg.includes('suspended') || errorMsg.includes('deactivated')) {
        return { 
          success: false, 
          error: 'تم إيقاف حسابك ولا يمكنك الوصول للمنصة الإدارية. تواصل مع الإدارة لمزيد من المعلومات.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول' 
      };
    }
  };

  // دالة تسجيل الخروج
  const logout = () => {
    try {
      console.log('AuthContext - بدء عملية تسجيل الخروج...');
      
      // إزالة البيانات من localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // إزالة التوكن من ملفات تعريف الارتباط (cookies)
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      
      // تحديث الحالة
      setToken(null);
      setUser(null);
      
      console.log('AuthContext - تم تسجيل الخروج بنجاح');
      
      // إعادة توجيه آمنة
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 100);
      
    } catch (error) {
      console.error('AuthContext - خطأ أثناء تسجيل الخروج:', error);
      // إعادة توجيه في حالة الخطأ أيضاً
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  // تحديث صورة المستخدم في السياق و localStorage
  const updateUserPhoto = (photoUrl: string | null) => {
    if (user) {
      const updatedUser = { ...user, photoUrl: photoUrl || undefined };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        checkTokenValidity,
        updateUserPhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// هوك مخصص لاستخدام سياق المصادقة
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth يجب أن يستخدم داخل AuthProvider');
  }
  return context;
}