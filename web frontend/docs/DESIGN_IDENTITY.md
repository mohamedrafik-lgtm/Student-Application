# 🎨 هوية التصميم — نظام TIBA ERP

> **الإصدار:** 1.8  
> **آخر تحديث:** فبراير 2026  
> **الخط الأساسي:** Cairo (عربي + لاتيني)  
> **اتجاه الواجهة:** RTL (من اليمين لليسار)  
> **إطار العمل:** Next.js 16 + Tailwind CSS + shadcn/ui (new-york) + NextUI

---

## 1. الألوان (Color System)

### 1.1 الألوان الرئيسية

| الاسم | Hex | RGB | الاستخدام |
|-------|-----|-----|-----------|
| **أزرق أكاديمي (Primary)** | `#2F80ED` | `47, 128, 237` | الأزرار الرئيسية، الروابط، التركيز |
| **أخضر نعناعي (Secondary)** | `#27AE60` | `39, 174, 96` | النجاح، الحضور، التأكيد |
| **برتقالي هادئ (Accent)** | `#F2994A` | `242, 153, 74` | التنبيهات، العناصر البارزة |
| **أحمر معتدل (Error)** | `#EB5757` | `235, 87, 87` | الأخطاء، الحذف، التحذيرات الخطيرة |

### 1.2 لوحة الألوان الموسّعة (tiba.*)

#### Primary (نيلي / Indigo)
| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| 50 | `#EEF2FF` | خلفيات خفيفة، hover |
| 100 | `#E0E7FF` | خلفيات العناصر المحددة |
| 200 | `#C7D2FE` | حدود مُفعّلة |
| 300 | `#A5B4FC` | أيقونات ثانوية |
| 400 | `#818CF8` | عناصر تفاعلية |
| **500** | **`#6366F1`** | **اللون الأساسي الافتراضي** |
| 600 | `#4F46E5` | أزرار، عناصر نشطة |
| 700 | `#4338CA` | hover على الأزرار |
| 800 | `#3730A3` | نصوص على خلفيات فاتحة |
| 900 | `#312E81` | عناوين رئيسية |
| 950 | `#1E3A8A` | خلفيات داكنة، sidebar |

#### Secondary (زمردي / Emerald)
| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| 50 | `#ECFDF5` | خلفية شارة النجاح |
| 100 | `#D1FAE5` | خلفيات تأكيد |
| 200 | `#A7F3D0` | حدود النجاح |
| 300 | `#6EE7B7` | أيقونات |
| 400 | `#34D399` | عناصر تفاعلية |
| **500** | **`#10B981`** | **اللون الثانوي الافتراضي** |
| 600 | `#059669` | أزرار النجاح |
| 700 | `#047857` | hover |
| 800 | `#065F46` | نصوص |
| 900 | `#064E3B` | خلفيات |
| 950 | `#022C22` | أغمق درجة |

#### Warning (كهرماني / Amber)
| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| 50 | `#FFFBEB` | خلفية تحذير خفيفة |
| 100 | `#FEF3C7` | خلفية شارة تحذير |
| 200 | `#FDE68A` | حدود التحذير |
| 300 | `#FCD34D` | أيقونات |
| 400 | `#FBBF24` | عناصر تفاعلية |
| **500** | **`#F59E0B`** | **لون التحذير الافتراضي** |
| 600 | `#D97706` | أزرار التحذير |
| 700 | `#B45309` | hover |
| 800 | `#92400E` | نصوص |
| 900 | `#78350F` | خلفيات |
| 950 | `#451A03` | أغمق درجة |

