#!/bin/bash

# 📱 سكريبت تطبيق تحسينات نظام WhatsApp
# يقوم بنسخ الملفات المحسنة وتحديث التكوينات

echo "🚀 بدء تطبيق تحسينات نظام WhatsApp..."

# التأكد من وجود مجلد WhatsApp
if [ ! -d "src/whatsapp" ]; then
    echo "❌ مجلد src/whatsapp غير موجود!"
    exit 1
fi

# إنشاء نسخة احتياطية من الملفات الأصلية
echo "💾 إنشاء نسخة احتياطية من الملفات الأصلية..."
mkdir -p backups/whatsapp-$(date +%Y%m%d_%H%M%S)
cp -r src/whatsapp/* backups/whatsapp-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "⚠️ بعض الملفات قد لا تكون موجودة"

# نسخ الملفات المحسنة
echo "📁 نسخ الملفات المحسنة..."

# نسخ الخدمة المحسنة
if [ -f "src/whatsapp/improved-whatsapp.service.ts" ]; then
    cp src/whatsapp/improved-whatsapp.service.ts src/whatsapp/whatsapp.service.ts
    echo "✅ تم تحديث whatsapp.service.ts"
else
    echo "❌ ملف improved-whatsapp.service.ts غير موجود"
fi

# نسخ Controller المحسن
if [ -f "src/whatsapp/improved-whatsapp.controller.ts" ]; then
    cp src/whatsapp/improved-whatsapp.controller.ts src/whatsapp/whatsapp.controller.ts
    echo "✅ تم تحديث whatsapp.controller.ts"
else
    echo "❌ ملف improved-whatsapp.controller.ts غير موجود"
fi

# نسخ Baileys Wrapper المحسن
if [ -f "src/whatsapp/improved-baileys-wrapper.mjs" ]; then
    cp src/whatsapp/improved-baileys-wrapper.mjs src/whatsapp/baileys-wrapper.mjs
    echo "✅ تم تحديث baileys-wrapper.mjs"
else
    echo "❌ ملف improved-baileys-wrapper.mjs غير موجود"
fi

# إضافة خدمة المراقبة إذا لم تكن موجودة
if [ ! -f "src/whatsapp/whatsapp-monitor.service.ts" ]; then
    echo "⚠️ خدمة المراقبة غير موجودة، يرجى إضافتها يدوياً"
fi

# إضافة ملف التكوين إذا لم يكن موجوداً
if [ ! -f "src/whatsapp/whatsapp.config.ts" ]; then
    echo "⚠️ ملف التكوين غير موجود، يرجى إضافته يدوياً"
fi

# التحقق من التبعيات
echo "🔍 التحقق من التبعيات المطلوبة..."

if ! npm list @nestjs/schedule >/dev/null 2>&1; then
    echo "📦 تثبيت @nestjs/schedule..."
    npm install @nestjs/schedule
else
    echo "✅ @nestjs/schedule موجودة"
fi

# إنشاء مجلد whatsapp-auth إذا لم يكن موجوداً
if [ ! -d "whatsapp-auth" ]; then
    mkdir -p whatsapp-auth
    chmod 755 whatsapp-auth
    echo "📁 تم إنشاء مجلد whatsapp-auth"
fi

# تنظيف الجلسات القديمة إذا كانت موجودة
if [ -d "whatsapp-auth" ] && [ "$(ls -A whatsapp-auth)" ]; then
    echo "🧹 تنظيف الجلسات القديمة..."
    rm -rf whatsapp-auth/*
    echo "✅ تم تنظيف الجلسات القديمة"
fi

echo ""
echo "🎉 تم تطبيق التحسينات بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. تحديث app.module.ts لاستخدام الخدمات المحسنة"
echo "2. إعادة تشغيل الخادم: npm run start:dev"
echo "3. اختبار النظام باستخدام: curl -X GET http://localhost:3000/api/whatsapp/status"
echo ""
echo "📖 للمزيد من التفاصيل، راجع ملف WHATSAPP_IMPROVEMENTS_README.md"
