// خدمة cache للإعدادات لتجنب الطلبات المتكررة

export interface SystemSettings {
  centerName: string;
  licenseNumber: string;
  centerManagerName: string;
  centerAddress: string;
  centerLogo: string | null;
  facebookPageUrl: string;
}

class SettingsCache {
  private cache: SystemSettings | null = null;
  private lastFetchTime: number = 0;
  private fetchPromise: Promise<SystemSettings> | null = null;
  
  // مدة صلاحية الـ cache (15 دقيقة)
  private readonly CACHE_DURATION = 15 * 60 * 1000;
  
  // التحقق من صحة الـ cache
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const now = Date.now();
    return (now - this.lastFetchTime) < this.CACHE_DURATION;
  }
  
  // جلب الإعدادات مع cache
  async getSettings(): Promise<SystemSettings> {
    // إذا كان الـ cache صالح، ارجعه فوراً
    if (this.isCacheValid() && this.cache) {
      console.log('🔄 استخدام cache الإعدادات المحفوظة');
      return this.cache;
    }
    
    // إذا كان هناك طلب جاري، انتظره
    if (this.fetchPromise) {
      console.log('⏳ انتظار الطلب الجاري للإعدادات');
      return this.fetchPromise;
    }
    
    // إنشاء طلب جديد
    console.log('📡 جلب الإعدادات من الخادم');
    this.fetchPromise = this.fetchFromServer();
    
    try {
      const settings = await this.fetchPromise;
      
      // حفظ في الـ cache
      this.cache = settings;
      this.lastFetchTime = Date.now();
      
      console.log('✅ تم حفظ الإعدادات في الـ cache');
      return settings;
    } finally {
      // إنهاء الـ promise بعد انتهاء الطلب
      this.fetchPromise = null;
    }
  }
  
  // الطلب الفعلي من الخادم
  private async fetchFromServer(): Promise<SystemSettings> {
    try {
      const response = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // تجنب الـ cache الخاص بالمتصفح
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const settings = await response.json();
      
      // التحقق من صحة البيانات
      if (!settings.centerName) {
        console.warn('⚠️ بيانات الإعدادات ناقصة، استخدام القيم الافتراضية');
        return this.getDefaultSettings();
      }
      
      return settings;
    } catch (error) {
      console.error('❌ خطأ في جلب الإعدادات:', error);
      
      // في حالة الخطأ، استخدم الـ cache القديم إذا وُجد
      if (this.cache) {
        console.log('🔄 استخدام الـ cache القديم بسبب خطأ الشبكة');
        return this.cache;
      }
      
      // أو استخدم الإعدادات الافتراضية
      return this.getDefaultSettings();
    }
  }
  
  // الإعدادات الافتراضية
  private getDefaultSettings(): SystemSettings {
    return {
      centerName: 'نظام إدارة المراكز',
      licenseNumber: '0',
      centerManagerName: 'مدير المركز',
      centerAddress: 'عنوان المركز',
      centerLogo: null,
      facebookPageUrl: ''
    };
  }
  
  // إزالة الـ cache يدوياً (مفيد بعد تحديث الإعدادات)
  clearCache(): void {
    console.log('🗑️ تم مسح cache الإعدادات');
    this.cache = null;
    this.lastFetchTime = 0;
    this.fetchPromise = null;
  }
  
  // تحديث الـ cache مباشرة (مفيد بعد حفظ إعدادات جديدة)
  updateCache(settings: SystemSettings): void {
    console.log('🔄 تحديث cache الإعدادات مباشرة');
    this.cache = settings;
    this.lastFetchTime = Date.now();
  }
  
  // الحصول على إعداد محدد بسرعة
  async getSetting(key: keyof SystemSettings): Promise<string | null> {
    const settings = await this.getSettings();
    return settings[key];
  }
}

// مثيل واحد مشترك
export const settingsCache = new SettingsCache();

// دالة مساعدة سريعة لجلب الإعدادات
export const getSystemSettings = () => settingsCache.getSettings();

// دالة مساعدة للحصول على إعداد محدد
export const getSystemSetting = (key: keyof SystemSettings) => settingsCache.getSetting(key);

// دالة مساعدة لمسح الـ cache
export const clearSettingsCache = () => settingsCache.clearCache();

// دالة مساعدة لتحديث الـ cache
export const updateSettingsCache = (settings: SystemSettings) => settingsCache.updateCache(settings);
