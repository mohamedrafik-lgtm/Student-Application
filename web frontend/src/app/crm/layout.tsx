'use client';

import React, { useState, ReactNode, useEffect } from 'react';
import CrmSidebar from './components/CrmSidebar';
import { useAuth } from '../../lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { FiBell, FiUser, FiMenu, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PremiumLoader from '../../components/ui/PremiumLoader';
import Link from 'next/link';
import { ChatSocketProvider, useChatSocket } from '../../contexts/ChatSocketContext';
import { CrmInboxSocketProvider } from '../../contexts/CrmInboxSocketContext';
import { fetchAPI } from '../../lib/api';

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <ChatSocketProvider>
      <CrmInboxSocketProvider>
        <CrmLayoutInner>{children}</CrmLayoutInner>
      </CrmInboxSocketProvider>
    </ChatSocketProvider>
  );
}

function CrmLayoutInner({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { socket } = useChatSocket();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // التحقق من تسجيل الدخول وصلاحية CRM
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!isLoading && user) {
      const isAdminAccount = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'].includes(user.accountType || '');
      const isAdminRole = user.roles?.some(r => ['super_admin', 'system_admin', 'admin'].includes(r.name || ''));
      if (!user.hasCrmAccess && !isAdminAccount && !isAdminRole) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, user, router]);

  // جلب عدد الرسائل غير المقروءة
  const fetchUnread = React.useCallback(async () => {
    try {
      const convs = await fetchAPI('/chat/conversations');
      const total = convs.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setTotalUnread(total);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnread]);

  // تحديث الرسائل غير المقروءة عبر الـ socket
  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (message: any) => {
      fetchUnread();
      if (message?.senderId !== user?.id) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(830, now);
          gain1.gain.setValueAtTime(0.15, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc1.connect(gain1).connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.3);
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1100, now + 0.12);
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.setValueAtTime(0.18, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc2.connect(gain2).connect(ctx.destination);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.45);
          setTimeout(() => ctx.close(), 600);
        } catch {}
      }
    };
    socket.on('message:new', handleNewMsg);
    return () => { socket.off('message:new', handleNewMsg); };
  }, [socket, fetchUnread, user?.id]);

  const closeMenus = () => {
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-4 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-4 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
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

  // مسار /crm فقط: عرض صفحة كاملة بدون الشريط الجانبي أو التوب بار
  if (pathname === '/crm') {
    return (
      <div className="h-screen overflow-hidden bg-slate-950 text-right rtl font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-right rtl overflow-hidden font-sans">
      <CrmSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden lg:mr-72 transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          {(userMenuOpen || notificationsOpen) && (
            <div className="fixed inset-0 z-20" onClick={closeMenus} />
          )}
          
          {/* Right side */}
          <div className="flex items-center gap-4 relative z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden relative p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-300"
            >
              <FiMenu className="w-6 h-6" />
            </button>

            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                نظام CRM 🤝
              </h1>
            </div>
          </div>

          {/* Left side */}
          <div className="flex items-center gap-4 relative z-30">
            {/* العودة للوحة الإدارية */}
            <Link 
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
            >
              <FiArrowLeft className="w-4 h-4" />
              اللوحة الإدارية
            </Link>

            {/* Chat */}
            <div className="relative">
              <button 
                onClick={() => router.push('/crm/chat')}
                className="relative p-2.5 rounded-full bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
                title="المحادثات"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white shadow-sm">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setUserMenuOpen(false);
                  setNotificationsOpen(!notificationsOpen);
                }}
                className="relative p-2.5 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all duration-300"
              >
                <FiBell className="w-5 h-5" />
              </button>

              {notificationsOpen && (
                <div className="absolute left-0 mt-4 w-80 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-blue-900">الإشعارات</h3>
                  </div>
                  <div className="py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FiBell className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">لا توجد إشعارات جديدة</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(false);
                  setUserMenuOpen(!userMenuOpen);
                }}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-50 transition-all duration-300 border border-transparent hover:border-slate-200"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-blue-900 line-clamp-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-200"></span>
                    {user?.name || 'مستخدم'}
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

              {userMenuOpen && (
                <div className="absolute left-0 mt-4 w-64 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-blue-900 mb-1">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <div className="py-3 px-3">
                    <Link 
                      href="/crm/profile"
                      onClick={closeMenus}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-2xl transition-all duration-200"
                    >
                      <FiUser className="w-5 h-5" />
                      البيانات الشخصية
                    </Link>
                  </div>

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
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
      
      {/* خلفية معتمة عند فتح القوائم */}
      {(notificationsOpen || userMenuOpen) && (
        <div 
          className="fixed inset-0 z-20 bg-black/20" 
          onClick={closeMenus}
        ></div>
      )}
    </div>
  );
}
