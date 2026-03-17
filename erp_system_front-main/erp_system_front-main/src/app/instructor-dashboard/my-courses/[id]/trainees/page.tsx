'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI, getImageUrl } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DataTable } from '@/app/components/ui/DataTable';
import Image from 'next/image';

interface Trainee {
  id: string;
  nameAr?: string;
  fullName?: string;
  email: string;
  phone?: string;
  nationalId?: string;
  photoUrl?: string;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroom: {
    id: number;
    name: string;
  };
}

export default function CourseTraineesPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<TrainingContent | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [filteredTrainees, setFilteredTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTrainees(trainees);
    } else {
      const filtered = trainees.filter(trainee => {
        const name = trainee.nameAr || trainee.fullName || '';
        const query = searchQuery.toLowerCase();
        return (
          name.toLowerCase().includes(query) ||
          trainee.email?.toLowerCase().includes(query) ||
          trainee.nationalId?.toLowerCase().includes(query) ||
          trainee.phone?.toLowerCase().includes(query)
        );
      });
      setFilteredTrainees(filtered);
    }
    setCurrentPage(1); // إعادة تعيين الصفحة عند البحث
  }, [searchQuery, trainees]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const courseData = await fetchAPI(`/training-contents/${courseId}`);
      setCourse(courseData);
      
      if (courseData.classroom?.id) {
        const traineesData = await fetchAPI(`/trainees?classroomId=${courseData.classroom.id}`);
        console.log('Trainees data:', traineesData); // للتأكد من البيانات
        setTrainees(traineesData || []);
        setFilteredTrainees(traineesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
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

  const columns = [
    {
      header: 'الصورة',
      accessor: (row: Trainee) => {
        const displayName = row.nameAr || row.fullName || 'غير محدد';
        const imageUrl = row.photoUrl ? getImageUrl(row.photoUrl) : null;
        
        return (
          <div className="flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'الاسم',
      accessor: (row: Trainee) => (
        <div className="font-medium text-gray-900">{row.nameAr || row.fullName || 'غير محدد'}</div>
      ),
    },
    {
      header: 'الرقم القومي',
      accessor: (row: Trainee) => (
        <div className="text-gray-700">{row.nationalId || 'غير متاح'}</div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">المتدربون</h1>
            <p className="text-blue-100">{course.name} - {course.classroom.name}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <UserGroupIcon className="w-6 h-6" />
            <span className="text-2xl font-bold">{filteredTrainees.length}</span>
            <span className="text-sm">متدرب</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 border">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن متدرب (الاسم أو الرقم القومي)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filteredTrainees.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {trainees.length === 0 ? 'لا يوجد متدربون' : 'لا توجد نتائج'}
            </h3>
            <p className="text-gray-600">
              {trainees.length === 0
                ? 'لا يوجد متدربون مسجلون في هذه المادة'
                : 'لم يتم العثور على متدربين يطابقون بحثك'}
            </p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filteredTrainees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
              keyField="id"
              emptyMessage="لا يوجد متدربون"
            />
            
            {/* Pagination */}
            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Previous Button */}
                <div>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>السابق</span>
                  </button>
                </div>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(filteredTrainees.length / itemsPerPage);
                    const pages = [];
                    
                    if (totalPages <= 10) {
                      // Show all pages if 10 or less
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Show smart pagination with dots
                      if (currentPage <= 4) {
                        for (let i = 1; i <= 6; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 5; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        pages.push('...');
                        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages.map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 py-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page as number)}
                          className={`min-w-[36px] px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}
                </div>
                
                {/* Info */}
                <div className="text-sm text-gray-600">
                  <span>عرض </span>
                  <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span>
                  <span> - </span>
                  <span className="font-medium text-gray-900">
                    {Math.min(currentPage * itemsPerPage, filteredTrainees.length)}
                  </span>
                  <span> من أصل </span>
                  <span className="font-medium text-gray-900">{filteredTrainees.length}</span>
                  <span> متدرب</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}