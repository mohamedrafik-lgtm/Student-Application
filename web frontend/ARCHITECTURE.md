# 📘 التوثيق المعماري الشامل — نظام إدارة المراكز التدريبية (ERP)

> **المشروع:** `erp_front_prod` (tiba_frontend) — نظام ERP عربي كامل لإدارة مركز تدريبي
> **آخر تحديث للتوثيق:** سبتمبر 2026 — مبني على تحليل شامل للكود (541 ملف فرونت + 372 ملف باك إند + مخطط DB بحجم 4,045 سطراً)

---

## 1) نظرة عامة

نظام ERP متكامل لإدارة مركز تدريبي (Tiba Training Center / StarNova ERP) بواجهة عربية كاملة (RTL). يغطي دورة حياة المتدرب كاملة:

```
تسجيل → التحاق ببرنامج → جدولة → حضور → محتوى تدريبي → اختبارات (ورقية OMR + أونلاين)
      → درجات وكنترول → مالية (رسوم/خزائن/عمولات) → شهادات وكارنيهات
```

بالإضافة إلى: موارد بشرية للموظفين (حضور بالموقع الجغرافي)، تسويق وعمولات، CRM واتساب، دردشة داخلية، تتبع لحظي لنشاط المتدربين، ونسخ احتياطي مجدول.

### الأرقام الرئيسية

| البند | القيمة |
|---|---|
| الواجهة الأمامية | Next.js 16 + React 19 — ~541 ملف (329 صفحة `.tsx`) |
| الخادم الخلفي | NestJS 11 + Express 5 — ~372 ملف TypeScript، 60+ وحدة |
| قاعدة البيانات | MySQL عبر Prisma 6 — **123 نموذجاً + 58 تعداداً + 156 فهرساً** |
| البوابات | 3 بوابات منفصلة: إدارة، متدرب، محاضر + نظام CRM |
| صفحات الطباعة | 30+ تقريراً (شهادات، كشوف، أوراق OMR، إحصائيات) |

---

## 2) المعمارية العامة

```
┌─────────────────────────────────────────────────────────────────┐
│                        المتصفح (العميل)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐  │
│  │ الموقع   │  │ لوحة الإدارة  │  │ بوابة المتدرب │  │  CRM   │  │
│  │ العام    │  │  /dashboard  │  │/trainee-dash. │  │  /crm  │  │
│  └──────────┘  └──────────────┘  └──────────────┘  └────────┘  │
│         Next.js 16 (App Router) — Port 3000 — RTL/Cairo         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST (JWT) + Socket.io
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              NestJS 11 Backend — Port 4000/4001 — /api          │
│  60+ Module │ JWT Guards │ PermissionGuard │ Throttler │ Helmet │
│  Socket.io Gateways (Chat / CRM / Tracking) │ Swagger /api/docs │
└───────┬──────────────┬──────────────┬──────────────┬───────────┘
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌───────────────┐
   │  MySQL  │   │  Redis   │   │ التخزين   │   │ خدمات خارجية  │
   │ (Prisma)│   │(presence)│   │محلي/Cloud.│   │OpenAI/G.Vision│
   └─────────┘   └──────────┘   └───────────┘   │Baileys(WA)    │
                                                 └───────────────┘
```

### مبادئ معمارية أساسية

1. **فصل كامل بين الفرونت والباك**: الفرونت لا يلمس قاعدة البيانات إطلاقاً (كل شيء عبر REST API). مسارات `src/app/api` القليلة الموجودة (6 فقط) للإعدادات واستعادة كلمة المرور والترجمة.
2. **3 أنظمة حسابات منفصلة**: موظفون (`User`)، متدربون (`TraineeAuth`) — بجداول واستراتيجيات JWT مستقلة — والمحاضر هو `User` بنوع `INSTRUCTOR`.
3. **صلاحيات RBAC دقيقة** بنمط `{resource}:{action}` تُفرض في الباك (Guards) والفرونت (Gates) معاً.
4. **لا سجلات = وصول كامل**: فلسفة جداول التحكم بالوصول (`UserProgramAccess` وشقيقاتها).

## 3) التقنيات المستخدمة

