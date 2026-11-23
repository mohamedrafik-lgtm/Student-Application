import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ملف تخزين إعدادات التطبيق المحلي (لا يحتاج مصادقة)
const CACHE_FILE = path.join(process.cwd(), 'public', 'mobile-app-settings.json');

const DEFAULT_SETTINGS = {
  MOBILE_APP_ENABLED: 'false',
  MOBILE_APP_GOOGLE_PLAY_URL: '',
  MOBILE_APP_APPSTORE_URL: '',
  MOBILE_APP_STATUS: 'pre_registration',
};

// GET - قراءة الإعدادات بدون مصادقة (للمتدربين)
export async function GET() {
  try {
    const fileContent = await fs.readFile(CACHE_FILE, 'utf-8');
    const settings = JSON.parse(fileContent);
    // إرجاع كمصفوفة لتوافق مع الكود الحالي
    const result = Object.entries(settings).map(([key, value]) => ({ key, value }));
    return NextResponse.json(result);
  } catch {
    // إذا لم يوجد الملف، إرجاع القيم الافتراضية
    const result = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }));
    return NextResponse.json(result);
  }
}

// POST - تحديث الإعدادات (يُستدعى من صفحة إعدادات الأدمن بعد الحفظ)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // body = { MOBILE_APP_ENABLED: 'true', MOBILE_APP_STATUS: 'published', ... }
    const settings = { ...DEFAULT_SETTINGS, ...body };
    await fs.writeFile(CACHE_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving mobile app settings cache:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
