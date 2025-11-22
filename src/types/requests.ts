// SOLID Principle: Interface Segregation - Separate interfaces for different concerns

// أنواع الطلبات
export enum RequestType {
  EXAM_POSTPONE = 'EXAM_POSTPONE',       // تأجيل اختبار
  SICK_LEAVE = 'SICK_LEAVE',             // إجازة مرضية
  ENROLLMENT_PROOF = 'ENROLLMENT_PROOF', // طلب إثبات قيد
  CERTIFICATE = 'CERTIFICATE',           // طلب إفادة
}

// أنواع الاختبارات
export enum ExamType {
  MIDTERM = 'MIDTERM', // ميد تيرم
  FINAL = 'FINAL',     // نهائي
}

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

// Interface للبيانات المرسلة لإنشاء طلب
export interface CreateTraineeRequestDto {
  // حقول إلزامية
  type: RequestType;        // نوع الطلب (إلزامي)
  reason: string;           // سبب الطلب (إلزامي)
  
  // حقول اختيارية
  attachmentUrl?: string;          // رابط المرفق (اختياري)
  attachmentCloudinaryId?: string; // معرف المرفق في Cloudinary (اختياري)
  
  // حقول خاصة بتأجيل الاختبار (إلزامية فقط إذا type = EXAM_POSTPONE)
  examType?: ExamType;  // نوع الاختبار (إلزامي لتأجيل الاختبار)
  examDate?: string;    // تاريخ الاختبار الأصلي بصيغة ISO (إلزامي لتأجيل الاختبار)
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

// طلب عام للمتدرب (تأجيل اختبار، إجازة مرضية، إلخ)
export interface TraineeRequest {
  id: string;
  traineeId: number;
  type: RequestType;
  reason: string;
  
  // اختياري
  attachmentUrl?: string | null;
  attachmentCloudinaryId?: string | null;
  examType?: ExamType | null;
  examDate?: string | null;
  
  status: PaymentDeferralStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  adminResponse?: string | null;
  adminNotes?: string | null;
  
  createdAt: string;
  updatedAt: string;
  
  reviewer?: {
    id: string;
    name: string;
  } | null;
}

// استجابة قائمة الطلبات (يمكن أن تكون مزيج من الأنواع)
export type RequestsListResponse = (PaymentDeferralRequest | TraineeRequest)[];

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
  [RequestType.EXAM_POSTPONE]: {
    type: RequestType.EXAM_POSTPONE,
    nameAr: 'تأجيل اختبار',
    nameEn: 'Exam Postponement',
    icon: '📝',
    color: '#EF4444',
    description: 'طلب تأجيل اختبار',
    requiredFields: ['reason', 'examType', 'examDate']
  },
  [RequestType.SICK_LEAVE]: {
    type: RequestType.SICK_LEAVE,
    nameAr: 'إجازة مرضية',
    nameEn: 'Sick Leave',
    icon: '🏥',
    color: '#F59E0B',
    description: 'طلب إجازة مرضية',
    requiredFields: ['reason']
  },
  [RequestType.ENROLLMENT_PROOF]: {
    type: RequestType.ENROLLMENT_PROOF,
    nameAr: 'إثبات قيد',
    nameEn: 'Enrollment Proof',
    icon: '📄',
    color: '#10B981',
    description: 'طلب إثبات قيد',
    requiredFields: ['reason']
  },
  [RequestType.CERTIFICATE]: {
    type: RequestType.CERTIFICATE,
    nameAr: 'إفادة',
    nameEn: 'Certificate',
    icon: '📋',
    color: '#8B5CF6',
    description: 'طلب إفادة',
    requiredFields: ['reason']
  }
};