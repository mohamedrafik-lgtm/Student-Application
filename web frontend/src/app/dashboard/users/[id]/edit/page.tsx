'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowRightIcon,
  CheckIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import PageGuard from '@/components/permissions/PageGuard';
import StaffAvatar from '@/components/ui/StaffAvatar';

const formSchema = z.object({
  name: z.string().min(3, 'يجب أن يكون الاسم 3 أحرف على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone.trim() === '') return true;
    // التحقق من أن رقم الهاتف يحتوي على أرقام فقط ويتراوح بين 10-15 رقم
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    return phoneRegex.test(phone.trim());
  }, {
    message: 'رقم الهاتف غير صالح (يجب أن يكون من 10-15 رقم)'
  }),
  accountType: z.enum(['STAFF', 'INSTRUCTOR'], {
    required_error: 'يجب اختيار نوع الحساب',
  }),
  password: z.string().optional(),
  confirmPassword: z.string().optional()
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "كلمة المرور غير متطابقة",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface UserRole {
  id: string;
  roleId: string;
  isActive: boolean;
  role: Role;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  accountType: 'STAFF' | 'INSTRUCTOR';
  hasCrmAccess?: boolean;
  userRoles?: UserRole[];
  allowedProgramIds?: number[];
  allowedProgramsList?: { id: number; nameAr: string; nameEn: string }[];
  allowedDistributionIds?: string[];
  allowedDistributionsList?: any[];
  allowedRoomIds?: string[];
  allowedRoomsList?: { id: string; roomName: string; roomNumber: number; distributionId: string; _count: { assignments: number } }[];
}

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Distribution {
  id: string;
  programId: number;
  type: 'THEORY' | 'PRACTICAL';
  classroomId?: number | null;
  numberOfRooms: number;
  program: { id: number; nameAr: string; nameEn: string };
  classroom?: { id: number; name: string; classNumber: number } | null;
  rooms: { id: string; roomName: string; roomNumber: number; _count: { assignments: number } }[];
}

function EditUserPageContent() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);
  const [programAccessMode, setProgramAccessMode] = useState<'all' | 'specific'>('all');
  const [allDistributions, setAllDistributions] = useState<Distribution[]>([]);
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<string[]>([]);
  const [distributionAccessMode, setDistributionAccessMode] = useState<'all' | 'specific'>('all');
  const [distributionsLoading, setDistributionsLoading] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [distributionRoomMode, setDistributionRoomMode] = useState<Record<string, 'all' | 'specific'>>({});
  const [hasCrmAccess, setHasCrmAccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // جلب الصلاحيات المتاحة
  const fetchRoles = async () => {
    try {
      const roles = await fetchAPI('/permissions/roles');
      setAvailableRoles(roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // جلب جميع البرامج التدريبية
  const fetchPrograms = async () => {
    try {
      const res = await fetchAPI('/programs');
      const programs = Array.isArray(res) ? res : (res?.data || res?.programs || []);
      setAllPrograms(programs);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  // جلب بيانات المستخدم
  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await fetchAPI(`/users/${userId}`);
      setUser(userData);
      setHasCrmAccess(userData.hasCrmAccess || false);
      
      // تحديد الصلاحيات المفعلة
      const activeRoles = userData.userRoles
        ?.filter((ur: UserRole) => ur.isActive)
        .map((ur: UserRole) => ur.roleId) || [];
      setSelectedRoles(activeRoles);
      
      // تحديد البرامج المسموح بها
      const allowedIds = userData.allowedProgramIds || [];
      setSelectedProgramIds(allowedIds);
      setProgramAccessMode(allowedIds.length > 0 ? 'specific' : 'all');
      
      // تحديد التوزيعات المسموح بها
      const allowedDistIds = userData.allowedDistributionIds || [];
      setSelectedDistributionIds(allowedDistIds);
      setDistributionAccessMode(allowedDistIds.length > 0 ? 'specific' : 'all');
      
      // تحديد المجموعات (الغرف) المسموح بها
      const allowedRIds = userData.allowedRoomIds || [];
      setSelectedRoomIds(allowedRIds);
      // تحديد وضع كل توزيعة: هل كل الغرف أم غرف محددة
      if (allowedDistIds.length > 0) {
        const roomsList = userData.allowedRoomsList || [];
        const modeMap: Record<string, 'all' | 'specific'> = {};
        for (const distId of allowedDistIds) {
          const hasSpecificRooms = roomsList.some((r: any) => r.distributionId === distId);
          modeMap[distId] = hasSpecificRooms ? 'specific' : 'all';
        }
        setDistributionRoomMode(modeMap);
      }
      
      reset({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        accountType: userData.accountType || 'STAFF',
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات المستخدم');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchUser();
      fetchRoles();
      fetchPrograms();
    }
  }, [isAuthenticated, userId]);

  // التعامل مع تحديد/إلغاء تحديد الصلاحيات
  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  // التعامل مع تحديد/إلغاء تحديد البرامج
  const toggleProgram = (programId: number) => {
    setSelectedProgramIds(prev => {
      const newIds = prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId];
      // عند إلغاء برنامج، أزل التوزيعات التابعة له
      if (!newIds.includes(programId)) {
        setSelectedDistributionIds(prevDist =>
          prevDist.filter(did => {
            const dist = allDistributions.find(d => d.id === did);
            return dist ? newIds.includes(dist.programId) : false;
          })
        );
      }
      return newIds;
    });
  };

  // التعامل مع تحديد/إلغاء تحديد التوزيعات
  const toggleDistribution = (distributionId: string) => {
    setSelectedDistributionIds(prev => {
      if (prev.includes(distributionId)) {
        // عند إلغاء توزيعة، أزل غرفها من المحددة
        const dist = allDistributions.find(d => d.id === distributionId);
        if (dist) {
          const distRoomIds = dist.rooms.map(r => r.id);
          setSelectedRoomIds(prevRooms => prevRooms.filter(rid => !distRoomIds.includes(rid)));
        }
        setDistributionRoomMode(prev => { const copy = { ...prev }; delete copy[distributionId]; return copy; });
        return prev.filter(id => id !== distributionId);
      }
      return [...prev, distributionId];
    });
  };

  // التعامل مع تغيير وضع المجموعات لتوزيعة معينة
  const setRoomModeForDistribution = (distributionId: string, mode: 'all' | 'specific') => {
    setDistributionRoomMode(prev => ({ ...prev, [distributionId]: mode }));
    if (mode === 'all') {
      // إزالة الغرف المحددة لهذه التوزيعة
      const dist = allDistributions.find(d => d.id === distributionId);
      if (dist) {
        const distRoomIds = dist.rooms.map(r => r.id);
        setSelectedRoomIds(prev => prev.filter(rid => !distRoomIds.includes(rid)));
      }
    }
  };

  // التعامل مع تحديد/إلغاء تحديد غرفة
  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // جلب التوزيعات عند تغيير البرامج المحددة
  useEffect(() => {
    const fetchDistributions = async () => {
      const programIds = programAccessMode === 'specific' ? selectedProgramIds : allPrograms.map(p => p.id);
      if (programIds.length === 0) {
        setAllDistributions([]);
        return;
      }
      setDistributionsLoading(true);
      try {
        const results: Distribution[] = [];
        for (const pid of programIds) {
          const res = await fetchAPI(`/trainee-distribution?programId=${pid}`);
          const dists = Array.isArray(res) ? res : (res?.data || []);
          results.push(...dists);
        }
        setAllDistributions(results);
      } catch (error) {
        console.error('Error fetching distributions:', error);
      } finally {
        setDistributionsLoading(false);
      }
    };
    if (isAuthenticated) {
      fetchDistributions();
    }
  }, [programAccessMode, selectedProgramIds, allPrograms, isAuthenticated]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { confirmPassword, ...submitData } = data;
      
      // إزالة كلمة المرور إذا كانت فارغة
      if (!submitData.password || submitData.password.trim() === '') {
        delete submitData.password;
      }

      // تنظيف رقم الهاتف (إزالة المسافات الإضافية)
      if (submitData.phone) {
        submitData.phone = submitData.phone.trim();
        // إذا كان رقم الهاتف فارغ بعد التنظيف، احذفه
        if (submitData.phone === '') {
          delete submitData.phone;
        }
      }

      // تحديث بيانات المستخدم
      await fetchAPI(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...submitData,
          hasCrmAccess,
          allowedProgramIds: programAccessMode === 'all' ? [] : selectedProgramIds,
          allowedDistributionIds: distributionAccessMode === 'all' ? [] : selectedDistributionIds,
          allowedRoomIds: distributionAccessMode === 'all' ? [] : selectedRoomIds,
        }),
      });

      // تحديث الصلاحيات - إزالة الأدوار القديمة وإضافة الجديدة
      const currentRoles = user?.userRoles
        ?.filter((ur: UserRole) => ur.isActive)
        .map((ur: UserRole) => ur.roleId) || [];

      // إزالة الأدوار التي تم إلغاؤها
      const rolesToRemove = currentRoles.filter((roleId: string) => !selectedRoles.includes(roleId));
      for (const roleId of rolesToRemove) {
        try {
          await fetchAPI(`/permissions/users/${userId}/roles/${roleId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error(`Error removing role ${roleId}:`, error);
        }
      }

      // إضافة الأدوار الجديدة
      if (selectedRoles.length > 0) {
        try {
          await fetchAPI(`/permissions/assign-roles/bulk`, {
            method: 'POST',
            body: JSON.stringify({ 
              userId: userId, 
              roleIds: selectedRoles 
            }),
          });
        } catch (error) {
          console.error('Error assigning roles:', error);
        }
      }

      toast.success('تم تحديث بيانات المستخدم بنجاح!');
      router.push('/dashboard/users');
    } catch (error: any) {
      console.error('Error updating user:', error);
      // عرض رسالة الخطأ المُحددة من الـ API
      toast.error(error.message || 'حدث خطأ أثناء تحديث بيانات المستخدم');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-tiba-primary-200 border-t-tiba-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">مستخدم غير موجود</h2>
          <p className="text-sm text-slate-500 mb-4">المستخدم المطلوب غير موجود.</p>
          <Link href="/dashboard/users" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-l from-tiba-primary-600 to-indigo-600 rounded-xl hover:from-tiba-primary-700 hover:to-indigo-700 transition-all shadow-sm">
            <ArrowRightIcon className="w-4 h-4" /> العودة للمستخدمين
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-center gap-4">
          <StaffAvatar name={user.name} photoUrl={user.photoUrl} size="xl" />
          <div className="text-center sm:text-right flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">تعديل المستخدم</h1>
            <p className="text-white/70 text-sm mt-0.5">{user.name} — {user.email}</p>
          </div>
          <Link href="/dashboard/users" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all">
            <ArrowRightIcon className="w-4 h-4" /> العودة للمستخدمين
          </Link>
        </div>
      </div>

      {/* ============ FORM ============ */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-tiba-primary-100 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-tiba-primary-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700">البيانات الأساسية</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* اسم المستخدم */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <UserIcon className="w-4 h-4 text-tiba-primary-500" /> اسم المستخدم *
              </Label>
              <Input id="name" {...register('name')} placeholder="أدخل اسم المستخدم الكامل"
                className={`h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-tiba-primary-100 focus:border-tiba-primary-300 ${errors.name ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : ''}`} />
              {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.name.message}</p>}
            </div>
            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <EnvelopeIcon className="w-4 h-4 text-emerald-500" /> البريد الإلكتروني *
              </Label>
              <Input id="email" type="email" {...register('email')} placeholder="example@domain.com"
                className={`h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 ${errors.email ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : ''}`} />
              {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.email.message}</p>}
            </div>
            {/* رقم الهاتف */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <PhoneIcon className="w-4 h-4 text-blue-500" /> رقم الهاتف (اختياري)
              </Label>
              <Input id="phone" type="tel" {...register('phone')} placeholder="01234567890"
                className={`h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-300 ${errors.phone ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : ''}`} />
              {errors.phone && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.phone.message}</p>}
            </div>
            {/* نوع الحساب */}
            <div className="space-y-2">
              <Label htmlFor="accountType" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <UsersIcon className="w-4 h-4 text-indigo-500" /> نوع الحساب *
              </Label>
              <select id="accountType" {...register('accountType')}
                className={`w-full h-11 px-4 border rounded-xl text-sm transition-all bg-white ${
                  errors.accountType ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-tiba-primary-300 focus:ring-tiba-primary-100 hover:border-slate-300'
                } focus:ring-2 focus:outline-none`}>
                <option value="STAFF">موظف إداري</option>
                <option value="INSTRUCTOR">محاضر</option>
              </select>
              {errors.accountType && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.accountType.message}</p>}
              <p className="text-[11px] text-slate-400">الموظف الإداري: وصول كامل للوحة التحكم | المحاضر: وصول محدود</p>
            </div>

            {/* صلاحية الوصول لنظام CRM */}
            <div className="sm:col-span-2">
              <label
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  hasCrmAccess
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    hasCrmAccess ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <svg className={`w-5 h-5 ${hasCrmAccess ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">الوصول لنظام CRM</p>
                    <p className="text-[11px] text-slate-400">السماح للمستخدم بالدخول إلى نظام إدارة علاقات العملاء</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasCrmAccess}
                  onClick={() => setHasCrmAccess(!hasCrmAccess)}
                  className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    hasCrmAccess ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    hasCrmAccess ? '-translate-x-[22px]' : '-translate-x-[2px]'
                  }`} />
                </button>
              </label>
            </div>
          </div>
        </div>

        {/* Roles Card */}
        {availableRoles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-700">الصلاحيات</h2>
                <p className="text-[11px] text-slate-400">حدد الصلاحيات المناسبة للمستخدم</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableRoles.map(role => (
                  <label key={role.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedRoles.includes(role.id)
                        ? 'bg-tiba-primary-50 border-tiba-primary-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}>
                    <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggleRole(role.id)}
                      className="w-[1.125rem] h-[1.125rem] text-tiba-primary-600 border-slate-300 rounded focus:ring-tiba-primary-500 focus:ring-offset-0 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{role.displayName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{role.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Programs Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <AcademicCapIcon className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700">البرامج التدريبية</h2>
              <p className="text-[11px] text-slate-400">حدد البرامج المسموح بالوصول إليها</p>
            </div>
          </div>
            <div className="p-5 space-y-4">
              {/* Access Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  programAccessMode === 'all' ? 'bg-teal-50 border-teal-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="programAccess" checked={programAccessMode === 'all'}
                    onChange={() => { setProgramAccessMode('all'); setSelectedProgramIds([]); }}
                    className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><GlobeAltIcon className="w-4 h-4 text-teal-500" /> كل البرامج</div>
                    <div className="text-[10px] text-slate-400">الوصول لجميع البرامج التدريبية</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  programAccessMode === 'specific' ? 'bg-teal-50 border-teal-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="programAccess" checked={programAccessMode === 'specific'}
                    onChange={() => setProgramAccessMode('specific')}
                    className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><AcademicCapIcon className="w-4 h-4 text-orange-500" /> برامج محددة</div>
                    <div className="text-[10px] text-slate-400">تحديد البرامج المسموح بها فقط</div>
                  </div>
                </label>
              </div>

              {/* Programs List */}
              {programAccessMode === 'specific' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-slate-500">{selectedProgramIds.length > 0 ? `تم اختيار ${selectedProgramIds.length} برنامج` : 'لم يتم اختيار أي برنامج'}</span>
                    {selectedProgramIds.length > 0 && (
                      <button type="button" onClick={() => setSelectedProgramIds([])} className="text-[11px] text-red-500 hover:text-red-700">إلغاء الكل</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {allPrograms.map(program => (
                      <label key={program.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedProgramIds.includes(program.id) ? 'bg-teal-50 border-teal-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}>
                        <input type="checkbox" checked={selectedProgramIds.includes(program.id)} onChange={() => toggleProgram(program.id)}
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 focus:ring-offset-0 cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">{program.nameAr}</div>
                          <div className="text-[10px] text-slate-400 truncate">{program.nameEn}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedProgramIds.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" /> تحذير: المستخدم لن يتمكن من رؤية أي بيانات متدربين.</p>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Distributions Card */}
        {allDistributions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <RectangleStackIcon className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-700">التوزيعات (المجموعات)</h2>
                <p className="text-[11px] text-slate-400">حدد التوزيعات المسموح بالوصول إليها ضمن البرامج المحددة</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Distribution Access Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  distributionAccessMode === 'all' ? 'bg-violet-50 border-violet-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="distributionAccess" checked={distributionAccessMode === 'all'}
                    onChange={() => { setDistributionAccessMode('all'); setSelectedDistributionIds([]); setSelectedRoomIds([]); setDistributionRoomMode({}); }}
                    className="w-4 h-4 text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><GlobeAltIcon className="w-4 h-4 text-violet-500" /> كل التوزيعات</div>
                    <div className="text-[10px] text-slate-400">الوصول لجميع التوزيعات ضمن البرامج المسموحة</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  distributionAccessMode === 'specific' ? 'bg-violet-50 border-violet-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="distributionAccess" checked={distributionAccessMode === 'specific'}
                    onChange={() => setDistributionAccessMode('specific')}
                    className="w-4 h-4 text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><RectangleStackIcon className="w-4 h-4 text-orange-500" /> توزيعات محددة</div>
                    <div className="text-[10px] text-slate-400">تحديد التوزيعات المسموح بها فقط</div>
                  </div>
                </label>
              </div>

              {/* Distributions List */}
              {distributionAccessMode === 'specific' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-slate-500">{selectedDistributionIds.length > 0 ? `تم اختيار ${selectedDistributionIds.length} توزيعة` : 'لم يتم اختيار أي توزيعة'}</span>
                    {selectedDistributionIds.length > 0 && (
                      <button type="button" onClick={() => { setSelectedDistributionIds([]); setSelectedRoomIds([]); setDistributionRoomMode({}); }} className="text-[11px] text-red-500 hover:text-red-700">إلغاء الكل</button>
                    )}
                  </div>
                  {distributionsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                      <span className="text-xs text-slate-400 mr-2">جاري تحميل التوزيعات...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto p-1">
                      {/* Group distributions by program */}
                      {(programAccessMode === 'specific' ? selectedProgramIds : allPrograms.map(p => p.id)).map(pid => {
                        const programDists = allDistributions.filter(d => d.programId === pid);
                        if (programDists.length === 0) return null;
                        const programName = programDists[0]?.program?.nameAr || allPrograms.find(p => p.id === pid)?.nameAr || '';
                        return (
                          <div key={pid} className="space-y-2">
                            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 px-1">
                              <AcademicCapIcon className="w-3.5 h-3.5 text-teal-500" /> {programName}
                            </div>
                            <div className="space-y-2">
                              {programDists.map(dist => {
                                const typeLabel = dist.type === 'THEORY' ? 'نظري' : 'عملي';
                                const classroomLabel = dist.classroom ? ` — ${dist.classroom.name}` : ' — عام';
                                const totalTrainees = dist.rooms.reduce((sum, r) => sum + (r._count?.assignments || 0), 0);
                                const isSelected = selectedDistributionIds.includes(dist.id);
                                const roomMode = distributionRoomMode[dist.id] || 'all';
                                return (
                                  <div key={dist.id} className="space-y-0">
                                    <label
                                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        isSelected ? 'bg-violet-50 border-violet-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                                      } ${isSelected && dist.rooms.length > 0 ? 'rounded-b-none border-b-0' : ''}`}>
                                      <input type="checkbox" checked={isSelected} onChange={() => toggleDistribution(dist.id)}
                                        className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 focus:ring-offset-0 cursor-pointer" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800">{typeLabel}{classroomLabel}</div>
                                        <div className="text-[10px] text-slate-400">{dist.numberOfRooms} مجموعات · {totalTrainees} متدرب</div>
                                      </div>
                                    </label>
                                    {/* Room selection within distribution */}
                                    {isSelected && dist.rooms.length > 0 && (
                                      <div className="border-2 border-t-0 border-violet-300 rounded-b-xl bg-violet-50/50 p-3 space-y-2">
                                        <div className="flex items-center gap-3">
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name={`roomMode-${dist.id}`} checked={roomMode === 'all'}
                                              onChange={() => setRoomModeForDistribution(dist.id, 'all')}
                                              className="w-3.5 h-3.5 text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer" />
                                            <span className="text-[11px] font-medium text-slate-700">كل المجموعات</span>
                                          </label>
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="radio" name={`roomMode-${dist.id}`} checked={roomMode === 'specific'}
                                              onChange={() => setRoomModeForDistribution(dist.id, 'specific')}
                                              className="w-3.5 h-3.5 text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer" />
                                            <span className="text-[11px] font-medium text-slate-700">مجموعات محددة</span>
                                          </label>
                                        </div>
                                        {roomMode === 'specific' && (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {dist.rooms.map(room => (
                                              <label key={room.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-[11px] ${
                                                  selectedRoomIds.includes(room.id) ? 'bg-white border-violet-300 shadow-sm' : 'bg-white/60 border-slate-200 hover:border-slate-300'
                                                }`}>
                                                <input type="checkbox" checked={selectedRoomIds.includes(room.id)} onChange={() => toggleRoom(room.id)}
                                                  className="w-3.5 h-3.5 text-violet-600 border-slate-300 rounded focus:ring-violet-500 focus:ring-offset-0 cursor-pointer" />
                                                <span className="font-medium text-slate-700">{room.roomName}</span>
                                                <span className="text-slate-400 mr-auto">({room._count?.assignments || 0} متدرب)</span>
                                              </label>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!distributionsLoading && selectedDistributionIds.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" /> تحذير: المستخدم لن يتمكن من رؤية أي توزيعات.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <LockClosedIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700">كلمة المرور</h2>
              <p className="text-[11px] text-slate-400">اتركها فارغة للاحتفاظ بالحالية</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <LockClosedIcon className="w-4 h-4 text-purple-500" /> كلمة المرور الجديدة
              </Label>
              <Input id="password" type="password" {...register('password')} placeholder="كلمة المرور الجديدة"
                className={`h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-300 ${errors.password ? 'border-red-400' : ''}`} />
              {errors.password && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <LockClosedIcon className="w-4 h-4 text-purple-500" /> تأكيد كلمة المرور
              </Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="أعد إدخال كلمة المرور"
                className={`h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-300 ${errors.confirmPassword ? 'border-red-400' : ''}`} />
              {errors.confirmPassword && <p className="text-xs text-red-500 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5" />{errors.confirmPassword.message}</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/users" className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-all">
            إلغاء
          </Link>
          <button type="submit" disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-l from-tiba-primary-600 to-indigo-600 text-white rounded-xl hover:from-tiba-primary-700 hover:to-indigo-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98]">
            {isSubmitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري التحديث...</>
            ) : (
              <><CheckIcon className="w-4 h-4" /> حفظ التعديلات</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditUserPage() {
  return (
    <PageGuard>
      <EditUserPageContent />
    </PageGuard>
  );
}