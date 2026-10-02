'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  ShieldCheckIcon,
  KeyIcon,
  UsersIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  UserGroupIcon,
  UserPlusIcon,
  AcademicCapIcon,
  CalculatorIcon,
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  BriefcaseIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TagIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { usePermissions, useRoles, useAvailablePermissions, useUsers } from '../../../hooks/usePermissions';
import { RoleBadge, RolesList } from '../../../components/permissions/RoleBadge';
import { PermissionInfo } from '../../../components/permissions/PermissionInfo';
import { CanManagePermissions } from '../../../components/permissions/PermissionGate';
import { RoleModal } from '../../../components/permissions/RoleModal';
import { DeleteRoleModal } from '../../../components/permissions/DeleteRoleModal';
import { RolePermissionsModal } from '../../../components/permissions/RolePermissionsModal';
import { PermissionModal } from '../../../components/permissions/PermissionModal';
import { UserRoleAssignmentModal } from '../../../components/permissions/UserRoleAssignmentModal';
import { UserPermissionAssignmentModal } from '../../../components/permissions/UserPermissionAssignmentModal';
import { UserProgramAccessModal } from '../../../components/permissions/UserProgramAccessModal';
import { Button } from '../../components/ui/Button';
import PageHeader from '../../components/PageHeader';
import { Card, CardStat, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { FilterBar } from '../../components/ui/FilterBar';
import { TibaSelect, SimpleSelect } from '../../components/ui/Select';
import { Badge } from '../../../components/ui/badge';
import OnlineUsersWidget from '../components/OnlineUsersWidget';
import StaffAvatar from '../../../components/ui/StaffAvatar';

export default function PermissionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'permissions' | 'users' | 'logs'>('overview');
  
  // Modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [rolePermissionsModalOpen, setRolePermissionsModalOpen] = useState(false);
  
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalMode, setPermissionModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPermission, setSelectedPermission] = useState<any>(null);
  
  const [userRoleModalOpen, setUserRoleModalOpen] = useState(false);
  const [userPermissionModalOpen, setUserPermissionModalOpen] = useState(false);
  const [userProgramModalOpen, setUserProgramModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const { 
    userPermissions, 
    loading: permissionsLoading, 
    permissions: userPerms,
    roles: userRoles
  } = usePermissions();
  
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useRoles();
  const { permissions, loading: allPermissionsLoading, refetch: refetchPermissions } = useAvailablePermissions();
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();

  // Debug logging للمستخدمين
  useEffect(() => {
    console.log('👥 Users loading state:', usersLoading);
    console.log('👥 Users data:', users);
    console.log('❌ Users error:', usersError);
    console.log('👥 Users length:', users?.length || 0);
  }, [users, usersLoading, usersError]);

  // Modal handlers
  const handleCreateRole = () => {
    setSelectedRole(null);
    setRoleModalMode('create');
    setRoleModalOpen(true);
  };

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    setRoleModalMode('edit');
    setRoleModalOpen(true);
  };

  const handleDeleteRole = (role: any) => {
    setSelectedRole(role);
    setDeleteRoleModalOpen(true);
  };

  const handleManageRolePermissions = (role: any) => {
    setSelectedRole(role);
    setRolePermissionsModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetchRoles();
    refetchPermissions();
    refetchUsers();
  };

  const handleCreatePermission = () => {
    setSelectedPermission(null);
    setPermissionModalMode('create');
    setPermissionModalOpen(true);
  };

  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission);
    setPermissionModalMode('edit');
    setPermissionModalOpen(true);
  };

  const handleAssignUserRoles = (user: any) => {
    setSelectedUser(user);
    setUserRoleModalOpen(true);
  };

  const handleAssignUserPermissions = (user: any) => {
    setSelectedUser(user);
    setUserPermissionModalOpen(true);
  };

  const handleAssignUserPrograms = (user: any) => {
    setSelectedUser(user);
    setUserProgramModalOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiba-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // فحص صلاحية الوصول
  if (!userPerms.permissions.manage()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tiba-gray-50">
        <Card className="max-w-md mx-auto text-center" size="lg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-tiba-danger-100 flex items-center justify-center">
              <ShieldExclamationIcon className="h-8 w-8 text-tiba-danger-600" />
            </div>
            <h2 className="text-xl font-bold text-tiba-gray-800">غير مصرح بالوصول</h2>
            <p className="text-tiba-gray-600">ليس لديك صلاحية الوصول لإدارة الأدوار والصلاحيات.</p>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'roles', label: 'الأدوار', icon: ShieldCheckIcon },
    { key: 'permissions', label: 'الصلاحيات', icon: KeyIcon },
    { key: 'users', label: 'المستخدمين', icon: UsersIcon },
    { key: 'logs', label: 'سجل الأنشطة', icon: ClockIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="إدارة الأدوار والصلاحيات"
        description="إدارة وتكوين الأدوار والصلاحيات في النظام"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الأدوار والصلاحيات' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="default" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={handleCreateRole}>
              دور جديد
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <Card hover={false} className="overflow-hidden">
        {/* Mobile Tabs */}
        <div className="sm:hidden p-4">
          <SimpleSelect
            label="اختر القسم"
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
            options={tabs.map(tab => ({ value: tab.key, label: tab.label }))}
          />
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-tiba-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`
                    flex-1 py-3.5 px-6 border-b-2 font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200
                    ${activeTab === tab.key
                      ? 'border-tiba-primary-600 text-tiba-primary-700 bg-tiba-primary-50/50'
                      : 'border-transparent text-tiba-gray-500 hover:text-tiba-gray-700 hover:border-tiba-gray-300 hover:bg-tiba-gray-50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'roles' && (
            <RolesTab
              roles={roles}
              loading={rolesLoading}
              refetch={refetchRoles}
              onCreateRole={handleCreateRole}
              onEditRole={handleEditRole}
              onDeleteRole={handleDeleteRole}
              onManagePermissions={handleManageRolePermissions}
            />
          )}
          {activeTab === 'permissions' && (
            <PermissionsTab
              permissions={permissions}
              loading={allPermissionsLoading}
              refetch={refetchPermissions}
              onCreatePermission={handleCreatePermission}
              onEditPermission={handleEditPermission}
            />
          )}
          {activeTab === 'users' && (
            <UsersTab
              users={users}
              loading={usersLoading}
              error={usersError}
              refetch={refetchUsers}
              roles={roles}
              onAssignRoles={handleAssignUserRoles}
              onAssignPermissions={handleAssignUserPermissions}
              onAssignPrograms={handleAssignUserPrograms}
            />
          )}
          {activeTab === 'logs' && <LogsTab />}
        </div>
      </Card>

      {/* Modals */}
      <RoleModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onSuccess={handleModalSuccess}
        role={selectedRole}
        mode={roleModalMode}
      />

      <DeleteRoleModal
        isOpen={deleteRoleModalOpen}
        onClose={() => setDeleteRoleModalOpen(false)}
        onSuccess={handleModalSuccess}
        role={selectedRole}
      />

      <PermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onSuccess={handleModalSuccess}
        permission={selectedPermission}
        mode={permissionModalMode}
      />

      <UserRoleAssignmentModal
        isOpen={userRoleModalOpen}
        onClose={() => setUserRoleModalOpen(false)}
        onSuccess={handleModalSuccess}
        user={selectedUser}
      />

      <UserPermissionAssignmentModal
        isOpen={userPermissionModalOpen}
        onClose={() => setUserPermissionModalOpen(false)}
        onSuccess={handleModalSuccess}
        user={selectedUser}
      />

      <RolePermissionsModal
        isOpen={rolePermissionsModalOpen}
        onClose={() => setRolePermissionsModalOpen(false)}
        onSuccess={handleModalSuccess}
        role={selectedRole}
      />

      <UserProgramAccessModal
        isOpen={userProgramModalOpen}
        onClose={() => setUserProgramModalOpen(false)}
        onSuccess={handleModalSuccess}
        user={selectedUser}
      />
    </div>
  );
}

// Tab Components
function OverviewTab() {
  const { roles, loading: rolesLoading } = useRoles();
  const { permissions, loading: permissionsLoading } = useAvailablePermissions();
  const { users, loading: usersLoading } = useUsers();

  if (rolesLoading || permissionsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiba-primary-600 mx-auto"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(permissions?.map((p: any) => p.category).filter(Boolean) || []));
  const recentRoles = roles?.slice(0, 6) || [];

  const getRoleIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'FaUserShield': ShieldCheckIcon,
      'FaUserCog': WrenchScrewdriverIcon,
      'FaUserTie': BriefcaseIcon,
      'FaChalkboardTeacher': AcademicCapIcon,
      'FaCalculator': CalculatorIcon,
      'FaBullhorn': MegaphoneIcon,
      'FaUserTag': TagIcon,
      'FaUserPlus': UserPlusIcon,
      'FaUser': UserIcon,
      'FaEye': EyeIcon,
    };
    return iconMap[iconName] || UserIcon;
  };

  return (
    <div className="space-y-8">
      {/* إحصائيات */}
      <div>
        <h2 className="text-lg font-semibold text-tiba-gray-800 mb-4">نظرة عامة على النظام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card size="sm" variant="primary">
            <CardStat
              icon={<UsersIcon className="h-6 w-6" />}
              title="إجمالي المستخدمين"
              value={users?.length || 0}
              variant="primary"
            />
          </Card>
          <Card size="sm" variant="secondary">
            <CardStat
              icon={<KeyIcon className="h-6 w-6" />}
              title="إجمالي الصلاحيات"
              value={permissions?.length || 0}
              variant="secondary"
            />
          </Card>
          <Card size="sm">
            <CardStat
              icon={<ShieldCheckIcon className="h-6 w-6" />}
              title="الأدوار النشطة"
              value={roles?.filter((r: any) => r.isActive !== false).length || 0}
              variant="primary"
            />
          </Card>
          <Card size="sm" variant="danger">
            <CardStat
              icon={<LockClosedIcon className="h-6 w-6" />}
              title="الأدوار المحمية"
              value={roles?.filter((r: any) => r.isSystem).length || 0}
              variant="danger"
            />
          </Card>
        </div>
      </div>

      {/* المتصلون الآن */}
      <OnlineUsersWidget />

      {/* معلومات الصلاحيات الحالية */}
      <Card size="lg" hover={false}>
        <CardHeader>
          <CardTitle>صلاحياتك الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionInfo showDetails={true} />
        </CardContent>
      </Card>

      {/* الأدوار وتصنيفات الصلاحيات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الأدوار المتاحة */}
        <Card size="lg" hover={false}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>الأدوار المتاحة</CardTitle>
            <Badge variant="secondary">{roles?.length || 0} دور</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRoles.map((role: any) => {
                const IconComponent = getRoleIcon(role.icon || 'FaUser');
                return (
                  <div key={role.id} className="flex items-center gap-4 p-3 bg-tiba-gray-50 rounded-lg hover:bg-tiba-gray-100 transition-colors">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: role.color || '#6B7280' }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-tiba-gray-800 text-sm">{role.displayName}</h4>
                      <p className="text-xs text-tiba-gray-600 line-clamp-1">{role.description}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className="text-xs font-medium text-tiba-gray-600">أولوية {role.priority}</span>
                      <div className="flex items-center gap-1 mt-1">
                        {role.isSystem && (
                          <span className="px-2 py-0.5 bg-tiba-primary-100 text-tiba-primary-700 text-xs rounded-full font-medium">نظام</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          role.isActive !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-tiba-danger-100 text-tiba-danger-700'
                        }`}>
                          {role.isActive !== false ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* تصنيفات الصلاحيات */}
        <Card size="lg" hover={false}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>تصنيفات الصلاحيات</CardTitle>
            <Badge variant="secondary">{categories.length} تصنيف</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category: any) => {
                const categoryPermissions = permissions?.filter((p: any) => p.category === category) || [];
                return (
                  <div key={category} className="flex items-center justify-between p-3 bg-tiba-gray-50 rounded-lg hover:bg-tiba-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-tiba-primary-100 rounded-lg flex items-center justify-center">
                        <KeyIcon className="h-4 w-4 text-tiba-primary-700" />
                      </div>
                      <span className="font-medium text-tiba-gray-800 text-sm">{category}</span>
                    </div>
                    <span className="text-xs text-tiba-gray-600 bg-white px-2.5 py-1 rounded-full border border-tiba-gray-200">
                      {categoryPermissions.length} صلاحية
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نصائح وإرشادات */}
      <Card variant="primary" size="lg" hover={false}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-tiba-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-tiba-primary-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-tiba-gray-800 mb-2">نصائح لإدارة الأدوار والصلاحيات</h3>
            <ul className="space-y-2 text-sm text-tiba-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600 mt-0.5">•</span>
                <span>استخدم مبدأ الحد الأدنى من الصلاحيات - امنح المستخدمين الصلاحيات التي يحتاجونها فقط</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600 mt-0.5">•</span>
                <span>راجع الأدوار والصلاحيات بانتظام وقم بإزالة الصلاحيات غير المستخدمة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600 mt-0.5">•</span>
                <span>دور مدير النظام الرئيسي محمي ولا يمكن تعديل صلاحياته لأسباب أمنية</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600 mt-0.5">•</span>
                <span>استخدم نظام الترابط التلقائي للصلاحيات لضمان منطقية التخصيص</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RolesTab({ roles, loading, refetch, onCreateRole, onEditRole, onDeleteRole, onManagePermissions }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiba-primary-600 mx-auto"></div>
      </div>
    );
  }

  const filteredRoles = roles.filter((role: any) => {
    const matchesSearch = role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && role.isActive !== false) ||
                         (filterStatus === 'inactive' && role.isActive === false);
    return matchesSearch && matchesStatus;
  });

  const getRoleIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'FaUserShield': ShieldCheckIcon,
      'FaUserCog': WrenchScrewdriverIcon,
      'FaUserTie': BriefcaseIcon,
      'FaChalkboardTeacher': AcademicCapIcon,
      'FaCalculator': CalculatorIcon,
      'FaBullhorn': MegaphoneIcon,
      'FaUserTag': TagIcon,
      'FaUserPlus': UserPlusIcon,
      'FaUser': UserIcon,
      'FaEye': EyeIcon,
    };
    return iconMap[iconName] || UserIcon;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tiba-gray-800">إدارة الأدوار</h2>
          <p className="text-tiba-gray-600 text-sm mt-1">إدارة وتكوين أدوار المستخدمين في النظام</p>
        </div>
        <Button variant="success" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={onCreateRole}>
          إضافة دور جديد
        </Button>
      </div>

      {/* Search and Filter */}
      <FilterBar
        searchPlaceholder="البحث في الأدوار..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      >
        <SimpleSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: 'جميع الأدوار' },
            { value: 'active', label: 'الأدوار النشطة' },
            { value: 'inactive', label: 'الأدوار غير النشطة' },
          ]}
          className="min-w-[160px]"
        />
      </FilterBar>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role: any) => {
          const IconComponent = getRoleIcon(role.icon);
          return (
            <Card key={role.id} size="md">
              {/* Role Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: role.color || '#6B7280' }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-tiba-gray-800 text-sm">{role.displayName}</h3>
                    <p className="text-xs text-tiba-gray-500 font-mono">{role.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {role.isSystem && (
                    <span className="px-2 py-0.5 bg-tiba-primary-100 text-tiba-primary-700 text-xs rounded-full font-medium">نظام</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    role.isActive !== false
                      ? 'bg-green-100 text-green-700'
                      : 'bg-tiba-danger-100 text-tiba-danger-700'
                  }`}>
                    {role.isActive !== false ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>

              {/* Role Description */}
              <p className="text-tiba-gray-600 text-sm mb-4 line-clamp-2">
                {role.description || 'لا يوجد وصف متاح'}
              </p>

              {/* Role Stats */}
              <div className="flex items-center justify-between text-sm text-tiba-gray-500 mb-4">
                <span>الأولوية: {role.priority}</span>
                <span>{role._count?.rolePermissions || 0} صلاحية</span>
              </div>

              {/* Actions */}
              <CardFooter>
                <div className="flex items-center gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />} onClick={() => onEditRole(role)}>
                    تعديل
                  </Button>

                  {role.name !== 'super_admin' ? (
                    <Button variant="outline" size="sm" className="flex-1" leftIcon={<KeyIcon className="h-3.5 w-3.5" />} onClick={() => onManagePermissions(role)}>
                      الصلاحيات
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="flex-1 cursor-not-allowed opacity-50" disabled leftIcon={<LockClosedIcon className="h-3.5 w-3.5" />}>
                      محمي
                    </Button>
                  )}

                  {!role.isSystem && (
                    <Button variant="danger" size="icon" onClick={() => onDeleteRole(role)}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-tiba-gray-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-tiba-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد أدوار</h3>
          <p className="text-tiba-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all'
              ? 'لا توجد أدوار تطابق معايير البحث'
              : 'لم يتم إنشاء أي أدوار بعد'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Button variant="default" onClick={onCreateRole}>إنشاء أول دور</Button>
          )}
        </div>
      )}
    </div>
  );
}

