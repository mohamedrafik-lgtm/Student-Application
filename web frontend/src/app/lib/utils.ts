import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * دمج أسماء الفئات باستخدام clsx و tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * تنسيق قيمة عددية كعملة
 * @param value القيمة العددية المراد تنسيقها
 * @param currency رمز العملة (الافتراضي ج.م)
 * @returns النص المنسق كعملة
 */
export function formatCurrency(value?: number | null, currency = 'ج.م'): string {
  if (value === undefined || value === null) {
    return `0 ${currency}`;
  }
  return `${value.toLocaleString('ar-EG')} ${currency}`;
}

/**
 * تنسيق التاريخ بالتنسيق العربي
 * @param date التاريخ المراد تنسيقه
 * @returns النص المنسق كتاريخ
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * تحويل نوع البرنامج إلى نص عربي
 * @param programType نوع البرنامج
 * @returns النص العربي لنوع البرنامج
 */
export function getProgramTypeLabel(programType: string): string {
  switch (programType) {
    case 'SUMMER':
      return 'صيفي (فبراير)';
    case 'WINTER':
      return 'شتوي (اكتوبر)';
    case 'ANNUAL':
      return 'سنوي';
    default:
      return programType;
  }
} 