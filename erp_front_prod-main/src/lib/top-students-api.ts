import { fetchAPI } from './api';

export interface TopStudent {
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl?: string;
    program: {
      id: number;
      nameAr: string;
      nameEn: string;
    };
  };
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  subjectsCount: number;
  grades: Array<{
    content: {
      id: number;
      name: string;
      code: string;
    };
    classroom: {
      id: number;
      name: string;
    };
    marks: number;
  }>;
}

export interface ClassroomTopStudents {
  classroom: {
    id: number;
    name: string;
  };
  topStudents: TopStudent[];
}

export async function getTopStudents(
  programId?: number,
  classroomId?: number,
  limit?: number
): Promise<TopStudent[]> {
  const params = new URLSearchParams();
  if (programId) params.append('programId', programId.toString());
  if (classroomId) params.append('classroomId', classroomId.toString());
  if (limit) params.append('limit', limit.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchAPI(`/grades/top-students${query}`);
}

export async function getTopStudentsByClassroom(
  programId?: number,
  limit?: number
): Promise<ClassroomTopStudents[]> {
  const params = new URLSearchParams();
  if (programId) params.append('programId', programId.toString());
  if (limit) params.append('limit', limit.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchAPI(`/grades/top-students-by-classroom${query}`);
}

