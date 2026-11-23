import { API_CONFIG } from './apiConfig';

export interface DistributionRoom {
  id: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  isFull: boolean;
}

export interface Distribution {
  id: string;
  type: 'THEORY' | 'PRACTICAL';
  academicYear: string;
  classroomName: string;
  isRegistrationOpen: boolean;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  isJoined: boolean;
  joinedRoomId: string | null;
  rooms: DistributionRoom[];
}

export interface StudyMaterial {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  linkedFee: { name: string; amount: number } | null;
  delivery: {
    status: 'PENDING' | 'DELIVERED' | 'RETURNED' | 'LOST';
    quantity: number;
    deliveryDate: string | null;
    returnDate: string | null;
    notes: string | null;
  } | null;
}

export interface TraineeComplaint {
  id: string;
  type: 'COMPLAINT' | 'SUGGESTION';
  subject: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  adminResponse?: string;
  reviewer?: { name: string };
  reviewedAt?: string;
  createdAt: string;
}

export interface IdCardStatus {
  status: 'PENDING' | 'PRINTED' | 'DELIVERED' | 'LOST';
  printedAt?: string;
  deliveredAt?: string;
  printRecords: Array<{ id: number; printedAt: string; printedBy: string }>;
}

class TraineePlatformService {
  private async request<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  getDistributions(accessToken: string) {
    return this.request<Distribution[]>('/trainee-platform/distributions', accessToken);
  }

  joinDistribution(accessToken: string, roomId: string) {
    return this.request<{ success: boolean; message?: string }>(
      `/trainee-platform/distributions/rooms/${roomId}/join`,
      accessToken,
      { method: 'POST', body: '{}' },
    );
  }

  getStudyMaterials(accessToken: string) {
    return this.request<StudyMaterial[]>('/study-materials/trainee/me', accessToken);
  }

  getComplaints(accessToken: string) {
    return this.request<TraineeComplaint[]>('/complaints/my-complaints', accessToken);
  }

  createComplaint(accessToken: string, data: { type: 'COMPLAINT' | 'SUGGESTION'; subject: string; description: string }) {
    return this.request<any>('/complaints', accessToken, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getIdCardStatus(accessToken: string) {
    return this.request<IdCardStatus | null>('/id-cards/my-status', accessToken);
  }

  getNotifications(accessToken: string) {
    return Promise.allSettled([
      this.request<any>('/grade-appeals/my-appeals', accessToken),
      this.request<any>('/deferral-requests/my-requests', accessToken),
      this.request<any>('/trainee-requests/my-requests', accessToken),
      this.request<any>('/complaints/my-complaints', accessToken),
      this.request<any>('/trainee-auth/profile', accessToken),
    ]);
  }
}

export const traineePlatformService = new TraineePlatformService();
