# خطة نظام حضور وغياب الموظفين (Staff Attendance System)

## تاريخ الإعداد: 2026-03-01

---

## 1. تحليل المشروع الحالي

### 1.1 نظرة عامة على المشروع

المشروع هو **نظام ERP تعليمي** (TIBA ERP) يتكون من:

| المكون       | التقنية                                                              | الوصف                               |
| ------------ | -------------------------------------------------------------------- | ----------------------------------- |
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI + MUI | واجهة مستخدم RTL عربية              |
| **Backend**  | NestJS 11 + TypeScript + Prisma ORM                                  | REST API مع JWT Auth                |
| **Database** | MySQL                                                                | قاعدة بيانات علائقية                |
| **Auth**     | JWT + Passport.js                                                    | نظام مصادقة مزدوج (Staff + Trainee) |

### 1.2 نظام المصادقة والصلاحيات الحالي

- **نوعين من الحسابات**: `STAFF` (موظف إداري) و `INSTRUCTOR` (محاضر)
- **نظام RBAC متقدم** (Role-Based Access Control):
  - `Role` → أدوار (admin, manager, instructor)
  - `Permission` → صلاحيات (resource + action) مثل: `dashboard.users:view`
  - `RolePermission` → ربط الأدوار بالصلاحيات
  - `UserRole` → تعيين أدوار للمستخدمين
  - `UserPermission` → صلاحيات مباشرة للمستخدمين (تتجاوز الأدوار)
- **Guard System**: `JwtAuthGuard` + `PermissionGuard` مع decorators مخصصة
- **نمط الصلاحيات**: `resource.action` مثل: `dashboard.attendance:view`

### 1.3 نظام الحضور الحالي (للمتدربين)

يوجد بالفعل نظام حضور وغياب **للمتدربين** (Trainees) يشمل:

- حضور المحاضرات (`Attendance` model) مرتبط بـ `ScheduledSession`
- أكواد تسجيل الحضور (`AttendanceCode`)
- سجلات حضور تفصيلية (`AttendanceRecord`)
- حالات: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

> **الجديد المطلوب**: نظام حضور وغياب **للموظفين (Staff)** مختلف تماماً عن حضور المتدربين

### 1.4 هيكل الملفات المعنية

```
backend/src/
├── auth/          → نظام المصادقة (JWT)
├── permissions/   → نظام الصلاحيات المتقدم
├── users/         → إدارة المستخدمين (الموظفين)
├── attendance/    → حضور المتدربين (الحالي)
├── dashboard/     → بيانات الداشبورد
└── settings/      → إعدادات النظام

src/app/dashboard/
├── layout.tsx               → تخطيط الداشبورد
├── page.tsx                 → الصفحة الرئيسية
├── components/
│   └── DashboardSidebar.tsx → القائمة الجانبية
├── attendance/              → حضور المتدربين (الحالي)
├── users/                   → إدارة المستخدمين
├── permissions/             → إدارة الصلاحيات
└── settings/                → الإعدادات
```

---

## 2. متطلبات النظام الجديد

### 2.1 المتطلبات الوظيفية

| #   | المتطلب                          | التفاصيل                                                        |
| --- | -------------------------------- | --------------------------------------------------------------- |
| 1   | **تسجيل الحضور**                 | يسجل الموظف حضوره من خلال الداشبورد مع جمع موقعه الجغرافي (GPS) |
| 2   | **تسجيل الانصراف**               | يمكن للموظف تسجيل الانصراف في أي وقت                            |
| 3   | **عداد ساعات العمل**             | يبدأ العداد عند تسجيل الحضور ويتوقف عند الانصراف                |
| 4   | **ساعات العمل المحددة**          | الإدارة تحدد عدد ساعات العمل اليومية المطلوبة                   |
| 5   | **حالات الحضور**                 | حاضر / غائب بدون إذن / غائب بإذن                                |
| 6   | **نظام الأذونات**                | إمكانية تسجيل إذن لموظف (غياب مبرر)                             |
| 7   | **السجل التفصيلي**               | سجل حضور كامل لكل موظف مع التفاصيل                              |
| 8   | **اللوكيشن**                     | تسجيل الموقع الجغرافي عند الحضور ويمكن للإدارة الاطلاع عليه     |
| 9   | **الانصراف المبكر**              | يحق للموظف الانصراف مبكراً لكن يُحسب في سجله                    |
| 10  | **العطلات الأسبوعية**            | تحديد أيام عطلة ثابتة (مثل الجمعة)                              |
| 11  | **العطلات الخاصة**               | تحديد إجازات خاصة (عيد الفطر، عيد الأضحى...)                    |
| 12  | **تحديد من يُفعّل عليهم النظام** | اختيار الموظفين المشمولين بنظام الحضور                          |
| 13  | **صلاحيات متوافقة**              | التوافق الكامل مع نظام الصلاحيات الحالي (RBAC)                  |

