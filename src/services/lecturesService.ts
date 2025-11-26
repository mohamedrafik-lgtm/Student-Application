// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles lectures-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  LecturesResponse,
  LectureDetails,
  TrainingContentsError,
} from '../types/trainingContents';

/**
 * Service class for handling lectures-related API calls
 */
export class LecturesService {
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
   * الحصول على محاضرات مادة دراسية معينة
   * @param contentId معرف المادة الدراسية
   * @param accessToken رمز الوصول
   */
  async getContentLectures(contentId: number, accessToken: string): Promise<LecturesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTENT_LECTURES}/${contentId}`;
    
    console.log('🔍 Content Lectures API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.CONTENT_LECTURES,
      contentId,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await LecturesService.makeRequest<LecturesResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Content Lectures API Response:', {
      success: Array.isArray(response),
      lecturesCount: response.length || 0,
      chapters: response.length > 0 ? [...new Set(response.map(l => l.chapter))].sort() : [],
      firstLecture: response.length > 0 ? response[0].title : 'No lectures',
    });

    return response;
  }

  /**
   * الحصول على تفاصيل محاضرة معينة
   * @param lectureId معرف المحاضرة
   * @param accessToken رمز الوصول
   */
  async getLectureDetails(lectureId: number, accessToken: string): Promise<LectureDetails> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LECTURE_DETAILS}/${lectureId}`;
    
    console.log('🔍 Lecture Details API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.LECTURE_DETAILS,
      lectureId,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await LecturesService.makeRequest<LectureDetails>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Lecture Details API Response:', {
      id: response.id,
      title: response.title,
      type: response.type,
      chapter: response.chapter,
      hasYoutubeUrl: !!response.youtubeUrl,
      hasPdfFile: !!response.pdfFile,
    });

    return response;
  }
}

// Export a default instance for easier usage
export const lecturesService = new LecturesService();