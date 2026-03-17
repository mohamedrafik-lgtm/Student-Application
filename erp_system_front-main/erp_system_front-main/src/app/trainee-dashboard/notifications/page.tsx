'use client';

import { useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ArrowPathIcon,
  BellAlertIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  BanknotesIcon,
  SparklesIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useTraineeNotifications } from '@/contexts/TraineeNotificationContext';
import { NotificationItem } from '../components/NotificationComponents';
import type { NotificationType } from '@/types/trainee-notifications';

const filterOptions: { key: NotificationType | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'الكل', icon: BellIcon, color: 'emerald' },
  { key: 'appeal_response', label: 'التظلمات', icon: AcademicCapIcon, color: 'purple' },
  { key: 'request_response', label: 'الطلبات', icon: CheckCircleIcon, color: 'blue' },
  { key: 'grades_released', label: 'النتائج', icon: AcademicCapIcon, color: 'green' },
  { key: 'payment_made', label: 'تم السداد', icon: BanknotesIcon, color: 'green' },
  { key: 'payment_upcoming', label: 'المدفوعات', icon: CurrencyDollarIcon, color: 'amber' },
  { key: 'payment_overdue', label: 'المتأخرات', icon: ExclamationTriangleIcon, color: 'rose' },
  { key: 'complaint_response', label: 'الشكاوي', icon: ChatBubbleLeftEllipsisIcon, color: 'teal' },
];

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useTraineeNotifications();

  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');
  const [showReadFilter, setShowReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  // تطبيق الفلاتر
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter !== 'all' && n.type !== activeFilter) return false;
    if (showReadFilter === 'unread' && n.isRead) return false;
    if (showReadFilter === 'read' && !n.isRead) return false;
    return true;
  });

  const readCount = notifications.filter(n => n.isRead).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">

      {/* ─── Hero Card ─── */}
      <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <BellSolidIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">الإشعارات</h1>
                <p className="text-white/70 text-xs sm:text-sm font-bold mt-0.5">جميع التنبيهات والتحديثات الخاصة بك</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 disabled:opacity-50"
                title="تحديث"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">تحديد الكل كمقروء</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-white/10 hover:bg-rose-500/30 text-white rounded-xl transition-all border border-white/10"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">مسح الكل</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-5 border-t border-white/20">
            <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
              <p className="text-2xl sm:text-3xl font-black">{notifications.length}</p>
              <p className="text-[10px] sm:text-xs font-bold text-white/60 mt-1">إجمالي الإشعارات</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
              <p className="text-2xl sm:text-3xl font-black">{unreadCount}</p>
              <p className="text-[10px] sm:text-xs font-bold text-white/60 mt-1">غير مقروء</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/10 text-center">
              <p className="text-2xl sm:text-3xl font-black">{readCount}</p>
              <p className="text-[10px] sm:text-xs font-bold text-white/60 mt-1">مقروء</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters Card ─── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            تصفية الإشعارات
          </h3>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {/* نوع الإشعار */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => {
              const FilterIcon = option.icon;
              return (
                <button
                  key={option.key}
                  onClick={() => setActiveFilter(option.key)}
                  className={`
                    flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200
                    ${activeFilter === option.key
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-[1.02]'
                      : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200'
                    }
                  `}
                >
                  <FilterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* حالة القراءة */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 ml-1">الحالة:</span>
            {([
              { key: 'all' as const, label: 'الكل' },
              { key: 'unread' as const, label: 'غير مقروء' },
              { key: 'read' as const, label: 'مقروء' },
            ]).map(filter => (
              <button
                key={filter.key}
                onClick={() => setShowReadFilter(filter.key)}
                className={`
                  px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200
                  ${showReadFilter === filter.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
            <span className="text-xs text-slate-400 mr-auto">
              {filteredNotifications.length} إشعار
            </span>
          </div>
        </div>
      </div>

      {/* ─── Notifications List ─── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BellAlertIcon className="w-5 h-5 text-emerald-600" />
            {activeFilter === 'all' ? 'كل الإشعارات' : filterOptions.find(f => f.key === activeFilter)?.label || 'الإشعارات'}
          </h3>
          <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {filteredNotifications.length} إشعار
          </span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="p-8 sm:p-16 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <InboxIcon className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {activeFilter !== 'all' || showReadFilter !== 'all'
                ? 'لا توجد إشعارات تطابق الفلتر'
                : 'لا توجد إشعارات بعد'
              }
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {activeFilter !== 'all' || showReadFilter !== 'all'
                ? 'جرب تغيير الفلاتر لعرض إشعارات أخرى'
                : 'ستظهر الإشعارات هنا عند وصول تحديثات جديدة'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map(notification => (
              <div key={notification.id} className="hover:bg-slate-50/50 transition-colors">
                <NotificationItem
                  notification={notification}
                  onRead={markAsRead}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Footer info ─── */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 sm:p-5 flex items-center justify-center gap-3">
        <ArrowPathIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <p className="text-xs font-bold text-emerald-600/70">
          يتم تحديث الإشعارات تلقائياً كل 3 دقائق • حالة القراءة محفوظة على جهازك
        </p>
      </div>
    </div>
  );
}
