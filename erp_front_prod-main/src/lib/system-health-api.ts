import { fetchAPI } from './api';

export interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  type: string;
}

export interface RedisHealth {
  connected: boolean;
  responseTime?: number;
  error?: string;
}

export interface CloudinaryHealth {
  connected: boolean;
  cloudName?: string;
  error?: string;
}

export interface WhatsAppHealth {
  connected: boolean;
  ready: boolean;
  phoneNumber?: string;
  storageType: string;
  sessionsCount?: number;
}

export interface SystemResources {
  memoryUsagePercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  cpuUsagePercent: number;
  uptimeSeconds: number;
  platform: string;
  nodeVersion: string;
}

export interface SystemHealthResponse {
  healthy: boolean;
  timestamp: string;
  database: DatabaseHealth;
  redis: RedisHealth;
  cloudinary: CloudinaryHealth;
  whatsapp: WhatsAppHealth;
  resources: SystemResources;
}

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  return await fetchAPI('/dashboard/system-health');
}

