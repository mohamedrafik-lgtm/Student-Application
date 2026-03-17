# أمثلة كود التطبيق - Code Examples
## Implementation Code Examples

> **ملف مرجعي:** أكواد جاهزة للنسخ واللصق

---

## 📁 الملفات الجاهزة للاستخدام

### ✅ الملفات التي تم إنشاؤها:

1. **`src/contexts/TraineePlatformContext.tsx`** ✅
2. **`src/lib/trainee-cache.ts`** ✅
3. **`src/app/trainee-dashboard/hooks/useTraineeProfileOptimized.ts`** ✅

---

## 🔧 التعديلات المطلوبة على الملفات الموجودة

### **1. تعديل: `src/hooks/useTraineePaymentStatus.ts`**

**السطر 88-93 (قبل):**
```typescript
  // مراقبة دورية للدفع (كل 5 دقائق)
  useEffect(() => {
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(interval);
  }, []);
```

**السطر 88-93 (بعد):**
```typescript
  // مراقبة دورية للدفع (كل 15 دقيقة)
  useEffect(() => {
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 15 * 60 * 1000); // كل 15 دقيقة بدلاً من 5

    return () => clearInterval(interval);
  }, []);
```

---

### **2. تعديل: `src/app/trainee-dashboard/layout.tsx`**

#### A. إضافة Import في البداية:

**أضف في السطر 1-10:**
```typescript
import { TraineePlatformProvider } from '@/contexts/TraineePlatformContext';
```

#### B. تعديل Return Statement:

**قبل (السطر ~140):**
```typescript
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <TraineeSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        traineeData={traineeData}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ... rest of content */}
      </div>
    </div>
  );
```

**بعد:**
```typescript
  return (
    <TraineePlatformProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <TraineeSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          traineeData={traineeData}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ... rest of content */}
        </div>
      </div>
    </TraineePlatformProvider>
  );
```

#### C. حذف Token Check Interval (اختياري):

**احذف السطر 97-106:**
```typescript
  // ❌ احذف هذا الكود - أصبح مدمج في Context
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('trainee_token');
      if (!token) {
        router.push('/trainee-auth');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(tokenCheckInterval);
  }, [router]);
```

---

### **3. تعديل: `src/lib/api-cache.ts`**

**السطر 116-119 (قبل):**
```typescript
// تنظيف دوري للـ cache
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000); // كل 10 دقائق
}
```

**السطر 116-119 (بعد):**
```typescript
// تنظيف دوري للـ cache
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 30 * 60 * 1000); // كل 30 دقيقة بدلاً من 10
}
```

---

## 📄 تحديث الصفحات لاستخدام Context

### **مثال 1: `src/app/trainee-dashboard/page.tsx`**

**قبل:**
```typescript
'use client';

import Link from 'next/link';
import {
  AcademicCapIcon,
  // ... other imports
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from './hooks/useTraineeProfile';
import { useTraineePaymentStatus } from '@/hooks/useTraineePaymentStatus';
import QRCodeDisplay from './components/QRCodeDisplay';
import PaymentReminderModal from './components/PaymentReminderModal';
import { useState, useEffect } from 'react';
import { SERVER_BASE_URL } from '@/lib/api';

export default function TraineeDashboardPage() {
  const { profile, stats, loading, error } = useTraineeProfile();
  const { status: paymentStatus } = useTraineePaymentStatus();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ... rest of component
}
```

**بعد:**
```typescript
'use client';

import Link from 'next/link';
import {
  AcademicCapIcon,
  // ... other imports
} from '@heroicons/react/24/outline';
import { useTraineePlatform } from '@/contexts/TraineePlatformContext';
import QRCodeDisplay from './components/QRCodeDisplay';
import PaymentReminderModal from './components/PaymentReminderModal';
import { useState, useEffect } from 'react';
import { SERVER_BASE_URL } from '@/lib/api';

export default function TraineeDashboardPage() {
  // استخدام Context بدلاً من Hooks المنفصلة
  const { profile, stats, paymentStatus, loading, error } = useTraineePlatform();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ... rest of component (باقي الكود يبقى كما هو)
}
```

