'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { TraineeNotification } from '@/types/trainee-notifications';
import {
  fetchAndDiffNotifications,
  getSavedNotifications,
  markNotificationAsRead as markRead,
  markAllNotificationsAsRead as markAllRead,
  getUnreadCount as getCount,
  clearAllNotifications as clearAll,
} from '@/lib/trainee-notifications-api';

// ─── الثوابت ───
const POLL_INTERVAL = 3 * 60 * 1000;       // كل 3 دقائق
const FOCUS_REFETCH_DELAY = 5 * 1000;       // 5 ثواني بعد العودة للتركيز
const MIN_FETCH_GAP = 60 * 1000;            // حد أدنى 60 ثانية بين كل جلب

interface NotificationContextValue {
  notifications: TraineeNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

export const useTraineeNotifications = () => useContext(NotificationContext);

interface Props {
  children: React.ReactNode;
  traineeId: string | null;
}

export function TraineeNotificationProvider({ children, traineeId }: Props) {
  const [notifications, setNotifications] = useState<TraineeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef(false);

  // ─── تحميل الإشعارات المحفوظة فوراً ───
  useEffect(() => {
    const saved = getSavedNotifications();
    setNotifications(saved);
    setUnreadCount(getCount());
  }, []);

  // ─── الجلب الذكي مع حماية من الطلبات المتكررة ───
  const fetchNotifications = useCallback(async (force = false) => {
    if (!traineeId) return;
    if (isFetchingRef.current) return;

    // منع الجلب المتكرر (حد أدنى MIN_FETCH_GAP)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_GAP) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const result = await fetchAndDiffNotifications(traineeId);
      setNotifications(result.notifications);
      setUnreadCount(result.notifications.filter(n => !n.isRead).length);
      lastFetchRef.current = Date.now();
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [traineeId]);

  // ─── Polling دوري كل 3 دقائق ───
  useEffect(() => {
    if (!traineeId) return;

    // جلب أولي بعد ثانيتين (لا يؤخر تحميل الصفحة)
    const initialTimeout = setTimeout(() => fetchNotifications(true), 2000);

    const interval = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [traineeId, fetchNotifications]);

  // ─── إعادة الجلب عند العودة للتبويب (visibility change) ───
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // انتظر قليلاً ثم اجلب (لتجنب الضغط عند التبديل السريع)
        focusTimeout = setTimeout(() => fetchNotifications(), FOCUS_REFETCH_DELAY);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(focusTimeout);
    };
  }, [fetchNotifications]);

  // ─── الإجراءات ───
  const markAsRead = useCallback((id: string) => {
    markRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications(true);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
