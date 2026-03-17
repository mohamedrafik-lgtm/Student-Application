import { useState, useEffect } from 'react';
import { traineeAPI, handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';

interface TraineeProfile {
  id: string;
  nationalId: string;
  birthDate: string;
  trainee: {
    id: number;
    nameAr: string;
    nameEn: string;
    nationalId: string;
    birthDate: string;
    phone: string;
    email?: string;
    gender: string;
    nationality: string;
    residenceAddress: string;
    traineeStatus: string;
    classLevel: string;
    academicYear?: string;
    photoUrl?: string;
    program: {
      id: number;
      nameAr: string;
      nameEn: string;
      price: number;
      description?: string;
    };
    attendanceRecords: Array<{
      id: number;
      status: string;
      createdAt: string;
      session: {
        title: string;
        date: string;
        content: {
          title: string;
          type: string;
        };
      };
    }>;
    traineePayments: Array<{
      id: number;
      amount: number;
      paidAmount: number;
      status: string;
      createdAt: string;
      paidAt?: string;
      fee: {
        name: string;
        amount: number;
        type: string;
        paymentSchedule?: {
          id: number;
          paymentStartDate: string;
          paymentEndDate: string;
          gracePeriodDays: number;
          finalDeadline: string;
          actionEnabled: boolean;
          nonPaymentActions: string[];
        };
      };
    }>;
    documents: Array<{
      id: string;
      documentType: string;
      fileName: string;
      isVerified: boolean;
      createdAt: string;
      uploadedAt: string;
    }>;
  };
}

interface TraineeStats {
  totalSessions: number;
  attendedSessions: number;
  attendancePercentage: number;
  totalPayments: number;
  paidAmount: number;
  remainingAmount: number;
  totalDocuments: number;
  verifiedDocuments: number;
  academicProgress: number;
}

export function useTraineeProfile() {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [stats, setStats] = useState<TraineeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('trainee_token');
        if (!token) {
          setError('لا يوجد توكن مصادقة');
          setLoading(false);
          return;
        }

        // استخدام API المباشر بدلاً من Next.js API Route
        const data = await traineeAPI.getProfile();
        console.log('🔍 Trainee Profile Data:', data);
        console.log('📸 Photo URL:', data?.trainee?.photoUrl);
        console.log('📄 Documents count:', data?.trainee?.documents?.length);
        console.log('📄 Documents data:', data?.trainee?.documents?.map((doc: any) => ({
          type: doc.documentType,
          isVerified: doc.isVerified,
          fileName: doc.fileName
        })));
        setProfile(data);

        // حساب الإحصائيات
        const traineeStats = calculateStats(data);
        setStats(traineeStats);

      } catch (err: any) {
        console.error('Error in useTraineeProfile:', err);
        
        // إذا كان الخطأ بسبب انتهاء صلاحية التوكن، لا نحاول استخدام البيانات المحفوظة
        if (isTokenExpiryError(err)) {
          handleTokenExpiry();
          return;
        }
        
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const calculateStats = (profileData: TraineeProfile): TraineeStats => {
    const { trainee } = profileData;
    
    // حساب إحصائيات الحضور
    const totalSessions = trainee.attendanceRecords.length;
    const attendedSessions = trainee.attendanceRecords.filter(
      record => record.status === 'PRESENT'
    ).length;
    const attendancePercentage = totalSessions > 0 
      ? Math.round((attendedSessions / totalSessions) * 100) 
      : 0;

    // حساب الإحصائيات المالية
    const totalPayments = trainee.traineePayments.length;
    const paidAmount = trainee.traineePayments.reduce(
      (sum, payment) => sum + payment.paidAmount, 0
    );
    const totalAmount = trainee.traineePayments.reduce(
      (sum, payment) => sum + payment.amount, 0
    );
    const remainingAmount = totalAmount - paidAmount;

    // حساب إحصائيات الوثائق - التركيز على الوثائق المطلوبة (4 أساسية)
    const requiredDocumentTypes = [
      'PERSONAL_PHOTO',      // الصورة الشخصية
      'ID_CARD_FRONT',       // صورة البطاقة وجه
      'ID_CARD_BACK',        // صورة البطاقة ظهر
      'QUALIFICATION_FRONT'  // صورة المؤهل الدراسي وجه
    ];
    
    console.log('🧮 Calculate Stats - All documents:', trainee.documents?.map(doc => ({
      type: doc.documentType,
      isVerified: doc.isVerified
    })));
    
    const totalDocuments = 4; // عدد الوثائق المطلوبة الأساسية
    const uploadedDocuments = trainee.documents.filter(
      doc => requiredDocumentTypes.includes(doc.documentType)
    ).length;
    
    console.log('🧮 Calculate Stats - Required types:', requiredDocumentTypes);
    console.log('🧮 Calculate Stats - Uploaded documents count:', uploadedDocuments);

    // حساب التقدم الأكاديمي - فقط إذا بدأت الدراسة
    let academicProgress = 0;
    if (totalSessions > 0) {
      // حساب التقدم بناءً على الحضور والوثائق
      const attendanceScore = attendancePercentage;
      const documentsScore = (uploadedDocuments / totalDocuments) * 100;
      academicProgress = Math.round((attendanceScore + documentsScore) / 2);
    }

    return {
      totalSessions,
      attendedSessions,
      attendancePercentage,
      totalPayments,
      paidAmount,
      remainingAmount,
      totalDocuments,
      verifiedDocuments: uploadedDocuments, // الوثائق المرفوعة (بدلاً من المحققة)
      academicProgress: Math.min(academicProgress, 100)
    };
  };

  return { profile, stats, loading, error, refetch: () => window.location.reload() };
}