**التغييرات:**
1. ✅ استبدال `useTraineeProfile` و `useTraineePaymentStatus` بـ `useTraineePlatform`
2. ✅ الحصول على `paymentStatus` مباشرة من Context
3. ✅ حذف imports غير المستخدمة

---

### **مثال 2: `src/app/trainee-dashboard/profile/page.tsx`**

**قبل:**
```typescript
'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  // ... other imports
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { SERVER_BASE_URL } from '@/lib/api';

export default function TraineeProfilePage() {
  const { profile: traineeData, loading, error } = useTraineeProfile();

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل بياناتك الشخصية..." 
        submessage="نحضر لك معلوماتك المحدثة"
      />
    );
  }

  // ... rest of component
}
```

**بعد - الطريقة 1 (استخدام Context):**
```typescript
'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  // ... other imports
} from '@heroicons/react/24/outline';
import { useTraineePlatform } from '@/contexts/TraineePlatformContext';
import LoadingScreen from '../components/LoadingScreen';
import { SERVER_BASE_URL } from '@/lib/api';

export default function TraineeProfilePage() {
  const { profile: traineeData, loading, error } = useTraineePlatform();

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل بياناتك الشخصية..." 
        submessage="نحضر لك معلوماتك المحدثة"
      />
    );
  }

  // ... rest of component (باقي الكود يبقى كما هو)
}
```

**بعد - الطريقة 2 (استخدام Hook المحسّن):**
```typescript
'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  // ... other imports
} from '@heroicons/react/24/outline';
import { useTraineeProfileOptimized } from '../hooks/useTraineeProfileOptimized';
import LoadingScreen from '../components/LoadingScreen';
import { SERVER_BASE_URL } from '@/lib/api';

export default function TraineeProfilePage() {
  // استخدام النسخة المحسّنة مع caching
  const { profile: traineeData, loading, error } = useTraineeProfileOptimized();

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل بياناتك الشخصية..." 
        submessage="نحضر لك معلوماتك المحدثة"
      />
    );
  }

  // ... rest of component (باقي الكود يبقى كما هو)
}
```

**ملاحظة:** الطريقة 1 (Context) أفضل للأداء لأنها تشارك البيانات بين جميع الصفحات.

---

### **مثال 3: `src/app/trainee-dashboard/content/page.tsx`**

**قبل:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';

export default function TraineeContentPage() {
  const { profile: traineeData, loading: profileLoading, error: profileError } = useTraineeProfile();
  
  const [loading, setLoading] = useState(true);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);

  useEffect(() => {
    if (traineeData?.trainee?.program?.id) {
      loadTrainingContents();
    }
  }, [traineeData]);

  // ... rest of component
}
```

**بعد:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useTraineePlatform } from '@/contexts/TraineePlatformContext';
import LoadingScreen from '../components/LoadingScreen';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';

export default function TraineeContentPage() {
  // استخدام Context
  const { profile: traineeData, loading: profileLoading, error: profileError } = useTraineePlatform();
  
  const [loading, setLoading] = useState(true);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);

  useEffect(() => {
    if (traineeData?.trainee?.program?.id) {
      loadTrainingContents();
    }
  }, [traineeData]);

  // ... rest of component (باقي الكود يبقى كما هو)
}
```

---

## 🔄 تحديث جميع الصفحات

### قائمة الصفحات التي تحتاج تحديث:

```bash
# الصفحات الرئيسية (أولوية عالية)
✅ src/app/trainee-dashboard/page.tsx
✅ src/app/trainee-dashboard/profile/page.tsx
✅ src/app/trainee-dashboard/layout.tsx

# صفحات المحتوى (أولوية متوسطة)
⏳ src/app/trainee-dashboard/content/page.tsx
⏳ src/app/trainee-dashboard/schedule/page.tsx
⏳ src/app/trainee-dashboard/attendance/page.tsx

# صفحات الطلبات (أولوية متوسطة)
⏳ src/app/trainee-dashboard/requests/page.tsx
⏳ src/app/trainee-dashboard/requests/new/page.tsx

# صفحات أخرى (أولوية منخفضة)
⏳ src/app/trainee-dashboard/quizzes/[quizId]/take/page.tsx
⏳ src/app/trainee-dashboard/quizzes/[quizId]/result/[attemptId]/page.tsx
⏳ ... وأي صفحة أخرى تستخدم useTraineeProfile
```

