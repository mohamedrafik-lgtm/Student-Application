'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowPathIcon, CloudIcon } from '@heroicons/react/24/outline';

const CHECK_URL = 'https://www.google.com/generate_204';
const CHECK_INTERVAL = 12000;
const CHECK_TIMEOUT = 6000;

async function checkConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
    await fetch(CHECK_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export default function InternetOfflineOverlay() {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const mountedRef = useRef(true);

  const runCheck = useCallback(async () => {
    if (!mountedRef.current) return;
    setChecking(true);
    const ok = await checkConnection();
    if (!mountedRef.current) return;
    setIsOnline(ok);
    setChecking(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runCheck();

    const interval = setInterval(runCheck, CHECK_INTERVAL);

    const handleOnline = () => runCheck();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runCheck]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl"
          >
            {/* Top accent bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

            {/* Animated icon */}
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-blue-500/20"
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-2 rounded-full bg-blue-500/15"
              />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <CloudIcon className="h-7 w-7 text-white" />
                </motion.div>
              </div>
            </div>

            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">لا يوجد اتصال بالإنترنت</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              تم فقدان الاتصال بالشبكة. يتم التحقق تلقائياً، وستُستأنف العمل فور عودة الاتصال.
            </p>

            {/* Signal bars */}
            <div className="mt-5 flex items-end justify-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [5, 20, 5], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }}
                  className="w-1.5 rounded-full bg-blue-500"
                  style={{ height: 5 }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => runCheck()}
              disabled={checking}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-60"
            >
              <motion.span
                animate={checking ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.8, repeat: checking ? Infinity : 0, ease: 'linear' }}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </motion.span>
              {checking ? 'جارٍ التحقق...' : 'إعادة المحاولة'}
            </button>

            <p className="mt-5 text-[11px] text-slate-400">
              التحقق عبر خادم Google (generate_204)
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
