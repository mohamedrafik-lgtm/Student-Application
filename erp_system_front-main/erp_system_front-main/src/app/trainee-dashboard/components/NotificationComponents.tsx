'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  BellIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  ChartBarIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import type { TraineeNotification, NotificationType } from '@/types/trainee-notifications';

// ─── أيقونة ولون كل نوع إشعار ───
const notificationConfig: Record<NotificationType, {
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}> = {
  appeal_response: {
    icon: AcademicCapIcon,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-500',
    borderColor: 'border-purple-200',
  },
  request_response: {
    icon: CheckCircleIcon,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200',
  },
  grades_released: {
    icon: AcademicCapIcon,
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-200',
  },
  payment_upcoming: {
    icon: CurrencyDollarIcon,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-200',
  },
  payment_overdue: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-500',
    borderColor: 'border-rose-200',
  },
  payment_made: {
    icon: BanknotesIcon,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  complaint_response: {
    icon: ChatBubbleLeftEllipsisIcon,
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-500',
    borderColor: 'border-teal-200',
  },
  attendance_warning: {
    icon: ChartBarIcon,
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-200',
  },
  general: {
    icon: BellIcon,
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-500',
    borderColor: 'border-gray-200',
  },
};

// ─── مساعد الوقت النسبي ───
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

// ─── عنصر إشعار واحد ───
interface NotificationItemProps {
  notification: TraineeNotification;
  onRead: (id: string) => void;
  onClose?: () => void;
}

export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const config = notificationConfig[notification.type] || notificationConfig.general;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    if (onClose) onClose();
  };

  const content = (
    <div
      className={`
        flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-200 cursor-pointer
        ${notification.isRead
          ? 'bg-white hover:bg-gray-50'
          : `${config.bgColor} border ${config.borderColor} hover:shadow-sm`
        }
      `}
      onClick={handleClick}
    >
      {/* أيقونة النوع */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
        ${notification.isRead ? 'bg-gray-100' : config.bgColor}
      `}>
        <Icon className={`w-5 h-5 ${notification.isRead ? 'text-gray-400' : config.iconColor}`} />
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-relaxed ${notification.isRead ? 'text-gray-500' : 'text-gray-800 font-semibold'}`}>
            {notification.message}
          </p>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2.5 h-2.5 mt-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link}>{content}</Link>;
  }
  return content;
}

// ─── القائمة المنسدلة للإشعارات ───
interface NotificationDropdownProps {
  notifications: TraineeNotification[];
  unreadCount: number;
  onRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onRead,
  onMarkAllRead,
  onClear,
  onClose,
  isOpen,
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // إغلاق عند النقر خارج القائمة (سطح المكتب فقط)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  // منع السكرول على body عند فتح الشاشة الكاملة على الموبايل
  useEffect(() => {
    if (!isOpen) return;
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;
  if (!mounted) return null;

  const displayedNotifications = notifications.slice(0, 5);

  const dropdown = (
    <>
      {/* Overlay شاشة كاملة على الموبايل */}
      <div className="sm:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]" onClick={onClose} />

      <div
        ref={ref}
        className={
          // موبايل: شاشة كاملة | سطح مكتب: dropdown عادي
          `sm:absolute sm:left-auto sm:right-0 sm:mt-3 sm:w-96 sm:rounded-3xl sm:border sm:border-emerald-100
           fixed inset-0 sm:inset-auto z-[9999]
           bg-white sm:shadow-[0_8px_40px_rgb(0,0,0,0.12)] overflow-hidden
           flex flex-col`
        }
      >
        {/* الهيدر */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm px-5 py-4 border-b border-emerald-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {/* زر إغلاق للموبايل */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-black text-emerald-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                title="تحديد الكل كمقروء"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                title="مسح الكل"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* قائمة الإشعارات */}
        <div className="flex-1 overflow-y-auto sm:max-h-[400px]">
          {displayedNotifications.length === 0 ? (
            <div className="py-16 sm:py-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BellIcon className="w-8 h-8 text-emerald-300" />
              </div>
              <p className="text-emerald-600 text-sm font-bold">لا توجد إشعارات</p>
              <p className="text-gray-400 text-xs mt-1">ستظهر الإشعارات هنا عند وصولها</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {displayedNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={onRead}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* الفوتر - دائماً ظاهر */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-emerald-100 px-5 py-3 text-center safe-area-bottom">
          <Link
            href="/trainee-dashboard/notifications"
            onClick={onClose}
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            عرض كل الإشعارات{notifications.length > 0 ? ` (${notifications.length})` : ''}
          </Link>
        </div>
      </div>
    </>
  );

  // على الموبايل: نستخدم portal لنعرض فوق كل شيء
  // على سطح المكتب: نعرض في المكان الطبيعي (relative positioning)
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return createPortal(dropdown, document.body);
  }

  return dropdown;
}

// ─── زر الجرس مع العداد ───
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-3 rounded-2xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
      aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} جديد)` : ''}`}
    >
      {unreadCount > 0 ? (
        <BellSolidIcon className="w-6 h-6 text-white animate-[ring_0.5s_ease-in-out]" />
      ) : (
        <BellIcon className="w-6 h-6" />
      )}

      {/* عداد الإشعارات */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-rose-500 rounded-full border-2 border-emerald-600 shadow-lg animate-bounce">
          {unreadCount > 9 ? '+9' : unreadCount}
        </span>
      )}
    </button>
  );
}
