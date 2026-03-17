// ملف جديد للتعامل مع API المتدربين مباشرة
import { API_BASE_URL } from './api';

export const TRAINEE_API_BASE_URL = API_BASE_URL;

// دالة للتحقق من صلاحية التوكن قبل انتهائه
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    // إذا كان التوكن سينتهي خلال 24 ساعة، نعتبره قريباً من الانتهاء
    const oneDayInSeconds = 24 * 60 * 60;
    return timeUntilExpiry < oneDayInSeconds;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // في حالة الخطأ، نعتبر التوكن منتهي الصلاحية
  }
}

// دالة للتحقق من صلاحية التوكن
export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (error) {
    console.error('Error parsing token:', error);
    return false;
  }
}

// دالة مساعدة للحصول على توكن المتدرب
export function getTraineeAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('trainee_token');
    
    // التحقق من صلاحية التوكن قبل إرجاعه
    if (token && !isTokenValid(token)) {
      console.log('🔐 Token is expired, clearing...');
      localStorage.removeItem('trainee_token');
      localStorage.removeItem('trainee_data');
      return null;
    }
    
    return token;
  }
  return null;
}

// دالة للتعامل مع طلبات API المتدربين
export async function fetchTraineeAPI(endpoint: string, options: RequestInit = {}, skipAuth = false) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // إضافة توكن المتدرب تلقائياً (ما عدا endpoints التسجيل)
  if (!skipAuth) {
    const token = getTraineeAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${TRAINEE_API_BASE_URL}/${endpoint.replace(/^\//, '')}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // معالجة خطأ انتهاء صلاحية التوكن (فقط للطلبات التي تحتاج auth)
    if (response.status === 401 && !skipAuth) {
      console.log('🔐 Token expired or invalid, redirecting to login...');
      // مسح البيانات المحفوظة
      localStorage.removeItem('trainee_token');
      localStorage.removeItem('trainee_data');
      // مسح الكوكي
      document.cookie = 'trainee_token=; path=/; max-age=0; SameSite=Lax';
      // إعادة التوجيه لصفحة تسجيل الدخول
      if (typeof window !== 'undefined') {
        window.location.href = '/trainee-auth';
      }
      throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`خطأ في طلب API: ${url}`, error);
    throw error;
  }
}

// دوال محددة لـ API المتدربين
export const traineeAPI = {
  // التحقق من الرقم القومي (لا يحتاج token)
  checkNationalId: async (nationalId: string) => {
    return fetchTraineeAPI('trainee-auth/check-national-id', {
      method: 'POST',
      body: JSON.stringify({ nationalId }),
    }, true); // skipAuth = true
  },

  // تسجيل الدخول (لا يحتاج token)
  login: async (nationalId: string, password: string) => {
    return fetchTraineeAPI('trainee-auth/login', {
      method: 'POST',
      body: JSON.stringify({ nationalId, password }),
    }, true); // skipAuth = true
  },

  // التحقق من المتدرب (لا يحتاج token)
  verifyTrainee: async (nationalId: string, birthDate: string) => {
    return fetchTraineeAPI('trainee-auth/verify-trainee', {
      method: 'POST',
      body: JSON.stringify({ nationalId, birthDate }),
    }, true); // skipAuth = true
  },

  // الحصول على بيانات المتدرب
  getProfile: async () => {
    return fetchTraineeAPI('trainee-auth/profile');
  },

  // الحصول على الجدول الدراسي الأسبوعي
  getMySchedule: async () => {
    return fetchTraineeAPI('trainee-auth/my-schedule');
  },

  // إنشاء كلمة مرور (لا يحتاج token)
  createPassword: async (nationalId: string, password: string, confirmPassword: string, birthDate: string) => {
    return fetchTraineeAPI('trainee-auth/create-password', {
      method: 'POST',
      body: JSON.stringify({ nationalId, password, confirmPassword, birthDate }),
    }, true); // skipAuth = true
  },

  // طلب إعادة تعيين كلمة المرور (لا يحتاج token)
  requestPasswordReset: async (nationalId: string, phone: string) => {
    return fetchTraineeAPI('trainee-auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ nationalId, phone }),
    }, true); // skipAuth = true
  },

  // التحقق من كود إعادة التعيين (لا يحتاج token)
  verifyResetCode: async (nationalId: string, resetCode: string) => {
    return fetchTraineeAPI('trainee-auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ nationalId, resetCode }),
    }, true); // skipAuth = true
  },

  // إعادة تعيين كلمة المرور (لا يحتاج token)
  resetPassword: async (nationalId: string, resetCode: string, newPassword: string) => {
    return fetchTraineeAPI('trainee-auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ nationalId, resetCode, newPassword }),
    }, true); // skipAuth = true
  },

  // التحقق من رقم الهاتف (لا يحتاج token)
  verifyPhone: async (nationalId: string, phone: string) => {
    return fetchTraineeAPI('trainee-auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ nationalId, phone }),
    }, true); // skipAuth = true
  },
};

// دالة مساعدة لمعالجة انتهاء صلاحية التوكن
export function handleTokenExpiry(): void {
  console.log('🔐 Token expired, clearing data and redirecting...');
  localStorage.removeItem('trainee_token');
  localStorage.removeItem('trainee_data');
  // مسح الكوكي أيضاً
  if (typeof document !== 'undefined') {
    document.cookie = 'trainee_token=; path=/; max-age=0; SameSite=Lax';
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/trainee-auth';
  }
}

// دالة للتحقق من خطأ انتهاء صلاحية التوكن
export function isTokenExpiryError(error: any): boolean {
  return error.message?.includes('انتهت صلاحية الجلسة') || 
         error.message?.includes('Unauthorized') ||
         error.status === 401;
}
