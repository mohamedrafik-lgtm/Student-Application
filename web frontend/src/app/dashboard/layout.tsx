'use client';

import React, { useState, ReactNode, useEffect } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { FiSearch, FiBell, FiMail, FiHelpCircle, FiUser, FiX, FiMenu, FiLogOut } from 'react-icons/fi';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PremiumLoader from '../../components/ui/PremiumLoader';
import SecurityPinOnboarding from '../../components/ui/SecurityPinOnboarding';
import SecurityPinGate from '../../components/ui/SecurityPinGate';
import Link from 'next/link';
import { latestVersion } from '../../lib/updates-data';
import { useOnlineTracking } from '../../hooks/useOnlineTracking';
import { ChatSocketProvider, useChatSocket } from '../../contexts/ChatSocketContext';
import { fetchAPI } from '../../lib/api';
import StaffAttendanceGate from './components/StaffAttendanceGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ChatSocketProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ChatSocketProvider>
  );
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { socket } = useChatSocket();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [securityPinReady, setSecurityPinReady] = useState(false);
  const [securityPinUnlocked, setSecurityPinUnlocked] = useState(true);
  const securityPinLastActivity = React.useRef(Date.now());
  const [totalUnread, setTotalUnread] = useState(0);

  // تتبع التواجد الإلكتروني
  useOnlineTracking();

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
      // إعادة جلب العدد الحقيقي من السيرفر
      fetchUnread();
      // تشغيل صوت الإشعار
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

  // إظهار المودال مرة واحدة فقط عند تسجيل الدخول
  useEffect(() => {
    if (!isLoading && user) {
      const setupKey = `securityPinSetupShown:${user.id}`;
      const sessionKey = `securityPinVerified:${user.id}`;
      const hasSecurityPin = user.hasSecurityPin === true;
      const setupTimer = window.setTimeout(() => {
        if (!hasSecurityPin && !localStorage.getItem(setupKey)) {
          setShowSecuritySetup(true);
        }
      }, 500);

      const sessionVerified = sessionStorage.getItem(sessionKey) === 'true';
      setSecurityPinReady(true);
      setSecurityPinUnlocked(!hasSecurityPin || sessionVerified);
      securityPinLastActivity.current = Date.now();

      return () => window.clearTimeout(setupTimer);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (!user?.id || user.hasSecurityPin !== true) return undefined;

    const sessionKey = `securityPinVerified:${user.id}`;
    const markActivity = () => {
      securityPinLastActivity.current = Date.now();
    };
    const checkInactivity = () => {
      if (
        securityPinUnlocked &&
        Date.now() - securityPinLastActivity.current >= 15 * 60 * 1000
      ) {
        sessionStorage.removeItem(sessionKey);
        setSecurityPinUnlocked(false);
      }
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    const interval = window.setInterval(checkInactivity, 10_000);
    document.addEventListener('visibilitychange', checkInactivity);

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkInactivity);
    };
  }, [user?.id, user?.hasSecurityPin, securityPinUnlocked]);
  
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
            {/* Chat */}
            <div className="relative">
              <button 
                onClick={() => router.push('/dashboard/chat')}
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
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8 min-h-0">
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
      {showSecuritySetup && (
        <SecurityPinOnboarding
          onComplete={() => {
            if (user?.id) {
              localStorage.setItem(`securityPinSetupShown:${user.id}`, 'true');
              sessionStorage.setItem(`securityPinVerified:${user.id}`, 'true');
            }
            securityPinLastActivity.current = Date.now();
            setShowSecuritySetup(false);
            setSecurityPinReady(true);
            setSecurityPinUnlocked(true);
          }}
        />
      )}

      {securityPinReady && user.hasSecurityPin === true && !securityPinUnlocked && (
        <SecurityPinGate
          userId={user.id}
          onVerified={() => {
            sessionStorage.setItem(`securityPinVerified:${user.id}`, 'true');
            securityPinLastActivity.current = Date.now();
            setSecurityPinUnlocked(true);
          }}
        />
      )}

      <StaffAttendanceGate currentUserId={user?.id} />
    </div>
  );
}