function PermissionsTab({ permissions, loading, refetch, onCreatePermission, onEditPermission }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiba-primary-600 mx-auto"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(permissions.map((p: any) => p.category).filter(Boolean))) as string[];

  const filteredPermissions = permissions.filter((permission: any) => {
    const matchesSearch = permission.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.resource?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tiba-gray-800">إدارة الصلاحيات</h2>
          <p className="text-tiba-gray-600 text-sm mt-1">إدارة وتكوين صلاحيات النظام</p>
        </div>
        <Button variant="success" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={onCreatePermission}>
          إضافة صلاحية جديدة
        </Button>
      </div>

      {/* Search and Filter */}
      <FilterBar
        searchPlaceholder="البحث في الصلاحيات..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      >
        <SimpleSelect
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: 'all', label: 'جميع التصنيفات' },
            ...categories.map(cat => ({ value: cat, label: cat })),
          ]}
          className="min-w-[180px]"
        />
      </FilterBar>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryPermissions = filteredPermissions.filter((p: any) => p.category === category);
          if (categoryPermissions.length === 0) return null;

          return (
            <Card key={category} hover={false} className="overflow-hidden">
              <div className="bg-tiba-gray-50 px-5 py-3.5 border-b border-tiba-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-tiba-gray-800">{category}</h3>
                  <Badge variant="secondary">{categoryPermissions.length} صلاحية</Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryPermissions.map((permission: any) => (
                    <div
                      key={permission.id}
                      className="border border-tiba-gray-200 rounded-lg p-3.5 hover:shadow-sm transition-all hover:border-tiba-gray-300 bg-white"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-tiba-gray-800 text-sm truncate">
                            {permission.displayName || permission.resource}
                          </h4>
                          <p className="text-xs text-tiba-gray-500 mt-0.5 font-mono">
                            {permission.resource}.{permission.action}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onEditPermission(permission)}>
                          <PencilSquareIcon className="h-3.5 w-3.5 text-tiba-primary-600" />
                        </Button>
                      </div>
                      {permission.description && (
                        <p className="text-xs text-tiba-gray-600 line-clamp-2">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPermissions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-tiba-gray-100 flex items-center justify-center mx-auto mb-4">
            <KeyIcon className="h-8 w-8 text-tiba-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد صلاحيات</h3>
          <p className="text-tiba-gray-600 mb-4">
            {searchTerm || filterCategory !== 'all'
              ? 'لا توجد صلاحيات تطابق معايير البحث'
              : 'لم يتم إنشاء أي صلاحيات بعد'
            }
          </p>
        </div>
      )}
    </div>
  );
}

