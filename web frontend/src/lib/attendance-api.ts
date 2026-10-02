import { fetchAPI } from './api';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export interface AttendanceRecord {
  id: string;
  sessionId: number;
  traineeId: number;
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  trainee?: {
    id: number;
    nameAr: string;
    nationalId: string;
    email?: string;
    phone: string;
  };
  recordedByUser?: {
    id: string;
    name: string;
  };
}

export interface SessionWithAttendance {
  id: number;
  date: string;
  isCancelled: boolean;
  scheduleSlot: {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    type: string;
    location?: string;
    content: {
      id: number;
      code: string;
      name: string;
      instructor: {
        id: string;
        name: string;
      };
      classroom: {
        id: number;
        name: string;
      };
      program: {
        id: number;
        nameAr: string;
      };
    };
    classroom: {
      id: number;
      name: string;
    };
    distributionRoom?: {
      id: string;
      roomName: string;
    };
  };
  attendance: AttendanceRecord[];
}

export interface RecordAttendanceDto {
  sessionId: number;
  traineeId: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface BulkRecordAttendanceDto {
  sessionId: number;
  records: {
    traineeId: number;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

// تسجيل حضور واحد
export async function recordAttendance(data: RecordAttendanceDto): Promise<AttendanceRecord> {
  return fetchAPI('/attendance/record', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// تسجيل حضور جماعي
export async function bulkRecordAttendance(data: BulkRecordAttendanceDto): Promise<any> {
  return fetchAPI('/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// الحصول على سجلات الحضور لمحاضرة
export async function getSessionAttendance(sessionId: number): Promise<SessionWithAttendance> {
  return fetchAPI(`/attendance/session/${sessionId}`);
}

// الحصول على المتدربين المفترض حضورهم
export async function getExpectedTrainees(sessionId: number): Promise<any> {
  return fetchAPI(`/attendance/session/${sessionId}/expected-trainees`);
}

// إحصائيات محاضرة
export async function getSessionStats(sessionId: number): Promise<AttendanceStats> {
  return fetchAPI(`/attendance/session/${sessionId}/stats`);
}

// إحصائيات متدرب في مادة
export async function getTraineeStats(traineeId: number, contentId: number): Promise<any> {
  return fetchAPI(`/attendance/trainee/${traineeId}/content/${contentId}`);
}

// محاضراتي
export async function getMySessions(): Promise<any[]> {
  return fetchAPI('/attendance/my-sessions');
}

// حذف سجل حضور
export async function deleteAttendance(attendanceId: string): Promise<void> {
  return fetchAPI(`/attendance/${attendanceId}`, {
    method: 'DELETE',
  });
}


