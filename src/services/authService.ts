// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles authentication API calls
// 2. Dependency Inversion: Depends on abstractions (interfaces) not concretions
// 3. Open/Closed: Can be extended with new auth methods without modification

import { 
  TraineeLoginRequest, 
  TraineeLoginResponse, 
  TraineeLoginError 
} from '../types/auth';
import { API_CONFIG } from './apiConfig';

export class AuthService {
  private static async makeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: API_CONFIG.TIMEOUT,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          statusCode: response.status,
          message: data.message || 'حدث خطأ في الخادم',
          error: data.error,
        } as TraineeLoginError;
      }

      return data;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw {
          statusCode: 0,
          message: 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.',
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
}

// Export a default instance for easier usage
export const authService = new AuthService();
