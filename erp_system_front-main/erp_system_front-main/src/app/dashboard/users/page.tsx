'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI } from '@/lib/api';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  NoSymbolIcon,
  CheckBadgeIcon,
  XMarkIcon,
  PhoneIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import PageGuard from '@/components/permissions/PageGuard';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface Role {
  id: string;
  name: string;
  displayName: string;
  color?: string;
  priority: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  accountType: 'STAFF' | 'INSTRUCTOR';
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles?: {
    role: Role;
  }[];
}

type FilterType = 'all' | 'active' | 'archived' | 'staff' | 'instructor';

function UsersPageContent() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [userToArchive, setUserToArchive] = useState<User | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // جلب قائمة المستخدمين
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ أثناء تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  // فلترة المستخدمين
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery));
    if (!matchesSearch) return false;
    if (filter === 'active') return !user.isArchived;
    if (filter === 'archived') return user.isArchived;
    if (filter === 'staff') return user.accountType === 'STAFF' && !user.isArchived;
    if (filter === 'instructor') return user.accountType === 'INSTRUCTOR' && !user.isArchived;
    return true;
  });

  // حذف مستخدم
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await fetchAPI(`/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      toast.success('تم حذف المستخدم بنجاح');
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ أثناء حذف المستخدم');
    } finally {
      setIsDeleting(false);
    }
  };

  // أرشفة / إلغاء أرشفة مستخدم
  const handleArchiveUser = async () => {
    if (!userToArchive) return;

    setIsArchiving(true);
    try {
      const newStatus = !userToArchive.isArchived;
      await fetchAPI(`/users/${userToArchive.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: newStatus }),
      });
      toast.success(newStatus ? 'تم أرشفة الحساب بنجاح' : 'تم إلغاء أرشفة الحساب بنجاح');
      setUsers(users.map(u => u.id === userToArchive.id ? { ...u, isArchived: newStatus } : u));
      setIsArchiveModalOpen(false);
      setUserToArchive(null);
    } catch (error) {
      console.error('Error archiving user:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الحساب');
    } finally {
      setIsArchiving(false);
    }
  };

  if (authLoading) {
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

  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.isArchived).length;
  const archivedUsers = users.filter(u => u.isArchived).length;
  const staffCount = users.filter(u => u.accountType === 'STAFF' && !u.isArchived).length;
  const instructorCount = users.filter(u => u.accountType === 'INSTRUCTOR' && !u.isArchived).length;

  const getRoleBadge = (u: User) => {
    const roles = u.userRoles?.map(ur => ur.role) || [];
    if (roles.length === 0) return null;
    return [...roles].sort((a, b) => b.priority - a.priority)[0];
  };

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">إدارة المستخدمين</h1>
              <p className="text-white/70 text-sm mt-0.5">إدارة حسابات المستخدمين والصلاحيات</p>
            </div>
          </div>
          <Link
            href="/dashboard/users/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white border-2 border-white/60 rounded-xl hover:bg-white/15 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-sm"
          >
            <PlusIcon className="w-4 h-4" />
            إضافة مستخدم
          </Link>
        </div>
        {/* Quick Stats */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/20">
          {[
            { label: 'إجمالي المستخدمين', value: totalUsers },
            { label: 'نشط', value: activeUsers },
            { label: 'موظف إداري', value: staffCount },
            { label: 'محاضر', value: instructorCount },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <UsersIcon className="w-4 h-4 text-white/80" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
                <p className="text-[11px] text-white/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ SEARCH + FILTERS ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pr-11 pl-4 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:border-tiba-primary-300 focus:ring-2 focus:ring-tiba-primary-100 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { value: 'all' as FilterType, label: 'الكل', count: totalUsers },
              { value: 'active' as FilterType, label: 'نشط', count: activeUsers },
              { value: 'staff' as FilterType, label: 'إداري', count: staffCount },
              { value: 'instructor' as FilterType, label: 'محاضر', count: instructorCount },
              ...(archivedUsers > 0 ? [{ value: 'archived' as FilterType, label: 'مؤرشف', count: archivedUsers }] : []),
            ]).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.value
                    ? 'bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-tiba-primary-50 text-tiba-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="عرض شبكي">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 transition-all ${viewMode === 'table' ? 'bg-tiba-primary-50 text-tiba-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="عرض جدول">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="3" rx="0.5"/><rect x="1" y="6" width="14" height="3" rx="0.5"/><rect x="1" y="11" width="14" height="3" rx="0.5"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-slate-200" />
                <div className="flex-1"><div className="h-4 bg-slate-200 rounded w-28 mb-2" /><div className="h-3 bg-slate-100 rounded w-36" /></div>
              </div>
              <div className="space-y-2"><div className="h-3 bg-slate-100 rounded w-full" /><div className="h-3 bg-slate-100 rounded w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">لا يوجد مستخدمين</h3>
          <p className="text-sm text-slate-400">{searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لم يتم إضافة أي مستخدم بعد'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ---- Grid View ---- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map(user => {
            const primaryRole = getRoleBadge(user);
            return (
              <div
                key={user.id}
                className={`group bg-white rounded-2xl border-2 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${
                  user.isArchived ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-tiba-primary-200'
                } ${selectedUser?.id === user.id ? 'ring-2 ring-tiba-primary-400 border-tiba-primary-300' : ''}`}
                onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
              >
                <div className={`h-1.5 ${
                  user.isArchived ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                  user.accountType === 'STAFF' ? 'bg-gradient-to-r from-tiba-primary-400 to-indigo-500' :
                  'bg-gradient-to-r from-emerald-400 to-teal-500'
                }`} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                      <StaffAvatar name={user.name} photoUrl={user.photoUrl} size="lg" />
                      {user.isArchived ? (
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-orange-400 border-2 border-white rounded-full flex items-center justify-center">
                          <NoSymbolIcon className="w-3 h-3 text-white" />
                        </span>
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-tiba-primary-600 transition-colors truncate">{user.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {user.accountType === 'STAFF' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-tiba-primary-50 text-tiba-primary-600 border border-tiba-primary-100">موظف إداري</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">محاضر</span>
                        )}
                        {user.isArchived && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">مؤرشف</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate" dir="ltr">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span dir="ltr">{user.phone}</span>
                      </div>
                    )}
                    {primaryRole && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: primaryRole.color || '#6b7280' }} />
                        <span className="text-slate-600 font-medium">{primaryRole.displayName}</span>
                        {(user.userRoles?.length || 0) > 1 && <span className="text-slate-400">+{(user.userRoles?.length || 0) - 1}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-3">
                    <CalendarIcon className="w-3 h-3" />
                    انضم {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: ar })}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Link href={`/dashboard/users/${user.id}/edit`} onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-tiba-primary-600 bg-tiba-primary-50 rounded-lg hover:bg-tiba-primary-100 border border-tiba-primary-100 transition-all">
                      <PencilSquareIcon className="w-3.5 h-3.5" /> تعديل
                    </Link>
                    <button onClick={(e) => { e.stopPropagation(); setUserToArchive(user); setIsArchiveModalOpen(true); }}
                      className={`p-2 rounded-lg border transition-all ${user.isArchived ? 'text-teal-600 bg-teal-50 border-teal-100 hover:bg-teal-100' : 'text-orange-500 bg-orange-50 border-orange-100 hover:bg-orange-100'}`}
                      title={user.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}>
                      {user.isArchived ? <ArchiveBoxXMarkIcon className="w-3.5 h-3.5" /> : <ArchiveBoxIcon className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setUserToDelete(user); setIsDeleteModalOpen(true); }}
                      className="p-2 rounded-lg text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all" title="حذف">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---- Table View ---- */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">المستخدم</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">نوع الحساب</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">الدور</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">تاريخ الإنشاء</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const primaryRole = getRoleBadge(user);
                  return (
                    <tr key={user.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${user.isArchived ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <StaffAvatar name={user.name} photoUrl={user.photoUrl} size="md" />
                            {user.isArchived ? (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-400 border-2 border-white rounded-full flex items-center justify-center"><NoSymbolIcon className="w-2.5 h-2.5 text-white" /></span>
                            ) : (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate" dir="ltr">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {user.accountType === 'STAFF' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-tiba-primary-50 text-tiba-primary-600 border border-tiba-primary-100">موظف إداري</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">محاضر</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {primaryRole ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                            style={{ backgroundColor: primaryRole.color ? `${primaryRole.color}15` : '#f3f4f6', color: primaryRole.color || '#374151', border: `1px solid ${primaryRole.color || '#d1d5db'}30` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryRole.color || '#6b7280' }} />
                            {primaryRole.displayName}
                          </span>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-slate-500">{format(new Date(user.createdAt), 'dd MMM yyyy', { locale: ar })}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/dashboard/users/${user.id}/edit`} className="p-1.5 rounded-lg text-tiba-primary-500 hover:bg-tiba-primary-50 transition-all" title="تعديل"><PencilSquareIcon className="w-4 h-4" /></Link>
                          <button onClick={() => { setUserToArchive(user); setIsArchiveModalOpen(true); }} className={`p-1.5 rounded-lg transition-all ${user.isArchived ? 'text-teal-500 hover:bg-teal-50' : 'text-orange-500 hover:bg-orange-50'}`} title={user.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}>
                            {user.isArchived ? <ArchiveBoxXMarkIcon className="w-4 h-4" /> : <ArchiveBoxIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setUserToDelete(user); setIsDeleteModalOpen(true); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all" title="حذف"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ USER DETAIL MODAL ============ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`relative px-6 pt-6 pb-10 text-center ${
              selectedUser.isArchived ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
              selectedUser.accountType === 'STAFF' ? 'bg-gradient-to-br from-tiba-primary-500 to-indigo-600' :
              'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              <button onClick={() => setSelectedUser(null)} className="absolute top-3 left-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"><XMarkIcon className="w-5 h-5 text-white" /></button>
              <div className="flex justify-center mb-3"><StaffAvatar name={selectedUser.name} photoUrl={selectedUser.photoUrl} size="xl" /></div>
              <h3 className="text-lg font-bold text-white">{selectedUser.name}</h3>
              <p className="text-xs text-white/70 mt-0.5">{selectedUser.email}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                  {selectedUser.accountType === 'STAFF' ? 'موظف إداري' : 'محاضر'}
                </span>
                {selectedUser.isArchived && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-400/30 text-white"><NoSymbolIcon className="w-3 h-3" /> مؤرشف</span>
                )}
              </div>
            </div>
            <div className="p-5 -mt-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                {selectedUser.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><PhoneIcon className="w-4 h-4 text-blue-500" /></div>
                    <div><p className="text-[10px] text-slate-400">الهاتف</p><p className="text-sm font-medium text-slate-700" dir="ltr">{selectedUser.phone}</p></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CalendarIcon className="w-4 h-4 text-emerald-500" /></div>
                  <div><p className="text-[10px] text-slate-400">تاريخ الانضمام</p><p className="text-sm font-medium text-slate-700">{format(new Date(selectedUser.createdAt), 'dd MMMM yyyy', { locale: ar })}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><CalendarIcon className="w-4 h-4 text-purple-500" /></div>
                  <div><p className="text-[10px] text-slate-400">آخر تحديث</p><p className="text-sm font-medium text-slate-700">{format(new Date(selectedUser.updatedAt), 'dd MMMM yyyy', { locale: ar })}</p></div>
                </div>
                {(selectedUser.userRoles?.length || 0) > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-2">الصلاحيات</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.userRoles?.map(ur => (
                        <span key={ur.role.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                          style={{ backgroundColor: ur.role.color ? `${ur.role.color}15` : '#f3f4f6', color: ur.role.color || '#374151', border: `1px solid ${ur.role.color || '#d1d5db'}30` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ur.role.color || '#6b7280' }} />
                          {ur.role.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Link href={`/dashboard/users/${selectedUser.id}/edit`} onClick={() => setSelectedUser(null)}
                  className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-l from-tiba-primary-600 to-indigo-600 rounded-xl hover:from-tiba-primary-700 hover:to-indigo-700 transition-all shadow-sm active:scale-[0.98]">
                  <PencilSquareIcon className="w-4 h-4" /> تعديل المستخدم
                </Link>
                <button onClick={() => { setUserToArchive(selectedUser); setIsArchiveModalOpen(true); setSelectedUser(null); }}
                  className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border transition-all active:scale-[0.98] ${
                    selectedUser.isArchived ? 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100' : 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100'
                  }`}>
                  {selectedUser.isArchived ? <><ArchiveBoxXMarkIcon className="w-4 h-4" /> إلغاء الأرشفة</> : <><ArchiveBoxIcon className="w-4 h-4" /> أرشفة</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE MODAL ============ */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><ExclamationTriangleIcon className="w-6 h-6 text-red-600" /></div>
                <div><h3 className="text-lg font-bold text-slate-900">تأكيد الحذف</h3><p className="text-xs text-slate-500">هذا الإجراء لا يمكن التراجع عنه</p></div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <StaffAvatar name={userToDelete.name} photoUrl={userToDelete.photoUrl} size="sm" />
                  <div><p className="text-sm font-bold text-slate-800">{userToDelete.name}</p><p className="text-xs text-slate-500">{userToDelete.email}</p></div>
                </div>
                <p className="text-xs text-red-600 mt-2">سيتم حذف جميع البيانات المرتبطة بهذا المستخدم نهائياً.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium">إلغاء</button>
                <button onClick={handleDeleteUser} disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-l from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all text-sm font-semibold shadow-sm disabled:opacity-50">
                  {isDeleting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جاري الحذف...</span> : 'حذف نهائياً'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ARCHIVE MODAL ============ */}
      {isArchiveModalOpen && userToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setIsArchiveModalOpen(false); setUserToArchive(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${userToArchive.isArchived ? 'bg-teal-100' : 'bg-orange-100'}`}>
                  {userToArchive.isArchived ? <ArchiveBoxXMarkIcon className="w-6 h-6 text-teal-600" /> : <ArchiveBoxIcon className="w-6 h-6 text-orange-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{userToArchive.isArchived ? 'إلغاء أرشفة الحساب' : 'أرشفة الحساب'}</h3>
                  <p className="text-xs text-slate-500">{userToArchive.isArchived ? 'سيتم إعادة تفعيل الحساب' : 'سيتم تعطيل وصول المستخدم'}</p>
                </div>
              </div>
              <div className={`rounded-xl p-4 mb-5 ${userToArchive.isArchived ? 'bg-teal-50 border border-teal-100' : 'bg-orange-50 border border-orange-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <StaffAvatar name={userToArchive.name} photoUrl={userToArchive.photoUrl} size="sm" />
                  <div><p className="text-sm font-bold text-slate-800">{userToArchive.name}</p><p className="text-xs text-slate-500">{userToArchive.email}</p></div>
                </div>
                {!userToArchive.isArchived && (
                  <div className="text-xs text-slate-600 space-y-1.5 mt-2 pt-2 border-t border-orange-100">
                    <p className="flex items-center gap-2"><NoSymbolIcon className="w-3.5 h-3.5 text-orange-500" /> لن يتمكن من تسجيل الدخول</p>
                    <p className="flex items-center gap-2"><NoSymbolIcon className="w-3.5 h-3.5 text-orange-500" /> لن يتمكن من استعادة كلمة المرور</p>
                    <p className="flex items-center gap-2"><CheckBadgeIcon className="w-3.5 h-3.5 text-teal-500" /> يمكنك إلغاء الأرشفة في أي وقت</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsArchiveModalOpen(false); setUserToArchive(null); }} disabled={isArchiving}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium">إلغاء</button>
                <button onClick={handleArchiveUser} disabled={isArchiving}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-all text-sm font-semibold shadow-sm disabled:opacity-50 ${
                    userToArchive.isArchived ? 'bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600' : 'bg-gradient-to-l from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600'
                  }`}>
                  {isArchiving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جاري التنفيذ...</span> : userToArchive.isArchived ? 'إلغاء الأرشفة' : 'أرشفة الحساب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <PageGuard>
      <UsersPageContent />
    </PageGuard>
  );
}
