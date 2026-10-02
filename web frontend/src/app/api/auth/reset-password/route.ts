import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, resetCode, newPassword } = body;

    if (!phoneNumber || !resetCode || !newPassword) {
      return NextResponse.json(
        { message: 'جميع البيانات مطلوبة' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, resetCode, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      // التحقق من حالة الأرشفة
      if (data.isArchived || data.message?.includes('archived') || data.message?.includes('مؤرشف') || data.message?.includes('موقوف') || data.message?.includes('suspended')) {
        return NextResponse.json(
          { message: 'تم إيقاف حسابك ولا يمكنك إعادة تعيين كلمة المرور. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { message: data.message || 'فشل في إعادة تعيين كلمة المرور' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
