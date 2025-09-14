// SOLID Principle: Single Responsibility - Configuration only
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000', // يمكنك تغيير هذا حسب عنوان الخادم الخاص بك
  ENDPOINTS: {
    TRAINEE_LOGIN: '/api/trainee-auth/login',
  },
  TIMEOUT: 10000, // 10 seconds
} as const;
