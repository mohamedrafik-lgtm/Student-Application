// SOLID Principle: Single Responsibility - Configuration only
export const API_CONFIG = {
  BASE_URL: 'http://10.0.2.2:4000', // Android Emulator host
  ENDPOINTS: {
    TRAINEE_LOGIN: '/api/trainee-auth/login',
    TRAINEE_PROFILE: '/api/trainee-auth/profile',
    VERIFY_TRAINEE: '/api/trainee-auth/verify-trainee',
    VERIFY_PHONE: '/api/trainee-auth/verify-phone',
    CREATE_PASSWORD: '/api/trainee-auth/create-password',
    REQUEST_PASSWORD_RESET: '/api/trainee-auth/request-password-reset',
    VERIFY_RESET_CODE: '/api/trainee-auth/verify-reset-code',
    RESET_PASSWORD: '/api/trainee-auth/reset-password',
  },
  TIMEOUT: 10000, // 10 seconds
} as const;
