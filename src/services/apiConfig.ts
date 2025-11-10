// SOLID Principles Applied:
// 1. Single Responsibility: This module only handles API configuration
// 2. Open/Closed: Can be extended with new endpoints without modification
// 3. Dependency Inversion: Depends on abstractions (environment) not concretions

import { BranchType } from '../types/auth';

// إعدادات الفروع
export const BRANCH_CONFIG = {
  MANSOURA: {
    id: BranchType.MANSOURA,
    name: 'Mansoura',
    nameAr: 'المنصورة',
    apiUrl: 'https://mansapi.tiba29.com',
    city: 'Mansoura',
    cityAr: 'المنصورة',
    icon: '🏛️',
    color: '#3B82F6',
    description: 'Mansoura Branch - Main Campus',
    descriptionAr: 'فرع المنصورة - المقر الرئيسي'
  },
  ZAGAZIG: {
    id: BranchType.ZAGAZIG,
    name: 'Zagazig',
    nameAr: 'الزقازيق',
    apiUrl: 'https://zagapi.tiba29.com',
    city: 'Zagazig',
    cityAr: 'الزقازيق',
    icon: '🏢',
    color: '#10B981',
    description: 'Zagazig Branch - Secondary Campus',
    descriptionAr: 'فرع الزقازيق - المقر الفرعي'
  }
};

// الحصول على إعدادات الفرع المحدد
export const getBranchConfig = (branch: BranchType) => {
  return BRANCH_CONFIG[branch];
};

// الحصول على جميع الفروع
export const getAllBranches = () => {
  return Object.values(BRANCH_CONFIG);
};

export const API_CONFIG = {
  // Base URL سيتم تحديثه ديناميكياً حسب الفرع المختار
  BASE_URL: '', // سيتم تعيينه من الفرع المختار
  
  // API Endpoints
  ENDPOINTS: {
    TRAINEE_LOGIN: '/api/trainee-auth/login',
    TRAINEE_PROFILE: '/api/trainee-auth/profile',
    VERIFY_TRAINEE: '/api/trainee-auth/verify-trainee',
    VERIFY_PHONE: '/api/trainee-auth/verify-phone',
    CREATE_PASSWORD: '/api/trainee-auth/create-password',
    REQUEST_PASSWORD_RESET: '/api/trainee-auth/request-password-reset',
    VERIFY_RESET_CODE: '/api/trainee-auth/verify-reset-code',
    RESET_PASSWORD: '/api/trainee-auth/reset-password',
    SCHEDULE_SLOT: '/api/schedule/slots',
    MY_SCHEDULE: '/api/trainee-auth/my-schedule',
    MY_GRADES: '/api/trainee-auth/my-grades',
    ATTENDANCE_RECORDS: '/api/trainee-auth/attendance-records',
    AVAILABLE_QUIZZES: '/api/quizzes/trainee/available',
    QUIZ_DETAIL: '/api/quizzes', // + /{quizId}
    START_QUIZ: '/api/quizzes', // + /{quizId}/start
    SUBMIT_QUIZ: '/api/quizzes', // + /{quizId}/submit
    QUIZ_RESULT: '/api/quizzes', // + /{quizId}/result
    TRAINING_CONTENTS: '/api/training-contents',
    LECTURES: '/api/lectures', // + /{contentId} to get lectures for a content
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
};

// تحديث BASE_URL حسب الفرع المختار
export const updateApiBaseUrl = (branch: BranchType) => {
  const branchConfig = getBranchConfig(branch);
  API_CONFIG.BASE_URL = branchConfig.apiUrl;
  return API_CONFIG.BASE_URL;
};