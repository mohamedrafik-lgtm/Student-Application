'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/app/components/ui/DataTable';
import { Button } from '@/app/components/ui/Button';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import { Card } from '@/app/components/ui/Card';
import PageGuard from '@/components/permissions/PageGuard';
 

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  description: string;
  requirements: string[];
  applyUrl: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface Filters {
  category: string;
  location: string;
  type: string;
  status: string;
}

function JobsManagementPageContent() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [filters, setFilters] = useState<Filters>({
    category: '',
    location: '',
    type: '',
    status: ''
  });

  // Extract unique values for filters
  const uniqueCategories = Array.from(new Set(jobs.map(job => job.category))).map(category => ({
    value: category,
    label: category
  }));
  const uniqueLocations = Array.from(new Set(jobs.map(job => job.location))).map(location => ({
    value: location,
    label: location
  }));
  const uniqueTypes = Array.from(new Set(jobs.map(job => job.type))).map(type => ({
    value: type,
    label: type
  }));
  const statusOptions = [
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' }
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/jobs');

      // تحويل البيانات المستلمة للتوافق مع واجهة المستخدم
      const jobsData = Array.isArray(data) 
        ? data.map(job => ({
            ...job,
            // تحويل النص إلى مصفوفة للعرض في واجهة المستخدم
            requirements: typeof job.requirements === 'string' 
              ? job.requirements.split('\n') 
              : job.requirements
          }))
        : [];

      setJobs(jobsData);
      setFilteredJobs(jobsData);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast.error(err instanceof Error ? err.message : 'حدث خطأ في جلب الوظائف');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let result = [...jobs];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.type.toLowerCase().includes(query)
      );
    }
     
    // Apply additional filters
    if (filters.category) {
      result = result.filter(job => job.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.location) {
      result = result.filter(job => job.location.toLowerCase() === filters.location.toLowerCase());
    }
    if (filters.type) {
      result = result.filter(job => job.type.toLowerCase() === filters.type.toLowerCase());
    }
    if (filters.status) {
      const isActive = filters.status === 'active';
      result = result.filter(job => job.isActive === isActive);
    }

    setFilteredJobs(result);
  };

  const toggleJobStatus = async (jobId: number, currentStatus: boolean) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error('الوظيفة غير موجودة');
      }

      await fetchAPI(`/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      });

      // Update the jobs state with the new status
      const updatedJobs = jobs.map(j =>
        j.id === jobId ? { ...j, isActive: !currentStatus } : j
      );
      setJobs(updatedJobs);
      
      toast.success(currentStatus ? 'تم تعطيل الوظيفة بنجاح' : 'تم تفعيل الوظيفة بنجاح', {
        icon: currentStatus ? '🔴' : '🟢'
      });
    } catch (error) {
      console.error('Error toggling job status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الوظيفة');
    }
  };

  const handleDeleteClick = (job: Job) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      await fetchAPI(`/jobs/${jobToDelete.id}`, {
        method: 'DELETE'
      });

      // Update both jobs and filteredJobs states
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));
      setFilteredJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));
      
      toast.success('تم حذف الوظيفة بنجاح');
      setIsDeleteModalOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('حدث خطأ أثناء حذف الوظيفة');
    }
  };

  const handleAddJob = () => {
    router.push('/dashboard/jobs/add');
  };

  const handleEditJob = (job: Job) => {
    router.push(`/dashboard/jobs/edit/${job.id}`);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      type: '',
      status: ''
    });
    setSearchQuery('');
  };

  // تعريف أعمدة جدول البيانات
  const columns: Column<Job>[] = [
    {
      header: 'عنوان الوظيفة',
      accessor: 'title',
      cell: (job) => (
        <div className="font-medium text-gray-900">{job.title}</div>
      )
    },
    {
      header: 'الشركة',
      accessor: 'company'
    },
    {
      header: 'الموقع',
      accessor: 'location'
    },
    {
      header: 'نوع الوظيفة',
      accessor: 'type'
    },
    {
      header: 'التخصص',
      accessor: 'category'
    },
    {
      header: 'الحالة',
      accessor: (job) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          job.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {job.isActive ? 'نشط' : 'غير نشط'}
        </span>
      )
    },
    {
      header: 'الإجراءات',
      accessor: (job) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditJob(job);
            }}
            leftIcon={<PencilSquareIcon className="h-4 w-4" />}
          >
            تعديل
          </Button>
          <Button
            variant={job.isActive ? "warning" : "default"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleJobStatus(job.id, job.isActive);
            }}
            leftIcon={job.isActive ? <XMarkIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
          >
            {job.isActive ? 'تعطيل' : 'تفعيل'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(job);
            }}
            leftIcon={<TrashIcon className="h-4 w-4" />}
          >
            حذف
          </Button>
        </div>
      )
    }
  ];

  // إحصائيات سريعة
  const stats = [
    {
      title: 'إجمالي الوظائف',
      value: jobs.length,
      icon: <PlusIcon className="h-5 w-5" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    {
      title: 'الوظائف النشطة',
      value: jobs.filter(job => job.isActive).length,
      icon: <CheckIcon className="h-5 w-5" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    {
      title: 'الشركات',
      value: new Set(jobs.map(job => job.company)).size,
      icon: <PlusIcon className="h-5 w-5" />,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700'
    },
    {
      title: 'التخصصات',
      value: new Set(jobs.map(job => job.category)).size,
      icon: <PlusIcon className="h-5 w-5" />,
      bgColor: 'bg-sky-100',
      textColor: 'text-sky-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-6">
            <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">إدارة الوظائف</h1>
            <p className="text-gray-600">إدارة وتنظيم الوظائف المتاحة في المنصة</p>
            </div>
          <Button
              onClick={handleAddJob}
            leftIcon={<PlusIcon className="h-5 w-5" />}
            >
            إضافة وظيفة
          </Button>
          </div>
          
          {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${stat.bgColor} ${stat.textColor} rounded-lg flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
            </div>

        {/* Filters */}
        <Card className="mb-6 p-5">
          <div className="grid grid-cols-1 gap-6">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full p-3 pr-10 text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-blue-900 focus:border-blue-900 placeholder-gray-400"
                placeholder="ابحث في الوظائف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">تصفية النتائج</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">التخصص</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="block w-full p-2 text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-blue-900 focus:border-blue-900"
                  >
                    <option value="">جميع التخصصات</option>
                    {uniqueCategories.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">الموقع</label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="block w-full p-2 text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-blue-900 focus:border-blue-900"
                  >
                    <option value="">جميع المواقع</option>
                    {uniqueLocations.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
            </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">نوع الوظيفة</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="block w-full p-2 text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-blue-900 focus:border-blue-900"
                  >
                    <option value="">جميع الأنواع</option>
                    {uniqueTypes.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">الحالة</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="block w-full p-2 text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-blue-900 focus:border-blue-900"
                  >
                    <option value="">جميع الحالات</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
              </div>
            </div>
          </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!searchQuery && !filters.category && !filters.location && !filters.type && !filters.status}
                leftIcon={<XMarkIcon className="h-4 w-4" />}
              >
                مسح التصفية
              </Button>
              
              <Button
                variant="default"
                size="sm"
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={handleAddJob}
              >
                إضافة وظيفة
              </Button>
            </div>
          </div>
        </Card>

        {/* Jobs Table */}
        <Card>
          <DataTable
            data={filteredJobs}
            columns={columns}
            keyField="id"
            isLoading={loading}
            emptyMessage="لا توجد وظائف متاحة"
            pagination
            itemsPerPage={10}
          />
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteJob}
        title="تأكيد حذف الوظيفة"
        description={`هل أنت متأكد من حذف وظيفة "${jobToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

export default function JobsManagementPage() {
  return (
    <PageGuard>
      <JobsManagementPageContent />
    </PageGuard>
  );
}