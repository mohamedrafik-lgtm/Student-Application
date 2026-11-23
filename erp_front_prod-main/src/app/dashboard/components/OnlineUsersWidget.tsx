'use client';

import { useState } from 'react';
import { useOnlineUsers } from '../../../hooks/useOnlineUsers';
import { getImageUrl } from '../../../lib/api';

// خريطة الصفحات بالعربية
const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/dashboard/trainees': 'المتدربين',
  '/dashboard/trainees/archive': 'أرشيف المتدربين',
  '/dashboard/trainees/id-cards': 'البطاقات',
  '/dashboard/trainees/export': 'تصدير المتدربين',
  '/dashboard/trainees/transfer': 'نقل المتدربين',
  '/dashboard/trainees/distribution': 'توزيع المتدربين',
  '/dashboard/trainees/undistributed': 'غير الموزعين',
  '/dashboard/programs': 'البرامج',
  '/dashboard/classrooms': 'القاعات',
  '/dashboard/schedule': 'الجداول',
  '/dashboard/attendance': 'الحضور',
  '/dashboard/attendance-records': 'سجلات الحضور',
  '/dashboard/training-contents': 'المحتوى التدريبي',
  '/dashboard/question-bank': 'بنك الأسئلة',
  '/dashboard/quizzes': 'الاختبارات',
  '/dashboard/paper-exams': 'الاختبارات الورقية',
  '/dashboard/control': 'الكنترول',
  '/dashboard/grade-release': 'إصدار الدرجات',
  '/dashboard/grades': 'الدرجات',
  '/dashboard/grades/top-students': 'الأوائل',
  '/dashboard/grades/second-round': 'الدور الثاني',
  '/dashboard/grades/bulk-upload': 'رفع الدرجات',
  '/dashboard/grades/mercy-grades': 'درجات الرأفة',
  '/dashboard/study-materials': 'المواد الدراسية',
  '/dashboard/study-materials/deliveries': 'تسليم المواد',
  '/dashboard/finances/safes': 'الخزنات',
  '/dashboard/finances/payment-schedules': 'جداول الدفع',
  '/dashboard/finances/trainee-payments': 'مدفوعات المتدربين',
  '/dashboard/finances/entries': 'القيود المالية',
  '/dashboard/finances/reports': 'التقارير المالية',
  '/dashboard/finances/commissions': 'العمولات',
  '/dashboard/finances/audit-logs': 'سجل المراجعة',
  '/dashboard/finances/trainee-fees': 'رسوم المتدربين',
  '/dashboard/staff-attendance': 'حضور الموظفين',
  '/dashboard/staff-attendance/logs': 'سجلات الموظفين',
  '/dashboard/staff-attendance/employees': 'الموظفين',
  '/dashboard/staff-attendance/leaves': 'الإجازات',
  '/dashboard/staff-attendance/holidays': 'العطل',
  '/dashboard/staff-attendance/settings': 'إعدادات الحضور',
  '/dashboard/jobs': 'الوظائف',
  '/dashboard/news': 'الأخبار',
  '/dashboard/registrations': 'التسجيلات',
  '/dashboard/marketing/employees': 'موظفي التسويق',
  '/dashboard/marketing/targets': 'أهداف التسويق',
  '/dashboard/marketing/applications': 'طلبات التسويق',
  '/dashboard/marketing/stats': 'إحصائيات التسويق',
  '/dashboard/whatsapp': 'واتساب',
  '/dashboard/permissions': 'الصلاحيات',
  '/dashboard/settings': 'الإعدادات',
  '/dashboard/profile': 'الملف الشخصي',
  '/dashboard/users': 'المستخدمين',
  '/dashboard/distribution/students': 'توزيع الطلاب',
  '/dashboard/complaints': 'الشكاوى',
  '/dashboard/surveys': 'الاستبيانات',
  '/dashboard/requests/grade-appeals/fees': 'رسوم التظلمات',
  '/dashboard/grades/second-round-fees': 'رسوم الدور الثاني',
  '/dashboard/payment-reminders': 'تذكيرات الدفع',
};

function getPageName(path: string | null): string {
  if (!path) return '—';
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const parts = path.split('/');
  while (parts.length > 2) {
    parts.pop();
    const parent = parts.join('/');
    if (PAGE_NAMES[parent]) return PAGE_NAMES[parent];
  }
  return path.replace('/dashboard/', '').replace('/dashboard', 'لوحة التحكم') || 'لوحة التحكم';
}

function getLastSeenText(timestamp: number | null): string {
  if (!timestamp) return 'لم يسجل دخول بعد';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 30) return 'الآن';
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'منذ يوم';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

type TabType = 'online' | 'all';

export default function OnlineUsersWidget() {
  const { users, onlineCount, loading } = useOnlineUsers(15000);
  const [activeTab, setActiveTab] = useState<TabType>('online');

  const onlineUsers = users.filter(u => u.isOnline);
  const offlineUsers = users.filter(u => !u.isOnline);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">المتصلون الآن</h3>
            <p className="text-sm text-gray-500">جاري التحميل...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">تتبع المستخدمين</h3>
            <p className="text-sm text-gray-500">{onlineCount} متصل من {users.length}</p>
          </div>
        </div>
        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full">
          {onlineCount}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'online'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          متصل ({onlineCount})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'all'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          آخر ظهور ({offlineUsers.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'online' ? (
        onlineCount === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">لا يوجد مستخدمين متصلين حالياً</p>
          </div>
        ) : (
          <UserList users={onlineUsers} showOnlineIndicator />
        )
      ) : (
        offlineUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">جميع المستخدمين متصلون الآن!</p>
          </div>
        ) : (
          <UserList users={offlineUsers} showOnlineIndicator={false} />
        )
      )}
    </div>
  );
}

function UserList({ users, showOnlineIndicator }: { users: any[]; showOnlineIndicator: boolean }) {
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {users.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user.photoUrl ? (
                <img
                  src={getImageUrl(user.photoUrl)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            {/* Status indicator */}
            <span className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
              showOnlineIndicator ? 'bg-emerald-500' : 'bg-gray-400'
            }`} />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              {user.accountType === 'INSTRUCTOR' && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">
                  مدرب
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {showOnlineIndicator ? (
                <>
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <p className="text-xs text-gray-500 truncate">
                    {getPageName(user.currentPage)}
                  </p>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <p className="text-xs text-gray-500 truncate">
                    آخر ظهور: {getLastSeenText(user.lastSeen)}
                  </p>
                </>
              )}
            </div>
            {/* Show last page for offline users */}
            {!showOnlineIndicator && user.currentPage && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <p className="text-xs text-gray-400 truncate">
                  آخر صفحة: {getPageName(user.currentPage)}
                </p>
              </div>
            )}
          </div>

          {/* Time badge */}
          <span className={`text-[11px] flex-shrink-0 ${
            showOnlineIndicator ? 'text-emerald-600 font-medium' : 'text-gray-400'
          }`}>
            {showOnlineIndicator ? getLastSeenText(user.lastSeen) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
