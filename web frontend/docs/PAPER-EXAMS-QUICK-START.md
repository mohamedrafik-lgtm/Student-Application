# 🚀 نظام الاختبارات الورقية - دليل التشغيل السريع

## ✅ الخطوات المطلوبة

### 1. تطبيق قاعدة البيانات
```bash
cd backend

# توليد Prisma Client
npx prisma generate

# تطبيق Schema على قاعدة البيانات
npx prisma db push

# أو استخدام Migrations (للإنتاج)
npx prisma migrate dev --name add-paper-exams-system
```

### 2. إضافة الصلاحيات
أضف الصلاحيات التالية في [`backend/src/permissions/seeds/permission-seeder.ts`](backend/src/permissions/seeds/permission-seeder.ts:1):

```typescript
import { paperExamsPermissions } from './paper-exams-permissions';

// في مصفوفة الصلاحيات، أضف:
...paperExamsPermissions,
```

ثم شغل:
```bash
npm run prisma:seed
```

### 3. إعادة تشغيل Backend
```bash
npm run start:dev
```

### 4. تشغيل Frontend
```bash
# في المجلد الرئيسي
npm run dev
```

---

## 📍 الوصول للنظام

بعد التشغيل، يمكن الوصول للنظام من:

**لوحة التحكم → إدارة الاختبارات → الاختبارات الورقية**

أو مباشرة:
```
http://localhost:3000/dashboard/paper-exams
```

---

## 📝 سيناريو الاستخدام الأول

### 1. إنشاء اختبار ورقي
```
/dashboard/paper-exams → [إنشاء اختبار ورقي جديد]

املأ البيانات:
- المادة التدريبية: اختر من القائمة
- عنوان الاختبار: "اختبار نهاية الفصل الأول"
- تاريخ الاختبار: 2025-02-15
- نوع الدرجة: التحريري (WRITTEN)
- إجمالي الدرجات: 20 (سيتم التحقق تلقائياً)
- درجة النجاح: 50%

[حفظ]
```

### 2. إنشاء نموذج أسئلة
```
/dashboard/paper-exams/{id}

[إضافة نموذج جديد]

- رمز النموذج: A
- اسم النموذج: نموذج أ
- اختر الأسئلة من القائمة (من بنك الأسئلة)
- تأكد أن مجموع الدرجات = 20

[إنشاء النموذج]
```

### 3. توليد أوراق الإجابة
```
في نفس الصفحة:

[توليد أوراق الإجابة]

✅ سيتم إنشاء ورقة لكل متدرب في البرنامج
✅ كل ورقة لها QR Code فريد
✅ كل ورقة لها كود فريد
```

### 4. طباعة الأوراق
```
[طباعة نموذج الأسئلة] → يفتح نافذة جديدة → Ctrl+P

[طباعة أوراق الإجابة] → يفتح نافذة جديدة → Ctrl+P
```

### 5. التصحيح بالكاميرا
```
/dashboard/paper-exams/{id}/scan

[اختر: 📷 كاميرا QR]

1. وجّه الكاميرا على QR Code في ورقة الإجابة
2. ✅ سيتم التعرف على المتدرب تلقائياً
3. حدد الإجابات المختارة (يدوياً حالياً)
4. [تصحيح الورقة]
5. ✅ سيتم:
   - حساب الدرجة
   - حفظ النتيجة
   - تحديث درجات المتدرب تلقائياً
   - عرض النتيجة
```

### 6. عرض التقرير
```
/dashboard/paper-exams/{id}/report

يعرض:
- إحصائيات عامة
- نتائج جميع المتدربين (مرتبة)
- من لم يؤدِ الاختبار
- متوسط الدرجات

[طباعة التقرير]
```

---

## 🎯 الملفات المُنشأة (19 ملف)

### Backend (9 ملفات)
```
backend/
├── prisma/schema.prisma (تم التعديل - 6 models جديدة)
└── src/paper-exams/
    ├── dto/
    │   ├── create-paper-exam.dto.ts
    │   ├── update-paper-exam.dto.ts
    │   ├── create-exam-model.dto.ts
    │   └── submit-answer-sheet.dto.ts
    ├── paper-exams.service.ts (505 سطر)
    ├── paper-exams.controller.ts
    └── paper-exams.module.ts
```

### Frontend (9 ملفات)
```
src/
├── lib/
│   └── paper-exams-api.ts
├── app/dashboard/paper-exams/
│   ├── page.tsx (القائمة)
│   ├── new/page.tsx (إنشاء جديد)
│   └── [id]/
│       ├── page.tsx (التفاصيل)
│       ├── scan/page.tsx (التصحيح)
│       ├── report/page.tsx (التقرير)
│       └── models/[modelId]/
│           └── answer-sheets/page.tsx (طباعة جماعية)
└── app/print/
    ├── paper-exam-model/[modelId]/page.tsx (طباعة الأسئلة)
    └── paper-answer-sheet/[sheetId]/page.tsx (طباعة ورقة إجابة)
```

### Documentation (1 ملف)
```
docs/
├── PAPER-EXAMS-SYSTEM-COMPLETE.md (دليل شامل)
└── PAPER-EXAMS-QUICK-START.md (هذا الملف)
```

---

## ⚠️ ملاحظات هامة

### 1. التحديث التلقائي للدرجات
عند تصحيح ورقة إجابة، يتم تحديث الدرجة المناسبة **تلقائياً** في [`TraineeGrades`](backend/prisma/schema.prisma:428) حسب `gradeType`:

- `YEAR_WORK` → `yearWorkMarks`
- `PRACTICAL` → `practicalMarks`
- `WRITTEN` → `writtenMarks`
- `FINAL_EXAM` → `finalExamMarks`

### 2. منع التعديل
لا يمكن تعديل أو حذف اختبار إذا كانت هناك أوراق إجابة تم تصحيحها.

### 3. التصحيح اليدوي
حالياً، التصحيح **يدوي** (تحديد الإجابات المختارة يدوياً).

**للمستقبل:** يمكن تطوير OCR تلقائي باستخدام:
- TensorFlow.js
- OpenCV.js
- Custom ML Model

### 4. نظام الدوائر
- قطر الدائرة: 20-24 بكسل
- حدود: 2px solid black
- المسافة بين الدوائر: 12px

---

## 🔥 مميزات النظام

✅ **تكامل كامل** مع بنك الأسئلة الموجود
✅ **تكامل تلقائي** مع نظام الدرجات
✅ **نماذج متعددة** لمنع الغش
✅ **QR Code ذكي** للتعريف السريع
✅ **تصحيح بالكاميرا** (مثل نظام الحضور)
✅ **طباعة احترافية** (أسئلة + إجابات)
✅ **تقارير شاملة** مع إحصائيات
✅ **حماية من التكرار** وال duplicate grading
✅ **Audit trail** كامل
✅ **Responsive** على جميع الشاشات

---

## 📞 الدعم الفني

إذا واجهت أي مشاكل:

1. تأكد من تطبيق Schema: `npx prisma db push`
2. تأكد من إعادة تشغيل Backend
3. تأكد من seed الصلاحيات
4. راجع Console للأخطاء

---

## 🎉 ملخص

تم إنشاء **نظام اختبارات ورقية متكامل** يتضمن:
- 📊 قاعدة بيانات محكمة
- 🔧 Backend APIs شاملة
- 💻 Frontend كامل
- 📷 تصحيح بالكاميرا
- 📄 طباعة احترافية
- 🔗 تكامل تلقائي

**النظام جاهز للاستخدام الآن!** 🚀

تاريخ: 23 نوفمبر 2025