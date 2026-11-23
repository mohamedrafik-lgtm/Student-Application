import { useSettingsSafe } from '@/lib/settings-context';

export interface GradeLabels {
  yearWorkMarks: string;
  practicalMarks: string;
  writtenMarks: string;
  attendanceMarks: string;
  quizzesMarks: string;
  finalExamMarks: string;
}

const DEFAULTS: GradeLabels = {
  yearWorkMarks: 'أعمال السنة',
  practicalMarks: 'العملي',
  writtenMarks: 'التحريري',
  attendanceMarks: 'الحضور',
  quizzesMarks: 'اختبارات أونلاين',
  finalExamMarks: 'الميد تيرم',
};

// إشارات توضيحية (تظهر بجانب الحضور والاختبارات)
export const GRADE_LABEL_HINTS: Partial<Record<keyof GradeLabels, string>> = {
  attendanceMarks: 'مرتبط تلقائياً بتسجيل حضور المتدربين',
  quizzesMarks: 'مرتبط تلقائياً بدرجات الاختبارات الإلكترونية',
};

export function useGradeLabels(): GradeLabels {
  const ctx = useSettingsSafe();
  const s = ctx?.settings;
  return {
    yearWorkMarks: s?.yearWorkMarksLabel || DEFAULTS.yearWorkMarks,
    practicalMarks: s?.practicalMarksLabel || DEFAULTS.practicalMarks,
    writtenMarks: s?.writtenMarksLabel || DEFAULTS.writtenMarks,
    attendanceMarks: s?.attendanceMarksLabel || DEFAULTS.attendanceMarks,
    quizzesMarks: s?.quizzesMarksLabel || DEFAULTS.quizzesMarks,
    finalExamMarks: s?.finalExamMarksLabel || DEFAULTS.finalExamMarks,
  };
}

// helper غير-hook (للاستخدام خارج components، مع defaults)
export function gradeLabel(key: keyof GradeLabels, settings?: any): string {
  const map: Record<keyof GradeLabels, string> = {
    yearWorkMarks: 'yearWorkMarksLabel',
    practicalMarks: 'practicalMarksLabel',
    writtenMarks: 'writtenMarksLabel',
    attendanceMarks: 'attendanceMarksLabel',
    quizzesMarks: 'quizzesMarksLabel',
    finalExamMarks: 'finalExamMarksLabel',
  };
  const v = settings?.[map[key]];
  return (v && String(v).trim()) ? String(v) : DEFAULTS[key];
}

// حل الاسم: custom (content) > global (settings) > default
export function resolveGradeLabel(key: keyof GradeLabels, content?: any, settings?: any): string {
  const field = (key + 'Label') as string; // yearWorkMarks -> yearWorkMarksLabel
  const custom = content?.[field] ?? content?.maxMarks?.[field];
  if (custom && String(custom).trim()) return String(custom);
  return gradeLabel(key, settings);
}

// hook لـ content-specific labels
export function useContentGradeLabels(content?: any): GradeLabels {
  const g = useGradeLabels();
  const settings = (typeof window !== 'undefined' ? null : null);
  // We'll resolve using content's labels if present, else global defaults already in g
  const out: GradeLabels = { ...g };
  const fields: (keyof GradeLabels)[] = ['yearWorkMarks', 'practicalMarks', 'writtenMarks', 'attendanceMarks', 'quizzesMarks', 'finalExamMarks'];
  for (const k of fields) {
    const f = (k + 'Label') as string;
    const custom = content?.[f] ?? content?.maxMarks?.[f];
    if (custom && String(custom).trim()) out[k] = String(custom);
  }
  return out;
}