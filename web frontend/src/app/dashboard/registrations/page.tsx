'use client';

import { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import PageGuard from '@/components/permissions/PageGuard';
import { fetchAPI } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import * as XLSX from 'xlsx';
import { Button } from '@/app/components/ui/Button';
import { Card, CardStat } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchableSelect } from '@/app/components/ui/Select';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ar } from 'date-fns/locale/ar';
import 'react-datepicker/dist/react-datepicker.css';
import '@/app/styles/datepicker.css';
 

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Register Arabic locale
registerLocale('ar', ar);

interface Registration {
  id: number;
  traineeName: string;
  phoneNumber: string;
  altPhoneNumber: string | null;
  qualification: string;
  branch: string;
  program: string;
  friendName: string | null;
  friendPhone: string | null;
  createdAt: string;
}

interface Stats {
  totalCount: number;
  qualificationStats: {
    متوسط: number;
    عالي: number;
  };
  branchStats: {
    المنصورة: number;
    الزقازيق: number;
  };
  programStats: {
    [key: string]: number;
  };
  dailyStats: {
    [key: string]: number;
  };
  monthlyStats: {
    [key: string]: number;
  };
}

function RegistrationsPageContent() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCount: 0,
    qualificationStats: { متوسط: 0, عالي: 0 },
    branchStats: { المنصورة: 0, الزقازيق: 0 },
    programStats: {},
    dailyStats: {},
    monthlyStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    branch: "",
    program: "",
    qualification: ""
  });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);

  // Options for select components
  const branchOptions = [
    { value: '', label: 'كل الفروع' },
    { value: 'المنصورة', label: 'المنصورة' },
    { value: 'الزقازيق', label: 'الزقازيق' }
  ];

  const programOptions = [
    { value: '', label: 'كل البرامج' },
    { value: 'مساعد خدمات صحية', label: 'مساعد خدمات صحية' },
    { value: 'المساحة والانشاءات', label: 'المساحة والانشاءات' },
    { value: 'تكنولوجيا المعلومات', label: 'تكنولوجيا المعلومات' }
  ];

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/registrations');
      
      if (data) {
        setRegistrations(data);
        setFilteredRegistrations(data);
        calculateStats(data);
      } else {
        setError('فشل في تحميل بيانات التسجيلات');
      }
    } catch (error) {
      setError('حدث خطأ أثناء تحميل البيانات');
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Registration[]) => {
    const qualificationStats = { متوسط: 0, عالي: 0 };
    const branchStats = { المنصورة: 0, الزقازيق: 0 };
    const programStats: { [key: string]: number } = {};
    const dailyStats: { [key: string]: number } = {};
    const monthlyStats: { [key: string]: number } = {};

    // إنشاء الشهور الستة الأخيرة حتى لو لم تكن هناك بيانات
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      monthlyStats[monthKey] = 0;
    }

    data.forEach(registration => {
      // Qualification stats
      if (registration.qualification === 'متوسط') qualificationStats.متوسط++;
      else if (registration.qualification === 'عالي') qualificationStats.عالي++;

      // Branch stats
      if (registration.branch === 'المنصورة') branchStats.المنصورة++;
      else if (registration.branch === 'الزقازيق') branchStats.الزقازيق++;

      // Program stats
      programStats[registration.program] = (programStats[registration.program] || 0) + 1;

      // Daily stats
      const date = new Date(registration.createdAt).toLocaleDateString('ar-EG');
      dailyStats[date] = (dailyStats[date] || 0) + 1;

      // Monthly stats
      const registrationDate = new Date(registration.createdAt);
      const monthKey = registrationDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      if (monthlyStats.hasOwnProperty(monthKey)) {
        monthlyStats[monthKey]++;
      }
    });

    setStats({
      totalCount: data.length,
      qualificationStats,
      branchStats,
      programStats,
      dailyStats,
      monthlyStats
    });
  };

  const applyFilters = () => {
    let filtered = registrations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(registration =>
        registration.traineeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registration.phoneNumber.includes(searchTerm) ||
        (registration.friendName && registration.friendName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Branch filter
    if (filters.branch) {
      filtered = filtered.filter(registration => registration.branch === filters.branch);
    }

    // Program filter
    if (filters.program) {
      filtered = filtered.filter(registration => registration.program === filters.program);
    }

    // Qualification filter
    if (filters.qualification) {
      filtered = filtered.filter(registration => registration.qualification === filters.qualification);
    }

    // Date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(registration => {
        const registrationDate = new Date(registration.createdAt);
        return registrationDate >= startDate && registrationDate <= endDate;
      });
    }

    setFilteredRegistrations(filtered);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredRegistrations.map(reg => ({
      'اسم المتدرب': reg.traineeName,
      'رقم الهاتف': reg.phoneNumber,
      'رقم هاتف بديل': reg.altPhoneNumber || '',
      'المؤهل': reg.qualification,
      'الفرع': reg.branch,
      'البرنامج': reg.program,
      'اسم الصديق': reg.friendName || '',
      'رقم هاتف الصديق': reg.friendPhone || '',
      'تاريخ التسجيل': new Date(reg.createdAt).toLocaleDateString('ar-EG')
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'التسجيلات');
    
    const fileName = `تسجيلات_${new Date().toLocaleDateString('ar-EG')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    setSuccess('تم تصدير البيانات بنجاح');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleViewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDetailModalOpen(true);
  };

  const handleDeleteRegistration = async (registration: Registration) => {
    setRegistrationToDelete(registration);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!registrationToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetchAPI(`/registrations/${registrationToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response) {
        setSuccess('تم حذف التسجيل بنجاح');
        // تحديث البيانات المحلية
        const updatedRegistrations = registrations.filter(r => r.id !== registrationToDelete.id);
        setRegistrations(updatedRegistrations);
        setFilteredRegistrations(filteredRegistrations.filter(r => r.id !== registrationToDelete.id));
        calculateStats(updatedRegistrations);
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('فشل في حذف التسجيل');
      }
    } catch (error) {
      setError('حدث خطأ أثناء حذف التسجيل');
      console.error('Error deleting registration:', error);
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setRegistrationToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRegistrationToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }

  // Chart data
  const monthlyChartData = {
    labels: Object.keys(stats.monthlyStats),
    datasets: [
      {
        label: 'التسجيلات الشهرية',
        data: Object.values(stats.monthlyStats),
        borderColor: '#1E3A8A',
        backgroundColor: 'rgba(30, 58, 138, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold' as const
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          },
          stepSize: 1
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        },
        border: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        backgroundColor: '#1E3A8A',
        borderColor: '#ffffff',
        borderWidth: 2
      },
      line: {
        borderWidth: 3
      }
    }
  };

  return (
    <div>
      {/* رأس الصفحة */}
      <PageHeader
        title="تسجيلات الفورم"
        description="عرض وإدارة تسجيلات الفورم في البرامج التدريبية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'تسجيلات الفورم' }
        ]}
      />

      {/* رسائل النجاح والخطأ */}
      {error && (
        <div className="mb-6 p-4 bg-tiba-danger-50 border border-tiba-danger-200 rounded-lg">
          <p className="text-sm text-tiba-danger-700 text-center">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-tiba-secondary-50 border border-tiba-secondary-200 rounded-lg">
          <p className="text-sm text-tiba-secondary-700 text-center">{success}</p>
        </div>
      )}

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardStat 
            icon={<UserGroupIcon className="w-6 h-6" />}
            title="إجمالي التسجيلات"
            value={stats.totalCount}
            change="+12% هذا الشهر"
            changeType="positive"
            variant="primary"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<BuildingOfficeIcon className="w-6 h-6" />}
            title="الفرع الأكثر نشاطاً"
            value={Object.entries(stats.branchStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
            change={`${Math.max(...Object.values(stats.branchStats))} تسجيل`}
            changeType="neutral"
            variant="secondary"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<AcademicCapIcon className="w-6 h-6" />}
            title="البرنامج الأكثر طلباً"
            value={Object.entries(stats.programStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
            change={`${Math.max(...Object.values(stats.programStats))} طلب`}
            changeType="neutral"
            variant="warning"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<ChartBarIcon className="w-6 h-6" />}
            title="معدل النمو"
            value={`${Math.round((Object.values(stats.monthlyStats).slice(-1)[0] || 0) / Math.max(1, Object.values(stats.monthlyStats).slice(-2, -1)[0] || 1) * 100)}%`}
            change="مقارنة بالشهر السابق"
            changeType="positive"
            variant="danger"
          />
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* الرسم البياني الشهري */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-tiba-gray-800">التسجيلات الشهرية</h3>
            <div className="text-sm text-tiba-gray-500">آخر 6 أشهر</div>
          </div>
          <div className="h-64">
            <Line data={monthlyChartData} options={chartOptions} />
          </div>
        </Card>

        {/* توزيع المؤهلات والفروع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-base font-semibold text-tiba-gray-800 mb-3">توزيع المؤهلات</h3>
            <div className="h-48">
              <Doughnut
                data={{
                  labels: ['متوسط', 'عالي'],
                  datasets: [{
                    data: [stats.qualificationStats.متوسط, stats.qualificationStats.عالي],
                    backgroundColor: ['#1E3A8A', '#10B981'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#374151',
                        font: {
                          size: 12,
                          weight: 'bold'
                        },
                        padding: 15
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-tiba-gray-800 mb-3">توزيع الفروع</h3>
            <div className="h-48">
              <Doughnut
                data={{
                  labels: ['المنصورة', 'الزقازيق'],
                  datasets: [{
                    data: [stats.branchStats.المنصورة, stats.branchStats.الزقازيق],
                    backgroundColor: ['#F59E0B', '#EF4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#374151',
                        font: {
                          size: 12,
                          weight: 'bold'
                        },
                        padding: 15
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* توزيع البرامج */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-tiba-gray-800 mb-4">توزيع البرامج</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.programStats).map(([program, count]) => (
            <div key={program} className="bg-tiba-gray-50 rounded-lg p-4 border border-tiba-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-tiba-gray-800">{program}</h4>
                <span className="text-lg font-bold text-tiba-primary-600">{count}</span>
              </div>
              <div className="w-full bg-tiba-gray-200 rounded-full h-2">
                <div
                  className="bg-tiba-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(count / stats.totalCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-tiba-gray-500 mt-1">
                {Math.round((count / stats.totalCount) * 100)}% من إجمالي التسجيلات
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* أدوات البحث والتصفية */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-tiba-gray-400" />
            </div>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-tiba-gray-300 rounded-lg pr-12 pl-4 py-3 text-tiba-gray-800 placeholder-tiba-gray-400 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <SearchableSelect
              options={branchOptions}
              value={filters.branch}
              onChange={(value) => setFilters({ ...filters, branch: value })}
              placeholder="اختر الفرع"
              icon={<FunnelIcon className="h-5 w-5" />}
            />
          </div>

          <div className="relative">
            <SearchableSelect
              options={programOptions}
              value={filters.program}
              onChange={(value) => setFilters({ ...filters, program: value })}
              placeholder="اختر البرنامج"
              icon={<FunnelIcon className="h-5 w-5" />}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-tiba-gray-400" />
            </div>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              placeholderText="اختر فترة زمنية..."
              locale="ar"
              dateFormat="dd/MM/yyyy"
              isClearable={true}
              className="w-full bg-white border border-tiba-gray-300 rounded-lg pr-12 pl-4 py-3 text-tiba-gray-800 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button
            onClick={applyFilters}
            leftIcon={<FunnelIcon className="w-4 h-4" />}
          >
            تطبيق الفلاتر
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={exportToExcel}
              className="bg-tiba-warning-600 hover:bg-tiba-warning-700 text-white"
            >
              تصدير البيانات
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilters({ branch: '', program: '', qualification: '' });
                setDateRange([null, null]);
                setFilteredRegistrations(registrations);
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </div>
      </Card>

      {/* جدول التسجيلات */}
      <Card>
        <DataTable
          data={filteredRegistrations}
          columns={[
            {
              header: 'اسم المتدرب',
              accessor: 'traineeName',
            },
            {
              header: 'رقم الهاتف',
              accessor: 'phoneNumber',
            },
            {
              header: 'المؤهل',
              accessor: (registration) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  registration.qualification === 'متوسط' 
                    ? 'bg-tiba-primary-50 text-tiba-primary-700' 
                    : 'bg-tiba-secondary-50 text-tiba-secondary-700'
                }`}>
                  {registration.qualification}
                </span>
              ),
            },
            {
              header: 'الفرع',
              accessor: (registration) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  registration.branch === 'المنصورة' 
                    ? 'bg-tiba-warning-50 text-tiba-warning-700' 
                    : 'bg-tiba-danger-50 text-tiba-danger-700'
                }`}>
                  {registration.branch}
                </span>
              ),
            },
            {
              header: 'البرنامج',
              accessor: 'program',
            },
            {
              header: 'تاريخ التسجيل',
              accessor: (registration) => new Date(registration.createdAt).toLocaleDateString('ar-EG'),
            },
            {
              header: 'الإجراءات',
              accessor: (registration) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(registration)}
                    className="text-tiba-primary-500 hover:text-tiba-primary-700"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRegistration(registration)}
                    className="text-tiba-danger-500 hover:text-tiba-danger-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
          keyField="id"
          isLoading={loading}
          emptyMessage="لا توجد تسجيلات للعرض"
          pagination={true}
          itemsPerPage={10}
        />
      </Card>

      {/* Modal تفاصيل التسجيل */}
      {isDetailModalOpen && selectedRegistration && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-tiba-gray-900/75"></div>
            </div>

            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-lg border border-tiba-gray-200">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="text-tiba-gray-400 hover:text-tiba-gray-500"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-tiba-gray-800 mb-2">
                  تفاصيل التسجيل
                </h3>
                <p className="text-sm text-tiba-gray-600">
                  معلومات مفصلة عن تسجيل المتدرب
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      اسم المتدرب
                    </label>
                    <p className="text-tiba-gray-900 font-medium">{selectedRegistration.traineeName}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <p className="text-tiba-gray-900">{selectedRegistration.phoneNumber}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      رقم هاتف بديل
                    </label>
                    <p className="text-tiba-gray-900">{selectedRegistration.altPhoneNumber || 'غير محدد'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      المؤهل
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedRegistration.qualification === 'متوسط' 
                        ? 'bg-tiba-primary-50 text-tiba-primary-700' 
                        : 'bg-tiba-secondary-50 text-tiba-secondary-700'
                    }`}>
                      {selectedRegistration.qualification}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      الفرع
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedRegistration.branch === 'المنصورة' 
                        ? 'bg-tiba-warning-50 text-tiba-warning-700' 
                        : 'bg-tiba-danger-50 text-tiba-danger-700'
                    }`}>
                      {selectedRegistration.branch}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      البرنامج
                    </label>
                    <p className="text-tiba-gray-900">{selectedRegistration.program}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      اسم الصديق
                    </label>
                    <p className="text-tiba-gray-900">{selectedRegistration.friendName || 'غير محدد'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                      رقم هاتف الصديق
                    </label>
                    <p className="text-tiba-gray-900">{selectedRegistration.friendPhone || 'غير محدد'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-tiba-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-tiba-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    تاريخ التسجيل: {new Date(selectedRegistration.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDetailModalOpen(false)}
                    >
                      إغلاق
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && registrationToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-tiba-gray-900/75"></div>
            </div>

            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-lg border border-tiba-gray-200">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="text-tiba-gray-400 hover:text-tiba-gray-500 transition-colors"
                  onClick={cancelDelete}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-tiba-danger-100 mb-4">
                  <TrashIcon className="h-6 w-6 text-tiba-danger-600" />
                </div>
                <h3 className="text-lg font-semibold text-tiba-gray-800 mb-2">
                  تأكيد حذف التسجيل
                </h3>
                <p className="text-sm text-tiba-gray-600 mb-4">
                  هل أنت متأكد من حذف تسجيل المتدرب:
                </p>
                <div className="bg-tiba-gray-50 rounded-lg p-4 border border-tiba-gray-200">
                  <p className="text-tiba-gray-800 font-medium">{registrationToDelete.traineeName}</p>
                  <p className="text-tiba-gray-600 text-sm">{registrationToDelete.phoneNumber}</p>
                  <p className="text-tiba-gray-600 text-sm">{registrationToDelete.program} - {registrationToDelete.branch}</p>
                </div>
                <p className="text-xs text-tiba-gray-500 mt-3">
                  هذا الإجراء لا يمكن التراجع عنه
                </p>
              </div>

              <div className="flex justify-end items-center gap-3">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className="text-tiba-gray-700 border-tiba-gray-300 hover:bg-tiba-gray-50"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white"
                >
                  حذف التسجيل
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistrationsPage() {
  return (
    <PageGuard>
      <RegistrationsPageContent />
    </PageGuard>
  );
}
