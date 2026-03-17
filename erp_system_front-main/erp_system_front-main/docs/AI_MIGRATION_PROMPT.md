# 🤖 برومبت تحديث الصفحات إلى هوية التصميم الجديدة

> **طريقة الاستخدام:** استبدل `___ضع_المسار_هنا___` بمسار صفحتك، الصق محتوى الملف بعد البرومبت، أرسل.

---

```
أنت مطوّر Frontend خبير في Next.js 16 + React 19 + Tailwind CSS + shadcn/ui + Framer Motion.

مهمتك: تحديث **التصميم والمظهر فقط** للصفحة التالية — بدون تعديل أي وظيفة أو منطق برمجي.

📄 الصفحة: src/app/___ضع_المسار_هنا___/page.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ قاعدة ذهبية — التصميم فقط، لا تلمس الوظائف
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 ممنوع تماماً تعديل أي شيء وظيفي:
  - لا تغيّر أي API call أو endpoint أو fetch أو axios request
  - لا تغيّر أي useState أو useEffect أو useRef logic
  - لا تغيّر أي router.push أو Link href أو navigation
  - لا تغيّر أي form submission أو validation أو onSubmit
  - لا تغيّر أي شرط if/else أو switch أو try/catch
  - لا تغيّر أي interface أو type أو prop types
  - لا تحذف أي متغير أو دالة أو import وظيفي
  - لا تغيّر أسماء الدوال أو parameters

✅ المسموح فقط:
  - تغيير الـ className و styles
  - استبدال مكونات UI (MUI/NextUI → shadcn/ui) مع الحفاظ على نفس الـ props الوظيفية
  - استبدال الأيقونات (heroicons/react-icons → Lucide React)
  - إضافة Framer Motion animations (motion.div wrappers)
  - إعادة ترتيب العناصر المرئية (layout) مع الحفاظ على نفس البيانات المعروضة
  - إضافة mounted check لتجنب hydration mismatch

■ مهم جداً — المكونات المستوردة (Components):
  إذا كانت الصفحة تستورد مكونات مخصصة من المشروع (مثل DataTable, StatsCard, Sidebar...):
  - إذا كان المكون من مكتبة خارجية (MUI, NextUI, HeadlessUI) → استبدله بمكون shadcn/ui المكافئ
  - إذا كان المكون مخصص من المشروع → أعد تصميمه بصرياً (className فقط) ليتوافق مع هوية التصميم الجديدة
  - حافظ على نفس الـ props والوظائف — فقط غيّر الشكل والمظهر
  - إذا استوردت مكون ولم تعرف شكله، اتركه كما هو وأضف تعليق: // TODO: update this component's design

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 هوية التصميم الجديدة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ التقنيات:
  - Tailwind CSS فقط (لا CSS مخصص)
  - shadcn/ui كمكتبة المكونات الوحيدة
  - Framer Motion للحركات
  - Lucide React للأيقونات فقط
  - خط Cairo (font-cairo)

■ الألوان:
  اللون الأساسي: blue-600 (#2563EB) | Hover: blue-700 | Active: blue-800
  خلفية فاتحة: blue-50 (#EFF6FF)
  الخلفية العامة: slate-50 (#F8FAFC) | البطاقات: white
  الحدود: slate-200 | النص: slate-900 (رئيسي) | slate-500 (ثانوي) | slate-400 (خافت)
  الحالات: teal-600 (نجاح) | amber-500 (تحذير) | rose-600 (خطأ) | sky-500 (معلومات)

■ التايبوغرافي:
  h1: text-3xl → lg:text-[2.75rem] font-extrabold text-slate-900 tracking-tight
  h2: text-2xl → sm:text-3xl font-bold text-slate-900
  h3: text-xl font-bold text-slate-900
  body: text-base text-slate-600 leading-relaxed
  small: text-sm text-slate-500 | caption: text-xs text-slate-400

■ استبدالات المكونات:
  MUI (@mui/material) → shadcn/ui
  NextUI (@nextui-org/react) → shadcn/ui
  HeadlessUI (@headlessui/react) → shadcn/ui (Radix)
  @heroicons/react → lucide-react
  react-icons → lucide-react
  react-hot-toast → sonner
  Chart.js → recharts
  CSS Modules / styled-components → Tailwind

■ shadcn/ui المتاحة:
  Button, Card, Input, Badge, Table, Dialog, Select, Tabs,
  Avatar, Tooltip, Switch, Checkbox, RadioGroup, Progress,
  Skeleton, Alert, Breadcrumb, Pagination, Drawer (vaul),
  Command (cmdk), Separator, Sheet, DropdownMenu, Popover,
  Calendar, Label, Textarea, ScrollArea, Accordion
  استيراد: import { X } from "@/components/ui/x"
  دمج: import { cn } from "@/lib/utils"

■ الحركات (Framer Motion — مطلوبة):
  1. دخول الصفحة: staggerChildren: 0.12, كل عنصر: opacity 0→1, y 40→0
  2. البطاقات: opacity 0→1, y 50→0, scale 0.95→1, delay: index * 0.1
  3. التحويم: بطاقات whileHover={{ y: -8 }}, أزرار whileHover={{ scale: 1.03 }}

  import { motion, useInView } from "framer-motion"
  mounted check: const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []); if (!mounted) return null;

■ أنماط البطاقات:
  <Card className="p-6 lg:p-8 bg-white border border-slate-200/80 rounded-2xl
    shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">

■ أنماط الأزرار:
  أساسي: bg-gradient-to-l from-blue-700 to-blue-600 text-white rounded-xl px-8 h-12 font-bold
  ثانوي: variant="outline" border-slate-200 text-slate-700 rounded-xl

■ Responsive (RTL):
  dir="rtl", 1 عمود → md:2 → lg:3-4, max-w-6xl mx-auto px-6 lg:px-8

■ ممنوع:
  ❌ !important | ❌ inline styles | ❌ ألوان hex عشوائية | ❌ خلفيات داكنة
  ❌ خطوط أقل من 12px | ❌ بطاقات بدون hover | ❌ صفحات بدون animations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 نفّذ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. اقرأ الصفحة — افهم وظيفتها (لكن لا تعدّل الوظائف)
2. استبدل مكونات UI القديمة بـ shadcn/ui
3. استبدل الأيقونات بـ Lucide React
4. أي مكون مستورد من المشروع → أعد تصميمه بصرياً فقط ليتوافق مع الهوية الجديدة
5. أعد تصميم الـ UI بالألوان والخطوط المذكورة أعلاه
6. أضف Framer Motion animations (stagger + hover + useInView)
7. تأكد من responsive
8. أعد الملف الكامل

أعطني الملف الكامل المحدّث — التصميم والمظهر فقط، لا تلمس أي وظيفة أو منطق.
```

---

**مثال تجريبي** — انسخ هذا كما هو وجرّبه مع أي نموذج:

```
أنت مطوّر Frontend خبير في Next.js 16 + React 19 + Tailwind CSS + shadcn/ui + Framer Motion.

مهمتك: تحديث **التصميم والمظهر فقط** للصفحة التالية — بدون تعديل أي وظيفة أو منطق برمجي.

📄 الصفحة: src/app/login/page.tsx

[... باقي البرومبت أعلاه ...]

--- محتوى الملف ---
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) router.push("/dashboard");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">دخول</button>
      </form>
    </div>
  );
}
```
