import { fetchAPI } from '@/lib/api';

// رسوم المتدربين
export const fetchTraineeFees = async () => {
  return fetchAPI('/trainee-fees');
};

export const fetchTraineeFee = async (id: number) => {
  return fetchAPI(`/trainee-fees/${id}`);
};

export const createTraineeFee = async (data: any) => {
  return fetchAPI('/trainee-fees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTraineeFee = async (id: number, data: any) => {
  return fetchAPI(`/trainee-fees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteTraineeFee = async (id: number) => {
  return fetchAPI(`/trainee-fees/${id}`, {
    method: 'DELETE',
  });
};

export const applyTraineeFee = async (id: number) => {
  return fetchAPI(`/trainee-fees/${id}/apply`, {
    method: 'POST',
  });
};

// المتدربين المستحق عليهم الدفع
export const fetchUnpaidTraineesByFeeId = async (feeId: number) => {
  return fetchAPI(`/trainee-fee-payments/unpaid/by-fee/${feeId}`);
};

// البرامج التدريبية
export const fetchPrograms = async () => {
  return fetchAPI('/programs');
};

// شجرة الحسابات
export const fetchAccounts = async () => {
  return fetchAPI('/accounts/tree');
}; 