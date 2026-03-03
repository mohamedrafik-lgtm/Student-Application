// Types for Surveys Feature
// SOLID Principle: Single Responsibility — only survey-related type definitions

export interface SurveyOption {
  id: string;
  text: string;
  sortOrder: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  sortOrder: number;
  options: SurveyOption[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  isAnswered: boolean;
  questions: SurveyQuestion[];
  _count: {
    questions: number;
  };
}

export type MySurveysResponse = Survey[];

export interface SubmitSurveyAnswer {
  questionId: string;
  optionId: string;
}

export interface SubmitSurveyRequest {
  answers: SubmitSurveyAnswer[];
}

export interface SubmitSurveyResponse {
  message: string;
}

export interface SurveyError {
  message: string;
  statusCode: number;
  details?: any;
}
