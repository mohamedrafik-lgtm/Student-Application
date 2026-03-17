import { fetchAPI } from './api';

// =============== Types ===============

export interface StudyMaterial {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  programId: number;
  linkedFeeId?: number | null;
  quantity: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  program?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  linkedFee?: {
    id: number;
    name: string;
    amount: number;
  };
  _count?: {
    deliveries: number;
  };
}

export interface StudyMaterialDelivery {
  id: string;
  studyMaterialId: string;
  traineeId: number;
  deliveredBy?: string;
  deliveryDate?: string;
  status: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST';
  quantity: number;
  notes?: string;
  returnDate?: string;
  returnedBy?: string;
  returnNotes?: string;
  createdAt: string;
  updatedAt: string;
  studyMaterial?: {
    id: string;
    name: string;
    nameEn?: string;
    program?: {
      id: number;
      nameAr: string;
      nameEn: string;
    };
  };
  trainee?: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    phone: string;
    photoUrl?: string;
  };
}

export interface StudyMaterialsResponse {
  materials: StudyMaterial[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DeliveriesResponse {
  deliveries: StudyMaterialDelivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface StudyMaterialStats {
  totalMaterials: number;
  activeMaterials: number;
  inactiveMaterials: number;
  totalDeliveries: number;
  pendingDeliveries: number;
  deliveredCount: number;
  returnedCount: number;
  lostCount: number;
}

// =============== Study Materials API ===============

/**
 * إنشاء أداة دراسية جديدة
 */
export async function createStudyMaterial(data: {
  name: string;
  nameEn?: string;
  description?: string;
  programId: number;
  linkedFeeId?: number | null;
  quantity: number;
  isActive?: boolean;
}): Promise<StudyMaterial> {
  return fetchAPI('/study-materials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * جلب جميع الأدوات الدراسية
 */
export async function getStudyMaterials(params?: {
  programId?: number;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<StudyMaterialsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.programId) queryParams.append('programId', params.programId.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (typeof params?.isActive === 'boolean') {
    queryParams.append('isActive', params.isActive.toString());
  }
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchAPI(`/study-materials${query}`);
}

/**
 * جلب أداة دراسية محددة
 */
export async function getStudyMaterial(id: string): Promise<StudyMaterial> {
  return fetchAPI(`/study-materials/${id}`);
}

/**
 * تحديث أداة دراسية
 */
export async function updateStudyMaterial(
  id: string,
  data: {
    name?: string;
    nameEn?: string;
    description?: string;
    programId?: number;
    linkedFeeId?: number | null;
    quantity?: number;
    isActive?: boolean;
  }
): Promise<StudyMaterial> {
  return fetchAPI(`/study-materials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * حذف أداة دراسية
 */
export async function deleteStudyMaterial(id: string): Promise<{ message: string }> {
  return fetchAPI(`/study-materials/${id}`, {
    method: 'DELETE',
  });
}

/**
 * الحصول على إحصائيات الأدوات الدراسية
 */
export async function getStudyMaterialsStats(programId?: number): Promise<StudyMaterialStats> {
  const query = programId ? `?programId=${programId}` : '';
  return fetchAPI(`/study-materials/stats${query}`);
}

// =============== Deliveries API ===============

/**
 * إنشاء سجل تسليم جديد
 */
export async function createDelivery(data: {
  studyMaterialId: string;
  traineeId: number;
  quantity: number;
  notes?: string;
}): Promise<StudyMaterialDelivery> {
  return fetchAPI('/study-materials/deliveries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * جلب جميع سجلات التسليم
 */
export async function getDeliveries(params?: {
  studyMaterialId?: string;
  traineeId?: number;
  programId?: number;
  status?: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<DeliveriesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.studyMaterialId) queryParams.append('studyMaterialId', params.studyMaterialId);
  if (params?.traineeId) queryParams.append('traineeId', params.traineeId.toString());
  if (params?.programId) queryParams.append('programId', params.programId.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchAPI(`/study-materials/deliveries/list${query}`);
}

/**
 * جلب سجل تسليم محدد
 */
export async function getDelivery(id: string): Promise<StudyMaterialDelivery> {
  return fetchAPI(`/study-materials/deliveries/${id}`);
}

/**
 * تحديث سجل تسليم
 */
export async function updateDelivery(
  id: string,
  data: {
    status?: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST';
    deliveryDate?: string;
    notes?: string;
    returnDate?: string;
    returnNotes?: string;
  }
): Promise<StudyMaterialDelivery> {
  return fetchAPI(`/study-materials/deliveries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * حذف سجل تسليم
 */
export async function deleteDelivery(id: string): Promise<{ message: string }> {
  return fetchAPI(`/study-materials/deliveries/${id}`, {
    method: 'DELETE',
  });
}

