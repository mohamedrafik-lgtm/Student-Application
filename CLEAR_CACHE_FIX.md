# 🔧 حل مشكلة الكود القديم - مسح الـ Cache

## ⚠️ المشكلة

التطبيق يستخدم كود قديم من الـ cache بدلاً من الكود الجديد المُحدّث!

**الأعراض:**
- ✅ الكود في الملفات صحيح ومُحدّث
- ❌ التطبيق يستخدم endpoint قديم: `/api/schedule/classroom/1/weekly`
- ❌ بدلاً من الـ endpoint الصحيح: `/api/trainee-auth/my-schedule`

## ✅ الحل الكامل - مسح الـ Cache

### 🪟 **على Windows:**

#### **الطريقة 1: مسح Cache يدوياً (موصى بها)**

```powershell
# 1️⃣ إيقاف Metro Bundler إذا كان يعمل
# اضغط Ctrl+C في نافذة Terminal التي تشغل Metro

# 2️⃣ مسح cache React Native
npx react-native start --reset-cache

# 3️⃣ في terminal آخر، مسح build Android
cd android
.\gradlew clean
cd ..

# 4️⃣ مسح node_modules/.cache
Remove-Item -Recurse -Force node_modules\.cache

# 5️⃣ مسح Metro cache
Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\metro-*
Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\react-*

# 6️⃣ إعادة بناء التطبيق
npx react-native run-android
```

#### **الطريقة 2: مسح شامل (إذا لم تنجح الطريقة 1)**

```powershell
# 1️⃣ إيقاف جميع عمليات React Native
# اضغط Ctrl+C في جميع نوافذ Terminal

# 2️⃣ مسح كل شيء
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force android\app\build
Remove-Item -Recurse -Force android\build
Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\metro-*
Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\react-*

# 3️⃣ إعادة تثبيت Dependencies
npm install

# 4️⃣ تشغيل التطبيق من جديد
npx react-native start --reset-cache

# 5️⃣ في terminal آخر
npx react-native run-android
```

### 🍎 **على macOS/Linux:**

#### **الطريقة 1: مسح Cache يدوياً**

```bash
# 1️⃣ إيقاف Metro Bundler
# اضغط Ctrl+C في Terminal الذي يشغل Metro

# 2️⃣ مسح cache React Native
npx react-native start --reset-cache

# 3️⃣ في terminal آخر، مسح build
cd android && ./gradlew clean && cd ..

# 4️⃣ مسح Metro cache
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf node_modules/.cache

# 5️⃣ إعادة بناء التطبيق
npx react-native run-android
# أو للـ iOS
npx react-native run-ios
```

#### **الطريقة 2: مسح شامل**

```bash
# 1️⃣ مسح كل شيء
rm -rf node_modules
rm -rf android/app/build
rm -rf android/build
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# 2️⃣ للـ iOS فقط
rm -rf ios/Pods
rm -rf ios/build

# 3️⃣ إعادة تثبيت
npm install

# 4️⃣ للـ iOS فقط - تثبيت Pods
cd ios && pod install && cd ..

# 5️⃣ تشغيل التطبيق
npx react-native start --reset-cache

# 6️⃣ في terminal آخر
npx react-native run-android
# أو
npx react-native run-ios
```

---

## 📋 **خطوات مختصرة - سريعة**

### للمطورين المتعجلين:

```bash
# مسح سريع وإعادة تشغيل
npx react-native start --reset-cache
# ثم في terminal آخر
npx react-native run-android
```

---

## 🔍 **كيف تتحقق من نجاح الحل؟**

بعد مسح الـ cache، شغّل التطبيق وافتح الـ Console:

### ✅ **يجب أن ترى:**

```
🔍 My Schedule API Request: {
  url: "https://mansapi.tiba29.com/api/trainee-auth/my-schedule",
  ...
}
🚀 About to call AuthService.makeRequest with URL: https://mansapi.tiba29.com/api/trainee-auth/my-schedule
```

### ❌ **يجب ألا ترى:**

```
Making API request to: https://mansapi.tiba29.com/api/schedule/classroom/1/weekly
```

---

## 🎯 **لماذا حدثت المشكلة؟**

React Native يستخدم عدة أنواع من الـ cache:

1. **Metro Bundler Cache** - يخزن JavaScript bundles
2. **Android Build Cache** - يخزن build artifacts
3. **Node Modules Cache** - يخزن compiled modules
4. **Temporary Files** - ملفات مؤقتة في system

عند تحديث الكود، قد لا يتم تحديث جميع هذه الـ caches تلقائياً!

---

## 💡 **نصائح لتجنب المشكلة مستقبلاً**

### 1️⃣ **استخدم always `--reset-cache`:**

```bash
npx react-native start --reset-cache
```

### 2️⃣ **امسح الـ cache بعد كل تحديث مهم:**

```bash
# بعد تحديث dependencies
npm install
npx react-native start --reset-cache

# بعد تعديل native code
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### 3️⃣ **استخدم Watchman (للـ macOS/Linux):**

```bash
# تثبيت Watchman
brew install watchman

# مسح cache Watchman
watchman watch-del-all
```

### 4️⃣ **أضف script في package.json:**

```json
{
  "scripts": {
    "clean": "rm -rf node_modules && rm -rf android/build && rm -rf android/app/build",
    "fresh-start": "npm run clean && npm install && npx react-native start --reset-cache",
    "android-clean": "cd android && ./gradlew clean && cd .."
  }
}
```

ثم استخدم:
```bash
npm run fresh-start
```

---

## 🚨 **إذا استمرت المشكلة**

إذا لم ينجح مسح الـ cache، جرب:

### **1. تأكد من إيقاف جميع العمليات:**

```bash
# Windows - في PowerShell كـ Admin
Get-Process -Name "node" | Stop-Process -Force
Get-Process -Name "java" | Stop-Process -Force

# macOS/Linux
killall node
killall java
```

### **2. احذف التطبيق من الجهاز/المحاكي:**

- افتح Settings → Apps → StudentApp → Uninstall
- ثم أعد تثبيته بـ `npx react-native run-android`

### **3. أعد تشغيل المحاكي:**

- أغلق المحاكي تماماً
- أعد تشغيله
- ثم run التطبيق

### **4. تحقق من الكود:**

```bash
# تأكد من أنك في الفرع الصحيح
git status
git branch

# تأكد من آخر commit
git log -1

# تأكد من عدم وجود تعديلات غير محفوظة
git diff
```

---

## ✅ **الخلاصة**

**المشكلة:** الكود القديم في الـ cache

**الحل:** مسح الـ cache وإعادة build

**الأمر السريع:**
```bash
npx react-native start --reset-cache
# ثم
npx react-native run-android
```

---

**تاريخ التوثيق:** 2025-01-09  
**الهدف:** حل مشكلة استخدام endpoint قديم بسبب الـ cache