### 2.2 المتطلبات غير الوظيفية

- التصميم بنفس لغة التصميم الحالية (Tailwind + Radix UI)
- RTL كامل
- أداء عالٍ مع إمكانية التقارير
- واجهة موبايل متجاوبة (الحضور غالباً من الجوال)

---

## 3. تصميم قاعدة البيانات (Prisma Schema)

### 3.1 الجداول الجديدة

```prisma
// ════════════════════════════════════════════
// نظام حضور وغياب الموظفين (Staff Attendance)
// ════════════════════════════════════════════

// حالة حضور الموظف
enum StaffAttendanceStatus {
  PRESENT           // حاضر
  ABSENT_UNEXCUSED  // غائب بدون إذن
  ABSENT_EXCUSED    // غائب بإذن
  DAY_OFF           // يوم عطلة
  HOLIDAY           // إجازة رسمية
}

// إعدادات نظام حضور الموظفين
model StaffAttendanceSettings {
  id                    String    @id @default(cuid())

  // ساعات العمل
  workHoursPerDay       Float     @default(8)      // عدد ساعات العمل اليومية
  workStartTime         String    @default("09:00") // وقت بداية العمل (HH:mm)
  workEndTime           String    @default("17:00") // وقت نهاية العمل (HH:mm)

  // إعدادات التأخير
  lateThresholdMinutes  Int       @default(15)     // حد التأخير بالدقائق
  earlyLeaveThreshold   Int       @default(30)     // حد الانصراف المبكر بالدقائق

  // العطلات الأسبوعية (JSON array من أيام الأسبوع)
  weeklyOffDays         Json      @default("[\"FRIDAY\"]") // أيام العطلة الأسبوعية

  // حالة النظام
  isActive              Boolean   @default(true)   // هل النظام مفعّل

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("staff_attendance_settings")
}

// تفعيل نظام الحضور على موظفين محددين
model StaffAttendanceEnrollment {
  id          String    @id @default(cuid())

  // الموظف
  userId      String
  user        User      @relation("StaffAttendanceEnrollment", fields: [userId], references: [id], onDelete: Cascade)

  // حالة التفعيل
  isActive    Boolean   @default(true)

  // من فعّل النظام على هذا الموظف
  enrolledBy  String
  enrolledByUser User   @relation("StaffAttendanceEnroller", fields: [enrolledBy], references: [id])

  notes       String?   @db.Text

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId])
  @@index([userId])
  @@index([isActive])
  @@map("staff_attendance_enrollments")
}

// سجل حضور الموظفين اليومي
model StaffAttendanceLog {
  id              String                  @id @default(cuid())

  // الموظف
  userId          String
  user            User                    @relation("StaffAttendanceLogs", fields: [userId], references: [id], onDelete: Cascade)

  // التاريخ
  date            DateTime                @db.Date // تاريخ اليوم (بدون وقت)

  // حالة الحضور
  status          StaffAttendanceStatus   @default(PRESENT)

  // أوقات الحضور والانصراف
  checkInTime     DateTime?               // وقت تسجيل الحضور
  checkOutTime    DateTime?               // وقت تسجيل الانصراف

  // ساعات العمل
  workedMinutes   Int?                    // عدد دقائق العمل الفعلية
  requiredMinutes Int?                    // عدد دقائق العمل المطلوبة
  overtimeMinutes Int?                    @default(0) // دقائق العمل الإضافي

  // الموقع الجغرافي عند الحضور
  checkInLatitude   Float?                // خط العرض عند الحضور
  checkInLongitude  Float?                // خط الطول عند الحضور
  checkInAddress    String?               @db.Text // العنوان التقريبي عند الحضور

  // الموقع الجغرافي عند الانصراف
  checkOutLatitude  Float?                // خط العرض عند الانصراف
  checkOutLongitude Float?                // خط الطول عند الانصراف
  checkOutAddress   String?               @db.Text // العنوان التقريبي عند الانصراف

  // معلومات إضافية
  isLate          Boolean               @default(false) // هل حضر متأخراً
  isEarlyLeave    Boolean               @default(false) // هل انصرف مبكراً
  notes           String?               @db.Text // ملاحظات

  // معلومات التسجيل
  recordedBy      String?               // من سجل هذا السجل (null = الموظف نفسه)

  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@unique([userId, date]) // سجل واحد لكل موظف في كل يوم
  @@index([userId])
  @@index([date])
  @@index([status])
  @@map("staff_attendance_logs")
}

// أذونات الغياب للموظفين
model StaffLeaveRequest {
  id              String    @id @default(cuid())

  // الموظف
  userId          String
  user            User      @relation("StaffLeaveRequests", fields: [userId], references: [id], onDelete: Cascade)

  // تاريخ/فترة الإذن
  startDate       DateTime  @db.Date // تاريخ بداية الإذن
  endDate         DateTime  @db.Date // تاريخ نهاية الإذن

  // السبب
  reason          String    @db.Text
  leaveType       StaffLeaveType @default(PERSONAL) // نوع الإذن

  // الحالة
  status          StaffLeaveStatus @default(PENDING)

  // المراجعة
  reviewedBy      String?
  reviewedByUser  User?     @relation("StaffLeaveReviewer", fields: [reviewedBy], references: [id])
  reviewedAt      DateTime?
  reviewNotes     String?   @db.Text

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([startDate])
  @@index([endDate])
  @@map("staff_leave_requests")
}

// أنواع الأذونات
enum StaffLeaveType {
  PERSONAL    // شخصي
  SICK        // مرضي
  EMERGENCY   // طارئ
  ANNUAL      // سنوي
  OTHER       // أخرى
}

// حالة طلب الإذن
enum StaffLeaveStatus {
  PENDING     // قيد المراجعة
  APPROVED    // موافق عليه
  REJECTED    // مرفوض
}

// الإجازات الرسمية / العطلات الخاصة
model StaffHoliday {
  id          String    @id @default(cuid())

  name        String    // اسم الإجازة (مثل: عيد الفطر)
  date        DateTime  @db.Date // تاريخ الإجازة
  isRecurring Boolean   @default(false) // هل تتكرر سنوياً

  notes       String?   @db.Text

  createdBy   String    // من أضاف الإجازة

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([date])
  @@map("staff_holidays")
}
```

