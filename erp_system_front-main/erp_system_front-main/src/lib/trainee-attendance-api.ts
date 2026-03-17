import { fetchTraineeAPI } from './trainee-api';

export interface TraineeAttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export interface AttendanceSession {
  id: number;
  sessionId: number;
  date: string;
  dayOfWeek: string;
  sessionType: string;
  status: string;
  isCancelled: boolean;
  notes: string | null;
  createdAt: string;
}

export interface ContentGroup {
  content: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  sessions: AttendanceSession[];
  stats: TraineeAttendanceStats;
}

export interface ClassroomGroup {
  classroom: {
    id: number;
    name: string;
    classNumber: number;
    startDate: string | null;
    endDate: string | null;
  };
  contentGroups: ContentGroup[];
  stats: TraineeAttendanceStats;
}

export interface TraineeAttendanceData {
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl: string | null;
    program: {
      id: number;
      nameAr: string;
      nameEn: string;
    };
  };
  stats: TraineeAttendanceStats;
  classroomGroups: ClassroomGroup[];
  contentGroups: ContentGroup[]; // flat list for backward compatibility
}

export const traineeAttendanceAPI = {
  async getMyAttendanceRecords(): Promise<TraineeAttendanceData> {
    return await fetchTraineeAPI('trainee-auth/attendance-records');
  },
};

