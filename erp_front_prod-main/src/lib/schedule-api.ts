import { fetchAPI } from './api';

export interface ScheduleSlot {
  id: number;
  contentId: number;
  classroomId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: 'THEORY' | 'PRACTICAL';
  location?: string;
  content: {
    id: number;
    code: string;
    name: string;
    instructor?: {
      id: string;
      name: string;
    };
  };
  classroom: {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
  };
  _count?: {
    sessions: number;
  };
  sessions?: ScheduledSession[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledSession {
  id: number;
  scheduleSlotId: number;
  date: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleSlotDto {
  contentId: number;
  classroomId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: 'THEORY' | 'PRACTICAL';
  location?: string;
  distributionRoomId?: string;
}

export interface DistributionRoom {
  id: string;
  roomName: string;
  distributionId: string;
  _count: {
    assignments: number;
  };
}

export interface CancelSessionDto {
  isCancelled: boolean;
  cancellationReason?: string;
}

// إنشاء فترة في الجدول
export async function createScheduleSlot(data: CreateScheduleSlotDto): Promise<ScheduleSlot> {
  return fetchAPI('/schedule/slots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// الحصول على جميع الفترات لفصل
export async function getScheduleByClassroom(classroomId: number): Promise<ScheduleSlot[]> {
  return fetchAPI(`/schedule/classroom/${classroomId}`);
}

// الحصول على الجدول الأسبوعي
export async function getWeeklySchedule(classroomId: number): Promise<any> {
  return fetchAPI(`/schedule/classroom/${classroomId}/weekly`);
}

// الحصول على فترة واحدة
export async function getScheduleSlot(id: number): Promise<ScheduleSlot> {
  return fetchAPI(`/schedule/slots/${id}`);
}

// تحديث فترة
export async function updateScheduleSlot(id: number, data: Partial<CreateScheduleSlotDto>): Promise<ScheduleSlot> {
  return fetchAPI(`/schedule/slots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// حذف فترة
export async function deleteScheduleSlot(id: number): Promise<void> {
  return fetchAPI(`/schedule/slots/${id}`, {
    method: 'DELETE',
  });
}

// الحصول على جلسات فترة
export async function getSessionsBySlot(slotId: number): Promise<ScheduledSession[]> {
  return fetchAPI(`/schedule/slots/${slotId}/sessions`);
}

// إلغاء/تفعيل محاضرة
export async function cancelSession(sessionId: number, data: CancelSessionDto): Promise<ScheduledSession> {
  return fetchAPI(`/schedule/sessions/${sessionId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// إعادة توليد الجلسات
export async function regenerateSessions(slotId: number): Promise<{ message: string }> {
  return fetchAPI(`/schedule/slots/${slotId}/regenerate`, {
    method: 'POST',
  });
}

// الحصول على المجموعات المتاحة لمادة ونوع معين
export async function getDistributionRooms(contentId: number, type: 'THEORY' | 'PRACTICAL'): Promise<DistributionRoom[]> {
  return fetchAPI(`/schedule/content/${contentId}/distribution-rooms?type=${type}`);
}
