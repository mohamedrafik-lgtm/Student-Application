// تكوين متغيرات البيئة للمشروع
export const ENV_CONFIG = {
  // URLs الأساسية
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  SERVER_BASE_URL: process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'http://localhost:4000',
  
  // للبيئة الإنتاجية - استخدم URLs خارجية بدلاً من localhost
  PRODUCTION_API_URL: process.env.NEXT_PUBLIC_PRODUCTION_API_URL,
  PRODUCTION_SERVER_URL: process.env.NEXT_PUBLIC_PRODUCTION_SERVER_URL,
  
  // تحديد البيئة
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
};

// دالة للحصول على URL الصحيح حسب البيئة
export function getAPIUrl(): string {
  if (ENV_CONFIG.IS_PRODUCTION && ENV_CONFIG.PRODUCTION_API_URL) {
    return ENV_CONFIG.PRODUCTION_API_URL;
  }
  return ENV_CONFIG.API_BASE_URL;
}

export function getServerUrl(): string {
  if (ENV_CONFIG.IS_PRODUCTION && ENV_CONFIG.PRODUCTION_SERVER_URL) {
    return ENV_CONFIG.PRODUCTION_SERVER_URL;
  }
  return ENV_CONFIG.SERVER_BASE_URL;
}

// دالة للحصول على URL للـ server-side (Next.js API Routes)
export function getServerSideAPIUrl(): string {
  // في البيئة الإنتاجية، استخدم URL داخلي أو خارجي صحيح
  if (ENV_CONFIG.IS_PRODUCTION) {
    return ENV_CONFIG.PRODUCTION_API_URL || ENV_CONFIG.API_BASE_URL;
  }
  return ENV_CONFIG.API_BASE_URL;
}
