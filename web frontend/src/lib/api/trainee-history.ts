import { fetchAPI } from '../api';

export interface TraineeEditHistoryItem {
  id: string;
  action: string;
  changes: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TraineeEditHistoryResponse {
  trainee: {
    id: number;
    name: string;
    createdBy: {
      id: string;
      name: string;
      email: string;
    } | null;
    updatedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
  history: TraineeEditHistoryItem[];
  count: number;
}

/**
 * الحصول على سجل تعديلات المتدرب
 */
export async function getTraineeEditHistory(traineeId: number): Promise<TraineeEditHistoryResponse> {
  return fetchAPI(`/trainees/${traineeId}/edit-history`);
}

