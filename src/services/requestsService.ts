// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles requests-related API calls
// 2. Open/Closed: Can be extended with new methods without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction and implements IRequestsService

import { API_CONFIG } from './apiConfig';
import {
  RequestsListResponse,
  CreateRequestResponse,
  CreateRequestDto,
  CreateTraineeRequestDto,
  RequestDetailsResponse,
  RequestError,
} from '../types/requests';
import { IRequestsService } from '../interfaces/IRequestsService';

/**
 * Service class for handling requests-related API calls
 */
export class RequestsService implements IRequestsService {
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

        const error: RequestError = {
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
        const timeoutError: RequestError = {
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          statusCode: 0,
        };
        throw timeoutError;
      }

      if (error.statusCode) {
        throw error;
      }

      const networkError: RequestError = {
        message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت',
        statusCode: 0,
      };
      throw networkError;
    }
  }

  /**
   * الحصول على قائمة طلبات تأجيل السداد للمتدرب
   * الـ API يستخرج traineeId من الـ Bearer token تلقائياً
   */
  async getMyRequests(accessToken: string): Promise<RequestsListResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_REQUESTS}`;
    
    console.log('🔍 Payment Deferral Requests API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.MY_REQUESTS,
      note: 'traineeId extracted from Bearer token automatically',
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });

    const response = await RequestsService.makeRequest<RequestsListResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 My Requests API Response:', {
      isArray: Array.isArray(response),
      requestsCount: Array.isArray(response) ? response.length : 0,
      firstRequest: Array.isArray(response) && response.length > 0 ? response[0] : null
    });

    return response;
  }

  /**
   * الحصول على قائمة طلبات تأجيل السداد
   */
  async getMyDeferralRequests(accessToken: string): Promise<any[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_DEFERRAL_REQUESTS}`;
    
    console.log('🔍 My Deferral Requests API Request:', {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      endpoint: API_CONFIG.ENDPOINTS.MY_DEFERRAL_REQUESTS,
      hasToken: !!accessToken
    });

    const response = await RequestsService.makeRequest<any[]>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 My Deferral Requests API Response:', {
      isArray: Array.isArray(response),
      requestsCount: Array.isArray(response) ? response.length : 0
    });

    return response;
  }

  /**
   * إنشاء طلب متدرب جديد (تأجيل اختبار، إجازة مرضية، إلخ)
   */
  async createTraineeRequest(
    requestData: CreateTraineeRequestDto,
    accessToken: string
  ): Promise<CreateRequestResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_TRAINEE_REQUEST}`;
    
    console.log('🔍 Create Trainee Request API Request:', {
      url,
      requestType: requestData.type,
      hasToken: !!accessToken
    });

    const response = await RequestsService.makeRequest<CreateRequestResponse>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestData),
    });

    console.log('📡 Create Trainee Request API Response:', {
      success: response.success,
      requestId: response.request?.id,
      message: response.message
    });

    return response;
  }

  /**
   * إنشاء طلب تأجيل سداد (deprecated - استخدم createTraineeRequest)
   */
  async createRequest(
    requestData: CreateRequestDto,
    accessToken: string
  ): Promise<CreateRequestResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_TRAINEE_REQUEST}`;
    
    console.log('🔍 Create Request API Request:', {
      url,
      requestType: requestData.type,
      title: requestData.title,
      hasToken: !!accessToken
    });

    const response = await RequestsService.makeRequest<CreateRequestResponse>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestData),
    });

    console.log('📡 Create Request API Response:', {
      success: response.success,
      requestId: response.request?.id,
      message: response.message
    });

    return response;
  }

  /**
   * الحصول على تفاصيل طلب معين
   */
  async getRequestDetails(
    requestId: number,
    accessToken: string
  ): Promise<RequestDetailsResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUEST_DETAILS}/${requestId}`;
    
    console.log('🔍 Request Details API Request:', {
      url,
      requestId,
      hasToken: !!accessToken
    });

    const response = await RequestsService.makeRequest<RequestDetailsResponse>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('📡 Request Details API Response:', {
      success: response.success,
      requestId: response.request?.id,
      requestStatus: response.request?.status
    });

    return response;
  }
}

// Export a default instance for easier usage
export const requestsService = new RequestsService();