### الواجهة الأمامية
| الفئة | التقنيات |
|---|---|
| الإطار | Next.js 16 (App Router) + React 19 + TypeScript (`strict: false`) |
| التنسيق | TailwindCSS 3 + shadcn/ui (new-york/neutral) |
| مكتبات UI | Radix UI + MUI 7 + NextUI (مهجورة) + HeadlessUI — ⚠️ 4 مكتبات معاً |
| النماذج | react-hook-form + zod |
| البيانات | @tanstack/react-query + طبقة API مخصصة (`src/lib/api.ts`) مع كاش |
| الرسوم | Chart.js + Recharts |
| Real-time | socket.io-client |
| متخصصة | OpenCV.js + Tesseract + jsQR/ZXing (OMR وQR) — Leaflet (خرائط) — react-pdf — xlsx — react-to-print — jsbarcode/qrcode |
| الخطوط | Cairo (عربي) + Roboto |

### الخادم الخلفي
| الفئة | التقنيات |
|---|---|
| الإطار | NestJS 11 + Express 5 + TypeScript |
| قاعدة البيانات | Prisma 6.10 + MySQL (mysql2) |
| المصادقة | Passport (JWT + Local) + bcryptjs |
| الأمان | Helmet (CSP مخصص) + CORS بقائمة بيضاء + @nestjs/throttler (3 طبقات) |
| Real-time | Socket.io (دردشة، CRM، تتبع) |
| التخزين | محلي (`/uploads`) + Cloudinary (multer-storage-cloudinary) |
| الذكاء الاصطناعي | OpenAI Vision + Google Cloud Vision + Gemini/Mistral (تصحيح OMR) |
| أخرى | Baileys (واتساب) — Puppeteer (PDF) — Redis/ioredis — FFmpeg — exceljs — @nestjs/schedule (cron) |

---

## 4) هيكل المجلدات

```
erp_front_prod/
├── src/
│   ├── middleware.ts          # حماية المسارات (Edge) — 299 سطراً
│   ├── app/                   # App Router
│   │   ├── page.tsx           # صفحة هبوط StarNova
│   │   ├── auth-select/       # بوابة اختيار نوع الحساب
│   │   ├── login/ instructor-login/ trainee-auth/ trainee-register/
│   │   ├── dashboard/         # لوحة الإدارة (40+ قسماً)
│   │   ├── trainee-dashboard/ # بوابة المتدرب (20 قسماً)
│   │   ├── instructor-dashboard/  # بوابة المحاضر
│   │   ├── crm/               # نظام CRM (inbox/chat/channels)
│   │   ├── print/             # 30+ صفحة طباعة (layout منفصل)
│   │   └── api/               # 6 مسارات فقط (settings, reset-password, transliterate)
│   ├── components/            # ui (53 مكوّن shadcn) + auth + chat + attendance
│   │                          # + id-card-designer + paper-exams + permissions
│   ├── contexts/              # ChatSocket / CrmInboxSocket / TraineeNotification / TraineePlatform
│   ├── hooks/                 # usePermissions, useAllowedPrograms, useOnlineTracking...
│   └── lib/                   # ~50 ملفاً: api.ts, auth-context, auth-service, كاش، OMR APIs
├── backend/                   # ⚠️ غير مُتتبع في Git!
│   ├── src/                   # 60+ وحدة NestJS
│   ├── prisma/                # schema.prisma (4,045 سطراً) + seed.ts + migrations
│   └── uploads/               # الملفات المرفوعة محلياً
├── docs/                      # 54 ملف توثيق (معظمها تقارير إصلاح OMR)
├── public/                    # الملفات الثابتة
└── Dockerfile / nixpacks.toml / install-security.sh
```

---

## 5) الواجهة الأمامية بالتفصيل

### 5.1 نظام الحماية (`middleware.ts`)

الـ `matcher` يغطي: `/dashboard/*`, `/instructor-dashboard/*`, `/crm/*`, `/trainee-dashboard/*`, `/login`, `/instructor-login`, `/trainee-auth`.

- يفك تشفير JWT محلياً (صيغة + انتهاء صلاحية `trainee_token` فقط — ⚠️ لا يفحص انتهاء `auth_token` ولا التوقيع).
- توجيه ذكي: مسجّل الدخول يُمنع من صفحات الدخول ويوجَّه حسب `accountType`؛ المحاضر يُمنع من CRM؛ CRM يتطلب `hasCrmAccess` أو دوراً إدارياً؛ الحسابات المؤرشفة (`isArchived`) تُرفض وتُحذف كوكيزها.

