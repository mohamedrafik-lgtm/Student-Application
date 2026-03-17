'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  UserGroupIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Stats {
  totalCourses: number;
  totalStudents: number;
  todaySessions: number;
  averageGrade: number;
}

interface Course {
  id: number;
  code: string;
  name: string;
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  program: {
    nameAr: string;
  };
  classroom: {
    id: number;
    name: string;
  };
}

interface User {
  name: string;
  email: string;
}

export default function InstructorDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    totalStudents: 0,
    todaySessions: 0,
    averageGrade: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // عرض الرسالة الترحيبية إذا لم يتم عرضها من قبل في هذه الجلسة
    const hasSeenWelcome = sessionStorage.getItem('instructor_welcome_seen');
    if (!hasSeenWelcome) {
      setTimeout(() => {
        setShowWelcomeModal(true);
        sessionStorage.setItem('instructor_welcome_seen', 'true');
      }, 1000);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user info
      const userData = localStorage.getItem('auth_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Fetch courses
      const coursesData = await fetchAPI('/training-contents/my-courses');
      setCourses(coursesData || []);

      // Calculate stats
      let totalStudents = 0;
      if (coursesData && coursesData.length > 0) {
        // Fetch trainees for each classroom
        for (const course of coursesData) {
          try {
            const traineesData = await fetchAPI(`/trainees?classroomId=${course.classroom.id}`);
            totalStudents += traineesData?.length || 0;
          } catch (error) {
            console.error('Error fetching trainees:', error);
          }
        }
      }

      setStats({
        totalCourses: coursesData?.length || 0,
        totalStudents,
        todaySessions: 0,
        averageGrade: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-4 mb-3">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
            <SparklesIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">{getGreeting()}</p>
            <h1 className="text-2xl font-bold">{user?.name || 'المحاضر'}</h1>
          </div>
        </div>
        <p className="text-blue-100 text-sm">
          مرحباً بك في لوحة التحكم الخاصة بك. يمكنك متابعة موادك التدريبية والمتدربين من هنا.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BookOpenIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">المواد التدريبية</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">إجمالي المتدربين</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <CalendarDaysIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">المحاضرات اليوم</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.todaySessions}</p>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">متوسط الأداء</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.averageGrade}%</p>
        </div>
      </div>

      {/* My Courses */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="bg-gray-50 p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <AcademicCapIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">موادي التدريبية</h2>
                <p className="text-sm text-gray-600">جميع المواد المخصصة لك</p>
              </div>
            </div>
            <Link
              href="/instructor-dashboard/my-courses"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              <span>عرض الكل</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {courses.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpenIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مواد تدريبية</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                لا توجد مواد تدريبية مخصصة لك حالياً. يرجى التواصل مع الإدارة لتعيين المواد التدريبية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {courses.slice(0, 4).map((course) => (
                <Link
                  key={course.id}
                  href={`/instructor-dashboard/my-courses/${course.id}`}
                  className="group bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md rounded-lg p-5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <BookOpenIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                        {course.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">كود: {course.code}</p>
                      
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {course.program.nameAr}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {course.classroom.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{course.theorySessionsPerWeek} نظري</span>
                        <span>•</span>
                        <span>{course.practicalSessionsPerWeek} عملي</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full my-4 transform transition-all animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
              
              {/* Close button */}
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 z-20 group"
              >
                <XMarkIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white bg-opacity-20 backdrop-blur-sm rounded-full mb-3">
                  <SparklesIcon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">مرحباً بك في منصة المحاضرين</h2>
                <p className="text-blue-100 text-sm">نظام إدارة التدريب الإلكتروني</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {/* Notice Box */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-2 flex items-center gap-2 flex-wrap">
                      <span>🔨</span>
                      <span>المنصة قيد التطوير والتحسين المستمر</span>
                    </h3>
                    <div className="space-y-2 text-amber-800 text-sm">
                      <p className="leading-relaxed">
                        <strong className="font-semibold">عزيزي المحاضر،</strong> منصة المحاضرين لا زالت في مرحلة التطوير.
                      </p>
                      <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-amber-200">
                        <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-sm">
                          <span>✅</span>
                          <span>يمكنك استخدام المنصة حالياً:</span>
                        </p>
                        <ul className="space-y-1 text-xs mr-6">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>إدارة المتدربين والمحاضرات</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>رصد الدرجات والحضور</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>إنشاء وإدارة الاختبارات الإلكترونية</span>
                          </li>
                        </ul>
                      </div>
                      <p className="text-xs leading-relaxed">
                        <strong className="font-semibold">ملاحظة:</strong> نعمل على إضافة المزيد من المميزات بشكل مستمر.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                      <BookOpenIcon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-blue-900 text-xs sm:text-sm">المواد التدريبية</h4>
                  </div>
                  <p className="text-[10px] sm:text-xs text-blue-700">إدارة كاملة للمحتوى</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
                      <AcademicCapIcon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-green-900 text-xs sm:text-sm">الاختبارات</h4>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-700">إنشاء وإدارة الاختبارات</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-purple-900 text-xs sm:text-sm">الدرجات</h4>
                  </div>
                  <p className="text-[10px] sm:text-xs text-purple-700">رصد وتحليل الأداء</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                      <UserGroupIcon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-amber-900 text-xs sm:text-sm">المتدربون</h4>
                  </div>
                  <p className="text-[10px] sm:text-xs text-amber-700">متابعة وإدارة المتدربين</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span className="text-base">ابدأ الآن</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