// مكون لعرض ملخص صلاحيات المستخدم مع زر لفتح Modal
function UserPermissionsDisplay({ user }: { user: any }) {
  const [showModal, setShowModal] = useState(false);

  // جمع الصلاحيات من الأدوار
  const rolePermissions = Array.from(new Set(
    user.userRoles
      ?.flatMap((ur: any) => ur.role?.rolePermissions || [])
      .filter((rp: any) => rp.granted)
      .map((rp: any) => JSON.stringify({
        id: rp.permission.id,
        displayName: rp.permission.displayName,
        resource: rp.permission.resource,
        action: rp.permission.action
      }))
  )).map((str: any) => JSON.parse(str));

  const directPermissions = user.userPermissions || [];
  const totalPermissions = rolePermissions.length + directPermissions.length;

  return (
    <>
      <div className="mb-4 border-t border-tiba-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-tiba-gray-700">الصلاحيات:</p>
          {totalPermissions > 0 && (
            <Button variant="default" size="sm" leftIcon={<EyeIcon className="h-3 w-3" />} onClick={() => setShowModal(true)}>
              عرض الكل ({totalPermissions})
            </Button>
          )}
        </div>
        
        {totalPermissions === 0 ? (
          <span className="text-xs text-tiba-gray-500 bg-tiba-gray-100 px-2 py-1 rounded inline-block">
            لا توجد صلاحيات معينة
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {rolePermissions.slice(0, 2).map((perm: any) => (
              <span
                key={perm.id}
                className="px-2 py-0.5 bg-tiba-primary-50 text-tiba-primary-700 text-xs rounded border border-tiba-primary-200"
              >
                {perm.displayName}
              </span>
            ))}
            {directPermissions.slice(0, 1).map((up: any) => (
              <span
                key={up.permissionId}
                className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200"
              >
                ⭐ {up.permission.displayName}
              </span>
            ))}
            {totalPermissions > 3 && (
              <span className="px-2 py-0.5 bg-tiba-gray-100 text-tiba-gray-700 text-xs rounded font-medium">
                +{totalPermissions - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal لعرض جميع الصلاحيات */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-tiba-gray-200">
            {/* Header */}
            <div className="bg-tiba-primary-600 text-white p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <KeyIcon className="h-5 w-5" />
                    صلاحيات المستخدم
                  </h3>
                  <p className="text-tiba-primary-100 text-sm mt-1">{user.name}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-tiba-primary-100">
                <span>من الأدوار: {rolePermissions.length}</span>
                <span>مباشرة: {directPermissions.length}</span>
                <span className="font-bold">الإجمالي: {totalPermissions}</span>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {/* Permissions from roles */}
                {rolePermissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-tiba-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-7 h-7 bg-tiba-primary-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="h-4 w-4 text-tiba-primary-700" />
                      </div>
                      من الأدوار ({rolePermissions.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rolePermissions.map((perm: any) => (
                        <div
                          key={perm.id}
                          className="p-3 bg-tiba-primary-50/50 border border-tiba-primary-200 rounded-lg hover:bg-tiba-primary-50 transition-colors"
                        >
                          <p className="font-medium text-tiba-primary-800 text-sm">{perm.displayName}</p>
                          <p className="text-xs text-tiba-primary-600 mt-1 font-mono">
                            {perm.resource}.{perm.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct permissions */}
                {directPermissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-tiba-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckBadgeIcon className="h-4 w-4 text-green-700" />
                      </div>
                      صلاحيات مباشرة ({directPermissions.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {directPermissions.map((up: any) => (
                        <div
                          key={up.permissionId}
                          className={`p-3 border rounded-lg ${
                            up.granted
                              ? 'bg-green-50 border-green-200'
                              : 'bg-tiba-danger-50 border-tiba-danger-200'
                          }`}
                        >
                          <p className={`font-medium text-sm ${
                            up.granted ? 'text-green-800' : 'text-tiba-danger-800'
                          }`}>
                            {up.granted ? '✓' : '✗'} {up.permission.displayName}
                          </p>
                          <p className={`text-xs mt-1 font-mono ${
                            up.granted ? 'text-green-600' : 'text-tiba-danger-600'
                          }`}>
                            {up.permission.resource}.{up.permission.action}
                          </p>
                          {up.reason && (
                            <p className="text-xs text-tiba-gray-600 mt-2 italic">
                              {up.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No permissions */}
                {totalPermissions === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-tiba-gray-100 flex items-center justify-center mx-auto mb-4">
                      <KeyIcon className="h-8 w-8 text-tiba-gray-400" />
                    </div>
                    <p className="text-tiba-gray-500">لا توجد صلاحيات معينة لهذا المستخدم</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-tiba-gray-200 p-4 bg-tiba-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>إغلاق</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTab({ users, loading, error, refetch, roles, onAssignRoles, onAssignPermissions, onAssignPrograms }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiba-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-tiba-danger-100 flex items-center justify-center mx-auto mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-tiba-danger-600" />
        </div>
        <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">خطأ في تحميل المستخدمين</h3>
        <p className="text-tiba-gray-600 mb-4">{error}</p>
        <Button variant="default" onClick={refetch} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.userRoles?.some((ur: any) => ur.role?.name === filterRole);
    return matchesSearch && matchesRole;
  }) || [];

  const roleOptions = [
    { value: 'all', label: 'جميع الأدوار' },
    ...(roles?.map((role: any) => ({
      value: typeof role === 'string' ? role : role.name,
      label: typeof role === 'string' ? role : (role.displayName || role.name),
    })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tiba-gray-800">إدارة المستخدمين</h2>
          <p className="text-tiba-gray-600 text-sm mt-1">إدارة أدوار وصلاحيات المستخدمين</p>
        </div>
        <Badge variant="secondary">إجمالي المستخدمين: {users?.length || 0}</Badge>
      </div>

      {/* Search and Filter */}
      <FilterBar
        searchPlaceholder="البحث في المستخدمين..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      >
        <SimpleSelect
          value={filterRole}
          onChange={setFilterRole}
          options={roleOptions}
          className="min-w-[180px]"
        />
      </FilterBar>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user: any) => (
          <Card key={user.id} size="md">
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <StaffAvatar name={user.name || 'U'} photoUrl={user.photoUrl} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-tiba-gray-800 text-sm truncate">{user.name || 'بدون اسم'}</h3>
                  <p className="text-xs text-tiba-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {user.isArchived ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-tiba-gray-200 text-tiba-gray-600 flex items-center gap-1">
                    <ArchiveBoxIcon className="h-3 w-3" />
                    مؤرشف
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive !== false
                      ? 'bg-green-100 text-green-700'
                      : 'bg-tiba-danger-100 text-tiba-danger-700'
                  }`}>
                    {user.isActive !== false ? 'نشط' : 'غير نشط'}
                  </span>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-1.5 mb-4 text-sm text-tiba-gray-600">
              {user.phone && (
                <p className="flex items-center gap-2">
                  <span className="text-tiba-gray-400">📱</span> {user.phone}
                </p>
              )}
              <p className="flex items-center gap-2">
                <span className="text-tiba-gray-400">📅</span> انضم في {new Date(user.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>

            {/* User Roles */}
            <div className="mb-3">
              <p className="text-xs font-medium text-tiba-gray-700 mb-1.5">الأدوار:</p>
              <div className="flex flex-wrap gap-1">
                {user.userRoles?.length > 0 ? (
                  user.userRoles.map((userRole: any) => (
                    <span
                      key={userRole.roleId}
                      className="px-2 py-0.5 text-xs rounded-full font-medium"
                      style={{
                        backgroundColor: userRole.role?.color ? `${userRole.role.color}20` : '#DBEAFE',
                        color: userRole.role?.color || '#1E40AF',
                        border: `1px solid ${userRole.role?.color || '#3B82F6'}`
                      }}
                    >
                      {userRole.role?.displayName || userRole.role?.name || 'دور'}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-tiba-gray-500 bg-tiba-gray-100 px-2 py-0.5 rounded">لا توجد أدوار معينة</span>
                )}
              </div>
            </div>

            {/* User Permissions Summary */}
            <UserPermissionsDisplay user={user} />

            {/* Actions */}
            <CardFooter>
              <div className="flex items-center gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1" leftIcon={<ShieldCheckIcon className="h-3.5 w-3.5" />} onClick={() => onAssignRoles(user)}>
                  الأدوار
                </Button>
                <Button variant="outline" size="sm" className="flex-1" leftIcon={<KeyIcon className="h-3.5 w-3.5" />} onClick={() => onAssignPermissions(user)}>
                  الصلاحيات
                </Button>
                <Button variant="outline" size="sm" className="flex-1" leftIcon={<AcademicCapIcon className="h-3.5 w-3.5" />} onClick={() => onAssignPrograms(user)}>
                  البرامج
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-tiba-gray-100 flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="h-8 w-8 text-tiba-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد مستخدمين</h3>
          <p className="text-tiba-gray-600">
            {searchTerm || filterRole !== 'all'
              ? 'لا توجد مستخدمين يطابقون معايير البحث'
              : 'لم يتم تسجيل أي مستخدمين بعد'
            }
          </p>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const [logs] = useState([
    {
      id: 1,
      action: 'إنشاء دور جديد',
      details: 'تم إنشاء دور "موظف إدخال متدربين"',
      user: 'مدير النظام',
      timestamp: new Date().toISOString(),
      type: 'create',
    },
    {
      id: 2,
      action: 'تعديل صلاحيات',
      details: 'تم تعديل صلاحيات دور "المحاسب"',
      user: 'مدير النظام الرئيسي',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'update',
    },
    {
      id: 3,
      action: 'تخصيص دور',
      details: 'تم تخصيص دور "موظف تسويق" للمستخدم أحمد محمد',
      user: 'مدير النظام',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'assign',
    },
  ]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <PlusIcon className="h-4 w-4 text-green-600" />;
      case 'update':
        return <PencilSquareIcon className="h-4 w-4 text-tiba-primary-600" />;
      case 'delete':
        return <TrashIcon className="h-4 w-4 text-tiba-danger-600" />;
      case 'assign':
        return <CheckBadgeIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-tiba-gray-600" />;
    }
  };

  const getActionBadgeClass = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'update':
        return 'bg-tiba-primary-100 text-tiba-primary-700';
      case 'delete':
        return 'bg-tiba-danger-100 text-tiba-danger-700';
      case 'assign':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-tiba-gray-100 text-tiba-gray-700';
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'create': return 'إنشاء';
      case 'update': return 'تعديل';
      case 'delete': return 'حذف';
      case 'assign': return 'تخصيص';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tiba-gray-800">سجل الأنشطة</h2>
          <p className="text-tiba-gray-600 text-sm mt-1">تتبع جميع التغييرات في الأدوار والصلاحيات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<FunnelIcon className="h-3.5 w-3.5" />}>
            تصفية
          </Button>
          <Button variant="outline" size="sm" leftIcon={<DocumentTextIcon className="h-3.5 w-3.5" />}>
            تصدير
          </Button>
        </div>
      </div>

      {/* Logs Timeline */}
      <Card size="lg" hover={false}>
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline Line */}
              {index !== logs.length - 1 && (
                <div className="absolute right-6 top-12 w-0.5 h-16 bg-tiba-gray-200"></div>
              )}

              {/* Log Entry */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-tiba-gray-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                  {getActionIcon(log.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-tiba-gray-800 text-sm">{log.action}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeClass(log.type)}`}>
                          {getActionLabel(log.type)}
                        </span>
                      </div>
                      <p className="text-tiba-gray-600 text-sm mb-2">{log.details}</p>
                      <div className="flex items-center gap-4 text-xs text-tiba-gray-500">
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {log.user}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {logs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-tiba-gray-100 flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="h-8 w-8 text-tiba-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-tiba-gray-800 mb-2">لا توجد أنشطة</h3>
            <p className="text-tiba-gray-600">لم يتم تسجيل أي أنشطة بعد</p>
          </div>
        )}
      </Card>

      {/* Load More */}
      {logs.length > 0 && (
        <div className="text-center">
          <Button variant="outline">تحميل المزيد من الأنشطة</Button>
        </div>
      )}
    </div>
  );
}
