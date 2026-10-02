'use client';

import {
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';
import { SERVER_BASE_URL } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTraineeNotifications } from '@/contexts/TraineeNotificationContext';
import { NotificationBell, NotificationDropdown } from './NotificationComponents';
import MobileAppPromoModal from './MobileAppPromoModal';

interface TraineeTopbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
  traineeData: any;
  mobileApp?: { enabled: boolean; googlePlayUrl: string; appStoreUrl: string; status: string } | null;
}

export default function TraineeTopbar({ onMenuClick, onLogout, traineeData, mobileApp }: TraineeTopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useTraineeNotifications();

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${SERVER_BASE_URL}${url}`;
  };

  return (
    <header className="sticky top-4 z-30 mx-4 lg:mx-8 mb-8">
      {/* Close dropdowns when clicking outside */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => {
            setShowUserMenu(false);
          }}
        />
      )}
      <div className="relative z-30 bg-emerald-600/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(16,185,129,0.2)] border border-emerald-500/30 rounded-3xl px-6 py-4 flex items-center justify-between">
        {/* Right side - Mobile menu button & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden relative p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-xl font-black text-white tracking-tight">
              مرحباً بك، {traineeData?.nameAr?.split(' ')[0] || 'المتدرب'} 👋
            </h1>
            <p className="text-sm font-bold text-white/80 mt-0.5">
              نظام إدارة التدريب
            </p>
          </div>
        </div>

        {/* Left side - User actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Notifications */}
          <div className="relative">
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
            />
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              onClear={clearNotifications}
              onClose={() => setShowNotifications(false)}
              isOpen={showNotifications}
            />
          </div>

          {/* Mobile App Button */}
          {mobileApp && mobileApp.enabled && (
            <button
              onClick={() => setShowAppModal(true)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white transition-all duration-300 border border-white/10 hover:border-white/20"
              title="تحميل التطبيق"
            >
              <DevicePhoneMobileIcon className="w-5 h-5" />
              <span className="hidden sm:block text-xs font-bold">التطبيق</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse border-2 border-emerald-600" />
            </button>
          )}

          <div className="w-px h-8 bg-emerald-500/50 hidden sm:block"></div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-black text-white line-clamp-1">
                  {traineeData?.nameAr || 'المتدرب'}
                </p>
                <p className="text-xs font-bold text-white/80 line-clamp-1">
                  {traineeData?.program?.nameAr || 'متدرب'}
                </p>
              </div>
              <Avatar className="w-11 h-11 border-2 border-white/20 shadow-sm">
                <AvatarImage src={getImageUrl(traineeData?.photoUrl)} alt={traineeData?.nameAr} />
                <AvatarFallback className="bg-white/20 text-white font-bold">
                  {traineeData?.nameAr?.charAt(0) || <UserCircleIcon className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute left-0 mt-4 w-72 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-emerald-100 py-2 z-50 overflow-hidden">
                {/* User Info */}
                <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50/50">
                  <p className="text-sm font-black text-emerald-900 mb-1.5">
                    {traineeData?.nameAr}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      الرقم القومي: <span dir="ltr">{traineeData?.nationalId}</span>
                    </p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {traineeData?.program?.nameAr}
                    </p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-3 px-3">
                  <Link 
                    href="/trainee-dashboard/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-2xl transition-all duration-200"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    البيانات الشخصية
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-emerald-100 pt-3 px-3 pb-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile App Promo Modal */}
      {mobileApp && mobileApp.enabled && (
        <MobileAppPromoModal
          mobileApp={mobileApp}
          isOpen={showAppModal}
          onClose={() => setShowAppModal(false)}
        />
      )}
    </header>
  );
}
