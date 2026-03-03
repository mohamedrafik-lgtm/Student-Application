// SOLID Principles Applied:
// 1. Single Responsibility: Handles grade appeals API calls only
// 2. Open/Closed: Can be extended without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  TraineeGrade,
  Appeal,
  CreateAppealRequest,
  GradeAppealsError,
} from '../types/gradeAppeals';
import { MercyGradesResponse } from '../types/mercyGrades';

/**
 * Service for grade appeals (تظلمات الدرجات)
 * Endpoints:
 *   GET  /api/trainee-grades/{traineeId}/mercy-grades → جلب درجات الرأفة
 *   GET  /trainee-portal/my-grades   → جلب الدرجات
 *   GET  /trainee-portal/appeals     → جلب التظلمات
 *   POST /trainee-portal/appeals     → تقديم تظلم جديد
 */
export class GradeAppealsService {
  private static async makeRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<any> {
    try {
      console.log('🌐 [GradeAppeals] Request:', url);

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
      console.log('📥 [GradeAppeals] Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));
        const error: GradeAppealsError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };
        console.error('❌ [GradeAppeals] Error:', JSON.stringify(error));
        throw error;
      }

      const data = await response.json();
      console.log('✅ [GradeAppeals] Raw response type:', typeof data, 'isArray:', Array.isArray(data));
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log('✅ [GradeAppeals] Response keys:', Object.keys(data));
      }
      console.log('✅ [GradeAppeals] Raw (first 500 chars):', JSON.stringify(data).substring(0, 500));
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw {
          message: 'انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت.',
          statusCode: 408,
        } as GradeAppealsError;
      }
      if (error.statusCode) throw error;
      throw {
        message: error.message || 'حدث خطأ في الشبكة',
        statusCode: 0,
      } as GradeAppealsError;
    }
  }

  /** Find array from multiple possible response shapes */
  private static extractArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    // { data: [...] }
    if (Array.isArray(data.data)) return data.data;
    // { grades: [...] }
    if (Array.isArray(data.grades)) return data.grades;
    // { results: [...] }
    if (Array.isArray(data.results)) return data.results;
    // { items: [...] }
    if (Array.isArray(data.items)) return data.items;
    // { appeals: [...] }
    if (Array.isArray(data.appeals)) return data.appeals;
    // { data: { grades: [...] } }
    if (data.data && Array.isArray(data.data.grades)) return data.data.grades;
    if (data.data && Array.isArray(data.data.appeals)) return data.data.appeals;
    return [];
  }

  /* ── جلب درجات الرأفة ── */
  async getMercyGrades(traineeId: number, accessToken: string): Promise<MercyGradesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MERCY_GRADES}/${traineeId}/mercy-grades`;
    const data = await GradeAppealsService.makeRequest(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // API returns flat array directly
    const items = Array.isArray(data) ? data : GradeAppealsService.extractArray(data);
    console.log('📊 [MercyGrades] Items count:', items.length);
    if (items.length > 0) {
      console.log('📊 [MercyGrades] First item keys:', Object.keys(items[0]));
      console.log('📊 [MercyGrades] First item:', JSON.stringify(items[0]).substring(0, 300));
    }
    return items as MercyGradesResponse;
  }

  /* ── جلب درجات المتدرب ── */
  async getMyGrades(accessToken: string): Promise<TraineeGrade[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_PORTAL_GRADES}`;
    const data = await GradeAppealsService.makeRequest(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return GradeAppealsService.extractArray(data) as TraineeGrade[];
  }

  /* ── جلب تظلمات المتدرب ── */
  async getMyAppeals(accessToken: string): Promise<Appeal[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_PORTAL_APPEALS}`;
    const data = await GradeAppealsService.makeRequest(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return GradeAppealsService.extractArray(data) as Appeal[];
  }

  /* ── تقديم تظلم جديد ── */
  async submitAppeal(
    body: CreateAppealRequest,
    accessToken: string,
  ): Promise<Appeal> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_PORTAL_APPEALS}`;
    return GradeAppealsService.makeRequest(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    }) as Promise<Appeal>;
  }
}

// Singleton
export const gradeAppealsService = new GradeAppealsService();
