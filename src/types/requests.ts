// SOLID Principle: Interface Segregation - Separate interfaces for different concerns

// حالات طلب تأجيل السداد
export enum PaymentDeferralStatus {
  PENDING = 'PENDING',       // قيد المراجعة
  APPROVED = 'APPROVED',     // مقبول
  REJECTED = 'REJECTED'      // مرفوض
}

// طلب تأجيل سداد
export interface PaymentDeferralRequest {
  id: string;                           // معرف الطلب (CUID)
  traineeId: number;                    // معرف المتدرب
  feeId: number;                        // معرف الرسم المطلوب تأجيله
  
  // تفاصيل الطلب
  reason: string;                       // سبب طلب التأجيل
  requestedExtensionDays: number;       // عدد الأيام المطلوب تأجيلها
  requestedDeadline: string | null;     // الموعد المطلوب (ISO string)
  
  // حالة الطلب
  status: PaymentDeferralStatus;
  
  // معلومات المراجعة
  reviewedBy: string | null;            // معرف المُراجع (User ID)
  reviewedAt: string | null;            // تاريخ المراجعة (ISO string)
  adminResponse: string | null;         // رد الإدارة (سبب القبول أو الرفض)
  adminNotes: string | null;            // ملاحظات إدارية داخلية
  
  // معرف الاستثناء المُنشأ (عند القبول)
  createdExceptionId: string | null;    // معرف استثناء السداد المُنشأ
  
  // التواريخ
  createdAt: string;                    // تاريخ إنشاء الطلب (ISO string)
  updatedAt: string;                    // تاريخ آخر تحديث (ISO string)
  
  // العلاقات المُحمّلة
  fee: {                                // معلومات الرسم
    id: number;
    name: string;                       // اسم الرسم
    amount: number;                     // قيمة الرسم
  };
  
  reviewer: {                           // المُراجع (إذا تمت المراجعة)
    id: string;
    name: string;
  } | null;
}

// Alias للتوافق
export type StudentRequest = PaymentDeferralRequest;
export const RequestStatus = PaymentDeferralStatus;

// إنشاء طلب جديد
export interface CreateRequestDto {
  type: RequestType;
  title: string;
  description?: string;
  requestData: Record<string, any>;
}

// Query parameters للتصفية
export interface DeferralRequestsQueryParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';  // تصفية حسب حالة الطلب
  programId?: number;                             // تصفية حسب البرنامج التدريبي
  traineeId?: number;                             // تصفية حسب متدرب معين
  page?: number;                                  // رقم الصفحة (default: 1)
  limit?: number;                                 // عدد النتائج في الصفحة (default: 20)
}

// استجابة قائمة الطلبات (API يرجع Array مباشرة)
export type RequestsListResponse = PaymentDeferralRequest[];

// استجابة إنشاء طلب
export interface CreateRequestResponse {
  success: boolean;
  request: StudentRequest;
  message: string;
}

// استجابة تفاصيل طلب
export interface RequestDetailsResponse {
  success: boolean;
  request: StudentRequest;
  message?: string;
}

// خطأ في الطلبات
export interface RequestError {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}

// للتوافق مع الكود القديم - سيتم تحديثه لاحقاً
export enum RequestType {
  PAYMENT_DEFERRAL = 'PAYMENT_DEFERRAL'   // تأجيل سداد
}

export interface RequestTypeInfo {
  type: RequestType;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  requiredFields: string[];
}

export const REQUEST_TYPE_INFO: Record<RequestType, RequestTypeInfo> = {
  [RequestType.PAYMENT_DEFERRAL]: {
    type: RequestType.PAYMENT_DEFERRAL,
    nameAr: 'تأجيل سداد',
    nameEn: 'Payment Deferral',
    icon: '💰',
    color: '#F59E0B',
    description: 'طلب تأجيل موعد سداد رسوم',
    requiredFields: ['reason', 'requestedExtensionDays']
  }
};