// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles grades-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction and implements IGradesService

import { API_CONFIG } from './apiConfig';
import {
  MyGradesResponse,
  GradesError,
} from '../types/grades';
import { IGradesService } from '../interfaces/IGradesService';

/**
 * Service class for handling grades-related API calls
 */
export class GradesService implements IGradesService {
  /**
   * Make an HTTP request with error handling
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      console.log('🌐 Making request to:', url);
      console.log('📤 Request options:', {
        method: options.method || 'GET',
        hasHeaders: !!options.headers,
        hasBody: !!options.body,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        const error: GradesError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };

        console.error('❌ API Error:', error);
        throw error;
      }

      const data = await response.json();
      console.log('✅ Response data received');

      return data;
    } catch (error: any) {
      console.error('❌ Request failed:', error);

      if (error.name === 'AbortError') {
        const timeoutError: GradesError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: GradesError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * الحصول على درجات المتدرب
   */
  async getMyGrades(accessToken: string): Promise<MyGradesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_GRADES}`;
    
    console.log('🔍 My Grades API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.MY_GRADES,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await GradesService.makeRequest<MyGradesResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 My Grades API Response:', {
      success: response.success,
      hasData: !!response.data,
      traineeName: response.data?.trainee?.nameAr,
      overallPercentage: response.data?.overallStats?.percentage,
      classroomsCount: response.data?.classrooms?.length || 0,
      totalContents: response.data?.overallStats?.totalContents
    });

    // التأكد من أن response.data موجود
    if (response.data && !response.data.trainee) {
      console.warn('⚠️ Invalid response structure: missing trainee data');
    }

    if (response.data && !response.data.overallStats) {
      console.warn('⚠️ Invalid response structure: missing overallStats');
    }

    if (response.data && (!response.data.classrooms || !Array.isArray(response.data.classrooms))) {
      console.warn('⚠️ Invalid response structure: missing or invalid classrooms array');
      if (response.data) {
        response.data.classrooms = [];
      }
    }

    return response;
  }
}

// Export a default instance for easier usage
export const gradesService = new GradesService();

