# 📚 دليل المطور - المحتوى التدريبي في منصة المتدربين

## 📋 نظرة عامة

صفحة المحتوى التدريبي هي المكان الذي يعرض للمتدرب جميع المواد الدراسية الخاصة ببرنامجه التدريبي.

**المسار:** `/trainee-dashboard/content`
**الملف:** `src/app/trainee-dashboard/content/page.tsx`

---

## 🏗️ البنية الأساسية

### Schema في Database

```prisma
model Trainee {
  id        Int      @id @default(autoincrement())
  programId Int      // ينتمي لبرنامج واحد
  program   Program  @relation(...)
}

model Program {
  id         Int      @id @default(autoincrement())
  nameAr     String
  classrooms Classroom[]
}

model Classroom {
  id                Int      @id @default(autoincrement())
  programId         Int
  program           Program  @relation(...)
  trainingContents  TrainingContent[]
}

model TrainingContent {
  id          Int      @id @default(autoincrement())
  name        String
  code        String   @unique
  programId   Int      // مرتبط مباشرة بالبرنامج
  classroomId Int      // مرتبط بالفصل
  program     Program  @relation(...)
  classroom   Classroom @relation(...)
  lectures    Lecture[]
}

model Lecture {
  id                 Int      @id @default(autoincrement())
  title              String
  trainingContentId  Int
  trainingContent    TrainingContent @relation(...)
}
```

### العلاقات
```
Trainee
  └─ Program (1:1)
      └─ Classroom (1:N)
          └─ TrainingContent (1:N)
              └─ Lecture (1:N)
```

---

## 🔄 التدفق الكامل

### 1️⃣ تحميل بيانات المتدرب

```typescript
const { profile: traineeData } = useTraineeProfile();

// البيانات المستلمة:
{
  trainee: {
    id: 607,
    nameAr: "عمرو ايمن حامد",
    nationalId: "30509011207159",
    program: {
      id: 1,
      nameAr: "مساعد خدمات صحية",
      ...
    }
  }
}
```

### 2️⃣ جلب المحتوى التدريبي

#### ❌ الطريقة القديمة (غير فعّالة):
```typescript
// جلب جميع المحتويات (8 مواد)
const allContents = await fetchAPI('/training-contents');

// فلترة في Frontend
const filtered = allContents.filter(content => 
  content.programId === traineeProgramId
);
// النتيجة: 4 مواد فقط

// مشاكل:
// - نقل بيانات غير ضرورية (8 مواد بدلاً من 4)
// - معالجة في Frontend (بطيء)
// - أمان ضعيف (المتدرب يستلم مواد برامج أخرى!)
```

#### ✅ الطريقة الجديدة (فعّالة):
```typescript
const programId = traineeData?.trainee?.program?.id;

// طلب واحد مع parameter
const contents = await fetchAPI(`/training-contents?programId=${programId}`);
// Backend يفلتر في Database ويعيد 4 مواد فقط

// مميزات:
// ✅ أقل bandwidth (50% تقليل)
// ✅ أسرع (فلترة SQL)
// ✅ أكثر أماناً (المتدرب لا يرى مواد أخرى)
```

### 3️⃣ جلب المحاضرات

```typescript
// جلب متوازي (Parallel) لكل المواد
const contentsWithLectures = await Promise.all(
  contents.map(async (content) => {
    try {
      const lectures = await fetchAPI(`/lectures/content/${content.id}`);
      return { 
        ...content, 
        lecturesCount: lectures?.length || 0 
      };
    } catch {
      return { ...content, lecturesCount: 0 };
    }
  })
);

// النتيجة: 4 طلبات متوازية (أسرع من المتسلسل)
```

### 4️⃣ العرض

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {contentsWithLectures.map(content => (
    <Card key={content.id}>
      {/* الأيقونة */}
      <BookOpenIcon className="w-7 h-7 text-white" />
      
      {/* العنوان */}
      <h4>{content.name}</h4>
      
      {/* الكود */}
      <p>{content.code}</p>
      
      {/* عدد المحاضرات */}
      <span>{content.lecturesCount} محاضرة</span>
      
      {/* زر العرض */}
      <Link href={`/trainee-dashboard/content/${content.id}`}>
        عرض المحاضرات
      </Link>
    </Card>
  ))}
