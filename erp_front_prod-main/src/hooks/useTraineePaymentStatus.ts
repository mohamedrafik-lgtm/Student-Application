import { useState, useEffect, useCallback } from 'react';
import { AccessCheckResult } from '@/types/payment-status';
import { API_BASE_URL } from '@/lib/api';

/**
 * Hook للتحقق من حالة الدفع والوصول للمنصة
 */
export function useTraineePaymentStatus() {
  const [status, setStatus] = useState<AccessCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * فحص حالة الدفع من API
   */
  const checkPaymentStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('trainee_token');
      
      if (!token) {
        setStatus(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/trainee-platform/access-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // في حالة الخطأ، نسمح بالوصول (fail-safe)
        console.warn('فشل فحص حالة الدفع، السماح بالوصول مؤقتاً');
        setStatus({
          canAccess: true,
          blockReason: undefined,
          paymentInfo: null,
          blockInfo: null,
        });
        setLoading(false);
        return;
      }

      const data: AccessCheckResult = await response.json();
      console.log('✅ حالة الدفع:', data);
      
      setStatus(data);
      setError(null);
      
    } catch (err: any) {
      console.error('خطأ في فحص حالة الدفع:', err);
      setError(err.message || 'فشل فحص حالة الدفع');
      
      // في حالة الخطأ، نسمح بالوصول (fail-safe)
      setStatus({
        canAccess: true,
        blockReason: undefined,
        paymentInfo: null,
        blockInfo: null,
      });
      
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * إعادة فحص الحالة
   */
  const refetch = useCallback(() => {
    setLoading(true);
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  /**
   * فحص عند التحميل الأول فقط (تم إصلاح potential infinite loop)
   */
  useEffect(() => {
    checkPaymentStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * إعادة الفحص كل 5 دقائق
   */
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 إعادة فحص حالة الدفع (دوري)');
      checkPaymentStatus();
    }, 5 * 60 * 1000); // 5 دقائق

    return () => clearInterval(interval);
  }, [checkPaymentStatus]);

  return {
    status,
    loading,
    error,
    refetch,
    // دوال مساعدة
    isBlocked: status?.canAccess === false,
    hasUpcomingPayments: (status?.paymentInfo?.upcomingPayments?.length || 0) > 0,
    hasOverduePayments: (status?.paymentInfo?.overduePayments?.length || 0) > 0 ||
                        (status?.blockInfo?.overduePayments?.length || 0) > 0,
  };
}

/**
 * Hook خفيف للحصول على ملخص المدفوعات المتأخرة فقط
 */
export function useOverduePaymentsSummary() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const token = localStorage.getItem('trainee_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/trainee-platform/overdue-summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (err) {
        console.error('خطأ في جلب ملخص المدفوعات:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, []);

  return { summary, loading };
}