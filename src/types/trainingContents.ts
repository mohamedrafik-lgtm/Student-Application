// Types for Training Contents Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * Lecture Type Enum
 */
export enum LectureType {
  VIDEO = 'VIDEO',           // محاضرة فيديو
  PDF = 'PDF',               // محاضرة PDF
  BOTH = 'BOTH',             // فيديو و PDF
  TEXT = 'TEXT',             // نص فقط
}

/**
 * Program information
 */
export interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  price?: number;
  description?: string;
  duration?: string;
}

/**
 * Classroom information
 */
export interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  programId: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Instructor information
 */
export interface Instructor {
  id: string;
  name: string;
  email: string;
}

/**
 * Training Content (Material/Subject)
 */
export interface TrainingContent {
  id: number;
  code: string;
  name: string;
  programId: number;
  classroomId: number;
  
  // Marks configuration
  attendanceMarks: number;
  finalExamMarks: number;
  practicalMarks: number;
  quizzesMarks: number;
  writtenMarks: number;
  yearWorkMarks: number;
  
  // Sessions configuration
  practicalSessionsPerWeek: number;
  theorySessionsPerWeek: number;
  
  // Relationships
  instructorId: string;
  practicalAttendanceRecorderId: string | null;
  theoryAttendanceRecorderId: string | null;
  
  // Related data
  instructor: Instructor;
  practicalAttendanceRecorder: Instructor | null;
  theoryAttendanceRecorder: Instructor | null;
  classroom: Classroom;
  program: Program;
  
  // Statistics
  chaptersCount: number;
  _count: {
    scheduleSlots: number;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response for Training Contents
 */
export type TrainingContentsResponse = TrainingContent[];

/**
 * Training Content Details Response
 * Response from GET /api/training-contents/{id}
 */
export interface TrainingContentDetails {
  // معلومات المادة التدريبية الأساسية
  id: number;
  code: string;
  name: string;
  programId: number;
  classroomId: number;
  instructorId: string;
  
  // معلومات مسجلي الحضور (اختياري)
  theoryAttendanceRecorderId: string | null;
  practicalAttendanceRecorderId: string | null;
  
  // معلومات الجلسات الأسبوعية
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  chaptersCount: number;
  
  // توزيع الدرجات
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
  
  // تواريخ النظام
  createdAt: string;
  updatedAt: string;
  
  // العلاقات المُضمّنة
  instructor: Instructor;
  program: Program;
  classroom: Classroom;
  theoryAttendanceRecorder: Instructor | null;
  practicalAttendanceRecorder: Instructor | null;
  
  // المحاضرات (إذا تم تضمينها)
  lectures?: Lecture[];
  
  // الإحصائيات
  _count: {
    scheduleSlots: number;
    questions?: number;
  };
}

/**
 * Props for TrainingContentDetailsScreen
 */
export interface TrainingContentDetailsScreenProps {
  contentId: number;
  accessToken: string;
  onBack: () => void;
}

/**
 * Lecture (المحاضرة)
 */
export interface Lecture {
  // معلومات المحاضرة الأساسية
  id: number;
  title: string;
  description: string | null;
  type: LectureType;
  chapter: number;              // رقم الباب/الفصل
  order: number;                // ترتيب المحاضرة داخل الباب
  contentId: number;            // معرف المحتوى التدريبي المرتبط
  
  // روابط المحتوى
  youtubeUrl: string | null;
  pdfFile: string | null;
  
  // تواريخ النظام
  createdAt: string;
  updatedAt: string;
  
  // العلاقة المُضمّنة مع المحتوى التدريبي
  content: {
    id: number;
    name: string;
    code: string;
  };
}

/**
 * API Response for Lectures
 */
export type LecturesResponse = Lecture[];

/**
 * Lecture Details Response
 * Response from GET /api/lectures/{lectureId}
 */
export interface LectureDetails extends Lecture {
  // All fields from Lecture interface
  // Can be extended with additional fields if needed
}

/**
 * Props for LectureDetailsScreen
 */
export interface LectureDetailsScreenProps {
  lecture: Lecture;
  accessToken: string;
  onBack: () => void;
}

/**
 * Error response from training contents API
 */
export interface TrainingContentsError {
  message: string;
  statusCode: number;
  details?: any;
}