### 5.2 المصادقة في العميل

| البوابة | التوكن | التخزين | السياق |
|---|---|---|---|
| الموظفون | `auth_token` | localStorage + كوكي (⚠️ غير HttpOnly) | `src/lib/auth-context.tsx` |
| المحاضرون | `auth_token` (نفسه، `accountType=INSTRUCTOR`) | كوكي + localStorage | نفس السياق |
| المتدربون | `trainee_token` | localStorage (+مزامنة كوكي للـ middleware) | `src/lib/trainee-api.ts` |

تدفق الدخول: `/` → `/auth-select` (متدرب أم موظف) → `POST /api/auth/login` → تخزين التوكن → توجيه حسب النوع.

### 5.3 إدارة الحالة والأداء

- **Contexts الأربعة**: `ChatSocketContext` و`CrmInboxSocketContext` (Socket.io)، `TraineeNotificationContext` (polling مقاوم للضغط: min-gap + إعادة جلب عند ظهور التبويب)، `TraineePlatformContext`.
- **الكاش**: `api-cache.ts` (APICache مع deduplication للطلبات الجارية)، `settings-cache.ts`، `trainee-cache.ts` (⚠️ يستدعي دوال غير موجودة — خطأ تشغيل).
- **الصلاحيات في الفرونت**: `usePermissions` + `PageGuard` + `PermissionGate`/`PermissionButton` — ⚠️ بلا كاش (طلب API عند كل mount).

### 5.4 لوحة الإدارة (`/dashboard`)

- **Layout** (`dashboard/layout.tsx`): `ChatSocketProvider` + `SecurityPinOnboarding` (إعداد PIN أول مرة) + `SecurityPinGate` (قفل الشاشة بعد الخمول) + `StaffAttendanceGate` (إجبار الموظف على تسجيل حضوره قبل الاستخدام) + شريط علوي بإشعارات وصوت Web Audio API.
- **الشريط الجانبي** (`components/DashboardSidebar.tsx` — 1,478 سطراً): 14 فئة رئيسية تُفلتر بصلاحيات `{resource}:{action}`، بحث سريع Ctrl+K بخوارزمية Levenshtein عربية، شارات عدادات للطلبات المعلقة (5 APIs كل دقيقتين).

| الفئة | المحتوى |
|---|---|
| إدارة المتدربين | المتدربون، الأرشيف، الكارنيهات، استخراج البيانات، التحويلات، رصد وسجلات الحضور |
| البرامج التدريبية | البرامج، الفصول، الجدول الدراسي، المحتوى، بنك الأسئلة |
| التوزيعات | التوزيعات، توزيعات المتدربين، غير الموزعين |
| الكنترول والدرجات | اختبارات أونلاين/ورقية، الكنترول، إعلان الدرجات، الأوائل، الدور الثاني، Excel، درجات الرأفة |
| النظام المالي | الخزائن، مواعيد السداد، المدفوعات، القيود، التقارير، العمولات، الرسوم (تظلمات/وزارة/دور ثاني) |
| الموارد البشرية | حضور الموظفين (GPS)، السجلات، الإجازات، الأوقات الإضافية، العطلات، الإعدادات |
| الموقع | الوظائف، الأخبار، تسجيلات الفورم |
| التسويق | الموظفون، التارجت، التقديمات، الإحصائيات |
| الأتمتة | واتساب، الحملات الجماعية، قوالب الرسائل، تذكيرات السداد |
| المساعد الذكي | تصحيح ورقي Vision AI، رفع أسئلة، محادثة ذكية |
| منصة المتدربين | الحسابات، الإحصائيات، لجان الاختبارات، الاستبيانات، تأجيل السداد، الشكاوى، التظلمات، إقرارات الوزارة |
| إدارة المستخدمين | المستخدمون، الأدوار والصلاحيات، حالة النظام، الإعدادات، المواقع، إعدادات المطورين، النسخ الاحتياطي |

### 5.5 بوابة المتدرب (`/trainee-dashboard`)

