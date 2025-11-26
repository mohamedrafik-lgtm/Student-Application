// Types for Training Contents Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * نوع المحتوى
 */
export type ContentType = 'THEORY' | 'PRACTICAL' | 'BOTH' | 'UNSPECIFIED';

/**
 * معلومات المحاضر
 */
export interface Instructor {
  id: string;
  name: string;
  email: string;
}

/**
 * معلومات البرنامج التدريبي
 */
export interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description: string | null;
  numberOfClassrooms: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * معلومات الفصل الدراسي
 */
export interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  programId: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * مسؤول الحضور
 */
export interface AttendanceRecorder {
  id: string;
  name: string;
  email: string;
}

/**
 * تعيين مسؤول الحضور
 */
export interface AttendanceRecorderAssignment {
  id: string;
  trainingContentId: number;
  userId: string;
  assignedAt: string;
  assignedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: AttendanceRecorder;
}

/**
 * الواجهة الرئيسية للمادة الدراسية
 */
export interface TrainingContent {
  id: number;
  code: string;
  name: string;
  contentType: ContentType;
  
  // معلومات الجلسات
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
  
  // معلومات المحاضر
  instructor: Instructor;
  
  // معلومات البرنامج
  program: Program;
  
  // معلومات الفصل
  classroom: Classroom;
  
  // مسؤولو الحضور (اختياري)
  theoryAttendanceRecorder?: AttendanceRecorder | null;
  practicalAttendanceRecorder?: AttendanceRecorder | null;
  attendanceRecorders?: AttendanceRecorderAssignment[];
  
  // الإحصائيات
  _count: {
    questions?: number;
    scheduleSlots: number;
  };
  
  // التواريخ
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

/**
 * الاستجابة من الـ API - يرجع array مباشرةً
 */
export type TrainingContentsResponse = TrainingContent[];

/**
 * تفاصيل المادة الدراسية الكاملة
 * الاستجابة من GET /api/training-contents/:id
 */
export interface TrainingContentDetails {
  // البيانات الأساسية
  id: number;
  code: string;
  name: string;
  programId: number;
  classroomId: number;
  instructorId: string;
  contentType: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'UNSPECIFIED';
  
  // معلومات مسؤولي الحضور (النظام القديم)
  theoryAttendanceRecorderId: string | null;
  practicalAttendanceRecorderId: string | null;
  
  // معلومات الجلسات
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
  
  // التواريخ
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  
  // البيانات المرتبطة (Relations)
  
  // معلومات المحاضر
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  
  // معلومات البرنامج التدريبي (كاملة)
  program: {
    id: number;
    nameAr: string;
    nameEn: string;
    price: number;
    description: string | null;
    numberOfClassrooms: number;
    createdAt: string;
    updatedAt: string;
  };
  
  // معلومات الفصل الدراسي (كاملة)
  classroom: {
    id: number;
    name: string;
    classNumber: number;
    programId: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
  };
  
  // مسؤول حضور النظري
  theoryAttendanceRecorder: {
    id: string;
    name: string;
    email: string;
  } | null;
  
  // مسؤول حضور العملي
  practicalAttendanceRecorder: {
    id: string;
    name: string;
    email: string;
  } | null;
  
  // قائمة مسؤولي الحضور (النظام الجديد)
  attendanceRecorders: Array<{
    id: string;
    trainingContentId: number;
    userId: string;
    assignedAt: string;
    assignedBy: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  
  // الإحصائيات والعدادات
  _count: {
    questions?: number;      // موجود فقط إذا includeQuestionCount=true
    scheduleSlots: number;
  };
}

/**
 * Error response from training contents API
 */
export interface TrainingContentsError {
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * نوع المحاضرة
 */
export type LectureType = 'VIDEO' | 'PDF' | 'BOTH';

/**
 * المحاضرة
 */
export interface Lecture {
  id: number;
  title: string;                    // عنوان المحاضرة
  description: string | null;       // وصف المحاضرة (اختياري)
  type: LectureType;                // نوع المحاضرة (فيديو/PDF/كلاهما)
  chapter: number;                  // رقم الباب
  youtubeUrl: string | null;        // رابط يوتيوب (اختياري)
  pdfFile: string | null;           // اسم ملف PDF (اختياري)
  order: number;                    // ترتيب المحاضرة داخل الباب
  contentId: number;                // رقم المحتوى التدريبي
  createdAt: string;                // ISO Date string
  updatedAt: string;                // ISO Date string
}

/**
 * الاستجابة من الـ API - يرجع array من المحاضرات
 */
export type LecturesResponse = Lecture[];
/**
 * تفاصيل المحاضرة الكاملة
 * الاستجابة من GET /api/lectures/:id
 */
export interface LectureDetails {
  // البيانات الأساسية
  id: number;
  title: string;                    // عنوان المحاضرة
  description: string | null;       // وصف المحاضرة
  type: LectureType;                // نوع المحاضرة
  chapter: number;                  // رقم الباب
  youtubeUrl: string | null;        // رابط يوتيوب
  pdfFile: string | null;           // اسم ملف PDF
  order: number;                    // ترتيب المحاضرة
  contentId: number;                // رقم المحتوى التدريبي
  
  // التواريخ
  createdAt: string;                // ISO Date string
  updatedAt: string;                // ISO Date string
  
  // معلومات المحتوى التدريبي المرتبط
  content: {
    id: number;
    name: string;                   // اسم المادة
    code: string;                   // كود المادة
  };
}


/**
 * إحصائيات المحتوى التدريبي
 */
export interface ContentStats {
  totalContents: number;
  byContentType: {
    theory: number;
    practical: number;
    both: number;
    unspecified: number;
  };
  totalLectures: number;
  totalMarks: number;
}
