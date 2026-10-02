import { fetchAPI } from '@/lib/api';

export interface CrmMessageSettings {
  id: string;
  distributionMode: 'disabled' | 'round_robin' | 'first_claim';
  roundRobinIndex: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmConversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  channelId: string;
  channelType: string;
  assignedToId: string | null;
  assignedToName: string | null;
  status: 'open' | 'assigned' | 'closed';
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  channel: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
}

export interface CrmMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  content: string | null;
  mediaUrl: string | null;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  duration: number | null;
  senderName: string | null;
  sentById: string | null;
  whatsappMessageId: string | null;
  createdAt: string;
}

// ===== إعدادات التوزيع =====

export const getCrmInboxSettings = async (): Promise<CrmMessageSettings> => {
  return await fetchAPI('/crm-inbox/settings');
};

export const updateCrmInboxSettings = async (distributionMode: string): Promise<{ success: boolean; settings: CrmMessageSettings }> => {
  return await fetchAPI('/crm-inbox/settings', {
    method: 'PUT',
    body: JSON.stringify({ distributionMode }),
  });
};

// ===== المحادثات =====

export const getCrmConversations = async (filter: string = 'all'): Promise<CrmConversation[]> => {
  return await fetchAPI(`/crm-inbox/conversations?filter=${filter}`);
};

export const getCrmMessages = async (conversationId: string, page: number = 1): Promise<{ messages: CrmMessage[]; total: number; page: number; limit: number }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/messages?page=${page}`);
};

export const sendCrmMessage = async (conversationId: string, content: string): Promise<{ success: boolean; message: CrmMessage }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
};

export const sendCrmMediaMessage = async (
  conversationId: string,
  file: File | Blob,
  mediaType: 'image' | 'audio',
  caption?: string,
): Promise<{ success: boolean; message: CrmMessage }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mediaType', mediaType);
  if (caption) formData.append('caption', caption);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('auth_token')
    : null;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  const res = await fetch(`${API_URL}/crm-inbox/conversations/${conversationId}/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('فشل في رفع الملف');
  return res.json();
};

// ===== حجز المحادثات =====

export const claimCrmConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/claim`, { method: 'POST' });
};

export const releaseCrmConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/release`, { method: 'POST' });
};

export const closeCrmConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/close`, { method: 'POST' });
};

export const markCrmConversationRead = async (conversationId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-inbox/conversations/${conversationId}/read`, { method: 'POST' });
};
