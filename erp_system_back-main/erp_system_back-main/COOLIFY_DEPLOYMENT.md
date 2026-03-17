# دليل نشر التطبيق على Coolify

## ✅ التكوين الحالي
التطبيق مُعد للعمل مع **Dockerfile** (وليس Nixpacks).

## 🔧 إعداد Coolify

### الخطوة 1: إعدادات البناء
1. اذهب إلى **Settings** > **General**
2. في قسم **Build Pack**، اختر: **Dockerfile**
3. تأكد من أن **Dockerfile Location** = `./Dockerfile`

### الخطوة 2: إعدادات المنفذ
1. في قسم **Network**:
   - **Ports Exposes**: `4001` (أو ما تريد)
   - سيتم قراءة المنفذ من متغير البيئة `PORT`

### الخطوة 3: المتغيرات البيئية (Environment Variables)

> ⚠️ **مهم**: جميع المتغيرات يجب أن تكون **Runtime** (ليست Build-time فقط)

#### المتغيرات المطلوبة:
```env
# Database
DATABASE_URL=mysql://user:password@host:3306/database

# Application
PORT=4001
HOST=0.0.0.0
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRATION=7d

# Frontend URLs
FRONTEND_URL=https://your-frontend.com
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

#### المتغيرات الاختيارية:
```env
# Redis (إذا كنت تستخدمه)
REDIS_URL=redis://default:password@host:6379/0
# أو
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Cloudinary (للصور)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WhatsApp
WHATSAPP_STORAGE_TYPE=database
WHATSAPP_WRAPPER_VERSION=v2

# Google Cloud Vision (لتحليل الصور)
GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json

# Mistral AI / OpenAI
OPENAI_API_KEY=your-key
```

## 🏥 Health Check
- **Endpoint**: `/api/health`
- يتم استخدامه للتحقق من صحة التطبيق
- يُظهر معلومات الذاكرة و uptime

## 📁 هيكل الملفات المهمة
```
├── Dockerfile          # ملف البناء الرئيسي
├── start.sh           # سكريبت بدء التشغيل
├── prisma/
│   └── schema.prisma  # تعريف قاعدة البيانات
└── src/
    └── main.ts        # نقطة الدخول الرئيسية
```

## 🔄 ما يحدث عند بدء التشغيل
1. ✅ انتظار اتصال قاعدة البيانات
2. ✅ تشغيل `prisma migrate deploy` (تطبيق migrations)
3. ✅ تشغيل `prisma db seed` (البيانات الأولية)
4. ✅ تشغيل `node dist/main`

## 🐛 استكشاف الأخطاء

### خطأ: `/bin/bash: no such file or directory`
**الحل**: تأكد من استخدام Dockerfile وليس Nixpacks

### خطأ: `ECONNREFUSED` على قاعدة البيانات
**الحل**: تأكد من:
- `DATABASE_URL` صحيح
- قاعدة البيانات تعمل وقابلة للوصول من الكونتينر
- استخدام hostname الصحيح (ليس localhost داخل Docker network)

### خطأ: Port already in use
**الحل**: تأكد من أن `PORT` في Coolify يتطابق مع ما في التطبيق

## 📝 ملاحظات
- التطبيق يستمع على `0.0.0.0` ليكون قابلاً للوصول من خارج الكونتينر
- المنفذ الافتراضي هو `4001` لكن يمكن تغييره عبر `PORT`
- جميع المتغيرات البيئية تُقرأ في وقت التشغيل (Runtime)
