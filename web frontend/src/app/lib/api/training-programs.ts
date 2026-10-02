import { fetchAPI } from '@/lib/api';

export interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Get all training programs
export const getAllPrograms = async (): Promise<ApiResponse<TrainingProgram[]>> => {
  try {
    const response = await fetchAPI('/training-programs');
    return response;
  } catch (error) {
    console.error('Error fetching training programs:', error);
    throw error;
  }
};

// Get program by ID
export const getProgramById = async (id: number): Promise<ApiResponse<TrainingProgram>> => {
  try {
    const response = await fetchAPI(`/training-programs/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching training program:', error);
    throw error;
  }
};