### 3.2 تعديلات على نموذج `User` الحالي

```prisma
// إضافة العلاقات التالية إلى model User:

// نظام حضور الموظفين
staffAttendanceEnrollment  StaffAttendanceEnrollment?  @relation("StaffAttendanceEnrollment")
staffAttendanceEnrollments StaffAttendanceEnrollment[] @relation("StaffAttendanceEnroller")
staffAttendanceLogs        StaffAttendanceLog[]        @relation("StaffAttendanceLogs")
staffLeaveRequests         StaffLeaveRequest[]         @relation("StaffLeaveRequests")
staffLeaveReviews          StaffLeaveRequest[]         @relation("StaffLeaveReviewer")
```

---

## 4. تصميم الـ Backend (NestJS)

### 4.1 هيكل المجلد الجديد

```
backend/src/staff-attendance/
├── staff-attendance.module.ts
├── staff-attendance.controller.ts
├── staff-attendance.service.ts
├── staff-attendance-settings.service.ts
├── staff-leave.service.ts
├── staff-holiday.service.ts
└── dto/
    ├── check-in.dto.ts
    ├── check-out.dto.ts
    ├── create-leave-request.dto.ts
    ├── review-leave-request.dto.ts
    ├── update-settings.dto.ts
    ├── create-holiday.dto.ts
    ├── enroll-staff.dto.ts
    └── staff-attendance-query.dto.ts
```

### 4.2 الـ API Endpoints

#### إعدادات النظام

| Method | Endpoint                         | الوصف                | الصلاحية المطلوبة                  |
| ------ | -------------------------------- | -------------------- | ---------------------------------- |
| `GET`  | `/api/staff-attendance/settings` | جلب إعدادات النظام   | `staff-attendance.settings:view`   |
| `PUT`  | `/api/staff-attendance/settings` | تحديث إعدادات النظام | `staff-attendance.settings:manage` |

