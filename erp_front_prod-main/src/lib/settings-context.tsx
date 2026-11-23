'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingsCache, SystemSettings } from './settings-cache';

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  refetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setError(null);
      const data = await settingsCache.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetchSettings = async () => {
    setLoading(true);
    settingsCache.clearCache(); // مسح الـ cache لضمان جلب بيانات جديدة
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      error,
      refetchSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function useSettingsSafe() {
  const context = useContext(SettingsContext);
  return context;
}
