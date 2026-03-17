export class CreateBatchGradingSessionDto {
  paperExamId: number;
  totalPages: number;
  fileName: string;
}

export class UpdateBatchGradingSessionDto {
  sessionId: string;
  status: 'processing' | 'paused' | 'completed' | 'failed';
  currentIndex?: number;
  completed?: BatchGradingResult[];
  skipped?: BatchGradingSkipped[];
  failed?: BatchGradingFailed[];
}

export interface BatchGradingResult {
  pageNumber: number;
  sheetId: number;
  studentName: string;
  nationalId: string;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timestamp: string;
}

export interface BatchGradingSkipped {
  pageNumber: number;
  reason: string;
  nationalId?: string;
  timestamp: string;
}

export interface BatchGradingFailed {
  pageNumber: number;
  error: string;
  timestamp: string;
}
