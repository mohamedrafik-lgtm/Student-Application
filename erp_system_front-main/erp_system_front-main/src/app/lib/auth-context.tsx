import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api/client';

// نوع المستخدم
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  systemRoleId?: string;
}

// سياق المصادقة
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

// إنشاء السياق
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// مزود السياق
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // التحقق من المصادقة عند تحميل الصفحة
  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  // دالة تسجيل الدخول
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // دالة تسجيل الخروج
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      router.push('/login');
    }
  };

  // التحقق من حالة المصادقة
  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      }
      
      const response = await apiClient.get('/auth/profile');
      setUser(response.data);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// استخدام سياق المصادقة
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 