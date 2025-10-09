// SOLID Principles Applied:
// 1. Single Responsibility: Each function has a single, clear purpose
// 2. Open/Closed: Functions can be extended without modification

import { GradeType } from '../types/grades';

/**
 * Get color based on percentage
 */
export const getGradeColor = (percentage: number): string => {
  if (percentage >= 90) return '#10B981'; // أخضر
  if (percentage >= 80) return '#3B82F6'; // أزرق
  if (percentage >= 70) return '#F59E0B'; // برتقالي
  if (percentage >= 60) return '#EF4444'; // أحمر
  return '#6B7280'; // رمادي
};

/**
 * Get grade status text based on percentage
 */
export const getGradeStatus = (percentage: number): string => {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جداً';
  if (percentage >= 70) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'راسب';
};

/**
 * Format grade display (earned/max)
 */
export const formatGrade = (earned: number, max: number): string => {
  if (max === 0) return '0/0';
  return `${earned}/${max}`;
};

/**
 * Calculate percentage from earned and max values
 */
export const calculatePercentage = (earned: number, max: number): number => {
  if (max === 0) return 0;
  return (earned / max) * 100;
};

/**
 * Get grade type order for consistent display
 */
export const getGradeTypeOrder = (): GradeType[] => {
  return [
    GradeType.YEAR_WORK,
    GradeType.PRACTICAL,
    GradeType.WRITTEN,
    GradeType.ATTENDANCE,
    GradeType.QUIZZES,
    GradeType.FINAL_EXAM,
  ];
};

/**
 * Check if grade is passing (>= 60%)
 */
export const isPassingGrade = (percentage: number): boolean => {
  return percentage >= 60;
};

/**
 * Get grade category based on percentage
 */
export const getGradeCategory = (percentage: number): 'excellent' | 'very-good' | 'good' | 'acceptable' | 'fail' => {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'very-good';
  if (percentage >= 70) return 'good';
  if (percentage >= 60) return 'acceptable';
  return 'fail';
};

/**
 * Format percentage for display
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};
