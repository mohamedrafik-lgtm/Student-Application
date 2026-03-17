'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, API_BASE_URL } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui';
import { Button } from '@/app/components/ui/Button';
import { TibaModal } from '@/components/ui/tiba-modal';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserCircleIcon,
  CameraIcon,
  TrashIcon,
  LockClosedIcon,
  KeyIcon,
  BoltIcon,
  FingerPrintIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/app/components/PageHeader';
import { formatDate } from '@/app/lib/utils';
import PageGuard from '@/components/permissions/PageGuard';

// نموذج تحديث بيانات المستخدم
const updateProfileSchema = z.object({
  name: z.string().min(2, { message: 'الاسم يجب أن يكون على الأقل حرفين' }),
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
  phone: z.string().optional().refine((phone) => {
    if (!phone) return true;
    return /^(\+?\d{10,15})$/.test(phone);
  }, { message: 'رقم الهاتف غير صحيح' }),
});

// نموذج تغيير كلمة المرور
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'كلمة المرور الحالية مطلوبة' }),
  newPassword: z.string().min(6, { message: 'كلمة المرور الجديدة يجب أن تكون على الأقل 6 أحرف' }),
  confirmPassword: z.string().min(1, { message: 'تأكيد كلمة المرور مطلوب' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  userRoles?: Array<{
    role: {
      id: string;
      name: string;
      displayName: string;
    };
  }>;
}

function ProfilePageContent() {
  const { user, isAuthenticated, isLoading: authLoading, updateUserPhoto } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { fetchAPI } = await import('@/lib/api');
      const data = await fetchAPI(`/users/${user.id}`);
      setUserProfile(data);
      profileForm.reset({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
    } catch (error: any) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      toast.error('فشل في تحميل بيانات الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (values: z.infer<typeof updateProfileSchema>) => {
    if (!user?.id) return;
    try {
      const { fetchAPI } = await import('@/lib/api');
      const updatedData = await fetchAPI(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      setUserProfile(updatedData);
      setIsEditing(false);
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error: any) {
      console.error('خطأ في تحديث البيانات:', error);
      toast.error(error.message || 'فشل في تحديث البيانات');
    }
  };

  const onSubmitPassword = async (values: z.infer<typeof changePasswordSchema>) => {
    if (!user?.id) return;
    try {
      await fetchAPI(`/users/${user.id}/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      setOpenPasswordDialog(false);
      passwordForm.reset();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (error: any) {
      console.error('خطأ في تغيير كلمة المرور:', error);
      toast.error(error.message || 'كلمة المرور الحالية غير صحيحة');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار ملف صورة صالح'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت'); return; }
    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/profile-photo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('فشل في رفع الصورة');
      const result = await response.json();
      setUserProfile(prev => prev ? { ...prev, photoUrl: result.photoUrl } : prev);
      updateUserPhoto(result.photoUrl);
      toast.success('تم تحديث الصورة الشخصية بنجاح');
    } catch (error: any) {
      toast.error('فشل في رفع الصورة الشخصية');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    try {
      setUploadingPhoto(true);
      await fetchAPI(`/users/${user.id}/profile-photo`, { method: 'DELETE' });
      setUserProfile(prev => prev ? { ...prev, photoUrl: undefined } : prev);
      updateUserPhoto(null);
      toast.success('تم حذف الصورة الشخصية بنجاح');
    } catch (error: any) {
      toast.error('فشل في حذف الصورة الشخصية');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated && user?.id) {
      fetchUserProfile();
    }
  }, [authLoading, isAuthenticated, user?.id, router]);

  if (authLoading || loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <PageHeader title="الملف الشخصي" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الملف الشخصي' }]} />
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-40" />
                <div className="h-4 bg-slate-100 rounded w-56" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
                <div className="h-5 bg-slate-100 rounded w-44" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) return null;

  const initials = userProfile.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '؟';

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="الملف الشخصي"
        description="عرض وإدارة بيانات حسابك الشخصي"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الملف الشخصي' },
        ]}
      />

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Hero Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Gradient Banner - mobile only */}
          <div className="relative h-14 sm:hidden bg-blue-700">
            <div className="absolute inset-0 bg-gradient-to-l from-blue-800 to-blue-600 opacity-80" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl -translate-x-1/3 translate-y-1/3" />
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 blur-2xl translate-x-1/4 -translate-y-1/4" />
          </div>

          {/* Profile Info Below Banner */}
          <div className="relative px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 pt-0 sm:pt-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-5 -mt-8 sm:mt-0">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  {userProfile.photoUrl ? (
                    <img src={userProfile.photoUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold text-blue-700">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0.5 left-0.5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  title="تغيير الصورة"
                >
                  {uploadingPhoto ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CameraIcon className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              {/* Name & Status */}
              <div className="flex-1 min-w-0 text-center sm:text-right pb-0.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{userProfile.name}</h1>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit mx-auto sm:mx-0 ${
                    userProfile.isActive
                      ? 'bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-secondary-200'
                      : 'bg-tiba-danger-50 text-tiba-danger-700 border border-tiba-danger-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${userProfile.isActive ? 'bg-tiba-secondary-500' : 'bg-tiba-danger-500'}`} />
                    {userProfile.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{userProfile.email}</p>
                {userProfile.userRoles && userProfile.userRoles.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                    {userProfile.userRoles.map((ur, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <ShieldCheckIcon className="w-3 h-3" />
                        {ur.role.displayName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pb-0.5 flex-shrink-0">
                {userProfile.photoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    leftIcon={<TrashIcon className="w-3.5 h-3.5" />}
                    className="text-red-500 border-red-200 hover:text-red-700 hover:bg-red-50 hover:border-red-300 text-xs"
                  >
                    حذف الصورة
                  </Button>
                )}
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                    onClick={() => setIsEditing(true)}
                  >
                    تعديل البيانات
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isEditing ? (
          /* Edit Mode */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
                    <PencilSquareIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">تعديل البيانات الشخصية</h3>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<XMarkIcon className="w-4 h-4" />}
                    onClick={() => {
                      setIsEditing(false);
                      profileForm.reset({ name: userProfile.name, email: userProfile.email, phone: userProfile.phone || '' });
                    }}
                    className="flex-1 sm:flex-initial text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckIcon className="w-4 h-4" />}
                    onClick={profileForm.handleSubmit(onSubmitProfile)}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                  >
                    حفظ التغييرات
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <Form {...profileForm}>
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          الاسم الكامل
                        </FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                            placeholder="أدخل اسمك الكامل"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                          البريد الإلكتروني
                        </FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="email"
                            dir="ltr"
                            className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                            placeholder="example@email.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <PhoneIcon className="w-4 h-4 text-blue-600" />
                          رقم الهاتف <span className="text-slate-400 font-normal">(اختياري)</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="tel"
                            dir="ltr"
                            className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                            placeholder="+201234567890"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
        ) : (
          /* View Mode - Info Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Name Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">الاسم الكامل</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{userProfile.name}</p>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">البريد الإلكتروني</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate" dir="ltr">{userProfile.email}</p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <PhoneIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">رقم الهاتف</p>
                  <p className={`text-sm font-semibold mt-0.5 truncate ${userProfile.phone ? 'text-slate-900' : 'text-slate-300'}`} dir="ltr">
                    {userProfile.phone || 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>

            {/* Created At Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <CalendarIcon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">تاريخ إنشاء الحساب</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(userProfile.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Last Login Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <ClockIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">آخر تسجيل دخول</p>
                  <p className={`text-sm font-semibold mt-0.5 ${userProfile.lastLoginAt ? 'text-slate-900' : 'text-slate-300'}`}>
                    {userProfile.lastLoginAt ? formatDate(userProfile.lastLoginAt) : 'غير متوفر'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:shadow-md transition-shadow ${
                  userProfile.isActive
                    ? 'bg-gradient-to-br from-tiba-secondary-50 to-tiba-secondary-100'
                    : 'bg-gradient-to-br from-tiba-danger-50 to-tiba-danger-100'
                }`}>
                  <FingerPrintIcon className={`w-5 h-5 ${userProfile.isActive ? 'text-tiba-secondary-600' : 'text-tiba-danger-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">حالة الحساب</p>
                  <p className={`text-sm font-semibold mt-0.5 ${userProfile.isActive ? 'text-tiba-secondary-700' : 'text-tiba-danger-700'}`}>
                    {userProfile.isActive ? 'حساب نشط' : 'حساب معطّل'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roles Card */}
        {!isEditing && userProfile.userRoles && userProfile.userRoles.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
                  <ShieldCheckIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">الأدوار والصلاحيات</h3>
                  <p className="text-xs text-slate-400 mt-0.5">الأدوار المخصصة لحسابك في النظام</p>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {userProfile.userRoles.map((ur, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-800 text-sm font-medium">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    {ur.role.displayName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Card */}
        {!isEditing && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-br from-tiba-warning-500 to-amber-600 rounded-lg shadow-sm">
                  <LockClosedIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">الأمان والحماية</h3>
                  <p className="text-xs text-slate-400 mt-0.5">إدارة كلمة المرور وإعدادات الأمان</p>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-amber-50/30 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">كلمة المرور</h4>
                    <p className="text-xs text-slate-400 mt-0.5">يمكنك تغيير كلمة المرور لحماية حسابك</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  تغيير
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      <TibaModal
        open={openPasswordDialog}
        onClose={() => {
          setOpenPasswordDialog(false);
          passwordForm.reset();
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }}
        variant="warning"
        size="md"
        title="تغيير كلمة المرور"
        subtitle="أدخل كلمة المرور الحالية والجديدة لتحديث بيانات الأمان"
        icon={<LockClosedIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpenPasswordDialog(false);
                passwordForm.reset();
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LockClosedIcon className="w-4 h-4" />}
              onClick={passwordForm.handleSubmit(onSubmitPassword)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
            >
              تغيير كلمة المرور
            </Button>
          </div>
        }
      >
        <Form {...passwordForm}>
          <form className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">كلمة المرور الحالية</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        {...field}
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="w-full h-11 px-3.5 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                        placeholder="أدخل كلمة المرور الحالية"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        {...field}
                        type={showNewPassword ? 'text' : 'password'}
                        className="w-full h-11 px-3.5 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                        placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">تأكيد كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        {...field}
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="w-full h-11 px-3.5 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors"
                        placeholder="أعد إدخال كلمة المرور الجديدة"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </TibaModal>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <PageGuard>
      <ProfilePageContent />
    </PageGuard>
  );
}
