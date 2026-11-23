# 📱 دليل Google Cloud Vision - خطوة بخطوة (مبسط)

## 🎯 أنت الآن في الصفحة الصحيحة!

### **ما تفعله الآن:**

#### **في الشاشة التي أمامك:**

**1. Credential Type:**
- ✅ تم اختيار "Cloud Vision API" (صحيح)

**2. What data will you be accessing?**
- ⭕ اختر: **"Application data"**
- 🔘 (ليس "User data")

**3. اضغط "Next"**

---

## 📋 الخطوات المتبقية:

### **الخطوة التالية (Your Credentials):**

**سيسألك:**
- Service account name: `omr-service`
- Service account ID: `omr-service` (سيتم ملؤه تلقائياً)
- Description: `For OMR answer sheet OCR`

**ثم اضغط "Done"**

---

### **الآن: تحميل ملف JSON:**

**1. ستعود لصفحة Service Accounts**

**2. ستجد service account اسمه `omr-service@....`**

**3. اضغط عليه**

**4. اذهب إلى تبويب "Keys"** (في الأعلى)

**5. اضغط "Add Key" → "Create new key"**

**6. اختر نوع "JSON"**

**7. اضغط "Create"**

**8. سيتم تحميل ملف مثل:**
```
tiba-omr-system-abc123def456.json
```

---

## 💾 حفظ الملف:

**1. أعد تسمية الملف إلى:**
```
google-cloud-key.json
```

**2. ضعه في:**
```
e:/Projects/erp_prod_frontendv1.7-master/backend/google-cloud-key.json
```

**3. افتح ملف:**
```
e:/Projects/erp_prod_frontendv1.7-master/backend/.env
```

**4. أضف هذا السطر:**
```env
GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json
```

**5. احفظ الملف**

---

## 🔄 إعادة تشغيل Backend:

**أغلق Backend ثم:**

```bash
cd e:/Projects/erp_prod_frontendv1.7-master/backend
npm run start:dev
```

**ابحث في الـ logs عن:**
```
✓ Google Cloud Vision initialized
```

---

## ✅ الاختبار:

**1. افتح:**
```
http://localhost:3000/print/omr-answer-sheets-bulk/1/1
```

**2. اطبع ورقة واحدة**

**3. اكتب في المربعات:**
- سؤال 1: ص
- سؤال 2: خ  
- سؤال 3: 1

**4. صور/امسح الورقة**

**5. افتح:**
```
http://localhost:3000/dashboard/paper-exams/1/scan
```

**6. أدخل كود الورقة ثم ارفع الصورة**

**7. انتظر 3 ثواني**

**8. سيتعرف تلقائياً على الرموز!** ✨

---

## ❓ إذا لم تفهم خطوة:

**أرسل لي:**
1. 📸 Screenshot من الشاشة الحالية
2. 📝 عند أي خطوة توقفت

**وسأشرح بالتفصيل!**