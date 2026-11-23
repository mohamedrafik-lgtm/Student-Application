# نظام طلبات تأجيل السداد - خطة التنفيذ

## ✅ ما تم إنجازه

### 1. Database Schema
- ✅ إضافة `PaymentDeferralRequest` model في [`schema.prisma`](backend/prisma/schema.prisma:2083)
- ✅ إضافة `DeferralRequestStatus` enum (PENDING, APPROVED, REJECTED)
- ✅ إضافة العلاقات في `User`, `Trainee`, `TraineeFee`

---

## 📋 الخطوات المتبقية

### الخطوة 1: تطبيق التغييرات على قاعدة البيانات ⚠️ **مطلوب الآن**

```bash
cd backend

# 1. توليد Prisma Client الجديد
npx prisma generate

# 2. إنشاء وتطبيق Migration
npx prisma migrate dev --name add_payment_deferral_requests

# أو إذا كنت في Production:
npx prisma db push
```

---

### الخطوة 2: Backend - إنشاء Module كامل

#### ملفات مطلوبة (7 ملفات):

1. **`backend/src/deferral-requests/deferral-requests.module.ts`**
2. **`backend/src/deferral-requests/deferral-requests.service.ts`**
3. **`backend/src/deferral-requests/deferral-requests.controller.ts`**
4. **`backend/src/deferral-requests/dto/create-deferral-request.dto.ts`**
5. **`backend/src/deferral-requests/dto/update-deferral-request.dto.ts`**
6. **`backend/src/deferral-requests/dto/review-deferral-request.dto.ts`**
7. **تحديث `backend/src/app.module.ts`** - إضافة `DeferralRequestsModule`

#### APIs المطلوبة:

**للمتدربين**:
- `POST /deferral-requests` - إنشاء طلب جديد
- `GET /deferral-requests/my-requests` - طلباتي
- `GET /deferral-requests/:id` - تفاصيل طلب

**للإدارة**:
- `GET /deferral-requests` - جميع الطلبات (مع فلترة)
- `GET /deferral-requests/:id` - تفاصيل طلب
- `PUT /deferral-requests/:id/review` - مراجعة طلب (قبول/رفض)
- `DELETE /deferral-requests/:id` - حذف طلب

---

### الخطوة 3: الصلاحيات

#### في `backend/src/permissions/seeds/permission-seeder.ts`:

```typescript
// إضافة صلاحيات جديدة
{
  resource: 'dashboard.deferral-requests',
  action: 'view',
  displayName: 'عرض طلبات التأجيل',
  category: 'إدارة الطلبات'
},
{
  resource: 'dashboard.deferral-requests',
  action: 'review',
  displayName: 'مراجعة طلبات التأجيل',
  category: 'إدارة الطلبات'
},
{
  resource: 'dashboard.deferral-requests',
  action: 'delete',
  displayName: 'حذف طلبات التأجيل',
  category: 'إدارة الطلبات'
}
```

#### منح الصلاحيات للأدوار:
- **super_admin**: جميع الصلاحيات
- **admin**: view, review
- **financial_manager**: view, review

---

### الخطوة 4: Frontend - لوحة التحكم الإدارية

#### ملفات مطلوبة (2 ملفات):

1. **`src/app/dashboard/requests/page.tsx`** - صفحة قائمة جميع الطلبات
   - جدول الطلبات
   - فلترة (حسب الحالة، البرنامج، المتدرب)
   - أزرار المراجعة

2. **`src/app/dashboard/requests/[id]/page.tsx`** - صفحة تفاصيل ومراجعة طلب
   - معلومات المتدرب
   - معلومات الرسم
   - سبب الطلب
   - نموذج الرد (قبول/رفض)

#### إضافة في Sidebar:
تحديث [`src/app/dashboard/components/DashboardSidebar.tsx`](src/app/dashboard/components/DashboardSidebar.tsx:1):

```typescript
{
  title: 'إدارة الطلبات',
  icon: <FiInbox />,
  requiredPermission: { resource: 'dashboard.deferral-requests', action: 'view' },
  items: [
    {
      title: 'طلبات تأجيل السداد',
      href: '/dashboard/requests/deferral',
      icon: <FiCalendar />,
      requiredPermission: { resource: 'dashboard.deferral-requests', action: 'view' },
    },
  ]
}
```

---

### الخطوة 5: Frontend - منصة المتدربين

#### ملفات مطلوبة (2 ملفات):

1. **`src/app/trainee-dashboard/requests/page.tsx`** - صفحة قائمة طلبات المتدرب
   - جدول طلباتي
   - حالة كل طلب
   - زر "إنشاء طلب جديد"

2. **`src/app/trainee-dashboard/requests/new/page.tsx`** - نموذج إنشاء طلب
   - اختيار الرسم
   - كتابة السبب
   - تحديد عدد الأيام المطلوبة

#### إضافة في Sidebar:
تحديث [`src/app/trainee-dashboard/components/TraineeSidebar.tsx`](src/app/trainee-dashboard/components/TraineeSidebar.tsx:1):

```typescript
{
  title: 'طلباتي',
  href: '/trainee-dashboard/requests',
  icon: InboxIcon,
  description: 'طلبات تأجيل السداد والخدمات'
}
```

---

## 📐 البنية المتوقعة

### Database:
```
PaymentDeferralRequest
├── id (cuid)
├── traineeId → Trainee
├── feeId → TraineeFee
├── reason (سبب المتدرب)
├── requestedExtensionDays (الأيام المطلوبة)
├── status (PENDING/APPROVED/REJECTED)
├── reviewedBy → User (من راجع)
├── reviewedAt (تاريخ المراجعة)
├── adminResponse (رد الإدارة)
└── createdExceptionId (إذا تم القبول)
```

### Flow:

```
المتدرب ينشئ طلب
  ↓
status = PENDING
  ↓
الإدارة تراجع
  ↓
تقبل → status = APPROVED
  ↓
ينشئ TraineePaymentException تلقائياً
  ↓
المتدرب يرى: "تم قبول طلبك"
```

---

## 🎯 الميزات المتوقعة

### في لوحة التحكم الإدارية:
- 📊 عرض جميع الطلبات في جدول
- 🔍 فلترة (قيد المراجعة/مقبول/مرفوض)
- 👁️ عرض تفاصيل الطلب
- ✅ قبول الطلب (مع إنشاء استثناء تلقائي)
- ❌ رفض الطلب (مع ذكر السبب)
- 🔔 عداد الطلبات المعلقة (badge)

### في منصة المتدربين:
- 📝 إنشاء طلب تأجيل جديد
- 📋 عرض قائمة طلباتي
- 🔍 حالة كل طلب (ألوان مختلفة)
- 💬 قراءة رد الإدارة
- 🔔 إشعار عند الرد على الطلب

---

## ⚡ للمتابعة

**الأولوية الآن**:
```bash
# في terminal
cd backend
npx prisma generate
npx prisma db push
```

ثم أخبرني لأكمل تطوير:
- Backend APIs
- Frontend Pages
- الصلاحيات

أو يمكنك إنشاء **task جديدة** بعنوان:
```
"أكمل تطوير نظام طلبات تأجيل السداد:
- Backend APIs كاملة
- صفحة إدارية
- صفحة للمتدربين
- الصلاحيات"
```

---

**Schema جاهز! تبقى التنفيذ.** 🚀