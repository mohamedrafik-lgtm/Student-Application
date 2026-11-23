'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import NewTraineeForm from '../../components/NewTraineeForm';
import { FormData } from '../../schema';
import PageGuard from '@/components/permissions/PageGuard';
import TraineeEditHistoryModal from '@/components/ui/TraineeEditHistoryModal';
import { ClockIcon } from '@heroicons/react/24/outline';

interface Program {
  id: number;
  nameAr: string;
}

function EditTraineePageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [initialData, setInitialData] = useState<Partial<FormData> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [traineeName, setTraineeName] = useState('');
  const [createdBy, setCreatedBy] = useState<{ name: string; createdAt: string } | null>(null);
  const [updatedBy, setUpdatedBy] = useState<{ name: string; updatedAt: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && isAuthenticated && authUser) {
      // المستخدم مسجل دخول ويمكنه الوصول للصفحة
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          const [traineeData, programsData] = await Promise.all([
            fetchAPI(`/trainees/${id}`),
            fetchAPI('/programs')
          ]);
          
          if (traineeData) {
            // Convert date strings from 'YYYY-MM-DDTHH:mm:ss.sssZ' to 'YYYY-MM-DD'
            const formatDate = (dateString: string | null | undefined) => {
                if (!dateString) return '';
                try {
                    return new Date(dateString).toISOString().split('T')[0];
                } catch (e) {
                    return '';
                }
            };

            // تحويل القيم null إلى سلاسل نصية فارغة للحقول الاختيارية
            const processedTraineeData = {
              ...traineeData,
              birthDate: formatDate(traineeData.birthDate),
              idIssueDate: formatDate(traineeData.idIssueDate),
              idExpiryDate: formatDate(traineeData.idExpiryDate),
              graduationDate: formatDate(traineeData.graduationDate),
              
              // تحويل الحقول الاختيارية من null إلى empty string
              email: traineeData.email || '',
              guardianEmail: traineeData.guardianEmail || '',
              guardianJob: traineeData.guardianJob || '',
              guardianName: traineeData.guardianName || '',
              landline: traineeData.landline || '',
              whatsapp: traineeData.whatsapp || '',
              facebook: traineeData.facebook || '',
              photoUrl: traineeData.photoUrl || '',
              governorate: traineeData.governorate || '',
              academicYear: traineeData.academicYear || '',
              
              // تحويل الحقول الرقمية الاختيارية
              totalGrade: traineeData.totalGrade || '',
              gradePercentage: traineeData.gradePercentage || '',
            };

            setInitialData(processedTraineeData);
            setTraineeName(traineeData.nameAr);
            
            // حفظ معلومات المنشئ والمحدث
            if (traineeData.createdBy) {
              setCreatedBy({
                name: traineeData.createdBy.name,
                createdAt: traineeData.createdAt
              });
            }
            if (traineeData.updatedBy) {
              setUpdatedBy({
                name: traineeData.updatedBy.name,
                updatedAt: traineeData.updatedAt
              });
            }
          } else {
             setError('لم يتم العثور على المتدرب المطلوب.');
          }

          setPrograms(programsData || []);

        } catch (err) {
          setError('حدث خطأ أثناء تحميل البيانات');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isAuthenticated, id]);
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await fetchAPI(`/trainees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      toast.success('تم تعديل بيانات المتدرب بنجاح');
      router.push('/dashboard/trainees');
    } catch (error) {
      console.error('Error updating trainee:', error);
      toast.error('فشل في تعديل البيانات. يرجى المحاولة مرة أخرى.');
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-tiba-gray-50">
        <Card className="max-w-md mx-auto text-center">
          <div className="p-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-tiba-danger-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-tiba-gray-800 mb-2">حدث خطأ</h2>
            <p className="text-tiba-gray-600">{error}</p>
             <Button
                variant="outline"
                onClick={() => router.push('/dashboard/trainees')}
                className="mt-4"
              >
              العودة للمتدربين
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تعديل بيانات المتدرب"
        description="قم بتحديث بيانات المتدرب والبرنامج المسجل به"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المتدربين', href: '/dashboard/trainees' },
          { label: 'تعديل متدرب' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(true)}
              leftIcon={<ClockIcon className="h-4 w-4" />}
            >
              سجل التعديلات
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/trainees')}
              leftIcon={<ArrowRightIcon className="h-4 w-4" />}
            >
              العودة للمتدربين
            </Button>
          </div>
        }
      />
      
      {/* معلومات المنشئ والمحدث */}
      {(createdBy || updatedBy) && (
        <div className="mb-6">
          <Card>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createdBy && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">أنشأ بواسطة</p>
                      <p className="text-base font-bold text-green-800">{createdBy.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(createdBy.createdAt).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                
                {updatedBy && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">آخر تعديل بواسطة</p>
                      <p className="text-base font-bold text-blue-800">{updatedBy.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(updatedBy.updatedAt).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {initialData && (
        <NewTraineeForm
          initialData={initialData}
          programs={programs}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          mode="edit"
        />
      )}
      
      {/* Modal سجل التعديلات */}
      <TraineeEditHistoryModal
        traineeId={parseInt(id)}
        traineeName={traineeName}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </div>
  );
}

export default function EditTraineePage({ params }: { params: { id: string } }) {
  return (
    <PageGuard>
      <EditTraineePageContent params={params} />
    </PageGuard>
  );
}