- **تسجيل ذاتي**: رقم قومي + تاريخ ميلاد → تحقق هاتف → إنشاء كلمة مرور (`trainee-auth`).
- **الأقسام**: حضور (QR/كود 6 أرقام)، مدفوعات وجدولة سداد، اختبارات أونلاين، محتوى ومحاضرات، كارنيه، طلبات (شهادة/إثبات قيد/تأجيل امتحان/إجازة مرضية/إقرار وزارة عمل)، تظلمات درجات، شكاوى، استبيانات، درجات معلنة، جدول دراسي، إشعارات، صفحة حظر (`blocked`) للمتأخرين مالياً.

### 5.6 بوابة المحاضر + CRM + الطباعة

- **المحاضر** (`/instructor-dashboard`): رصد حضور ودرجات ومحتوى برامجه فقط (⚠️ حلقة استعلامات N+1).
- **CRM** (`/crm`): Inbox واتساب مباشر بـ Socket.io، توزيع محادثات (round-robin / أول من يحجز)، قنوات متعددة، قوالب رسائل، صلاحية منفصلة `hasCrmAccess`.
- **الطباعة** (`/print`): 30+ تقريراً بلا سايدبار — شهادات، إثبات قيد، كشوف درجات، كارنيهات، أوراق إجابة OMR، إقرارات وزارة العمل، كشوف حضور، قيود مالية، إحصائيات (محافظات/مدن/برامج/خريجون/تأديبية).

### 5.7 المكونات المتقدمة

- **مصمم الكارنيهات** (`components/id-card-designer/` — 10 ملفات): محرر مرئي كامل (سحب/إفلات، طبقات، snap-to-grid، باركود jsbarcode، اختصارات Ctrl+C/V/Del).
- **ماسحا QR**: jsQR يدوي (`attendance/ZXingQRScanner.tsx` — الاسم مضلل) و`@zxing/library` (`paper-exams/PaperExamQRScanner.tsx`) بمعالجة أخطاء عربية دقيقة.
- **الدردشة الداخلية**: مكوّن عملاق كامل (تسجيل صوت، بحث، عدادات).

---

## 6) الخادم الخلفي بالتفصيل

### 6.1 نقطة الدخول (`backend/src/main.ts`)

- **Helmet** مع CSP مخصص + حد طلبات **50MB** (صور OMR بصيغة base64).
- **CORS** بقائمة بيضاء من `ALLOWED_ORIGINS` + السماح بلا origin (تطبيقات موبايل).
- **Throttler عالمي** 3 طبقات: 100 طلب/ثانية، 2000/دقيقة، 50000/ساعة (⚠️ سخية — للتطوير).
- **ValidationPipe عالمي**: `whitelist + transform` (لكن `forbidNonWhitelisted: false`).
- بادئة `/api` + Swagger على `/api/docs` (⚠️ متاح بلا حماية في الإنتاج) + ملفات ثابتة `/uploads`.
- ⚠️ معالجات `uncaughtException`/`unhandledRejection` تسجّل فقط ولا تُنهي العملية (خطر حالة تالفة).

### 6.2 المصادقة (نظامان منفصلان)

| | الموظفون (`auth/`) | المتدربون (`trainee-auth/`) |
|---|---|---|
| الجدول | `User` | `TraineeAuth` |
| الدخول | بريد أو هاتف (كشف بـ regex) + bcrypt(10) | رقم قومي + كلمة مرور |
| JWT payload | `sub, email, name, role, accountType, isArchived, hasCrmAccess` | `type: 'trainee', userId, ...` |
| المدة | `JWT_EXPIRATION` (افتراضي 1d / موثق 7d) | **30 يوماً** (⚠️ طويلة، بلا refresh/إبطال) |
| فحص النوع | ❌ **لا يفحص `payload.type`** (ثغرة خلط مصادقة) | ✅ يرفض غير المتدربين |
| الجلسات | — | تتبع كامل: `sessionToken` + IP + جهاز/متصفح + heartbeat كل 60ث (offline بعد دقيقتين) |
| استعادة كلمة المرور | كود 6 أرقام عبر واتساب، 15 دقيقة، حد إعادة إرسال دقيقتين — ⚠️ `Math.random()` وبلا حد محاولات تخمين | مشابه |

### 6.3 نظام الصلاحيات (`permissions/`)

