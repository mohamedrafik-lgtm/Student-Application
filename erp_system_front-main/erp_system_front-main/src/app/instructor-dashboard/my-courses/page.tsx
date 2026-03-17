'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  chaptersCount: number;
  program: {
    id: number;
    nameAr: string;
  };
  classroom: {
    id: number;
    name: string;
  };
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.program.nameAr.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchQuery, courses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/training-contents/my-courses');
      setCourses(data || []);
      setFilteredCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('حدث خطأ أثناء تحميل المواد التدريبية');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 font-medium">جاري تحميل المواد التدريبية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <AcademicCapIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">موادي التدريبية</h1>
            <p className="text-purple-100 mt-1">جميع المواد التدريبية المخصصة لك ({filteredCourses.length})</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن مادة تدريبية (الاسم، الكود، البرنامج)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all outline-none text-gray-900"
            />
          </div>
        </div>
      )}

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-100">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpenIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {searchQuery ? 'لا توجد نتائج' : 'لا توجد مواد تدريبية'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            {searchQuery 
              ? 'لم يتم العثور على مواد تطابق بحثك. جرب كلمات بحث مختلفة.'
              : 'لا توجد مواد تدريبية مخصصة لك حالياً. يرجى التواصل مع الإدارة لتعيين المواد التدريبية.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <Link
              key={course.id}
              href={`/instructor-dashboard/my-courses/${course.id}`}
              className="group bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-purple-300 hover:shadow-2xl transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors truncate">
                    {course.name}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">كود المادة: {course.code}</p>
                </div>
                <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                  </svg>
                  {course.program.nameAr}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                  {course.classroom.name}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
                  <div className="flex items-center justify-center mb-2">
                    <CalendarDaysIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {course.theorySessionsPerWeek}
                  </p>
                  <p className="text-xs text-purple-600 mt-1 font-medium">نظري/أسبوع</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center border border-amber-200">
                  <div className="flex items-center justify-center mb-2">
                    <CalendarDaysIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {course.practicalSessionsPerWeek}
                  </p>
                  <p className="text-xs text-amber-600 mt-1 font-medium">عملي/أسبوع</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center border border-emerald-200">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpenIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {course.chaptersCount}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">عدد الأبواب</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="flex items-center gap-2 text-purple-600 font-medium group-hover:gap-3 transition-all">
                  <span>عرض التفاصيل</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