</div>
```

---

## 🔧 Backend API

### Endpoint
```
GET /training-contents?programId={id}
```

### Controller
**الملف:** `backend/src/training-content/training-content.controller.ts`

```typescript
@Get()
findAll(
  @Req() req: any,
  @Query('includeQuestionCount') includeQuestionCount?: string,
  @Query('classroomId') classroomId?: string,
  @Query('instructorId') instructorId?: string,
  @Query('programId') programId?: string,  // ← جديد
) {
  const shouldIncludeCount = includeQuestionCount === 'true';
  
  // إذا محاضر → مواده فقط
  if (req.user?.accountType === 'INSTRUCTOR') {
    return this.trainingContentService.findByInstructor(req.user.userId);
  }
  
  // إذا تم تحديد instructorId
  if (instructorId) {
    return this.trainingContentService.findByInstructor(instructorId);
  }
  
  // الطلب العادي مع programId
  return this.trainingContentService.findAll(
    shouldIncludeCount, 
    classroomId ? +classroomId : undefined,
    programId ? +programId : undefined  // ← جديد
  );
}
```

### Service
**الملف:** `backend/src/training-content/training-content.service.ts`

```typescript
async findAll(
  includeQuestionCount = false, 
  classroomId?: number,
  programId?: number  // ← جديد
) {
  let whereCondition: any = {};
  
  // فلترة حسب programId (أولوية)
  if (programId) {
    whereCondition.programId = programId;  // ← فلترة SQL
  }
  // أو حسب classroomId
  else if (classroomId) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { programId: true },
    });
    
    if (classroom) {
      whereCondition.programId = classroom.programId;
    }
  }

  return await this.prisma.trainingContent.findMany({
    where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
    include: {
      instructor: {...},
      program: true,
      classroom: true,
      _count: {
        select: {
          ...(includeQuestionCount ? { questions: true } : {}),
          scheduleSlots: true,
        },
      },
    },
  });
}
```

---

## 💻 كود Frontend الكامل

### Component الرئيسي

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import { fetchAPI } from '@/lib/api';

export default function TraineeContentPage() {
  const { profile: traineeData } = useTraineeProfile();
  const [loading, setLoading] = useState(true);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);

  useEffect(() => {
    if (traineeData?.trainee?.program?.id) {
      loadTrainingContents();
    }
  }, [traineeData]);

  const loadTrainingContents = async () => {
    try {
      setLoading(true);
      
      const programId = traineeData?.trainee?.program?.id;
      
      if (!programId) {
        setTrainingContents([]);
        return;
      }
      
      // ✅ طلب مباشر - Backend يفلتر
      const contents = await fetchAPI(`/training-contents?programId=${programId}`);
      
      console.log(`✅ Backend أرجع ${contents?.length || 0} مادة`);
      
      // جلب المحاضرات بشكل متوازي
      if (contents && contents.length > 0) {
        const contentsWithLectures = await Promise.all(
          contents.map(async (content) => {
            try {
              const lectures = await fetchAPI(`/lectures/content/${content.id}`);
              return { ...content, lecturesCount: lectures?.length || 0 };
            } catch {
              return { ...content, lecturesCount: 0 };
            }
          })
        );
        setTrainingContents(contentsWithLectures);
      } else {
        setTrainingContents([]);
      }
      
    } catch (error: any) {
      console.error('خطأ في تحميل المحتوى:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* عرض المواد */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainingContents.map(content => (
          <Card key={content.id}>
            {/* محتوى الكارت */}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 مقارنة الأداء

### السيناريو: متدرب في برنامج "مساعد خدمات صحية"

#### قبل التحسين:
```
1. Frontend → GET /training-contents
   Backend → جلب 8 مواد (جميع البرامج)
   Response: 8KB

