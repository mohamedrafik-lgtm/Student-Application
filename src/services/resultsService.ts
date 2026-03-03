// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles exam results API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  ExamResult,
  ResultsError,
} from '../types/results';

/**
 * Service class for handling exam results API calls
 */
export class ResultsService {
  /**
   * Make an HTTP request with error handling
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      console.log('🌐 [ResultsService] Making request to:', url);

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

      console.log('📥 [ResultsService] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        const error: ResultsError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };

        console.error('❌ [ResultsService] API Error:', error);
        throw error;
      }

      const data = await response.json();
      console.log('✅ [ResultsService] Response data received');

      return data;
    } catch (error: any) {
      console.error('❌ [ResultsService] Request failed:', error);

      if (error.name === 'AbortError') {
        const timeoutError: ResultsError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: ResultsError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * جلب نتائج الاختبارات للمتدرب
   */
  async getMyResults(accessToken: string): Promise<ExamResult[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_RESULTS}`;

    console.log('🔍 [ResultsService] My Results API Request:', {
      url,
      hasToken: !!accessToken,
    });

    const data = await ResultsService.makeRequest<any>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // التحقق: إذا لم يكن الـ response مصفوفة، عامله كمصفوفة فارغة
    const results: ExamResult[] = Array.isArray(data) ? data : [];

    console.log('📡 [ResultsService] My Results Response:', {
      count: results.length,
      titles: results.map(r => r.exam?.title),
    });

    return results;
  }
}

// Singleton instance
export const resultsService = new ResultsService();
