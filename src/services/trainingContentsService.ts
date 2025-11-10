// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles training contents-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  TrainingContentsResponse,
  TrainingContentDetails,
  LecturesResponse,
  TrainingContentsError,
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
   * الحصول على المحتوى التدريبي (المواد الدراسية)
   */
  async getTrainingContents(accessToken: string): Promise<TrainingContentsResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}`;
    
    console.log('🔍 Training Contents API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.TRAINING_CONTENTS,
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
      contentsCount: Array.isArray(response) ? response.length : 0,
      firstContent: Array.isArray(response) && response.length > 0 ? response[0].name : 'No contents',
    });

    return response;
  }

  /**
   * الحصول على تفاصيل مادة تدريبية محددة
   * @param contentId - معرف المادة التدريبية
   * @param accessToken - رمز الوصول
   * @param includeQuestionCount - هل يتم تضمين عدد الأسئلة (اختياري)
   */
  async getTrainingContentDetails(
    contentId: number,
    accessToken: string,
    includeQuestionCount: boolean = false
  ): Promise<TrainingContentDetails> {
    const queryParams = includeQuestionCount ? '?includeQuestionCount=true' : '';
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}/${contentId}${queryParams}`;
    
    console.log('🔍 Training Content Details API Request:', {
      url,
      contentId,
      includeQuestionCount,
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
      contentId: response.id,
      contentName: response.name,
      contentCode: response.code,
      instructorName: response.instructor.name,
      totalMarks: response.yearWorkMarks + response.practicalMarks +
                  response.writtenMarks + response.attendanceMarks +
                  response.quizzesMarks + response.finalExamMarks,
      chaptersCount: response.chaptersCount,
      scheduleSlots: response._count.scheduleSlots,
    });

    return response;
  }

  /**
   * الحصول على المحاضرات الخاصة بمادة تدريبية محددة
   * يتم جلب المحتوى التدريبي أولاً ثم استخراج المحاضرات منه
   * @param contentId - معرف المادة التدريبية
   * @param accessToken - رمز الوصول
   */
  async getLecturesByContent(
    contentId: number,
    accessToken: string
  ): Promise<LecturesResponse> {
    // Get training content details which includes lectures
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}/${contentId}`;
    
    console.log('🔍 Training Content (with lectures) API Request:', {
      url,
      fullUrl: url,
      contentId,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.TRAINING_CONTENTS,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await TrainingContentsService.makeRequest<TrainingContentDetails>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Training Content API Full Response:', response);
    console.log('📡 Response keys:', Object.keys(response));
    console.log('📡 Training Content API Response Summary:', {
      contentId: response.id,
      contentName: response.name,
      contentCode: response.code,
      hasLectures: !!response.lectures,
      lecturesType: typeof response.lectures,
      lecturesIsArray: Array.isArray(response.lectures),
      lecturesCount: response.lectures?.length || 0,
      firstLecture: response.lectures && response.lectures.length > 0 ? response.lectures[0].title : 'No lectures',
      chapters: response.lectures ? [...new Set(response.lectures.map(l => l.chapter))].length : 0,
    });

    // Return lectures array (or empty array if no lectures)
    const lectures = response.lectures || [];
    console.log('📚 Returning lectures:', lectures.length, 'lectures');
    return lectures;
  }
}

// Export a default instance for easier usage
export const trainingContentsService = new TrainingContentsService();

