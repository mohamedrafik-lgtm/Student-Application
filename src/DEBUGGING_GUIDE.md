# دليل استكشاف الأخطاء - منصة المتدربين

## 🔍 مشكلة إرسال البيانات

### ❌ **المشكلة:**
- الزر يظهر حالة تحميل
- لا يظهر خطأ أو قبول
- العملية تعلق بدون نتيجة

### ✅ **الحلول المُطبقة:**

#### 1. **إصلاح Timeout في AuthService:**
```typescript
// قبل الإصلاح (خطأ)
timeout: API_CONFIG.TIMEOUT, // ❌ غير صحيح

// بعد الإصلاح (صحيح)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
signal: controller.signal, // ✅ صحيح
```

#### 2. **إضافة Logging مفصل:**
```typescript
console.log('🚀 Making API request to:', url);
console.log('📤 Request data:', options.body);
console.log('📥 Response status:', response.status);
console.log('📥 Response data:', data);
```

#### 3. **تحسين معالجة الأخطاء:**
- **Network Errors**: خطأ الاتصال
- **Timeout Errors**: انتهاء المهلة
- **JSON Parse Errors**: خطأ في تحليل الاستجابة
- **Server Errors**: أخطاء الخادم

### 🔧 **خطوات التشخيص:**

#### **1. تحقق من Console Logs:**
افتح Developer Console وابحث عن:
```
🚀 Making API request to: http://10.0.2.2:4000/api/trainee-auth/login
📤 Request data: {"nationalId":"12345678901234","password":"password"}
📥 Response status: 200
📥 Response data: {...}
```

#### **2. تحقق من حالة الخادم:**
- تأكد من تشغيل الخادم على Port 4000
- اختبر API مباشرة: `http://10.0.2.2:4000/api/trainee-auth/login`
- تحقق من إعدادات CORS

#### **3. تحقق من البيانات:**
- الرقم القومي: 14 رقم
- كلمة المرور: غير فارغة
- تنسيق JSON صحيح

### 🚨 **أنواع الأخطاء المحتملة:**

#### **Network Error (خطأ الاتصال):**
```
❌ API Error: TypeError: Network request failed
```
**الحل**: تحقق من عنوان الخادم والاتصال

#### **Timeout Error (انتهاء المهلة):**
```
❌ API Error: AbortError: The operation was aborted
```
**الحل**: تحقق من سرعة الخادم أو زد المهلة

#### **JSON Parse Error (خطأ تحليل JSON):**
```
❌ API Error: SyntaxError: Unexpected token
```
**الحل**: تحقق من تنسيق استجابة الخادم

#### **Server Error (خطأ الخادم):**
```
📥 Response status: 500
```
**الحل**: تحقق من إعدادات الخادم

### 🔍 **أدوات التشخيص:**

#### **1. React Native Debugger:**
- افتح React Native Debugger
- اذهب إلى Console tab
- ابحث عن رسائل API

#### **2. Metro Console:**
- شاهد Metro bundler console
- ابحث عن رسائل console.log

#### **3. Network Tab:**
- افتح Developer Tools
- اذهب إلى Network tab
- راقب طلبات API

### 📱 **اختبار API:**

#### **1. اختبار مباشر:**
```bash
curl -X POST http://10.0.2.2:4000/api/trainee-auth/login \
  -H "Content-Type: application/json" \
  -d '{"nationalId":"12345678901234","password":"password"}'
```

#### **2. اختبار Postman:**
- Method: POST
- URL: `http://10.0.2.2:4000/api/trainee-auth/login`
- Headers: `Content-Type: application/json`
- Body: JSON مع البيانات

### ⚙️ **إعدادات إضافية:**

#### **1. Android Emulator:**
- تأكد من `10.0.2.2` للوصول إلى localhost
- تحقق من إعدادات Network

#### **2. iOS Simulator:**
- استخدم `localhost` بدلاً من `10.0.2.2`
- تحقق من إعدادات Simulator

#### **3. جهاز حقيقي:**
- استخدم IP address الفعلي
- تأكد من نفس الشبكة

### 🎯 **النتيجة المتوقعة:**

#### **عند النجاح:**
```
✅ Login successful: {
  access_token: "...",
  trainee: {
    nameAr: "اسم الطالب",
    nationalId: "12345678901234"
  }
}
```

#### **عند الفشل:**
```
❌ Login failed: {
  statusCode: 401,
  message: "الرقم القومي أو كلمة المرور غير صحيحة",
  error: "INVALID_CREDENTIALS"
}
```

### 🚀 **الخلاصة:**

تم إصلاح المشاكل التالية:
- ✅ **Timeout صحيح** مع AbortController
- ✅ **Logging مفصل** للتشخيص
- ✅ **معالجة أخطاء محسنة** لجميع الحالات
- ✅ **رسائل خطأ واضحة** للمستخدم

الآن يجب أن ترى رسائل واضحة في Console تساعدك في تشخيص المشكلة! 🔍



