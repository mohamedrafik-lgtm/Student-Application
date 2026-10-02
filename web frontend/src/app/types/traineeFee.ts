import { FeeType, Year } from './enums';
import { TrainingProgram } from './trainingProgram';
import { Account } from './account';

export interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  priority: number;
  type: FeeType;
  academicYear: string;
  allowReceiptPrinting: boolean;
  allowMultipleApply: boolean;
  programId: number;
  program?: TrainingProgram;
  classLevel: Year;
  accountId: number;
  account?: Account;
  isApplied: boolean;
  appliedAt?: string | null;
  appliedById?: string | null;
  appliedAccountId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTraineeFeeDTO {
  name: string;
  amount: number;
  priority: number;
  type: FeeType;
  academicYear: string;
  allowReceiptPrinting?: boolean;
  allowMultipleApply?: boolean;
  programId: number;
  classLevel?: Year;
  accountId: number;
}

export interface ApplyTraineeFeeResult {
  success: boolean;
  message: string;
  traineeFee: TraineeFee;
  traineesCount: number;
  totalAmount: number;
} 