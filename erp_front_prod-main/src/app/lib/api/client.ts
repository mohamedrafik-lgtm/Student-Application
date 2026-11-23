import { fetchAPI } from '@/lib/api';

// واجهة استخدام متوافقة مع النمط المستخدم في المشروع
export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetchAPI(endpoint);
    return { data: response };
  },

  post: async (endpoint: string, data: Record<string, unknown>) => {
    const response = await fetchAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { data: response };
  },

  patch: async (endpoint: string, data: Record<string, unknown>) => {
    const response = await fetchAPI(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return { data: response };
  },

  delete: async (endpoint: string) => {
    const response = await fetchAPI(endpoint, {
      method: 'DELETE',
    });
    return { data: response };
  },
}; 