'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpenIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  BellIcon,
  EnvelopeIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  accountType: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
}

export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myCourses, setMyCourses] = useState<TrainingContent[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // استخراج معرف المادة من الـ URL
  const courseIdMatch = pathname.match(/\/my-courses\/(\d+)/);
  const currentCourseId = courseIdMatch ? courseIdMatch[1] : null;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1];

        if (!token) {
          router.push('/instructor-login');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const userData = await response.json();
        
        if (userData.accountType !== 'INSTRUCTOR') {
          router.push('/dashboard');
          return;
        }

        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/instructor-login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // جلب قائمة المواد
  useEffect(() => {
    if (user) {
      const fetchCourses = async () => {
        try {
          const data = await fetchAPI('/training-contents/my-courses');
          setMyCourses(data || []);
        } catch (error) {
          console.error('Error fetching courses:', error);
        }
      };
      fetchCourses();
    }
  }, [user]);

  // فتح جميع قوائم المواد تلقائياً عند التحميل
  useEffect(() => {
    if (myCourses.length > 0) {
      const allCourseIds = myCourses.map(c => c.id.toString());
      setExpandedCourses(new Set(allCourseIds));
    }
  }, [myCourses]);

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    toast.success('تم تسجيل الخروج بنجاح');
    router.push('/instructor-login');
  };

  // الإشعارات فارغة
  const notifications: any[] = [];

  // الرسائل فارغة
  const messages: any[] = [];

  // إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowMessages(false);
      setShowProfileMenu(false);
    };

    if (showNotifications || showMessages || showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNotifications, showMessages, showProfileMenu]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const mainNavigation = [
    { name: 'الرئيسية', href: '/instructor-dashboard', icon: BookOpenIcon, exact: true },
    { name: 'الاختبارات الالكترونية', href: '/instructor-dashboard/quizzes', icon: AcademicCapIcon, exact: false },
    { name: 'الملف الشخصي', href: '/instructor-dashboard/profile', icon: UserCircleIcon, exact: false },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const getCoursePages = (courseId: string) => [
    { 
      name: 'المتدربون', 
      href: `/instructor-dashboard/my-courses/${courseId}/trainees`, 
      icon: UserGroupIcon 
    },
    { 
      name: 'المحاضرات الالكترونية', 
      href: `/instructor-dashboard/my-courses/${courseId}/lectures`, 
      icon: VideoCameraIcon 
    },
    { 
      name: 'بنك الأسئلة', 
      href: `/instructor-dashboard/my-courses/${courseId}/questions`, 
      icon: QuestionMarkCircleIcon 
    },
    { 
      name: 'الدرجات', 
      href: `/instructor-dashboard/my-courses/${courseId}/grades`, 
      icon: ChartBarIcon 
    },
    { 
      name: 'الحضور', 
      href: `/instructor-dashboard/my-courses/${courseId}/attendance`, 
      icon: ClipboardDocumentListIcon 
    },
  ];

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <UserCircleIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">لوحة المحاضرين</h1>
            <p className="text-xs text-blue-100">نظام إدارة التدريب</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden max-w-full">
        {mainNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                active
                  ? 'bg-blue-500 text-white shadow-md font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* My Courses */}
        {myCourses.length > 0 && (
          <div className="mt-6 overflow-hidden">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
              موادي التدريبية
            </div>
            <div className="space-y-1 overflow-hidden">
              {myCourses.map((course) => {
                const courseIdStr = course.id.toString();
                const isExpanded = expandedCourses.has(courseIdStr);
                const isCoursePageActive = pathname === `/instructor-dashboard/my-courses/${course.id}`;
                const isCourseAreaActive = pathname.includes(`/my-courses/${course.id}`);
                const coursePages = getCoursePages(courseIdStr);

                return (
                  <div key={course.id}>
                    {/* Course Header */}
                    <div className="flex items-center gap-1 w-full overflow-hidden">
                      <Link
                        href={`/instructor-dashboard/my-courses/${course.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all min-w-0 ${
                          isCoursePageActive
                            ? 'bg-blue-500 text-white shadow-md font-semibold'
                            : isCourseAreaActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        title={course.name}
                      >
                        <BookOpenIcon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap">{course.name}</p>
                          <p className={`text-[10px] truncate ${isCoursePageActive ? 'text-blue-100' : 'text-gray-500'}`}>{course.code}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => toggleCourse(courseIdStr)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>

                    {/* Course Sub-pages */}
                    {isExpanded && (
                      <div className="mr-8 mt-1 space-y-1 border-r-2 border-blue-300 pr-2">
                        {coursePages.map((page) => {
                          const Icon = page.icon;
                          const active = isActive(page.href, page.exact);
                          return (
                            <Link
                              key={page.name}
                              href={page.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                active
                                  ? 'bg-blue-500 text-white shadow-md font-semibold'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{page.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold shadow-sm"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 right-0 left-0 bg-gradient-to-r from-blue-600 to-blue-700 z-50 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <UserCircleIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-base font-bold text-white">لوحة المحاضرين</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6 text-white" />
          ) : (
            <Bars3Icon className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-x-hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Top Header Bar - Desktop Only */}
      <div className="hidden lg:block fixed top-0 left-0 right-72 bg-white border-b z-20 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">لوحة التحكم</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BellIcon className="w-6 h-6 text-gray-700" />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div onClick={(e) => e.stopPropagation()} className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">الإشعارات</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                            notification.unread ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <span className="text-xs text-gray-500 mt-2 block">{notification.time}</span>
                            </div>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <EnvelopeIcon className="w-6 h-6 text-gray-700" />
                {messages.filter(m => m.unread).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showMessages && (
                <div onClick={(e) => e.stopPropagation()} className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">الرسائل</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="p-8 text-center">
                        <EnvelopeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">لا توجد رسائل</p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <div
                          key={message.id}
                          className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                            message.unread ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-bold text-sm">
                                {message.from.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{message.from}</h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.message}</p>
                              <span className="text-xs text-gray-500 mt-2 block">{message.time}</span>
                            </div>
                            {message.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                  setShowMessages(false);
                }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user?.name?.charAt(0)}</span>
                  </div>
                </div>
              </button>

              {showProfileMenu && (
                <div onClick={(e) => e.stopPropagation()} className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border z-50">
                  <div className="p-4 border-b">
                    <div className="font-semibold text-gray-900">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/instructor-dashboard/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      <span>الملف الشخصي</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:mr-72 pt-16 lg:pt-20 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
