'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  HomeIcon, 
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UsersIcon,
  BriefcaseIcon,
  NewspaperIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      if (
        isMobileMenuOpen &&
        mobileMenu &&
        !mobileMenu.contains(event.target as Node) &&
        !mobileMenuButton?.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    {
      name: 'الرئيسية',
      href: '/dashboard',
      icon: HomeIcon,
      roles: ['USER', 'ADMIN', 'ACCOUNTANT', 'MARKETER']
    },
    {
      name: 'تسجيلات الفورم',
      href: '/dashboard/registrations',
      icon: UserGroupIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'إدارة المستخدمين',
      href: '/dashboard/users',
      icon: UsersIcon,
      roles: ['ADMIN']
    },
    {
      name: 'إدارة الوظائف',
      href: '/dashboard/jobs',
      icon: BriefcaseIcon,
      roles: ['ADMIN', 'MARKETER']
    },
    {
      name: 'إدارة الأخبار',
      href: '/dashboard/news',
      icon: NewspaperIcon,
      roles: ['ADMIN', 'MARKETER']
    },
    {
      name: 'المتدربين',
      href: '/dashboard/trainees',
      icon: AcademicCapIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'البرامج التدريبية',
      href: '/dashboard/programs',
      icon: ClipboardDocumentListIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'سجلات النظام',
      href: '/dashboard/audit-logs',
      icon: ChartBarIcon,
      roles: ['ADMIN']
    },
    {
      name: 'إعدادات النظام',
      href: '/dashboard/settings',
      icon: Cog6ToothIcon,
      roles: ['ADMIN']
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-[999]">
      {/* Gradient Background with Blur */}
      <div className="absolute inset-0 bg-[#1E1E1E] backdrop-blur-sm"></div>
      
      {/* Border Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5"></div>

      <nav className="relative">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-16">
            {/* Logo Section - Right Side */}
            <div className="flex flex-1 md:flex-none order-2 md:order-1 md:w-[200px] justify-between items-center">
              {/* Mobile Menu Button - Right Side */}
              <button
                id="mobile-menu-button"
                className="md:hidden flex-none p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>

              <Link 
                href="/dashboard" 
                className="flex items-center space-x-3 space-x-reverse group"
              >
                <div className="bg-gradient-to-r from-[#D35400] to-[#D35400]/80 p-2 rounded-lg transform group-hover:scale-105 transition-all duration-300">
                  <HomeIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-white to-white/80 text-transparent bg-clip-text">
                 لوحة تحكم مركز طيبة
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Items - Center */}
            <div className="hidden md:flex flex-1 order-1 md:order-2 justify-center items-center gap-4 px-4">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 group
                    ${pathname === item.href 
                      ? 'text-white bg-gradient-to-r from-[#D35400] to-[#D35400]/80 shadow-lg shadow-[#D35400]/20' 
                      : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                    }`}
                >
                  <item.icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${
                    pathname === item.href ? 'text-white' : 'text-white/70'
                  }`} />
                  <span>{item.name}</span>
                  
                  {/* Active Indicator */}
                  {pathname === item.href && (
                    <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-white/40 rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop Logout Button - Left Side */}
            <div className="hidden md:flex flex-none order-3 justify-end md:w-[200px]">
              <button 
                className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white rounded-lg text-sm font-medium transition-all duration-300 hover:bg-red-500/10 group"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    logout();
                  } catch (error) {
                    console.error('خطأ في تسجيل الخروج:', error);
                    window.location.href = '/login';
                  }
                }}
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:text-red-500" />
                <span className="group-hover:text-red-500">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Now with matching background */}
      <div
        id="mobile-menu"
        className={`md:hidden fixed inset-x-0 top-16 bottom-0 bg-[#1E1E1E] transition-all duration-300 transform ${
          isMobileMenuOpen ? 'translate-y-0 opacity-100 visible' : '-translate-y-2 opacity-0 invisible'
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-4 py-6 space-y-3">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 flex items-center gap-3
                ${pathname === item.href 
                  ? 'text-white bg-gradient-to-r from-[#D35400] to-[#D35400]/80 shadow-lg shadow-[#D35400]/20' 
                  : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                }`}
            >
              <item.icon className={`h-5 w-5 ${
                pathname === item.href ? 'text-white' : 'text-white/70'
              }`} />
              <span>{item.name}</span>
            </Link>
          ))}

          {/* Mobile Logout Button */}
          <button 
            className="w-full mt-6 flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white rounded-lg text-base font-medium transition-all duration-300 hover:bg-red-500/10 group"
            onClick={() => logout()}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:text-red-500" />
            <span className="group-hover:text-red-500">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}
