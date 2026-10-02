'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { fetchAPI } from '../lib/api';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Hook to send periodic heartbeats to the online tracking system.
 * Should be placed in the dashboard layout so it runs for all admin pages.
 */
export function useOnlineTracking() {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathnameRef = useRef(pathname);

  // Keep pathname ref updated
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await fetchAPI('/online-tracking/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          page: pathnameRef.current || '/',
          photoUrl: user?.photoUrl || null,
        }),
      });
    } catch {
      // Silently ignore heartbeat errors
    }
  }, [token, user?.photoUrl]);

  useEffect(() => {
    if (!token) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, sendHeartbeat]);

  // Send heartbeat on page change
  useEffect(() => {
    if (token) {
      sendHeartbeat();
    }
  }, [pathname, token, sendHeartbeat]);
}
