'use client';

import { useEffect, useState } from 'react';
import TibaLoader from '@/components/ui/TibaLoader';

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) return 85;
        return prev + Math.random() * 8 + 2;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <TibaLoader
      variant="fullscreen"
      type="data"
      size="lg"
      message="تحضير البيانات والموارد"
      submessage="يتم تحضير جميع الموارد والبيانات اللازمة لتشغيل النظام بأفضل أداء"
      progress={progress}
      showTips
    />
  );
}
