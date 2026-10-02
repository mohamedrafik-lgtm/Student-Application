'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChartBarIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaChevronLeft, FaChevronRight, FaGraduationCap, FaBookOpen } from 'react-icons/fa';

interface Trainee {
  id: number;
  nameAr?: string;
  nameEn?: string;
  email: string;
  nationalId?: string;
  photoUrl?: string;
  _count?: {
    grades: number;
  };
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroomId: number;
  classroom: {
    id: number;
    name: string;
  };
}

export default function CourseGradesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    loadTrainees();
  }, [page, courseId]);

  const loadCourse = async () => {
    try {
      const courseData = await fetchAPI(`/training-contents/${courseId}`);
      setCourse(courseData);
    } catch (error: any) {
      console.error('Error loading course:', error);
      toast.error('حدث خطأ في تحميل بيانات المادة');
    }
  };

  const loadTrainees = async () => {
    try {
      setLoading(true);
      const traineesUrl = `/training-contents/${courseId}/trainees?page=${page}&limit=${limit}${searchTerm ? `&search=${searchTerm}` : ''}`;
      const response = await fetchAPI(traineesUrl);
      
      setTrainees(response.data || []);
      setTotal(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error('Error loading trainees:', error);
      toast.error('حدث خطأ في تحميل المتدربين');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadTrainees();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading && trainees.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">درجات المتدربين</h1>
          <p className="text-sm text-gray-600 mt-1">
            {course?.name} ({course?.code})
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">إجمالي المتدربين</p>
                <p className="text-3xl font-bold text-gray-900">{total}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaGraduationCap className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">تم إدخال الدرجات</p>
                <p className="text-3xl font-bold text-gray-900">
                  {trainees.filter(t => t._count && t._count.grades > 0).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaBookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">بانتظار الإدخال</p>
                <p className="text-3xl font-bold text-gray-900">
                  {trainees.filter(t => !t._count || t._count.grades === 0).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaBookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-11">
            <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button 
              onClick={handleSearch} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              بحث
            </Button>
          </div>
        </div>
      </Card>

      {/* Trainees Table */}
      <Card className="shadow-md">
        {trainees.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-500">جرب تغيير معايير البحث</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">المتدرب</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الرقم القومي</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainees.map((trainee, index) => (
                    <tr
                      key={trainee.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {trainee.photoUrl ? (
                            <img
                              src={trainee.photoUrl}
                              alt={trainee.nameAr || trainee.nameEn || ''}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {trainee.nameAr || trainee.nameEn || 'غير محدد'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-gray-700">{trainee.nationalId || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/instructor-dashboard/my-courses/${courseId}/grades/edit?traineeId=${trainee.id}`)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all"
                        >
                          تعديل الدرجات
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-6 px-6 pb-6">
                <div className="text-sm text-gray-600">
                  عرض <span className="font-semibold">{((page - 1) * limit) + 1}</span> إلى{' '}
                  <span className="font-semibold">{Math.min(page * limit, total)}</span> من{' '}
                  <span className="font-semibold">{total}</span> متدرب
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <FaChevronRight className="ml-2" />
                    السابق
                  </Button>
                  
                  <div className="flex gap-1">
                    {page > 2 && (
                      <>
                        <button
                          onClick={() => setPage(1)}
                          className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          1
                        </button>
                        {page > 3 && <span className="flex items-center px-2">...</span>}
                      </>
                    )}
                    
                    {page > 1 && (
                      <button
                        onClick={() => setPage(page - 1)}
                        className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        {page - 1}
                      </button>
                    )}
                    
                    <button
                      className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-md text-sm font-bold"
                    >
                      {page}
                    </button>
                    
                    {page < totalPages && (
                      <button
                        onClick={() => setPage(page + 1)}
                        className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        {page + 1}
                      </button>
                    )}
                    
                    {page < totalPages - 1 && (
                      <>
                        {page < totalPages - 2 && <span className="flex items-center px-2">...</span>}
                        <button
                          onClick={() => setPage(totalPages)}
                          className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    التالي
                    <FaChevronLeft className="mr-2" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
