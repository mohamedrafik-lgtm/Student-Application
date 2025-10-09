// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles quiz-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  AvailableQuizzesResponse,
  QuizDetailResponse,
  StartQuizResponse,
  SubmitQuizResponse,
  QuizResultResponse,
  QuizError,
  SubmitQuizRequest,
} from '../types/quizzes';

/**
 * Service class for handling quiz-related API calls
 */
export class QuizService {
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

        const error: QuizError = {
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
        const timeoutError: QuizError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: QuizError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * الحصول على قائمة الاختبارات المتاحة للمتدرب
   */
  async getAvailableQuizzes(accessToken: string): Promise<AvailableQuizzesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AVAILABLE_QUIZZES}`;
    
    console.log('🔍 Available Quizzes API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.AVAILABLE_QUIZZES,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await QuizService.makeRequest<AvailableQuizzesResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Available Quizzes API Response:', {
      success: response.success,
      quizzesCount: response.quizzes?.length || 0,
      quizzesTitles: response.quizzes?.map(q => q.title) || [],
      fullResponse: response
    });

    // التأكد من أن response.quizzes هو array
    if (response.quizzes && !Array.isArray(response.quizzes)) {
      console.warn('⚠️ response.quizzes is not an array:', typeof response.quizzes);
      response.quizzes = [];
    }

    return response;
  }

  /**
   * الحصول على تفاصيل اختبار معين
   */
  async getQuizDetail(quizId: number, accessToken: string): Promise<QuizDetailResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QUIZ_DETAIL}/${quizId}`;
    
    console.log('🔍 Quiz Detail API Request:', {
      url,
      quizId,
      hasToken: !!accessToken
    });

    const response = await QuizService.makeRequest<QuizDetailResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Quiz Detail API Response:', {
      success: response.success,
      quizTitle: response.quiz?.title,
      questionsCount: response.questions?.length || 0
    });

    return response;
  }

  /**
   * بدء اختبار جديد
   */
  async startQuiz(quizId: number, accessToken: string): Promise<StartQuizResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.START_QUIZ}/${quizId}/start`;
    
    console.log('🔍 Start Quiz API Request:', {
      url,
      quizId,
      hasToken: !!accessToken
    });

    const response = await QuizService.makeRequest<StartQuizResponse>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Start Quiz API Response:', {
      success: response.success,
      attemptId: response.attemptId,
      startedAt: response.startedAt
    });

    return response;
  }

  /**
   * إرسال إجابات الاختبار
   */
  async submitQuiz(
    quizId: number,
    submitData: SubmitQuizRequest,
    accessToken: string
  ): Promise<SubmitQuizResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUBMIT_QUIZ}/${quizId}/submit`;
    
    console.log('🔍 Submit Quiz API Request:', {
      url,
      quizId,
      answersCount: submitData.answers.length,
      hasToken: !!accessToken
    });

    const response = await QuizService.makeRequest<SubmitQuizResponse>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(submitData),
    });

    console.log('📡 Submit Quiz API Response:', {
      success: response.success,
      percentage: response.result?.percentage,
      passed: response.result?.passed
    });

    return response;
  }

  /**
   * الحصول على نتيجة اختبار
   */
  async getQuizResult(quizId: number, accessToken: string): Promise<QuizResultResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QUIZ_RESULT}/${quizId}/result`;
    
    console.log('🔍 Quiz Result API Request:', {
      url,
      quizId,
      hasToken: !!accessToken
    });

    const response = await QuizService.makeRequest<QuizResultResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Quiz Result API Response:', {
      success: response.success,
      percentage: response.result?.percentage,
      passed: response.result?.passed
    });

    return response;
  }
}

// Export a default instance for easier usage
export const quizService = new QuizService();

