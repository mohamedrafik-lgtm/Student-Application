import { fetchAPI } from './api';
import {
  PaymentReminderTemplate,
  CreateReminderTemplateRequest,
  ReminderStats,
  PaymentReminderDelivery,
} from '@/types/payment-reminders';

/**
 * إنشاء رسالة تذكيرية جديدة
 */
export async function createReminderTemplate(
  data: CreateReminderTemplateRequest
): Promise<{ success: boolean; message: string; data?: PaymentReminderTemplate }> {
  return fetchAPI('/payment-reminders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * جلب جميع الرسائل التذكيرية
 */
export async function getAllReminders(filters?: {
  feeId?: number;
  active?: boolean;
  programId?: number;
}): Promise<{ success: boolean; data: PaymentReminderTemplate[] }> {
  const params = new URLSearchParams();
  if (filters?.feeId) params.append('feeId', filters.feeId.toString());
  if (filters?.active !== undefined) params.append('active', filters.active.toString());
  if (filters?.programId) params.append('programId', filters.programId.toString());

  const url = `/payment-reminders${params.toString() ? `?${params.toString()}` : ''}`;
  return fetchAPI(url);
}

/**
 * جلب رسالة محددة
 */
export async function getReminderById(
  id: string
): Promise<{ success: boolean; data: PaymentReminderTemplate }> {
  return fetchAPI(`/payment-reminders/${id}`);
}

/**
 * تحديث رسالة تذكيرية
 */
export async function updateReminderTemplate(
  id: string,
  data: Partial<CreateReminderTemplateRequest>
): Promise<{ success: boolean; message: string; data?: PaymentReminderTemplate }> {
  return fetchAPI(`/payment-reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * حذف رسالة تذكيرية
 */
export async function deleteReminderTemplate(
  id: string
): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/payment-reminders/${id}`, {
    method: 'DELETE',
  });
}

/**
 * جلب إحصائيات عامة
 */
export async function getRemindersStats(filters?: {
  feeId?: number;
  programId?: number;
}): Promise<{ success: boolean; data: ReminderStats }> {
  const params = new URLSearchParams();
  if (filters?.feeId) params.append('feeId', filters.feeId.toString());
  if (filters?.programId) params.append('programId', filters.programId.toString());

  const url = `/payment-reminders/stats${params.toString() ? `?${params.toString()}` : ''}`;
  return fetchAPI(url);
}

/**
 * جلب إحصائيات رسالة محددة
 */
export async function getReminderDeliveryStats(
  id: string
): Promise<{
  success: boolean;
  data: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    scheduled: number;
    skipped: number;
    successRate: number;
  };
}> {
  return fetchAPI(`/payment-reminders/${id}/stats`);
}

/**
 * جلب سجلات إرسال رسالة
 */
export async function getReminderDeliveries(
  id: string,
  filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data: PaymentReminderDelivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `/payment-reminders/${id}/deliveries${params.toString() ? `?${params.toString()}` : ''}`;
  return fetchAPI(url);
}

/**
 * تشغيل يدوي لرسالة
 */
export async function triggerReminderManually(
  id: string
): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/payment-reminders/${id}/trigger`, {
    method: 'POST',
  });
}

/**
 * إرسال تجريبي لمتدرب
 */
export async function sendTestReminder(
  id: string,
  traineeId: number
): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/payment-reminders/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ traineeId }),
  });
}

/**
 * إعادة محاولة الرسائل الفاشلة
 */
export async function retryFailedReminders(
  id: string
): Promise<{ success: boolean; message: string; count?: number }> {
  return fetchAPI(`/payment-reminders/${id}/retry-failed`, {
    method: 'POST',
  });
}

/**
 * جلب رسائل رسم محدد
 */
export async function getRemindersByFee(
  feeId: number
): Promise<{ success: boolean; data: PaymentReminderTemplate[] }> {
  return fetchAPI(`/payment-reminders/fee/${feeId}/reminders`);
}