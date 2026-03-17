import { fetchAPI } from './api';

export interface TraineeWithAttendance {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  email?: string;
  phone: string;
  photoUrl?: string;
  program: {
    id: number;
    nameAr: string;
  };
  attendanceStats: {
    present: number;
    absent: number;
  };
}

export interface TraineeAttendanceQuery {
  page?: number;
  limit?: number;
  search?: string;
  programId?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// جلب قائمة المتدربين مع عدد سجلات الحضور
export async function getTraineesWithAttendance(query: TraineeAttendanceQuery): Promise<PaginatedResponse<TraineeWithAttendance>> {
  const params = new URLSearchParams();
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.search) params.append('search', query.search);
  if (query.programId) params.append('programId', query.programId.toString());

  return fetchAPI(`/attendance/trainees?${params.toString()}`);
}

// جلب سجل حضور متدرب معين
export async function getTraineeAttendanceDetails(traineeId: number) {
  return fetchAPI(`/attendance/trainee/${traineeId}`);
}

