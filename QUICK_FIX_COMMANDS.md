# ⚡ إصلاح سريع - الأوامر المباشرة

## 🎯 المشكلة
التطبيق يستخدم كود قديم - يحتاج لمسح الـ cache

## ✅ الحل السريع (3 خطوات)

### 🪟 Windows (PowerShell):

```powershell
# خطوة 1: أغلق Metro Bundler (Ctrl+C)

# خطوة 2: نفذ هذه الأوامر
npx react-native start --reset-cache

# خطوة 3: في terminal جديد
npx react-native run-android
```

### 🍎 macOS/Linux:

```bash
# خطوة 1: أغلق Metro Bundler (Ctrl+C)

# خطوة 2: نفذ هذه الأوامر
npx react-native start --reset-cache

# خطوة 3: في terminal جديد
npx react-native run-android
```

---

## 🔥 إذا لم ينجح - مسح شامل

### Windows:

```powershell
# 1. مسح كل شيء
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force android\app\build
Remove-Item -Recurse -Force android\build

# 2. إعادة تثبيت
npm install

# 3. تشغيل مع reset cache
npx react-native start --reset-cache

# 4. في terminal جديد
npx react-native run-android
```

### macOS/Linux:

```bash
# 1. مسح كل شيء
rm -rf node_modules
rm -rf android/app/build
rm -rf android/build

# 2. إعادة تثبيت
npm install

# 3. تشغيل مع reset cache
npx react-native start --reset-cache

# 4. في terminal جديد
npx react-native run-android
```

---

## ✅ كيف تعرف أن المشكلة حُلت؟

افتح Console وابحث عن:

```
✅ الصحيح:
🚀 About to call AuthService.makeRequest with URL: https://mansapi.tiba29.com/api/trainee-auth/my-schedule

❌ الخاطئ:
Making API request to: https://mansapi.tiba29.com/api/schedule/classroom/1/weekly
```

---

## 🎯 ملخص سريع

| المشكلة | الحل |
|---------|------|
| كود قديم في cache | `npx react-native start --reset-cache` |
| ما زال لا يعمل | مسح node_modules وإعادة install |
| ما زال لا يعمل | احذف التطبيق من الجهاز وأعد تثبيته |

---

**نفذ الأوامر الآن! ⚡**

