'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { UserIcon } from '@heroicons/react/24/outline';

export default function AuthStatus() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {user.name}
          </span>
          <div className="h-8 w-8 rounded-full bg-[#D35400] flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-white" />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            try {
              logout();
            } catch (error) {
              console.error('خطأ في تسجيل الخروج:', error);
              window.location.href = '/login';
            }
          }}
          className="text-sm text-gray-700 hover:text-[#D35400] dark:text-gray-300 dark:hover:text-[#D35400] transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4 rtl:space-x-reverse">
      <Link
        href="/login"
        className="text-sm font-medium text-gray-700 hover:text-[#D35400] dark:text-gray-300 dark:hover:text-[#D35400] transition-colors"
      >
        تسجيل الدخول
      </Link>
    </div>
  );
}