import { API_CONFIG } from './apiConfig';

// Types
export interface GradeAppeal {
  id: number;
  studentId: number;
  courseId: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  currentGrade: number;
  requestedGrade: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── My Grade Appeals (تظلمات الدرجات) ──
export interface MyGradeAppeal {
  id: number;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reason: string;
  requestedGrade: number | null;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  grade?: {
    id: number;
    score: number;
    examType: 'PAPER_EXAM' | 'PRACTICAL' | 'ORAL' | 'ASSIGNMENT';
    paperExam: {
      id: number;
      title: string;
      totalMarks: number;
      examDate: string;
    } | null;
    lecture: {
      id: number;
      title: string;
      date: string;
    } | null;
  };
  trainee: {
    id: number;
    name: string;
    code: string;
  };
}

export type MyGradeAppealsResponse = MyGradeAppeal[];

export interface AccessCheckResponse {
  canAccess: boolean;
  blockInfo: any | null;
  paymentInfo: any | null;
}

export interface AttendanceSession {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  course: {
    id: number;
    name: string;
  };
}

export interface AttendanceRecord {
  id: number;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  notes: string | null;
  session: AttendanceSession;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

export interface AttendanceResponse {
  attendanceRecords: AttendanceRecord[];
  summary: AttendanceSummary;
}

export interface TraineeGradeRecord {
  id: number;
  traineeId: number;
  courseId: number;
  grade: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  trainee: {
    id: number;
    name: string;
    phone: string;
  };
  course: {
    id: number;
    name: string;
  };
}

export interface TraineeGradesResponse {
  data: TraineeGradeRecord[];
  total: number;
  page: number;
  limit: number;
}

// ── Real API types for /api/trainee-auth/my-grades ──
export type GradeType = 'WRITTEN' | 'ORAL' | 'PRACTICAL' | 'ATTENDANCE' | 'MERCY';

export interface MyGradeItem {
  id: number;
  score: number;
  maxScore: number;
  percentage: number;
  gradeType: GradeType;
  isReleased: boolean;
  notes: string | null;
  trainingContent: {
    id: number;
    name: string;
    classroom: {
      id: number;
      name: string;
    };
  };
  paperExam: {
    id: number;
    title: string;
    examDate: string;
    totalMarks: number;
  } | null;
}

export interface MyGradesTrainee {
  id: number;
  nameAr: string;
  nameEn: string;
  code: string;
  phone: string;
}

export interface MyGradesSummary {
  totalScore: number;
  totalMaxScore: number;
  totalPercentage: number;
  passedSubjects: number;
  failedSubjects: number;
}

export interface MyGradesApiResponse {
  trainee: MyGradesTrainee;
  grades: MyGradeItem[];
  summary: MyGradesSummary;
}

// ── Grade Appeals list response ──
export interface GradeAppealItem {
  id: number;
  status: string;
  reason: string;
  requestedGrade: number | null;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  grade?: {
    id: number;
    score: number;
    maxScore?: number;
    gradeType?: string;
    trainingContent?: {
      id: number;
      name: string;
    };
    paperExam?: {
      id: number;
      title: string;
      totalMarks: number;
      examDate: string;
    } | null;
  };
  trainee?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface MyGradeAppealsListResponse {
  data: GradeAppealItem[];
  total: number;
}

export class HomeService {
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
        throw {
          message: errorData.message || `HTTP Error: ${response.status}`,
          statusCode: response.status,
          details: errorData,
        };
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw { message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى', statusCode: 0 };
      }
      if (error.statusCode) {
        throw error;
      }
      throw { message: error.message || 'حدث خطأ غير متوقع', statusCode: 0 };
    }
  }

  static async getGradeAppeals(accessToken: string): Promise<GradeAppeal[]> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRADE_APPEALS}`;
    return this.makeRequest<GradeAppeal[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  static async getAppealsStatus(accessToken: string): Promise<{ acceptGradeAppeals: boolean }> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRADE_APPEALS_STATUS}`;
    return this.makeRequest<{ acceptGradeAppeals: boolean }>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  static async getMyGradeAppeals(accessToken: string): Promise<any> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRADE_APPEALS}`;
    return this.makeRequest<any>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  static async createGradeAppeal(
    accessToken: string,
    data: { gradeId: number; reason: string; requestedGrade?: number },
  ): Promise<any> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_GRADE_APPEAL}`;
    return this.makeRequest<any>(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  static async checkAccess(accessToken: string): Promise<AccessCheckResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACCESS_CHECK}`;
    return this.makeRequest<AccessCheckResponse>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  static async getAttendanceRecords(accessToken: string): Promise<AttendanceResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATTENDANCE_RECORDS}`;
    return this.makeRequest<AttendanceResponse>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  static async verifyAttendanceCode(accessToken: string, code: string): Promise<any> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERIFY_ATTENDANCE_CODE}`;
    return this.makeRequest<any>(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
  }

  static async getTraineeGrades(accessToken: string, traineeId: number): Promise<TraineeGradesResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINEE_GRADES}/${traineeId}`;
    return this.makeRequest<TraineeGradesResponse>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /** GET /api/trainee-auth/my-grades — real endpoint */
  static async getMyGrades(accessToken: string): Promise<MyGradesApiResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_GRADES}`;
    return this.makeRequest<MyGradesApiResponse>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