#### إدارة التسجيل (من يُفعّل عليهم النظام)

| Method   | Endpoint                                    | الوصف                    | الصلاحية المطلوبة                     |
| -------- | ------------------------------------------- | ------------------------ | ------------------------------------- |
| `GET`    | `/api/staff-attendance/enrollments`         | قائمة الموظفين المسجلين  | `staff-attendance.enrollments:view`   |
| `POST`   | `/api/staff-attendance/enrollments`         | تفعيل النظام لموظف       | `staff-attendance.enrollments:manage` |
| `DELETE` | `/api/staff-attendance/enrollments/:userId` | إلغاء تفعيل النظام لموظف | `staff-attendance.enrollments:manage` |
| `PATCH`  | `/api/staff-attendance/enrollments/:userId` | تحديث حالة التفعيل       | `staff-attendance.enrollments:manage` |

#### تسجيل الحضور والانصراف

| Method | Endpoint                          | الوصف                 | الصلاحية المطلوبة          |
| ------ | --------------------------------- | --------------------- | -------------------------- |
| `POST` | `/api/staff-attendance/check-in`  | تسجيل الحضور (مع GPS) | مُسجّل ومُفعّل عليه النظام |
| `POST` | `/api/staff-attendance/check-out` | تسجيل الانصراف        | مُسجّل ومُفعّل عليه النظام |
| `GET`  | `/api/staff-attendance/my-status` | حالة حضوري اليوم      | مُسجّل ومُفعّل عليه النظام |
| `GET`  | `/api/staff-attendance/my-logs`   | سجل حضوري الشخصي      | أي موظف مُسجّل             |

#### إدارة سجلات الحضور (للإدارة)

| Method  | Endpoint                              | الوصف                   | الصلاحية المطلوبة               |
| ------- | ------------------------------------- | ----------------------- | ------------------------------- |
| `GET`   | `/api/staff-attendance/logs`          | كل سجلات الحضور         | `staff-attendance:view`         |
| `GET`   | `/api/staff-attendance/logs/:userId`  | سجل حضور موظف محدد      | `staff-attendance:view`         |
| `GET`   | `/api/staff-attendance/today`         | حضور اليوم لكل الموظفين | `staff-attendance:view`         |
| `GET`   | `/api/staff-attendance/report`        | تقرير حضور (فترة محددة) | `staff-attendance.reports:view` |
| `POST`  | `/api/staff-attendance/manual-record` | تسجيل حضور يدوي لموظف   | `staff-attendance:manage`       |
| `PATCH` | `/api/staff-attendance/logs/:id`      | تعديل سجل حضور          | `staff-attendance:manage`       |

#### أذونات الغياب

| Method  | Endpoint                                  | الوصف                     | الصلاحية المطلوبة                |
| ------- | ----------------------------------------- | ------------------------- | -------------------------------- |
| `GET`   | `/api/staff-attendance/leaves`            | كل طلبات الأذونات         | `staff-attendance.leaves:view`   |
| `POST`  | `/api/staff-attendance/leaves`            | تقديم طلب إذن             | `staff-attendance.leaves:create` |
| `PATCH` | `/api/staff-attendance/leaves/:id/review` | مراجعة طلب إذن (قبول/رفض) | `staff-attendance.leaves:manage` |

#### العطلات والإجازات الرسمية

| Method   | Endpoint                             | الوصف         | الصلاحية المطلوبة                  |
| -------- | ------------------------------------ | ------------- | ---------------------------------- |
| `GET`    | `/api/staff-attendance/holidays`     | قائمة العطلات | `staff-attendance.holidays:view`   |
| `POST`   | `/api/staff-attendance/holidays`     | إضافة عطلة    | `staff-attendance.holidays:manage` |
| `PUT`    | `/api/staff-attendance/holidays/:id` | تعديل عطلة    | `staff-attendance.holidays:manage` |
| `DELETE` | `/api/staff-attendance/holidays/:id` | حذف عطلة      | `staff-attendance.holidays:manage` |

#### الداشبورد والإحصائيات

