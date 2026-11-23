import { fetchAPI } from '../api';

// الحصول على إعدادات الكارنيه
export const getIdCardSettings = async () => {
  return fetchAPI('/id-cards/settings');
};

// الحصول على سجلات طباعة متدرب معين
export const getTraineePrints = async (traineeId: number) => {
  return fetchAPI(`/id-cards/trainee/${traineeId}/prints`);
};

// تسجيل عملية طباعة
export const recordIdCardPrint = async (data: {
  traineeId: number;
  printedById: string;
  notes?: string;
}) => {
  return fetchAPI('/id-cards/record-print', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// الحصول على المتدربين مع حالة الكارنيهات
export const getTraineesWithIdCardStatus = async (filters?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'not_printed' | 'printed' | 'delivered' | 'not_delivered';
  programId?: number;
}) => {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.programId) params.append('programId', filters.programId.toString());

  return fetchAPI(`/id-cards/trainees-with-status?${params}`);
};

// تحديث حالة تسليم الكارنيه
export const updateDeliveryStatus = async (
  printId: number,
  data: {
    isDelivered: boolean;
    deliveryNotes?: string;
  }
) => {
  return fetchAPI(`/id-cards/delivery-status/${printId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// الحصول على إحصائيات الكارنيهات
export const getIdCardStatistics = async () => {
  return fetchAPI('/id-cards/statistics');
};
