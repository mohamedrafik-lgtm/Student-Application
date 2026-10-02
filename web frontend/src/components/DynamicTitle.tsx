"use client";

import { useEffect } from 'react';
import { useSettingsSafe } from '@/lib/settings-context';

interface DynamicTitleProps {
  fallbackTitle?: string;
}

export default function DynamicTitle({ fallbackTitle = "نظام إدارة المراكز" }: DynamicTitleProps) {
  const settingsContext = useSettingsSafe();

  useEffect(() => {
    if (settingsContext?.settings?.centerName) {
      document.title = settingsContext.settings.centerName;
    } else if (!settingsContext?.loading) {
      document.title = fallbackTitle;
    }
  }, [settingsContext?.settings?.centerName, settingsContext?.loading, fallbackTitle]);

  return null; // هذا الكومبوننت لا يعرض شيئاً، فقط يحدث العنوان
}
