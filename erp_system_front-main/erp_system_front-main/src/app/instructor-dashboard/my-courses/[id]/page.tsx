'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpenIcon, 
  UserGroupIcon,
  VideoCameraIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  AcademicCapIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface TrainingContent {
  id: number;
  code: string;
  name: string;
  description: string;
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  chaptersCount: number;
  program: {
    nameAr: string;
  };
  classroom: {
    id: number;
    name: string;
  };
}

export default function CourseDetailsPage() {
  const params = useParams();
  const courseId = params.id as string;
  
  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [traineesCount, setTraineesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/training-contents/${courseId}`);
      setCourse(data);
      
      // جلب عدد المتدربين
      if (data.classroom?.id) {
        const traineesData = await fetchAPI(`/trainees?classroomId=${data.classroom.id}`);
        setTraineesCount(traineesData?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات المادة');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    {
      name: 'المتدربون',
      href: `/instructor-dashboard/my-courses/${courseId}/trainees`,
      icon: UserGroupIcon,
      count: traineesCount,
      color: 'blue'
    },
    {
      name: 'المحاضرات',
      href: `/instructor-dashboard/my-courses/${courseId}/lectures`,
      icon: VideoCameraIcon,
      color: 'purple'
    },
    {
      name: 'بنك الأسئلة',
      href: `/instructor-dashboard/my-courses/${courseId}/questions`,
      icon: QuestionMarkCircleIcon,
      color: 'emerald'
    },
    {
      name: 'الدرجات',
      href: `/instructor-dashboard/my-courses/${courseId}/grades`,
      icon: ChartBarIcon,
      color: 'amber'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <BookOpenIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <AcademicCapIcon className="w-4 h-4" />
                  {course.program.nameAr}
                </span>
                <span className="flex items-center gap-1">
                  <UserGroupIcon className="w-4 h-4" />
                  {course.classroom.name}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpenIcon className="w-4 h-4" />
                  {course.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="font-semibold text-gray-900 mb-3">وصف المادة</h3>
          <p className="text-gray-700 leading-relaxed">{course.description}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-3">
            <UserGroupIcon className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">عدد المتدربين</p>
          <p className="text-3xl font-bold text-gray-900">{traineesCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-3">
            <BookOpenIcon className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">عدد الأبواب</p>
          <p className="text-3xl font-bold text-gray-900">{course.chaptersCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-3">
            <CalendarDaysIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">حصص نظرية/أسبوع</p>
          <p className="text-3xl font-bold text-gray-900">{course.theorySessionsPerWeek}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-3">
            <ClockIcon className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">حصص عملية/أسبوع</p>
          <p className="text-3xl font-bold text-gray-900">{course.practicalSessionsPerWeek}</p>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 bg-${tab.color}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 text-${tab.color}-600`} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{tab.name}</h4>
                {tab.count !== undefined && (
                  <p className="text-sm text-gray-600">{tab.count} عنصر</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
