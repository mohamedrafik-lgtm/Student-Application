# 🎨 هوية التصميم الجديدة — نظام TIBA ERP v2.0

> **الفلسفة:** نظام تصميم موحّد يعتمد على **درجات الأزرق فقط** كلون رئيسي، مع درجات رمادية محايدة للنصوص والخلفيات. بدون ألوان جانبية مشتتة — كل شيء يتحدث بلغة بصرية واحدة.

---

## فهرس المحتويات

1. [اللون الأساسي والدرجات](#1-اللون-الأساسي-والدرجات)
2. [ألوان الحالات (Status Colors)](#2-ألوان-الحالات)
3. [ألوان الخلفيات والأسطح](#3-ألوان-الخلفيات-والأسطح)
4. [ألوان النصوص](#4-ألوان-النصوص)
5. [الخطوط والتايبوغرافي](#5-الخطوط-والتايبوغرافي)
6. [المسافات والأبعاد](#6-المسافات-والأبعاد)
7. [الحواف المستديرة](#7-الحواف-المستديرة)
8. [الظلال](#8-الظلال)
9. [المكونات (Components)](#9-المكونات)
10. [التصميم المتجاوب (Responsive)](#10-التصميم-المتجاوب)
11. [المنصات الأربع](#11-المنصات-الأربع)
12. [الحركات والتأثيرات](#12-الحركات-والتأثيرات)
13. [المكتبات المقترحة](#13-المكتبات-المقترحة)
14. [CSS Variables الجديدة](#14-css-variables-الجديدة)
15. [دليل التطبيق](#15-دليل-التطبيق)

---

## 1. اللون الأساسي والدرجات

### اللون الرئيسي: `Blue-600` → `#2563EB`

هذا هو اللون الأساسي الوحيد للنظام بالكامل. كل العناصر التفاعلية تبنى عليه.

```
الأزرق الأساسي: #2563EB (blue-600)
```

### مقياس الأزرق الكامل (12 درجة)

| الدرجة | Hex | RGB | الاستخدام |
|--------|-----|-----|-----------|
| **25** | `#F0F5FF` | `240, 245, 255` | خلفية hover خفيفة جداً، صفوف جدول مُحددة |
| **50** | `#EFF6FF` | `239, 246, 255` | خلفية البطاقات المُختارة، badges خفيفة |
| **100** | `#DBEAFE` | `219, 234, 254` | خلفية أقسام مميّزة، tooltip، تنبيهات info |
| **200** | `#BFDBFE` | `191, 219, 254` | حدود عناصر مُفعّلة، progress track، dividers مُلوّنة |
| **300** | `#93C5FD` | `147, 197, 253` | أيقونات ثانوية، حدود focus ring |
| **400** | `#60A5FA` | `96, 165, 250` | أيقونات تفاعلية، links ثانوية، progress bar |
| **500** | `#3B82F6` | `59, 130, 246` | أيقونات رئيسية، links، خلفيات أيقونات |
| **600** | **`#2563EB`** | **`37, 99, 235`** | **🔵 اللون الأساسي — أزرار، headers، عناصر نشطة** |
| **700** | `#1D4ED8` | `29, 78, 216` | hover على الأزرار، عناصر ضغط |
| **800** | `#1E40AF` | `30, 64, 175` | active/pressed state، sidebar header |
| **900** | `#1E3A8A` | `30, 58, 138` | نصوص على خلفيات فاتحة، عناوين مُركّزة |
| **950** | `#172554` | `23, 37, 84` | خلفيات داكنة جداً، footer |

### مقياس الرمادي المحايد (Slate)

| الدرجة | Hex | الاستخدام |
|--------|-----|-----------|
| **25** | `#FCFCFD` | خلفية الصفحة الفاتحة جداً |
| **50** | `#F8FAFC` | خلفية الصفحة الرئيسية |
| **100** | `#F1F5F9` | خلفية الأقسام، card header |
| **200** | `#E2E8F0` | حدود، فواصل، dividers |
| **300** | `#CBD5E1` | حدود حقول الإدخال |
| **400** | `#94A3B8` | placeholder، نص معطّل |
| **500** | `#64748B` | نص ثانوي، captions |
| **600** | `#475569` | نص عادي |
| **700** | `#334155` | labels، عناوين فرعية |
| **800** | `#1E293B` | نص أساسي body |
| **900** | `#0F172A` | عناوين رئيسية |
| **950** | `#020617` | أسود تقريباً |

---

## 2. ألوان الحالات

> **المبدأ:** حتى ألوان الحالات تنتمي لعائلة الأزرق أو تكون مقتبسة منه بتحويل بسيط.

| الحالة | اللون | Hex | الخلفية | الحد | النص |
|--------|-------|-----|---------|------|------|
| **نجاح** | أزرق-أخضر (Teal) | `#0D9488` | `#F0FDFA` | `#99F6E4` | `#134E4A` |
| **تحذير** | أزرق-كهرماني (Amber) | `#D97706` | `#FFFBEB` | `#FDE68A` | `#78350F` |
| **خطر / خطأ** | أزرق-أحمر (Rose) | `#E11D48` | `#FFF1F2` | `#FECDD3` | `#881337` |
| **معلومات** | أزرق فاتح | `#2563EB` | `#EFF6FF` | `#BFDBFE` | `#1E3A8A` |
| **محايد** | رمادي | `#64748B` | `#F8FAFC` | `#E2E8F0` | `#334155` |

### ألوان الحالات الكاملة

#### Success (Teal)
```
bg: #F0FDFA → border: #99F6E4 → icon: #0D9488 → text: #134E4A
badge-bg: #CCFBF1 → badge-text: #0F766E
button-bg: #0D9488 → button-hover: #0F766E
```

#### Warning (Amber)
```
bg: #FFFBEB → border: #FDE68A → icon: #D97706 → text: #78350F
badge-bg: #FEF3C7 → badge-text: #92400E
button-bg: #D97706 → button-hover: #B45309
```

#### Danger (Rose)
```
bg: #FFF1F2 → border: #FECDD3 → icon: #E11D48 → text: #881337
badge-bg: #FFE4E6 → badge-text: #BE123C
button-bg: #E11D48 → button-hover: #BE123C
```

---

## 3. ألوان الخلفيات والأسطح

| السطح | Light Mode | الاستخدام |
|-------|------------|-----------|
| **Page Background** | `#F8FAFC` (slate-50) | خلفية كل الصفحات |
| **Card** | `#FFFFFF` | بطاقات، modals، popovers |
| **Card Elevated** | `#FFFFFF` + `shadow-md` | بطاقات بارزة |
| **Card Hover** | `#FFFFFF` + `shadow-lg` | عند التحويم |
| **Sidebar** | `#FFFFFF` | الشريط الجانبي |
| **Sidebar Header** | `#1E40AF` (blue-800) | رأس الشريط الجانبي |
| **Sidebar Active** | `#EFF6FF` (blue-50) | العنصر النشط |
| **Header / Navbar** | `#FFFFFF` | الشريط العلوي |
| **Input** | `#FFFFFF` | حقول الإدخال |
| **Input Focus** | `#FFFFFF` + ring `#93C5FD` | حقل مُركّز |
| **Input Disabled** | `#F1F5F9` (slate-100) | حقل معطّل |
| **Table Header** | `#F8FAFC` (slate-50) | رأس الجدول |
| **Table Row Hover** | `#F0F5FF` (blue-25) | صف عند التحويم |
| **Table Row Selected** | `#EFF6FF` (blue-50) | صف مُحدد |
| **Overlay / Backdrop** | `rgba(15, 23, 42, 0.6)` | خلفية modals |
| **Skeleton** | `#E2E8F0` → `#F1F5F9` | تحميل |
| **Landing / Auth Pages** | `#F8FAFC` (slate-50) | خلفية صفحات الهبوط واختيار الحساب |
| **Landing Header** | `#FFFFFF` + `border-b border-slate-200` | الشريط العلوي في صفحات الهبوط |
| **Landing Footer** | `#FFFFFF` + `border-t border-slate-200` | الفوتر في صفحات الهبوط |

---

## 4. ألوان النصوص

| المستوى | Hex | الاستخدام |
|---------|-----|-----------|
| **Primary** | `#0F172A` (slate-900) | عناوين رئيسية، أرقام كبيرة |
| **Secondary** | `#1E293B` (slate-800) | نص الجسم الأساسي |
| **Tertiary** | `#334155` (slate-700) | labels، عناوين فرعية |
| **Muted** | `#64748B` (slate-500) | وصف ثانوي، timestamps |
| **Placeholder** | `#94A3B8` (slate-400) | placeholder حقول الإدخال |
| **Disabled** | `#CBD5E1` (slate-300) | نص معطّل |
| **On Blue** | `#FFFFFF` | نص أبيض على خلفيات زرقاء |
| **On Blue Muted** | `#BFDBFE` (blue-200) | نص ثانوي على خلفيات زرقاء |
| **Link** | `#2563EB` (blue-600) | روابط |
| **Link Hover** | `#1D4ED8` (blue-700) | روابط عند التحويم |
| **Link Visited** | `#1E40AF` (blue-800) | روابط مزارة |

---

## 5. الخطوط والتايبوغرافي

### عائلة الخط

```tsx
// الخط الوحيد لكل المنصات
const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

// في tailwind.config.ts
fontFamily: {
  sans: ['var(--font-cairo)', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
}
```

### مقياس الخطوط (Type Scale)

> **النظام:** مقياس رياضي بمعامل 1.25 (Major Third)

| الرمز | الحجم (rem) | الحجم (px) | الوزن | ارتفاع السطر | الاستخدام |
|-------|-------------|------------|-------|-------------|-----------|
| `display-xl` | 3rem | 48px | 800 | 1.1 | صفحة الهبوط hero فقط |
| `display` | 2.25rem | 36px | 700 | 1.15 | عناوين صفحات رئيسية |
| `h1` | 1.875rem | 30px | 700 | 1.2 | عنوان الصفحة |
| `h2` | 1.5rem | 24px | 700 | 1.25 | عنوان القسم |
| `h3` | 1.25rem | 20px | 600 | 1.3 | عنوان البطاقة |
| `h4` | 1.125rem | 18px | 600 | 1.35 | عنوان فرعي |
| `body-lg` | 1rem | 16px | 400 | 1.6 | نص كبير, وصف |
| `body` | 0.875rem | 14px | 400 | 1.6 | **النص الأساسي** |
| `body-sm` | 0.8125rem | 13px | 400 | 1.5 | نص حقول الإدخال |
| `caption` | 0.75rem | 12px | 500 | 1.5 | شارات, timestamps, helper text |
| `overline` | 0.6875rem | 11px | 600 | 1.4 | labels علوية، section headers |

### أوزان الخط

| الوزن | القيمة | الاستخدام |
|-------|--------|-----------|
| Light | 300 | نصوص طويلة فقط (paragraphs في landing) |
| Regular | 400 | نص الجسم، حقول الإدخال |
| Medium | 500 | labels، links، أزرار صغيرة |
| Semibold | 600 | عناوين فرعية، أزرار، tabs نشطة |
| Bold | 700 | عناوين صفحات، أرقام إحصائيات |
| ExtraBold | 800 | display headings فقط |

### تباعد الأحرف (Letter Spacing)

| النوع | القيمة |
|-------|--------|
| عناوين كبيرة | `-0.025em` (أضيق قليلاً) |
| نص عادي | `0` (طبيعي) |
| overline / labels | `0.05em` (أوسع قليلاً) |
| أرقام | `tabular-nums` + `0.01em` |

---

## 6. المسافات والأبعاد

### مقياس المسافات (4px base)

| الرمز | القيمة | البكسل | الاستخدام |
|-------|--------|--------|-----------|
| `0.5` | 0.125rem | 2px | فجوة بين أيقونة صغيرة ونصها |
| `1` | 0.25rem | 4px | padding داخلي صغير جداً |
| `1.5` | 0.375rem | 6px | gap بين tags |
| `2` | 0.5rem | 8px | padding شارات، gap بين عناصر مضغوطة |
| `2.5` | 0.625rem | 10px | padding أزرار صغيرة |
| `3` | 0.75rem | 12px | padding أزرار عادية، gap داخلي |
| `4` | 1rem | 16px | **padding قياسي**، gap بطاقات على الموبايل |
| `5` | 1.25rem | 20px | padding بطاقات |
| `6` | 1.5rem | 24px | **padding بطاقات كبيرة**، gap أقسام |
| `8` | 2rem | 32px | فوارق عمودية بين أقسام |
| `10` | 2.5rem | 40px | margin علوي/سفلي لأقسام رئيسية |
| `12` | 3rem | 48px | padding hero sections |
| `16` | 4rem | 64px | فوارق كبيرة بين أقسام الصفحة |
| `20` | 5rem | 80px | padding رأسي landing sections |

### نظام الحاويات (Containers)

| الحاوية | العرض الأقصى | الاستخدام |
|---------|-------------|-----------|
| `container-sm` | 640px | modals صغيرة، forms login |
| `container-md` | 768px | modals كبيرة |
| `container-lg` | 1024px | محتوى ضيق |
| `container-xl` | 1280px | **الحاوية الرئيسية للمحتوى** |
| `container-2xl` | 1536px | الصفحات العريضة |
| full | 100% | fluid layouts |

### padding الصفحات

```
الموبايل:   px-4 py-4    (16px)
التابلت:    px-6 py-6    (24px)
الكمبيوتر:  px-8 py-8    (32px)
```

### نظام الشبكة (Grid)

```css
/* شبكة البطاقات الرئيسية */
grid-template-columns: repeat(1, 1fr);                    /* موبايل */
grid-template-columns: repeat(2, 1fr);                    /* sm (640px+) */
grid-template-columns: repeat(3, 1fr);                    /* lg (1024px+) */
grid-template-columns: repeat(4, 1fr);                    /* xl (1280px+) */
gap: 1rem;                                                 /* موبايل */
gap: 1.5rem;                                               /* md+ */

/* شبكة الإحصائيات */
grid-template-columns: repeat(2, 1fr);                    /* موبايل */
grid-template-columns: repeat(4, 1fr);                    /* md+ */
gap: 1rem;                                                 /* موبايل */
gap: 1.5rem;                                               /* md+ */

/* شبكة النماذج (forms) */
grid-template-columns: 1fr;                                /* موبايل */
grid-template-columns: repeat(2, 1fr);                    /* md+ */
gap: 1.5rem;
```

---

## 7. الحواف المستديرة (Border Radius)

| الرمز | القيمة | الاستخدام |
|-------|--------|-----------|
| `radius-xs` | 4px | checkboxes، tags صغيرة |
| `radius-sm` | 6px | أزرار صغيرة، inputs صغيرة |
| `radius-md` | 8px | **أزرار وحقول إدخال** |
| `radius-lg` | 12px | **بطاقات**، dropdowns، popovers |
| `radius-xl` | 16px | modals، بطاقات كبيرة |
| `radius-2xl` | 20px | hero cards، login containers |
| `radius-full` | 9999px | شارات pills، avatars، toggles |

### القاعدة الموحّدة

```
Buttons → radius-md (8px)
Inputs → radius-md (8px)
Cards → radius-lg (12px)
Modals / Dialogs → radius-xl (16px)
Badges / Pills → radius-full
Avatars → radius-full
Tooltips → radius-md (8px)
```

---

## 8. الظلال (Shadows)

> **المبدأ:** ظلال ناعمة مع لمسة زرقاء خفيفة بدلاً من الأسود النقي.

| المستوى | القيمة | الاستخدام |
|---------|--------|-----------|
| `shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.05)` | inputs عادية |
| `shadow-sm` | `0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)` | بطاقات عادية |
| `shadow-md` | `0 4px 6px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.04)` | بطاقات hover |
| `shadow-lg` | `0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.03)` | dropdowns، popovers |
| `shadow-xl` | `0 20px 25px rgba(15, 23, 42, 0.08), 0 8px 10px rgba(15, 23, 42, 0.03)` | modals |
| `shadow-2xl` | `0 25px 50px rgba(15, 23, 42, 0.15)` | floating panels |
| `shadow-blue` | `0 4px 14px rgba(37, 99, 235, 0.25)` | أزرار primary hover |
| `shadow-inner` | `inset 0 2px 4px rgba(15, 23, 42, 0.06)` | inputs pressed |

### نمط التحويم الموحّد

```
العادي → shadow-sm + border-slate-200
Hover → shadow-md + border-blue-200 + translate-y(-1px)
Active → shadow-xs + translate-y(0)
```

---

## 9. المكونات (Components)

### 9.1 الأزرار (Buttons)

#### المتغيّرات

| المتغيّر | الخلفية | النص | الحد | الظل |
|----------|---------|------|------|------|
| **Primary** | `#2563EB` | `#FFFFFF` | — | `shadow-blue` on hover |
| **Primary Hover** | `#1D4ED8` | `#FFFFFF` | — | ↑ |
| **Primary Active** | `#1E40AF` | `#FFFFFF` | — | `shadow-xs` |
| **Secondary** | `#EFF6FF` | `#2563EB` | `#BFDBFE` | — |
| **Secondary Hover** | `#DBEAFE` | `#1D4ED8` | `#93C5FD` | `shadow-sm` |
| **Outline** | `transparent` | `#334155` | `#E2E8F0` | — |
| **Outline Hover** | `#F8FAFC` | `#1E293B` | `#CBD5E1` | `shadow-sm` |
| **Ghost** | `transparent` | `#64748B` | — | — |
| **Ghost Hover** | `#F1F5F9` | `#334155` | — | — |
| **Danger** | `#E11D48` | `#FFFFFF` | — | — |
| **Danger Hover** | `#BE123C` | `#FFFFFF` | — | rose shadow |
| **Success** | `#0D9488` | `#FFFFFF` | — | — |
| **Disabled** | `#F1F5F9` | `#94A3B8` | `#E2E8F0` | — |

#### الأحجام

| الحجم | الارتفاع | Padding | الخط | الأيقونة | border-radius |
|-------|---------|---------|------|---------|---------------|
| `xs` | 28px | `px-2.5` | 12px (caption) | 14px | 6px |
| `sm` | 32px | `px-3` | 13px (body-sm) | 16px | 6px |
| `md` | 36px | `px-4` | 14px (body) | 18px | 8px |
| `lg` | 40px | `px-5` | 14px (body) | 20px | 8px |
| `xl` | 44px | `px-6` | 16px (body-lg) | 20px | 8px |
| `icon-sm` | 32×32px | — | — | 16px | 8px |
| `icon-md` | 36×36px | — | — | 18px | 8px |
| `icon-lg` | 40×40px | — | — | 20px | 8px |

#### مواصفات التنفيذ

```tsx
// ButtonProps
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}
```

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #93C5FD;
}

.btn:active {
  transform: translateY(0) scale(0.98);
}
```

### 9.2 البطاقات (Cards)

#### أنواع البطاقات

| النوع | الوصف | المواصفات |
|-------|-------|-----------|
| **Base Card** | بطاقة عادية | `bg-white border border-slate-200 rounded-[12px] shadow-sm` |
| **Stat Card** | بطاقة إحصائية | base + أيقونة ملوّنة + رقم كبير |
| **Interactive Card** | بطاقة تفاعلية | base + `hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5` |
| **Selected Card** | بطاقة مُحددة | `bg-blue-50 border-blue-300 ring-1 ring-blue-200` |
| **Elevated Card** | بطاقة مرتفعة | `bg-white border-0 shadow-md rounded-[16px]` |
| **Section Card** | بطاقة قسم | base + header `bg-slate-50 border-b` |

#### هيكل البطاقة

```tsx
interface CardProps {
  variant: 'base' | 'interactive' | 'selected' | 'elevated' | 'section';
  padding: 'compact' | 'default' | 'spacious';
}

// Padding values
compact:  p-4          // 16px — mobile أو بطاقات صغيرة
default:  p-5          // 20px — الحجم القياسي
spacious: p-6          // 24px — بطاقات كبيرة

// Card Header
header: px-5 py-4 bg-slate-50 border-b border-slate-200

// Card Footer
footer: px-5 py-3 bg-slate-50 border-t border-slate-200
```

#### بطاقة الإحصائيات

```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │ 📊 │  عنوان البطاقة               │ p-5
│ └────┘  نص ثانوي                    │
│                                      │
│  2,547                               │ text-3xl font-bold text-slate-900
│  +12.5% ↑                           │ text-caption text-teal-600
└─────────────────────────────────────┘

الأيقونة: w-10 h-10 rounded-lg bg-blue-50 text-blue-600
العنوان: text-body text-slate-600 font-medium
الرقم: text-3xl text-slate-900 font-bold tabular-nums
التغيير: text-caption font-medium + لون الحالة
```

### 9.3 حقول الإدخال (Inputs)

| الحالة | الحد | الخلفية | Ring |
|--------|------|---------|------|
| **Default** | `#E2E8F0` (slate-200) | `#FFFFFF` | — |
| **Hover** | `#CBD5E1` (slate-300) | `#FFFFFF` | — |
| **Focus** | `#2563EB` (blue-600) | `#FFFFFF` | `0 0 0 3px rgba(37, 99, 235, 0.12)` |
| **Error** | `#E11D48` (rose-600) | `#FFFFFF` | `0 0 0 3px rgba(225, 29, 72, 0.12)` |
| **Disabled** | `#E2E8F0` (slate-200) | `#F1F5F9` (slate-100) | — |
| **Filled** | `#CBD5E1` (slate-300) | `#FFFFFF` | — |

#### أحجام الإدخال

| الحجم | الارتفاع | Padding | الخط |
|-------|---------|---------|------|
| `sm` | 32px | `px-3 py-1.5` | 13px |
| `md` | 36px | `px-3.5 py-2` | 14px |
| `lg` | 40px | `px-4 py-2.5` | 14px |
| `xl` | 44px | `px-4 py-3` | 16px |

```tsx
interface InputProps {
  size: 'sm' | 'md' | 'lg' | 'xl';
  state: 'default' | 'error' | 'success' | 'disabled';
  label?: string;              // text-body-sm font-medium text-slate-700
  helperText?: string;         // text-caption text-slate-500
  errorText?: string;          // text-caption text-rose-600
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
}

// Label: mb-1.5 (6px gap between label and input)
// Helper/Error: mt-1.5 (6px gap below input)
// Group gap: space-y-5 (20px between form groups)
```

### 9.4 الشارات (Badges)

| النوع | الخلفية | النص | الحد |
|-------|---------|------|------|
| **Default** | `#F1F5F9` | `#475569` | — |
| **Blue** | `#EFF6FF` | `#1D4ED8` | — |
| **Success** | `#F0FDFA` | `#0F766E` | — |
| **Warning** | `#FFFBEB` | `#92400E` | — |
| **Danger** | `#FFF1F2` | `#BE123C` | — |
| **Outlined** | `transparent` | `#64748B` | `#E2E8F0` |

```
الحجم: px-2 py-0.5 text-caption font-medium rounded-full
مع أيقونة: gap-1 + w-3.5 h-3.5
مع dot: gap-1.5 + w-1.5 h-1.5 rounded-full
```

### 9.5 الجداول (Tables)

```
┌─────────────────────────────────────────────────┐
│ Header Row     bg-slate-50 text-slate-600        │
│                text-caption font-semibold          │
│                px-4 py-3 uppercase tracking-wide   │
├─────────────────────────────────────────────────┤
│ Body Row       bg-white text-slate-800            │
│                text-body px-4 py-3                 │
│ Hover:         bg-blue-25 (#F0F5FF)              │
│ Selected:      bg-blue-50 border-r-2 border-blue-600 │
│ Divider:       border-b border-slate-100          │
├─────────────────────────────────────────────────┤
│ Footer Row     bg-slate-50 text-slate-600        │
│                px-4 py-3                           │
└─────────────────────────────────────────────────┘

/* Pagination */
Current page: bg-blue-600 text-white rounded-md
Other pages: text-slate-600 hover:bg-slate-100 rounded-md
Size: h-8 w-8 text-body-sm
```

### 9.6 القوائم المنسدلة (Dropdowns / Selects)

```css
/* Trigger */
مثل Input تماماً + سهم يمين (chevron-down)

/* Menu */
bg: white
border: 1px solid #E2E8F0
border-radius: 12px
shadow: shadow-lg
padding: 4px
max-height: 280px
overflow-y: auto
animation: fadeIn 150ms + slideDown 150ms

/* Option */
padding: 8px 12px
border-radius: 8px
text: text-body text-slate-800

/* Option Hover */
bg: #F8FAFC (slate-50)

/* Option Selected */
bg: #EFF6FF (blue-50)
text: #2563EB (blue-600)
font-weight: 500
checkmark icon on the left

/* Option Disabled */
text: #94A3B8 (slate-400)
cursor: not-allowed
```

### 9.7 Modals / Dialogs

```
Overlay: bg-slate-900/60 backdrop-blur-sm
Container: bg-white rounded-2xl shadow-xl
Max-width: sm(440px) | md(560px) | lg(720px) | xl(960px) | full(calc(100% - 2rem))

Header: px-6 pt-6 pb-0
  Title: text-h3 font-semibold text-slate-900
  Description: text-body text-slate-500 mt-1

Body: px-6 py-5

Footer: px-6 pb-6 pt-0 flex gap-3 justify-end
  Primary Action: Button variant="primary"
  Secondary Action: Button variant="outline"

Close button: absolute top-4 left-4 (RTL: right-4)
  icon-button ghost size-sm
```

### 9.8 التنبيهات (Alerts / Toasts)

#### Alert (inline)
```
border-radius: 12px
padding: 16px
icon: 20px on right (RTL)
gap: 12px (icon to text)

Info:    bg-blue-50 border border-blue-200 text-blue-900
Success: bg-teal-50 border border-teal-200 text-teal-900
Warning: bg-amber-50 border border-amber-200 text-amber-900
Danger:  bg-rose-50 border border-rose-200 text-rose-900
```

#### Toast (floating)
```
position: top-center (موبايل) | top-right (كمبيوتر)
bg: white
border: 1px solid slate-200
border-radius: 12px
shadow: shadow-lg
padding: 12px 16px
max-width: 420px
min-width: 300px

اتجاه الدخول: slideDown + fadeIn (200ms)
اتجاه الخروج: slideUp + fadeOut (150ms)
مدة العرض: 4 ثوان (قابل للتعديل)
```

### 9.9 Sidebar (الشريط الجانبي)

```
العرض: w-64 (256px) desktop | w-72 (288px) if needed
الخلفية: bg-white border-l border-slate-200 (RTL: border-r)

/* Header */
h-[72px] px-5 bg-blue-800
  Logo: h-8 w-auto
  System Name: text-body-lg font-bold text-white

/* Navigation Item */
mx-3 px-3 py-2.5 rounded-lg text-body font-medium
gap: 12px (icon to label)
icon: w-5 h-5

  Default:  text-slate-600
  Hover:    bg-slate-50 text-slate-900
  Active:   bg-blue-50 text-blue-700 font-semibold
            border-right: 3px solid blue-600 (RTL)

/* Section Label */
px-4 pt-6 pb-2 text-overline font-semibold text-slate-400 uppercase

/* Footer */
border-t border-slate-200 p-4
  User avatar + name + role
  Logout button: ghost danger

/* Mobile Overlay */
z-50 + backdrop bg-slate-900/50
slide-in from right (RTL)
transition: 300ms ease-in-out
```

### 9.10 Tabs

```
/* Tab Bar */
border-b: 2px solid slate-200

/* Tab Item */
px-4 py-2.5 text-body font-medium
gap: 8px (icon to text)
icon: w-4 h-4

  Default:  text-slate-500, border-b-2 border-transparent
  Hover:    text-slate-700
  Active:   text-blue-600, border-b-2 border-blue-600, font-semibold
  Disabled: text-slate-300

/* Tab with Count Badge */
badge: ml-2 bg-slate-100 text-slate-600 text-caption px-1.5 py-0.5 rounded-full
Active badge: bg-blue-100 text-blue-700
```

### 9.11 Avatar

```
Sizes: xs(24px) sm(32px) md(40px) lg(48px) xl(64px) 2xl(96px)
Shape: rounded-full
Border: 2px solid white (when stacked)

Fallback: bg-blue-100 text-blue-700 font-semibold
  الحرف الأول من الاسم

Online indicator: absolute bottom-0 right-0
  w-3 h-3 bg-teal-500 border-2 border-white rounded-full
```

### 9.12 Empty States

```
Container: text-center py-16

Icon: w-16 h-16 mx-auto text-slate-300 mb-4
  (أو illustration بتدرّج أزرق خفيف)

Title: text-h4 text-slate-700 font-semibold mb-2
Description: text-body text-slate-500 max-w-sm mx-auto mb-6

CTA: Button variant="primary" size="md"
```

### 9.13 Loading States

```
/* Skeleton */
bg: slate-200 animate-pulse rounded-md
Duration: 1.5s ease-in-out infinite

/* Spinner */
w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin

/* Progress Bar */
Track: h-2 bg-slate-100 rounded-full
Fill: bg-blue-600 rounded-full transition-all 500ms

/* Page Loader */
centered, spinner w-8 h-8 + text "جاري التحميل..." text-body text-slate-500
```

### 9.14 Tooltip

```
bg: #0F172A (slate-900)
text: white text-caption
padding: 6px 12px
border-radius: 8px
shadow: shadow-lg
max-width: 240px

Arrow: 6px
Animation: fadeIn 150ms + scale from 0.95
Delay: 300ms show, 0ms hide
```

### 9.15 Breadcrumb

```
text: text-body-sm
separator: "/"  text-slate-300  mx-2

items: text-slate-500 hover:text-blue-600
active (last): text-slate-800 font-medium
```

### 9.16 Switch / Toggle

```
Track: w-10 h-6 rounded-full
  Off: bg-slate-200
  On:  bg-blue-600

Thumb: w-5 h-5 rounded-full bg-white shadow-sm
  transition: transform 200ms ease

Focus ring: 0 0 0 3px rgba(37, 99, 235, 0.12)
```

### 9.17 Checkbox & Radio

```
Checkbox:
  size: w-4 h-4 rounded-xs (4px)
  border: 1.5px solid slate-300
  checked: bg-blue-600 border-blue-600 + white check icon
  focus: ring blue-300/20

Radio:
  size: w-4 h-4 rounded-full
  border: 1.5px solid slate-300
  checked: border-blue-600 + inner circle w-2 h-2 bg-blue-600
  focus: ring blue-300/20

Label: text-body text-slate-700 gap-2 from the control
```

---

## 10. التصميم المتجاوب (Responsive Design)

### نقاط التوقف (Breakpoints)

| الاسم | القيمة | الأجهزة |
|-------|--------|---------|
| `xs` | 0 – 479px | هواتف صغيرة |
| `sm` | 480px+ | هواتف كبيرة |
| `md` | 768px+ | أجهزة لوحية portrait |
| `lg` | 1024px+ | أجهزة لوحية landscape / لابتوب |
| `xl` | 1280px+ | كمبيوتر مكتبي |
| `2xl` | 1536px+ | شاشات كبيرة |

### سلوك التخطيط حسب الشاشة

| العنصر | موبايل (< 768px) | تابلت (768px+) | كمبيوتر (1024px+) |
|--------|-------------------|----------------|-------------------|
| **Sidebar** | مخفي + hamburger | مخفي + hamburger | ظاهر w-64 ثابت |
| **Header** | sticky, h-14 | sticky, h-14 | sticky, h-16 |
| **Content padding** | px-4 py-4 | px-6 py-6 | px-8 py-6 |
| **Grid بطاقات** | 1 عمود | 2 أعمدة | 3-4 أعمدة |
| **Grid إحصائيات** | 2 أعمدة | 2 أعمدة | 4 أعمدة |
| **الجدول** | أفقي scrollable | عادي | عادي |
| **Dialog** | fullscreen (h-full) | centered max-w-md | centered max-w-lg |
| **Forms** | 1 عمود | 2 أعمدة | 2 أعمدة |
| **Navigation tabs** | scrollable horizontal | عادي | عادي |
| **Toast** | top-center w-full px-4 | top-right max-w-420px | top-right max-w-420px |
| **Font base** | 14px | 14px | 14px |
| **Button default** | size md, full-width in forms | size md | size md |
| **Card padding** | p-4 (compact) | p-5 (default) | p-5 (default) |
| **Stat number** | text-2xl | text-3xl | text-3xl |

### قواعد Touch Target

```
الحد الأدنى لمساحة اللمس: 44 × 44px
المسافة بين عناصر قابلة للنقر: 8px minimum
الأزرار على الموبايل داخل forms: full-width
Swipe gestures: sidebar open/close
```

### أنماط تخطيط الموبايل

```
/* Stack buttons on mobile */
@media (max-width: 639px) {
  .btn-group {
    flex-direction: column;
    width: 100%;
  }
  .btn-group > * {
    width: 100%;
  }
}

/* التمرير الأفقي للجداول */
@media (max-width: 767px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

---

## 11. المنصات الأربع

### 11.1 الموقع الرئيسي (Landing + Auth Select)

```
اللون المهيمن: blue-600/700 (عناصر تفاعلية + تدرّجات) + خلفيات فاتحة
الخلفية: #F8FAFC (slate-50) — بيضاء نظيفة
الخط: Cairo — كل الأوزان من 300 إلى 800
المبدأ: عصري ومتحرّك — خلفية فاتحة مع حركات سلسة، بطاقات تفاعلية، وأقسام متعددة
المكتبات: shadcn/ui (Card, Button) + Lucide React + Framer Motion (متقدّم)

═══════════════════════════════════════════════════
 Header (مشترك بين Landing و Auth-Select)
═══════════════════════════════════════════════════
bg: white/80 + backdrop-blur-xl (شفافية مع ضبابية)
border-bottom: 1px solid slate-200/60
position: sticky top-0 z-50
هيكل: h-16 flex items-center justify-between max-w-6xl mx-auto px-6 lg:px-8
انيميشن الدخول: y: -60 → 0, opacity: 0 → 1 (duration: 0.6s)

لوجو:
  w-10 h-10 rounded-xl
  bg: gradient from-blue-600 to-blue-700
  shadow: shadow-lg shadow-blue-600/20
  أيقونة: Sparkles w-5 h-5 text-white
  whileHover: scale(1.05) + rotate(5deg)
  whileTap: scale(0.95)

اسم النظام: text-base (16px) font-bold text-slate-900
وصف فرعي: text-[11px] font-semibold text-slate-400 uppercase tracking-widest

زر تسجيل الدخول (في Header):
  variant: outline, size: sm
  rounded-lg text-sm font-medium
  border-slate-200 text-slate-600
  hover: text-blue-600 border-blue-200 bg-blue-50/50
  whileHover: x: -3 (spring stiffness: 300)

═══════════════════════════════════════════════════
 صفحة الهبوط (Landing / page.tsx) — أقسام متعددة
═══════════════════════════════════════════════════

--- Hero Section (min-h-[85vh]) ---

خلفية متحركة:
  - Gradient Orbs: كرات ضبابية كبيرة (500-800px) bg-gradient blue-100/indigo-100
    تتحرك باستمرار: scale [1→1.15→1], rotate [0→10→0]
    duration: 10-12s, repeat: Infinity, ease: easeInOut
  - Floating Particles: 7 جسيمات دائرية bg-blue-400/20
    حركة عشوائية مستمرة: y/x/opacity/scale
    duration: 8s, repeat: Infinity
  - Grid Pattern: خطوط شبكية خفيفة rgba(59,130,246,0.03) bg-size: 60px

Stagger Container:
  staggerChildren: 0.12s, delayChildren: 0.1s
  كل عنصر: opacity: 0→1, y: 40→0
  ease: [0.22, 1, 0.36, 1] (custom spring)

Badge:
  bg-white border border-slate-200/80 text-blue-600
  px-5 py-2 rounded-full text-sm font-semibold
  shadow-sm backdrop-blur-sm
  نقطة خضراء/زرقاء مع animate-ping
  whileHover: scale(1.05)
  mb-10

عنوان (h1):
  text-4xl (36px) → sm:text-5xl (48px) → lg:text-[3.75rem] (60px) → xl:text-[4.25rem] (68px)
  font-extrabold text-slate-900 leading-[1.15] tracking-tight
  السطر الثاني "StarNova ERP":
    bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-600
    bg-clip-text text-transparent
    animated backgroundPosition (6s, repeat: Infinity)

وصف:
  text-lg (18px) → sm:text-xl (20px) → lg:text-[1.375rem] (22px)
  text-slate-500 font-normal leading-[1.7]
  max-w-2xl mb-12

CTA الأساسي:
  gap-3 rounded-xl px-10 h-14 text-base font-bold
  bg: gradient from-blue-700 to-blue-600 text-white
  hover: from-blue-800 to-blue-700
  shadow: [0_8px_30px_rgba(37,99,235,0.3)]
  hover shadow: [0_12px_40px_rgba(37,99,235,0.4)]
  whileHover: scale(1.03), y: -2
  whileTap: scale(0.98)
  أيقونات: LogIn w-5 + ArrowLeft w-5

CTA الثانوي:
  variant: outline, rounded-xl px-8 h-14 text-base font-semibold
  border-slate-200 text-slate-700
  hover: bg-white border-slate-300
  أيقونة: ChevronDown w-5

Scroll Indicator (أسفل Hero):
  w-6 h-10 rounded-full border-2 border-slate-300/60
  نقطة داخلية تتحرك: y [0→12→0], opacity [1→0.3→1]
  duration: 2s, repeat: Infinity

--- Stats Section ---

bg: white, border-y border-slate-100
py-16
grid: 2 أعمدة (موبايل) → 4 أعمدة (كمبيوتر)
gap-8

كل إحصائية:
  رقم: text-3xl → sm:text-4xl → lg:text-5xl font-extrabold text-slate-900
  عدّاد متحرك (AnimatedCounter): يعدّ من 0 إلى الرقم المستهدف
    duration: 2s, ease: easeOut
    يبدأ فقط عند ظهور العنصر (useInView, once: true)
  وصف: text-sm → sm:text-base font-medium text-slate-500

الإحصائيات:
  5000+ متدرب نشط | 200+ دورة تدريبية | 50+ مركز تدريب | 99% رضا العملاء

--- Features Section (6 بطاقات) ---

py-20 lg:py-28

عنوان القسم:
  badge: text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wide
  h2: text-3xl → sm:text-4xl → lg:text-[2.75rem] font-extrabold text-slate-900 tracking-tight
  وصف: text-lg → sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed
  mb-16 lg:mb-20

Grid: 1 عمود (موبايل) → 2 أعمدة (تابلت) → 3 أعمدة (كمبيوتر)
gap: 6 → lg:gap-8

Feature Card (shadcn Card):
  p-7 lg:p-8 bg-white border border-slate-200/80 rounded-2xl
  shadow-sm → hover: shadow-xl shadow-slate-200/50
  hover: y: -8 (duration: 0.3s)
  group-hover: border يتغيّر حسب لون الفئة

  أيقونة: w-14 h-14 rounded-2xl
    bg حسب اللون (blue-50, indigo-50, sky-50, emerald-50, amber-50, violet-50)
    أيقونة: w-7 h-7 بلون مطابق
    whileHover: scale(1.1) + rotate(5deg) (spring stiffness: 300)

  عنوان: text-xl → lg:text-[1.375rem] font-bold text-slate-900 tracking-tight
  وصف: text-[15px] → lg:text-base text-slate-500 leading-[1.7]

  زخرفة زاوية: دائرة ضبابية تظهر عند hover (opacity 0→1, blur-2xl)

  انيميشن الدخول: staggered (delay: i × 0.1s)
    opacity: 0→1, y: 50→0, scale: 0.95→1
    ease: [0.22, 1, 0.36, 1]
    يبدأ عند ظهور القسم (useInView)

ألوان الفئات الست:
  blue    → bg-blue-50    / text-blue-600    / group-hover:border-blue-200
  indigo  → bg-indigo-50  / text-indigo-600  / group-hover:border-indigo-200
  sky     → bg-sky-50     / text-sky-600     / group-hover:border-sky-200
  emerald → bg-emerald-50 / text-emerald-600 / group-hover:border-emerald-200
  amber   → bg-amber-50   / text-amber-600   / group-hover:border-amber-200
  violet  → bg-violet-50  / text-violet-600  / group-hover:border-violet-200

--- CTA Section (دعوة للعمل) ---

py-20 lg:py-24 max-w-4xl mx-auto
انيميشن: whileInView opacity: 0→1, y: 40→0 (duration: 0.7s)

bg: gradient from-blue-600 via-blue-700 to-indigo-700
rounded-3xl p-10 sm:p-14 lg:p-16 text-center

زخارف خلفية:
  دائرتان bg-white/5 تدوران ببطء (20s + 15s, repeat: Infinity)

عنوان: text-3xl → sm:text-4xl → lg:text-[2.75rem] font-extrabold text-white tracking-tight
وصف: text-lg → sm:text-xl text-blue-100 max-w-xl mx-auto leading-relaxed
زر CTA:
  bg-white text-blue-700 hover:bg-blue-50
  rounded-xl px-10 h-14 text-base font-bold
  shadow: [0_8px_30px_rgba(0,0,0,0.2)]
  whileHover: scale(1.05), y: -2
  whileTap: scale(0.97)

═══════════════════════════════════════════════════
 صفحة اختيار الحساب (Auth-Select / auth-select/page.tsx)
═══════════════════════════════════════════════════
خلفية: #F8FAFC (slate-50)
عنوان: h1 (1.875rem/30px) font-bold text-slate-900
وصف: body (0.875rem/14px) text-slate-500 + اسم المركز بـ text-blue-900 font-semibold
بطاقات: Interactive Card — 3 أعمدة على الكمبيوتر، عمود واحد على الموبايل

/* بطاقة اختيار الحساب */
bg: white rounded-xl border border-slate-200 shadow-sm
hover: shadow-md border-blue-200 -translate-y-0.5
أيقونة: w-12 h-12 rounded-xl bg-blue-50 text-blue-600
  hover: bg-blue-100 scale-105
عنوان: h3 (1.25rem/20px) font-semibold text-slate-900
وصف: body-sm (0.8125rem/13px) text-slate-500
رابط: text-[0.8125rem] font-medium text-blue-600 hover:text-blue-700
  مع أيقونة ChevronLeft
انيميشن: staggered fadeIn + slideUp عبر Framer Motion (delay 0.08s لكل بطاقة)

═══════════════════════════════════════════════════
 Footer (مشترك)
═══════════════════════════════════════════════════
bg: white border-t border-slate-200
h-16 flex items-center justify-center max-w-6xl mx-auto
text: text-sm (14px) text-slate-400 font-medium
```

### 11.2 لوحة تحكم المسؤول (Admin Dashboard)

```
اللون المهيمن: blue-600 (sidebar header) + slate (محتوى)
المبدأ: وظيفي وكفء — كثافة معلومات عالية

/* Sidebar */
bg: white, header bg-blue-800
active item: bg-blue-50 text-blue-700 border-r-3 border-blue-600

/* Content Area */
bg: slate-50
cards: white rounded-lg shadow-sm

/* Data Tables */
عريضة مع أعمدة كثيرة
header: bg-slate-50 text-overline
actions: icon buttons inline

/* الإحصائيات */
4 أعمدة stat cards بأيقونات زرقاء
charts: blue-600 primary, blue-300 secondary, blue-100 tertiary

/* أشرطة الحالة */
active: blue, success: teal, warning: amber, danger: rose
```

### 11.3 منصة المتدرب (Trainee Portal)

```
اللون المهيمن: blue-600 + مساحات بيضاء واسعة
المبدأ: ودود ونظيف — مساحات واسعة، عناصر أقل

/* Sidebar / Bottom Nav (موبايل) */
موبايل: bottom tab bar h-16 bg-white border-t
  5 tabs: الرئيسية، الجدول، الدرجات، المالية، المزيد
  active: text-blue-600 + dot indicator
كمبيوتر: sidebar مثل Admin لكن بعدد أقل من العناصر

/* Welcome Card */
bg: gradient from-blue-600 to-blue-700 text-white rounded-xl
padding: p-6
avatar: ring-4 ring-white/30

/* Content Cards */
أكبر padding (p-6) ونص أكبر من Admin
rounded-xl (16px) بدل lg
hover effects أوضح

/* Quick Actions */
grid 2×2 (موبايل) | 4 أعمدة (كمبيوتر)
bg: blue-50 rounded-xl p-4
icon: text-blue-600 w-8 h-8
hover: bg-blue-100

/* Schedule Cards */
Today: border-blue-600 bg-blue-50/50
Upcoming: default card
```

### 11.4 منصة المحاضر (Instructor Portal)

```
اللون المهيمن: blue-700 (أغمق قليلاً — احترافي)
المبدأ: موجّه للمهام — focus على الأدوات

/* Layout مختلف */
sidebar أضيق أو top nav tabs
سريع الوصول للمقررات

/* Course Selector */
prominent dropdown أو tabs
الكورس النشط: bg-blue-700 text-white badge

/* Grade Entry */
جدول عريض مع inline editing
cells: editable inputs داخل الجدول
save: auto-save مع مؤشر subtle

/* Attendance */
toggle buttons: حاضر(teal) / غائب(rose) / متأخر(amber)
bulk actions bar: sticky bottom

/* Analytics */
chart cards بارزة
comparison metrics: blue shades
```

---

## 12. الحركات والتأثيرات (Animations)

### 12.1 المدد القياسية

| الاسم | المدة | Easing | الاستخدام |
|-------|-------|--------|-----------|
| `instant` | 0ms | — | color changes |
| `fast` | 100ms | `ease-out` | hover states, toggles |
| `normal` | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | **الافتراضي** — dropdowns، tooltips |
| `smooth` | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | modals، sidebar |
| `entrance` | 500-700ms | `[0.22, 1, 0.36, 1]` | **حركات الدخول** — Hero، بطاقات، أقسام |
| `slow` | 800ms+ | `easeInOut` | skeleton، complex orchestrations |

### 12.2 نظام Framer Motion — Variants

```tsx
/* ─── Stagger Container (للمجموعات) ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

/* ─── عنصر فردي في المجموعة ─── */
const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── بطاقة مع تأخير مخصّص (custom index) ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};
```

### 12.3 حركات الخلفية المستمرة (Ambient)

```tsx
/* ─── Gradient Orbs — كرات ضبابية تتنفّس ─── */
animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}

/* ─── Floating Particles — جسيمات عائمة ─── */
animate={{
  y: [0, -30, 0, 20, 0],
  x: [0, 15, -10, 5, 0],
  opacity: [0.2, 0.5, 0.3, 0.6, 0.2],
  scale: [1, 1.2, 0.9, 1.1, 1],
}}
transition={{ duration: 8, delay: n, repeat: Infinity, ease: "easeInOut" }}

/* ─── Animated Gradient Text ─── */
animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
style={{ backgroundSize: "200% 200%" }}

/* ─── Scroll Indicator ─── */
animate={{ y: [0, 8, 0] }}
transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
```

### 12.4 عدّاد الأرقام المتحرك (AnimatedCounter)

```tsx
/* يستخدم useMotionValue + animate من Framer Motion */
/* يبدأ العدّ فقط عند ظهور العنصر (useInView, once: true) */
const count = useMotionValue(0);
animate(count, target, { duration: 2, ease: "easeOut" });
/* العرض بصيغة عربية: toLocaleString("ar-SA") */
```

### 12.5 عرض مشروط بالظهور (Scroll-Triggered)

```tsx
/* استخدام useInView لتفعيل الحركات عند الظهور */
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: "-80px" });

/* ثم ربطها بالحركة */
initial={{ opacity: 0, y: 30 }}
animate={isInView ? { opacity: 1, y: 0 } : {}}
transition={{ duration: 0.6 }}

/* أو مع whileInView مباشرة */
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: "-80px" }}
```

### 12.6 تأثيرات التحويم (Hover & Tap)

```tsx
/* ─── البطاقات ─── */
/* CSS transition للظل والحدود */
transition-all duration-300
hover: shadow-xl shadow-slate-200/50 + border color change

/* Framer Motion للحركة */
whileHover={{ y: -8, transition: { duration: 0.3 } }}

/* ─── الأزرار الرئيسية ─── */
whileHover={{ scale: 1.03, y: -2 }}
whileTap={{ scale: 0.98 }}
transition-all duration-300

/* ─── الأيقونات ─── */
whileHover={{ scale: 1.1, rotate: 5 }}
transition={{ type: "spring", stiffness: 300 }}

/* ─── الروابط ─── */
whileHover={{ x: -3 }}  /* RTL: تحريك لليسار */
transition={{ type: "spring", stiffness: 300 }}

/* ─── اللوجو ─── */
whileHover={{ scale: 1.05, rotate: 5 }}
whileTap={{ scale: 0.95 }}
```

### 12.7 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 13. المكتبات المقترحة

### 13.1 استبدال الكتب المتعددة بنظام موحّد

> **المشكلة الحالية:** النظام يستخدم 5+ مكتبات UI (shadcn, NextUI, MUI, HeadlessUI, custom CSS) ما يسبب تضارب وحجم bundle كبير.

#### المكتبات الأساسية (الإبقاء + تعزيز)

| المكتبة | الإصدار المقترح | السبب |
|---------|----------------|-------|
| **shadcn/ui** | أحدث | النظام الأساسي للمكونات — مبني على Radix ومتوافق مع Tailwind |
| **Tailwind CSS** | 3.4+ | نظام التنسيق الرئيسي |
| **Framer Motion** | 12+ | الحركات المعقدة (page transitions, layout animations) |
| **Lucide React** | أحدث | **مكتبة الأيقونات الوحيدة** — حذف heroicons, react-icons, MUI icons |
| **React Hook Form + Zod** | أحدث | إدارة النماذج والتحقق |

#### مكتبات جديدة مقترحة

| المكتبة | الغرض | لماذا؟ |
|---------|-------|--------|
| **@tanstack/react-table** | جداول متقدمة | Headless, sorting, filtering, pagination, virtual scrolling — أفضل من الجداول الحالية |
| **@tanstack/react-query** | إدارة البيانات | Caching, background refetch, optimistic updates — تحسين كبير للأداء |
| **@tanstack/react-virtual** | Virtualization | عرض آلاف الصفوف بكفاءة |
| **Sonner** | Toast notifications | جميل وخفيف — **حذف react-hot-toast** واستخدام Sonner فقط |
| **vaul** | Drawer / Bottom sheet | من نفس منشئ Sonner — ممتاز للموبايل |
| **nuqs** | URL state management | حفظ filters/search في URL — تجربة أفضل |
| **recharts** أو **@nivo/core** | رسوم بيانية | أجمل من Chart.js مع Tailwind — API أسهل |
| **@radix-ui/react-tooltip** | Tooltips | Accessible, positioning ممتاز (ربما موجودة ضمنياً مع shadcn) |
| **cmdk** | Command palette | ✅ موجودة — تعزيز استخدامها كـ Ctrl+K search عام |
| **react-day-picker** | منتقي تاريخ | أكثر تخصيصاً من react-datepicker — يتكامل مع shadcn |
| **embla-carousel** | Carousel / Slider | خفيف جداً (1.4KB) وقوي — للمنصة العامة والعروض |
| **input-otp** | حقول OTP | لتسجيل الدخول بالتحقق |

#### مكتبات يُنصح بإزالتها

| المكتبة | البديل |
|---------|--------|
| `@nextui-org/react` | shadcn/ui يغطي كل المكونات |
| `@mui/material` + `@mui/icons-material` | shadcn/ui + Lucide |
| `@headlessui/react` | Radix UI (أساس shadcn) |
| `@heroicons/react` | Lucide React |
| `react-icons` | Lucide React |
| `react-hot-toast` | Sonner |
| `@fontsource/roboto` | Cairo فقط |
| `chart.js` + `react-chartjs-2` | Recharts |
| `react-datepicker` | react-day-picker (بالفعل مع shadcn) |

### 13.2 تأثيرات بصرية إضافية

| المكتبة | الاستخدام | الحجم |
|---------|-----------|-------|
| **tailwindcss-animate** | ✅ موجودة — حركات Tailwind | ~2KB |
| **tailwind-merge** | ✅ موجودة — دمج classes بذكاء | ~5KB |
| **clsx** | ✅ موجودة — conditional classes | ~1KB |
| **embla-carousel-autoplay** | تشغيل تلقائي للـ carousel | ~1KB |
| **mini-svg-data-uri** | تحسين أداء SVG backgrounds | ~1KB |

### 13.3 أدوات تطوير مقترحة

| الأداة | الغرض |
|--------|-------|
| **Storybook** | توثيق وعرض المكونات بصرياً |
| **Chromatic** | Visual regression testing |
| **tailwind-variants** | بديل لـ CVA — أقوى للمكونات المعقدة |
| **prettier-plugin-tailwindcss** | ترتيب classes تلقائي |

---

## 14. CSS Variables الجديدة

```css
:root {
  /* ===== اللون الأساسي ===== */
  --color-blue-25: 240 245 255;
  --color-blue-50: 239 246 255;
  --color-blue-100: 219 234 254;
  --color-blue-200: 191 219 254;
  --color-blue-300: 147 197 253;
  --color-blue-400: 96 165 250;
  --color-blue-500: 59 130 246;
  --color-blue-600: 37 99 235;      /* ← PRIMARY */
  --color-blue-700: 29 78 216;
  --color-blue-800: 30 64 175;
  --color-blue-900: 30 58 138;
  --color-blue-950: 23 37 84;

  /* ===== ألوان shadcn/ui (موحّدة مع الأزرق) ===== */
  --background: 210 40% 98.8%;       /* slate-50 */
  --foreground: 222 47% 11.2%;       /* slate-900 */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11.2%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11.2%;
  --primary: 217 91% 60%;             /* blue-600 ← الأساسي */
  --primary-foreground: 0 0% 100%;
  --secondary: 214 95% 93%;           /* blue-50 */
  --secondary-foreground: 217 91% 60%;
  --muted: 210 40% 96.1%;             /* slate-100 */
  --muted-foreground: 215 16% 47%;    /* slate-500 */
  --accent: 214 95% 93%;              /* blue-50 */
  --accent-foreground: 217 91% 60%;
  --destructive: 347 77% 50%;         /* rose-600 */
  --destructive-foreground: 0 0% 100%;
  --border: 214 32% 91%;              /* slate-200 */
  --input: 214 32% 91%;
  --ring: 217 91% 60%;                /* blue-600 */
  --radius: 0.5rem;

  /* ===== Charts ===== */
  --chart-1: 217 91% 60%;   /* blue-600 */
  --chart-2: 201 96% 32%;   /* cyan-700 */
  --chart-3: 172 66% 50%;   /* teal-500 */
  --chart-4: 199 89% 48%;   /* sky-500 */
  --chart-5: 221 83% 53%;   /* indigo-500 */

  /* ===== المسافات ===== */
  --spacing-page-x: 1rem;
  --spacing-page-y: 1rem;
  --spacing-card: 1.25rem;
  --spacing-section: 1.5rem;

  /* ===== الحركات ===== */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-smooth: 300ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ===== نقاط التوقف ===== */
@media (min-width: 768px) {
  :root {
    --spacing-page-x: 1.5rem;
    --spacing-page-y: 1.5rem;
    --spacing-card: 1.25rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --spacing-page-x: 2rem;
    --spacing-page-y: 1.5rem;
    --spacing-card: 1.25rem;
  }
}
```

---

## 15. دليل التطبيق

### 15.1 هيكل ملفات المكونات المقترح

```
src/
├── components/
│   ├── ui/                      # مكونات shadcn/ui الأساسية
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx (Sonner)
│   │   ├── avatar.tsx
│   │   ├── tooltip.tsx
│   │   ├── switch.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── progress.tsx
│   │   ├── skeleton.tsx
│   │   ├── alert.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── pagination.tsx
│   │   ├── drawer.tsx (vaul)
│   │   ├── command.tsx (cmdk)
│   │   ├── data-table.tsx (@tanstack/react-table)
│   │   └── chart.tsx (recharts wrapper)
│   │
│   ├── composed/               # مكونات مركّبة خاصة بالنظام
│   │   ├── StatCard.tsx
│   │   ├── PageHeader.tsx
│   │   ├── EmptyState.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── FormField.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SearchInput.tsx
│   │   ├── FilterBar.tsx
│   │   ├── UserAvatar.tsx
│   │   └── LoadingScreen.tsx
│   │
│   ├── layout/                  # مكونات التخطيط
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx       # للموبايل (منصة المتدرب)
│   │   ├── PageContainer.tsx
│   │   └── SectionContainer.tsx
│   │
│   └── providers/               # Providers
│       ├── ThemeProvider.tsx
│       ├── QueryProvider.tsx
│       └── ToastProvider.tsx
│
├── styles/
│   ├── globals.css              # Variables + base + Tailwind directives
│   ├── components.css           # Component-level overrides (if any)
│   └── print.css                # Print-only styles
│
├── lib/
│   ├── utils.ts                 # cn() helper
│   └── design-tokens.ts         # Exported constants for JS usage
│
└── app/
    ├── layout.tsx               # Root layout (Cairo font, providers)
    ├── (public)/                # Landing page, auth-select
    ├── (auth)/                  # Login pages
    ├── dashboard/               # Admin
    ├── trainee-dashboard/       # Trainee
    └── instructor-dashboard/    # Instructor
```

### 15.2 خطوات التطبيق (Migration Plan)

| المرحلة | المهمة | الأولوية |
|---------|--------|---------|
| **1** | تحديث CSS Variables في globals.css بالقيم الجديدة | 🔴 عالية |
| **2** | تحديث tailwind.config.ts (colors, fonts, shadows, radius) | 🔴 عالية |
| **3** | إعادة بناء Button component بالمتغيّرات الجديدة | 🔴 عالية |
| **4** | إعادة بناء Card component | 🔴 عالية |
| **5** | إعادة بناء Input + Form components | 🔴 عالية |
| **6** | إعادة بناء Table + Data Table | 🟡 متوسطة |
| **7** | إعادة بناء Sidebar & Layout | 🟡 متوسطة |
| **8** | توحيد Badge, Alert, Toast | 🟡 متوسطة |
| **9** | إزالة المكتبات الزائدة (MUI, NextUI, HeadlessUI) | 🟡 متوسطة |
| **10** | إنشاء Composed components (StatCard, EmptyState...) | 🟢 منخفضة |
| **11** | تطبيق responsive patterns على كل الصفحات | 🟢 منخفضة |
| **12** | حذف design-improvements.css ودمج ما يلزم | 🟢 منخفضة |
| **13** | إزالة كل `!important` من CSS | 🟢 منخفضة |
| **14** | إعداد Storybook لتوثيق المكونات | 🟢 منخفضة |

### 15.3 قواعد أساسية

```
✅ استخدم Tailwind utilities فقط — لا CSS مخصص إلا للضرورة
✅ استخدم CSS Variables لكل الألوان — لا ألوان hardcoded
✅ استخدم Lucide فقط للأيقونات — لا خلط مكتبات
✅ استخدم cn() لدمج classes — لا string concatenation
✅ استخدم size tokens (sm/md/lg) — لا أبعاد عشوائية
✅ استخدم semantic colors (primary/muted/destructive) — لا blue-600 مباشر في المكونات

❌ لا !important أبداً
❌ لا inline styles إلا للقيم الديناميكية
❌ لا ألوان خارج النظام (لا hex عشوائي)
❌ لا أكثر من مكتبة واحدة لنفس الغرض
❌ لا borders بألوان غير slate أو blue
❌ لا shadows أقوى من shadow-md على البطاقات العادية
```

---

## ملخص سريع

```
🔵 اللون: Blue-600 (#2563EB) — لون واحد لكل شيء
📝 الخط: Cairo — وزن 400-700
📐 الحواف: 8px أزرار | 12px بطاقات | 16px modals
🌫️ الظلال: sm عادي → md hover → lg floating
📱 الموبايل: bottom-nav + full-width buttons + 1-column
🖥️ الكمبيوتر: sidebar 256px + 3-4 columns + sticky header
⚡ الحركات: 100ms hover | 200ms dropdown | 300ms modal
📦 المكتبات: shadcn + Tailwind + Lucide + Framer Motion + TanStack
```
