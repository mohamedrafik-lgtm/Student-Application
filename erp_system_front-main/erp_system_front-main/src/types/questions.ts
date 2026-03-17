export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
}

export enum QuestionSkill {
  RECALL = 'RECALL',
  COMPREHENSION = 'COMPREHENSION',
  DEDUCTION = 'DEDUCTION',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

export interface QuestionOption {
  id?: number;
  text: string;
  isCorrect: boolean;
  questionId?: number;
}

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  skill: QuestionSkill;
  difficulty: QuestionDifficulty;
  chapter: number;
  contentId: number;
  createdById: string;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
  content?: {
    id: number;
    name: string;
    code: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
} 