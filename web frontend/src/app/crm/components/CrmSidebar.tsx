'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSettings } from '@/lib/settings-context';
import {
  FiHome, FiX, FiLink, FiInbox, FiSettings,
  FiLogOut, FiArrowLeft
} from 'react-icons/fi';
import { FaHandshake } from 'react-icons/fa';

export default function CrmSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { userPermissions } = usePermissions();
  const [isMobile, setIsMobile] = useState(false);
  const [centerName, setCenterName] = useState<string>('نظام التدريب');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { settings } = useSettings();
  
  useEffect(() => {
    if (settings?.centerName) {
      setCenterName(settings.centerName);
    }
  }, [settings?.centerName]);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (isMobile) onClose();
    router.push(href);
  };

  return (
    <>
      {/* خلفية معتمة للشاشات الصغيرة */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* الشريط الجانبي */}
      <aside 
        className={`fixed z-50 flex flex-col transition-transform duration-300 ease-out transform bg-blue-700 lg:inset-y-0 lg:right-0 lg:w-72 lg:h-screen lg:translate-x-0 inset-0 w-full h-full rounded-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* رأس الشريط الجانبي */}
        <div className="flex items-center justify-between p-6 pt-8 bg-blue-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-sm border border-white/10">
              <FaHandshake className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-white tracking-tight">نظام CRM</h2>
              <p className="text-xs text-white mt-0.5">{centerName}</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="lg:hidden p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى الشريط الجانبي */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* الرئيسية */}
          <Link 
            href="/crm"
            onClick={(e) => handleLinkClick(e, '/crm')}
            className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname === '/crm'
                ? 'bg-blue-500 text-white font-bold shadow-sm'
                : 'text-white hover:bg-white/10 font-medium'
            }`}
          >
            <FiHome className={`w-5 h-5 ml-3 transition-transform duration-300 ${
              pathname === '/crm' ? 'text-white' : 'text-white group-hover:scale-110'
            }`} />
            <span>الرئيسية</span>
          </Link>

          {/* القنوات المتصلة - متاح لمديري النظام فقط */}
          {userPermissions?.hasPermission('crm.channels', 'view') && (
            <Link 
              href="/crm/channels"
              onClick={(e) => handleLinkClick(e, '/crm/channels')}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
                pathname === '/crm/channels'
                  ? 'bg-blue-500 text-white font-bold shadow-sm'
                  : 'text-white hover:bg-white/10 font-medium'
              }`}
            >
              <FiLink className={`w-5 h-5 ml-3 transition-transform duration-300 ${
                pathname === '/crm/channels' ? 'text-white' : 'text-white group-hover:scale-110'
              }`} />
              <span>القنوات المتصلة</span>
            </Link>
          )}

          {/* صندوق الرسائل - متاح لجميع مستخدمي CRM */}
          <Link 
            href="/crm/inbox"
            onClick={(e) => handleLinkClick(e, '/crm/inbox')}
            className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname === '/crm/inbox'
                ? 'bg-blue-500 text-white font-bold shadow-sm'
                : 'text-white hover:bg-white/10 font-medium'
            }`}
          >
            <FiInbox className={`w-5 h-5 ml-3 transition-transform duration-300 ${
              pathname === '/crm/inbox' ? 'text-white' : 'text-white group-hover:scale-110'
            }`} />
            <span>صندوق الرسائل</span>
          </Link>

          {/* تنظيم الرسائل - متاح للإدارة فقط */}
          {userPermissions?.hasPermission('crm.messages', 'view') && (
            <Link 
              href="/crm/message-settings"
              onClick={(e) => handleLinkClick(e, '/crm/message-settings')}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
                pathname === '/crm/message-settings'
                  ? 'bg-blue-500 text-white font-bold shadow-sm'
                  : 'text-white hover:bg-white/10 font-medium'
              }`}
            >
              <FiSettings className={`w-5 h-5 ml-3 transition-transform duration-300 ${
                pathname === '/crm/message-settings' ? 'text-white' : 'text-white group-hover:scale-110'
              }`} />
              <span>تنظيم الرسائل</span>
            </Link>
          )}
        </div>

        {/* أسفل الشريط الجانبي */}
        <div className="p-4 bg-blue-800/50 space-y-2">
          {/* العودة للوحة الإدارية */}
          {user?.accountType && ['ADMIN', 'EMPLOYEE'].includes(user.accountType) && (
            <Link 
              href="/dashboard"
              className="flex items-center justify-center gap-3 w-full px-4 py-3 text-sm text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 font-bold group"
            >
              <FiArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
              <span>العودة للوحة الإدارية</span>
            </Link>
          )}
          
          {/* تسجيل الخروج */}
          <button
            onClick={() => logout && logout()}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 text-sm text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 font-bold group"
          >
            <FiLogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