| Method | Endpoint                                       | الوصف              | الصلاحية المطلوبة       |
| ------ | ---------------------------------------------- | ------------------ | ----------------------- |
| `GET`  | `/api/staff-attendance/dashboard`              | إحصائيات عامة      | `staff-attendance:view` |
| `GET`  | `/api/staff-attendance/dashboard/user/:userId` | إحصائيات موظف محدد | `staff-attendance:view` |

---

## 5. تصميم الـ Frontend (Next.js)

### 5.1 هيكل الصفحات الجديدة

```
src/app/dashboard/staff-attendance/
├── page.tsx                          → الصفحة الرئيسية (لوحة القيادة)
├── check-in/
│   └── page.tsx                      → صفحة تسجيل الحضور/الانصراف (للموظف)
├── logs/
│   └── page.tsx                      → سجلات الحضور الشاملة
├── employees/
│   ├── page.tsx                      → إدارة الموظفين المسجلين بالنظام
│   └── [userId]/
│       └── page.tsx                  → سجل حضور موظف محدد
├── leaves/
│   └── page.tsx                      → إدارة أذونات الغياب
├── holidays/
│   └── page.tsx                      → إدارة العطلات والإجازات
├── settings/
│   └── page.tsx                      → إعدادات النظام
└── reports/
    └── page.tsx                      → التقارير والإحصائيات
```

### 5.2 مكونات الواجهة الرئيسية

#### 5.2.1 صفحة تسجيل الحضور (check-in)

- **زر تسجيل الحضور** → يطلب إذن الموقع الجغرافي (Geolocation API)
- **عداد زمني** → يعرض عدد الساعات/الدقائق منذ الحضور (countdown / countup)
- **زر تسجيل الانصراف** → يظهر بعد تسجيل الحضور
- **حالة اليوم** → ملخص (حاضر من الساعة X، تبقى Y ساعات)
- **تنبيه الانصراف المبكر** → إذا حاول الانصراف قبل إكمال الساعات المطلوبة

#### 5.2.2 لوحة القيادة (الداشبورد الرئيسية)

- **بطاقات إحصائية**: عدد الحاضرين اليوم، الغائبين، المتأخرين
- **جدول حضور اليوم**: قائمة بكل الموظفين وحالتهم
- **خريطة المواقع**: عرض مواقع تسجيل الحضور على خريطة (اختياري)
- **مؤشرات الأداء**: نسبة الالتزام الأسبوعية/الشهرية

#### 5.2.3 سجلات الحضور

- **جدول تفصيلي** مع فلترة وبحث
- **فلاتر**: تاريخ، موظف، حالة الحضور
- **تصدير**: Excel / PDF
- **إمكانية التعديل**: تعديل سجل بالصلاحية المناسبة

#### 5.2.4 صفحة سجل الموظف

- **معلومات الموظف** الأساسية
- **إحصائيات شهرية**: أيام الحضور، الغياب، التأخير، الساعات الإجمالية
- **سجل تفصيلي بالتاريخ** مع خريطة المواقع
- **رسم بياني**: اتجاه الحضور خلال الشهر

#### 5.2.5 إعدادات النظام

- **ساعات العمل**: بداية/نهاية الدوام + عدد الساعات
- **أيام العطلة الأسبوعية**: اختيار متعدد (مثل: الجمعة والسبت)
- **حدود التأخير**: دقائق السماح بالتأخير
- **تفعيل/تعطيل النظام**

---

## 6. نظام الصلاحيات الجديد

### 6.1 الصلاحيات المطلوبة (يتم إضافتها في Permission Seeder)

