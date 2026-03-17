'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  HomeIcon, 
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  BriefcaseIcon,
  NewspaperIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  CalendarIcon,
  BanknotesIcon,
  CalculatorIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function DashboardSidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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
      name: 'الأدوار والصلاحيات',
      href: '/dashboard/roles',
      icon: Cog6ToothIcon,
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
      name: 'المحتوى التدريبي',
      href: '/dashboard/training-contents',
      icon: BookOpenIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'نظام الحضور والغياب',
      href: '/dashboard/attendance',
      icon: CalendarIcon,
      roles: ['ADMIN']
    },
    {
      name: 'بنك الأسئلة',
      href: '/dashboard/question-bank',
      icon: QuestionMarkCircleIcon,
      roles: ['ADMIN']
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
    },
  ];

  const accountingNavigation = [
    {
      name: 'شجرة الحسابات',
      href: '/dashboard/accounts-chart',
      icon: CalculatorIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'رسوم المتدربين',
      href: '/dashboard/trainee-fees',
      icon: CurrencyDollarIcon,
      roles: ['ADMIN', 'ACCOUNTANT']
    },
    {
      name: 'نظام الكونترول',
      href: '/dashboard/control',
      icon: ChartBarIcon,
      roles: ['ADMIN']
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.primaryRole?.name || '')
  );

  const filteredAccountingItems = accountingNavigation.filter(item => 
    item.roles.includes(user?.primaryRole?.name || '')
  );

  // Debug: Log user role and filtered items
  useEffect(() => {
    console.log('═══════════════════════════════════════');
    console.log('🔍 DEBUG - Dashboard Sidebar');
    console.log('═══════════════════════════════════════');
    console.log('👤 Full User Object:', user);
    console.log('🎭 Primary Role Name:', user?.primaryRole?.name);
    console.log('📋 Accounting Navigation Items:', accountingNavigation);
    console.log('✅ Filtered Accounting Items:', filteredAccountingItems);
    console.log('📊 Filtered Accounting Items Count:', filteredAccountingItems.length);
    console.log('═══════════════════════════════════════');
  }, [user?.primaryRole?.name, filteredAccountingItems]);

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-md text-tiba-gray-800 hover:bg-tiba-primary-50 transition-colors"
          aria-label={isMobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {isMobileOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-tiba-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-tiba-primary-950 p-2 rounded-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-tiba-primary-950">
                مركز طيبة
              </span>
            </Link>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg text-tiba-gray-500 hover:bg-tiba-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === item.href 
                    ? 'bg-tiba-primary-50 text-tiba-primary-950' 
                    : 'text-tiba-gray-700 hover:bg-tiba-gray-50 hover:text-tiba-primary-950'
                }`}
              >
                <item.icon className={`h-5 w-5 ${
                  pathname === item.href ? 'text-tiba-primary-950' : 'text-tiba-gray-500'
                }`} />
                <span>{item.name}</span>
              </Link>
            ))}

          {/* Accounting Section */}
          {filteredAccountingItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-tiba-gray-500 px-3">المحاسبة</p>
              </div>
              {filteredAccountingItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === item.href 
                      ? 'bg-tiba-primary-50 text-tiba-primary-950' 
                      : 'text-tiba-gray-700 hover:bg-tiba-gray-50 hover:text-tiba-primary-950'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${
                    pathname === item.href ? 'text-tiba-primary-950' : 'text-tiba-gray-500'
                  }`} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </>
          )}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-tiba-gray-200">
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col h-screen bg-white border-l border-tiba-gray-200 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-tiba-gray-200`}>
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-tiba-primary-950 p-2 rounded-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-tiba-primary-950">
                مركز طيبة
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/dashboard" className="flex items-center justify-center">
              <div className="bg-tiba-primary-950 p-2 rounded-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
            </Link>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-tiba-gray-500 hover:bg-tiba-gray-100"
          >
            {isCollapsed ? (
              <ChevronLeftIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname === item.href 
                  ? 'bg-tiba-primary-50 text-tiba-primary-950' 
                  : 'text-tiba-gray-700 hover:bg-tiba-gray-50 hover:text-tiba-primary-950'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`h-5 w-5 ${
                pathname === item.href ? 'text-tiba-primary-950' : 'text-tiba-gray-500'
              }`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          ))}

          {/* Accounting Section */}
          {filteredAccountingItems.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="pt-4 pb-2">
                  <p className="text-xs font-semibold text-tiba-gray-500 px-3">المحاسبة</p>
                </div>
              )}
              {filteredAccountingItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === item.href 
                      ? 'bg-tiba-primary-50 text-tiba-primary-950' 
                      : 'text-tiba-gray-700 hover:bg-tiba-gray-50 hover:text-tiba-primary-950'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={`h-5 w-5 ${
                    pathname === item.href ? 'text-tiba-primary-950' : 'text-tiba-gray-500'
                  }`} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-tiba-gray-200">
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
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-2 text-tiba-gray-700 hover:text-tiba-danger-600 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-tiba-danger-50`}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>

        {/* Accounting Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold text-tiba-gray-500 uppercase tracking-wider">
            المحاسبة
          </h2>
          <nav className="space-y-1 mt-3">
            {accountingNavigation.map((item) => {
              // Only show menu items appropriate to the user's role
              if (!item.roles || (user && item.roles.includes(user.primaryRole?.name))) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? 'bg-tiba-primary-50 text-tiba-primary-950'
                        : 'text-tiba-gray-700 hover:bg-tiba-gray-50 hover:text-tiba-primary-950'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'text-tiba-primary-950' : 'text-tiba-gray-500'
                    }`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              }
              return null;
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}