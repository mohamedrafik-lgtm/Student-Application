// تكوين محسن لنظام WhatsApp
export const WhatsAppConfig = {
  // إعدادات العملية الفرعية
  process: {
    maxRestartAttempts: 5,
    restartDelay: 5000, // 5 ثوان
    maxRestartDelay: 30000, // 30 ثانية (أقصى تأخير)
    processTimeout: 60000, // دقيقة واحدة
    gracefulShutdownTimeout: 10000, // 10 ثوان للإنهاء اللطيف
  },

  // إعدادات الجلسة
  session: {
    authDir: './whatsapp-auth',
    maxSessionAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
    maxSessionFiles: 50, // أقصى عدد ملفات
    maxSessionSize: 100 * 1024 * 1024, // 100 MB أقصى حجم
    cleanupOnQRRequest: true, // تنظيف تلقائي عند طلب QR
    autoCleanupSchedule: '0 3 * * *', // كل يوم الساعة 3 صباحاً
  },

  // إعدادات الاتصال
  connection: {
    connectTimeout: 60000, // دقيقة
    keepAliveInterval: 30000, // 30 ثانية
    defaultQueryTimeout: 60000, // دقيقة
    maxReconnectAttempts: 3,
    reconnectDelay: 5000, // 5 ثوان
    healthCheckInterval: 60000, // دقيقة
  },

  // إعدادات الرسائل
  messaging: {
    maxRetryAttempts: 3,
    retryDelay: 2000, // ثانيتان
    messageTimeout: 30000, // 30 ثانية
    maxConcurrentMessages: 5, // أقصى عدد رسائل متزامنة
    rateLimitDelay: 1000, // ثانية واحدة بين الرسائل
  },

  // إعدادات المراقبة
  monitoring: {
    healthCheckInterval: 60000, // دقيقة
    diskUsageCheckInterval: 3600000, // ساعة
    maxLogFileSize: 10 * 1024 * 1024, // 10 MB
    logRetentionDays: 7, // 7 أيام
    enableDetailedLogging: true,
  },

  // إعدادات الأمان
  security: {
    validateSessionFiles: true,
    encryptSensitiveData: false, // يمكن تفعيلها لاحقاً
    maxFailedAttempts: 5,
    lockoutDuration: 300000, // 5 دقائق
    auditAllOperations: true,
  },

  // رسائل الخطأ المترجمة
  errorMessages: {
    CONNECTION_FAILED: 'فشل في الاتصال بـ WhatsApp',
    SESSION_CORRUPTED: 'ملفات الجلسة معطوبة',
    UNAUTHORIZED: 'غير مصرح بالوصول',
    RATE_LIMITED: 'تم تجاوز حد الإرسال',
    PROCESS_CRASHED: 'تعطل عملية WhatsApp',
    TIMEOUT: 'انتهت مهلة الاتصال',
    INVALID_PHONE: 'رقم هاتف غير صحيح',
    MESSAGE_FAILED: 'فشل في إرسال الرسالة',
    QR_GENERATION_FAILED: 'فشل في توليد QR Code',
    SESSION_CLEANUP_FAILED: 'فشل في تنظيف الجلسات',
  },

  // رسائل النجاح
  successMessages: {
    CONNECTION_ESTABLISHED: 'تم الاتصال بـ WhatsApp بنجاح',
    MESSAGE_SENT: 'تم إرسال الرسالة بنجاح',
    SESSION_CLEANED: 'تم تنظيف الجلسات بنجاح',
    QR_GENERATED: 'تم توليد QR Code بنجاح',
    RESTART_SUCCESSFUL: 'تم إعادة التشغيل بنجاح',
    LOGOUT_SUCCESSFUL: 'تم تسجيل الخروج بنجاح',
  },

  // أنواع الأخطاء القابلة للإصلاح
  recoverableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'CONNECTION_LOST',
    'RESTART_REQUIRED',
  ],

  // أنواع الأخطاء التي تتطلب تنظيف الجلسة
  sessionCleanupErrors: [
    'UNAUTHORIZED',
    'BAD_SESSION',
    'FORBIDDEN',
    'LOGGED_OUT',
  ],

  // إعدادات الأداء
  performance: {
    enableProcessPooling: false, // مجموعة عمليات (للمستقبل)
    maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
    garbageCollectionInterval: 300000, // 5 دقائق
    enableCaching: true,
    cacheExpiry: 300000, // 5 دقائق
  },

  // إعدادات التطوير
  development: {
    enableDebugMode: process.env.NODE_ENV === 'development',
    mockMode: false, // وضع المحاكاة للاختبار
    skipQRGeneration: false,
    simulateErrors: false,
    verboseLogging: process.env.NODE_ENV === 'development',
  }
};

// دالة للحصول على التكوين مع دعم متغيرات البيئة
export function getWhatsAppConfig() {
  return {
    ...WhatsAppConfig,
    process: {
      ...WhatsAppConfig.process,
      maxRestartAttempts: parseInt(process.env.WHATSAPP_MAX_RESTART_ATTEMPTS) || WhatsAppConfig.process.maxRestartAttempts,
      restartDelay: parseInt(process.env.WHATSAPP_RESTART_DELAY) || WhatsAppConfig.process.restartDelay,
    },
    session: {
      ...WhatsAppConfig.session,
      authDir: process.env.WHATSAPP_AUTH_DIR || WhatsAppConfig.session.authDir,
      cleanupOnQRRequest: process.env.WHATSAPP_CLEANUP_ON_QR === 'true' || WhatsAppConfig.session.cleanupOnQRRequest,
    },
    development: {
      ...WhatsAppConfig.development,
      enableDebugMode: process.env.NODE_ENV === 'development',
      verboseLogging: process.env.WHATSAPP_VERBOSE_LOGGING === 'true' || (process.env.NODE_ENV === 'development'),
    }
  };
}

// نوع TypeScript للتكوين
export type WhatsAppConfigType = typeof WhatsAppConfig;
