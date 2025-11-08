// أداة تصحيح الجداول الدراسية
// تستخدم لاختبار الاتصال بالباك إند وتشخيص المشاكل

import { authService } from '../services/authService';
import { API_CONFIG } from '../services/apiConfig';
import { BranchService } from '../services/branchService';
import { MyScheduleResponse } from '../types/auth';

export class ScheduleDebugger {
  // اختبار الاتصال بالباك إند
  static async testBackendConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testing backend connection...');
      
      // التحقق من إعدادات الفرع
      const currentBranch = await BranchService.getSavedBranch();
      console.log('📍 Current branch:', currentBranch);
      
      if (!currentBranch) {
        return {
          success: false,
          message: 'لم يتم اختيار فرع. يرجى اختيار فرع أولاً',
        };
      }
      
      // التحقق من BASE_URL
      const baseUrl = API_CONFIG.BASE_URL;
      console.log('🌐 Base URL:', baseUrl);
      
      if (!baseUrl) {
        return {
          success: false,
          message: 'لم يتم تحديد عنوان الخادم. يرجى اختيار فرع أولاً',
        };
      }
      
      // اختبار الاتصال بالخادم
      const testUrl = `${baseUrl}/api/health`; // أو أي endpoint للاختبار
      console.log('🧪 Testing URL:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      if (response.ok) {
        return {
          success: true,
          message: 'تم الاتصال بالخادم بنجاح',
          details: {
            status: response.status,
            url: testUrl,
            branch: currentBranch,
          },
        };
      } else {
        return {
          success: false,
          message: `فشل الاتصال بالخادم. الحالة: ${response.status}`,
          details: {
            status: response.status,
            url: testUrl,
            branch: currentBranch,
          },
        };
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        details: {
          error: error,
        },
      };
    }
  }
  
  // اختبار تحميل الجدول الدراسي
  static async testScheduleLoading(
    classroomId: number, 
    accessToken: string
  ): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testing schedule loading...');
      console.log('📊 Classroom ID:', classroomId);
      console.log('🔑 Has token:', !!accessToken);
      
  const scheduleData = await authService.getMySchedule(accessToken);
      
      console.log('✅ Schedule loaded successfully:', scheduleData);
      
      // تحليل البيانات
      const totalSessions = (Object.values(scheduleData.schedule) as any[]).reduce((total: number, daySessions: any[]) => {
        return total + (daySessions?.length || 0);
      }, 0);
      
      const daysWithSessions = Object.keys(scheduleData.schedule).filter(day => 
        scheduleData.schedule[day as keyof typeof scheduleData.schedule].length > 0
      );
      
      return {
        success: true,
        message: `تم تحميل الجدول بنجاح. ${totalSessions} جلسة في ${daysWithSessions.length} أيام`,
        details: {
          totalSessions,
          daysWithSessions,
          scheduleData,
        },
      };
    } catch (error) {
      console.error('❌ Schedule loading test failed:', error);
      return {
        success: false,
        message: `فشل تحميل الجدول: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        details: {
          error: error,
          classroomId,
        },
      };
    }
  }
  
  // اختبار شامل للنظام
  static async runFullTest(accessToken: string): Promise<{
    connection: any;
    schedule: any;
    summary: string;
  }> {
    console.log('🚀 Running full schedule system test...');
    
    const connectionTest = await this.testBackendConnection();
    let scheduleTest = null;
    
    if (connectionTest.success) {
      // اختبار تحميل الجدول مع classroomId افتراضي
      scheduleTest = await this.testScheduleLoading(1, accessToken);
    }
    
    const summary = connectionTest.success 
      ? (scheduleTest?.success 
          ? '✅ جميع الاختبارات نجحت' 
          : '⚠️ الاتصال نجح لكن تحميل الجدول فشل')
      : '❌ فشل الاتصال بالخادم';
    
    console.log('📋 Test Summary:', summary);
    
    return {
      connection: connectionTest,
      schedule: scheduleTest,
      summary,
    };
  }
}

export default ScheduleDebugger;