2. Frontend → فلترة يدوياً
   النتيجة: 4 مواد

3. Frontend → 4 طلبات متسلسلة للمحاضرات
   GET /lectures/content/9
   GET /lectures/content/10
   GET /lectures/content/11
   GET /lectures/content/12
   الوقت: 4 × 200ms = 800ms

الإجمالي: 1 + 4 = 5 طلبات
الوقت الكلي: ~1000ms
البيانات المنقولة: 8KB + extras = ~10KB
```

#### بعد التحسين:
```
1. Frontend → GET /training-contents?programId=1
   Backend → فلترة SQL + جلب 4 مواد فقط
   Response: 4KB

2. Frontend → 4 طلبات متوازية للمحاضرات
   Promise.all([
     GET /lectures/content/9,
     GET /lectures/content/10,
     GET /lectures/content/11,
     GET /lectures/content/12
   ])
   الوقت: max(4 طلبات) = ~200ms

الإجمالي: 1 + 4 parallel = 5 طلبات
الوقت الكلي: ~400ms ✅ (60% أسرع)
البيانات المنقولة: 4KB + extras = ~5KB ✅ (50% أقل)
```

---

## 🔍 Debugging

### تفعيل Console Logs

```typescript
const loadTrainingContents = async () => {
  const programId = traineeData?.trainee?.program?.id;
  console.log('📌 معرف البرنامج:', programId);
  
  const contents = await fetchAPI(`/training-contents?programId=${programId}`);
  console.log('📦 عدد المواد المستلمة:', contents?.length);
  console.log('📄 المواد:', contents);
};
```

### فحص الطلبات في Network Tab

```
GET /api/training-contents?programId=1
Response: Array(4) [
  { id: 9, name: "مادة تشريح", programId: 1, ... },
  { id: 10, name: "مادة فسيولوجي", programId: 1, ... },
  { id: 11, name: "مادة انجليزي", programId: 1, ... },
  { id: 12, name: "مادة العملي", programId: 1, ... }
]
```

### Verify Filtering

```typescript
// في Console
traineeData?.trainee?.program?.id  // يجب أن يعيد: 1

// بعد الطلب
contents.every(c => c.programId === 1)  // يجب أن يعيد: true
```

---

## 🎨 التصميم

### الألوان
```css
/* منصة المتدربين */
--primary: emerald-500
--secondary: teal-600
--accent: cyan-600

/* الخلفيات */
bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600
```

### الكروت
```typescript
<div className="group bg-white rounded-2xl border border-gray-200 p-6 
     hover:shadow-xl transition-all hover:-translate-y-2 hover:border-emerald-200">
  
  {/* الأيقونة */}
  <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 
       rounded-xl shadow-lg group-hover:shadow-xl">
    <BookOpenIcon className="w-7 h-7 text-white" />
  </div>
  
  {/* Badge عدد المحاضرات */}
  <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 
        rounded-full border border-emerald-200">
    {lecturesCount} محاضرة
  </span>
  
  {/* العنوان */}
  <h4 className="text-xl font-bold text-gray-900 
       group-hover:text-emerald-700">
    {content.name}
  </h4>
  
  {/* الكود */}
  <p className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
    {content.code}
  </p>
  
  {/* الفصل الدراسي */}
  <span className="bg-gray-100 px-3 py-1.5 rounded-lg">
    {content.semester === 'FIRST' ? 'الفصل الأول' : 'الفصل الثاني'}
  </span>
  
  {/* زر العرض */}
  <Link href={`/trainee-dashboard/content/${content.id}`}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 
                   text-white rounded-xl py-3.5 hover:from-emerald-600 
                   hover:to-teal-700 transform hover:scale-105">
    <BookOpenIcon className="h-4 w-4" />
    عرض المحاضرات
  </Link>
</div>
```

---

## 🧪 الاختبار

### 1. التحقق من البيانات
```typescript
// في Console المتصفح
traineeData?.trainee?.program?.id  
// يجب: 1

