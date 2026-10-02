# قائمة تشخيص مشكلة عدم ظهور الحجب

## المعلومات من المستخدم:

**المتدرب**: أحمد ثروت أبو العز إبراهيم محمود عمارة

**الرسوم**:
- ✅ فتح ملف تقديم - **مدفوع**
- ✅ مقدم - **مدفوع**
- ❌ القسط الأول - **غير مدفوع** (لا موعد سداد)
- ❌ القسط الثاني - **غير مدفوع** (لا موعد سداد)
- ❌ **القسط الثالث** - **غير مدفوع** ⭐ له موعد سداد
  - بداية: 1/11/2025
  - نهاية: 7/11/2025
  - الإجراءات: **مفعلة** ✓
  - تحتوي: DISABLE_PLATFORM ✓
- ❌ القسط الرابع - **غير مدفوع** (لا موعد سداد)

**اليوم**: 11/11/2025

**المتوقع**: يجب أن يُحجب (تجاوز 7/11 بـ 4 أيام)
**الفعلي**: لا يظهر حجب ❌

---

## خطوات التشخيص

### 1. التحقق من قاعدة البيانات

```sql
-- 1.1 التحقق من بيانات المتدرب
SELECT id, nameAr, nationalId 
FROM trainees 
WHERE nameAr LIKE '%احمد%ثروت%';

-- نفترض id = 123

-- 1.2 التحقق من الرسوم المطبقة
SELECT 
  tp.id,
  tp.traineeId,
  tp.feeId,
  tf.name as feeName,
  tp.status,
  tp.amount,
  tp.paidAmount,
  (tp.amount - tp.paidAmount) as remaining
FROM trainee_payments tp
JOIN trainee_fees tf ON tp.feeId = tf.id
WHERE tp.traineeId = 123
ORDER BY tp.createdAt;

-- يجب أن ترى "القسط الثالث" بـ status = 'PENDING' أو 'PARTIALLY_PAID'

-- 1.3 التحقق من جدول السداد للقسط الثالث
SELECT 
  fps.id,
  fps.feeId,
  tf.name,
  fps.paymentStartDate,
  fps.paymentEndDate,
  fps.gracePeriodDays,
  fps.finalDeadline,
  fps.nonPaymentActions,
  fps.actionEnabled,
  CURDATE() as today,
  DATEDIFF(CURDATE(), fps.finalDeadline) as days_overdue
FROM fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id
WHERE tf.name LIKE '%القسط الثالث%';

-- يجب أن ترى:
-- paymentEndDate = 2025-11-07
-- finalDeadline = 2025-11-07 (أو مع grace period)
-- actionEnabled = 1
-- nonPaymentActions يحتوي "DISABLE_PLATFORM"
-- days_overdue = 4 (موجب = متأخر)
```

### 2. اختبار API مباشرة

```bash
# الحصول على token المتدرب أولاً
# سجل دخول من المتصفح ثم:
# افتح Console (F12) → Application → Local Storage
# انسخ قيمة "trainee_token"

# اختبر API
curl -X GET \
  'http://localhost:4000/api/trainee-platform/access-check' \
  -H 'Authorization: Bearer <trainee_token_here>'

# النتيجة المتوقعة:
{
  "canAccess": false,
  "blockReason": "PAYMENT_OVERDUE",
  "blockInfo": {
    "overduePayments": [
      {
        "feeId": X,
        "feeName": "القسط الثالث مساعد خدمات صحية",
        "remainingAmount": 1000,
        "daysOverdue": 4
      }
    ],
    "blockedFeatures": ["DISABLE_PLATFORM", "DISABLE_ALL", ...]
  }
}

# إذا كانت النتيجة:
{
  "canAccess": true
}
# → المشكلة في Backend Service
```

### 3. التحقق من Backend Logs

```bash
# عند تسجيل دخول المتدرب، يجب أن ترى في backend console:

🔐 [API] فحص الوصول للمتدرب 123
🔍 [PaymentStatus] فحص حالة الدفع للمتدرب 123
📊 [PaymentStatus] وجد 4 رسوم غير مدفوعة  # (4 أقساط)
⏭️  [PaymentStatus] رسوم "القسط الأول" ليس لها جدول سداد
⏭️  [PaymentStatus] رسوم "القسط الثاني" ليس لها جدول سداد
🔴 [PaymentStatus] رسوم "القسط الثالث" متأخرة 4 يوم
🚫 [PaymentStatus] المنصة محجوبة - 1 رسوم متأخرة

# إذا لم ترى هذه الرسائل → المشكلة في Service
```

---

## الأسباب المحتملة وحلولها

### السبب 1: Backend لم يعد التشغيل بعد التحديثات ⭐

**الحل**:
```bash
cd backend
# أوقف Backend (Ctrl+C)
npm run start:dev  # أعد التشغيل
```

### السبب 2: gracePeriodDays لم يتم حسابها

**التحقق**:
```sql
SELECT 
  paymentEndDate,
  gracePeriodDays,
  finalDeadline,
  DATE_ADD(paymentEndDate, INTERVAL gracePeriodDays DAY) as calculated_deadline
FROM fee_payment_schedules
WHERE feeId = (SELECT id FROM trainee_fees WHERE name LIKE '%القسط الثالث%');

-- finalDeadline يجب أن = paymentEndDate + gracePeriodDays
-- في حالتك: 7/11/2025 + 0 أيام = 7/11/2025
```

