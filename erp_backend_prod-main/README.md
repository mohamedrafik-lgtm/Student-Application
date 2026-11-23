# نظام إدارة مركز تدريب طيبة - الواجهة الخلفية (Backend API)

## نبذة عنا

نظام إدارة مركز تدريب طيبة هو نظام متكامل لإدارة أنشطة مراكز التدريب، بما في ذلك إدارة المتدربين، تسجيل الحضور، بنك الأسئلة، إدارة المحتوى التدريبي، الأخبار والوظائف.

## متطلبات النظام

- Node.js (الإصدار 16 أو أعلى)
- MySQL (الإصدار 8 أو أعلى)
- npm أو yarn

## الإعداد والتثبيت

1. **استنساخ المستودع**:
   ```bash
   git clone https://github.com/samehrafeeq/ERP_Backend.git
   cd ERP_Backend
   ```

2. **تثبيت التبعيات**:
   ```bash
   npm install
   ```

3. **إعداد ملف البيئة**:
   قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع وإضافة المتغيرات التالية:
   ```env
   # متغيرات البيئة للخادم الخلفي
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   SERVER_URL=http://localhost:4000

   # متغيرات قاعدة البيانات
   DATABASE_URL=mysql://username:password@localhost:3306/tiba_db

   # متغيرات JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d 
   ```

4. **تهيئة قاعدة البيانات**:
   ```bash
   npx prisma migrate deploy
   npx prisma migrate dev --name add_trainee_fee_payments
   ```

5. **تشغيل البيئة التطويرية**:
   ```bash
   npm run start:dev
   ```
   
6. **الوصول إلى وثائق API**:
   بعد تشغيل الخادم، يمكنك الوصول إلى وثائق Swagger على:
   ```
   http://localhost:4000/api/docs
   ```

## هيكل API

### نقاط النهاية الرئيسية

الخادم الخلفي يستخدم بادئة `/api` لجميع نقاط النهاية.

### المصادقة