#### Danger (أحمر / Red)
| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| 50 | `#FEF2F2` | خلفية خطأ خفيفة |
| 100 | `#FEE2E2` | خلفية شارة خطأ |
| 200 | `#FECACA` | حدود الخطأ |
| 300 | `#FCA5A5` | أيقونات |
| 400 | `#F87171` | عناصر تفاعلية |
| **500** | **`#EF4444`** | **لون الخطر الافتراضي** |
| 600 | `#DC2626` | أزرار الحذف |
| 700 | `#B91C1C` | hover |
| 800 | `#991B1B` | نصوص |
| 900 | `#7F1D1D` | خلفيات |
| 950 | `#450A0A` | أغمق درجة |

#### Gray (رمادي / Neutral)
| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| 50 | `#F9FAFB` | خلفية الصفحة الرئيسية |
| 100 | `#F3F4F6` | خلفيات الأقسام |
| 200 | `#E5E7EB` | حدود، فواصل |
| 300 | `#D1D5DB` | حدود حقول الإدخال |
| 400 | `#9CA3AF` | نص placeholder |
| **500** | **`#6B7280`** | **نص ثانوي** |
| 600 | `#4B5563` | نص عادي |
| 700 | `#374151` | labels، عناوين فرعية |
| 800 | `#1F2937` | نص أساسي للجسم |
| 900 | `#111827` | عناوين رئيسية |
| 950 | `#030712` | أسود شبه كامل |

