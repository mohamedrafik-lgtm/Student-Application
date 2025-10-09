# استخدام API للدرجات 📊

## ✅ تم التفعيل!

### **1️⃣ الـ Endpoint المستخدم**
```typescript
MY_GRADES: '/api/trainee-auth/my-grades'
```

### **2️⃣ الـ Service**
```typescript
// src/services/gradesService.ts
async getMyGrades(accessToken: string): Promise<MyGradesResponse> {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_GRADES}`;
  
  const response = await GradesService.makeRequest<MyGradesResponse>(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  return response;
}
```

### **3️⃣ الـ Screen**
```typescript
// src/screens/GradesScreen.tsx
const loadGrades = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const response = await gradesService.getMyGrades(accessToken);
    
    if (response.success && response.data) {
      setGradesData(response.data);
    }
  } catch (error) {
    // معالجة الأخطاء
  }
};
```

---

## 📊 البيانات المسترجعة

### **Response Structure**
```typescript
{
  trainee: {
    id: number;
    nameAr: string;           // الاسم بالعربية
    nameEn: string;           // الاسم بالإنجليزية
    nationalId: string;       // الرقم القومي
    program: {
      id: number;
      nameAr: string;         // اسم البرنامج بالعربية
      nameEn: string;         // اسم البرنامج بالإنجليزية
    };
  };
  
  overallStats: {
    totalEarned: number;      // إجمالي الدرجات المحصلة
    totalMax: number;         // إجمالي الدرجات الكاملة
    percentage: number;       // النسبة المئوية الإجمالية
    totalContents: number;    // إجمالي عدد المواد
  };
  
  classrooms: Array<{
    classroom: {
      id: number;
      name: string;           // اسم الفصل الدراسي
    };
    
    contents: Array<{
      content: {
        id: number;
        code: string;         // كود المادة
        name: string;         // اسم المادة
        yearWorkMarks: number;    // درجات أعمال السنة
        practicalMarks: number;   // درجات العملي
        writtenMarks: number;     // درجات التحريري
        attendanceMarks: number;  // درجات الحضور
        quizzesMarks: number;     // درجات اختبارات مصغرة
        finalExamMarks: number;   // درجات الميد تيرم
      };
      
      grades: {
        yearWorkMarks: number;    // درجات أعمال السنة المحصلة
        practicalMarks: number;   // درجات العملي المحصلة
        writtenMarks: number;     // درجات التحريري المحصلة
        attendanceMarks: number;  // درجات الحضور المحصلة
        quizzesMarks: number;     // درجات اختبارات مصغرة المحصلة
        finalExamMarks: number;   // درجات الميد تيرم المحصلة
        totalMarks: number;       // إجمالي الدرجات المحصلة
      };
      
      maxMarks: {
        yearWorkMarks: number;    // أقصى درجات أعمال السنة
        practicalMarks: number;   // أقصى درجات العملي
        writtenMarks: number;     // أقصى درجات التحريري
        attendanceMarks: number;  // أقصى درجات الحضور
        quizzesMarks: number;     // أقصى درجات اختبارات مصغرة
        finalExamMarks: number;   // أقصى درجات الميد تيرم
        total: number;            // إجمالي أقصى الدرجات
      };
      
      percentage: number;         // النسبة المئوية للمادة
    }>;
    
    stats: {
      totalEarned: number;        // إجمالي الدرجات المحصلة في الفصل
      totalMax: number;           // إجمالي الدرجات الكاملة في الفصل
      percentage: number;         // النسبة المئوية للفصل
      contentCount: number;       // عدد المواد في الفصل
    };
  }>;
}
```

---

## 🎯 المميزات

### **1️⃣ عرض الإحصائيات العامة**
- اسم الطالب
- النسبة الإجمالية
- إجمالي الدرجات
- عدد المواد

### **2️⃣ عرض الفصول الدراسية**
- اسم الفصل
- عدد المواد
- النسبة المئوية للفصل
- إجمالي درجات الفصل

### **3️⃣ تفاصيل كل مادة**
- كود المادة واسمها
- النسبة المئوية
- تفاصيل جميع أنواع الدرجات:
  - أعمال السنة
  - العملي
  - التحريري
  - الحضور
  - اختبارات مصغرة
  - الميد تيرم

### **4️⃣ ألوان ديناميكية**
- أخضر: 90%+ (ممتاز)
- أزرق: 80-89% (جيد جداً)
- برتقالي: 70-79% (جيد)
- أحمر: 60-69% (مقبول)
- رمادي: أقل من 60% (راسب)

---

## 🔄 تدفق البيانات

```
1. المستخدم يفتح صفحة الدرجات
   ↓
2. GradesScreen.tsx → loadGrades()
   ↓
3. gradesService.getMyGrades(accessToken)
   ↓
4. API Request → /api/trainee-auth/my-grades
   ↓
5. Response → MyGradesResponse
   ↓
6. تحديث state → setGradesData(response.data)
   ↓
7. عرض البيانات في البطاقات
```

---

## 🧪 كيفية الاختبار

### 1. **افتح التطبيق**
- سجل الدخول
- اضغط على زر الدرجات

### 2. **راقب الـ Console**
```
🔍 Loading grades...
🔍 My Grades API Request: { url: "...", endpoint: "/api/trainee-auth/my-grades" }
📡 My Grades API Response: { success: true, traineeName: "...", overallPercentage: 85.5 }
✅ Grades loaded successfully!
```

### 3. **تحقق من البيانات**
- ستظهر الإحصائيات العامة
- قائمة بالفصول الدراسية
- تفاصيل كل مادة

---

## ✅ تم الإنجاز

- ✅ استخدام الـ endpoint الصحيح
- ✅ جلب البيانات الديناميكية
- ✅ عرض الإحصائيات العامة
- ✅ عرض الفصول والمواد
- ✅ تفاصيل جميع أنواع الدرجات
- ✅ ألوان ديناميكية حسب النسبة
- ✅ معالجة الأخطاء
- ✅ حالات Loading و Empty

---

**الآن الصفحة تستخدم البيانات الفعلية من الـ API!** 🎉
