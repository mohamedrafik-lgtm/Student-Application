import { fetchAPI } from './api';

export interface TraineeGradeEntry {
  traineeId: number;
  yearWorkMarks?: number;
  practicalMarks?: number;
  writtenMarks?: number;
  attendanceMarks?: number;
  quizzesMarks?: number;
  finalExamMarks?: number;
  notes?: string;
}

export interface BulkUpdateGradesDto {
  trainingContentId: number;
  classroomId: number;
  grades: TraineeGradeEntry[];
}

export interface TraineeForGrades {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photoUrl?: string;
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
    _count: {
      trainingContents: number;
    };
  };
  _count: {
    grades: number;
  };
}

export interface TraineesListResponse {
  data: TraineeForGrades[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TraineeGrade {
  id: number;
  traineeId: number;
  trainingContentId: number;
  classroomId: number;
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
  totalMarks: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TraineeInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  photoUrl?: string;
}

export interface TraineeWithGrade {
  trainee: TraineeInfo;
  grade: TraineeGrade | null;
}

export interface MaxMarks {
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
  total: number;
}

export interface GradesByContentResponse {
  trainingContent: {
    id: number;
    name: string;
    code: string;
    maxMarks: MaxMarks;
  };
  classroom: {
    id: number;
    name: string;
  };
  program: {
    id: number;
    nameAr: string;
  };
  data: TraineeWithGrade[];
}

// الحصول على درجات مادة تدريبية معينة
export async function getGradesByContent(
  contentId: number,
  classroomId: number
): Promise<GradesByContentResponse> {
  return fetchAPI(`/grades/content/${contentId}?classroomId=${classroomId}`);
}

// تحديث درجات بشكل جماعي
export async function bulkUpdateGrades(
  data: BulkUpdateGradesDto
): Promise<{ message: string; count: number }> {
  return fetchAPI('/grades/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// الحصول على درجات متدرب معين
export async function getTraineeGrades(traineeId: number) {
  return fetchAPI(`/grades/trainee/${traineeId}`);
}

// حذف درجة متدرب
export async function deleteGrade(id: number): Promise<{ message: string }> {
  return fetchAPI(`/grades/${id}`, {
    method: 'DELETE',
  });
}

// الحصول على قائمة المتدربين مع pagination
export async function getTraineesForGrades(
  page: number = 1,
  limit: number = 20,
  search?: string,
  programId?: number
): Promise<TraineesListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) params.append('search', search);
  if (programId) params.append('programId', programId.toString());
  
  return fetchAPI(`/grades/trainees?${params.toString()}`);
}

// الحصول على درجات متدرب معين مع تفاصيل كاملة
export async function getTraineeGradesDetailed(traineeId: number) {
  return fetchAPI(`/grades/trainee/${traineeId}`);
}

