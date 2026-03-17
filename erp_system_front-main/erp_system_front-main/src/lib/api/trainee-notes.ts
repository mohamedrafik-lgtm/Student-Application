import { fetchAPI } from '../api';

export interface TraineeNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TraineeNotesResponse {
  trainee: {
    id: number;
    name: string;
  };
  notes: TraineeNote[];
  count: number;
}

/**
 * الحصول على جميع ملاحظات المتدرب
 */
export async function getTraineeNotes(traineeId: number): Promise<TraineeNotesResponse> {
  return fetchAPI(`/trainees/${traineeId}/notes`);
}

/**
 * إضافة ملاحظة جديدة للمتدرب
 */
export async function createTraineeNote(traineeId: number, content: string): Promise<{ message: string; note: TraineeNote }> {
  return fetchAPI(`/trainees/${traineeId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/**
 * تحديث ملاحظة موجودة
 */
export async function updateTraineeNote(noteId: string, content: string): Promise<{ message: string; note: TraineeNote }> {
  return fetchAPI(`/trainees/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

/**
 * حذف ملاحظة
 */
export async function deleteTraineeNote(noteId: string): Promise<{ message: string }> {
  return fetchAPI(`/trainees/notes/${noteId}`, {
    method: 'DELETE',
  });
}

