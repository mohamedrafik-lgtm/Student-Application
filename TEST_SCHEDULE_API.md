# اختبار API الجدول الدراسي

## 🧪 دليل اختبار شامل لـ API الجدول الدراسي

### 1️⃣ **اختبار الـ Endpoint مباشرة**

#### أ. باستخدام cURL (من Terminal)

```bash
# اختبار فرع المنصورة
curl -X GET "https://mansapi.tiba29.com/api/trainee-auth/my-schedule" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"

# اختبار فرع الزقازيق
curl -X GET "https://zagapi.tiba29.com/api/trainee-auth/my-schedule" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### ب. باستخدام Postman

1. افتح Postman
2. اختر `GET` request
3. أدخل URL: `https://mansapi.tiba29.com/api/trainee-auth/my-schedule`
4. اذهب إلى Headers:
   - Key: `Authorization`
   - Value: `Bearer YOUR_ACCESS_TOKEN_HERE`
   - Key: `Content-Type`
   - Value: `application/json`
5. اضغط Send

#### ج. باستخدام Thunder Client (VS Code Extension)

1. افتح VS Code
2. اضغط على Thunder Client في Sidebar
3. New Request → GET
4. URL: `https://mansapi.tiba29.com/api/trainee-auth/my-schedule`
5. Headers: كما في Postman
6. Send

### 2️⃣ **الاستجابة المتوقعة**

#### استجابة ناجحة مع بيانات:

```json
{
  "success": true,
  "classroom": {
    "id": 1,
    "name": "الفرقة الأولى - مجموعة A"
  },
  "schedule": {
    "SUNDAY": [
      {
        "id": 101,
        "content": {
          "id": 1,
          "code": "MATH101",
          "name": "الرياضيات الأساسية",
          "instructor": {
            "id": 5,
            "name": "د. أحمد محمد"
          }
        },
        "startTime": "08:00",
        "endTime": "10:00",
        "type": "THEORY",
        "location": null,
        "distributionRoom": {
          "id": "room-1",
          "roomName": "قاعة المحاضرات الكبرى",
          "roomNumber": "A-101"
        },
        "isCancelledThisWeek": false,
        "cancellationReason": null
      },
      {
        "id": 102,
        "content": {
          "id": 2,
          "code": "PHY101",
          "name": "الفيزياء العامة",
          "instructor": {
            "id": 8,
            "name": "د. سارة علي"
          }
        },
        "startTime": "10:15",
        "endTime": "12:00",
        "type": "PRACTICAL",
        "location": "معمل الفيزياء",
        "distributionRoom": {
          "id": "room-2",
          "roomName": "معمل الفيزياء",
          "roomNumber": "B-201"
        },
        "isCancelledThisWeek": false,
        "cancellationReason": null
      }
    ],
    "MONDAY": [
      {
        "id": 103,
        "content": {
          "id": 3,
          "code": "ENG101",
          "name": "اللغة الإنجليزية",
          "instructor": {
            "id": 12,
            "name": "أ. محمد حسن"
          }
        },
        "startTime": "09:00",
        "endTime": "10:30",
        "type": "THEORY",
        "location": null,
        "distributionRoom": null,
        "isCancelledThisWeek": true,
        "cancellationReason": "إجازة المدرس"
      }
    ],
    "TUESDAY": [],
    "WEDNESDAY": [],
    "THURSDAY": [],
    "FRIDAY": [],
    "SATURDAY": []
  }
}
```

#### استجابة ناجحة بدون بيانات:

```json
{
  "success": true,
  "classroom": {
    "id": 1,
    "name": "الفرقة الأولى - مجموعة A"
  },
  "schedule": {
    "SUNDAY": [],
    "MONDAY": [],
    "TUESDAY": [],
    "WEDNESDAY": [],
    "THURSDAY": [],
    "FRIDAY": [],
    "SATURDAY": []
  }
}
```

#### استجابة خطأ - Token منتهي:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

#### استجابة خطأ - لا يوجد جدول:

```json
{
  "statusCode": 404,
  "message": "لم يتم العثور على جدول دراسي لهذا الطالب",
  "error": "Not Found"
}
```

### 3️⃣ **فحص البيانات في React Native**

#### أ. استخدم React Native Debugger

1. قم بتثبيت React Native Debugger:
   ```bash
   # Windows
   choco install react-native-debugger
   
   # macOS
   brew install --cask react-native-debugger
   ```

2. شغّل التطبيق:
   ```bash
   npx react-native start
   npx react-native run-android  # أو run-ios
   ```

3. افتح Debug Menu:
   - Android: `Ctrl + M` (Windows) أو `Cmd + M` (Mac)
   - iOS: `Cmd + D`

4. اختر "Debug"

5. افتح React Native Debugger وشاهد الـ Console

#### ب. استخدم Metro Bundler Console

بعد تشغيل `npx react-native start`، ستظهر الـ logs مباشرة في Terminal.

