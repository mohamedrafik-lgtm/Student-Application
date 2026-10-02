// أنواع نظام الإشعارات لمنصة المتدربين

export type NotificationType =
  | 'appeal_response'        // رد على التظلم
  | 'request_response'       // رد على طلب (تأجيل/إجازة/شهادة)
  | 'grades_released'        // إعلان نتائج
  | 'payment_upcoming'       // اقتراب موعد سداد
  | 'payment_overdue'        // تجاوز موعد سداد
  | 'payment_made'           // تم سداد رسوم
  | 'complaint_response'     // رد على شكوى
  | 'attendance_warning'     // تحذير نسبة حضور منخفضة
  | 'general';               // إشعار عام

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface TraineeNotification {
  id: string;                 // معرف فريد (مولّد من النوع + المعرف الأصلي)
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;          // ISO date string
  link?: string;              // رابط للصفحة المرتبطة
  metadata?: Record<string, any>; // بيانات إضافية (اسم المادة، المبلغ، إلخ)
}

// حالة الإشعارات المخزنة محلياً
export interface NotificationStorageState {
  // آخر معرفات معروفة لكل نوع (لاكتشاف الجديد)
  lastKnownIds: {
    appeals: string[];        // معرفات التظلمات المعروفة + حالاتها
    requests: string[];       // معرفات الطلبات المعروفة + حالاتها
    generalRequests: string[]; // معرفات الطلبات العامة
    complaints: string[];     // معرفات الشكاوي المعروفة + حالاتها
    releasedGrades: string[]; // معرفات النتائج المعلنة
  };
  // معرفات الإشعارات المقروءة
  readNotificationIds: string[];
  // آخر وقت تم فيه الجلب
  lastFetchTime: string;
  // fingerprints لكل عنصر بحالته (لمعرفة إذا تغيرت الحالة)
  fingerprints: Record<string, string>;
}

// نتيجة الجلب من كل endpoint
export interface AppealData {
  id: number;
  status: string;   // PENDING | ACCEPTED | REJECTED
  subject?: { nameAr?: string };
  classroom?: { name?: string };
  result?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RequestData {
  id: number;
  status: string;   // PENDING | APPROVED | REJECTED
  type: string;
  reason?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ComplaintData {
  id: number;
  status: string;   // PENDING | IN_PROGRESS | RESOLVED | CLOSED
  type: string;
  subject?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReleasedGradeData {
  classroomId: number;
  classroomName: string;
  isLocked: boolean;
  releasedAt?: string;
}

export interface PaymentOverdueData {
  id: number;
  name: string;
  remainingAmount: number;
  deadline: string;
  daysRemaining: number;
}

export interface PaymentRecordData {
  id: number;
  feeName: string;
  amount: number;
  paidAmount: number;
  status: string; // PAID | PARTIALLY_PAID | PENDING
  paidAt?: string;
}

export interface GeneralRequestData {
  id: number;
  status: string;    // PENDING | APPROVED | REJECTED
  type: string;      // EXAM_POSTPONE | SICK_LEAVE | ENROLLMENT_PROOF | CERTIFICATE
  reason?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}
