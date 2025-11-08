# ⚡ بناء سريع لـ APK

## 🚀 خطوة واحدة فقط!

```bash
npm run build:android
```

هذا كل شيء! سيتم إنشاء ملف `StudentApp-release.apk` تلقائياً.

---

## 📁 مكان الملف

```
StudentApp-release.apk  (في المجلد الرئيسي)
```

---

## 🎯 التفاصيل

- **الحجم**: ~45 MB
- **النوع**: Release APK
- **الوقت**: 5-10 دقائق
- **المتطلبات**: Node.js, Android SDK, Java JDK

---

## 📝 ملاحظات

- ✅ يتم تنظيف البناءات السابقة تلقائياً
- ✅ Bundle من JavaScript محسّن
- ✅ Hermes Engine مفعّل
- ✅ APK موقّع وجاهز للتوزيع

---

## 🔧 بناء يدوي (بدون script)

```bash
# 1. تنظيف
cd android
.\gradlew.bat clean

# 2. بناء
.\gradlew.bat assembleRelease

# 3. النسخ
cd ..
copy android\app\build\outputs\apk\release\app-release.apk StudentApp-release.apk /Y
```

---

## 📱 التثبيت

```bash
adb install StudentApp-release.apk
```

أو انقل الملف مباشرة للهاتف!

---

**سريع وبسيط! 🎉**


