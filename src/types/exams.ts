// Types for Exams Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * Exam status enum
 */
export enum ExamStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
}

/**
 * Exam type enum
 */
export enum ExamType {
  QUIZ = 'QUIZ',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  PRACTICE = 'PRACTICE',
}

/**
 * Question type enum
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
}

/**
 * Instructor information
 */
export interface Instructor {
  id: number;
  name: string;
  email?: string;
}

/**
 * Course/Content information
 */
export interface Content {
  id: number;
  code: string;
  name: string;
  instructor: Instructor;
}

/**
 * Exam answer option
 */
export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Only visible in results
}

/**
 * Exam question
 */
export interface Question {
  id: number;
  examId: number;
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  options?: AnswerOption[]; // For multiple choice questions
  correctAnswer?: string; // For true/false or short answer (only in results)
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Student's answer to a question
 */
export interface StudentAnswer {
  questionId: number;
  answer: string;
  answeredAt: Date;
}

/**
 * Exam result for a single question
 */
export interface QuestionResult {
  questionId: number;
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

/**
 * Complete exam result
 */
export interface ExamResult {
  id: number;
  examId: number;
  traineeId: number;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;
  questions: QuestionResult[];
}

/**
 * Exam information
 */
export interface Exam {
  id: number;
  title: string;
  description?: string;
  contentId: number;
  content: Content;
  type: ExamType;
  status: ExamStatus;
  totalPoints: number;
  passingPercentage: number;
  duration: number; // in minutes
  startDate: Date;
  endDate: Date;
  allowedAttempts: number;
  currentAttempt?: number;
  questionsCount: number;
  isAvailable: boolean;
  result?: ExamResult;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API response for getting exams list
 */
export interface ExamsResponse {
  success: boolean;
  exams: Exam[];
  message?: string;
}

/**
 * API response for getting a single exam
 */
export interface ExamDetailResponse {
  success: boolean;
  exam: Exam;
  questions: Question[];
  message?: string;
}

/**
 * API request for submitting exam answers
 */
export interface SubmitExamRequest {
  examId: number;
  answers: StudentAnswer[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * API response for submitting exam
 */
export interface SubmitExamResponse {
  success: boolean;
  result: ExamResult;
  message?: string;
}

/**
 * API response for getting exam result
 */
export interface ExamResultResponse {
  success: boolean;
  result: ExamResult;
  message?: string;
}

/**
 * Error response from exam API
 */
export interface ExamError {
  message: string;
  statusCode: number;
  details?: any;
}

