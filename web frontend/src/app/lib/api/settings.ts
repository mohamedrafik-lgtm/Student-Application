import { apiClient } from './client';

// الحصول على إعدادات النظام
export const getSystemSettings = async () => {
  const response = await apiClient.get('/settings');
  // الـ API يرجع { success: true, settings } لذلك نحتاج لاستخراج settings
  return response.data?.settings || response.data;
};
