# دليل اختبار نظام الحجب المالي

## 🔍 نقاط التحقق المهمة

### 1. التأكد من وجود البيانات الصحيحة

```sql
-- التحقق من جدول مواعيد السداد
SELECT 
  fps.id,
  fps.feeId,
  tf.name as feeName,
  fps.paymentEndDate,
  fps.gracePeriodDays,
  fps.finalDeadline,
  fps.nonPaymentActions,
  fps.actionEnabled
FROM fee_payment_schedules fps
JOIN trainee_fees tf ON fps.feeId = tf.id;

-- يجب أن ترى:
-- actionEnabled = 1 (true)
-- nonPaymentActions يحتوي على "DISABLE_PLATFORM"
-- finalDeadline في الماضي (للاختبار)
```

### 2. التحقق من الرسوم المطبقة على متدرب

```sql
-- جلب رسوم متدرب معين
SELECT 
  tp.id,
  tp.traineeId,
  tp.feeId,
  tp.status,
  tp.amount,
  tp.paidAmount,
  tf.name as feeName
FROM trainee_payments tp
JOIN trainee_fees tf ON tp.feeId = tf.id
WHERE tp.traineeId = 123; -- غير الرقم

-- يجب أن ترى:
-- status = 'PENDING' أو 'PARTIALLY_PAID'
-- amount > paidAmount
```

---

## 🧪 خطوات الاختبار

### الاختبار 1: حجب المنصة

#### الخطوة 1: إعداد موعد سداد متأخر
```sql
-- في قاعدة البيانات، قم بتحديث موعد السداد ليكون في الماضي
UPDATE fee_payment_schedules
SET 
  paymentEndDate = DATE_SUB(CURDATE(), INTERVAL 15 DAY),
  gracePeriodDays = 7,
  finalDeadline = DATE_SUB(CURDATE(), INTERVAL 8 DAY),
  nonPaymentActions = JSON_ARRAY('DISABLE_PLATFORM'),
  actionEnabled = 1
WHERE feeId = (
  SELECT id FROM trainee_fees WHERE name = 'رسوم التسجيل' LIMIT 1
);
```

#### الخطوة 2: التحقق من حالة الرسوم
```bash
# API Test
curl -X GET \
  'http://localhost:4000/api/trainee-platform/access-check' \
  -H 'Authorization: Bearer <trainee_token>'

# يجب أن يرجع:
{
  "canAccess": false,
  "blockReason": "PAYMENT_OVERDUE",
  "blockInfo": {
    "overduePayments": [...]
  }
}
```

#### الخطوة 3: تسجيل دخول المتدرب
```
1. افتح: http://localhost:3000/trainee-login
2. سجل دخول بحساب متدرب لديه الرسم المتأخر
3. النتيجة المتوقعة:
   → Layout يفحص الحالة
   → يجد canAccess = false
   → يعيد توجيه فوراً لـ /trainee-dashboard/blocked
   → صفحة حمراء جذابة تظهر
```

---

### الاختبار 2: إشعار الرسوم القادمة

#### الخطوة 1: إعداد موعد سداد قادم
```sql
UPDATE fee_payment_schedules
SET 
  paymentStartDate = CURDATE(),
  paymentEndDate = DATE_ADD(CURDATE(), INTERVAL 10 DAY),
  gracePeriodDays = 7,
  finalDeadline = DATE_ADD(CURDATE(), INTERVAL 17 DAY),
  nonPaymentActions = JSON_ARRAY('DISABLE_PLATFORM'),
  actionEnabled = 1
WHERE feeId = <fee_id>;
```

#### الخطوة 2: تسجيل دخول
```
النتيجة المتوقعة:
→ الصفحة الرئيسية تحمل
→ بعد 1.5 ثانية
→ Modal منبثق أزرق جميل يظهر
→ معلومات الرسوم واضحة
→ "متبقي 17 يوم"
```

---

## 🐛 حل المشاكل

### المشكلة: الحجب لا يعمل

**السبب المحتمل 1**: actionEnabled = false
```sql
-- التحقق
SELECT actionEnabled FROM fee_payment_schedules WHERE feeId = <fee_id>;

-- الحل
UPDATE fee_payment_schedules SET actionEnabled = 1 WHERE feeId = <fee_id>;
```

**السبب المحتمل 2**: nonPaymentActions لا تحتوي على DISABLE_PLATFORM
```sql
-- التحقق
SELECT nonPaymentActions FROM fee_payment_schedules WHERE feeId = <fee_id>;

-- الحل
UPDATE fee_payment_schedules 
SET nonPaymentActions = JSON_ARRAY('DISABLE_PLATFORM')
WHERE feeId = <fee_id>;
```

