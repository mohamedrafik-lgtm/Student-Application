// Types for Attendance Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * Day of week enum
 */
export enum DayOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

/**
 * Session type enum
 */
export enum SessionType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL',
}

/**
 * Attendance status enum
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

/**
 * Program information
 */
export interface Program {
  id: number;
  nameAr: string;         // اسم البرنامج بالعربية
  nameEn: string;         // اسم البرنامج بالإنجليزية
  price: number;
  description: string | null;
  numberOfClassrooms: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Classroom information
 */
export interface Classroom {
  id: number;
  name: string;           // اسم الفصل الدراسي
  classNumber: number;    // رقم الفصل
  programId: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trainee information
 */
export interface Trainee {
  id: number;
  nameAr: string;           // الاسم بالعربية
  nameEn: string;           // الاسم بالإنجليزية
  nationalId: string;       // الرقم القومي
  photoUrl: string | null;  // رابط الصورة الشخصية
  program: Program;
  classroom: Classroom | null;
}

/**
 * Attendance session record
 */
export interface AttendanceSession {
  id: string;             // معرف سجل الحضور
  sessionId: number;      // معرف الجلسة
  date: Date;             // تاريخ الجلسة
  dayOfWeek: DayOfWeek;
  sessionType: SessionType;  // نوع الجلسة (نظري/عملي)
  status: AttendanceStatus;  // حالة الحضور
  isCancelled: boolean;   // هل الجلسة ملغاة
  notes: string | null;   // ملاحظات
  createdAt: Date;        // تاريخ إنشاء السجل
}

/**
 * Content information
 */
export interface Content {
  id: number;
  nameAr: string;         // اسم المادة بالعربية
  nameEn: string;         // اسم المادة بالإنجليزية
}

/**
 * Content group with sessions and stats
 */
export interface ContentGroup {
  content: Content;
  sessions: AttendanceSession[];
  stats: {
    total: number;           // إجمالي جلسات المادة
    present: number;         // حضور في المادة
    absent: number;         // غياب في المادة
    late: number;            // تأخير في المادة
    excused: number;        // غياب بعذر في المادة
    attendanceRate: number;  // نسبة الحضور في المادة
  };
}

/**
 * Overall attendance statistics
 */
export interface AttendanceStats {
  total: number;            // إجمالي عدد الجلسات
  present: number;          // عدد الحضور
  absent: number;           // عدد الغياب
  late: number;             // عدد التأخير
  excused: number;          // عدد الغياب بعذر
  attendanceRate: number;   // نسبة الحضور (مئوية)
}

/**
 * Complete attendance response from API
 */
export interface AttendanceResponse {
  trainee: Trainee;
  stats: AttendanceStats;
  contentGroups: ContentGroup[];
}

/**
 * API response wrapper
 */
export interface AttendanceRecordsResponse {
  success: boolean;
  data: AttendanceResponse;
  message?: string;
}

/**
 * Attendance status display information
 */
export interface AttendanceStatusInfo {
  status: AttendanceStatus;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

/**
 * Attendance status display mapping
 */
export const ATTENDANCE_STATUS_INFO: Record<AttendanceStatus, AttendanceStatusInfo> = {
  [AttendanceStatus.PRESENT]: {
    status: AttendanceStatus.PRESENT,
    label: 'Present',
    labelAr: 'حاضر',
    icon: '✅',
    color: '#10B981',
    backgroundColor: '#10B98120',
  },
  [AttendanceStatus.ABSENT]: {
    status: AttendanceStatus.ABSENT,
    label: 'Absent',
    labelAr: 'غائب',
    icon: '❌',
    color: '#EF4444',
    backgroundColor: '#EF444420',
  },
  [AttendanceStatus.LATE]: {
    status: AttendanceStatus.LATE,
    label: 'Late',
    labelAr: 'متأخر',
    icon: '⏰',
    color: '#F59E0B',
    backgroundColor: '#F59E0B20',
  },
  [AttendanceStatus.EXCUSED]: {
    status: AttendanceStatus.EXCUSED,
    label: 'Excused',
    labelAr: 'بعذر',
    icon: '📝',
    color: '#8B5CF6',
    backgroundColor: '#8B5CF620',
  },
};

/**
 * Session type display information
 */
export interface SessionTypeInfo {
  type: SessionType;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
}

/**
 * Session type display mapping
 */
export const SESSION_TYPE_INFO: Record<SessionType, SessionTypeInfo> = {
  [SessionType.THEORY]: {
    type: SessionType.THEORY,
    label: 'Theory',
    labelAr: 'نظري',
    icon: '📚',
    color: '#3B82F6',
  },
  [SessionType.PRACTICAL]: {
    type: SessionType.PRACTICAL,
    label: 'Practical',
    labelAr: 'عملي',
    icon: '🔬',
    color: '#10B981',
  },
};

/**
 * Day of week display information
 */
export interface DayOfWeekInfo {
  day: DayOfWeek;
  label: string;
  labelAr: string;
  shortLabel: string;
  shortLabelAr: string;
}

/**
 * Day of week display mapping
 */
export const DAY_OF_WEEK_INFO: Record<DayOfWeek, DayOfWeekInfo> = {
  [DayOfWeek.SUNDAY]: {
    day: DayOfWeek.SUNDAY,
    label: 'Sunday',
    labelAr: 'الأحد',
    shortLabel: 'Sun',
    shortLabelAr: 'أحد',
  },
  [DayOfWeek.MONDAY]: {
    day: DayOfWeek.MONDAY,
    label: 'Monday',
    labelAr: 'الاثنين',
    shortLabel: 'Mon',
    shortLabelAr: 'اثن',
  },
  [DayOfWeek.TUESDAY]: {
    day: DayOfWeek.TUESDAY,
    label: 'Tuesday',
    labelAr: 'الثلاثاء',
    shortLabel: 'Tue',
    shortLabelAr: 'ثلث',
  },
  [DayOfWeek.WEDNESDAY]: {
    day: DayOfWeek.WEDNESDAY,
    label: 'Wednesday',
    labelAr: 'الأربعاء',
    shortLabel: 'Wed',
    shortLabelAr: 'أرب',
  },
  [DayOfWeek.THURSDAY]: {
    day: DayOfWeek.THURSDAY,
    label: 'Thursday',
    labelAr: 'الخميس',
    shortLabel: 'Thu',
    shortLabelAr: 'خمس',
  },
  [DayOfWeek.FRIDAY]: {
    day: DayOfWeek.FRIDAY,
    label: 'Friday',
    labelAr: 'الجمعة',
    shortLabel: 'Fri',
    shortLabelAr: 'جمع',
  },
  [DayOfWeek.SATURDAY]: {
    day: DayOfWeek.SATURDAY,
    label: 'Saturday',
    labelAr: 'السبت',
    shortLabel: 'Sat',
    shortLabelAr: 'سبت',
  },
};

/**
 * Error response from attendance API
 */
export interface AttendanceError {
  message: string;
  statusCode: number;
  details?: any;
}
