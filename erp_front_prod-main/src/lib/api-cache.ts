// نظام cache عام لـ API calls لتجنب الطلبات المتكررة

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  // الحصول على البيانات من الـ cache أو جلبها من الخادم
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = 5 * 60 * 1000 // 5 دقائق افتراضياً
  ): Promise<T> {
    const now = Date.now();
    
    // التحقق من وجود البيانات في الـ cache وصلاحيتها
    const cached = this.cache.get(key);
    if (cached && now < cached.expiresAt) {
      console.log(`🔄 استخدام cache للمفتاح: ${key}`);
      return cached.data;
    }
    
    // التحقق من وجود طلب جاري
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      console.log(`⏳ انتظار طلب جاري للمفتاح: ${key}`);
      return pendingRequest;
    }
    
    // إنشاء طلب جديد
    console.log(`📡 جلب بيانات جديدة للمفتاح: ${key}`);
    const request = fetcher().then(data => {
      // حفظ في الـ cache
      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl
      });
      
      // إزالة من الطلبات الجارية
      this.pendingRequests.delete(key);
      
      return data;
    }).catch(error => {
      // إزالة من الطلبات الجارية في حالة الخطأ
      this.pendingRequests.delete(key);
      throw error;
    });
    
    // حفظ الطلب الجاري
    this.pendingRequests.set(key, request);
    
    return request;
  }
  
  // مسح عنصر محدد من الـ cache
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
    console.log(`🗑️ تم مسح cache للمفتاح: ${key}`);
  }
  
  // مسح عدة عناصر بنمط معين
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.pendingRequests.delete(key);
      }
    }
    console.log(`🗑️ تم مسح cache للنمط: ${pattern}`);
  }
  
  // مسح الـ cache المنتهي الصلاحية
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  // مسح جميع الـ cache
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🗑️ تم مسح جميع الـ cache');
  }
  
  // الحصول على إحصائيات الـ cache
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.expiresAt - Date.now()
      }))
    };
  }
}

// مثيل مشترك للـ cache
export const apiCache = new APICache();

// تنظيف دوري للـ cache (تم تحسين الفترة من 10 إلى 30 دقيقة)
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 30 * 60 * 1000); // كل 30 دقيقة بدلاً من 10
}

// دالة مساعدة لجلب البيانات مع cache
export function useCachedAPI<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return apiCache.get(key, fetcher, ttl);
}