```typescript
// صلاحيات نظام حضور الموظفين
const staffAttendancePermissions = [
  // الإعدادات
  {
    resource: "staff-attendance.settings",
    action: "view",
    displayName: "عرض إعدادات حضور الموظفين",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.settings",
    action: "manage",
    displayName: "إدارة إعدادات حضور الموظفين",
    category: "حضور الموظفين",
  },

  // التسجيل (من يُفعّل عليهم)
  {
    resource: "staff-attendance.enrollments",
    action: "view",
    displayName: "عرض الموظفين المسجلين بنظام الحضور",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.enrollments",
    action: "manage",
    displayName: "إدارة تسجيل الموظفين بنظام الحضور",
    category: "حضور الموظفين",
  },

  // عرض وإدارة سجلات الحضور
  {
    resource: "staff-attendance",
    action: "view",
    displayName: "عرض سجلات حضور الموظفين",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance",
    action: "manage",
    displayName: "إدارة سجلات حضور الموظفين",
    category: "حضور الموظفين",
  },

  // تسجيل الحضور الذاتي
  {
    resource: "staff-attendance",
    action: "check-in",
    displayName: "تسجيل الحضور الشخصي",
    category: "حضور الموظفين",
  },

  // الأذونات
  {
    resource: "staff-attendance.leaves",
    action: "view",
    displayName: "عرض أذونات الغياب",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.leaves",
    action: "create",
    displayName: "تقديم طلب إذن غياب",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.leaves",
    action: "manage",
    displayName: "إدارة أذونات الغياب (قبول/رفض)",
    category: "حضور الموظفين",
  },

  // العطلات
  {
    resource: "staff-attendance.holidays",
    action: "view",
    displayName: "عرض العطلات الرسمية",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.holidays",
    action: "manage",
    displayName: "إدارة العطلات الرسمية",
    category: "حضور الموظفين",
  },

  // التقارير
  {
    resource: "staff-attendance.reports",
    action: "view",
    displayName: "عرض تقارير الحضور",
    category: "حضور الموظفين",
  },
  {
    resource: "staff-attendance.reports",
    action: "export",
    displayName: "تصدير تقارير الحضور",
    category: "حضور الموظفين",
  },
];
```

### 6.2 إضافة عناصر القائمة الجانبية

```typescript
// إضافة إلى DashboardSidebar.tsx → sidebarCategories
{
  title: 'حضور الموظفين',
  icon: <FiUserCheck className="w-5 h-5" />,
  requiredPermissions: [
    { resource: 'staff-attendance', action: 'view' },
    { resource: 'staff-attendance', action: 'check-in' },
  ],
  requireAll: false,
  items: [
    {
      title: 'لوحة الحضور',
      href: '/dashboard/staff-attendance',
      icon: <FiBarChart2 className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance', action: 'view' },
    },
    {
      title: 'تسجيل الحضور',
      href: '/dashboard/staff-attendance/check-in',
      icon: <FiCheckSquare className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance', action: 'check-in' },
    },
    {
      title: 'سجلات الحضور',
      href: '/dashboard/staff-attendance/logs',
      icon: <FiList className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance', action: 'view' },
    },
    {
      title: 'الموظفين المسجلين',
      href: '/dashboard/staff-attendance/employees',
      icon: <FiUsers className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance.enrollments', action: 'view' },
    },
    {
      title: 'أذونات الغياب',
      href: '/dashboard/staff-attendance/leaves',
      icon: <FiCalendar className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance.leaves', action: 'view' },
    },
    {
      title: 'العطلات',
      href: '/dashboard/staff-attendance/holidays',
      icon: <FiStar className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance.holidays', action: 'view' },
    },
    {
      title: 'الإعدادات',
      href: '/dashboard/staff-attendance/settings',
      icon: <FiSettings className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance.settings', action: 'view' },
    },
    {
      title: 'التقارير',
      href: '/dashboard/staff-attendance/reports',
      icon: <FiFileText className="w-5 h-5" />,
      requiredPermission: { resource: 'staff-attendance.reports', action: 'view' },
    },
  ]
}
```

---

## 7. منطق العمل (Business Logic)

### 7.1 تسجيل الحضور (Check-In)

```
1. التحقق من أن الموظف مُفعّل عليه النظام (StaffAttendanceEnrollment.isActive)
2. التحقق من أنه لم يسجل حضوراً اليوم بالفعل
3. التحقق من أن اليوم ليس يوم عطلة أسبوعية أو إجازة رسمية
4. طلب الموقع الجغرافي من المتصفح (Geolocation API)
5. إنشاء سجل StaffAttendanceLog:
   - status = PRESENT
   - checkInTime = الوقت الحالي
   - checkInLatitude/Longitude = إحداثيات GPS
   - isLate = (checkInTime > workStartTime + lateThresholdMinutes)
   - requiredMinutes = workHoursPerDay * 60
6. بدء عداد ساعات العمل في الواجهة (realtime countdown)
```

### 7.2 تسجيل الانصراف (Check-Out)

