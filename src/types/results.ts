// Types for Exam Results Feature
// SOLID Principle: Single Responsibility — only result-related type definitions

export interface Subject {
  id: string;
  name: string;
}

export interface Exam {
  id: string;
  title: string;
  type: 'PAPER' | 'ONLINE';
  passingScore: number;
  totalScore: number;
  duration: number;
  subject: Subject | null;
}

export interface ExamResult {
  id: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  exam: Exam;
}

export type MyResultsResponse = ExamResult[];

export type ResultFilterType = 'ALL' | 'PASSED' | 'FAILED';

export interface ResultsError {
  message: string;
  statusCode: number;
  details?: any;
}
