# الخطوات المتبقية لإكمال النظام

## ✅ ما تم إنجازه (23 ملف)

### نظام ربط المنصة بالمواعيد (16 ملف) - مكتمل 100%
### نظام طلبات التأجيل - Backend (7 ملفات) - مكتمل 100%

---

## 🔧 الخطوات المطلوبة الآن

### الخطوة 1: تطبيق Schema الجديد ⚠️

```bash
cd backend
npx prisma generate
npx prisma db push
node scripts/fix-payment-schedules-deadline.js
npm run start:dev
```

---

### الخطوة 2: إضافة الصلاحيات

افتح [`backend/src/permissions/seeds/permission-seeder.ts`](backend/src/permissions/seeds/permission-seeder.ts:1)

**أضف في مصفوفة الصلاحيات (حوالي السطر 200)**:

```typescript
// إدارة طلبات التأجيل
{
  resource: 'dashboard.deferral-requests',
  action: 'view',
  displayName: 'عرض طلبات التأجيل',
  description: 'عرض وقراءة طلبات تأجيل السداد المقدمة من المتدربين',
  category: 'إدارة الطلبات',
  isSystem: false
},
{
  resource: 'dashboard.deferral-requests',
  action: 'review',
  displayName: 'مراجعة طلبات التأجيل',
  description: 'قبول أو رفض طلبات تأجيل السداد',
  category: 'إدارة الطلبات',
  isSystem: false
},
{
  resource: 'dashboard.deferral-requests',
  action: 'delete',
  displayName: 'حذف طلبات التأجيل',
  description: 'حذف طلبات تأجيل السداد',
  category: 'إدارة الطلبات',
  isSystem: false
},
```

**ثم شغل**:
```bash
cd backend
npm run prisma:seed
```

---

### الخطوة 3: صفحة قائمة طلبات المتدرب