### 1.3 ألوان shadcn/ui (CSS Variables — HSL)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
}
```

### 1.4 ألوان الرسوم البيانية (Charts)

| المتغيّر | HSL | الاستخدام |
|----------|-----|-----------|
| `--chart-1` | `12 76% 61%` | السلسلة الأولى (برتقالي) |
| `--chart-2` | `173 58% 39%` | السلسلة الثانية (أخضر مائل) |
| `--chart-3` | `197 37% 24%` | السلسلة الثالثة (أزرق داكن) |
| `--chart-4` | `43 74% 66%` | السلسلة الرابعة (ذهبي) |
| `--chart-5` | `27 87% 67%` | السلسلة الخامسة (برتقالي فاتح) |

---

## 2. الخطوط (Typography)

### 2.1 عائلة الخط

| السياق | الخط | سلسلة البدائل |
|--------|------|---------------|
| **الواجهة الرئيسية** | Cairo | `sans-serif` |
| **صفحات الطباعة** | Cairo | `'Arial', sans-serif` |
| **البيانات الرقمية** | — | `monospace` |

```tsx
// تحميل الخط
const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});
```

### 2.2 أحجام الخطوط

| الفئة | الحجم | الاستخدام |
|-------|-------|-----------|
| `text-xs` | 0.75rem (12px) | شارات، timestamps، وصف ثانوي |
| `text-sm` | 0.875rem (14px) | نص أساسي، عناصر sidebar، labels، أزرار |
| `text-base` | 1rem (16px) | عناوين بطاقات الإحصائيات |
| `text-lg` | 1.125rem (18px) | عناوين الأقسام، عناوين Dialog |
| `text-xl` | 1.25rem (20px) | عناوين فرعية كبيرة |
| `text-2xl` | 1.5rem (24px) | عنوان الترحيب، hero |
| `text-3xl` | 1.875rem (30px) | أرقام الإحصائيات الكبيرة |
| `text-4xl` | 2.25rem (36px) | عنوان صفحة تسجيل الدخول |

### 2.3 أوزان الخط

| الوزن | القيمة | الاستخدام |
|-------|--------|-----------|
| `font-medium` | 500 | نصوص عادية، labels، روابط |
| `font-semibold` | 600 | عناصر نشطة، عناوين فرعية، أزرار |
| `font-bold` | 700 | عناوين صفحات، أسماء أقسام، CTA |

### 2.4 تدرّج العناوين

```
h1 → text-2xl / text-4xl + font-bold
h2 → text-xl / text-2xl + font-bold  
h3 → text-lg + font-semibold
h4 → text-base + font-semibold
body → text-sm + font-medium
caption → text-xs + font-medium
```

---

## 3. المسافات (Spacing)

### 3.1 الحشو (Padding)

| النمط | القيمة | الاستخدام |
|-------|--------|-----------|
| `p-2` | 0.5rem (8px) | حاويات أيقونات صغيرة |
| `p-3` | 0.75rem (12px) | عناصر القوائم، أيقونات |
| `p-4` | 1rem (16px) | أقسام البطاقات، خلايا الجدول، sidebar items |
| `p-5` | 1.25rem (20px) | بطاقات الإحصائيات |
| `p-6` | 1.5rem (24px) | الحاوية الرئيسية، Dialog، CardHeader |
| `p-8` | 2rem (32px) | أقسام hero |
| `p-10` | 2.5rem (40px) | نماذج كاملة (login) |

### 3.2 حشو الأزرار

| الحجم | Padding |
|-------|---------|
| `sm` | `h-9 px-4 py-2` |
| `default` | `h-10 px-5 py-2` |
| `lg` | `h-11 px-8` |
| `icon` | `h-9 w-9` |

### 3.3 حشو الشارات (Badges)

| النوع | Padding |
|-------|---------|
| صغير | `px-2.5 py-0.5` |
| عادي | `px-3 py-1` |

### 3.4 الفجوات (Gaps)

| النمط | القيمة | الاستخدام |
|-------|--------|-----------|
| `gap-2` | 0.5rem (8px) | صفوف الشارات، مجموعات أزرار صغيرة |
| `gap-3` | 0.75rem (12px) | أزواج أيقونة + نص |
| `gap-4` | 1rem (16px) | شبكات البطاقات، عناصر القوائم |
| `gap-6` | 1.5rem (24px) | فوارق الأقسام الرئيسية |
| `gap-8` | 2rem (32px) | تخطيطات متعددة الأعمدة |

### 3.5 الهوامش (Margins)

| النمط | الاستخدام |
|-------|-----------|
| `mb-1` / `mb-2` | بين العنوان والقيمة داخل البطاقة |
| `mb-3` / `mb-4` | فجوات بين أقسام داخل البطاقة |
| `mb-6` / `mb-8` | بين الأقسام الرئيسية في الصفحة |
| `space-y-1` / `space-y-1.5` | مسافات داخلية في Dialog header |
| `space-y-2` / `space-y-3` | عناصر sidebar، قوائم صغيرة |
| `space-y-4` | قوائم الميزات، مجموعات النماذج |
| `space-y-6` | حقول النماذج، أقسام كبيرة |

### 3.6 العرض الأقصى (Max Width)

| النمط | الاستخدام |
|-------|-----------|
| `max-w-lg` | نماذج تسجيل الدخول، محتوى Dialog |
| `max-w-7xl mx-auto` | حاوية لوحة التحكم الرئيسية |

### 3.7 شبكات الاستجابة (Responsive Grids)

```css
/* شبكة لوحة التحكم */
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
gap: 1.5rem;

/* شبكة الإحصائيات */
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 1.5rem;

/* الإجراءات السريعة */
grid-template-columns: repeat(2, 1fr);        /* موبايل */
grid-template-columns: repeat(4, 1fr);        /* sm+ */
gap: 0.75rem;
```

---

## 4. الحواف المستديرة (Border Radius)

| الفئة | القيمة | الاستخدام |
|-------|--------|-----------|
| `rounded-md` | 6px | أزرار shadcn، حقول الإدخال الأساسية |
| `rounded-lg` | 8px | بطاقات ثانوية، خلفيات أيقونات |
| **`rounded-xl`** | **12px** | **البطاقات الرئيسية (الأكثر شيوعاً)** |
| `rounded-2xl` | 16px | عناصر صفحة الدخول، رسائل خطأ |
| `rounded-3xl` | 24px | حاويات نماذج كبيرة |
| `rounded-full` | 9999px | شارات، pills، أيقونات دائرية |

```css
/* متغيّر Tailwind */
--radius: 0.5rem;
/* المُشتقّات */
lg: var(--radius)                    /* 0.5rem */
md: calc(var(--radius) - 2px)        /* ~6px */
sm: calc(var(--radius) - 4px)        /* ~4px */
```

---

## 5. الظلال (Shadows)

### 5.1 ظلال Tailwind

| الفئة | الاستخدام |
|-------|-----------|
| `shadow-sm` | البطاقات الأساسية (الحالة العادية) |
| `shadow-md` | حالة hover للبطاقات |
| `shadow-lg` | عناصر نشطة، شعار sidebar، أزرار بارزة |
| `shadow-xl` | عناصر عائمة، mockups |
| `shadow-2xl` | حاوية sidebar، نماذج login |

### 5.2 ظلال مخصّصة

```css
/* ظل البطاقة */
shadow-card: 0 2px 8px 0 rgba(0, 0, 0, 0.05);

