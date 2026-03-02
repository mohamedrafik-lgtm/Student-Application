// Persistent storage wrapper using @react-native-async-storage/async-storage
import RNAsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  BRANCH: 'app_selected_branch',
  SESSION: 'app_user_session',
} as const;

export interface SavedSession {
  accessToken: string;
  nameAr: string;
  nameEn: string;
  nationalId: string;
  classroomId?: number;
  traineeId?: number;
}

export const Storage = {
  // ── Branch ──
  async saveBranch(branch: string): Promise<void> {
    await RNAsyncStorage.setItem(KEYS.BRANCH, branch);
  },
  async getBranch(): Promise<string | null> {
    return RNAsyncStorage.getItem(KEYS.BRANCH);
  },
  async clearBranch(): Promise<void> {
    await RNAsyncStorage.removeItem(KEYS.BRANCH);
  },

  // ── Session ──
  async saveSession(session: SavedSession): Promise<void> {
    await RNAsyncStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  },
  async getSession(): Promise<SavedSession | null> {
    const raw = await RNAsyncStorage.getItem(KEYS.SESSION);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async clearSession(): Promise<void> {
    await RNAsyncStorage.removeItem(KEYS.SESSION);
  },

  // ── Clear all ──
  async clearAll(): Promise<void> {
    await RNAsyncStorage.multiRemove([KEYS.BRANCH, KEYS.SESSION]);
  },

  // ── Generic ──
  async get(key: string): Promise<string | null> {
    return RNAsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    await RNAsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    await RNAsyncStorage.removeItem(key);
  },
};
