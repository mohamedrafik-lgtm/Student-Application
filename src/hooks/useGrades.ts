// SOLID Principles Applied:
// 1. Single Responsibility: This hook only manages grades state and API calls
// 2. Dependency Inversion: Depends on abstractions (IGradesService) not concretions

import { useState, useEffect } from 'react';
import { gradesService } from '../services/gradesService';
import { GradesResponse, GradesError } from '../types/grades';

export interface UseGradesReturn {
  gradesData: GradesResponse | null;
  isLoading: boolean;
  error: string | null;
  loadGrades: () => Promise<void>;
  clearError: () => void;
}

export const useGrades = (accessToken: string): UseGradesReturn => {
  const [gradesData, setGradesData] = useState<GradesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading grades...');
      
      const response = await gradesService.getMyGrades(accessToken);
      
      console.log('✅ Grades loaded successfully!');
      console.log('📊 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        traineeName: response.data?.trainee?.nameAr,
        overallPercentage: response.data?.overallStats?.percentage,
        classroomsCount: response.data?.classrooms?.length || 0
      });
      
      // التحقق من وجود البيانات قبل التعيين
      if (response.success && response.data) {
        setGradesData(response.data);
      } else if (response.success === false) {
        // إذا كان response.success = false، عرض رسالة الخطأ من الـ API
        const errorMessage = response.message || 'فشل في تحميل الدرجات';
        setError(errorMessage);
        setGradesData(null);
      } else {
        console.warn('⚠️ Invalid response structure or no grades found');
        setGradesData(null);
      }

    } catch (error) {
      console.error('❌ Failed to load grades:', error);
      const apiError = error as GradesError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الدرجات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على درجات';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    loadGrades();
  }, [accessToken]);

  return {
    gradesData,
    isLoading,
    error,
    loadGrades,
    clearError,
  };
};
