'use client';

import React, { useState, ReactNode, useEffect } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { FiSearch, FiBell, FiMail, FiHelpCircle, FiUser, FiX, FiMenu, FiLogOut } from 'react-icons/fi';
import PremiumLoader from '../../components/ui/PremiumLoader';
import OnboardingPresentation from '../../components/ui/OnboardingPresentation';
import Link from 'next/link';
import { latestVersion } from '../../lib/updates-data';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // إظهار المودال مرة واحدة فقط عند تسجيل الدخول
  useEffect(() => {
    if (!isLoading && user) {
      const hasShownWelcome = localStorage.getItem('onboardingV2Shown');
      if (!hasShownWelcome) {
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 1000);
      }
    }
  }, [isLoading, user]);
  
  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('DashboardLayout: User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // إغلاق القوائم عند النقر خارجها
  const closeMenus = () => {
    setNotificationsOpen(false);
    setMessagesOpen(false);
    setUserMenuOpen(false);
  };

  // شاشة تحميل احترافية متقدمة
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-4 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-4 w-72 h-72 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10">
          <PremiumLoader type="system" size="lg" message="جاري التحميل" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-right rtl overflow-hidden font-sans">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden lg:mr-72 transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          {/* Close dropdowns when clicking outside */}
          {(userMenuOpen || notificationsOpen || messagesOpen) && (
            <div 
              className="fixed inset-0 z-20" 
              onClick={closeMenus}
            />
          )}
          
          {/* Right side - Mobile menu button & Title */}
          <div className="flex items-center gap-4 relative z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden relative p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-300"
            >
              <FiMenu className="w-6 h-6" />
            </button>

            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                مرحباً بك، {user?.name?.split(' ')[0] || 'مدير'} 👋
              </h1>
            </div>
          </div>

          {/* Left side - User actions */}
          <div className="flex items-center gap-4 relative z-30">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setUserMenuOpen(false);
                  setMessagesOpen(false);
                  setNotificationsOpen(!notificationsOpen);
                }}
                className="relative p-2.5 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all duration-300"
              >
                <FiBell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute left-0 mt-4 w-80 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-blue-900">الإشعارات</h3>
                    <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      تحديد الكل كمقروء
                    </button>
                  </div>
                  <div className="py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FiBell className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">لا توجد إشعارات جديدة</p>
                    </div>
                  </div>
                  <div className="p-3 border-t border-slate-100 text-center">
                    <Link 
                      href="/dashboard/notifications"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      onClick={closeMenus}
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
                onClick={() => {
                  setNotificationsOpen(false);
                  setMessagesOpen(false);
                  setUserMenuOpen(!userMenuOpen);
                }}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-50 transition-all duration-300 border border-transparent hover:border-slate-200"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-blue-900 line-clamp-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-200"></span>
                    {user?.name || 'مدير النظام'}
                  </p>
                </div>
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt={user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'م'
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute left-0 mt-4 w-64 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 z-50 overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-blue-900 mb-1">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-3 px-3">
                    <Link 
                      href="/dashboard/profile"
                      onClick={closeMenus}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-2xl transition-all duration-200"
                    >
                      <FiUser className="w-5 h-5" />
                      البيانات الشخصية
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 pt-3 px-3 pb-1">
                    <button
                      onClick={() => logout && logout()}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-2xl transition-all duration-200"
                    >
                      <FiLogOut className="w-5 h-5" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* المحتوى الرئيسي */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8">
          {children}
        </main>
      </div>
      
      {/* خلفية معتمة عند فتح القوائم */}
      {(notificationsOpen || messagesOpen || userMenuOpen) && (
        <div 
          className="fixed inset-0 z-20 bg-black/20" 
          onClick={() => {
            setNotificationsOpen(false);
            setMessagesOpen(false);
            setUserMenuOpen(false);
          }}
        ></div>
      )}

      {/* Onboarding Presentation */}
      {showWelcomeModal && (
        <OnboardingPresentation
          onComplete={() => {
            setShowWelcomeModal(false);
            localStorage.setItem('onboardingV2Shown', 'true');
          }}
        />
      )}
    </div>
  );
}
