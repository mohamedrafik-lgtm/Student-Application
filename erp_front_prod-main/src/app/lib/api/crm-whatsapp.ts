import { fetchAPI } from '@/lib/api';

export interface CrmWhatsAppChannel {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  isReady: boolean;
  isConnected: boolean;
  qrCode: string | null;
  pairCode: string | null;
  livePhoneNumber: string | null;
}

export interface CrmChannelStatus {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  pairCode?: string;
  phoneNumber?: string;
  status: string;
}

// الحصول على جميع القنوات
export const getCrmWhatsAppChannels = async (): Promise<CrmWhatsAppChannel[]> => {
  return await fetchAPI('/crm-whatsapp/channels');
};

// إنشاء قناة جديدة
export const createCrmWhatsAppChannel = async (name: string): Promise<{ success: boolean; channel: CrmWhatsAppChannel }> => {
  return await fetchAPI('/crm-whatsapp/channels', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

// حالة قناة محددة
export const getCrmChannelStatus = async (channelId: string): Promise<CrmChannelStatus> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/status`);
};

// بدء اتصال عبر QR Code
export const connectCrmChannelWithQR = async (channelId: string): Promise<{ success: boolean; qrCode?: string; connected?: boolean; phoneNumber?: string; message?: string }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/connect-qr`, {
    method: 'POST',
  });
};

// بدء اتصال عبر Pair Code
export const connectCrmChannelWithPairCode = async (channelId: string, phoneNumber: string): Promise<{ success: boolean; pairCode?: string; connected?: boolean; phoneNumber?: string; message?: string }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/connect-pair`, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
};

// قطع اتصال قناة
export const disconnectCrmChannel = async (channelId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/disconnect`, {
    method: 'POST',
  });
};

// حذف قناة
export const deleteCrmChannel = async (channelId: string): Promise<{ success: boolean }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}`, {
    method: 'DELETE',
  });
};

// إعادة توليد QR Code
export const regenerateCrmQR = async (channelId: string): Promise<{ success: boolean; qrCode?: string; message?: string }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/regenerate-qr`, {
    method: 'POST',
  });
};

// إرسال رسالة عبر قناة
export const sendCrmWhatsAppMessage = async (channelId: string, phoneNumber: string, message: string): Promise<{ success: boolean; message: string }> => {
  return await fetchAPI(`/crm-whatsapp/channels/${channelId}/send-message`, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, message }),
  });
};