```
1. التحقق من وجود سجل حضور لهذا اليوم (checkInTime != null)
2. تحديث السجل:
   - checkOutTime = الوقت الحالي
   - checkOutLatitude/Longitude = إحداثيات GPS
   - workedMinutes = الفرق بين checkOutTime و checkInTime
   - isEarlyLeave = (workedMinutes < requiredMinutes - earlyLeaveThreshold)
   - overtimeMinutes = max(0, workedMinutes - requiredMinutes)
3. إظهار تنبيه إذا كان الانصراف مبكراً (قبل إكمال الساعات المطلوبة)
```

### 7.3 المهمة التلقائية اليومية (Cron Job)

```
يعمل في نهاية كل يوم عمل (مثلاً الساعة 23:59):
1. جلب كل الموظفين المُفعّل عليهم النظام
2. لكل موظف لم يُسجل حضوراً اليوم:
   - التحقق: هل اليوم عطلة أسبوعية؟ → status = DAY_OFF
   - التحقق: هل اليوم إجازة رسمية؟ → status = HOLIDAY
   - التحقق: هل لديه إذن معتمد لهذا اليوم؟ → status = ABSENT_EXCUSED
   - غير ذلك → status = ABSENT_UNEXCUSED
3. لكل موظف سجّل حضوراً ولم يسجل انصرافاً:
   - checkOutTime = workEndTime (تلقائي)
   - حساب workedMinutes
```

---

## 8. خطة التنفيذ (الترتيب والمراحل)

### المرحلة 1: قاعدة البيانات (Prisma Schema)

| #   | المهمة                             | الملف                  |
| --- | ---------------------------------- | ---------------------- |
| 1.1 | إضافة Enums الجديدة                | `prisma/schema.prisma` |
| 1.2 | إضافة Models الجديدة (5 جداول)     | `prisma/schema.prisma` |
| 1.3 | تحديث model User بالعلاقات الجديدة | `prisma/schema.prisma` |
| 1.4 | تنفيذ Prisma Migration             | `prisma migrate dev`   |

### المرحلة 2: الـ Backend (NestJS)

| #    | المهمة                         | الملفات                                  |
| ---- | ------------------------------ | ---------------------------------------- |
| 2.1  | إنشاء DTOs                     | `backend/src/staff-attendance/dto/`      |
| 2.2  | إنشاء Service (المنطق الأساسي) | `staff-attendance.service.ts`            |
| 2.3  | إنشاء Service الإعدادات        | `staff-attendance-settings.service.ts`   |
| 2.4  | إنشاء Service الأذونات         | `staff-leave.service.ts`                 |
| 2.5  | إنشاء Service العطلات          | `staff-holiday.service.ts`               |
| 2.6  | إنشاء Controller               | `staff-attendance.controller.ts`         |
| 2.7  | إنشاء Module                   | `staff-attendance.module.ts`             |
| 2.8  | تسجيل Module في AppModule      | `app.module.ts`                          |
| 2.9  | إضافة الصلاحيات في Seeder      | `permissions/seeds/permission-seeder.ts` |
| 2.10 | إضافة Cron Job لنهاية اليوم    | `staff-attendance.service.ts`            |

### المرحلة 3: الـ Frontend (Next.js)

| #    | المهمة                                    | الملفات                               |
| ---- | ----------------------------------------- | ------------------------------------- |
| 3.1  | إنشاء API hooks (React Query)             | `src/app/dashboard/staff-attendance/` |
| 3.2  | صفحة الإعدادات                            | `settings/page.tsx`                   |
| 3.3  | صفحة إدارة الموظفين المسجلين              | `employees/page.tsx`                  |
| 3.4  | صفحة تسجيل الحضور/الانصراف + GPS + العداد | `check-in/page.tsx`                   |
| 3.5  | صفحة لوحة القيادة (الداشبورد)             | `page.tsx`                            |
| 3.6  | صفحة سجلات الحضور                         | `logs/page.tsx`                       |
| 3.7  | صفحة سجل موظف محدد                        | `employees/[userId]/page.tsx`         |
| 3.8  | صفحة أذونات الغياب                        | `leaves/page.tsx`                     |
| 3.9  | صفحة العطلات                              | `holidays/page.tsx`                   |
| 3.10 | صفحة التقارير                             | `reports/page.tsx`                    |
| 3.11 | إضافة أيقونات القائمة الجانبية            | `DashboardSidebar.tsx`                |

