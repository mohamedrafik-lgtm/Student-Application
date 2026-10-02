// src/lib/logger.ts
// نظام Logging ذكي - يعمل فقط في Development

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // الأخطاء تظهر دائماً
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Helper للـ Auth logging
export const authLogger = {
  log: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[Auth] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[Auth Error] ${message}`, ...args);
  }
};

// Helper للـ API logging
export const apiLogger = {
  log: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[API] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[API Error] ${message}`, ...args);
  }
};
