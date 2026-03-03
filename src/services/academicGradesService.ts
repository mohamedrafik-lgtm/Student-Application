// SOLID Principles Applied:
// 1. Single Responsibility: Handles trainee academic grades API calls only
// 2. Open/Closed: Can be extended without modification
// 3. Dependency Inversion: Depends on API_CONFIG abstraction

import { API_CONFIG } from './apiConfig';
import {
  ReleasedGradesResponse,
  ClassroomGrades,
  TraineeInfo,
  AcademicGradesError,
} from '../types/academicGrades';

/**
 * Service for fetching trainee academic grades
 * Endpoint: GET /api/trainee-grades/{traineeId}/released
 * Header:   Authorization: Bearer {token}
 * Response: { trainee: TraineeInfo, classrooms: ClassroomGrades[] }
 */
export class AcademicGradesService {
  /** Generic HTTP request with timeout & error handling */
  private static async makeRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<any> {
    try {
      console.log(' [AcademicGrades] Request:', url);

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
      console.log(' [AcademicGrades] Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Network request failed',
        }));
        const error: AcademicGradesError = {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };
        console.error(' [AcademicGrades] Error:', JSON.stringify(error));
        throw error;
      }

      const data = await response.json();
      console.log(' [AcademicGrades] Response type:', typeof data, 'isArray:', Array.isArray(data));
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log(' [AcademicGrades] Keys:', Object.keys(data));
      }
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw {
          message: 'انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت.',
          statusCode: 408,
        } as AcademicGradesError;
      }
      if (error.statusCode) throw error;
      throw {
        message: error.message || 'حدث خطأ في الشبكة',
        statusCode: 0,
      } as AcademicGradesError;
    }
  }

  /*  النتائج المعتمدة (Released Grades)  */

  /**
   * GET /api/trainee-grades/{traineeId}/released
   * Authorization: Bearer {token}
   * Returns { trainee, classrooms[] }
   */
  async getReleasedGrades(
    traineeId: number,
    accessToken: string,
  ): Promise<ReleasedGradesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_RELEASED_GRADES}/${traineeId}/released`;
    const raw = await AcademicGradesService.makeRequest(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Extract trainee
    const trainee: TraineeInfo = raw?.trainee ?? {
      id: traineeId,
      nameAr: '',
      nameEn: '',
    };

    // Extract classrooms array
    let classrooms: ClassroomGrades[] = [];
    if (Array.isArray(raw?.classrooms)) {
      classrooms = raw.classrooms;
    } else if (Array.isArray(raw?.data?.classrooms)) {
      classrooms = raw.data.classrooms;
    }

    console.log(' [AcademicGrades] Trainee:', trainee.nameAr, '| Classrooms:', classrooms.length);

    // Debug: log first content item structure
    if (classrooms.length > 0) {
      const firstCR = classrooms[0];
      console.log(' [AcademicGrades] First classroom:', firstCR.classroom?.name, '| Contents:', firstCR.contents?.length);
      console.log(' [AcademicGrades] TotalStats:', JSON.stringify(firstCR.totalStats));
      console.log(' [AcademicGrades] ReleaseInfo:', JSON.stringify(firstCR.releaseInfo));
      if (firstCR.contents?.length > 0) {
        const firstContent = firstCR.contents[0];
        console.log(' [AcademicGrades] First content keys:', Object.keys(firstContent));
        console.log(' [AcademicGrades] First content FULL:', JSON.stringify(firstContent));
      }
    }

    return { trainee, classrooms };
  }
}

// Singleton export
export const academicGradesService = new AcademicGradesService();