'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon
} from '@heroicons/react/24/outline';

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const userMenu = document.getElementById('user-menu');
      const userMenuButton = document.getElementById('user-menu-button');
      const notificationsMenu = document.getElementById('notifications-menu');
      const notificationsButton = document.getElementById('notifications-button');

      if (
        isUserMenuOpen && 
        userMenu && 
        !userMenu.contains(event.target as Node) && 
        userMenuButton && 
        !userMenuButton.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }

      if (
        isNotificationsOpen && 
        notificationsMenu && 
        !notificationsMenu.contains(event.target as Node) && 
        notificationsButton && 
        !notificationsButton.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isNotificationsOpen]);

  // Sample notifications
  const notifications = [
    {
      id: 1,
      title: 'تم تسجيل متدرب جديد',
      message: 'تم تسجيل أحمد محمد في برنامج تطوير الويب',
      time: 'منذ 5 دقائق',
      isRead: false,
    },
    {
      id: 2,
      title: 'تحديث في النظام',
      message: 'تم تحديث النظام إلى الإصدار الجديد',
      time: 'منذ ساعة',
      isRead: true,
    },
    {
      id: 3,
      title: 'تذكير بالاجتماع',
      message: 'اجتماع فريق العمل غدًا الساعة 10 صباحًا',
      time: 'منذ 3 ساعات',
      isRead: true,
    },
  ];

  return (
    <header className="bg-white border-b border-tiba-gray-200 h-16 fixed top-0 left-0 right-0 z-20 lg:right-64 transition-all duration-300">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-tiba-gray-400" />
            </div>
            <input 
              type="search" 
              className="block w-full p-2 pr-10 text-sm text-tiba-gray-800 border border-tiba-gray-200 rounded-lg bg-tiba-gray-50 focus:ring-tiba-primary-500 focus:border-tiba-primary-500 placeholder-tiba-gray-400" 
              placeholder="بحث..." 
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              id="notifications-button"
              className="p-2 rounded-full text-tiba-gray-600 hover:bg-tiba-gray-100 relative"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <BellIcon className="w-6 h-6" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1 left-1 w-2.5 h-2.5 bg-tiba-danger-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div 
                id="notifications-menu"
                className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-tiba-gray-200 py-2 z-50 animate-fade-in"
              >
                <div className="px-4 py-2 border-b border-tiba-gray-200">
                  <h3 className="text-sm font-medium text-tiba-gray-800">الإشعارات</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-tiba-gray-200">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-tiba-gray-50 cursor-pointer ${!notification.isRead ? 'bg-tiba-primary-50' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-tiba-gray-800">{notification.title}</h4>
                            <span className="text-xs text-tiba-gray-500">{notification.time}</span>
                          </div>
                          <p className="text-xs text-tiba-gray-600 mt-1">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-tiba-gray-500">لا توجد إشعارات</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-tiba-gray-200">
                  <Link 
                    href="#" 
                    className="text-xs text-tiba-primary-700 hover:text-tiba-primary-800 font-medium block text-center"
                  >
                    عرض كل الإشعارات
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              id="user-menu-button"
              className="flex items-center gap-2 p-2 rounded-lg text-tiba-gray-700 hover:bg-tiba-gray-50"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="w-8 h-8 bg-tiba-primary-100 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-tiba-primary-700" />
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">{user?.name || 'المستخدم'}</p>
                <p className="text-xs text-tiba-gray-500">{user?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-tiba-gray-500" />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div 
                id="user-menu"
                className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-tiba-gray-200 py-1 z-50 animate-fade-in"
              >
                <div className="px-4 py-2 border-b border-tiba-gray-200">
                  <p className="text-sm font-medium text-tiba-gray-800">{user?.name}</p>
                  <p className="text-xs text-tiba-gray-500">{user?.email}</p>
                </div>
                <ul>
                  <li>
                    <Link 
                      href="/dashboard/profile" 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-tiba-gray-700 hover:bg-tiba-gray-50"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/dashboard/settings" 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-tiba-gray-700 hover:bg-tiba-gray-50"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      <span>الإعدادات</span>
                    </Link>
                  </li>
                  <li className="border-t border-tiba-gray-200">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setIsUserMenuOpen(false);
                        try {
                          logout();
                        } catch (error) {
                          console.error('خطأ في تسجيل الخروج:', error);
                          window.location.href = '/login';
                        }
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-tiba-danger-600 hover:bg-tiba-danger-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 