### أوامر البحث السريع:

```bash
# للبحث عن جميع استخدامات useTraineeProfile
grep -r "useTraineeProfile" src/app/trainee-dashboard/

# للبحث عن جميع استخدامات useTraineePaymentStatus
grep -r "useTraineePaymentStatus" src/app/trainee-dashboard/
```

---

## 🎯 Pattern التحديث السريع

### **النمط العام للتحديث:**

```typescript
// 1. استبدال import
- import { useTraineeProfile } from '../hooks/useTraineeProfile';
- import { useTraineePaymentStatus } from '@/hooks/useTraineePaymentStatus';
+ import { useTraineePlatform } from '@/contexts/TraineePlatformContext';

// 2. استبدال استخدام Hooks
- const { profile, stats, loading, error } = useTraineeProfile();
- const { status: paymentStatus } = useTraineePaymentStatus();
+ const { profile, stats, paymentStatus, loading, error } = useTraineePlatform();

// 3. باقي الكود يبقى كما هو تماماً!
```

---

## 🧪 اختبار التحديثات

### كود الاختبار في Console:

```javascript
// 1. تحقق من وجود Context
console.log('Context loaded:', window.__TRAINEE_PLATFORM_CONTEXT__);

// 2. راقب API Calls
let apiCallCount = 0;
const originalFetch = window.fetch;
window.fetch = (...args) => {
  apiCallCount++;
  console.log(`[API Call #${apiCallCount}]`, args[0]);
  return originalFetch(...args);
};

// 3. راقب الـ polling
setTimeout(() => {
  console.log(`Total API calls in 5 minutes: ${apiCallCount}`);
  // المتوقع: 1-2 طلبات فقط (بدلاً من 6-8)
}, 5 * 60 * 1000);
```

---

## 🔍 Debugging Tips

### إذا ظهرت مشاكل:

#### 1. خطأ: "useTraineePlatform must be used within TraineePlatformProvider"

**الحل:**
```typescript
// تأكد من وجود Provider في layout.tsx
<TraineePlatformProvider>
  {children}
</TraineePlatformProvider>
```

#### 2. البيانات لا تتحدث

**الحل:**
```typescript
// استخدم refetch يدوياً
const { refetch } = useTraineePlatform();

useEffect(() => {
  refetch(); // إعادة جلب البيانات
}, [someCondition]);
```

#### 3. Cache لا يعمل

**الحل:**
```typescript
// امسح الـ cache يدوياً
import { invalidateAllTraineeCache } from '@/lib/trainee-cache';

invalidateAllTraineeCache();
window.location.reload();
```

---

## ✅ Checklist النهائي

```
Pre-Implementation:
[ ] قراءة التوثيق كاملاً
[ ] عمل backup للكود
[ ] إنشاء branch جديد

Implementation:
[ ] إنشاء src/contexts/TraineePlatformContext.tsx
[ ] إنشاء src/lib/trainee-cache.ts
[ ] إنشاء src/app/trainee-dashboard/hooks/useTraineeProfileOptimized.ts
[ ] تعديل src/hooks/useTraineePaymentStatus.ts (السطر 88-93)
[ ] تعديل src/app/trainee-dashboard/layout.tsx (إضافة Provider)
[ ] تعديل src/lib/api-cache.ts (السطر 116-119)
[ ] تحديث src/app/trainee-dashboard/page.tsx
[ ] تحديث src/app/trainee-dashboard/profile/page.tsx
[ ] تحديث باقي الصفحات (تدريجياً)

Testing:
[ ] اختبار تسجيل الدخول
[ ] اختبار التنقل بين الصفحات
[ ] مراقبة Console للأخطاء
[ ] مراقبة Network tab
[ ] قياس الأداء (قبل/بعد)
[ ] اختبار على أجهزة مختلفة

Post-Implementation:
[ ] مراجعة الأداء
[ ] توثيق التغييرات
[ ] Deploy على staging
[ ] اختبار في staging
[ ] Deploy على production
[ ] مراقبة production
```

---

**📅 آخر تحديث:** ${new Date().toLocaleDateString('ar-EG')}  
**✍️ المُعد:** GitHub Copilot  
**📊 الحالة:** ✅ جاهز للتطبيق

