'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api';

interface UserPresence {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  accountType: string;
  isOnline: boolean;
  currentPage: string | null;
  lastSeen: number | null;
  lastLoginAt: number | null;
}

interface AllUsersPresenceData {
  users: UserPresence[];
  onlineCount: number;
  totalCount: number;
}

export function useOnlineUsers(refreshInterval = 15000) {
  const [data, setData] = useState<AllUsersPresenceData>({ users: [], onlineCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const result = await fetchAPI('/online-tracking/all-users-presence');
      setData(result);
    } catch {
      // Silently ignore errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers, refreshInterval]);

  return { ...data, loading, refetch: fetchOnlineUsers };
}