### المرحلة 4: اللمسات النهائية

| #   | المهمة                               |
| --- | ------------------------------------ |
| 4.1 | اختبار نظام الصلاحيات مع كل Endpoint |
| 4.2 | اختبار الموقع الجغرافي (GPS)         |
| 4.3 | اختبار العداد الزمني                 |
| 4.4 | اختبار Cron Job                      |
| 4.5 | مراجعة التصميم والتجاوب (Responsive) |

---

## 9. ملاحظات تقنية مهمة

### 9.1 الموقع الجغرافي (Geolocation)

```javascript
// في الـ Frontend، نستخدم Geolocation API للمتصفح:
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // إرسال الإحداثيات مع طلب الحضور
  },
  (error) => {
    // التعامل مع رفض المستخدم أو عدم دعم المتصفح
  },
  { enableHighAccuracy: true, timeout: 10000 },
);
```

### 9.2 العداد الزمني (Timer)

```javascript
// في الـ Frontend، نحسب الفرق بين وقت الحضور والوقت الحالي:
// ونعرض countdown لساعات العمل المتبقية / countup لساعات العمل المنجزة
// يتم تحديث العداد كل ثانية باستخدام setInterval
```

### 9.3 تسمية الملفات

- جميع الملفات الجديدة تبدأ بـ `staff-attendance` أو `staff-` لتمييزها عن نظام حضور المتدربين الحالي
- يتم فصل هذا النظام بالكامل عن نظام حضور المتدربين لتجنب أي تعارض

### 9.4 الـ Cron Job

- نستخدم `@nestjs/schedule` الموجود بالفعل في المشروع
- يتم تشغيل Cron لتسجيل الغياب التلقائي يومياً

---

## 10. ملخص الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة (إنشاء):

| #   | الملف                                                               | النوع              |
| --- | ------------------------------------------------------------------- | ------------------ |
| 1   | `backend/src/staff-attendance/staff-attendance.module.ts`           | Backend Module     |
| 2   | `backend/src/staff-attendance/staff-attendance.controller.ts`       | Backend Controller |
| 3   | `backend/src/staff-attendance/staff-attendance.service.ts`          | Backend Service    |
| 4   | `backend/src/staff-attendance/staff-attendance-settings.service.ts` | Backend Service    |
| 5   | `backend/src/staff-attendance/staff-leave.service.ts`               | Backend Service    |
| 6   | `backend/src/staff-attendance/staff-holiday.service.ts`             | Backend Service    |
| 7   | `backend/src/staff-attendance/dto/*.ts` (8 ملفات)                   | DTOs               |
| 8   | `src/app/dashboard/staff-attendance/page.tsx`                       | Frontend Page      |
| 9   | `src/app/dashboard/staff-attendance/check-in/page.tsx`              | Frontend Page      |
| 10  | `src/app/dashboard/staff-attendance/logs/page.tsx`                  | Frontend Page      |
| 11  | `src/app/dashboard/staff-attendance/employees/page.tsx`             | Frontend Page      |
| 12  | `src/app/dashboard/staff-attendance/employees/[userId]/page.tsx`    | Frontend Page      |
| 13  | `src/app/dashboard/staff-attendance/leaves/page.tsx`                | Frontend Page      |
| 14  | `src/app/dashboard/staff-attendance/holidays/page.tsx`              | Frontend Page      |
| 15  | `src/app/dashboard/staff-attendance/settings/page.tsx`              | Frontend Page      |
| 16  | `src/app/dashboard/staff-attendance/reports/page.tsx`               | Frontend Page      |

### ملفات تحتاج تعديل:

| #   | الملف                                                | نوع التعديل                        |
| --- | ---------------------------------------------------- | ---------------------------------- |
| 1   | `backend/prisma/schema.prisma`                       | إضافة Models + Enums + علاقات User |
| 2   | `backend/src/app.module.ts`                          | تسجيل StaffAttendanceModule        |
| 3   | `backend/src/permissions/seeds/permission-seeder.ts` | إضافة صلاحيات جديدة                |
| 4   | `src/app/dashboard/components/DashboardSidebar.tsx`  | إضافة قسم حضور الموظفين            |

---

> **جاهز للتنفيذ؟** يمكننا البدء بالمرحلة 1 (قاعدة البيانات) فوراً.
