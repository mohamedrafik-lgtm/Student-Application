// Types for Assignments (المهام والتكليفات)

export interface Instructor {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export type SubmissionStatus = 'SUBMITTED' | 'GRADED';

export interface Submission {
  id: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  status: SubmissionStatus;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: Instructor;
  subject: Subject;
  submission: Submission | null;
}

export type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';
export type AssignmentFilterTab = 'ALL' | 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

export interface SubmitAssignmentResponse {
  id: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  status: SubmissionStatus;
}

export interface AssignmentsError {
  message: string;
  statusCode?: number;
  details?: any;
}
