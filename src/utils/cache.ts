import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../services/apiConfig';

interface CacheEnvelope<T> {
  value: T;
  expiresAt: number;
  cachedAt: number;
}

const PREFIX = 'app_cache:';

const identity = (accessToken: string) => {
  const branch = API_CONFIG.BASE_URL || 'no_branch';
  return `${branch}:${accessToken.slice(-32)}`;
};

export const CacheDurations = {
  short: 60 * 1000,
  medium: 5 * 60 * 1000,
  long: 30 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

export const CacheService = {
  async get<T>(namespace: string, accessToken: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${PREFIX}${namespace}:${identity(accessToken)}`);
      if (!raw) return null;
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (!Number.isFinite(envelope.expiresAt) || envelope.expiresAt <= Date.now()) {
        await AsyncStorage.removeItem(`${PREFIX}${namespace}:${identity(accessToken)}`);
        return null;
      }
      return envelope.value;
    } catch {
      return null;
    }
  },

  async set<T>(namespace: string, accessToken: string, value: T, ttl = CacheDurations.medium): Promise<void> {
    try {
      const now = Date.now();
      const envelope: CacheEnvelope<T> = {
        value,
        expiresAt: now + ttl,
        cachedAt: now,
      };
      await AsyncStorage.setItem(
        `${PREFIX}${namespace}:${identity(accessToken)}`,
        JSON.stringify(envelope),
      );
    } catch {
      // Cache failures must never block API or UI behavior.
    }
  },

  async remove(namespace: string, accessToken: string): Promise<void> {
    await AsyncStorage.removeItem(`${PREFIX}${namespace}:${identity(accessToken)}`);
  },

  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter(key => key.startsWith(PREFIX)));
  },

  async staleWhileRevalidate<T>(
    namespace: string,
    accessToken: string,
    fetchFresh: () => Promise<T>,
    ttl = CacheDurations.medium,
  ): Promise<T> {
    const cached = await this.get<T>(namespace, accessToken);
    if (cached !== null) {
      fetchFresh().then(value => this.set(namespace, accessToken, value, ttl)).catch(() => {});
      return cached;
    }
    const fresh = await fetchFresh();
    await this.set(namespace, accessToken, fresh, ttl);
    return fresh;
  },
};
