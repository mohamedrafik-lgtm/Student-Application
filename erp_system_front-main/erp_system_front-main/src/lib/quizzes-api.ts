import { fetchAPI } from './api';

// ==================== Types ====================

export interface Quiz {
  id: number;
  trainingContentId: number;
  title: string;
  description?: string;
  instructions?: string;
  startDate: string;
  endDate: string;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  isActive: boolean;
  isPublished: boolean;
  trainingContent: {
    id: number;
    name: string;
    code: string;
    classroom: {
      id: number;
      name: string;
    };
  };
  questions?: QuizQuestion[];
  _count?: {
    questions: number;
    attempts: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionId: number;
  order: number;
  points: number;
  question: Question;
}

export interface Question {
  id: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  skill: 'RECALL' | 'COMPREHENSION' | 'DEDUCTION';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  chapter: number;
  contentId: number;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
  questionId: number;
}

export interface QuizAttempt {
  id: string;
  quizId: number;
  traineeId: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  duration?: number;
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'CANCELLED';
  quiz?: Quiz;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: number;
  selectedAnswer?: string;
  textAnswer?: string;
  isCorrect?: boolean;
  points?: number;
  feedback?: string;
  answeredAt: string;
  timeSpent?: number;
  question?: Question;
}

export interface CreateQuizDto {
  trainingContentId: number;
  title: string;
  description?: string;
  instructions?: string;
  startDate: string;
  endDate: string;
  duration: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  questions: {
    questionId: number;
    order?: number;
    points?: number;
  }[];
}

export interface UpdateQuizDto extends CreateQuizDto {}

export interface AvailableQuiz extends Quiz {
  attemptsCount: number;
  attempts: {
    id: string;
    attemptNumber: number;
    status: string;
    score?: number;
    percentage?: number;
    passed?: boolean;
    submittedAt?: string;
  }[];
  status: 'upcoming' | 'available' | 'ended';
  canAttempt: boolean;
}

// ==================== Dashboard APIs ====================

export async function getAllQuizzes(contentId?: number): Promise<Quiz[]> {
  const params = contentId ? `?contentId=${contentId}` : '';
  return fetchAPI(`/quizzes${params}`);
}

export async function getQuiz(id: number): Promise<Quiz> {
  return fetchAPI(`/quizzes/${id}`);
}

export async function getQuizById(id: number): Promise<Quiz> {
  return fetchAPI(`/quizzes/${id}`);
}

export async function createQuiz(data: CreateQuizDto): Promise<Quiz> {
  return fetchAPI('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuiz(id: number, data: UpdateQuizDto): Promise<Quiz> {
  return fetchAPI(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQuiz(id: number): Promise<{ message: string }> {
  return fetchAPI(`/quizzes/${id}`, {
    method: 'DELETE',
  });
}

// ==================== Trainee APIs ====================

export async function getAvailableQuizzes(): Promise<AvailableQuiz[]> {
  return fetchAPI('/quizzes/trainee/available');
}

export async function startQuiz(quizId: number): Promise<QuizAttempt> {
  return fetchAPI('/quizzes/trainee/start', {
    method: 'POST',
    body: JSON.stringify({ quizId }),
  });
}

export async function submitAnswer(
  attemptId: string,
  questionId: number,
  selectedAnswer?: string,
  textAnswer?: string
): Promise<QuizAnswer> {
  return fetchAPI('/quizzes/trainee/answer', {
    method: 'POST',
    body: JSON.stringify({
      attemptId,
      questionId,
      selectedAnswer,
      textAnswer,
    }),
  });
}

export async function submitQuiz(attemptId: string): Promise<QuizAttempt> {
  return fetchAPI('/quizzes/trainee/submit', {
    method: 'POST',
    body: JSON.stringify({ attemptId }),
  });
}

export async function getAttemptResult(attemptId: string): Promise<QuizAttempt> {
  return fetchAPI(`/quizzes/trainee/attempt/${attemptId}/result`);
}