- **RBAC كامل**: `Role` ↔ `Permission` (`resource:action` + `conditions` JSON) عبر `RolePermission`، مع تجاوزات مباشرة `UserPermission` (`granted` يدعم المنح والمنع الصريح)، صلاحيات **مؤقتة** (`expiresAt`)، وسجل تدقيق `PermissionLog`.
- **تحكم وصول متدرج**: `UserProgramAccess` ← `UserDistributionAccess` ← `UserDistributionRoomAccess` — فلسفة: *لا سجلات = وصول كامل*.
- **الفرض**: `@RequirePermission('resource:action')` + `PermissionGuard` — ⚠️ **fail-open** (غياب الـ decorator = سماح)، وبعض الوحدات (marketing) تستخدم الـ decorator **بدون تسجيل الـ Guard**.

### 6.4 خريطة الوحدات (60+)

| المجموعة | الوحدات |
|---|---|
| المصادقة والمستخدمون | auth, trainee-auth, users, permissions, audit, developer-settings |
| الأكاديمي | trainees, programs, training-programs, training-content, classrooms, lectures, schedule, questions, quizzes, grades, grade-release, grade-appeals, paper-exams, exam-committees, second-round-fees, ministry-exam-declarations, study-materials |
| الحضور | attendance, staff-attendance, online-tracking |
| المالية | finances, payment-schedules, deferral-requests, payment-reminders, commissions |
| التسويق والموقع | marketing, news, jobs, registrations |
| التواصل | whatsapp (Baileys), crm-whatsapp, crm-inbox, chat |
| المنصة | trainee-platform, trainee-distribution, trainee-requests, surveys, complaints, disciplinary-actions |
| البنية | prisma, redis, upload, cloudinary, pdf, pdf-questions, backup, settings, storage-settings, locations, dashboard, health, google-vision, openai-vision |

### 6.5 الأنظمة الفرعية البارزة

- **الاختبارات الورقية (paper-exams)**: إنشاء نماذج ← طباعة أوراق OMR بـ QR ← مسح بالكاميرا ← تصحيح بـ **4 محركات** (OpenCV محلي في المتصفح، Tesseract، Google Vision، OpenAI Vision) ← رصد جماعي (`BatchGradingSession/Result/Skipped/Failure`).
- **واتساب (whatsapp)**: جلسات Baileys متعددة (`WHATSAPP_WRAPPER_VERSION`)، حملات جماعية بمستلمين، قوالب رسائل، ⚠️ طابور في الذاكرة (يُفقد عند إعادة التشغيل)، 5 نسخ خدمات متروكة.
- **المالية (finances)**: خزائن (`Safe`)، حركات (`Transaction`)، قيود (`FinancialEntry`)، جداول سداد، تذكيرات واتساب مجدولة، حظر المتأخرين عن المنصة، تدقيق مالي مستقل قابل للعكس.
- **حضور الموظفين**: مناطق جغرافية (`StaffAttendanceZone`) + GPS + إجازات وأوقات إضافية وعطلات.
- **النسخ الاحتياطي (backup)**: مجدول عبر `@nestjs/schedule` مع سجل `BackupLog`.
- **Redis**: يُستخدم لـ presence فقط — ⚠️ غير مُستغل (لا كاش صلاحيات/استعلامات، لا طوابير).

---

## 7) قاعدة البيانات (Prisma + MySQL)

### 7.1 الكيانات المركزية (يتفرع منها كل شيء)

| الكيان | الدور | العلاقات |
|---|---|---|
| **`User`** | الموظف/المحاضر | ~40 علاقة (مصادقة، صلاحيات، تدقيق، مالية، حضور، دردشة) — حقول: `securityPinHash`, `hasCrmAccess`, `isArchived`, `lastSeenAt/Page` |
| **`Trainee`** | المتدرب | ~30 علاقة (برنامج، درجات، مدفوعات، وثائق، حضور، اختبارات، توزيعات، عمولات، تأديبية، طلبات، شكاوى، تظلمات) — `nationalId` unique، `traineeStatus` (NEW/CURRENT/GRADUATE/WITHDRAWN) |
| **`TraineeAuth`** | حساب منصة المتدرب | 1:1 مع Trainee (Cascade) — مصادقة منفصلة تماماً |
| **`TrainingProgram` ← `TrainingContent`** | البرنامج ومواده | الفصول، الجدولة، الأسئلة، الدرجات |
| **`Safe` / `Transaction` / `TraineeFee` / `TraineePayment`** | المنظومة المالية | خزائن متعددة، حركات، رسوم، دفعات |

