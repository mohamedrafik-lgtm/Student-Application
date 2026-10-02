// ملف اختبار لآلية انتهاء صلاحية التوكن
// يمكن استخدامه في console المتصفح لاختبار الوظائف

import { isTokenValid, isTokenExpiringSoon, handleTokenExpiry, isTokenExpiryError } from './trainee-api';

// دالة لاختبار صلاحية التوكن الحالي
export function testCurrentToken() {
  const token = localStorage.getItem('trainee_token');
  
  if (!token) {
    console.log('❌ لا يوجد توكن في localStorage');
    return false;
  }
  
  console.log('🔍 اختبار التوكن الحالي...');
  console.log('📄 التوكن:', token.substring(0, 50) + '...');
  
  const isValid = isTokenValid(token);
  const isExpiringSoon = isTokenExpiringSoon(token);
  
  console.log('✅ التوكن صالح:', isValid);
  console.log('⚠️ التوكن قريب من الانتهاء:', isExpiringSoon);
  
  if (isValid) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryDate = new Date(payload.exp * 1000);
      console.log('📅 تاريخ انتهاء الصلاحية:', expiryDate.toLocaleString('ar-EG'));
      
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));
      console.log('⏰ الأيام المتبقية:', daysUntilExpiry);
    } catch (error) {
      console.error('❌ خطأ في تحليل التوكن:', error);
    }
  }
  
  return isValid;
}

// دالة لمحاكاة انتهاء صلاحية التوكن
export function simulateTokenExpiry() {
  console.log('🧪 محاكاة انتهاء صلاحية التوكن...');
  
  // إنشاء توكن منتهي الصلاحية
  const expiredPayload = {
    sub: 'test',
    nationalId: '12345678901234',
    traineeId: 1,
    type: 'trainee',
    exp: Math.floor(Date.now() / 1000) - 3600 // انتهى منذ ساعة
  };
  
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
                      btoa(JSON.stringify(expiredPayload)) + 
                      '.expired_signature';
  
  localStorage.setItem('trainee_token', expiredToken);
  console.log('🔐 تم حفظ توكن منتهي الصلاحية');
  
  // اختبار التحقق من الصلاحية
  const isValid = isTokenValid(expiredToken);
  console.log('✅ التوكن صالح:', isValid);
  
  if (!isValid) {
    console.log('🔐 التوكن منتهي الصلاحية، سيتم إعادة التوجيه...');
    handleTokenExpiry();
  }
}

// دالة لاختبار معالجة الأخطاء
export function testErrorHandling() {
  console.log('🧪 اختبار معالجة الأخطاء...');
  
  // اختبار خطأ انتهاء صلاحية التوكن
  const tokenExpiryError = new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
  console.log('🔍 اختبار خطأ انتهاء صلاحية التوكن:', isTokenExpiryError(tokenExpiryError));
  
  const unauthorizedError = { status: 401, message: 'Unauthorized' };
  console.log('🔍 اختبار خطأ غير مصرح:', isTokenExpiryError(unauthorizedError));
  
  const networkError = new Error('Network error');
  console.log('🔍 اختبار خطأ الشبكة:', isTokenExpiryError(networkError));
}

// دالة لعرض معلومات التوكن
export function showTokenInfo() {
  const token = localStorage.getItem('trainee_token');
  
  if (!token) {
    console.log('❌ لا يوجد توكن');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('📋 معلومات التوكن:');
    console.log('👤 معرف المتدرب:', payload.sub);
    console.log('🆔 الرقم القومي:', payload.nationalId);
    console.log('🎓 معرف المتدرب:', payload.traineeId);
    console.log('🔐 نوع المستخدم:', payload.type);
    console.log('📅 تاريخ الإصدار:', new Date(payload.iat * 1000).toLocaleString('ar-EG'));
    console.log('📅 تاريخ انتهاء الصلاحية:', new Date(payload.exp * 1000).toLocaleString('ar-EG'));
    
    const now = new Date();
    const expiryDate = new Date(payload.exp * 1000);
    const timeUntilExpiry = expiryDate.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));
    
    if (timeUntilExpiry > 0) {
      console.log('⏰ الأيام المتبقية:', daysUntilExpiry);
    } else {
      console.log('❌ التوكن منتهي الصلاحية');
    }
  } catch (error) {
    console.error('❌ خطأ في تحليل التوكن:', error);
  }
}

// تصدير الدوال للاستخدام في console
if (typeof window !== 'undefined') {
  (window as any).traineeTokenTest = {
    testCurrentToken,
    simulateTokenExpiry,
    testErrorHandling,
    showTokenInfo
  };
  
  console.log('🧪 تم تحميل أدوات اختبار التوكن');
  console.log('📖 الاستخدام:');
  console.log('  - traineeTokenTest.testCurrentToken() - اختبار التوكن الحالي');
  console.log('  - traineeTokenTest.simulateTokenExpiry() - محاكاة انتهاء الصلاحية');
  console.log('  - traineeTokenTest.testErrorHandling() - اختبار معالجة الأخطاء');
  console.log('  - traineeTokenTest.showTokenInfo() - عرض معلومات التوكن');
}