traineeData?.trainee?.program?.nameAr  
// يجب: "مساعد خدمات صحية"
```

### 2. فحص الطلب
```
Network Tab → 
GET /api/training-contents?programId=1

Response:
✅ يجب: Array(4) - فقط مواد البرنامج 1
❌ خطأ: Array(8) - جميع المواد
```

### 3. التحقق من العرض
```
الصفحة يجب أن تعرض:
✅ 4 كروت للمواد
✅ كل كارت به عدد المحاضرات
✅ عند الضغط → /trainee-dashboard/content/{id}
```

---

## ⚠️ مشاكل شائعة وحلولها

### المشكلة 1: يعرض جميع المواد (8 بدلاً من 4)
**السبب:** Backend لا يفلتر حسب programId

**الحل:**
```typescript
// تحقق من Backend
@Query('programId') programId?: string,  // ← يجب إضافته

// في Service
if (programId) {
  whereCondition.programId = programId;  // ← فلترة SQL
}
```

### المشكلة 2: لا تظهر المحاضرات
**السبب:** خطأ في جلب المحاضرات

**الحل:**
```typescript
// تحقق من Console
lectures.length  // يجب: رقم موجب

// تحقق من API
GET /api/lectures/content/{contentId}
Response: Array(N) - يجب أن يكون array
```

### المشكلة 3: بطء في التحميل
**السبب:** جلب محاضرات بشكل متسلسل

**الحل:**
```typescript
// ❌ متسلسل (بطيء)
for (const content of contents) {
  const lectures = await fetchAPI(`/lectures/content/${content.id}`);
}

// ✅ متوازي (سريع)
await Promise.all(
  contents.map(async (content) => {
    const lectures = await fetchAPI(`/lectures/content/${content.id}`);
  })
);
```

---

## 📈 تحسينات مستقبلية

### 1. Cache في Frontend
```typescript
// حفظ المحتوى محلياً
localStorage.setItem('contents_cache', JSON.stringify(contents));

// استخدام عند الحاجة
const cached = localStorage.getItem('contents_cache');
if (cached) {
  const parsed = JSON.parse(cached);
  // استخدام...
}
```

### 2. Pagination للمحاضرات
```typescript
// بدلاً من جلب جميع المحاضرات
const lectures = await fetchAPI(`/lectures/content/${id}?page=1&limit=10`);
```

### 3. Infinite Scroll
```typescript
// عند التمرير لأسفل
<InfiniteScroll
  dataLength={contents.length}
  next={loadMoreContents}
  hasMore={hasMore}
  loader={<LoadingSpinner />}
>
  {/* المحتوى */}
</InfiniteScroll>
```

---

## 📝 الملخص

### ✅ ما تم تطبيقه:

1. **Backend:**
   - دعم `?programId=` في API
   - فلترة في Database (SQL)
   - إرجاع المواد الخاصة بالبرنامج فقط

2. **Frontend:**
   - طلب مباشر مع programId
   - جلب متوازي للمحاضرات
   - عرض احترافي

3. **الأداء:**
   - 60% أسرع
   - 50% أقل bandwidth
   - أكثر أماناً

### 🎯 النتيجة النهائية:

المتدرب في برنامج "مساعد خدمات صحية" يرى:
- ✅ 4 مواد فقط (برنامجه)
- ✅ عدد المحاضرات لكل مادة
- ✅ زر للوصول للمحاضرات
- ✅ تحميل سريع وفعّال

---

## 🔗 الملفات ذات الصلة

- `src/app/trainee-dashboard/content/page.tsx` - الصفحة الرئيسية
- `src/app/trainee-dashboard/hooks/useTraineeProfile.ts` - Hook البيانات
- `backend/src/training-content/training-content.controller.ts` - Controller
- `backend/src/training-content/training-content.service.ts` - Service
- `backend/prisma/schema.prisma` - Database Schema

---

تم التطوير بواسطة فريق التطوير 🚀
التحديث الأخير: 2025-11-26