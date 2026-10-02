'use client';

import { useEffect } from 'react';
import { fetchAPI } from '@/lib/api';

export default function MinistryExamDeclarationTemplatePage() {
  useEffect(() => {
    let active = true;

    const resolvePublicLink = async () => {
      try {
        const data = await fetchAPI('/ministry-exam-declarations/my/public-link');
        const payload = (data as any)?.data ?? data;
        const target = payload?.path || '/print/ministry-exam-declaration';

        if (active) {
          window.location.replace(target);
        }
      } catch (error) {
        if (active) {
          window.location.replace('/print/ministry-exam-declaration');
        }
      }
    };

    resolvePublicLink();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[320px] flex items-center justify-center text-slate-500 text-sm">
      جاري تجهيز رابط الطباعة المميز...
    </div>
  );
}
