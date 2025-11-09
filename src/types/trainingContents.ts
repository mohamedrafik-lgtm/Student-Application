// Types for Training Contents Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

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
 * Error response from training contents API
 */
export interface TrainingContentsError {
  message: string;
  statusCode: number;
  details?: any;
}

