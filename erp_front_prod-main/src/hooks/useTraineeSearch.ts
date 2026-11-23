import { useCallback, useEffect, useState } from 'react';
import { normalizeArabic } from '@/lib/arabic-normalize';

export interface TraineeSearchState {
  query: string;          // raw input
  debounced: string;      // debounced normalized-ready query
  setQuery: (q: string) => void;
  clear: () => void;
}

/**
 * Hook موحد لبحث المتدربين:
 * - state موحد (query)
 * - debounce 300ms
 * - normalization عربية (hamza/alef/tashkeel)
 * - empty-state helper
 */
export function useTraineeSearch(initial = '', delay = 300): TraineeSearchState {
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), delay);
    return () => clearTimeout(t);
  }, [query, delay]);

  const clear = useCallback(() => {
    setQuery('');
    setDebounced('');
  }, []);

  return { query, debounced, setQuery, clear };
}

// helper: client-side filter by normalized text
export function matchesTraineeSearch(trainee: any, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  const haystack = [
    trainee?.id != null ? String(trainee.id) : '',
    trainee?.nameAr,
    trainee?.nameEn,
    trainee?.nationalId,
    trainee?.phone,
    trainee?.email,
    trainee?.program?.nameAr,
  ]
    .map(normalizeArabic)
    .join(' ');
  return haystack.includes(q);
}