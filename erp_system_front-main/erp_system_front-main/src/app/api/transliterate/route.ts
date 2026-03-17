import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to proxy transliteration requests to QCRI API
 * This avoids CORS issues by making the request from the server
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // QCRI API يستخدم GET مع النص في الـ URL
    const encodedText = encodeURIComponent(text.trim());
    const apiUrl = `https://transliterate.qcri.org/ar2en/${encodedText}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`QCRI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // الـ API يرجع { "results": "ahmed" }
    const transliteratedText = data.results || '';

    // تنسيق النص (كل كلمة تبدأ بحرف كبير)
    const cleanedText = transliteratedText
      .trim()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return NextResponse.json({
      text: cleanedText,
      success: true
    });

  } catch (error) {
    console.error('Transliteration API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        text: '' // إرجاع نص فارغ في حالة الخطأ
      },
      { status: 500 }
    );
  }
}