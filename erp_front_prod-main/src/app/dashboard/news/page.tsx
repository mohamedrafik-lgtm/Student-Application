'use client';
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  CalendarIcon,
  UserIcon,
  NewspaperIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import NewsModal from '@/app/components/NewsModal';
import { Button } from '@/app/components/ui/Button';
import { Card, CardStat } from '@/app/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
import { DataTable } from '@/app/components/ui/DataTable';
import PageGuard from '@/components/permissions/PageGuard';
 

interface News {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewsStats {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
  recentCount: number;
  monthlyStats: { [key: string]: number };
}

function NewsManagementPageContent() {
  const [news, setNews] = useState<News[]>([]);
  const [filteredNews, setFilteredNews] = useState<News[]>([]);
  const [stats, setStats] = useState<NewsStats>({
    totalCount: 0,
    publishedCount: 0,
    draftCount: 0,
    recentCount: 0,
    monthlyStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<News | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/news');
      if (data) {
        setNews(data);
        setFilteredNews(data);
        calculateStats(data);
      } else {
        setError('فشل في تحميل بيانات الأخبار');
      }
    } catch (err) {
      setError('حدث خطأ في جلب الأخبار');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: News[]) => {
    const publishedCount = data.filter(item => item.isPublished).length;
    const draftCount = data.filter(item => !item.isPublished).length;
    const recentCount = data.filter(item => {
      const newsDate = new Date(item.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return newsDate >= weekAgo;
    }).length;

    const monthlyStats: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      monthlyStats[monthKey] = 0;
    }

    data.forEach(item => {
      const newsDate = new Date(item.createdAt);
      const monthKey = newsDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      if (monthlyStats.hasOwnProperty(monthKey)) {
        monthlyStats[monthKey]++;
      }
    });

    setStats({
      totalCount: data.length,
      publishedCount,
      draftCount,
      recentCount,
      monthlyStats
    });
  };

  const applyFilters = () => {
    let filtered = news;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query)
      );
    }

    if (filterPublished === 'published') {
      filtered = filtered.filter(item => item.isPublished);
    } else if (filterPublished === 'draft') {
      filtered = filtered.filter(item => !item.isPublished);
    }