### 7.2 المجالات الوظيفية (14 مجالاً)

1. **الأمان**: Role, Permission, RolePermission, UserRole, UserPermission (مؤقتة + منع صريح)، PermissionLog، UserProgramAccess/DistributionAccess/RoomAccess
2. **المتدربون**: Trainee, TraineeEditHistory (قبل/بعد JSON), TraineeNote, TraineeDocument (9 أنواع، توثيق بـ `verifiedById`)
3. **الأكاديمي**: TrainingProgram, TrainingContent, Classroom, Lecture, Question (نوع/مهارة/صعوبة + Options), Quiz/QuizAttempt/QuizAnswer
4. **الاختبارات الورقية**: PaperExam, PaperExamModel, PaperAnswerSheet(+Answers), BatchGradingSession/Result/Skipped/AlreadyGraded/Failure
5. **الكنترول**: TraineeGrades (6 مكونات: أعمال سنة/عملي/تحريري/حضور/اختبارات/نهائي)، GradeReleaseSettings، GradeAppeal، SecondRoundFeeApplication
6. **الحضور**: نظامان متوازيان (⚠️ دَين تقني) — قديم `Session`+`AttendanceRecord` وجديد `ScheduleSlot→ScheduledSession`+`Attendance`+`AttendanceCode`
7. **HR**: StaffAttendanceSettings/Zone/Enrollment/Log (GPS)، StaffLeaveRequest، StaffOvertimeRequest، StaffHoliday
8. **المالية**: Safe, Transaction, FinancialEntry, TraineeFee, TraineePayment, FeePaymentSchedule, PaymentDeferralRequest, PaymentReminderTemplate/Delivery, FinancialAuditLog
9. **التسويق**: MarketingEmployee/Target/Application, Commission, CommissionPayout
10. **التتبع**: نظامان (⚠️) — TraineeSession/Activity/Stats + TraineeTrackingSession/Heartbeat/PageVisit
11. **التواصل**: ChatConversation/Participant/Message/MessageRead, WhatsAppSession/Campaign/CampaignRecipient, MessageTemplate, CrmWhatsAppChannel/Session, CrmConversation/CrmMessage
12. **المحتوى العام**: News, Job, Registration (⚠️ معزول — لا مسار تحويل لـ Trainee)، Country/Governorate/City
13. **الطلبات والخدمات**: TraineeRequest (5 أنواع)، MinistryExamDeclaration, ComplaintSuggestion, Survey (كامل: أسئلة/خيارات/ردود)، DisciplinaryAction, IdCardPrint/Design
14. **النظام**: SystemSettings (⚠️ جدول-إله ~60 عموداً), AuditLog, BackupLog/Settings, DeveloperSettings, GradeReleaseSettings

### 7.3 قيود وفهارس بارزة

- **قيود فريدة مدروسة**: `(trainee+content+classroom)` للدرجات، `(sessionId+traineeId)` للحضور، `(quizId+traineeId+attemptNumber)`، `(paperExamId+traineeId)`.
- ⚠️ **`AuditLog` و`FinancialAuditLog` بلا أي فهارس** — مسح كامل للجدول مع التضخم.
- ⚠️ **Float للأموال** (الرسوم/المدفوعات/أرصدة الخزائن) بينما العمولات Decimal — عدم اتساق وخطأ تقريب.
- ⚠️ حذف `User` يحذف `AuditLog` و`PermissionLog` الخاصة به (**Cascade**) — يفرّغ أثر التدقيق.
- ⚠️ عشرات حقول `createdBy` (String) بلا علاقات FK — أيتام محتملة.
- ⚠️ أنواع ID مختلطة (Int autoincrement مقابل cuid String).

### 7.4 البيانات الافتراضية (`seed.ts`)

مستخدم admin افتراضي (`admin@tiba.com` / `admin123`)، أدوار نظام (`super_admin`, `system_admin`, `admin`...) بأولويات، شجرة صلاحيات كاملة، إعدادات النظام الافتراضية.

---

## 8) التدفقات الرئيسية (Key Flows)

