import { fetchAPI } from './api';

export enum DistributionType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL',
}

export interface CreateDistributionDto {
  programId: number;
  type: DistributionType;
  numberOfRooms: number;
  roomCapacities?: number[]; // سعة كل مجموعة (اختياري)
  classroomId?: number; // الفصل الدراسي (اختياري)
}

export interface UpdateDistributionDto {
  numberOfRooms?: number;
}

export interface CreateAssignmentDto {
  roomId: string;
  traineeId: number;
  notes?: string;
}

export interface UpdateAssignmentDto {
  roomId: string;
  notes?: string;
}

export interface TraineeDistribution {
  id: string;
  programId: number;
  type: DistributionType;
  numberOfRooms: number;
  academicYear: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  classroomId?: number | null;
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  classroom?: {
    id: number;
    name: string;
    classNumber: number;
    startDate: string | null;
    endDate: string | null;
  } | null;
  rooms: DistributionRoom[];
  _count?: {
    rooms: number;
  };
}

export interface DistributionRoom {
  id: string;
  distributionId: string;
  roomName: string;
  roomNumber: number;
  capacity?: number;
  createdAt: string;
  updatedAt: string;
  assignments?: DistributionAssignment[];
  _count?: {
    assignments: number;
  };
}

export interface DistributionAssignment {
  id: string;
  roomId: string;
  traineeId: number;
  orderNumber: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    phone: string;
    guardianPhone?: string;
    email?: string;
    photo?: string;
  };
}

/**
 * إنشاء توزيع جديد
 */
export async function createDistribution(data: CreateDistributionDto): Promise<TraineeDistribution> {
  return fetchAPI('/trainee-distribution', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * جلب جميع التوزيعات
 */
export async function getDistributions(filters?: {
  programId?: number;
  type?: DistributionType;
  academicYear?: string;
  classroomId?: number;
}): Promise<TraineeDistribution[]> {
  const params = new URLSearchParams();
  if (filters?.programId) params.append('programId', filters.programId.toString());
  if (filters?.type) params.append('type', filters.type);
  if (filters?.academicYear) params.append('academicYear', filters.academicYear);
  if (filters?.classroomId !== undefined) params.append('classroomId', filters.classroomId.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchAPI(`/trainee-distribution${query}`);
}

/**
 * جلب التوزيعات المفعلة/النشطة حسب تاريخ الفصل الدراسي
 */
export async function getActiveDistributions(programId: number): Promise<TraineeDistribution[]> {
  return fetchAPI(`/trainee-distribution/active/${programId}`);
}

/**
 * جلب توزيع محدد
 */
export async function getDistribution(id: string): Promise<TraineeDistribution> {
  return fetchAPI(`/trainee-distribution/${id}`);
}

/**
 * تحديث توزيع
 */
export async function updateDistribution(
  id: string,
  data: UpdateDistributionDto
): Promise<TraineeDistribution> {
  return fetchAPI(`/trainee-distribution/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * حذف توزيع
 */
export async function deleteDistribution(id: string): Promise<{ message: string }> {
  return fetchAPI(`/trainee-distribution/${id}`, {
    method: 'DELETE',
  });
}

/**
 * إضافة متدرب إلى مجموعة لأول مرة
 */
export async function createAssignment(
  data: CreateAssignmentDto
): Promise<DistributionAssignment> {
  return fetchAPI('/trainee-distribution/assignment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * تحديث تخصيص متدرب (نقله إلى مجموعة أخرى)
 */
export async function updateAssignment(
  assignmentId: string,
  data: UpdateAssignmentDto
): Promise<DistributionAssignment> {
  return fetchAPI(`/trainee-distribution/assignment/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * إعادة توزيع المتدربين تلقائياً
 */
export async function redistributeTrainees(id: string): Promise<TraineeDistribution> {
  return fetchAPI(`/trainee-distribution/${id}/redistribute`, {
    method: 'POST',
  });
}

/**
 * تحديث اسم مجموعة
 */
export async function updateRoomName(roomId: string, roomName: string): Promise<DistributionRoom> {
  return fetchAPI(`/trainee-distribution/room/${roomId}`, {
    method: 'PATCH',
    body: JSON.stringify({ roomName }),
  });
}

/**
 * نسخ توزيعة إلى فصل دراسي آخر
 */
export async function copyDistribution(sourceId: string, classroomId: number): Promise<TraineeDistribution> {
  return fetchAPI(`/trainee-distribution/${sourceId}/copy`, {
    method: 'POST',
    body: JSON.stringify({ classroomId }),
  });
}