    setFilteredNews(filtered);
  };

  const renderNewsImage = (item: News) => {
    if (!item.image) {
      return (
        <div className="w-12 h-12 bg-tiba-gray-200 rounded-lg flex items-center justify-center">
          <PhotoIcon className="w-6 h-6 text-tiba-gray-400" />
        </div>
      );
    }

    return (
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-tiba-gray-100">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/images/logo.png';
          }}
        />
      </div>
    );
  };

  const handleAddNews = () => {
    setEditingNews(null);
    setIsModalOpen(true);
  };

  const handleEditNews = (news: News) => {
    setEditingNews(news);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (news: News) => {
    setNewsToDelete(news);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitNews = async (newsData: Omit<News, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
    try {
      const endpoint = editingNews ? `/news/${editingNews.id}` : '/news';
      const method = editingNews ? 'PATCH' : 'POST';

      const data = await fetchAPI(endpoint, {
        method,
        body: JSON.stringify(newsData),
      });

      if (editingNews) {
        const updatedNews = news.map(n => n.id === editingNews.id ? { ...n, ...data } : n);
        setNews(updatedNews);
        setFilteredNews(filteredNews.map(n => n.id === editingNews.id ? { ...n, ...data } : n));
        calculateStats(updatedNews);
      } else {
        const newNewsList = [...news, data];
        setNews(newNewsList);
        setFilteredNews([...filteredNews, data]);
        calculateStats(newNewsList);
      }

      setIsModalOpen(false);
      setEditingNews(null);
      setSuccess(editingNews ? 'تم تحديث الخبر بنجاح' : 'تم إضافة الخبر بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('حدث خطأ أثناء حفظ الخبر');
      console.error('Error submitting news:', error);
    }
  };

  const handleDeleteNews = async () => {
    if (!newsToDelete) return;

    try {
      await fetchAPI(`/news/${newsToDelete.id}`, {
        method: 'DELETE'
      });

      const updatedNews = news.filter(n => n.id !== newsToDelete.id);
      setNews(updatedNews);
      setFilteredNews(filteredNews.filter(n => n.id !== newsToDelete.id));
      calculateStats(updatedNews);
      
      setSuccess('تم حذف الخبر بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      setIsDeleteModalOpen(false);
      setNewsToDelete(null);
    } catch (error) {
      setError('حدث خطأ أثناء حذف الخبر');
      console.error('Error deleting news:', error);
    }
  };

  const toggleNewsStatus = async (newsId: number, currentStatus: boolean) => {
    try {
      await fetchAPI(`/news/${newsId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isPublished: !currentStatus
        }),
      });

      const updatedNews = news.map(n =>
        n.id === newsId ? { ...n, isPublished: !currentStatus } : n
      );
      setNews(updatedNews);
      setFilteredNews(filteredNews.map(n =>
        n.id === newsId ? { ...n, isPublished: !currentStatus } : n
      ));
      calculateStats(updatedNews);

      setSuccess(currentStatus ? 'تم إلغاء نشر الخبر بنجاح' : 'تم نشر الخبر بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('حدث خطأ أثناء تحديث حالة الخبر');
      console.error('Error toggling news status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* رأس الصفحة */}
      <PageHeader
        title="إدارة الأخبار"
        description="إدارة وتنظيم أخبار المركز التدريبي"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الأخبار' }
        ]}
        actions={
          <Button
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={handleAddNews}
          >
            إضافة خبر جديد
          </Button>
        }
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
            icon={<NewspaperIcon className="w-6 h-6" />}
            title="إجمالي الأخبار"
            value={stats.totalCount}
            change="+5% هذا الشهر"
            changeType="positive"
            variant="primary"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<CheckIcon className="w-6 h-6" />}
            title="الأخبار المنشورة"
            value={stats.publishedCount}
            change={`${Math.round((stats.publishedCount / Math.max(1, stats.totalCount)) * 100)}% من الإجمالي`}
            changeType="positive"
            variant="secondary"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<EyeSlashIcon className="w-6 h-6" />}
            title="المسودات"
            value={stats.draftCount}
            change={`${Math.round((stats.draftCount / Math.max(1, stats.totalCount)) * 100)}% من الإجمالي`}
            changeType="neutral"
            variant="warning"
          />
        </Card>

        <Card>
          <CardStat 
            icon={<ClockIcon className="w-6 h-6" />}
            title="الأخبار الحديثة"
            value={stats.recentCount}
            change="آخر 7 أيام"
            changeType="positive"
            variant="danger"
          />
        </Card>
      </div>

      {/* أدوات البحث والتصفية */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-tiba-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث في الأخبار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-tiba-gray-300 rounded-lg pr-12 pl-4 py-3 text-tiba-gray-800 placeholder-tiba-gray-400 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <EyeIcon className="h-5 w-5 text-tiba-gray-400" />
            </div>
            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value as 'all' | 'published' | 'draft')}
              className="w-full bg-white border border-tiba-gray-300 rounded-lg pr-12 pl-4 py-3 text-tiba-gray-800 focus:outline-none focus:ring-2 focus:ring-tiba-primary-500 focus:border-transparent appearance-none"
            >
              <option value="all">جميع الأخبار</option>
              <option value="published">المنشورة فقط</option>
              <option value="draft">المسودات فقط</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button
            onClick={applyFilters}
            leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
          >
            تطبيق الفلاتر
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setFilterPublished('all');
              setFilteredNews(news);
            }}
          >
            إعادة تعيين
          </Button>
        </div>
      </Card>

      {/* جدول الأخبار */}
      <Card>
        <DataTable
          data={filteredNews}
          columns={[
            {
              header: 'الصورة',
              accessor: (news) => renderNewsImage(news),
            },
            {
              header: 'العنوان',
              accessor: (news) => (
                <div className="flex flex-col">
                  <span className="font-medium text-tiba-gray-800">{news.title}</span>
                  <span className="text-sm text-tiba-gray-500 truncate max-w-xs">
                    {news.excerpt}
                  </span>
                </div>
              ),
            },
            {
              header: 'الكاتب',
              accessor: (news) => (
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-tiba-gray-400" />
                  <span className="text-tiba-gray-800">{news.author}</span>
                </div>
              ),
            },
            {
              header: 'الحالة',
              accessor: (news) => (
                <button
                  onClick={() => toggleNewsStatus(news.id, news.isPublished)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    news.isPublished
                      ? 'bg-tiba-secondary-50 text-tiba-secondary-700'
                      : 'bg-tiba-warning-50 text-tiba-warning-700'
                  }`}
                >
                  {news.isPublished ? (
                    <>
                      <EyeIcon className="h-4 w-4" />
                      <span>منشور</span>
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="h-4 w-4" />
                      <span>مسودة</span>
                    </>
                  )}
                </button>
              ),
            },
            {
              header: 'التاريخ',
              accessor: (news) => (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-tiba-gray-400" />
                  <span className="text-tiba-gray-800">
                    {new Date(news.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              ),
            },
            {
              header: 'الإجراءات',
              accessor: (news) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditNews(news)}
                    className="text-tiba-primary-500 hover:text-tiba-primary-700"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(news)}
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
          emptyMessage="لا توجد أخبار للعرض"
          pagination={true}
          itemsPerPage={10}
        />
      </Card>

      {/* Modals */}
      <NewsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNews(null);
        }}
        onSubmit={handleSubmitNews}
        news={editingNews || undefined}
        mode={editingNews ? 'edit' : 'add'}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && newsToDelete && (
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
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-tiba-danger-100 mb-4">
                  <TrashIcon className="h-6 w-6 text-tiba-danger-600" />
                </div>
                <h3 className="text-lg font-semibold text-tiba-gray-800 mb-2">
                  تأكيد حذف الخبر
                </h3>
                <p className="text-sm text-tiba-gray-600 mb-4">
                  هل أنت متأكد من حذف الخبر:
                </p>
                <div className="bg-tiba-gray-50 rounded-lg p-4 border border-tiba-gray-200">
                  <p className="text-tiba-gray-800 font-medium">{newsToDelete.title}</p>
                  <p className="text-tiba-gray-600 text-sm">{newsToDelete.author}</p>
                  <p className="text-tiba-gray-600 text-sm">
                    {new Date(newsToDelete.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <p className="text-xs text-tiba-gray-500 mt-3">
                  هذا الإجراء لا يمكن التراجع عنه
                </p>
              </div>

              <div className="flex justify-end items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-tiba-gray-700 border-tiba-gray-300 hover:bg-tiba-gray-50"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleDeleteNews}
                  className="bg-tiba-danger-600 hover:bg-tiba-danger-700 text-white"
                >
                  حذف الخبر
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewsManagementPage() {
  return (
    <PageGuard>
      <NewsManagementPageContent />
    </PageGuard>
  );
}