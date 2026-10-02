import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚀 API: بدء جلب الإعدادات من الـ backend...');
    
    // استدعاء الـ backend لجلب الإعدادات العامة (بدون authentication)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
    console.log('🔗 Backend URL:', `${backendUrl}/api/settings/public`);
    
    const response = await fetch(`${backendUrl}/api/settings/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // لضمان الحصول على أحدث البيانات
    });

    console.log('📡 Backend Response Status:', response.status, response.ok);

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Data من الـ Backend:', data);
    
    if (data.success && data.settings) {
      console.log('✅ إرجاع الإعدادات من الـ Backend:', data.settings);
      return NextResponse.json(data.settings);
    } else {
      throw new Error('Invalid response format from backend');
    }
  } catch (error) {
    console.error('❌ Settings fetch error:', error);
    
    // في حالة فشل الاتصال بالـ backend، إرجاع بيانات افتراضية
    const fallbackSettings = {
      centerName: 'مركز تدريب مهني',
      licenseNumber: '29',
      centerManagerName: 'مدير المركز',
      centerAddress: 'عنوان المركز'
    };

    console.log('🔄 إرجاع البيانات الافتراضية:', fallbackSettings);
    return NextResponse.json(fallbackSettings);
  }
}