### 8.1 تسجيل متدرب جديد
```
فورم الموقع العام (Registration) → مراجعة الإدارة (/dashboard/registrations)
→ إنشاء Trainee → إنشاء TraineeAuth → المتدرب يفعّل حسابه ذاتياً
(رقم قومي + تاريخ ميلاد → تحقق هاتف → كلمة مرور)
```

### 8.2 تسجيل الحضور
```
المحاضر يفتح جلسة (ScheduledSession) → يولّد AttendanceCode (6 أرقام) / QR
→ المتدرب يسجل من بوابته (/trainee-dashboard/check-in) أو الموظف يمسح QR
→ سجل Attendance → يظهر في سجلات الحضور والتقارير
```

### 8.3 تصحيح الاختبارات الورقية (OMR)
```
إنشاء PaperExam + نماذج → طباعة أوراق إجابة بـ QR (/print/omr-*)
→ مسح الأوراق بالكاميرا (/dashboard/paper-exams/scan)
→ التصحيح: OpenCV (متصفح) ← Tesseract ← Google Vision ← OpenAI Vision
→ BatchGrading (جماعي) → رصد في TraineeGrades → إعلان عبر GradeReleaseSettings
```

### 8.4 دورة السداد المالي
```
إنشاء TraineeFee + FeePaymentSchedule → تذكيرات واتساب تلقائية مجدولة
(PaymentReminder) → دفع عبر الإدارة (TraineePayment + Transaction في Safe)
→ المتأخر: طلب تأجيل (PaymentDeferralRequest) أو حظر منصة تلقائي
→ FinancialAuditLog لكل حركة (قابلة للعكس)
```

---

## 9) الأمان

### ✅ المطبق
- Helmet + CSP مخصص، CORS بقائمة بيضاء، Throttler عالمي.
- فصل كامل بين حسابات المتدربين والموظفين (جداول واستراتيجيات مستقلة).
- bcrypt لكلمات المرور، استبعاد `password`/`securityPinHash` من الردود.
- تدقيق ثلاثي: `AuditLog` عام + `FinancialAuditLog` مالي + `PermissionLog`.
- فلترة وصول على مستوى البرنامج/التوزيعة في الاستعلامات الحساسة.

### 🔴 ثغرات حرجة (تحتاج إصلاحاً فورياً)
1. **أسرار حقيقية في `.env.example` المرفوع على GitHub** (OpenAI `sk-proj-...`، Cloudinary key+secret، Mistral) → إبطال فوري وتنظيف تاريخ Git.
2. **`jwt.strategy.ts` لا يفحص `payload.type`** → توكن متدرب (30 يوماً) يجتاز `JwtAuthGuard` على وحدات بلا `PermissionGuard` (trainees, finances, users, questions...).
3. **`trainee-grades` controller بلا أي مصادقة** ("مفتوح مؤقتاً للاختبار") → IDOR صريح لدرجات أي متدرب.
4. **`exam-committees/public/lookup`** يكشف بيانات بالرقم القومي بلا مصادقة → تسريب PII قابل للاستخراج الجماعي.
5. **كود استعادة كلمة المرور**: `Math.random()` (غير تشفيري) + بلا حد محاولات تخمين + يُخزن نصاً صريحاً.
6. **التوكنات في localStorage + كوكي غير HttpOnly/Secure** → عرضة لـ XSS.
7. **رفع SVG مسموح** ويُخدَّم كملف ثابت → Stored XSS.
8. **`PermissionGuard` fail-open** + marketing يستخدم الـ decorator بدون Guard (حماية وهمية).
9. **صفحة `/test-settings` مكشوفة** بلا حماية في الإنتاج.
10. مفتاح تشفير Cloudinary الافتراضي **ثابت في الكود**.
11. Swagger على `/api/docs` بلا حماية، وCORS للـ WebSockets يقبل أي origin.
12. `backend/` **غير مُتتبع في Git** — خطر فقدان الخادم كاملاً.

---

## 10) النشر والبيئة

### 10.1 خيارات النشر
| الطريقة | الملفات | ملاحظات |
|---|---|---|
| **Coolify + Docker** | `Dockerfile` (الجذر، standalone) + `backend/Dockerfile` + `COOLIFY_DEPLOYMENT.md` | الطريقة الأساسية |
| Nixpacks | `nixpacks.toml` / `nixpacks.json` | بديل |
| PM2 | `backend/ecosystem.config.js` | خيار ثالث |
| تأمين السيرفر | `install-security.sh` | تقوية بعد حادثة تعدين سابقة على ما يبدو |

