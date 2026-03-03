// Types for Mercy Grades — درجات الرأفة
// GET /api/trainee-grades/{traineeId}/mercy-grades
// Response: Array of MercyGradeItem

/* ═══════ عنصر رأفة ═══════ */
export interface MercyGradeItem {
  contentId: number;
  contentName: string;
  contentCode: string;
  classroomId: number;
  classroomName: string;
  addedPoints: number;       // درجات الرأفة المضافة
  totalAfter: number;        // الدرجة بعد الرأفة
  appliedAt: string;         // تاريخ التطبيق ISO
  [key: string]: any;        // أي حقول إضافية
}

/* ═══════ الاستجابة = مصفوفة مسطحة ═══════ */
export type MercyGradesResponse = MercyGradeItem[];
