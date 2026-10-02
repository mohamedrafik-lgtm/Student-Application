import { apiClient } from './client';
import {
  Safe,
  Transaction,
  TraineeFee,
  TraineePayment,
  TransactionType,
  FeeType,
  PaymentStatus,
  SafeCategory,
  SAFE_CATEGORY_LABELS,
} from '../../types/finances';

// ======== الخزائن ========

export const getSafeCategories = async (): Promise<{
  categories: SafeCategory[];
  labels: Record<SafeCategory, string>;
}> => {
  const response = await apiClient.get('/finances/safes/categories');
  return response.data;
};

export const createSafe = async (data: {
  name: string;
  description?: string;
  category?: SafeCategory;
  balance?: number;
  currency?: string;
  isActive?: boolean;
}): Promise<Safe> => {
  const response = await apiClient.post('/finances/safes', data);
  return response.data;
};

export const getAllSafes = async (): Promise<Safe[]> => {
  const response = await apiClient.get('/finances/safes');
  return response.data;
};

export const getSafeById = async (id: string): Promise<Safe> => {
  const response = await apiClient.get(`/finances/safes/${id}`);
  return response.data;
};

export const updateSafe = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    currency?: string;
    isActive?: boolean;
  }
): Promise<Safe> => {
  const response = await apiClient.patch(`/finances/safes/${id}`, data);
  return response.data;
};

// ======== المعاملات المالية ========

export const createTransaction = async (data: {
  amount: number;
  type: TransactionType;
  description?: string;
  reference?: string;
  sourceId?: string;
  targetId?: string;
}): Promise<Transaction> => {
  const response = await apiClient.post('/finances/transactions', data);
  return response.data;
};

export const getSafeTransactions = async (safeId: string, limit?: number): Promise<Transaction[]> => {
  const params = limit ? `?limit=${limit}` : '';
  const response = await apiClient.get(`/finances/safes/${safeId}/transactions${params}`);
  return response.data;
};

export const deleteSafe = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/finances/safes/${id}`);
  return response.data;
};

// ======== رسوم المتدربين ========

export const createTraineeFee = async (data: {
  name: string;
  amount: number;
  type: FeeType;
  academicYear: string;
  allowMultipleApply?: boolean;
  allowPartialPayment?: boolean;
  refundDeadlineEnabled?: boolean;
  refundDeadlineAt?: string;
  programId: number;
  safeId: string;
}): Promise<TraineeFee> => {
  const response = await apiClient.post('/finances/trainee-fees', data);
  return response.data;
};

export const getAllTraineeFees = async (): Promise<TraineeFee[]> => {
  const response = await apiClient.get('/finances/trainee-fees');
  return response.data;
};

export const getTraineeFeeById = async (id: number): Promise<TraineeFee> => {
  const response = await apiClient.get(`/finances/trainee-fees/${id}`);
  return response.data;
};

export const getTraineeFeeReport = async (id: number, reportType?: string): Promise<TraineeFee> => {
  const params = reportType ? `?type=${reportType}` : '';
  const response = await apiClient.get(`/finances/trainee-fees/${id}/report${params}`);
  return response.data;
};

export const updateTraineeFee = async (
  id: number,
  data: {
    name?: string;
    amount?: number;
    type?: string;
    academicYear?: string;
    allowMultipleApply?: boolean;
    allowPartialPayment?: boolean;
    refundDeadlineEnabled?: boolean;
    refundDeadlineAt?: string;
    programId?: number;
    safeId?: string;
  }
): Promise<TraineeFee> => {
  const response = await apiClient.patch(`/finances/trainee-fees/${id}`, data);
  return response.data;
};

export const deleteTraineeFee = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/finances/trainee-fees/${id}`);
  return response.data;
};

export const applyTraineeFee = async (
  id: number,
  data: {
    traineeIds?: number[];
    description?: string;
  }
): Promise<any> => {
  const response = await apiClient.post(`/finances/trainee-fees/${id}/apply`, data);
  return response.data;
};

// ======== مدفوعات المتدربين ========

export const createTraineePayment = async (data: {
  feeId: number;
  traineeId: number;
  amount: number;
  safeId: string;
  notes?: string;
}): Promise<any> => {
  const response = await apiClient.post('/finances/trainee-payments', data);
  return response.data;
};

export const removeTraineePayment = async (paymentId: number): Promise<any> => {
  const response = await apiClient.delete(`/finances/trainee-payments/${paymentId}/remove`);
  return response.data;
};

export const getUnpaidTraineePayments = async (): Promise<TraineePayment[]> => {
  const response = await apiClient.get('/finances/trainee-payments/unpaid');
  return response.data;
};

export const getAllTraineePayments = async (filters?: {
  page?: number;
  limit?: number;
  traineeId?: number;
  status?: string;
}): Promise<{data: TraineePayment[], pagination: any} | TraineePayment[]> => {
  let endpoint = '/finances/trainee-payments';
  
  if (filters) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.traineeId) params.append('traineeId', filters.traineeId.toString());
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  const response = await apiClient.get(endpoint);
  return response.data;
};

// دالة للحصول على جميع المدفوعات بدون pagination (للتوافق مع الكود القديم)
export const getAllTraineePaymentsLegacy = async (): Promise<TraineePayment[]> => {
  const response = await apiClient.get('/finances/trainee-payments-legacy');
  return response.data;
};

// دالة للحصول على المتدربين مع البيانات المالية المحسوبة
export const getTraineesWithFinancialData = async (filters?: {
  page?: number;
  limit?: number;
  programId?: number;
  status?: string;
  search?: string;
}) => {
  let endpoint = '/finances/trainees-financial-data';
  
  if (filters) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.programId) params.append('programId', filters.programId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  const response = await apiClient.get(endpoint);
  return response.data;
};

export const getTraineePaymentsByTraineeId = async (traineeId: number): Promise<TraineePayment[]> => {
  const response = await apiClient.get(`/finances/trainees/${traineeId}/payments`);
  return response.data;
};

// ======== الدفع التلقائي ========

export const processAutoPayment = async (data: {
  traineeId: number;
  amount: number;
  safeId: string;
  notes?: string;
}): Promise<any> => {
  const response = await apiClient.post('/finances/auto-payment', data);
  return response.data;
}; 