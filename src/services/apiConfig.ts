// SOLID Principle: Single Responsibility - Configuration only
export const API_CONFIG = {
  BASE_URL: 'http://10.0.2.2:4000', // Android Emulator host
  ENDPOINTS: {
    TRAINEE_LOGIN: '/api/trainee-auth/login',
    TRAINEE_PROFILE: '/api/trainee-auth/profile',
  },
  TIMEOUT: 10000, // 10 seconds
} as const;
