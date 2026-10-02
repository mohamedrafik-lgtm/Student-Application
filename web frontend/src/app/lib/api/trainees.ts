import { apiClient } from './client';

// الحصول على جميع المتدربين
export const getAllTrainees = async (filters?: {
  programId?: number;
  status?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
  includeDetails?: boolean;
  sortBy?: string;
  sortOrder?: string;
}) => {
  let endpoint = '/trainees';
  
  // إضافة معلمات البحث إذا كانت موجودة
  if (filters) {
    const params = new URLSearchParams();
    
    if (filters.programId) {
      params.append('programId', filters.programId.toString());
      console.log('🌐 إضافة programId إلى الطلب:', filters.programId);
    }
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    if (filters.searchQuery) {
      params.append('search', filters.searchQuery);
    }
    
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    if (filters.includeDetails) {
      params.append('includeDetails', 'true');
    }
    
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  console.log('🔗 Requesting endpoint:', endpoint);
  const response = await apiClient.get(endpoint);
  console.log('📦 Response data:', response.data);
  return response.data;
};

// الحصول على متدرب محدد بواسطة المعرف
export const getTraineeById = async (id: number) => {
  const response = await apiClient.get(`/trainees/${id}`);
  return response.data;
};

// إنشاء متدرب جديد
export const createTrainee = async (data: any) => {
  const response = await apiClient.post('/trainees', data);
  return response.data;
};

// تحديث بيانات متدرب
export const updateTrainee = async (id: number, data: any) => {
  const response = await apiClient.patch(`/trainees/${id}`, data);
  return response.data;
};

// حذف متدرب
export const deleteTrainee = async (id: number) => {
  const response = await apiClient.delete(`/trainees/${id}`);
  return response.data;
};

// البحث عن المتدربين (للبحث التلقائي)
export const searchTrainees = async (query: string, limit = 10) => {
  const response = await apiClient.get(`/trainees?search=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
}; 