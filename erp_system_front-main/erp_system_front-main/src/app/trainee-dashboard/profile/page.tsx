'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  AcademicCapIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { SERVER_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TraineeProfilePage() {
  const { profile: traineeData, loading, error } = useTraineeProfile();

  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل بياناتك الشخصية..." 
        submessage="نحضر لك معلوماتك المحدثة"
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!traineeData?.trainee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد بيانات متاحة</p>
        </div>
      </div>
    );
  }

  const trainee = traineeData.trainee;

  // تعريب المستوى التعليمي
  const getEducationLabel = (education: string) => {
    const educationLabels: { [key: string]: string } = {
      'PREPARATORY': 'إعدادي',
      'INDUSTRIAL_SECONDARY': 'ثانوي فني صناعي',
      'COMMERCIAL_SECONDARY': 'ثانوي فني تجاري',
      'AGRICULTURAL_SECONDARY': 'ثانوي فني زراعي',
      'AZHAR_SECONDARY': 'ثانوي أزهري',
      'GENERAL_SECONDARY': 'ثانوي عام',
      'UNIVERSITY': 'بكالوريوس - ليسانس',
      'INDUSTRIAL_APPRENTICESHIP': 'تلمذة صناعية'
    };
    return educationLabels[education] || education;
  };

  // تعريب الحالة الاجتماعية
  const getMaritalStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'SINGLE': 'أعزب',
      'MARRIED': 'متزوج',
      'DIVORCED': 'مطلق',
      'WIDOWED': 'أرمل'
    };
    return statusLabels[status] || status;
  };

  // تعريب الديانة
  const getReligionLabel = (religion: string) => {
    const religionLabels: { [key: string]: string } = {
      'ISLAM': 'الإسلام',
      'CHRISTIANITY': 'المسيحية',
      'JUDAISM': 'اليهودية'
    };
    return religionLabels[religion] || religion;
  };

  return (
    <div className="space-y-8 pb-8 px-4 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <Link 
            href="/trainee-dashboard" 
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 group"
          >
            <ArrowLeftIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">الملف الشخصي</h1>
            <p className="text-slate-500 font-bold text-sm mt-1">إدارة بياناتك الشخصية والأكاديمية</p>
          </div>
        </div>
        <Badge className="hidden md:flex bg-emerald-50 text-emerald-700 border-0 px-4 py-2 rounded-xl font-black gap-2 items-center shadow-sm">
          <ShieldCheckIcon className="w-5 h-5" />
          حساب موثق
        </Badge>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Profile Photo & Quick Stats (Takes 4 columns on XL) */}
        <div className="xl:col-span-4 space-y-8">
          {/* Main Profile Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden relative group">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 transition-all duration-500 group-hover:scale-105">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] opacity-30"></div>
            </div>
            
            <CardContent className="p-8 pt-24 relative z-10 text-center flex flex-col items-center">
              {/* Photo */}
              <div className="relative mb-5">
                <Avatar className="w-36 h-36 border-8 border-white shadow-2xl bg-white">
                  <AvatarImage 
                    src={trainee.photoUrl ? (trainee.photoUrl.startsWith('http') ? trainee.photoUrl : `${SERVER_BASE_URL}${trainee.photoUrl}`) : undefined} 
                    alt={trainee.nameAr || 'صورة المتدرب'} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-slate-50 text-slate-300">
                    <UserIcon className="w-16 h-16" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-sm"></div>
              </div>

              <h2 className="text-2xl font-black text-slate-800 mb-1.5">{trainee.nameAr}</h2>
              <p className="text-slate-400 font-bold text-sm mb-6">{trainee.nameEn || 'الاسم بالإنجليزية غير متوفر'}</p>
              
              <Badge className={`px-6 py-2 rounded-2xl font-black border-0 text-sm shadow-sm ${
                trainee.status === 'CURRENT' ? 'bg-emerald-50 text-emerald-700' :
                trainee.status === 'NEW' ? 'bg-blue-50 text-blue-700' :
                trainee.status === 'GRADUATE' ? 'bg-purple-50 text-purple-700' :
                'bg-slate-50 text-slate-700'
              }`}>
                {trainee.status === 'CURRENT' ? 'متدرب حالي' :
                 trainee.status === 'NEW' ? 'متدرب مستجد' :
                 trainee.status === 'GRADUATE' ? 'خريج' :
                 trainee.status === 'WITHDRAWN' ? 'منسحب' : trainee.status}
              </Badge>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white">
            <CardContent className="p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">معلومات سريعة</h3>
              
              <div className="flex items-center gap-4 group/item">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover/item:bg-emerald-50 group-hover/item:text-emerald-600 transition-colors">
                  <IdentificationIcon className="w-6 h-6 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 mb-0.5">الرقم القومي</p>
                  <p className="text-base font-black text-slate-700">{trainee.nationalId}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group/item">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                  <CalendarDaysIcon className="w-6 h-6 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 mb-0.5">تاريخ الميلاد</p>
                  <p className="text-base font-black text-slate-700">{new Date(trainee.birthDate).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group/item">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover/item:bg-purple-50 group-hover/item:text-purple-600 transition-colors">
                  <AcademicCapIcon className="w-6 h-6 text-slate-400 group-hover/item:text-purple-600 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 mb-0.5">البرنامج التدريبي</p>
                  <p className="text-base font-black text-slate-700 leading-tight">{trainee.program?.nameAr}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Information (Takes 8 columns on XL) */}
        <div className="xl:col-span-8 space-y-8">
          {/* Personal Information */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden">
            <div className="h-2 w-full bg-emerald-500"></div>
            <CardHeader className="pb-2 pt-8 px-8 md:px-10">
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-emerald-600" />
                </div>
                البيانات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 md:p-10 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">الاسم بالعربية</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {trainee.nameAr}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">الاسم بالإنجليزية</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {trainee.nameEn || '—'}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">الجنس</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">الحالة الاجتماعية</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {getMaritalStatusLabel(trainee.maritalStatus)}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">الديانة</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {getReligionLabel(trainee.religion)}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">المستوى التعليمي</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                    {getEducationLabel(trainee.educationType)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden">
            <div className="h-2 w-full bg-blue-500"></div>
            <CardHeader className="pb-2 pt-8 px-8 md:px-10">
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <PhoneIcon className="w-6 h-6 text-blue-600" />
                </div>
                معلومات التواصل
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 md:p-10 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">رقم الهاتف</label>
                  <div className="flex items-center gap-3 text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-blue-200 transition-colors">
                    <PhoneIcon className="w-5 h-5 text-slate-300" />
                    <span dir="ltr">{trainee.phone || '—'}</span>
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">البريد الإلكتروني</label>
                  <div className="flex items-center gap-3 text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-blue-200 transition-colors">
                    <EnvelopeIcon className="w-5 h-5 text-slate-300" />
                    {trainee.email || '—'}
                  </div>
                </div>
                <div className="md:col-span-2 group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">العنوان بالتفصيل</label>
                  <div className="flex items-start gap-3 text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-blue-200 transition-colors">
                    <MapPinIcon className="w-5 h-5 text-slate-300 mt-1 flex-shrink-0" />
                    <span className="leading-relaxed">{trainee.address || '—'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden">
            <div className="h-2 w-full bg-purple-500"></div>
            <CardHeader className="pb-2 pt-8 px-8 md:px-10">
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                  <AcademicCapIcon className="w-6 h-6 text-purple-600" />
                </div>
                التفاصيل الأكاديمية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 md:p-10 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">تاريخ التسجيل بالمركز</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-purple-200 transition-colors">
                    {new Date(trainee.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">نظام الدراسة</label>
                  <div className="text-lg font-black text-slate-800 pb-2 border-b-2 border-slate-100 group-hover:border-purple-200 transition-colors">
                    {trainee.enrollmentType === 'REGULAR' ? 'انتظام (حضور فعلي)' :
                     trainee.enrollmentType === 'DISTANCE' ? 'انتساب (أونلاين)' :
                     trainee.enrollmentType === 'BOTH' ? 'مدمج (حضور + أونلاين)' : trainee.enrollmentType}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}