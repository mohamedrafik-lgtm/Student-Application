'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import NewTraineeForm from '../components/NewTraineeForm';
import { FormData } from '../schema';
import PageGuard from '@/components/permissions/PageGuard';

interface Program {
  id: number;
  nameAr: string;
}

function NewTraineePageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && isAuthenticated && user) {
      // المستخدم مسجل دخول ويمكنه الوصول للصفحة
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAPI('/programs')
        .then(data => setPrograms(data || []))
        .catch(err => {
          setError('حدث خطأ أثناء تحميل البرامج');
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  const handleSubmit = async (formData: FormData) => {
    console.log('Submitting trainee data:', formData);
    setIsSubmitting(true);
    
    try {
      const response = await fetchAPI('/trainees', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      console.log('API Response:', response);
      toast.success('تمت إضافة المتدرب بنجاح!');
      
      // فتح صفحة طباعة استمارة التقديم للمتدرب الجديد في تاب جديد
      if (response && response.id) {
        const printFormUrl = `/print/application-form/${response.id}`;
        window.open(printFormUrl, '_blank');
      }
      
      router.push('/dashboard/trainees');
    } catch (error: any) {
      console.error('Error creating trainee:', error);
      
      // التعامل مع أخطاء البيانات المكررة
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const duplicateErrors = error.response.data.errors;
        
        // عرض كل خطأ تكرار بشكل منفصل
        duplicateErrors.forEach((err: any) => {
          toast.error(`❌ ${err.message}`, {
            duration: 6000,
            position: 'top-center',
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }
          });
        });
        
        // رسالة إجمالية
        toast.error(`🚫 لا يمكن التسجيل - توجد ${duplicateErrors.length} بيانات مكررة`, {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#7f1d1d',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
          }
        });
        
      } else if (error?.response?.data?.message) {
        // خطأ عام من الخادم
        toast.error(`❌ ${error.response.data.message}`, {
          duration: 5000,
          position: 'top-center',
        });
      } else if (error?.message) {
        toast.error(`خطأ: ${error.message}`);
      } else {
        toast.error('حدث خطأ أثناء إضافة المتدرب.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div>
      <PageHeader
        title="إضافة متدرب جديد"
        description="أدخل بيانات المتدرب الجديد لإضافته للنظام"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'متدرب جديد' }
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/trainees')}
            leftIcon={<ArrowRightIcon className="h-4 w-4" />}
          >
            العودة للمتدربين
          </Button>
        }
      />
      <NewTraineeForm
        programs={programs}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        mode="add"
      />
    </div>
  );
}

export default function NewTraineePage() {
  return (
    <PageGuard>
      <NewTraineePageContent />
    </PageGuard>
  );
}