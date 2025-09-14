// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles authentication API calls
// 2. Dependency Inversion: Depends on abstractions (interfaces) not concretions
// 3. Open/Closed: Can be extended with new auth methods without modification

import {
  TraineeLoginRequest,
  TraineeLoginResponse,
  TraineeLoginError,
  TraineeProfileResponse,
  VerifyTraineeDto,
  VerifyTraineeResponse,
  VerifyPhoneDto,
  VerifyPhoneResponse,
  CreatePasswordDto,
  CreatePasswordResponse,
  RequestPasswordResetDto,
  RequestPasswordResetResponse,
  VerifyResetCodeDto,
  VerifyResetCodeResponse,
  ResetPasswordDto,
  ResetPasswordResponse
} from '../types/auth';
import { API_CONFIG } from './apiConfig';

export class AuthService {
  private static async makeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    try {
      console.log('🚀 Making API request to:', url);
      console.log('📤 Request data:', options.body);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('📥 Response text:', text);
        throw {
          statusCode: response.status,
          message: `استجابة غير صحيحة من الخادم: ${text}`,
          error: 'INVALID_RESPONSE',
        } as TraineeLoginError;
      }

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        throw {
          statusCode: response.status,
          message: data.message || data.error || 'حدث خطأ في الخادم',
          error: data.error || 'SERVER_ERROR',
        } as TraineeLoginError;
      }

      return data;
    } catch (error) {
      console.error('❌ API Error:', error);

      // Handle network errors
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw {
          statusCode: 0,
          message: 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وعنوان الخادم.',
          error: 'NETWORK_ERROR',
        } as TraineeLoginError;
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          statusCode: 408,
          message: 'انتهت مهلة الاتصال. حاول مرة أخرى.',
          error: 'TIMEOUT_ERROR',
        } as TraineeLoginError;
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw {
          statusCode: 0,
          message: 'خطأ في تحليل استجابة الخادم. تحقق من إعدادات الخادم.',
          error: 'JSON_PARSE_ERROR',
        } as TraineeLoginError;
      }

      // Re-throw API errors
      throw error;
    }
  }

  static async login(credentials: TraineeLoginRequest): Promise<TraineeLoginResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_LOGIN}`;
    
    return this.makeRequest<TraineeLoginResponse>(url, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  static async getProfile(accessToken: string): Promise<TraineeProfileResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_PROFILE}`;
    
    return this.makeRequest<TraineeProfileResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }

  // التحقق من بيانات المتدرب
  static async verifyTrainee(data: VerifyTraineeDto): Promise<VerifyTraineeResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_TRAINEE}`;
    return this.makeRequest<VerifyTraineeResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // التحقق من رقم الهاتف
  static async verifyPhone(data: VerifyPhoneDto): Promise<VerifyPhoneResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_PHONE}`;
    return this.makeRequest<VerifyPhoneResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // إنشاء كلمة مرور جديدة
  static async createPassword(data: CreatePasswordDto): Promise<CreatePasswordResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_PASSWORD}`;
    return this.makeRequest<CreatePasswordResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // طلب إعادة تعيين كلمة المرور
  static async requestPasswordReset(data: RequestPasswordResetDto): Promise<RequestPasswordResetResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUEST_PASSWORD_RESET}`;
    return this.makeRequest<RequestPasswordResetResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // التحقق من كود إعادة التعيين
  static async verifyResetCode(data: VerifyResetCodeDto): Promise<VerifyResetCodeResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_RESET_CODE}`;
    return this.makeRequest<VerifyResetCodeResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // إعادة تعيين كلمة المرور
  static async resetPassword(data: ResetPasswordDto): Promise<ResetPasswordResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`;
    return this.makeRequest<ResetPasswordResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }
}

// Export a default instance for easier usage
export const authService = new AuthService();
