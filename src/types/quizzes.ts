// Types for Quizzes Feature
// SOLID Principles Applied:
// 1. Single Responsibility: Each interface has a single, clear purpose
// 2. Open/Closed: Types can be extended without modification
// 3. Interface Segregation: Specific interfaces for different concerns

/**
 * Quiz status enum
 */
export enum QuizStatus {
  UPCOMING = 'upcoming',     // لم يبدأ بعد
  ENDED = 'ended',          // انتهى موعده
  COMPLETED = 'completed',  // أنهاه المتدرب
  AVAILABLE = 'available',  // متاح للمتدرب
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
 * Classroom information
 */
export interface Classroom {
  id: number;
  name: string;
}

/**
 * Training content information
 */
export interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroom: Classroom;
}

/**
 * Quiz result information
 */
export interface QuizResult {
  id: string;          // معرف المحاولة
  score: number;       // الدرجة المحصلة
  percentage: number;  // النسبة المئوية
  passed: boolean;     // هل نجح
  submittedAt: Date;   // تاريخ التسليم
}

/**
 * Quiz count information
 */
export interface QuizCount {
  questions: number;  // عدد الأسئلة
}

/**
 * Available Quiz from API
 */
export interface AvailableQuiz {
  id: number;                    // معرف الاختبار
  trainingContentId: number;     // معرف المحتوى التدريبي
  title: string;                 // عنوان الاختبار
  description: string | null;    // وصف الاختبار
  instructions: string | null;   // تعليمات الاختبار
  startDate: Date;              // تاريخ بداية الاختبار
  endDate: Date;                // تاريخ نهاية الاختبار
  duration: number;             // مدة الاختبار بالدقائق
  passingScore: number;         // درجة النجاح (نسبة مئوية)
  maxAttempts: number;          // عدد المحاولات المسموح بها
  shuffleQuestions: boolean;    // خلط ترتيب الأسئلة
  shuffleAnswers: boolean;      // خلط ترتيب الإجابات
  showResults: boolean;         // عرض النتائج
  showCorrectAnswers: boolean;  // عرض الإجابات الصحيحة
  isActive: boolean;            // نشط
  isPublished: boolean;         // منشور
  createdAt: Date;
  updatedAt: Date;

  // البيانات المُحمّلة (include)
  trainingContent: TrainingContent;

  // عدد الأسئلة
  _count: QuizCount;

  // معلومات حالة الاختبار للمتدرب
  isCompleted: boolean;         // هل أنهى الاختبار
  hasInProgress: boolean;       // هل يوجد محاولة قيد التنفيذ
  
  result: QuizResult | null;    // النتيجة (null إذا لم ينهي الاختبار)

  status: QuizStatus;           // حالة الاختبار
  canAttempt: boolean;          // هل يمكن البدء في الاختبار
}

/**
 * API response for getting available quizzes
 */
export interface AvailableQuizzesResponse {
  success: boolean;
  quizzes: AvailableQuiz[];
  message?: string;
}

/**
 * Answer option for a question
 */
export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Only visible in results
}

/**
 * Quiz question
 */
export interface QuizQuestion {
  id: number;
  quizId: number;
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
 * API response for getting quiz detail
 */
export interface QuizDetailResponse {
  success: boolean;
  quiz: AvailableQuiz;
  questions: QuizQuestion[];
  message?: string;
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
 * API request for starting a quiz
 */
export interface StartQuizRequest {
  quizId: number;
}

/**
 * Question option in attempt
 */
export interface QuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

/**
 * Question in quiz attempt
 */
export interface AttemptQuestion {
  id: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  image: string | null;
  options: QuestionOption[];
}

/**
 * Quiz question in attempt
 */
export interface QuizAttemptQuestion {
  id: number;
  order: number;
  points: number;
  question: AttemptQuestion;
}

/**
 * Training content in attempt
 */
export interface AttemptTrainingContent {
  id: number;
  name: string;
  code: string;
  classroom: {
    id: number;
    name: string;
  };
}

/**
 * Quiz details in attempt
 */
export interface AttemptQuiz {
  id: number;
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  trainingContent: AttemptTrainingContent;
  questions: QuizAttemptQuestion[];
}

/**
 * Quiz attempt answer
 */
export interface QuizAttemptAnswer {
  questionId: number;
  selectedOptionId?: number;
  answer?: string;
  answeredAt: Date;
}

/**
 * API response for starting a quiz
 */
export interface StartQuizResponse {
  id: string;                    // معرف المحاولة
  quizId: number;
  traineeId: number;
  attemptNumber: number;
  status: 'IN_PROGRESS';
  startedAt: Date;
  totalPoints: number;
  quiz: AttemptQuiz;
  answers: QuizAttemptAnswer[];
}

/**
 * API request for submitting quiz answers
 */
export interface SubmitQuizRequest {
  quizId: number;
  attemptId: string;
  answers: StudentAnswer[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * Question result details
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
 * Complete quiz result
 */
export interface CompleteQuizResult {
  id: string;
  quizId: number;
  traineeId: number;
  attemptNumber: number;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  submittedAt: Date;
  questions: QuestionResult[];
}

/**
 * API response for submitting quiz
 */
export interface SubmitQuizResponse {
  success: boolean;
  result: CompleteQuizResult;
  message?: string;
}

/**
 * API response for getting quiz result
 */
export interface QuizResultResponse {
  success: boolean;
  result: CompleteQuizResult;
  message?: string;
}

/**
 * Error response from quiz API
 */
export interface QuizError {
  message: string;
  statusCode: number;
  details?: any;
}


/**
 * Submit answer request
 */
export interface SubmitAnswerRequest {
  attemptId: string;
  questionId: number;
  selectedAnswer?: string;
  textAnswer?: string;
}

/**
 * Quiz answer response
 */
export interface QuizAnswerResponse {
  id: string;
  attemptId: string;
  questionId: number;
  selectedAnswer: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  points: number | null;
  feedback: string | null;
  answeredAt: string;
  timeSpent: number | null;
  createdAt: string;
  updatedAt: string;
}
