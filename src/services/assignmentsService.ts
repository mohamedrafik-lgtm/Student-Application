// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles assignments API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  Assignment,
  SubmitAssignmentResponse,
  AssignmentsError,
} from '../types/assignments';

/**
 * Service class for handling assignments API calls
 */
export class AssignmentsService {
  /**
   * Make an HTTP request with error handling
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      console.log('🌐 [AssignmentsService] Making request to:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      console.log('📥 [AssignmentsService] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));

        const error: AssignmentsError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };

        console.error('❌ [AssignmentsService] API Error:', error);
        throw error;
      }

      const data = await response.json();
      console.log('✅ [AssignmentsService] Response data received');

      return data;
    } catch (error: any) {
      console.error('❌ [AssignmentsService] Request failed:', error);

      if (error.name === 'AbortError') {
        const timeoutError: AssignmentsError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: AssignmentsError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * جلب جميع مهام المتدرب
   */
  async getMyAssignments(accessToken: string): Promise<Assignment[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_ASSIGNMENTS}`;

    console.log('🔍 [AssignmentsService] Fetching assignments:', { url });

    const data = await AssignmentsService.makeRequest<any>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const assignments: Assignment[] = Array.isArray(data) ? data : [];

    console.log('📡 [AssignmentsService] Assignments count:', assignments.length);

    return assignments;
  }

  /**
   * تسليم مهمة (رفع الحل)
   * ملاحظة: لا نضع Content-Type يدوياً عند استخدام FormData
   */
  async submitAssignment(
    assignmentId: string,
    content: string | null,
    file: { uri: string; name: string; type: string } | null,
    accessToken: string,
  ): Promise<SubmitAssignmentResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUBMIT_ASSIGNMENT}/${assignmentId}/submit`;

    console.log('📤 [AssignmentsService] Submitting assignment:', {
      url,
      assignmentId,
      hasContent: !!content,
      hasFile: !!file,
    });

    const formData = new FormData();
    if (content && content.trim()) {
      formData.append('content', content.trim());
    }
    if (file) {
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name,
      } as any);
    }

    // لا نضع Content-Type — FormData يضيفه تلقائياً مع boundary
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for file upload

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 [AssignmentsService] Submit response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'فشل تسليم المهمة',
        }));
        const error: AssignmentsError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };
        throw error;
      }

      const data = await response.json();
      console.log('✅ [AssignmentsService] Assignment submitted:', data.id);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw {
          message: 'انتهت مهلة رفع الملف. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        } as AssignmentsError;
      }

      if (error.statusCode) {
        throw error;
      }

      throw {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      } as AssignmentsError;
    }
  }
}

// Singleton instance
export const assignmentsService = new AssignmentsService();
