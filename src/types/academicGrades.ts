// Types for Academic Results — النتائج الدراسية
// Based on GET /api/trainee-grades/{traineeId}/released
// Response: { trainee, classrooms[] }

/* ═══════════════ بيانات المتدرب ═══════════════ */
export interface TraineeInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  [key: string]: any; // may have extra fields
}

/* ═══════════════ بيانات الفصل الدراسي ═══════════════ */
export interface ClassroomInfo {
  id: number;
  name: string;           // "التيرم الأول"
  classNumber: number;
  startDate: string;
  endDate: string;
}

/* ═══════════════ بيانات المحتوى/المادة ═══════════════ */
export interface ContentInfo {
  id: number;
  name: string;
  code: string;
}

/* ═══════════════ عنصر محتوى مع الدرجات ═══════════════ */
// Content item in the classroom's contents array.
// Has a `content` object plus potential grade fields
// (exact fields TBD from API — use [key: string]: any)
export interface ContentGradeItem {
  content: ContentInfo;
  [key: string]: any;     // grade/marks fields vary by API
}

/* ═══════════════ معلومات الإصدار ═══════════════ */
export interface ReleaseInfo {
  releasedAt: string;
  requirePayment: boolean;
  linkedFeeType: string;
  notes: string;
}

/* ═══════════════ إحصائيات إجمالية ═══════════════ */
export interface TotalStats {
  maxTotal: number;
  earnedTotal: number;
  percentage: number;
}

/* ═══════════════ فصل دراسي كامل مع النتائج ═══════════════ */
export interface ClassroomGrades {
  classroom: ClassroomInfo;
  canView: boolean;
  contents: ContentGradeItem[];
  reason: string;
  releaseInfo: ReleaseInfo;
  totalStats: TotalStats;
}

/* ═══════════════ الاستجابة الكاملة ═══════════════ */
export interface ReleasedGradesResponse {
  trainee: TraineeInfo;
  classrooms: ClassroomGrades[];
}

/* ═══════════════ فلتر تبويب ═══════════════ */
export type GradeTab = 'ALL' | 'PASSED' | 'FAILED';

/* ═══════════════ خطأ ═══════════════ */
export interface AcademicGradesError {
  message: string;
  statusCode?: number;
  details?: any;
}

/* ═══════════════ ألوان التقدير ═══════════════ */
export const getGradeColor = (gradeOrStatus: string | null | undefined) => {
  switch (gradeOrStatus) {
    case 'ممتاز':
      return { main: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    case 'جيد جداً':
      return { main: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    case 'جيد':
      return { main: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    case 'مقبول':
      return { main: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
    case 'ناجح':
      return { main: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    case 'راسب':
      return { main: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    default:
      return { main: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  }
};
