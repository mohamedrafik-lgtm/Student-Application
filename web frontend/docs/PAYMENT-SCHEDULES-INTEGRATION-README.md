# دليل سريع: ربط منصة المتدربين بمواعيد السداد

## 🚀 البدء السريع

### الملفات الأساسية المنشأة:

#### Backend (3 ملفات):
✅ [`backend/src/trainee-platform/trainee-payment-status.service.ts`](backend/src/trainee-platform/trainee-payment-status.service.ts:1)
✅ [`backend/src/trainee-platform/trainee-platform.controller.ts`](backend/src/trainee-platform/trainee-platform.controller.ts:1)
✅ [`backend/src/trainee-platform/trainee-platform.module.ts`](backend/src/trainee-platform/trainee-platform.module.ts:1)

#### Frontend (6 ملفات):
✅ [`src/types/payment-status.ts`](src/types/payment-status.ts:1)
✅ [`src/hooks/useTraineePaymentStatus.ts`](src/hooks/useTraineePaymentStatus.ts:1)
✅ [`src/app/trainee-dashboard/blocked/page.tsx`](src/app/trainee-dashboard/blocked/page.tsx:1)
✅ [`src/app/trainee-dashboard/components/PaymentNotificationBanner.tsx`](src/app/trainee-dashboard/components/PaymentNotificationBanner.tsx:1)
✅ [`src/app/trainee-dashboard/layout.tsx`](src/app/trainee-dashboard/layout.tsx:1)
✅ [`src/app/trainee-dashboard/page.tsx`](src/app/trainee-dashboard/page.tsx:1)

---

## ⚙️ كيفية التفعيل

### 1. تشغيل Backend:
```bash
cd backend
npm install
npm run start:dev
```

### 2. تشغيل Frontend:
```bash
npm install
npm run dev
```

---

## 📝 كيفية الاستخدام

### الخطوة 1: تحديد موعد سداد لرسوم

1. افتح: `http://localhost:3000/dashboard/finances/payment-schedules`
2. اختر البرنامج التدريبي
3. اضغط "إضافة موعد سداد" لرسم معين
4. املأ البيانات:
   ```
   موعد البداية: 2025-12-01
   موعد النهاية: 2025-12-31
   فترة السماح: 7 أيام
   الإجراءات: ✓ إيقاف المنصة الإلكترونية
   تفعيل الإجراءات: ✓ نعم
   ```
5. احفظ

**النتيجة**: الموعد النهائي = 2026-01-07 (محسوب تلقائياً)

### الخطوة 2: إنشاء استثناء لمتدرب (اختياري)

1. افتح: `http://localhost:3000/dashboard/trainees`
2. ابحث عن المتدرب
3. إجراءات → "تأجيل موعد السداد"
4. املأ:
   ```
   الرسم: اختر الرسم أو "جميع الرسوم"
   موعد نهاية جديد: 2026-02-28
   أيام سماح: 10
   السبب: "ظروف صحية طارئة"
   ```
5. احفظ

**النتيجة**: المتدرب لديه موعد مخصص = 2026-03-10

### الخطوة 3: اختبار من منصة المتدرب

1. سجل دخول كمتدرب: `http://localhost:3000/trainee-login`
2. استخدم:
   ```
   الرقم القومي: <national_id>
   كلمة المرور: <password>
   ```

**السيناريوهات**:

#### أ. ضمن فترة السداد:
→ banner أزرق: "لديك رسوم مستحقة - متبقي X يوم"

#### ب. تجاوز الموعد + إيقاف مفعل:
→ إعادة توجيه فورية لـ `/trainee-dashboard/blocked`
→ رسالة حمراء واضحة

#### ج. لديه استثناء:
→ يستخدم الموعد المخصص
→ المنصة تعمل

---

## 🔍 API Endpoints للاختبار

```bash
# فحص حالة متدرب
curl -X GET \
  'http://localhost:4000/api/trainee-platform/access-check' \
  -H 'Authorization: Bearer <trainee_token>'

# النتيجة:
{
  "canAccess": false,
  "blockReason": "PAYMENT_OVERDUE",
  "blockInfo": {
    "overduePayments": [
      {
        "feeName": "رسوم التسجيل",
        "remainingAmount": 15000,
        "daysOverdue": 5
      }
    ],
    "blockedFeatures": ["DISABLE_PLATFORM"]
  }
}
```

---

## 🐛 التشخيص والأخطاء

### المشكلة: المنصة لا تحجب رغم تجاوز الموعد

**الحل**:
1. تأكد من `actionEnabled = true` في [`FeePaymentSchedule`](backend/prisma/schema.prisma:1122)
2. تأكد من وجود `DISABLE_PLATFORM` في `nonPaymentActions`
3. تحقق من التواريخ في قاعدة البيانات
4. راجع console logs في Backend

### المشكلة: الإشعارات لا تظهر

**الحل**:
1. افتح Developer Tools → Console
2. ابحث عن `🔍 [API] فحص الوصول`
3. تحقق من الـ response
4. تأكد من `paymentStartDate` و `paymentEndDate` محددة

### المشكلة: الاستثناء لا يعمل

**الحل**:
1. تحقق من `traineeId` صحيح
2. تحقق من `customFinalDeadline` محسوب صحيح
3. راجع logs: `🔍 [PaymentStatus] وجد X استثناء`

---

## 📊 قاعدة البيانات

### الجداول المستخدمة:
- `trainee_payments` - الرسوم المطبقة
- `fee_payment_schedules` - جداول المواعيد
- `trainee_payment_exceptions` - الاستثناءات
- `trainee_auth` - حسابات المتدربين

### العلاقات:
```
TraineeFee (1) ←→ (1) FeePaymentSchedule
TraineeFee (1) ←→ (N) TraineePayment
TraineePayment (N) ←→ (1) Trainee
TraineePaymentException (N) ←→ (1) Trainee
TraineePaymentException (N) ←→ (0-1) TraineeFee
```

---

## 🎯 التوثيق الكامل

للمزيد من التفاصيل، راجع:
- [`docs/نظام-ربط-المنصة-بمواعيد-السداد.md`](docs/نظام-ربط-المنصة-بمواعيد-السداد.md:1) - توثيق شامل
- [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma:1) - بنية قاعدة البيانات
- [`src/app/dashboard/finances/payment-schedules/page.tsx`](src/app/dashboard/finances/payment-schedules/page.tsx:1) - صفحة إدارة المواعيد

---

تم التطوير بواسطة: **Kilo Code AI** 🤖
التاريخ: نوفمبر 2025