**الحل**: إذا كان `gracePeriodDays = NULL` أو غير محسوب:
```sql
UPDATE fee_payment_schedules 
SET 
  gracePeriodDays = 0,
  finalDeadline = paymentEndDate
WHERE feeId = <fee_id>;
```

### السبب 3: nonPaymentActions بصيغة خاطئة

**التحقق**:
```sql
SELECT nonPaymentActions FROM fee_payment_schedules WHERE feeId = <fee_id>;

-- يجب أن يكون JSON array:
-- ["DISABLE_PLATFORM", "DISABLE_ATTENDANCE", ...]
```

**الحل**:
```sql
UPDATE fee_payment_schedules 
SET nonPaymentActions = '["DISABLE_PLATFORM", "DISABLE_ATTENDANCE", "DISABLE_QUIZZES", "DISABLE_ALL"]'
WHERE feeId = <fee_id>;
```

### السبب 4: TraineePaymentStatusService لم يُحقن

**التحقق**: افتح Backend console عند التشغيل، يجب أن ترى:
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] TraineePlatformModule dependencies initialized
[Nest] 12345  - LOG [InstanceLoader] TraineePaymentStatusService initialized
```

**الحل**: تأكد من أن [`trainee-platform.module.ts`](backend/src/trainee-platform/trainee-platform.module.ts:1) يحتوي:
```typescript
providers: [TraineePlatformService, TraineePaymentStatusService]
```

---

## 🔧 الإصلاح الشامل

قم بتنفيذ هذا SQL لإصلاح البيانات:

```sql
-- 1. التأكد من وجود finalDeadline صحيح
UPDATE fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id
SET 
  fps.finalDeadline = DATE_ADD(
    fps.paymentEndDate, 
    INTERVAL COALESCE(fps.gracePeriodDays, 0) DAY
  )
WHERE tf.name LIKE '%القسط الثالث%';

-- 2. التأكد من تفعيل الإجراءات
UPDATE fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id
SET fps.actionEnabled = 1
WHERE tf.name LIKE '%القسط الثالث%';

-- 3. التأكد من صيغة nonPaymentActions
UPDATE fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id
SET fps.nonPaymentActions = JSON_ARRAY(
  'DISABLE_PLATFORM',
  'DISABLE_ATTENDANCE', 
  'DISABLE_QUIZZES',
  'DISABLE_ALL'
)
WHERE tf.name LIKE '%القسط الثالث%';

-- 4. التحقق النهائي
SELECT 
  tf.name,
  fps.paymentEndDate,
  fps.gracePeriodDays,
  fps.finalDeadline,
  fps.actionEnabled,
  fps.nonPaymentActions,
  CURDATE() as today,
  DATEDIFF(CURDATE(), fps.finalDeadline) as overdue_days
FROM fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id
WHERE tf.name LIKE '%القسط الثالث%';

-- يجب أن ترى:
-- overdue_days = 4 (موجب)
-- actionEnabled = 1
-- nonPaymentActions = ["DISABLE_PLATFORM",...]
```

---

## 🧪 اختبار سريع

### في Backend Console:
```bash
# شغل Backend في وضع debug
cd backend
npm run start:dev

# راقب الرسائل عند تسجيل دخول المتدرب
```

### في Frontend:
```bash
# افتح http://localhost:3000/trainee-login
# سجل دخول بحساب "أحمد ثروت"

# افتح Console (F12)
# يجب أن ترى:
🔐 [API] فحص الوصول للمتدرب X
✅ حالة الدفع: {...}

# إذا رأيت:
canAccess: true
# → المشكلة في Backend

# إذا رأيت:
canAccess: false
# → يجب أن تُعاد توجيهه لـ /blocked
# إذا لم يحدث → المشكلة في Frontend
```

---

## ✅ الحل السريع

قم بالتالي بالترتيب:

1. **أوقف Backend** (Ctrl+C)

2. **شغل Backend من جديد**:
```bash
cd backend
npm run start:dev
```

3. **في قاعدة البيانات**:
```sql
-- تأكد من البيانات الصحيحة للقسط الثالث
UPDATE fee_payment_schedules fps
SET 
  fps.finalDeadline = '2025-11-07',  -- تاريخ صريح
  fps.actionEnabled = 1,
  fps.nonPaymentActions = JSON_ARRAY('DISABLE_PLATFORM')
WHERE fps.feeId = (
  SELECT id FROM trainee_fees 
  WHERE name = 'القسط الثالث مساعد خدمات صحية' 
  LIMIT 1
);
```

4. **امسح Cache المتصفح**:
- افتح DevTools (F12)
- Application → Storage → Clear storage
- أو Incognito window

5. **سجل دخول من جديد**

6. **راقب Logs**:
- Backend console
- Frontend console (F12)

---

إذا استمرت المشكلة، أرسل لي:
1. Screenshot من Backend console
2. Screenshot من Frontend console
3. نتيجة الـ SQL queries أعلاه