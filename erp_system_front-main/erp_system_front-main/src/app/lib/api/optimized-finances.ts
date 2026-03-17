import { apiClient } from './client';

/**
 * تحميل بيانات محسن للذاكرة المحدودة
 */
export class OptimizedFinancesAPI {
  
  /**
   * تحميل بيانات المتدرب بشكل تدريجي
   */
  static async getTraineePaymentsOptimized(traineeId: number) {
    try {
      // تحميل البيانات بشكل منفصل لتقليل الضغط على الذاكرة
      console.log(`🔄 Loading optimized data for trainee ${traineeId}`);
      
      // 1. تحميل بيانات المتدرب أولاً
      const traineeResponse = await apiClient.get(`/trainees/${traineeId}`);
      const trainee = traineeResponse.data;
      
      if (!trainee) {
        throw new Error('المتدرب غير موجود');
      }
      
      // 2. تحميل المدفوعات فقط لهذا المتدرب
      const paymentsResponse = await apiClient.get(`/finances/trainees/${traineeId}/payments`);
      const payments = paymentsResponse.data;
      
      // 3. تحميل الخزائن النشطة فقط
      const safesResponse = await apiClient.get('/finances/safes?active=true');
      const safes = safesResponse.data.filter(safe => safe.isActive);
      
      console.log(`✅ Optimized data loaded: ${payments.length} payments, ${safes.length} safes`);
      
      return {
        trainee,
        payments,
        safes
      };
      
    } catch (error) {
      console.error('❌ Error loading optimized trainee data:', error);
      throw error;
    }
  }
  
  /**
   * تحميل قائمة المتدربين مع pagination
   */
  static async getTraineesWithPaymentsPaginated(page = 1, limit = 20) {
    try {
      console.log(`🔄 Loading paginated trainees data (page ${page}, limit ${limit})`);
      
      // تحميل المتدربين مع pagination
      const traineesResponse = await apiClient.get(`/trainees?page=${page}&limit=${limit}`);
      const trainees = traineesResponse.data.data || traineesResponse.data;
      
      // تحميل المدفوعات فقط للمتدربين في هذه الصفحة
      const traineeIds = trainees.map(t => t.id);
      const paymentsResponse = await apiClient.post('/finances/trainee-payments/batch', {
        traineeIds
      });
      const payments = paymentsResponse.data;
      
      // حساب البيانات المالية لكل متدرب
      const traineesWithFinancials = trainees.map(trainee => {
        const traineePayments = payments.filter(p => p.traineeId === trainee.id);
        const totalAmount = traineePayments.reduce((sum, p) => sum + p.amount, 0);
        const paidAmount = traineePayments.reduce((sum, p) => sum + p.paidAmount, 0);
        const remainingAmount = totalAmount - paidAmount;
        
        let paymentStatus = 'unpaid';
        if (remainingAmount === 0 && totalAmount > 0) paymentStatus = 'paid';
        else if (paidAmount > 0 && remainingAmount > 0) paymentStatus = 'partial';
        
        return {
          ...trainee,
          totalAmount,
          paidAmount,
          remainingAmount,
          paymentStatus,
          paymentsCount: traineePayments.length
        };
      });
      
      console.log(`✅ Paginated data loaded: ${traineesWithFinancials.length} trainees`);
      
      return {
        trainees: traineesWithFinancials,
        pagination: traineesResponse.data.pagination || {
          page,
          limit,
          total: trainees.length,
          totalPages: Math.ceil(trainees.length / limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Error loading paginated trainees:', error);
      throw error;
    }
  }
  
  /**
   * معالجة الدفع مع فحص الذاكرة
   */
  static async processPaymentOptimized(paymentData: {
    traineeId: number;
    amount: number;
    safeId: string;
    notes?: string;
  }) {
    try {
      console.log(`🔄 Processing optimized payment for trainee ${paymentData.traineeId}`);
      
      // فحص حالة الخادم قبل المعالجة
      const healthResponse = await apiClient.get('/health');
      const serverHealth = healthResponse.data;
      
      if (serverHealth.memoryUsage && serverHealth.memoryUsage > 80) {
        throw new Error('الخادم محمل بشدة، يرجى المحاولة لاحقاً');
      }
      
      // معالجة الدفع
      const response = await apiClient.post('/finances/auto-payment', paymentData);
      
      console.log('✅ Payment processed successfully');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error processing optimized payment:', error);
      throw error;
    }
  }
  
  /**
   * تنظيف الكاش في المتصفح
   */
  static clearBrowserCache() {
    try {
      // تنظيف localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('trainee') || key.includes('payment') || key.includes('cache'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // تنظيف sessionStorage
      sessionStorage.clear();
      
      console.log(`🗑️ Browser cache cleared: ${keysToRemove.length} items removed`);
      
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  }
}
