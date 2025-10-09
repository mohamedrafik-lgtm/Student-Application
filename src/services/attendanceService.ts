// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles attendance-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  AttendanceRecordsResponse,
  AttendanceError,
} from '../types/attendance';

/**
 * Service class for handling attendance-related API calls
 */
export class AttendanceService {
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

        const error: AttendanceError = {
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
        const timeoutError: AttendanceError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: AttendanceError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * الحصول على سجلات الحضور للمتدرب
   */
  async getAttendanceRecords(accessToken: string): Promise<AttendanceRecordsResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATTENDANCE_RECORDS}`;
    
    console.log('🔍 Attendance Records API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.ATTENDANCE_RECORDS,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await AttendanceService.makeRequest<AttendanceRecordsResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Attendance Records API Response:', {
      success: response.success,
      hasData: !!response.data,
      traineeName: response.data?.trainee?.nameAr,
      attendanceRate: response.data?.stats?.attendanceRate,
      contentGroupsCount: response.data?.contentGroups?.length || 0,
      totalSessions: response.data?.stats?.total
    });

    // التأكد من أن response.data موجود
    if (response.data && !response.data.trainee) {
      console.warn('⚠️ Invalid response structure: missing trainee data');
    }

    if (response.data && !response.data.stats) {
      console.warn('⚠️ Invalid response structure: missing stats');
    }

    if (response.data && (!response.data.contentGroups || !Array.isArray(response.data.contentGroups))) {
      console.warn('⚠️ Invalid response structure: missing or invalid contentGroups array');
      if (response.data) {
        response.data.contentGroups = [];
      }
    }

    return response;
  }
}

// Export a default instance for easier usage
export const attendanceService = new AttendanceService();
