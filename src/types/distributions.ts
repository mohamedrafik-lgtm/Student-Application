// Types for Training Distributions Feature
// SOLID Principle: Single Responsibility — only distribution-related type definitions
// Mirrors the web contract: GET  /api/trainee-platform/distributions
//                        POST /api/trainee-platform/distributions/rooms/:roomId/join

/** نوع التوزيع — نظري أو عملي */
export type DistributionType = 'THEORY' | 'PRACTICAL';

/** قاعة/مجموعة داخل التوزيع */
export interface DistributionRoom {
  id: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  isFull: boolean;
}

/** توزيع متاح للتسجيل الذاتي */
export interface AvailableDistribution {
  id: string;
  type: DistributionType;
  academicYear: string;
  classroomName: string;
  isRegistrationOpen: boolean;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  isJoined: boolean;
  joinedRoomId: string | null;
  rooms: DistributionRoom[];
}

/** استجابة جلب التوزيعات المتاحة */
export type AvailableDistributionsResponse = AvailableDistribution[];

/** استجابة الانضمام لمجموعة */
export interface JoinDistributionResponse {
  success: boolean;
  message: string;
  assignment?: {
    id: string;
    roomId: string;
    traineeId: number;
    orderNumber: number | null;
    notes?: string | null;
  };
}

/** خطأ قادم من خدمة التوزيعات (نفس نمط SurveyError) */
export interface DistributionError {
  message: string;
  statusCode?: number;
  details?: any;
}

/** حالة نافذة تأكيد الانضمام / تغيير المجموعة */
export interface JoinConfirmState {
  isOpen: boolean;
  roomId: string | null;
  roomName: string;
  distributionName: string;
  isChangingGroup: boolean;
  currentRoomName: string;
}