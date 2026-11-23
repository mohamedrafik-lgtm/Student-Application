export enum ReminderTriggerType {
  PAYMENT_START = 'PAYMENT_START',
  PAYMENT_END = 'PAYMENT_END',
  GRACE_START = 'GRACE_START',
  GRACE_END = 'GRACE_END',
  CUSTOM_DATE = 'CUSTOM_DATE',
}

export enum ReminderDeliveryStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface PaymentReminderTemplate {
  id: string;
  name: string;
  message: string;
  description?: string;
  feeId: number;
  fee: {
    id: number;
    name: string;
    amount: number;
    type: string;
    program: {
      id: number;
      nameAr: string;
    };
    paymentSchedule?: {
      paymentStartDate?: string;
      paymentEndDate?: string;
      finalDeadline?: string;
    };
  };
  triggerType: ReminderTriggerType;
  customTriggerDate?: string;
  daysOffset?: number;
  delayBetweenMessages: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    deliveries: number;
  };
}

export interface PaymentReminderDelivery {
  id: string;
  templateId: string;
  traineeId: number;
  trainee: {
    id: number;
    nameAr: string;
    phone: string;
    program?: {
      nameAr: string;
    };
  };
  phoneNumber: string;
  message: string;
  status: ReminderDeliveryStatus;
  scheduledAt: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  paymentStatus: string;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderTemplateRequest {
  name: string;
  message: string;
  description?: string;
  feeId: number;
  triggerType: ReminderTriggerType;
  customTriggerDate?: string;
  daysOffset?: number;
  delayBetweenMessages?: number;
  isActive?: boolean;
}

export interface ReminderStats {
  total: number;
  active: number;
  inactive: number;
  deliveries: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    successRate: number;
  };
}

export const TRIGGER_TYPE_LABELS: Record<ReminderTriggerType, string> = {
  [ReminderTriggerType.PAYMENT_START]: '📅 عند بداية موعد السداد',
  [ReminderTriggerType.PAYMENT_END]: '📅 عند نهاية موعد السداد',
  [ReminderTriggerType.GRACE_START]: '⏰ عند بداية فترة السماح',
  [ReminderTriggerType.GRACE_END]: '🚨 عند نهاية فترة السماح (الموعد النهائي)',
  [ReminderTriggerType.CUSTOM_DATE]: '📆 تاريخ مخصص (اختر أي تاريخ)',
};

export const TRIGGER_TYPE_DESCRIPTIONS: Record<ReminderTriggerType, string> = {
  [ReminderTriggerType.PAYMENT_START]: 'ترسل في أول يوم من موعد السداد',
  [ReminderTriggerType.PAYMENT_END]: 'ترسل في آخر يوم من موعد السداد',
  [ReminderTriggerType.GRACE_START]: 'ترسل عند انتهاء موعد السداد (بداية فترة الانتظار)',
  [ReminderTriggerType.GRACE_END]: 'ترسل في الموعد النهائي (تحذير أخير قبل الإيقاف)',
  [ReminderTriggerType.CUSTOM_DATE]: 'ترسل في التاريخ الذي تحدده (مثلاً: منتصف الفترة)',
};

export const DELIVERY_STATUS_LABELS: Record<ReminderDeliveryStatus, string> = {
  [ReminderDeliveryStatus.PENDING]: 'في الانتظار',
  [ReminderDeliveryStatus.SCHEDULED]: 'مجدول',
  [ReminderDeliveryStatus.SENDING]: 'قيد الإرسال',
  [ReminderDeliveryStatus.SENT]: 'تم الإرسال',
  [ReminderDeliveryStatus.FAILED]: 'فشل',
  [ReminderDeliveryStatus.SKIPPED]: 'متخطى',
};