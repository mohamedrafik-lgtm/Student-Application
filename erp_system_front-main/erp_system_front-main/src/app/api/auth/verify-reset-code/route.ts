import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, resetCode } = body;

    if (!phoneNumber || !resetCode) {
      return NextResponse.json(
        { message: 'رقم الهاتف وكود التحقق مطلوبان' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, resetCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'كود التحقق غير صحيح' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reset code verification error:', error);
    return NextResponse.json(
      { message: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
