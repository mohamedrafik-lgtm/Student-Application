export type PaymentStatusType = 'ACTIVE' | 'PAYMENT_DUE' | 'BLOCKED';

export interface OverduePaymentInfo {
  feeId: number;
  feeName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  deadline: string;
  daysOverdue: number;
  actions: string[];
}

export interface UpcomingPaymentInfo {
  feeId: number;
  feeName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: string | null;
  endDate: string | null;
  finalDeadline: string | null;
  daysRemaining: number;
}

export interface PaymentStatusResult {
  status: PaymentStatusType;
  message: string;
  canAccessPlatform: boolean;
  canAccessQuizzes: boolean;
  canAccessAttendance: boolean;
  blockReason?: string;
  overduePayments?: OverduePaymentInfo[];
  upcomingPayments?: UpcomingPaymentInfo[];
  blockedFeatures?: string[];
}

export interface AccessCheckResult {
  canAccess: boolean;
  blockReason?: string;
  paymentInfo?: {
    upcomingPayments?: UpcomingPaymentInfo[];
    overduePayments?: OverduePaymentInfo[];
  } | null;
  blockInfo?: {
    blockReason?: string; // سبب الحجب (PAYMENT_OVERDUE, TEMPORARY_SUSPENSION, PERMANENT_EXPULSION)
    message?: string; // رسالة إضافية (مثل موعد انتهاء الفصل المؤقت)
    overduePayments?: OverduePaymentInfo[];
    blockedFeatures?: string[];
  } | null;
}