import { fetchAPI } from '@/lib/api';

// Types
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  category: string;
  variables?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  template?: MessageTemplate;
  message: string;
  delayBetweenMessages: number;
  targetType: 'all' | 'program' | 'custom';
  targetProgramId?: number;
  targetTraineeIds?: number[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  campaignRecipients?: CampaignRecipient[];
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  traineeId: number;
  trainee: {
    id: number;
    nameAr: string;
    phone: string;
    program: {
      nameAr: string;
    };
  };
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  phoneNumber: string;
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface CampaignStats {
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  estimatedTimeRemaining: number;
}

export interface OverallStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalMessagesSent: number;
  averageSuccessRate: number;
}

export interface TemplateStats {
  total: number;
  active: number;
  byCategory: { [category: string]: number };
  recentlyUsed: MessageTemplate[];
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  templateId?: string;
  message: string;
  delayBetweenMessages?: number;
  targetType: 'all' | 'program' | 'custom';
  targetProgramId?: number;
  targetTraineeIds?: number[];
  scheduledAt?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  message?: string;
  delayBetweenMessages?: number;
  scheduledAt?: string;
}

export interface CreateTemplateRequest {
  name: string;
  content: string;
  description?: string;
  category?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  content?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Campaign APIs
export const createCampaign = async (data: CreateCampaignRequest): Promise<ApiResponse<WhatsAppCampaign>> => {
  return await fetchAPI('/whatsapp/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAllCampaigns = async (ownOnly: boolean = false): Promise<ApiResponse<WhatsAppCampaign[]>> => {
  const url = ownOnly ? '/whatsapp/campaigns?own=true' : '/whatsapp/campaigns';
  return await fetchAPI(url);
};

export const getCampaignById = async (id: string): Promise<ApiResponse<WhatsAppCampaign>> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}`);
};

export const updateCampaign = async (id: string, data: UpdateCampaignRequest): Promise<ApiResponse<WhatsAppCampaign>> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteCampaign = async (id: string): Promise<ApiResponse> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}`, {
    method: 'DELETE',
  });
};

export const startCampaign = async (id: string): Promise<ApiResponse> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}/start`, {
    method: 'POST',
  });
};

export const pauseCampaign = async (id: string): Promise<ApiResponse> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}/pause`, {
    method: 'POST',
  });
};

export const stopCampaign = async (id: string): Promise<ApiResponse> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}/stop`, {
    method: 'POST',
  });
};

export const getCampaignStats = async (id: string): Promise<ApiResponse<CampaignStats>> => {
  return await fetchAPI(`/whatsapp/campaigns/${id}/stats`);
};

export const getOverallStats = async (): Promise<ApiResponse<OverallStats>> => {
  return await fetchAPI('/whatsapp/campaigns/stats/overall');
};

// Template APIs
export const createTemplate = async (data: CreateTemplateRequest): Promise<ApiResponse<MessageTemplate>> => {
  return await fetchAPI('/whatsapp/campaigns/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAllTemplates = async (activeOnly: boolean = false, category?: string): Promise<ApiResponse<MessageTemplate[]>> => {
  let url = '/whatsapp/campaigns/templates';
  const params = new URLSearchParams();
  
  if (activeOnly) params.append('active', 'true');
  if (category) params.append('category', category);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  return await fetchAPI(url);
};

export const getTemplateById = async (id: string): Promise<ApiResponse<MessageTemplate>> => {
  return await fetchAPI(`/whatsapp/campaigns/templates/${id}`);
};

export const updateTemplate = async (id: string, data: UpdateTemplateRequest): Promise<ApiResponse<MessageTemplate>> => {
  return await fetchAPI(`/whatsapp/campaigns/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteTemplate = async (id: string): Promise<ApiResponse> => {
  return await fetchAPI(`/whatsapp/campaigns/templates/${id}`, {
    method: 'DELETE',
  });
};

export const previewTemplate = async (id: string, sampleData?: any): Promise<ApiResponse<{ content: string; variables: string[] }>> => {
  return await fetchAPI(`/whatsapp/campaigns/templates/${id}/preview`, {
    method: 'POST',
    body: JSON.stringify(sampleData || {}),
  });
};

export const duplicateTemplate = async (id: string, newName: string): Promise<ApiResponse<MessageTemplate>> => {
  return await fetchAPI(`/whatsapp/campaigns/templates/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newName }),
  });
};

export const getTemplatesStats = async (): Promise<ApiResponse<TemplateStats>> => {
  return await fetchAPI('/whatsapp/campaigns/templates/stats/overview');
};

export const getTemplatesGroupedByCategory = async (): Promise<ApiResponse<{ [category: string]: MessageTemplate[] }>> => {
  return await fetchAPI('/whatsapp/campaigns/templates/grouped/by-category');
};

// Helper functions
export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 border border-gray-300';
    case 'running': return 'bg-blue-100 text-blue-800 border border-blue-300';
    case 'paused': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    case 'completed': return 'bg-green-100 text-green-800 border border-green-300';
    case 'failed': return 'bg-red-100 text-red-800 border border-red-300';
    default: return 'bg-gray-100 text-gray-800 border border-gray-300';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'draft': return 'مسودة';
    case 'running': return 'قيد التشغيل';
    case 'paused': return 'متوقفة مؤقتاً';
    case 'completed': return 'مكتملة';
    case 'failed': return 'فاشلة';
    default: return status;
  }
};

export const getRecipientStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'معلق';
    case 'sent': return 'تم الإرسال';
    case 'failed': return 'فشل';
    case 'skipped': return 'تم التخطي';
    default: return status;
  }
};

export const getRecipientStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'skipped': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const formatEstimatedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} ثانية`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} دقيقة`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ساعة${minutes > 0 ? ` و ${minutes} دقيقة` : ''}`;
  }
};

export const getCategoryDisplayName = (category: string): string => {
  switch (category) {
    case 'welcome': return 'ترحيب';
    case 'payment': return 'دفع';
    case 'reminder': return 'تذكير';
    case 'notification': return 'إشعار';
    case 'general': return 'عام';
    default: return category;
  }
};