**السبب المحتمل 3**: التاريخ النهائي في المستقبل
```sql
-- التحقق
SELECT 
  finalDeadline,
  CURDATE() as today,
  DATEDIFF(CURDATE(), finalDeadline) as days_overdue
FROM fee_payment_schedules 
WHERE feeId = <fee_id>;

-- للاختبار، اجعل finalDeadline في الماضي
UPDATE fee_payment_schedules 
SET finalDeadline = DATE_SUB(CURDATE(), INTERVAL 5 DAY)
WHERE feeId = <fee_id>;
```

**السبب المحتمل 4**: الرسوم مدفوعة
```sql
-- التحقق
SELECT status, amount, paidAmount 
FROM trainee_payments 
WHERE traineeId = <trainee_id> AND feeId = <fee_id>;

-- للاختبار، اجعل status = PENDING
UPDATE trainee_payments 
SET status = 'PENDING', paidAmount = 0
WHERE traineeId = <trainee_id> AND feeId = <fee_id>;
```

---

### المشكلة: Modal لا يظهر

**الحل**:
```typescript
// في Console المتصفح (F12)
// تحقق من:
console.log('Payment Status:', paymentStatus);

// يجب أن ترى:
paymentStatus = {
  canAccess: true,
  paymentInfo: {
    upcomingPayments: [{ ... }]
  }
}
```

---

## 📋 Checklist للتشغيل

### قبل الاختبار:

- [ ] Backend يعمل: `npm run start:dev`
- [ ] Frontend يعمل: `npm run dev`
- [ ] قاعدة البيانات متصلة
- [ ] يوجد متدرب بحساب مفعل
- [ ] يوجد رسوم مطبقة على المتدرب
- [ ] جدول سداد محدد للرسوم
- [ ] `actionEnabled = 1`
- [ ] `nonPaymentActions` تحتوي `DISABLE_PLATFORM`
- [ ] `finalDeadline` في الماضي (للحجب) أو المستقبل (للإشعار)

### أثناء الاختبار:

- [ ] افتح Console (F12)
- [ ] ابحث عن logs:
  - `🔍 [PaymentStatus] فحص حالة الدفع`
  - `🔴 [PaymentStatus] رسوم متأخرة`
  - `🚫 [PaymentGuard] المنصة محجوبة`
- [ ] راقب Network tab للـ API calls
- [ ] تحقق من الـ response

---

## 🎯 السيناريو المثالي للاختبار

```sql
-- 1. إنشاء رسوم
INSERT INTO trainee_fees 
(name, amount, type, programId, safeId, academicYear)
VALUES 
('رسوم اختبار الحجب', 10000, 'TUITION', 1, 'safe_id', '2025/2026');

-- 2. تطبيق الرسوم على متدرب
INSERT INTO trainee_payments
(traineeId, feeId, amount, status, safeId, paidAmount)
VALUES
(123, LAST_INSERT_ID(), 10000, 'PENDING', 'safe_id', 0);

-- 3. إنشاء موعد سداد متأخر
INSERT INTO fee_payment_schedules
(id, feeId, paymentEndDate, gracePeriodDays, finalDeadline, nonPaymentActions, actionEnabled, createdBy)
VALUES
(UUID(), LAST_INSERT_ID(), 
 DATE_SUB(CURDATE(), INTERVAL 15 DAY),
 7,
 DATE_SUB(CURDATE(), INTERVAL 8 DAY),
 JSON_ARRAY('DISABLE_PLATFORM'),
 1,
 'user_id');

-- 4. سجل دخول كالمتدرب 123
-- النتيجة: صفحة حجب حمراء جميلة
```

---

## 🔧 تصحيح الأخطاء

### إذا لم يعمل الحجب:

1. **افحص Backend Logs**:
```bash
# يجب أن ترى:
🔍 [PaymentStatus] فحص حالة الدفع للمتدرب 123
📊 [PaymentStatus] وجد 1 رسوم غير مدفوعة
🔴 [PaymentStatus] رسوم "..." متأخرة 8 يوم
🚫 [PaymentStatus] المنصة محجوبة - 1 رسوم متأخرة
```

2. **افحص Frontend Console**:
```javascript
// يجب أن ترى:
🔐 [API] فحص الوصول للمتدرب 123
✅ حالة الدفع: { canAccess: false, blockReason: "PAYMENT_OVERDUE" }
🚫 [PaymentGuard] المنصة محجوبة - إعادة توجيه لصفحة الحجب
```

3. **افحص API Response**:
```bash
# في Network tab
GET /api/trainee-platform/access-check
Response: {
  "canAccess": false,
  "blockReason": "PAYMENT_OVERDUE"
}
```

---

## ✅ التأكد من النجاح

عند النجاح، يجب أن ترى:

1. ✅ Backend logs تظهر الفحص والحجب
2. ✅ Frontend console يظهر إعادة التوجيه
3. ✅ صفحة حمراء كاملة جميلة تظهر
4. ✅ تفاصيل الرسوم المتأخرة واضحة
5. ✅ زر تحديث الحالة يعمل
6. ✅ معلومات التواصل موجودة

---

**جاهز للاختبار!** 🚀