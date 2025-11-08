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
    if (!API_CONFIG.BASE_URL) {
      const cfgError: AttendanceError = {
        message: 'BASE_URL for API is not configured. Ensure a branch is selected or API base URL is set.',
        statusCode: 0,
      };
      console.error('❌ Attendance request aborted - missing API base URL');
      throw cfgError;
    }

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

    // Normalize different backend shapes: some environments return the wrapped
    // { success, data } object, others return an array of content groups or a single content-group object.
    // Ensure we always return AttendanceRecordsResponse with data.contentGroups as an array.
    const raw: any = response as any;

    // If the response already matches expected wrapper, ensure contentGroups is an array and return
    if (raw && typeof raw.success === 'boolean' && raw.data) {
      if (!raw.data.contentGroups || !Array.isArray(raw.data.contentGroups)) {
        console.warn('⚠️ Normalizing: setting empty contentGroups array on wrapped response');
        raw.data.contentGroups = [];
      }
      return raw as AttendanceRecordsResponse;
    }

    // If the backend returned an array of content groups directly
    let contentGroups: any[] = [];
    if (Array.isArray(raw)) {
      contentGroups = raw;
    } else if (raw && raw.contentGroups && Array.isArray(raw.contentGroups)) {
      contentGroups = raw.contentGroups;
    } else if (raw && raw.content && raw.sessions) {
      // single content-group object -> wrap into array
      contentGroups = [raw];
    }

    // Build minimal overall stats if missing
    const stats = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendanceRate: 0,
    };

    contentGroups.forEach((cg: any) => {
      const s = cg.stats || {};
      const sessionsCount = s.total || (Array.isArray(cg.sessions) ? cg.sessions.length : 0);
      stats.total += sessionsCount;
      stats.present += s.present || 0;
      stats.absent += s.absent || 0;
      stats.late += s.late || 0;
      stats.excused += s.excused || 0;
    });
    if (stats.total > 0) {
      stats.attendanceRate = Math.round((stats.present / stats.total) * 10000) / 100; // one decimal
    }

    // Minimal trainee object if not present
    const trainee = (raw && raw.trainee) ? raw.trainee : { id: 0, nameAr: '', nameEn: '', nationalId: '', photoUrl: null, program: null, classroom: null } as any;

    const normalized: AttendanceRecordsResponse = {
      success: true,
      data: {
        trainee,
        stats,
        contentGroups,
      },
    };

    console.warn('ℹ️ Normalized attendance response shape for UI compatibility');
    return normalized;
  }
}

// Export a default instance for easier usage
export const attendanceService = new AttendanceService();
