import { fetchAPI } from './api';
import { fetchTraineeAPI } from './trainee-api';

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
  gradeComponentKey?: string | null;
  gradeComponentLabel?: string | null;
  gradeAllocation?: number | null;
  feeRequirementEnabled: boolean;
  requiredFeeId: number | null;
  requiredFee?: { id: number; name: string; amount: number; programId: number } | null;
  deliveryPlatform: 'WEB' | 'MOBILE' | 'BOTH';
  integrityMonitoringEnabled: boolean;
  maxTabDepartures: number;
  gradeAllocationLogs?: Array<{
    id: number; oldComponentLabel?: string | null; oldAllocation?: number | null;
    newComponentLabel: string; newAllocation: number; changedAt: string;
  }>;
  trainingContent: {
    id: number;
    name: string;
    code: string;
    programId?: number;
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
  tabDepartureCount?: number;
  integrityBlockedAt?: string | null;
  integrityBlockReason?: string | null;
  integrityMonitoringEnabled?: boolean;
  maxTabDepartures?: number;
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
  gradeComponentKey: string;
  gradeAllocation: number;
  feeRequirementEnabled: boolean;
  requiredFeeId: number | null;
  deliveryPlatform?: 'WEB' | 'MOBILE' | 'BOTH';
  integrityMonitoringEnabled?: boolean;
  maxTabDepartures?: number;
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

export interface UpdateQuizDto extends Omit<CreateQuizDto, 'gradeComponentKey' | 'gradeAllocation' | 'feeRequirementEnabled' | 'requiredFeeId'> {
  gradeComponentKey?: string | null;
  gradeAllocation?: number | null;
  feeRequirementEnabled?: boolean;
  requiredFeeId?: number | null;
  deliveryPlatform?: 'WEB' | 'MOBILE' | 'BOTH';
  integrityMonitoringEnabled?: boolean;
  maxTabDepartures?: number;
}

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
  status: 'upcoming' | 'available' | 'ended' | 'completed';
  canAttempt: boolean;
  paymentActionBlocked?: boolean;
  paymentBlockMessage?: string;
  feesRequiredToUnlock?: Array<{
    feeId: number;
    feeName: string;
    remainingAmount: number;
  }>;
  feeRequirement?: {
    required: boolean;
    feeId: number | null;
    feeName: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    isPaid: boolean;
    isAccessAllowed?: boolean;
    exceptionDeadline?: string | null;
  };
  isMobileOnly?: boolean;
  mobileApp?: { enabled: boolean; googlePlayUrl: string; appStoreUrl: string } | null;
  integrityBlocked?: boolean;
  tabDepartureCount?: number;
  missedExamRequestEligible?: boolean;
  accessRequest?: {
    id: number; type: 'INTEGRITY_REVIEW' | 'MISSED_EXAM'; status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reason: string; reviewNotes?: string | null; scheduledStartAt?: string | null; scheduledEndAt?: string | null; createdAt: string;
  } | null;
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

export async function startQuiz(quizId: number, platform: 'WEB' | 'MOBILE' = 'WEB'): Promise<QuizAttempt> {
  return fetchAPI('/quizzes/trainee/start', {
    method: 'POST',
    body: JSON.stringify({ quizId, platform }),
  });
}

export async function submitAnswer(
  attemptId: string,
  questionId: number,
  selectedAnswer?: string,
  textAnswer?: string,
  platform: 'WEB' | 'MOBILE' = 'WEB'
): Promise<QuizAnswer> {
  return fetchAPI('/quizzes/trainee/answer', {
    method: 'POST',
    body: JSON.stringify({
      attemptId,
      questionId,
      selectedAnswer,
      textAnswer,
      platform,
    }),
  });
}

export async function submitQuiz(attemptId: string, platform: 'WEB' | 'MOBILE' = 'WEB'): Promise<QuizAttempt> {
  return fetchAPI('/quizzes/trainee/submit', {
    method: 'POST',
    body: JSON.stringify({ attemptId, platform }),
  });
}

export async function recordQuizDeparture(attemptId: string, event: { platform: 'WEB' | 'MOBILE'; clientEventId: string; details?: string }): Promise<{ departureCount: number; maxDepartures: number; blocked: boolean }> {
  return fetchTraineeAPI(`/quizzes/trainee/attempt/${attemptId}/departure`, {
    method: 'POST',
    body: JSON.stringify(event),
    keepalive: true,
  });
}

export async function createQuizAccessRequest(input: { quizId: number; requestType: 'INTEGRITY_REVIEW' | 'MISSED_EXAM'; reason: string }): Promise<unknown> {
  return fetchTraineeAPI('/quizzes/trainee/access-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function reviewQuizAccessRequest(requestId: number, input: { decision: 'APPROVED' | 'REJECTED'; reviewNotes?: string; scheduledStartAt?: string; scheduledEndAt?: string }): Promise<unknown> {
  return fetchAPI(`/quizzes/access-requests/${requestId}/review`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function getAttemptResult(attemptId: string): Promise<QuizAttempt> {
  return fetchAPI(`/quizzes/trainee/attempt/${attemptId}/result`);
}