ابحث عن:
```
🔍 Loading my schedule...
🌐 API URL: https://mansapi.tiba29.com/api/trainee-auth/my-schedule
🔑 Access Token: Present
✅ My schedule loaded successfully!
📊 Raw Schedule Data: {...}
📈 Total slots in API response: X
```

### 4️⃣ **حالات الاختبار**

#### ✅ **حالة 1: بيانات صحيحة**

**المتوقع:**
- ✅ الـ API يعود ببيانات صحيحة
- ✅ `totalSlots > 0`
- ✅ التحويل يتم بنجاح
- ✅ البيانات تُعرض في الشاشة

**الكود سيطبع:**
```
📈 Total slots in API response: 15
🔄 Converting SUNDAY slot: 101 الرياضيات الأساسية
🔄 Converting MONDAY slot: 103 اللغة الإنجليزية
...
💾 Setting schedule state with 15 sessions
📊 Total sessions in schedule state: 15
```

#### ⚠️ **حالة 2: بيانات فارغة**

**المتوقع:**
- ✅ الـ API يعود بـ success: true
- ⚠️ جميع الأيام فارغة
- ⚠️ `totalSlots = 0`
- ⚠️ رسالة خطأ: "لا توجد جلسات دراسية مجدولة"

**الكود سيطبع:**
```
📈 Total slots in API response: 0
⚠️ No schedule slots found in API response!
```

#### ❌ **حالة 3: خطأ في الـ API**

**المتوقع:**
- ❌ الـ API يعود بخطأ (401, 404, 500)
- ❌ عرض رسالة خطأ مناسبة

**الكود سيطبع:**
```
❌ Failed to load schedule: Error: ...
```

#### 🔄 **حالة 4: مشكلة في التحويل**

**المتوقع:**
- ✅ البيانات تأتي من الـ API
- ❌ خطأ في `convertScheduleSlot`
- ❌ `convertedTotal = 0`

**الكود سيطبع:**
```
📈 Total slots in API response: 15
🔄 Converting SUNDAY slot: 101 الرياضيات الأساسية
⚠️ No sessions after conversion!
```

### 5️⃣ **فحص محدد للمشكلة**

#### السيناريو: "البيانات تأتي لكن لا تُعرض"

**خطوات الفحص:**

1. **تحقق من الـ API Response:**
   ```
   📊 Raw Schedule Data: {...}
   ```
   - إذا كانت البيانات موجودة → المشكلة في الكود ✅
   - إذا كانت البيانات فارغة → المشكلة في قاعدة البيانات ❌

2. **تحقق من عدد الـ Slots:**
   ```
   📈 Total slots in API response: X
   ```
   - إذا `X > 0` → البيانات موجودة ✅
   - إذا `X = 0` → لا توجد بيانات ❌

3. **تحقق من التحويل:**
   ```
   🔄 Converting SUNDAY slot: 101 الرياضيات الأساسية
   ✅ Converted session: {...}
   ```
   - إذا ظهرت رسائل التحويل → التحويل يعمل ✅
   - إذا لم تظهر → مشكلة في التحويل ❌

4. **تحقق من الـ State:**
   ```
   💾 Setting schedule state with X sessions
   📊 Total sessions in schedule state: X
   ```
   - إذا كان العددان متطابقان → الـ State يعمل ✅
   - إذا كان العدد الثاني = 0 → مشكلة في الـ State ❌

### 6️⃣ **الحلول المحتملة**

| المشكلة | الحل |
|---------|------|
| **لا توجد بيانات في الـ API** | تحقق من قاعدة البيانات والجدول الدراسي |
| **Token منتهي** | سجل دخول مرة أخرى |
| **خطأ في الـ Base URL** | تحقق من اختيار الفرع |
| **البيانات لا تُحول** | تحقق من تنسيق البيانات |
| **الـ State لا يتحدث** | تحقق من `setSchedule` |
| **المكونات لا تعرض** | تحقق من `WeeklyScheduleView` و `DailySchedule` |

### 7️⃣ **نصائح التصحيح**

1. **استخدم console.log بكثرة** في البداية
2. **تتبع البيانات** من الـ API حتى الـ UI
3. **اختبر كل خطوة** على حدة
4. **قارن البيانات** في كل مرحلة
5. **استخدم React Native Debugger** لفحص الـ State

### 8️⃣ **مثال على فحص كامل**

```typescript
// في loadSchedule
console.log('1️⃣ Start loading...');

const scheduleData = await authService.getMySchedule(accessToken);
console.log('2️⃣ API Response:', scheduleData);

const totalSlots = Object.values(scheduleData.schedule).reduce(...);
console.log('3️⃣ Total slots:', totalSlots);

const convertedSchedule = {...};
console.log('4️⃣ Converted schedule:', convertedSchedule);

setSchedule(convertedSchedule);
console.log('5️⃣ State updated');

// بعد setSchedule في useEffect
console.log('6️⃣ Schedule in state:', schedule);
```

---

**تاريخ:** 2025-01-09
**الهدف:** مساعدة المطورين في تصحيح مشكلة عرض الجدول الدراسي