/* ظل البطاقة عند التحويم */
shadow-card-hover: 0 4px 12px 0 rgba(0, 0, 0, 0.1);

/* ظل أساسي ملوّن */
shadow-primary: 0 4px 14px 0 rgba(30, 58, 138, 0.3);

/* ظل ثانوي ملوّن */
shadow-secondary: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
```

### 5.3 ظلال Neumorphic

```css
/* بارز */
box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.1), 
            -6px -6px 12px rgba(255, 255, 255, 0.8);

/* غارز */
box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.1), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.8);
```

### 5.4 ظلال ملوّنة

```
shadow-blue-500/30   → عناصر sidebar نشطة
shadow-red-500/30    → زر الخروج
shadow-tiba-primary-500/30 → عناصر tiba نشطة
```

### 5.5 نمط التحويم للبطاقات

```
الحالة العادية → shadow-sm + border-gray-200
hover → shadow-md + border-{color}-300 + transition-all
```

---

## 6. التدرّجات اللونية (Gradients)

### 6.1 التدرّجات الرئيسية

| الاسم | الألوان | الاستخدام |
|-------|---------|-----------|
| **Brand Gradient** | `from-blue-600 to-indigo-600` | رأس Sidebar، أزرار رئيسية |
| **Active Gradient** | `from-blue-500 to-indigo-500` | عناصر sidebar نشطة |
| **Hero Gradient** | `from-indigo-800 via-blue-900 to-purple-900` | خلفية hero صفحة الدخول |
| **Success Gradient** | `from-emerald-500 to-blue-600` | التأكيدات |
| **Danger Gradient** | `from-red-500 to-red-600` | زر الخروج |
| **Error Gradient** | `from-red-600 to-pink-600` | صفحة الخطأ |
| **Enhanced Primary** | `linear-gradient(135deg, #3b82f6, #1d4ed8)` | أزرار مُحسّنة |
| **Header Gradient** | `linear-gradient(135deg, #3b82f6, #8b5cf6)` | رؤوس أقسام مُحسّنة |

### 6.2 تدرّجات البطاقات

```
from-blue-50 to-blue-100       → بطاقة المتدربين
from-emerald-50 to-emerald-100 → بطاقة البرامج
from-amber-50 to-amber-100     → بطاقة المالية
from-purple-50 to-purple-100   → بطاقة التقارير
```

### 6.3 النص المتدرّج

```css
.text-gradient {
  background: linear-gradient(to right, #0A2647, #D35400);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 7. الحركات (Animations)

### 7.1 حركات Tailwind المخصّصة

| الاسم | المدة | الاستخدام |
|-------|-------|-----------|
| `animate-fade-in` | 0.3s ease-in-out | ظهور عناصر |
| `animate-slide-in-right` | 0.3s ease-in-out | دخول من اليمين |
| `animate-slide-in-left` | 0.3s ease-in-out | دخول من اليسار |
| `animate-slide-in-bottom` | 0.3s ease-in-out | دخول من الأسفل |
| `animate-scale-in` | 0.3s ease-in-out | تكبير تدريجي |
| `animate-blob` | 7s infinite | خلفيات زخرفية متحركة |
| `animate-gradient` | 6s linear infinite | تدرّج متحرك |

### 7.2 حركات CSS المخصّصة

```css
/* ظهور تدريجي مع صعود */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ظهور مع ارتداد */
@keyframes bounceIn {
  0%   { opacity: 0; transform: scale(0.3) rotate(-10deg); }
  50%  { opacity: 1; transform: scale(1.1) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

/* تحريك التدرّج */
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* طفو هادئ */
@keyframes float {
  0%   { transform: translate(0, 0) rotate(0deg); }
  25%  { transform: translate(20px, -20px) rotate(5deg); }
  50%  { transform: translate(-10px, 30px) rotate(-5deg); }
  75%  { transform: translate(-30px, -10px) rotate(3deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
```

### 7.3 تأخيرات الحركة

```css
.delay-100  { animation-delay: 0.1s; }
.delay-200  { animation-delay: 0.2s; }
.delay-300  { animation-delay: 0.3s; }
.delay-500  { animation-delay: 0.5s; }
.delay-700  { animation-delay: 0.7s; }
.delay-900  { animation-delay: 0.9s; }
.delay-1000 { animation-delay: 1s; }
.delay-1200 { animation-delay: 1.2s; }
```

### 7.4 الانتقالات العامة

```css
/* كل العناصر تحصل على انتقال سلس */
* {
  transition-property: background-color, border-color, color, fill, stroke, 
                       opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

### 7.5 تأثير الرفع عند التحويم

```css
.hover-lift {
  transition: transform 0.3s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
}
```

---

## 8. المكونات (Components)

### 8.1 الأزرار (Buttons)

#### المتغيّرات (Variants)

| المتغيّر | التنسيق |
|----------|---------|
| `default` | `bg-primary text-primary-foreground shadow hover:bg-primary/90` |
| `destructive` | `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90` |
| `outline` | `border border-input bg-background shadow-sm hover:bg-accent` |
| `secondary` | `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

#### الأحجام (Sizes)

| الحجم | الأبعاد |
|-------|---------|
| `sm` | `h-9 px-4 py-2` |
| `default` | `h-10 px-5 py-2` |
| `lg` | `h-11 px-8` |
| `icon` | `h-9 w-9` |

#### أزرار CSS المُحسّنة

```css
/* زر أساسي مُحسّن */
.btn-primary-enhanced {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

/* زر ثانوي مُحسّن */
.btn-secondary-enhanced {
  background: white;
  color: #374151;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #d1d5db;
}
```

### 8.2 البطاقات (Cards)

#### بطاقة shadcn/ui
```
rounded-xl border bg-card text-card-foreground shadow
CardHeader → flex flex-col space-y-1.5 p-6
CardContent → p-6 pt-0
CardFooter → flex items-center p-6 pt-0
```

#### بطاقة CSS مخصّصة
```css
.card {
  @apply bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden;
}
.card-header {
  @apply p-4 border-b border-gray-200 bg-gray-50;
}
.card-body {
  @apply p-4;
}
```

#### بطاقة الإحصائيات
```css
.stat-card {
  @apply relative p-6 rounded-xl bg-white shadow-sm border border-gray-100 
         overflow-hidden transition-all hover:shadow-md;
}
```

#### بطاقة مُحسّنة
```css
.card-enhanced {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### 8.3 حقول الإدخال (Inputs)

#### مكوّن Input
```
flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 
text-base shadow-sm transition-colors
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
```

#### حقل CSS مخصّص
```css
.input-field {
  @apply w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 
         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}
```

#### حقل مُحسّن
```css
.input-enhanced {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  color: #1f2937;
  font-weight: 500;
}
.input-enhanced:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### 8.4 الشارات (Badges)

```css
.badge-success-enhanced {
  background: #dcfce7; color: #166534;
  border: 1px solid #bbf7d0;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem; font-weight: 600;
}

.badge-warning-enhanced {
  background: #fef3c7; color: #92400e;
  border: 1px solid #fde68a;
  /* ... نفس الأبعاد */
}

.badge-error-enhanced {
  background: #fee2e2; color: #dc2626;
  border: 1px solid #fecaca;
  /* ... نفس الأبعاد */
}

.badge-info-enhanced {
  background: #dbeafe; color: #1d4ed8;
  border: 1px solid #bfdbfe;
  /* ... نفس الأبعاد */
}
```

### 8.5 الجدول (Table)

```
TableHeader → [&_tr]:border-b
TableRow → border-b transition-colors hover:bg-muted/50
TableHead → h-10 px-2 text-left font-medium text-muted-foreground
TableCell → p-2 align-middle
```

### 8.6 شريط التمرير (Scrollbar)

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

/* Firefox */
* { scrollbar-width: thin; scrollbar-color: #D1D5DB transparent; }
```

---

## 9. التخطيط (Layout)

### 9.1 الهيكل العام

```
┌────────────────────────────────────────────┐
│                   html                      │
│  lang="ar" dir="rtl"                        │
│  ┌──────────────────────────────────────┐   │
│  │ body                                  │   │
│  │ min-h-screen bg-background            │   │
│  │ font-sans antialiased                 │   │
│  │                                       │   │
│  │  ┌─────┬──────────────────────────┐   │   │
│  │  │     │        Header            │   │   │
│  │  │  S  │  bg-white border-b       │   │   │
│  │  │  i  │  px-4 md:px-6 py-2      │   │   │
│  │  │  d  ├──────────────────────────┤   │   │
│  │  │  e  │                          │   │   │
│  │  │  b  │     Main Content         │   │   │
│  │  │  a  │  flex-1 overflow-auto    │   │   │
│  │  │  r  │  p-4 md:p-6 lg:p-8      │   │   │
│  │  │     │                          │   │   │
│  │  │ w-64│  max-w-7xl mx-auto       │   │   │
│  │  └─────┴──────────────────────────┘   │   │
│  └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### 9.2 لوحة التحكم

```
flex h-screen bg-gray-50 text-right rtl overflow-hidden

Sidebar: w-64 (ثابت على lg+)
Content: flex-1 flex flex-col h-screen overflow-hidden mr-0 lg:mr-64
Header:  bg-white border-b border-gray-200 shadow-sm px-4 md:px-6 py-2
```

### 9.3 الشريط الجانبي (Sidebar)

```
العرض: w-64
الخلفية: bg-white (مع ظل shadow-2xl)
الرأس: p-6 bg-gradient-to-r from-blue-600 to-indigo-600
العناصر: p-4 rounded-xl
العنصر النشط: bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg
العنصر العادي: text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
```

---

## 10. أنماط الخلفية (Background Patterns)

```css
/* نمط نقطي */
.bg-pattern {
  background-image: 
    radial-gradient(rgba(var(--primary-500), 0.03) 2px, transparent 2px),
    radial-gradient(rgba(var(--primary-500), 0.03) 2px, transparent 2px);
  background-size: 40px 40px;
  background-position: 0 0, 20px 20px;
}

/* نمط شبكي */
.bg-grid-pattern {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(10, 38, 71, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(10, 38, 71, 0.05) 1px, transparent 1px);
}
```

---

## 11. دعم RTL

```css
/* الاتجاه العام */
html { lang="ar"; dir="rtl"; }

/* تعديلات المسافات */
space-x-4 rtl:space-x-reverse

/* محاذاة النصوص */
[dir="rtl"] { text-align: right; }
body { @apply rtl:text-right; }

/* React Select */
.tiba-select__single-value { text-align: right !important; direction: rtl !important; }
.tiba-select__placeholder { text-align: right !important; direction: rtl !important; }
```

---

## 12. الطباعة (Print Styles)

```css
@media print {
  .no-print { display: none; }
}
```

---

## 13. ملفات التنسيق (CSS Files)

| الملف | الحجم | المسؤولية |
|-------|-------|-----------|
| `src/app/globals.css` | 917 سطر | التنسيقات الرئيسية، CSS variables، مكونات Tailwind |
| `src/app/dashboard/styles/design-improvements.css` | 486 سطر | أزرار/بطاقات مُحسّنة، إصلاحات التباين |
| `src/app/trainee-dashboard/styles/layout.css` | 167 سطر | شبكات وتخطيط المتدرب |
| `src/app/styles/patterns.css` | ~50 سطر | خلفيات زخرفية |
| `src/app/styles/datepicker.css` | — | تخصيص منتقي التاريخ |
| `src/app/dashboard/permissions/permissions.module.css` | — | CSS Module للصلاحيات |
| `src/styles/image-shapes-force.css` | — | أشكال الصور |
| `src/styles/id-card-print.css` | — | طباعة بطاقة الهوية |

---

## 14. المكتبات المُستخدمة في التصميم

| المكتبة | النسخة | الغرض |
|---------|--------|-------|
| Tailwind CSS | — | إطار التنسيق الأساسي |
| shadcn/ui | new-york | مكونات UI (Button, Card, Dialog, Table...) |
| NextUI | ^2.6.11 | مكونات إضافية |
| Framer Motion | ^12.23.12 | حركات متقدمة |
| Heroicons | ^2.2.0 | أيقونات outline |
| Lucide React | ^0.515.0 | أيقونات shadcn |
| React Icons | ^5.5.0 | مجموعات أيقونات متنوعة (Fi, ...) |
| MUI Icons | ^7.3.2 | أيقونات Material |
| tailwindcss-animate | — | حركات Tailwind |
| @tailwindcss/typography | — | تنسيقات النثر (prose) |
| class-variance-authority | ^0.7.1 | إدارة المتغيّرات |
| clsx | ^2.1.1 | دمج الأصناف |
| next-themes | ^0.4.6 | إدارة السمات (معطّل حالياً) |

---

## 15. Plugins في Tailwind

```typescript
plugins: [
  typography,      // @tailwindcss/typography
  animate,         // tailwindcss-animate
  nextui()         // @nextui-org/react
]
```

---

## 16. ملاحظات ومشاكل معروفة

### تعارضات الألوان
- ثلاثة أنظمة ألوان متوازية (CSS variables، tiba.* tokens، shadcn HSL) بقيم مختلفة لـ "primary"
- المكونات تستخدم ألوان Tailwind الخام (`blue-*`, `indigo-*`) بدلاً من أي نظام tokens

### إفراط !important
- `globals.css` يفرض `color: #1f2937 !important` و `background-color: white !important` على كل `input`, `select`, `textarea` عالمياً
- `design-improvements.css` يعمّم `color: #1f2937 !important` على كل `h1`-`h6`, `p`, `span`, `div` بدون class لون

### الوضع الداكن
- مدعوم معمارياً لكن معطّل — متغيّرات `.dark` مطابقة لـ `:root`
- مئات `dark:` classes في المكونات بدون تأثير فعلي

### تفاوت border-radius
-  `.btn-primary` (CSS) = `rounded-md` بينما أزرار Login (inline) = `rounded-2xl`
- `.input-field` (CSS) = `rounded-md` بينما Input component = `rounded-md` (متسق)
- `.card` (CSS) = `rounded-lg` بينما Card component = `rounded-xl`

### ملفات CSS متنافسة
- `design-improvements.css` يعيد تعريف أنماط موجودة في `globals.css`
- 3 طبقات تنسيق: CSS variables، Tailwind utilities، CSS classes مخصّصة
