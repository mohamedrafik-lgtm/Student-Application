import { fetchAPI } from '@/lib/api';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
}

export interface MessageTemplate {
  type: 'welcome' | 'payment_reminder' | 'program_start' | 'custom';
  content: string;
}

export interface SendMessageRequest {
  phoneNumber: string;
  message: string;
}

export interface SendCustomMessageRequest {
  phoneNumber: string;
  template: MessageTemplate;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// الحصول على حالة الواتساب
export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  const response = await fetchAPI('/whatsapp/status');
  return response;
};

// الحصول على QR Code
export const getWhatsAppQrCode = async (): Promise<{ qrCode: string | null }> => {
  const response = await fetchAPI('/whatsapp/qr-code');
  return response;
};

// إرسال رسالة
export const sendMessage = async (data: SendMessageRequest): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/send-message', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
};

// إرسال رسالة تجريبية
export const sendTestMessage = async (data: SendMessageRequest): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/send-test-message', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
};

// إرسال رسالة مخصصة
export const sendCustomMessage = async (data: SendCustomMessageRequest): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/send-custom-message', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
};

// إرسال رسالة ترحيب
export const sendWelcomeMessage = async (traineeId: number): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/send-welcome', {
    method: 'POST',
    body: JSON.stringify({ traineeId }),
  });
  return response;
};



// إعادة تشغيل العميل
export const restartWhatsApp = async (): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/restart', {
    method: 'POST',
  });
  return response;
};

// قطع الاتصال
export const disconnectWhatsApp = async (): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/logout', {
    method: 'POST',
  });
  return response;
};

// معاينة رسالة الترحيب
export const previewWelcomeMessage = async (): Promise<{ message: string }> => {
  const response = await fetchAPI('/whatsapp/preview-welcome-sample');
  return response;
};

// معاينة رسالة تأكيد الدفع
export const previewPaymentMessage = async (): Promise<{ message: string }> => {
  const response = await fetchAPI('/whatsapp/preview-payment-sample');
  return response;
};

// فرض إنشاء QR Code جديد
export const forceGenerateQrCode = async (): Promise<{ success: boolean; message: string; qrCode?: string }> => {
  const response = await fetchAPI('/whatsapp/generate-qr', {
    method: 'POST',
  });
  return response;
};

// فحص عميق للاتصال
export const deepConnectionCheck = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetchAPI('/whatsapp/deep-check');
  return response;
};

// تحديث معلومات العميل
export const refreshClientInfo = async (): Promise<{ success: boolean; message: string; phoneNumber?: string }> => {
  const response = await fetchAPI('/whatsapp/refresh-info', {
    method: 'POST',
  });
  return response;
};

// إعادة تهيئة قسرية للعميل
export const forceClientReinit = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetchAPI('/whatsapp/force-reinit', {
    method: 'POST',
  });
  return response;
};

// إعادة تشغيل العميل
export const restartClient = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetchAPI('/whatsapp/restart', {
    method: 'POST',
  });
  return response;
};

// إعادة المصادقة
export const forceReauth = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetchAPI('/whatsapp/force-reauth', {
    method: 'POST',
  });
  return response;
};

// إرسال تأكيد الدفع
export const sendPaymentConfirmation = async (paymentId: number): Promise<ApiResponse> => {
  const response = await fetchAPI('/whatsapp/send-payment-confirmation', {
    method: 'POST',
    body: JSON.stringify({ paymentId }),
  });
  return response;
};

// اختبار دفع متدرب من الصفحة المخصصة
export const testTraineePayment = async (traineeId: number): Promise<ApiResponse> => {
  const response = await fetchAPI(`/whatsapp/test-trainee-payment/${traineeId}`, {
    method: 'POST',
  });
  return response;
};