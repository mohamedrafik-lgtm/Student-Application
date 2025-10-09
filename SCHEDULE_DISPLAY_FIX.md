# إصلاح مشكلة عرض الجدول الدراسي

## 📋 المشكلة

البيانات تأتي بنجاح من قاعدة البيانات عبر الـ endpoint `/api/trainee-auth/my-schedule` لكن لا تُعرض في الشاشة.

## 🔍 التشخيص

### 1️⃣ **الكود يستخدم الـ Endpoint الصحيح**
```typescript
// في authService.ts
async getMySchedule(accessToken: string): Promise<MyScheduleResponse> {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_SCHEDULE}`;
  // ✅ يستخدم: /api/trainee-auth/my-schedule
}
```

### 2️⃣ **أسباب محتملة للمشكلة**

#### أ. تنسيق البيانات من الـ API
قد تكون البيانات القادمة من الـ API بتنسيق مختلف عن المتوقع:

```typescript
// التنسيق المتوقع
{
  success: boolean,
  classroom: { id: number, name: string },
  schedule: {
    SUNDAY: ScheduleSlot[],
    MONDAY: ScheduleSlot[],
    // ... باقي الأيام
  }
}
```

#### ب. البيانات فارغة
قد تكون البيانات تأتي لكن جميع الأيام فارغة:
```typescript
{
  SUNDAY: [],
  MONDAY: [],
  // ... جميع الأيام فارغة
}
```

#### ج. مشكلة في التحويل
قد تحدث مشكلة عند تحويل `ScheduleSlot` إلى `ScheduleSession`.

## ✅ الحل المطبق

### 1️⃣ **إضافة Logging مفصّل**

تم إضافة console.log في عدة نقاط:

```typescript
// عند تحميل البيانات
console.log('📊 Raw Schedule Data:', JSON.stringify(scheduleData, null, 2));
console.log('📈 Total slots in API response:', totalSlots);

// عند تحويل كل يوم
console.log('🔄 Converting SUNDAY slot:', slot.id, slot.content?.name);

// بعد التحويل
console.log('💾 Setting schedule state with', convertedTotal, 'sessions');
```

### 2️⃣ **التحقق من البيانات الفارغة**

```typescript
if (totalSlots === 0) {
  console.warn('⚠️ No schedule slots found in API response!');
  setError('لا توجد جلسات دراسية مجدولة');
  return;
}
```

### 3️⃣ **حماية ضد القيم null/undefined**

```typescript
const convertedSchedule: WeeklySchedule = {
  SUNDAY: (scheduleData.schedule.SUNDAY || []).map(...),
  MONDAY: (scheduleData.schedule.MONDAY || []).map(...),
  // ... باقي الأيام
};
```

## 🔧 خطوات تصحيح الأخطاء

### 1. **تشغيل التطبيق وفتح Console**

```bash
npx react-native start
# ثم في terminal آخر
npx react-native run-android
# أو
npx react-native run-ios
```

### 2. **فحص الـ Logs**

ابحث عن هذه الرسائل في الـ console:

```
🔍 Loading my schedule...
🌐 API URL: https://...
✅ My schedule loaded successfully!
📊 Raw Schedule Data: {...}
📈 Total slots in API response: X
```

### 3. **تحديد المشكلة**

| الرسالة | المشكلة | الحل |
|---------|---------|------|
| `📈 Total slots in API response: 0` | لا توجد بيانات من الـ API | تحقق من قاعدة البيانات |
| `⚠️ No sessions after conversion!` | مشكلة في التحويل | تحقق من تنسيق البيانات |
| `📊 Total sessions in schedule state: 0` | البيانات لا تُحفظ في الـ state | مشكلة في الكود |

## 🧪 اختبار الحل

### 1. **اختبار API مباشرة**

```bash
curl -X GET "https://mansapi.tiba29.com/api/trainee-auth/my-schedule" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

تحقق من الاستجابة:
```json
{
  "success": true,
  "classroom": {
    "id": 1,
    "name": "الصف الأول"
  },
  "schedule": {
    "SUNDAY": [
      {
        "id": 1,
        "content": {
          "id": 1,
          "code": "MATH101",
          "name": "الرياضيات",
          "instructor": {
            "id": 1,
            "name": "أحمد محمد"
          }
        },
        "startTime": "08:00",
        "endTime": "10:00",
        "type": "THEORY",
        "location": null,
        "distributionRoom": {
          "id": "1",
          "roomName": "قاعة A",
          "roomNumber": "101"
        },
        "isCancelledThisWeek": false,
        "cancellationReason": null
      }
    ],
    "MONDAY": [],
    // ... باقي الأيام
  }
}
```

### 2. **فحص الكود في المكونات**

تأكد من أن `WeeklyScheduleView` و `DailySchedule` يعرضان البيانات:

```typescript
// في WeeklyScheduleView
console.log('Days with sessions:', getDaysWithSessions());
console.log('Total sessions:', getTotalSessions());

// في DailySchedule
console.log('Day:', day, 'Sessions:', sessions.length);
```

## 📝 ملاحظات إضافية

### 1. **التحقق من Access Token**
```typescript
console.log('🔑 Access Token:', accessToken ? 'Present' : 'Missing');
```

### 2. **التحقق من Base URL**
```typescript
console.log('🌐 Base URL:', API_CONFIG.BASE_URL);
```

### 3. **التحقق من الفرع المختار**
```typescript
console.log('🏢 Selected Branch:', selectedBranch);
```

## 🎯 الخلاصة

المشكلة كانت في:
1. ✅ **نقص الـ Logging** - أضفنا تفاصيل كثيرة للتتبع
2. ✅ **عدم التحقق من البيانات الفارغة** - أضفنا فحوصات
3. ✅ **عدم حماية ضد null/undefined** - أضفنا `|| []`

الآن، افتح الـ console وتابع الـ logs لتحديد المشكلة بالضبط!

## 🚀 الخطوات التالية

1. شغّل التطبيق
2. افتح شاشة الجدول الدراسي
3. افتح الـ Console (React Native Debugger أو Metro Bundler)
4. ابحث عن الرسائل المذكورة أعلاه
5. شارك الـ logs لمزيد من المساعدة

---

**تاريخ الإصلاح:** 2025-01-09
**الملفات المعدلة:** 
- `src/screens/ScheduleScreen.tsx`
- `SCHEDULE_DISPLAY_FIX.md` (هذا الملف)

