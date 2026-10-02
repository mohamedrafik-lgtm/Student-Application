// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles training-distribution API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction
//
// Mirrors the web implementation (web frontend/src/lib/trainee-api.ts):
//   getAvailableDistributions() -> GET  /api/trainee-platform/distributions
//   joinDistributionRoom(id)    -> POST /api/trainee-platform/distributions/rooms/{id}/join

import { API_CONFIG } from './apiConfig';
import {
  AvailableDistribution,
  JoinDistributionResponse,
  DistributionError,
} from '../types/distributions';

/**
 * Service class for handling training-distribution API calls
 */
export class DistributionService {
  /**
   * Make an HTTP request with unified error handling
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        // الباك-إند يُرجع رسائل عربية جاهزة (BadRequestException / NotFoundException)
        // مثل: "هذه المجموعة ممتلئة" / "انتهت فترة التسجيل"
        const rawMessage = errorData?.message;
        const message = Array.isArray(rawMessage)
          ? rawMessage[0]
          : rawMessage || `HTTP Error: ${response.status}`;

        const error: DistributionError = {
          message,
          statusCode: response.status,
          details: errorData,
        };

        throw error;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      // خطأ قادم من الباك-إند (يحمل statusCode) — مرّره كما هو
      if (error?.statusCode) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        const timeoutError: DistributionError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      const networkError: DistributionError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * جلب التوزيعات المتاحة للتسجيل الذاتي
   */
  async getAvailableDistributions(
    accessToken: string,
  ): Promise<AvailableDistribution[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DISTRIBUTIONS}`;

    const data = await DistributionService.makeRequest<any>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // حماية: إذا لم يرجع الباك-إند مصفوفة، اعتبره فارغاً
    return Array.isArray(data) ? (data as AvailableDistribution[]) : [];
  }

  /**
   * الانضمام لمجموعة (قاعة) داخل توزيع — أو الانتقال لمجموعة أخرى
   */
  async joinDistributionRoom(
    roomId: string,
    accessToken: string,
  ): Promise<JoinDistributionResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOIN_DISTRIBUTION_ROOM}/${roomId}/join`;

    return DistributionService.makeRequest<JoinDistributionResponse>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

// Singleton instance
export const distributionService = new DistributionService();