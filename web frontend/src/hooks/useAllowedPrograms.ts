'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api';

export interface AllowedProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface UseAllowedProgramsReturn {
  /** البرامج المسموح بها للمستخدم الحالي (فارغة = كل البرامج) */
  allowedPrograms: AllowedProgram[];
  /** هل المستخدم مقيد ببرامج محددة */
  isRestricted: boolean;
  /** حالة التحميل */
  loading: boolean;
  /** خطأ في التحميل */
  error: string | null;
  /** هل البرنامج المحدد مسموح به */
  isProgramAllowed: (programId: number) => boolean;
  /** تصفية قائمة البرامج بناءً على الصلاحيات */
  filterPrograms: <T extends { id: number }>(programs: T[]) => T[];
  /** إعادة تحميل البيانات */
  refresh: () => Promise<void>;
}

/**
 * هوك للحصول على البرامج المسموح بها للمستخدم الحالي
 * يُستخدم لتصفية قوائم البرامج في الواجهة الأمامية
 */
export function useAllowedPrograms(): UseAllowedProgramsReturn {
  const [allowedPrograms, setAllowedPrograms] = useState<AllowedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllowedPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAPI('/users/me/allowed-programs');
      setAllowedPrograms(data || []);
    } catch (err: any) {
      console.error('خطأ في جلب البرامج المسموحة:', err);
      setError(err.message || 'فشل في جلب البرامج المسموحة');
      // في حالة الخطأ، نعتبر المستخدم غير مقيد
      setAllowedPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllowedPrograms();
  }, [fetchAllowedPrograms]);

  const isRestricted = allowedPrograms.length > 0;

  const isProgramAllowed = useCallback(
    (programId: number) => {
      if (!isRestricted) return true;
      return allowedPrograms.some((p) => p.id === programId);
    },
    [allowedPrograms, isRestricted]
  );

  const filterPrograms = useCallback(
    <T extends { id: number }>(programs: T[]): T[] => {
      if (!isRestricted) return programs;
      const allowedIds = new Set(allowedPrograms.map((p) => p.id));
      return programs.filter((p) => allowedIds.has(p.id));
    },
    [allowedPrograms, isRestricted]
  );

  return {
    allowedPrograms,
    isRestricted,
    loading,
    error,
    isProgramAllowed,
    filterPrograms,
    refresh: fetchAllowedPrograms,
  };
}
