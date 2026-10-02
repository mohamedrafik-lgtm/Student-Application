import { apiClient } from './client';

// الحصول على جميع البرامج التدريبية
export const getAllPrograms = async () => {
  const response = await apiClient.get('/programs');
  return response.data;
};

// الحصول على برنامج تدريبي محدد
export const getProgramById = async (id: number) => {
  const response = await apiClient.get(`/programs/${id}`);
  return response.data;
};

// إنشاء برنامج تدريبي جديد
export const createProgram = async (data: {
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
}) => {
  const response = await apiClient.post('/programs', data);
  return response.data;
};

// تحديث برنامج تدريبي
export const updateProgram = async (
  id: number,
  data: {
    nameAr?: string;
    nameEn?: string;
    price?: number;
    description?: string;
  }
) => {
  const response = await apiClient.patch(`/programs/${id}`, data);
  return response.data;
};

// حذف برنامج تدريبي
export const deleteProgram = async (id: number) => {
  const response = await apiClient.delete(`/programs/${id}`);
  return response.data;
}; 