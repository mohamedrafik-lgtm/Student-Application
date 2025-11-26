// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles training contents-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  TrainingContentsResponse,
  TrainingContentsError,
  TrainingContentDetails,
} from '../types/trainingContents';

/**
 * Service class for handling training contents-related API calls
 */
export class TrainingContentsService {
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

      // التحقق من أن BASE_URL محدد
      if (!API_CONFIG.BASE_URL) {
        throw new Error('لم يتم تحديد فرع. يرجى اختيار فرع أولاً');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        const error: TrainingContentsError = {
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
        const timeoutError: TrainingContentsError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: TrainingContentsError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * الحصول على المحتوى التدريبي (المواد الدراسية) حسب البرنامج
   * @param programId معرف البرنامج التدريبي
   * @param accessToken رمز الوصول
   */
  async getTrainingContents(programId: number, accessToken: string): Promise<TrainingContentsResponse> {
    // إضافة programId كـ query parameter
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}?programId=${programId}`;
    
    console.log('🔍 Training Contents API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.TRAINING_CONTENTS,
      programId,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await TrainingContentsService.makeRequest<TrainingContentsResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Training Contents API Response:', {
      success: Array.isArray(response),
      contentsCount: response.length || 0,
      firstContent: response.length > 0 ? response[0].name : 'No contents',
    });

    return response;
  }

  /**
   * الحصول على تفاصيل مادة دراسية معينة مع جميع المحاضرات
   * @param contentId معرف المادة الدراسية
   * @param accessToken رمز الوصول
   */
  async getTrainingContentDetails(contentId: number, accessToken: string): Promise<TrainingContentDetails> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}/${contentId}`;
    
    console.log('🔍 Training Content Details API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.TRAINING_CONTENTS,
      contentId,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await TrainingContentsService.makeRequest<TrainingContentDetails>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Training Content Details API Response:', {
      id: response.id,
      name: response.name,
      code: response.code,
      chaptersCount: response.chaptersCount,
      scheduleSlotsCount: response._count.scheduleSlots,
    });

    return response;
  }
}

// Export a default instance for easier usage
export const trainingContentsService = new TrainingContentsService();
