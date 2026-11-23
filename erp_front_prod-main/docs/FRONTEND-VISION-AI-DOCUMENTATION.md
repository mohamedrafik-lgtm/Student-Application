# 📘 دليل المطور - Vision AI & Frontend Enhancements

## 📋 جدول المحتويات

1. [Vision AI - نظام التصحيح الذكي](#vision-ai)
2. [رفع الأسئلة من Excel](#upload-questions)
3. [نظام الصلاحيات](#permissions)
4. [تحسينات منصة المتدربين](#trainee-platform)
5. [Dashboard الرئيسية](#dashboard)

---

## 🤖 Vision AI - نظام التصحيح الذكي {#vision-ai}

### المسار الرئيسي
```
/dashboard/vision-ai
```

### الملفات
- **الصفحة:** `src/app/dashboard/vision-ai/page.tsx`
- **الصلاحية:** `dashboard.vision-ai.view`

### الوظيفة
عرض جميع الاختبارات الورقية المتاحة للتصحيح الذكي.

### كيفية العمل

```typescript
// 1. جلب الاختبارات
const exams = await fetchAPI('/paper-exams');

// 2. عرض كل اختبار في كارت
exams.map(exam => (
  <Card onClick={() => router.push(`/paper-exams/${exam.id}/scan`)}>
    {/* معلومات الاختبار */}
  </Card>
))
```

### المميزات
- ✅ عرض جميع الاختبارات الورقية
- ✅ الضغط على اختبار → يفتح نظام التصحيح
- ✅ إحصائيات: عدد النماذج، الأوراق
- ✅ تصميم Vision AI متكامل

---

## 📤 رفع الأسئلة من Excel {#upload-questions}

### المسار
```
/dashboard/vision-ai/upload-questions
```

### الملفات
- **الصفحة:** `src/app/dashboard/vision-ai/upload-questions/page.tsx`
- **الصلاحية:** `dashboard.vision-ai.upload-questions.view`

### التدفق (4 خطوات)

#### الخطوة 1: اختيار البرنامج والمادة
```typescript
// اختيار البرنامج
<select value={programId} onChange={handleProgramChange}>
  {programs.map(p => <option value={p.id}>{p.nameAr}</option>)}
</select>

// جلب المواد التابعة للبرنامج فقط
const contents = await fetchAPI(`/training-contents?programId=${programId}`);
```

#### الخطوة 2: رفع Excel
```typescript
// رفع الملف
<input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />

// قراءة Excel
import * as XLSX from 'xlsx';
const workbook = XLSX.read(fileData);
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
```

#### الخطوة 3: تحديد الأعمدة
```typescript
// تحديد الأعمدة
columnMapping = {
  question: 'السؤال',    // عمود السؤال
  option1: 'الإجابة 1',  // إجابة 1
  option2: 'الإجابة 2',  // إجابة 2
  option3: 'الإجابة 3',  // إجابة 3 (اختياري)
  option4: 'الإجابة 4',  // إجابة 4 (اختياري)
}

// شاشة معالجة Vision AI (7 ثواني)
setProcessing(true);
await new Promise(resolve => setTimeout(resolve, 7000));
```

#### الخطوة 4: مراجعة وحفظ
```typescript
// عرض الأسئلة
questions.map(question => {
  // السؤال + 4 إجابات
  // تحديد الإجابة الصحيحة
  // حفظ في Database
})

// الحفظ
await fetchAPI('/questions', {
  method: 'POST',
  body: JSON.stringify({
    text: question.text,
    type: 'MULTIPLE_CHOICE',
    contentId: selectedContentId,
    chapter: 1,                    // افتراضي
    skill: 'COMPREHENSION',        // افتراضي
    difficulty: 'MEDIUM',          // افتراضي
    options: [...],
  })
});
```

### Dialog النجاح
بعد الحفظ الناجح:
```typescript
<Dialog>
  ✅ نجحت العملية!
  - عدد الأسئلة: {savedCount}
  - تم الحفظ: {savedCount}/{questions.length}
  - الحالة: مكتملة
  
  <Button onClick={resetAndClose}>استمر</Button>
</Dialog>
```

### تحميل القالب
```typescript
// إنشاء ملف Excel جاهز
const template = [
  ['السؤال', 'الإجابة 1', 'الإجابة 2', 'الإجابة 3', 'الإجابة 4'],
  ['ما هو...؟', 'خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'],
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة');
XLSX.writeFile(wb, 'قالب_الأسئلة.xlsx');
```

---

## 🔐 نظام الصلاحيات {#permissions}

### الصلاحيات الجديدة

#### Vision AI
```typescript
{
  resource: 'dashboard.vision-ai',
  action: 'view',
  displayName: 'الوصول إلى Vision AI',
  category: 'Vision AI',
}

{
  resource: 'dashboard.vision-ai',
  action: 'grade',
  displayName: 'تصحيح ذكي بـ Vision AI',
  category: 'Vision AI',
}

{
  resource: 'dashboard.vision-ai.upload-questions',
  action: 'view',
  displayName: 'رفع أسئلة من Excel',
  category: 'Vision AI',
}
```

### التعيين التلقائي
```typescript
// في backend/prisma/seed.ts

// Super Admin: جميع الصلاحيات
if (superAdminRole) {
  for (const permission of permissions) {
    await assignPermissionToRole(superAdminRole.id, permission.id);
  }
}

// Admin: كل الصلاحيات بما فيها Vision AI
if (adminRole) {
  const adminPermissions = permissions.filter(p => 
    !p.resource.includes('permissions') || 
    p.resource.includes('vision-ai')
  );
  // تعيين...
}
```

### الاستخدام في Frontend
```typescript
// في السايد بار
{
  title: 'المساعد الذكي',
  requiredPermission: { 
    resource: 'dashboard.vision-ai', 
    action: 'view' 
  },
  items: [
    {
      title: 'تصحيح ورقي',
      href: '/dashboard/vision-ai',
      requiredPermission: { resource: 'dashboard.vision-ai', action: 'view' },
    },
    {
      title: 'رفع أسئلة',
      href: '/dashboard/vision-ai/upload-questions',
      requiredPermission: { resource: 'dashboard.vision-ai.upload-questions', action: 'view' },
    },
  ]
}
```

---

## 👥 تحسينات منصة المتدربين {#trainee-platform}

### التحسين الرئيسي: فلترة المحتوى

#### قبل (غير فعّال):
```typescript
// جلب جميع المواد
const allContents = await fetchAPI('/training-contents'); // 8 مواد

// فلترة في Frontend
const filtered = allContents.filter(c => c.programId === traineeProgram);
```

#### بعد (فعّال):
```typescript
// Backend يفلتر في Database
const contents = await fetchAPI(`/training-contents?programId=${programId}`);
// يعيد 4 مواد فقط
```

### Backend Changes

**Controller:**
```typescript
@Get()
findAll(
  @Query('programId') programId?: string,
) {
  return this.trainingContentService.findAll(
    includeQuestionCount,
    classroomId,
    programId ? +programId : undefined  // جديد
  );
}
```

**Service:**
```typescript
async findAll(includeQuestionCount, classroomId?, programId?) {
  let whereCondition: any = {};
  
  if (programId) {
    whereCondition.programId = programId;  // فلترة SQL
  }
  
  return prisma.trainingContent.findMany({ 
    where: whereCondition 
  });
}
```

### الفوائد
- ✅ أقل bandwidth (50% تقليل)
- ✅ أسرع (فلترة SQL)
- ✅ أكثر أماناً (المتدرب يرى برنامجه فقط)

---

## 🏠 Dashboard الرئيسية {#dashboard}

### Banner Vision AI
**الملف:** `src/app/dashboard/page.tsx`

```typescript
<div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
  <div className="flex items-center justify-between">
    {/* أيقونة Vision */}
    <svg className="w-12 h-12">
      <circle cx="12" cy="12" r="3" />
      <path d="..." />  {/* أيقونة عين */}
    </svg>
    
    {/* المحتوى */}
    <h2>Vision AI</h2>
    <p>مساعدك الذكي لإدارة مراكز التدريب</p>
    
    {/* Badge */}
    <div>
      🟢 النظام 2.0
    </div>
  </div>
</div>
```

### التصميم
- ✅ ألوان موحدة مع السايد بار (blue-600 → indigo-600)
- ✅ بدون ذكر OpenAI أو GPT
- ✅ يعرض Vision AI كمساعد ذكي

---

## 🔧 Best Practices

### استدعاء API
```typescript
// ❌ غير صحيح
const all = await fetchAPI('/items');
const filtered = all.filter(i => i.categoryId === id);

// ✅ صحيح
const filtered = await fetchAPI(`/items?categoryId=${id}`);
```

### Parallel Requests
```typescript
// ❌ متسلسل (بطيء)
for (const item of items) {
  const details = await fetchAPI(`/details/${item.id}`);
}

// ✅ متوازي (سريع)
const detailsPromises = items.map(item => 
  fetchAPI(`/details/${item.id}`)
);
const allDetails = await Promise.all(detailsPromises);
```

### معالجة الأخطاء
```typescript
try {
  const data = await fetchAPI('/endpoint');
} catch (error: any) {
  // فحص نوع الخطأ
  if (isTokenExpiryError(error)) {
    handleTokenExpiry();  // توجيه للتسجيل
    return;
  }
  
  toast.error('حدث خطأ');
}
```

---

## 📦 المكتبات المستخدمة

### Excel Processing
```bash
npm install xlsx
```

```typescript
import * as XLSX from 'xlsx';

// قراءة Excel
const workbook = XLSX.read(data);
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// كتابة Excel
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'output.xlsx');
```

### React Hot Toast
```typescript
import { toast } from 'react-hot-toast';

toast.success('تم بنجاح');
toast.error('حدث خطأ');
toast.loading('جاري المعالجة...');
```

---

## 🎨 مكونات UI

### Progress Bar
```typescript
<div className="flex items-center">
  {steps.map((label, index) => (
    <div className="flex items-center">
      {/* الدائرة */}
      <div className={`w-16 h-16 rounded-full ${
        step > index ? 'bg-green-500' : 
        step === index ? 'bg-blue-600 ring-4 ring-blue-200' : 
        'bg-white'
      }`}>
        {step > index ? <CheckIcon /> : index + 1}
      </div>
      
      {/* الخط الواصل */}
      {index < steps.length - 1 && (
        <div className="flex-1 h-3 bg-gray-200">
          <div className={`h-full ${
            step > index ? 'bg-gradient-to-r from-blue-500 to-green-500 w-full' : 'w-0'
          }`} />
        </div>
      )}
    </div>
  ))}
</div>
```

### Success Dialog
```typescript
{showSuccess && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-white rounded-3xl p-10 max-w-md">
      {/* أيقونة نجاح */}
      <div className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6">
        <CheckCircle className="w-16 h-16 text-white" />
      </div>
      
      {/* العنوان */}
      <h3 className="text-3xl font-black">نجحت العملية!</h3>
      
      {/* البيانات */}
      <div className="bg-green-50 rounded-2xl p-6">
        {/* إحصائيات */}
      </div>
      
      {/* زر */}
      <Button onClick={close}>استمر</Button>
    </div>
  </div>
)}
```

### Processing Screen
```typescript
{processing && (
  <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 to-indigo-900">
    <div className="text-center">
      {/* دائرة تدور */}
      <div className="w-32 h-32 border-8 border-blue-300 border-t-white rounded-full animate-spin" />
      
      {/* شعار Vision AI */}
      <svg className="w-16 h-16 text-white animate-pulse">
        <circle cx="12" cy="12" r="3" />
        <path d="M2.458 12C3.732 7.943..." />
      </svg>
      
      {/* النص */}
      <h2 className="text-4xl font-black text-white">Vision AI</h2>
      <p className="text-2xl text-blue-200">يستخرج الأسئلة والإجابات...</p>
      
      {/* نقاط متحركة */}
      <div className="flex gap-2">
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-100" />
        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-200" />
      </div>
    </div>
  </div>
)}
```

---

## 📝 أمثلة كاملة

### مثال: صفحة مع خطوات
```typescript
'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { FiCheckCircle } from 'react-icons/fi';

export default function MultiStepPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});
  
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar currentStep={step} totalSteps={4} />
      
      {/* الخطوات */}
      {step === 1 && <Step1 onNext={() => setStep(2)} />}
      {step === 2 && <Step2 onNext={() => setStep(3)} />}
      {step === 3 && <Step3 onNext={() => setStep(4)} />}
      {step === 4 && <Step4 onSave={handleSave} />}
    </div>
  );
}
```

### مثال: جلب بيانات مع فلترة
```typescript
const loadData = async () => {
  const programId = userData.programId;
  
  // ✅ فلترة في Backend
  const data = await fetchAPI(`/items?programId=${programId}`);
  
  // ✅ طلبات متوازية
  const withDetails = await Promise.all(
    data.map(async (item) => {
      const details = await fetchAPI(`/details/${item.id}`);
      return { ...item, details };
    })
  );
  
  setItems(withDetails);
};
```

---

## 🧪 الاختبار

### 1. Vision AI
```bash
# شغل seed
cd backend
npm run seed

# افتح المتصفح
http://localhost:3000/dashboard/vision-ai
```

### 2. رفع الأسئلة
```bash
# ثبت المكتبة
npm install xlsx

# افتح الصفحة
http://localhost:3000/dashboard/vision-ai/upload-questions

# حمّل القالب
# املأ البيانات
# ارفع الملف
```

### 3. منصة المتدربين
```bash
# سجل دخول كمتدرب
http://localhost:3000/trainee-auth

# افتح المحتوى
http://localhost:3000/trainee-dashboard/content
# يجب أن يعرض مواد برنامجه فقط
```

---

## 🐛 مشاكل شائعة وحلولها

### 1. لا تظهر المحتويات للمتدرب
**السبب:** Backend لا يفلتر حسب programId
**الحل:** تأكد من:
```typescript
// Backend يدعم
@Query('programId') programId?: string

// Frontend يرسل
`/training-contents?programId=${id}`
```

### 2. خطأ عند حفظ الأسئلة
**السبب:** بيانات ناقصة (chapter, skill, difficulty)
**الحل:**
```typescript
{
  chapter: question.chapter || 1,
  skill: question.skill || 'COMPREHENSION',
  difficulty: question.difficulty || 'MEDIUM',
}
```

### 3. القسم لا يظهر في السايد بار
**السبب:** الصلاحيات غير معينة
**الحل:**
```bash
cd backend
npm run seed  # إعادة seed للصلاحيات
```

---

## 📚 مراجع إضافية

- [XLSX Documentation](https://docs.sheetjs.com/)
- [React Hot Toast](https://react-hot-toast.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)

---

## 🎯 الخلاصة

تم تطوير نظام Vision AI متكامل يشمل:
- ✅ التصحيح الذكي للاختبارات
- ✅ رفع الأسئلة من Excel
- ✅ نظام صلاحيات كامل
- ✅ تحسينات منصة المتدربين
- ✅ تصميم احترافي موحد

جميع الميزات جاهزة للاستخدام الفوري! 🚀