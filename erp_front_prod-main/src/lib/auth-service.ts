import { fetchAPI } from './api';

// دالة لتسجيل الدخول باستخدام الباك إند الجديد
export async function loginWithCredentials(emailOrPhone: string, password: string) {
  try {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// دالة للحصول على معلومات المستخدم الحالي
export async function getCurrentUser(token: string) {
  try {
    const response = await fetchAPI('/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

// دالة للتحقق من صحة التوكن
export async function verifyToken(token: string) {
  try {
    const user = await getCurrentUser(token);
    return { isValid: true, user };
  } catch (error) {
    return { isValid: false, user: null };
  }
}

// دالة مساعدة للحصول على التوكن من التخزين المحلي
export function getStoredToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// دالة مساعدة للحصول على المستخدم من التخزين المحلي
export function getStoredUser() {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  }
  return null;
}