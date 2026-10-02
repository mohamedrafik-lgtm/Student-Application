// أنواع المعاملات المالية
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',   // إيداع
  WITHDRAW = 'WITHDRAW', // سحب
  TRANSFER = 'TRANSFER', // تحويل بين حسابين
  FEE = 'FEE',           // رسوم متدربين
  PAYMENT = 'PAYMENT',   // دفع رسوم
}

// أنواع الرسوم
export enum FeeType {
  TUITION = 'TUITION',       // رسوم دراسية أساسية
  SERVICES = 'SERVICES',     // خدمات
  TRAINING = 'TRAINING',     // تدريب
  ADDITIONAL = 'ADDITIONAL', // رسوم إضافية
}

// حالة الدفع
export enum PaymentStatus {
  PENDING = 'PENDING',           // قيد الانتظار
  PAID = 'PAID',                 // مدفوع
  PARTIALLY_PAID = 'PARTIALLY_PAID', // مدفوع جزئياً
  CANCELLED = 'CANCELLED',       // ملغي
}

// تصنيفات الخزائن
export enum SafeCategory {
  DEBT = 'DEBT',                 // خزائن مديونية
  INCOME = 'INCOME',             // خزائن دخل
  EXPENSE = 'EXPENSE',           // خزائن مصروفات
  ASSETS = 'ASSETS',             // خزائن أصول
  UNSPECIFIED = 'UNSPECIFIED'   // غير محدد
}

export const SAFE_CATEGORY_LABELS: Record<SafeCategory, string> = {
  [SafeCategory.DEBT]: 'خزائن مديونية',
  [SafeCategory.INCOME]: 'خزائن دخل',
  [SafeCategory.EXPENSE]: 'خزائن مصروفات',
  [SafeCategory.ASSETS]: 'خزائن أصول',
  [SafeCategory.UNSPECIFIED]: 'غير محدد'
};

// نموذج الخزينة
export interface Safe {
  id: string;
  name: string;
  description?: string;
  category: SafeCategory;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sourceTransactions?: Transaction[];
  targetTransactions?: Transaction[];
  hasTransactions?: boolean;
}

// نموذج المعاملة المالية
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  reference?: string;
  sourceId?: string;
  sourceSafe?: Safe;
  targetId?: string;
  targetSafe?: Safe;
  traineeFeeId?: number;
  traineeFee?: TraineeFee;
  traineePaymentId?: number;
  traineePayment?: TraineePayment;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// نموذج رسوم المتدربين
export interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  type: FeeType;
  academicYear: string;
  allowMultipleApply: boolean;
  allowPartialPayment?: boolean;
  refundDeadlineEnabled?: boolean;
  refundDeadlineAt?: string | null;
  programId: number;
  program?: any; // TrainingProgram
  safeId: string;
  safe?: Safe;
  isApplied: boolean;
  appliedAt?: string;
  appliedById?: string;
  createdAt: string;
  updatedAt: string;
  traineePayments?: TraineePayment[];
  transactions?: Transaction[];
}

// نموذج مدفوعات المتدربين
export interface TraineePayment {
  id: number;
  amount: number;
  status: PaymentStatus;
  feeId: number;
  fee?: TraineeFee;
  traineeId: number;
  trainee?: any; // Trainee
  safeId: string;
  safe?: Safe;
  paidAmount: number;
  paidAt?: string;
  paidById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  transactions?: Transaction[];
} 