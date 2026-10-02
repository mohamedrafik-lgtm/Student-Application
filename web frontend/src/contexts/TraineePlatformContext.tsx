// src/contexts/TraineePlatformContext.tsx
// الحل 1: Context مركزي لإدارة بيانات منصة المتدربين
// ✅ يدمج جميع عمليات Polling في مكان واحد
// ✅ يشارك البيانات بين جميع الصفحات
// ✅ يقلل طلبات API بنسبة 50%+

'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode 
} from 'react';
import { traineeAPI, handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';

// أنواع البيانات
interface TraineeProfile {
  id: string;
  nationalId: string;
  birthDate: string;
  trainee: any; // استخدم نفس النوع من useTraineeProfile
}

interface PaymentStatus {
  canAccessPlatform: boolean;
  blockedReason: string | null;
  paymentInfo: any;
}

interface PlatformState {
  profile: TraineeProfile | null;
  paymentStatus: PaymentStatus | null;
  stats: any | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface PlatformContextValue extends PlatformState {
  refetch: () => Promise<void>;
  updateProfile: (newProfile: TraineeProfile) => void;
}

// إنشاء Context
const TraineePlatformContext = createContext<PlatformContextValue | null>(null);

// الإعدادات
const POLLING_INTERVAL = 15 * 60 * 1000; // 15 دقيقة (زيادة من 5 دقائق)
const ENABLE_POLLING = true; // يمكن تعطيله للاختبار

/**
 * Provider لإدارة حالة منصة المتدربين بشكل مركزي
 */
export function TraineePlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlatformState>({
    profile: null,
    paymentStatus: null,
    stats: null,
    loading: true,
    error: null,
    lastUpdate: null
  });

  // دالة حساب الإحصائيات (نفس المنطق من useTraineeProfile)
  const calculateStats = useCallback((profile: TraineeProfile) => {
    const { trainee } = profile;
    
    // حساب إحصائيات الحضور
    const totalSessions = trainee.attendanceRecords?.length || 0;
    const attendedSessions = trainee.attendanceRecords?.filter(
      (record: any) => record.status === 'PRESENT'
    ).length || 0;
    const attendancePercentage = totalSessions > 0 
      ? Math.round((attendedSessions / totalSessions) * 100) 
      : 0;

    // حساب الإحصائيات المالية
    const totalPayments = trainee.traineePayments?.length || 0;
    const paidAmount = trainee.traineePayments?.reduce(
      (sum: number, payment: any) => sum + payment.paidAmount, 0
    ) || 0;
    const totalAmount = trainee.traineePayments?.reduce(
      (sum: number, payment: any) => sum + payment.amount, 0
    ) || 0;
    const remainingAmount = totalAmount - paidAmount;

    // حساب إحصائيات الوثائق
    const requiredDocumentTypes = [
      'PERSONAL_PHOTO',
      'ID_CARD_FRONT',
      'ID_CARD_BACK',
      'QUALIFICATION_FRONT'
    ];
    
    const totalDocuments = 4;
    const uploadedDocuments = trainee.documents?.filter(
      (doc: any) => requiredDocumentTypes.includes(doc.documentType)
    ).length || 0;

    // حساب التقدم الأكاديمي
    let academicProgress = 0;
    if (totalSessions > 0) {
      const attendanceScore = attendancePercentage;
      const documentsScore = (uploadedDocuments / totalDocuments) * 100;
      academicProgress = Math.round((attendanceScore + documentsScore) / 2);
    }

    return {
      totalSessions,
      attendedSessions,
      attendancePercentage,
      totalPayments,
      paidAmount,
      remainingAmount,
      totalDocuments,
      verifiedDocuments: uploadedDocuments,
      academicProgress: Math.min(academicProgress, 100)
    };
  }, []);

  /**
   * جلب جميع البيانات دفعة واحدة
   * ✅ يقلل من عدد الطلبات
   * ✅ يحدث كل البيانات معاً
   */
  const fetchAllData = useCallback(async () => {
    try {
      const token = localStorage.getItem('trainee_token');
      if (!token) {
        setState(prev => ({
          ...prev,
          error: 'لا يوجد توكن مصادقة',
          loading: false
        }));
        return;
      }

      console.log('🔄 [Platform Context] Fetching all data...');

      // جلب البيانات بالتوازي (Promise.all)
      const [profileData, paymentData] = await Promise.all([
        traineeAPI.getProfile(),
        traineeAPI.checkPaymentStatus()
      ]);

      // حساب الإحصائيات
      const stats = calculateStats(profileData);

      setState({
        profile: profileData,
        paymentStatus: paymentData,
        stats,
        loading: false,
        error: null,
        lastUpdate: new Date()
      });

      console.log('✅ [Platform Context] Data updated successfully');

    } catch (err: any) {
      console.error('❌ [Platform Context] Error fetching data:', err);
      
      // معالجة انتهاء صلاحية التوكن
      if (isTokenExpiryError(err)) {
        handleTokenExpiry();
        return;
      }
      
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'حدث خطأ غير متوقع',
        loading: false
      }));
    }
  }, [calculateStats]);

  /**
   * تحديث Profile يدوياً (للاستخدام عند تعديل البيانات)
   */
  const updateProfile = useCallback((newProfile: TraineeProfile) => {
    const stats = calculateStats(newProfile);
    setState(prev => ({
      ...prev,
      profile: newProfile,
      stats,
      lastUpdate: new Date()
    }));
  }, [calculateStats]);

  // تحميل البيانات عند التهيئة
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Polling موحد كل 15 دقيقة
  useEffect(() => {
    if (!ENABLE_POLLING) {
      console.log('⏸️ [Platform Context] Polling disabled');
      return;
    }

    console.log(`⏰ [Platform Context] Setting up polling every ${POLLING_INTERVAL / 60000} minutes`);

    const interval = setInterval(() => {
      console.log('🔄 [Platform Context] Auto-refresh triggered');
      fetchAllData();
    }, POLLING_INTERVAL);

    return () => {
      console.log('🛑 [Platform Context] Cleaning up polling interval');
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // مراقبة صلاحية التوكن (مدمج مع الـ polling)
  useEffect(() => {
    const checkTokenValidity = () => {
      const token = localStorage.getItem('trainee_token');
      if (!token) {
        console.log('🔐 [Platform Context] No token found');
        handleTokenExpiry();
      }
    };

    // فحص فوري
    checkTokenValidity();

    // فحص دوري (كل 15 دقيقة مع الـ polling)
    const tokenCheckInterval = setInterval(checkTokenValidity, POLLING_INTERVAL);

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const contextValue: PlatformContextValue = {
    ...state,
    refetch: fetchAllData,
    updateProfile
  };

  return (
    <TraineePlatformContext.Provider value={contextValue}>
      {children}
    </TraineePlatformContext.Provider>
  );
}

/**
 * Hook للوصول إلى بيانات المنصة
 * يحل محل useTraineeProfile و useTraineePaymentStatus
 */
export function useTraineePlatform() {
  const context = useContext(TraineePlatformContext);
  
  if (!context) {
    throw new Error('useTraineePlatform must be used within TraineePlatformProvider');
  }
  
  return context;
}

/**
 * Hook متوافق مع الكود القديم (للانتقال التدريجي)
 */
export function useTraineeProfile() {
  const { profile, stats, loading, error, refetch } = useTraineePlatform();
  return { profile, stats, loading, error, refetch };
}

/**
 * Hook متوافق مع الكود القديم (للانتقال التدريجي)
 */
export function useTraineePaymentStatus() {
  const { paymentStatus, loading } = useTraineePlatform();
  return { 
    status: paymentStatus, 
    loading,
    canAccessPlatform: paymentStatus?.canAccessPlatform ?? true,
    blockedReason: paymentStatus?.blockedReason ?? null
  };
}
