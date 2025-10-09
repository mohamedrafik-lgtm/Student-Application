// Types for Grades Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * Program information
 */
export interface Program {
  id: number;
  nameAr: string;         // اسم البرنامج بالعربية
  nameEn: string;         // اسم البرنامج بالإنجليزية
}

/**
 * Trainee information
 */
export interface Trainee {
  id: number;
  nameAr: string;           // الاسم بالعربية
  nameEn: string;           // الاسم بالإنجليزية
  nationalId: string;       // الرقم القومي
  program: Program;
}

/**
 * Overall statistics
 */
export interface OverallStats {
  totalEarned: number;      // إجمالي الدرجات المحصلة
  totalMax: number;         // إجمالي الدرجات الكاملة
  percentage: number;       // النسبة المئوية الإجمالية
  totalContents: number;    // إجمالي عدد المواد
}

/**
 * Classroom information
 */
export interface Classroom {
  id: number;
  name: string;           // اسم الفصل الدراسي
}

/**
 * Content/Material information
 */
export interface Content {
  id: number;
  code: string;         // كود المادة
  name: string;         // اسم المادة
  yearWorkMarks: number;    // درجات أعمال السنة
  practicalMarks: number;   // درجات العملي
  writtenMarks: number;     // درجات التحريري
  attendanceMarks: number;  // درجات الحضور
  quizzesMarks: number;     // درجات اختبارات مصغرة
  finalExamMarks: number;   // درجات الميد تيرم
}

/**
 * Grades earned by student
 */
export interface Grades {
  yearWorkMarks: number;    // درجات أعمال السنة المحصلة
  practicalMarks: number;   // درجات العملي المحصلة
  writtenMarks: number;     // درجات التحريري المحصلة
  attendanceMarks: number;  // درجات الحضور المحصلة
  quizzesMarks: number;     // درجات اختبارات مصغرة المحصلة
  finalExamMarks: number;   // درجات الميد تيرم المحصلة
  totalMarks: number;       // إجمالي الدرجات المحصلة
}

/**
 * Maximum possible marks
 */
export interface MaxMarks {
  yearWorkMarks: number;    // أقصى درجات أعمال السنة
  practicalMarks: number;   // أقصى درجات العملي
  writtenMarks: number;     // أقصى درجات التحريري
  attendanceMarks: number;  // أقصى درجات الحضور
  quizzesMarks: number;     // أقصى درجات اختبارات مصغرة
  finalExamMarks: number;   // أقصى درجات الميد تيرم
  total: number;            // إجمالي أقصى الدرجات
}

/**
 * Content with grades information
 */
export interface ContentWithGrades {
  content: Content;
  grades: Grades;
  maxMarks: MaxMarks;
  percentage: number;         // النسبة المئوية للمادة
}

/**
 * Classroom statistics
 */
export interface ClassroomStats {
  totalEarned: number;        // إجمالي الدرجات المحصلة في الفصل
  totalMax: number;           // إجمالي الدرجات الكاملة في الفصل
  percentage: number;         // النسبة المئوية للفصل
  contentCount: number;       // عدد المواد في الفصل
}

/**
 * Classroom with contents and stats
 */
export interface ClassroomWithContents {
  classroom: Classroom;
  contents: ContentWithGrades[];
  stats: ClassroomStats;
}

/**
 * Complete grades response from API
 */
export interface GradesResponse {
  trainee: Trainee;
  overallStats: OverallStats;
  classrooms: ClassroomWithContents[];
}

/**
 * API response wrapper
 */
export interface MyGradesResponse {
  success: boolean;
  data: GradesResponse;
  message?: string;
}

/**
 * Grade type enum for different types of marks
 */
export enum GradeType {
  YEAR_WORK = 'yearWorkMarks',
  PRACTICAL = 'practicalMarks',
  WRITTEN = 'writtenMarks',
  ATTENDANCE = 'attendanceMarks',
  QUIZZES = 'quizzesMarks',
  FINAL_EXAM = 'finalExamMarks',
}

/**
 * Grade type display information
 */
export interface GradeTypeInfo {
  key: GradeType;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
}

/**
 * Grade type display mapping
 */
export const GRADE_TYPE_INFO: Record<GradeType, GradeTypeInfo> = {
  [GradeType.YEAR_WORK]: {
    key: GradeType.YEAR_WORK,
    label: 'Year Work',
    labelAr: 'أعمال السنة',
    icon: '📝',
    color: '#3B82F6',
  },
  [GradeType.PRACTICAL]: {
    key: GradeType.PRACTICAL,
    label: 'Practical',
    labelAr: 'العملي',
    icon: '🔬',
    color: '#10B981',
  },
  [GradeType.WRITTEN]: {
    key: GradeType.WRITTEN,
    label: 'Written',
    labelAr: 'التحريري',
    icon: '✍️',
    color: '#F59E0B',
  },
  [GradeType.ATTENDANCE]: {
    key: GradeType.ATTENDANCE,
    label: 'Attendance',
    labelAr: 'الحضور',
    icon: '📅',
    color: '#8B5CF6',
  },
  [GradeType.QUIZZES]: {
    key: GradeType.QUIZZES,
    label: 'Quizzes',
    labelAr: 'اختبارات مصغرة',
    icon: '📋',
    color: '#EF4444',
  },
  [GradeType.FINAL_EXAM]: {
    key: GradeType.FINAL_EXAM,
    label: 'Final Exam',
    labelAr: 'الميد تيرم',
    icon: '🎯',
    color: '#EC4899',
  },
};

/**
 * Error response from grades API
 */
export interface GradesError {
  message: string;
  statusCode: number;
  details?: any;
}