#### تسجيل الدخول
- **طريقة**: POST
- **المسار**: `/api/auth/login`
- **الوصف**: تسجيل دخول المستخدم والحصول على رمز JWT
- **الجسم**:
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- **الاستجابة الناجحة**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "name": "المشرف",
      "email": "admin@example.com",
      "roles": [
        {
          "id": "role_id_1",
          "name": "super_admin",
          "displayName": "مدير النظام الرئيسي",
          "color": "#DC2626",
          "icon": "FaUserShield",
          "priority": 1000
        }
      ],
      "primaryRole": {
        "id": "role_id_1",
        "name": "super_admin",
        "displayName": "مدير النظام الرئيسي",
        "color": "#DC2626",
        "icon": "FaUserShield",
        "priority": 1000
      }
    }
  }
  ```

#### الملف الشخصي
- **طريقة**: GET
- **المسار**: `/api/auth/profile`
- **الوصف**: الحصول على معلومات المستخدم الحالي
- **مصادقة**: Bearer Token
- **الاستجابة الناجحة**:
  ```json
  {
    "id": "1",
    "name": "المشرف",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
  ```

### المستخدمين والمتدربين

#### قائمة المتدربين
- **طريقة**: GET
- **المسار**: `/api/trainees`
- **الوصف**: الحصول على قائمة المتدربين
- **مصادقة**: Bearer Token (ADMIN)
- **معلمات الاستعلام الاختيارية**: 
  - `page`: رقم الصفحة
  - `limit`: عدد العناصر في الصفحة
  - `search`: البحث بالاسم أو البريد الإلكتروني
- **الاستجابة الناجحة**:
  ```json
  {
    "trainees": [
      {
        "id": 1,
        "name": "متدرب",
        "email": "trainee@example.com",
        "phone": "0123456789",
        "programId": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "pages": 2
    }
  }
  ```

### إدارة المحتوى التدريبي

#### قائمة المحتويات التدريبية
- **طريقة**: GET
- **المسار**: `/api/training-contents`
- **الوصف**: الحصول على قائمة المحتويات التدريبية
- **مصادقة**: Bearer Token
- **معلمات الاستعلام الاختيارية**:
  - `includeQuestionCount=true`: تضمين عدد الأسئلة لكل محتوى
- **الاستجابة الناجحة**:
  ```json
  [
    {
      "id": 1,
      "code": "CS101",
      "name": "مقدمة في علوم الحاسب",
      "semester": "FIRST",
      "year": "FIRST",
      "chaptersCount": 10,
      "theorySessionsPerWeek": 2,
      "practicalSessionsPerWeek": 1,
      "_count": {
        "questions": 15
      }
    }
  ]
  ```

#### إنشاء محتوى تدريبي جديد
- **طريقة**: POST
- **المسار**: `/api/training-contents`
- **الوصف**: إنشاء محتوى تدريبي جديد
- **مصادقة**: Bearer Token (ADMIN)
- **الجسم**:
  ```json
  {
    "code": "CS101",
    "name": "مقدمة في علوم الحاسب",
    "semester": "FIRST",
    "year": "FIRST",
    "programIds": [1],
    "instructorId": "instructor-id",
    "durationMonths": 4,
    "theorySessionsPerWeek": 2,
    "practicalSessionsPerWeek": 1,
    "chaptersCount": 10,
    "yearWorkMarks": 20,
    "practicalMarks": 20,
    "writtenMarks": 40,
    "attendanceMarks": 10,
    "quizzesMarks": 10,
    "finalExamMarks": 100
  }
  ```

#### توليد كود محتوى تدريبي
- **طريقة**: GET
- **المسار**: `/api/training-contents/generate-code`
- **الوصف**: توليد كود فريد للمحتوى التدريبي
- **مصادقة**: Bearer Token (ADMIN)
- **الاستجابة الناجحة**:
  ```json
  {
    "code": "CS101"
  }
  ```

### نظام الحضور

#### إنشاء جلسة جديدة
- **طريقة**: POST
- **المسار**: `/api/attendance/sessions`
- **الوصف**: إنشاء جلسة تدريبية جديدة
- **مصادقة**: Bearer Token (ADMIN)
- **الجسم**:
  ```json
  {
    "title": "محاضرة مقدمة في البرمجة",
    "type": "THEORY",
    "date": "2023-08-15",
    "startTime": "2023-08-15T10:00:00.000Z",
    "endTime": "2023-08-15T12:00:00.000Z",
    "location": "قاعة 101",
    "contentId": 1,
    "chapter": 1,
    "notes": "ملاحظات الجلسة"
  }
  ```

#### جلسات المحتوى التدريبي
- **طريقة**: GET
- **المسار**: `/api/attendance/sessions/content/{contentId}`
- **الوصف**: الحصول على جلسات محتوى تدريبي معين
- **مصادقة**: Bearer Token
- **الاستجابة الناجحة**:
  ```json
  [
    {
      "id": 1,
      "title": "محاضرة مقدمة في البرمجة",
      "type": "THEORY",
      "date": "2023-08-15",
      "startTime": "2023-08-15T10:00:00.000Z",
      "endTime": "2023-08-15T12:00:00.000Z",
      "location": "قاعة 101",
      "contentId": 1,
      "chapter": 1,
      "notes": "ملاحظات الجلسة",
      "_count": {
        "attendanceRecords": 25
      }
    }
  ]
  ```

#### تسجيل الحضور
- **طريقة**: POST
- **المسار**: `/api/attendance/records`
- **الوصف**: تسجيل حضور متدرب
- **مصادقة**: Bearer Token
- **الجسم**:
  ```json
  {
    "sessionId": 1,
    "traineeId": 1,
    "status": "PRESENT",
    "arrivalTime": "2023-08-15T10:05:00.000Z",
    "notes": "وصل متأخر 5 دقائق"
  }
  ```

#### تحديث متعدد لسجلات الحضور
- **طريقة**: POST
- **المسار**: `/api/attendance/bulk-update`
- **الوصف**: تحديث سجلات حضور متعددة دفعة واحدة
- **مصادقة**: Bearer Token
- **الجسم**:
  ```json
  {
    "sessionId": 1,
    "records": [
      {
        "traineeId": 1,
        "status": "PRESENT",
        "arrivalTime": "2023-08-15T10:05:00.000Z"
      },
      {
        "traineeId": 2,
        "status": "ABSENT",
        "notes": "غائب بدون عذر"
      },
      {
        "traineeId": 3,
        "status": "EXCUSED",
        "notes": "غائب بعذر طبي"
      }
    ]
  }
  ```

#### تقرير حضور للمحتوى التدريبي
- **طريقة**: GET
- **المسار**: `/api/attendance/reports/content/{contentId}`
- **الوصف**: الحصول على تقرير حضور لمحتوى تدريبي معين
- **مصادقة**: Bearer Token
- **الاستجابة الناجحة**:
  ```json
  {
    "content": {
      "id": 1,
      "code": "CS101",
      "name": "مقدمة في علوم الحاسب"
    },
    "sessionsCount": 10,
    "traineesCount": 25,
    "sessionsAttendanceRate": 85.5,
    "trainees": [
      {
        "id": 1,
        "name": "متدرب",
        "attendanceCount": 9,
        "absentCount": 1,
        "attendanceRate": 90.0
      }
    ]
  }
  ```

### بنك الأسئلة

#### جلب أسئلة المحتوى التدريبي
- **طريقة**: GET
- **المسار**: `/api/questions/content/{contentId}`
- **الوصف**: الحصول على أسئلة محتوى تدريبي معين
- **مصادقة**: Bearer Token
- **الاستجابة الناجحة**:
  ```json
  [
    {
      "id": 1,
      "text": "ما هو المفهوم الأساسي للبرمجة الكائنية؟",
      "type": "MULTIPLE_CHOICE",
      "skill": "COMPREHENSION",
      "difficulty": "MEDIUM",
      "chapter": 3,
      "contentId": 1,
      "options": [
        {
          "id": 1,
          "text": "تجريد البيانات وإخفاء التفاصيل",
          "isCorrect": true
        },
        {
          "id": 2,
          "text": "البرمجة الخطية المتسلسلة",
          "isCorrect": false
        }
      ],
      "createdBy": {
        "name": "المشرف",
        "email": "admin@example.com"
      }
    }
  ]
  ```

#### إضافة سؤال جديد
- **طريقة**: POST
- **المسار**: `/api/questions`
- **الوصف**: إضافة سؤال جديد إلى بنك الأسئلة
- **مصادقة**: Bearer Token
- **الجسم**:
  ```json
  {
    "text": "ما هو المفهوم الأساسي للبرمجة الكائنية؟",
    "type": "MULTIPLE_CHOICE",
    "skill": "COMPREHENSION",
    "difficulty": "MEDIUM",
    "chapter": 3,
    "contentId": 1,
    "options": [
      {
        "text": "تجريد البيانات وإخفاء التفاصيل",
        "isCorrect": true
      },
      {
        "text": "البرمجة الخطية المتسلسلة",
        "isCorrect": false
      },
      {
        "text": "هيكلة البيانات فقط",
        "isCorrect": false
      },
      {
        "text": "البرمجة الإجرائية",
        "isCorrect": false
      }
    ]
  }
  ```

### الأخبار والوظائف

#### جلب قائمة الأخبار
- **طريقة**: GET
- **المسار**: `/api/news`
- **الوصف**: الحصول على قائمة الأخبار
- **معلمات الاستعلام الاختيارية**: 
  - `page`: رقم الصفحة
  - `limit`: عدد العناصر في الصفحة
- **الاستجابة الناجحة**:
  ```json
  {
    "news": [
      {
        "id": 1,
        "title": "افتتاح الفصل الدراسي الجديد",
        "content": "محتوى الخبر هنا...",
        "image": "news1.jpg",
        "createdAt": "2023-08-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "pages": 2
    }
  }
  ```

#### جلب قائمة الوظائف
- **طريقة**: GET
- **المسار**: `/api/jobs`
- **الوصف**: الحصول على قائمة الوظائف
- **معلمات الاستعلام الاختيارية**: 
  - `page`: رقم الصفحة
  - `limit`: عدد العناصر في الصفحة
- **الاستجابة الناجحة**:
  ```json
  {
    "jobs": [
      {
        "id": 1,
        "title": "مطور واجهات أمامية",
        "description": "وصف الوظيفة...",
        "requirements": "متطلبات الوظيفة...",
        "deadline": "2023-08-30"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "pages": 2
    }
  }
  ```

## معالجة الأخطاء والاستجابات

### هيكل الخطأ القياسي
```json
{
  "statusCode": 400,
  "message": "وصف الخطأ هنا",
  "error": "نوع الخطأ"
}
```

### رموز الحالة المستخدمة
- `200`: نجاح
- `201`: تم الإنشاء بنجاح
- `400`: طلب غير صحيح
- `401`: غير مصرح (مشكلة في المصادقة)
- `403`: ممنوع (لا توجد صلاحية كافية)
- `404`: غير موجود
- `500`: خطأ داخلي في الخادم

## الأمان وأفضل الممارسات

1. **المصادقة**: يستخدم النظام JWT (JSON Web Tokens) للمصادقة. يجب إرسال رمز الوصول في ترويسة Authorization بصيغة `Bearer {token}`.

2. **الصلاحيات**: يستخدم النظام نظام أدوار للتحكم في الصلاحيات:
   - `ADMIN`: المشرف العام مع كامل الصلاحيات
   - `INSTRUCTOR`: المدرب مع صلاحيات إدارة المحتوى والحضور والأسئلة
   - `TRAINEE`: المتدرب مع صلاحيات محدودة

3. **التحقق من البيانات**: يستخدم النظام class-validator للتحقق من البيانات المدخلة.

4. **معالجة الاستثناءات**: يستخدم النظام نظام معالجة استثناءات NestJS لإرجاع رسائل خطأ متناسقة.

## التوثيق المباشر

الخادم يوفر واجهة Swagger للتوثيق المباشر والتفاعل مع API. بعد تشغيل الخادم، يمكن الوصول إلى التوثيق عبر:

```
http://localhost:4000/api/docs
```

## التطوير والمساهمة

للمساهمة في تطوير النظام، يرجى اتباع الخطوات التالية:

1. إنشاء فرع جديد للميزة أو الإصلاح
2. تنفيذ التغييرات مع التزام بمعايير الكود
3. كتابة اختبارات للتغييرات الجديدة
4. تقديم طلب سحب مع شرح مفصل للتغييرات

## الدعم والتواصل

للإبلاغ عن المشكلات أو طلب المساعدة، يرجى فتح مشكلة في مستودع GitHub أو التواصل عبر البريد الإلكتروني: support@tiba-center.com


اصلاح مشكلة الاعدادات
npx ts-node prisma/fix-settings.ts
