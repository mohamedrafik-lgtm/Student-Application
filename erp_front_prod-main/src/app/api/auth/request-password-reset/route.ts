import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { message: 'رقم الهاتف مطلوب' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      // التحقق من حالة الأرشفة
      if (data.isArchived || data.message?.includes('archived') || data.message?.includes('مؤرشف') || data.message?.includes('موقوف') || data.message?.includes('suspended')) {
        return NextResponse.json(
          { message: 'تم إيقاف حسابك ولا يمكنك استعادة كلمة المرور. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { message: data.message || 'حدث خطأ في الطلب' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
