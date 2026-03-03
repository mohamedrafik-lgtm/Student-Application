// Types for Grade Appeals Feature — تظلمات الدرجات
// Based on /trainee-portal/my-grades + /trainee-portal/appeals

/* ═══════ حالات التظلم ═══════ */
export type AppealStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

/* ═══════ المادة الدراسية ═══════ */
export interface Content {
  id: number;
  name: string;
}

/* ═══════ درجة المتدرب ═══════ */
export interface TraineeGrade {
  id: number;
  contentId: number;
  content: Content;
  round: 'FIRST' | 'SECOND';
  practicalScore: number | null;
  theoreticalScore: number | null;
  totalScore: number | null;
  grade: string | null;
  isPassed: boolean;
  totalPercentage: number | null;
  createdAt: string;
  updatedAt: string;
}

/* ═══════ المراجع ═══════ */
export interface Reviewer {
  id: number;
  name: string;
}

/* ═══════ التظلم ═══════ */
export interface Appeal {
  id: number;
  traineeId: number;
  gradeId: number;
  grade: TraineeGrade;
  reason: string;
  status: AppealStatus;
  adminResponse: string | null;
  previousScore: number | null;
  newScore: number | null;
  reviewedBy: Reviewer | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ═══════ طلب تقديم تظلم ═══════ */
export interface CreateAppealRequest {
  gradeId: number;
  reason: string;
}

/* ═══════ خطأ ═══════ */
export interface GradeAppealsError {
  message: string;
  statusCode?: number;
  details?: any;
}

/* ═══════ فلتر ═══════ */
export type AppealFilterStatus = 'ALL' | AppealStatus;

/* ═══════ ألوان الحالات ═══════ */
export const getAppealStatusConfig = (status: AppealStatus) => {
  switch (status) {
    case 'PENDING':
      return { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: 'clock-outline' };
    case 'UNDER_REVIEW':
      return { label: 'قيد المراجعة', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: 'eye-outline' };
    case 'ACCEPTED':
      return { label: 'مقبول', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: 'check-circle-outline' };
    case 'REJECTED':
      return { label: 'مرفوض', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: 'close-circle-outline' };
    default:
      return { label: 'غير محدد', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: 'help-circle-outline' };
  }
};
