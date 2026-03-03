// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles survey-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  MySurveysResponse,
  Survey,
  SubmitSurveyRequest,
  SubmitSurveyResponse,
  SurveyError,
} from '../types/surveys';

/**
 * Service class for handling survey-related API calls
 */
export class SurveyService {
  /**
   * Make an HTTP request with error handling
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      console.log('🌐 [SurveyService] Making request to:', url);
      console.log('📤 [SurveyService] Request options:', {
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

      console.log('📥 [SurveyService] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        const error: SurveyError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };

        console.error('❌ [SurveyService] API Error:', error);
        throw error;
      }

      const data = await response.json();
      console.log('✅ [SurveyService] Response data received');

      return data;
    } catch (error: any) {
      console.error('❌ [SurveyService] Request failed:', error);

      if (error.name === 'AbortError') {
        const timeoutError: SurveyError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: SurveyError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * جلب الاستبيانات المتاحة للمتدرب
   */
  async getMySurveys(accessToken: string): Promise<Survey[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_SURVEYS}`;

    console.log('🔍 [SurveyService] My Surveys API Request:', {
      url,
      hasToken: !!accessToken,
    });

    const data = await SurveyService.makeRequest<any>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // التحقق: إذا لم يكن الـ response مصفوفة، عامله كمصفوفة فارغة
    const surveys: Survey[] = Array.isArray(data) ? data : [];

    console.log('📡 [SurveyService] My Surveys Response:', {
      count: surveys.length,
      titles: surveys.map(s => s.title),
    });

    return surveys;
  }

  /**
   * إرسال إجابات الاستبيان
   */
  async submitSurvey(
    surveyId: string,
    body: SubmitSurveyRequest,
    accessToken: string,
  ): Promise<SubmitSurveyResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUBMIT_SURVEY}/${surveyId}/submit`;

    console.log('📝 [SurveyService] Submit Survey API Request:', {
      url,
      surveyId,
      answersCount: body.answers.length,
    });

    const response = await SurveyService.makeRequest<SubmitSurveyResponse>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log('✅ [SurveyService] Submit Survey Response:', response);

    return response;
  }
}

// Singleton instance
export const surveyService = new SurveyService();