### 10.2 متغيرات البيئة

**الفرونت (`.env.local`)**: `NEXT_PUBLIC_API_URL` (مثل `http://localhost:4000/api`).

**الباك إند (`backend/.env`)**: `DATABASE_URL` (MySQL)، `JWT_SECRET`، `JWT_EXPIRATION`، `PORT`، `HOST`، `FRONTEND_URL`، `ALLOWED_ORIGINS`، `NODE_ENV`، مفاتيح Cloudinary، `REDIS_URL/HOST/PORT/PASSWORD`، `WHATSAPP_STORAGE_TYPE/WRAPPER_VERSION`، `GOOGLE_CLOUD_KEY_FILE`، `OPENAI_API_KEY`، `MISTRAL_API_KEY`، `ENCRYPTION_KEY`.

### 10.3 التشغيل محلياً
```bash
# Backend (port 4000/4001 — Swagger: /api/docs)
cd backend && npm install && npm run start:dev

# Frontend (port 3000)
npm install && npm run dev
```
دخول افتراضي: `admin@tiba.com` / `admin123`

---

## 11) الدَين التقني المعروف

| # | المشكلة | الأثر |
|---|---|---|
| 1 | `ignoreBuildErrors` + `ignoreDuringBuilds` + `strict: false` | لا بوابة جودة — أخطاء تشغيل تمر (`trainee-cache.ts` يستدعي دوال غير موجودة) |
| 2 | ملفات config مكررة متضاربة: `next.config.js/.ts` و`tailwind.config.js/.ts` (بألوان مختلفة!) | التباس دائم |
| 3 | 4 مكتبات UI + 3 أيقونات + 3 toasts + رسمان بيانيان + `next-auth` غير مستخدم + حزم خادم (prisma/mysql2) في dependencies الفرونت | حجم حزمة ضخم |
| 4 | صفحات عملاقة: `trainees` (213KB)، `dashboard` (155KB)، `paper-exams/scan` (117KB) | صيانة صعبة |
| 5 | أنظمة متوازية قديم/جديد (حضور، تتبع متدربين، إعدادات كارنيه) + 5 نسخ خدمات واتساب | ازدواجية |
| 6 | كود متروك: `trainee-login` ("قادم قريباً")، `trainee-register` مكررة، `.bak`، `AttendanceModule` مسجل مرتين | تشويش |
| 7 | آلاف `console.log` رغم وجود `logger.ts` غير مستخدم | ضوضاء/تسريب تشخيصي |
| 8 | لا اختبارات حقيقية (specs شبه فارغة) | مخاطر عند التعديل |
| 9 | README قديم (يذكر SQLite بينما الفعلي MySQL، وبورت 4000 مقابل 4001) | تضليل |
| 10 | الاعتماد على `db push` بدل migrations موثوقة | ترحيلات إنتاج هشة |

---

## 12) خارطة طريق التوصيات

| الأولوية | الإجراء |
|---|---|
| 🔴 فوري | إبطال الأسرار المسربة وتنظيف Git — فحص `type` في JwtStrategy — PermissionGuard على كل الوحدات — تأمين `trainee-grades` و`exam-committees/lookup` و`test-settings` — رفع `backend/` لمستودع Git |
| 🟠 عاجل | حد محاولات + `crypto.randomInt` + hash لأكواد الاستعادة — توكنات HttpOnly+Secure — منع SVG أو تعقيمه — تقييد CORS للسوكيتات — حماية Swagger |
| 🟡 مهم | توحيد configs المكررة — تفعيل فحوصات البناء تدريجياً — كاش صلاحيات (Redis) — تقسيم الصفحات العملاقة — توحيد مكتبة UI — Float→Decimal للأموال — فهارس جداول التدقيق — Cascade→Restrict لسجلات التدقيق — اختبارات حقيقية |

---

> **ملاحظة**: هذا التوثيق مبني على تحليل آلي شامل للكود بتاريخ سبتمبر 2026. عند إجراء تغييرات معمارية كبيرة، حدّث هذا الملف. للتقارير التاريخية التفصيلية (خاصة نظام OMR) راجع مجلد `docs/`.

