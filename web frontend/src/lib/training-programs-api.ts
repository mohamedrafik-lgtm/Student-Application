import { fetchAPI } from './api';

export interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

class TrainingProgramsAPI {
  private baseUrl = '/training-programs';

  // الحصول على جميع البرامج التدريبية
  async getAll(): Promise<TrainingProgram[]> {
    const response = await fetchAPI(this.baseUrl);
    return response.programs || response;
  }

  // الحصول على برنامج بالمعرف
  async getById(id: number): Promise<TrainingProgram> {
    const response = await fetchAPI(`${this.baseUrl}/${id}`);
    return response.program || response;
  }
}

export const trainingProgramsAPI = new TrainingProgramsAPI();
