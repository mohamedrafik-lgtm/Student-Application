// SOLID Principles Applied:
// 1. Single Responsibility: This hook only manages UI state for grades screen
// 2. Interface Segregation: Uses specific interfaces for different concerns

import { useState } from 'react';

export interface UseGradesUIReturn {
  expandedClassroom: number | null;
  expandedContent: number | null;
  toggleClassroom: (classroomId: number) => void;
  toggleContent: (contentId: number) => void;
  collapseAll: () => void;
}

export const useGradesUI = (): UseGradesUIReturn => {
  const [expandedClassroom, setExpandedClassroom] = useState<number | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);

  const toggleClassroom = (classroomId: number) => {
    setExpandedClassroom(expandedClassroom === classroomId ? null : classroomId);
    setExpandedContent(null); // إغلاق أي محتوى مفتوح
  };

  const toggleContent = (contentId: number) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  const collapseAll = () => {
    setExpandedClassroom(null);
    setExpandedContent(null);
  };

  return {
    expandedClassroom,
    expandedContent,
    toggleClassroom,
    toggleContent,
    collapseAll,
  };
};
