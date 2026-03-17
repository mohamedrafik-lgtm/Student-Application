import { fetchAPI } from './api';

// =============== Types ===============

export interface PaperExam {
  id: number;
  trainingContentId: number;
  title: string;
  description?: string;
  instructions?: string;
  examDate: string;
  duration: number;
  gradeType: 'YEAR_WORK' | 'PRACTICAL' | 'WRITTEN' | 'FINAL_EXAM';
  totalMarks: number;
  passingScore: number;
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  isPublished: boolean;
  academicYear: string;
  semester?: 'FIRST' | 'SECOND';
  notes?: string;
  trainingContent?: any;
  _count?: {
    models: number;
    answerSheets: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaperExamModel {
  id: number;
  paperExamId: number;
  modelCode: string;
  modelName: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  wordFileUrl?: string;
  questions?: any[];
  _count?: {
    answerSheets: number;
  };
}

export interface PaperAnswerSheet {
  id: string;
  paperExamId: number;
  modelId: number;
  traineeId: number;
  sheetCode: string;
  qrCodeData: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'VERIFIED';
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt?: string;
  gradedAt?: string;
  scannedImageUrl?: string;
  trainee?: any;
  model?: any;
  paperExam?: any;
  answers?: any[];
}

// =============== Paper Exams API ===============

export async function createPaperExam(data: {
  trainingContentId: number;
  title: string;
  description?: string;
  instructions?: string;
  examDate: string;
  duration: number;
  gradeType: string;
  totalMarks: number;
  passingScore?: number;
  academicYear: string;
  semester?: string;
  notes?: string;
  isPublished?: boolean;
}): Promise<PaperExam> {
  return fetchAPI('/paper-exams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAllPaperExams(contentId?: number): Promise<PaperExam[]> {
  const query = contentId ? `?contentId=${contentId}` : '';
  return fetchAPI(`/paper-exams${query}`);
}

export async function getPaperExam(id: number): Promise<PaperExam> {
  return fetchAPI(`/paper-exams/${id}`);
}

export async function updatePaperExam(id: number, data: any): Promise<PaperExam> {
  return fetchAPI(`/paper-exams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePaperExam(id: number): Promise<{ message: string }> {
  return fetchAPI(`/paper-exams/${id}`, {
    method: 'DELETE',
  });
}

// =============== Exam Models API ===============

export async function createExamModel(data: {
  paperExamId: number;
  modelCode: string;
  modelName: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions: Array<{
    questionId: number;
    orderInModel: number;
    points?: number;
  }>;
}): Promise<PaperExamModel> {
  return fetchAPI('/paper-exams/models', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateAnswerSheets(examId: number, modelId: number) {
  return fetchAPI(`/paper-exams/${examId}/models/${modelId}/generate-sheets`, {
    method: 'POST',
  });
}

// =============== Answer Sheets API ===============

export async function getAnswerSheetByCode(sheetCode: string): Promise<PaperAnswerSheet> {
  return fetchAPI(`/paper-exams/answer-sheet/${sheetCode}`);
}

export async function scanAnswerSheet(data: {
  sheetCode: string;
  ocrData: any;
  scannedImageUrl?: string;
}) {
  return fetchAPI('/paper-exams/scan-answer-sheet', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getExamReport(id: number) {
  return fetchAPI(`/paper-exams/${id}/report`);
}

// =============== Excel Grades API ===============

export async function downloadGradesTemplate(examId: number): Promise<Blob> {
  // الحصول على التوكن من localStorage
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/paper-exams/${examId}/download-grades-template`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'فشل تحميل ملف Excel');
  }

  return response.blob();
}

export async function uploadGradesExcel(examId: number, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  // الحصول على التوكن من localStorage
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/paper-exams/${examId}/upload-grades-excel`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.message || 'فشل رفع ملف Excel');
    } catch {
      throw new Error('فشل رفع ملف Excel');
    }
  }

  return response.json();
}