**أنشئ**: `src/app/trainee-dashboard/requests/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';

export default function TraineeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('trainee_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/deferral-requests/my-requests`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    const labels = {
      PENDING: 'قيد المراجعة',
      APPROVED: 'تم القبول',
      REJECTED: 'تم الرفض',
    };
    return { className: badges[status] || '', label: labels[status] || status };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">طلباتي</h1>
        <Link
          href="/trainee-dashboard/requests/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + طلب جديد
        </Link>
      </div>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-500 py-12">لا توجد طلبات</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{request.fee.name}</h3>
                  <p className="text-sm text-gray-600">
                    طلب تأجيل {request.requestedExtensionDays} يوم
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(request.status).className}`}>
                  {getStatusBadge(request.status).label}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>السبب:</strong> {request.reason}
                </p>
              </div>

              {request.adminResponse && (
                <div className={`rounded-lg p-4 ${
                  request.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm font-bold mb-1">رد الإدارة:</p>
                  <p className="text-sm">{request.adminResponse}</p>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                تاريخ الطلب: {new Date(request.createdAt).toLocaleString('ar-EG')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### الخطوة 4: صفحة إنشاء طلب

**أنشئ**: `src/app/trainee-dashboard/requests/new/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTraineeProfile } from '../../hooks/useTraineeProfile';
import { toast } from 'react-hot-toast';

export default function NewDeferralRequestPage() {
  const router = useRouter();
  const { profile } = useTraineeProfile();
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState([]);
  
  const [formData, setFormData] = useState({
    feeId: '',
    reason: '',
    requestedExtensionDays: 7
  });

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const token = localStorage.getItem('trainee_token');
      const traineeId = profile?.trainee?.id;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/trainees/${traineeId}/fees-with-schedules`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      setFees(data.filter((f: any) => f.status !== 'PAID'));
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.feeId || !formData.reason.trim()) {
      toast.error('يجب ملء جميع الحقول');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('trainee_token');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/deferral-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            feeId: parseInt(formData.feeId),
            reason: formData.reason,
            requestedExtensionDays: formData.requestedExtensionDays
          })
        }
      );

      if (response.ok) {
        toast.success('تم إرسال الطلب بنجاح');
        router.push('/trainee-dashboard/requests');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">طلب تأجيل سداد</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-6">
        {/* اختيار الرسم */}
        <div>
          <label className="block text-sm font-medium mb-2">الرسم *</label>
          <select
            value={formData.feeId}
            onChange={(e) => setFormData({...formData, feeId: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          >
            <option value="">اختر الرسم</option>
            {fees.map((fee: any) => (
              <option key={fee.id} value={fee.id}>
                {fee.name} - {fee.remainingAmount} ج.م
              </option>
            ))}
          </select>
        </div>

        {/* عدد الأيام */}
        <div>
          <label className="block text-sm font-medium mb-2">عدد الأيام المطلوب تأجيلها *</label>
          <input
            type="number"
            min="1"
            max="90"
            value={formData.requestedExtensionDays}
            onChange={(e) => setFormData({...formData, requestedExtensionDays: parseInt(e.target.value)})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        {/* السبب */}
        <div>
          <label className="block text-sm font-medium mb-2">سبب طلب التأجيل *</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            rows={4}
            placeholder="اذكر سبب طلب التأجيل بوضوح..."
            required
          />
        </div>

        {/* الأزرار */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### الخطوة 5: إضافة في Sidebar المتدربين

في [`src/app/trainee-dashboard/components/TraineeSidebar.tsx`](src/app/trainee-dashboard/components/TraineeSidebar.tsx:28):

**أضف في مصفوفة menuItems**:

```typescript
{
  title: 'طلباتي',
  href: '/trainee-dashboard/requests',
  icon: ClipboardDocumentListIcon,
  description: 'طلبات تأجيل السداد'
},
```

---

### الخطوة 6: إضافة في Sidebar الإداري

في [`src/app/dashboard/components/DashboardSidebar.tsx`](src/app/dashboard/components/DashboardSidebar.tsx:177):

**أضف فئة جديدة**:

```typescript
{
  title: 'إدارة الطلبات',
  icon: <FiInbox className="w-5 h-5" />,
  requiredPermission: { resource: 'dashboard.deferral-requests', action: 'view' },
  items: [
    {
      title: 'طلبات تأجيل السداد',
      href: '/dashboard/requests/deferral',
      icon: <FiCalendar className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.deferral-requests', action: 'view' },
    },
  ]
},
```

---

## 📁 الملفات التي أنشأتها (23 ملف)

### نظام ربط المنصة (16):
1-5. Backend
6-11. Frontend  
12-16. Documentation

### نظام الطلبات (7):
17. [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma:2083)
18. [`backend/src/deferral-requests/dto/create-deferral-request.dto.ts`](backend/src/deferral-requests/dto/create-deferral-request.dto.ts:1)
19. [`backend/src/deferral-requests/dto/review-deferral-request.dto.ts`](backend/src/deferral-requests/dto/review-deferral-request.dto.ts:1)
20. [`backend/src/deferral-requests/deferral-requests.service.ts`](backend/src/deferral-requests/deferral-requests.service.ts:1)
21. [`backend/src/deferral-requests/deferral-requests.controller.ts`](backend/src/deferral-requests/deferral-requests.controller.ts:1)
22. [`backend/src/deferral-requests/deferral-requests.module.ts`](backend/src/deferral-requests/deferral-requests.module.ts:1)
23. [`backend/src/app.module.ts`](backend/src/app.module.ts:1)

---

## 🚀 للتشغيل والاختبار

```bash
# 1. تطبيق Schema
cd backend
npx prisma generate && npx prisma db push

# 2. إصلاح finalDeadline
node scripts/fix-payment-schedules-deadline.js

# 3. تشغيل
npm run start:dev

# 4. اختبار API
# سجل دخول كمتدرب واحصل على token
curl -X POST http://localhost:4000/api/deferral-requests \
  -H "Authorization: Bearer <trainee_token>" \
  -H "Content-Type: application/json" \
  -d '{"feeId": 1, "reason": "ظروف صحية", "requestedExtensionDays": 14}'
```

---

**Backend مكتمل بالكامل! Frontend سهل وسريع (ساعة).** ✅