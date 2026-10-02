'use client';

import { useState, useEffect } from 'react';
import { 
  IdentificationIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PrinterIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { traineeAPI, handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';
import { idCardAPI } from '@/lib/id-card-api';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { SERVER_BASE_URL } from '@/lib/api';

interface IdCardStatus {
  id: number;
  traineeId: number;
  designId?: number;
  status: 'PENDING' | 'PRINTED' | 'DELIVERED' | 'LOST';
  printedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  printRecords: Array<{
    id: number;
    printedAt: string;
    printedBy: string;
  }>;
  deliveredBy?: string;
}

interface TraineeProfile {
  trainee: {
    id: number;
    nameAr: string;
    nationalId: string;
    photoUrl?: string;
    program: {
      nameAr: string;
    };
  };
}

export default function IdCardPage() {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [idCardStatus, setIdCardStatus] = useState<IdCardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLostRequestForm, setShowLostRequestForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المتدرب
      const profileData = await traineeAPI.getProfile();
      setProfile(profileData);

      // جلب حالة الكارنية
      const idCardData = await idCardAPI.getStatus();
      setIdCardStatus(idCardData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching id card data:', err);
      
      // إذا كان الخطأ بسبب انتهاء صلاحية التوكن
      if (isTokenExpiryError(err)) {
        handleTokenExpiry();
        return;
      }
      
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'قيد الانتظار',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: ClockIcon,
          description: 'كارنيه الطالب قيد المراجعة والتحضير للطباعة'
        };
      case 'PRINTED':
        return {
          label: 'تم الطباعة',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: PrinterIcon,
          description: 'تم طباعة كارنيه الطالب وهو جاهز للاستلام'
        };
      case 'DELIVERED':
        return {
          label: 'تم التسليم',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircleIcon,
          description: 'تم تسليم كارنيه الطالب بنجاح'
        };
      case 'LOST':
        return {
          label: 'مفقود',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircleIcon,
          description: 'تم الإبلاغ عن فقدان الكارنيه'
        };
      default:
        return {
          label: 'غير محدد',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: InformationCircleIcon,
          description: 'حالة غير معروفة'
        };
    }
  };

  const handleRequestLostCard = () => {
    // هذه الوظيفة مغلقة مؤقتاً
    alert('خدمة طلب بدل فاقد مغلقة مؤقتاً. يرجى التواصل مع إدارة المركز.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">جاري تحميل بيانات الكارنية...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">حدث خطأ في تحميل البيانات</h3>
          <p className="text-slate-500 font-medium mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !idCardStatus) {
    return (
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <InformationCircleIcon className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد بيانات متاحة</h3>
          <p className="text-slate-500 font-medium">لم يتم العثور على بيانات الكارنية</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(idCardStatus.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 rounded-[2rem] p-8 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black mb-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
                <IdentificationIcon className="w-6 h-6 text-white" />
              </div>
              كارنيه الطالب
            </h1>
            <p className="text-emerald-50 text-sm sm:text-base font-medium">
              متابعة حالة كارنيه الطالب الخاص بك
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={fetchData}
              className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-bold hover:bg-white/30 transition-colors flex items-center gap-2 shadow-sm border border-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* ID Card Status */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 mb-1">حالة الكارنية</h2>
            <p className="text-slate-500 text-sm font-medium">آخر تحديث: {new Date(idCardStatus.updatedAt).toLocaleDateString('ar-EG')}</p>
          </div>
          <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            رقم الكارنية: #{idCardStatus.id}
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <div className={`inline-flex items-center px-5 py-2.5 rounded-xl border shadow-sm ${statusInfo.color}`}>
              <StatusIcon className="w-5 h-5 ml-2" />
              <span className="font-black text-sm">{statusInfo.label}</span>
            </div>
          </div>
          
          <p className="text-slate-600 font-medium mb-8 leading-relaxed">{statusInfo.description}</p>
          
          {/* Timeline */}
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-black text-slate-800">تم إنشاء طلب الكارنية</h4>
                </div>
                <p className="text-sm font-medium text-slate-500">{new Date(idCardStatus.createdAt).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
            
            {idCardStatus.printedAt && (
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <PrinterIcon className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-black text-slate-800">تم طباعة الكارنية</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {new Date(idCardStatus.printedAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )}
            
            {idCardStatus.deliveredAt && (
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <HandRaisedIcon className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-black text-slate-800">تم تسليم الكارنية</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {new Date(idCardStatus.deliveredAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )}
            
            {!idCardStatus.deliveredAt && idCardStatus.printedAt && (
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-100 text-amber-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 animate-pulse">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-black text-amber-900">في انتظار الاستلام</h4>
                  </div>
                  <p className="text-sm font-medium text-amber-700">يرجى زيارة المركز لاستلام الكارنية</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Info & QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Info */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
              <IdentificationIcon className="w-5 h-5 text-emerald-600" />
            </div>
            بيانات الطالب
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-sm bg-slate-100 flex items-center justify-center flex-shrink-0">
                {profile.trainee.photoUrl ? (
                  <img 
                    src={profile.trainee.photoUrl.startsWith('http') ? profile.trainee.photoUrl : `${SERVER_BASE_URL}${profile.trainee.photoUrl}`}
                    alt={profile.trainee.nameAr}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IdentificationIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-black text-lg text-slate-800 mb-1">{profile.trainee.nameAr}</p>
                <p className="text-sm font-bold text-slate-500 mb-1">الرقم القومي: {profile.trainee.nationalId}</p>
                <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">{profile.trainee.program.nameAr}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
              </svg>
            </div>
            كود الهوية (QR Code)
          </h3>
          
          <div className="text-center bg-slate-50 rounded-2xl border border-slate-100 p-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mb-4 border border-slate-100">
              <QRCodeDisplay 
                nationalId={profile.trainee.nationalId}
                size={120}
                className="mx-auto"
              />
            </div>
            <p className="text-sm font-bold text-slate-500">
              يحتوي على الرقم القومي: {profile.trainee.nationalId}
            </p>
          </div>
        </div>
      </div>

      {/* Lost Card Request */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 bg-rose-50/50 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shadow-sm border border-rose-200">
                <ShieldExclamationIcon className="w-5 h-5 text-rose-600" />
              </div>
              طلب بدل فاقد
            </h3>
            <p className="text-slate-500 text-sm font-medium">في حالة فقدان أو تلف الكارنية</p>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-rose-100 flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-black text-rose-800 mb-1">الخدمة مغلقة مؤقتاً</h4>
                <p className="text-sm font-bold text-rose-700 leading-relaxed">
                  خدمة طلب بدل فاقد للكارنية غير متاحة حالياً. يرجى التواصل مع إدارة المركز مباشرة لطلب بدل فاقد.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRequestLostCard}
            disabled={true}
            className="w-full bg-slate-100 text-slate-400 px-6 py-4 rounded-xl font-black cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200"
          >
            <DocumentDuplicateIcon className="w-5 h-5" />
            طلب بدل فاقد (مغلق مؤقتاً)
          </button>
          
        </div>
      </div>
    </div>
  );
}
