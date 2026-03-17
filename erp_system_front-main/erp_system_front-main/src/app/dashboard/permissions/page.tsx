'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
// import './permissions.module.css';
import {
  FaUserShield,
  FaKey,
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaShieldAlt,
  FaChartBar,
  FaHistory,
  FaCog,
  FaUser,
  FaSearch,
  FaUserCheck,
  FaUserTimes,
  FaExclamationTriangle,
  FaFilter,
  FaSort,
  FaUserTag,
  FaUserPlus,
  FaChalkboardTeacher,
  FaCalculator,
  FaBullhorn,
  FaUserCog,
  FaUserTie
} from 'react-icons/fa';
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
import { DataTable } from '../../components/ui/DataTable';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiba-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // فحص صلاحية الوصول
  if (!userPerms.permissions.manage()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md mx-auto text-center">
          <div className="p-6">
            <FaShieldAlt className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">غير مصرح بالوصول</h2>
            <p className="text-gray-600">ليس لديك صلاحية الوصول لإدارة الأدوار والصلاحيات.</p>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: FaChartBar },
    { key: 'roles', label: 'الأدوار', icon: FaUserShield },
    { key: 'permissions', label: 'الصلاحيات', icon: FaKey },
    { key: 'users', label: 'المستخدمين', icon: FaUsers },
    { key: 'logs', label: 'سجل الأنشطة', icon: FaHistory },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FaUserShield className="h-5 w-5 text-white" />
                </div>
                إدارة الأدوار والصلاحيات
              </h1>
              <p className="text-gray-600 mt-2">إدارة وتكوين الأدوار والصلاحيات في النظام</p>
            </div>

          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Mobile Tabs */}
          <div className="sm:hidden" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            margin: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div className="relative">
              <label style={{
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.875rem',
                margin: '0 0 0.75rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
              }}>
                📱 اختر القسم
              </label>
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as any)}
                  style={{
                    appearance: 'none',
                    background: '#ffffff',
                    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\'%3e%3cpath stroke=\'%23374151\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3e%3c/svg%3e")',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1em 1em',
                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    color: '#374151',
                    width: '100%',
                    textAlign: 'right'
                  }}
                >
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <option key={tab.key} value={tab.key}>
                        📋 {tab.label}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {(() => {
                    const currentTab = tabs.find(t => t.key === activeTab);
                    if (currentTab) {
                      const Icon = currentTab.icon;
                      return <Icon className="h-5 w-5 text-blue-500" />;
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Current Tab Indicator */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                marginTop: '0.75rem'
              }}>
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentTab = tabs.find(t => t.key === activeTab);
                    if (currentTab) {
                      const Icon = currentTab.icon;
                      return (
                        <>
                          <Icon style={{
                            color: '#ffffff',
                            fontSize: '1rem'
                          }} className="h-4 w-4" />
                          <span style={{
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>📍 {currentTab.label}</span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden sm:block border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`
                      flex-1 py-4 px-6 border-b-2 font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200
                      ${activeTab === tab.key
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
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
        </div>
      </div>

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'إجمالي المستخدمين',
      value: users?.length || 0,
      icon: FaUsers,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'إجمالي الصلاحيات',
      value: permissions?.length || 0,
      icon: FaKey,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'الأدوار النشطة',
      value: roles?.filter(r => r.isActive !== false).length || 0,
      icon: FaShieldAlt,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'الأدوار المحمية',
      value: roles?.filter(r => r.isSystem).length || 0,
      icon: FaUserShield,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  ];

  const categories = Array.from(new Set(permissions?.map(p => p.category).filter(Boolean) || []));
  const recentRoles = roles?.slice(0, 6) || [];

  const getRoleIcon = (iconName: string) => {
    const iconMap: any = {
      'FaUserShield': FaUserShield,
      'FaUserCog': FaUserCog,
      'FaUserTie': FaUserTie,
      'FaChalkboardTeacher': FaChalkboardTeacher,
      'FaCalculator': FaCalculator,
      'FaBullhorn': FaBullhorn,
      'FaUserTag': FaUserTag,
      'FaUserPlus': FaUserPlus,
      'FaUser': FaUser,
      'FaEye': FaEye,
    };
    return iconMap[iconName] || FaUser;
  };

  return (
    <div className="space-y-8">
      {/* إحصائيات */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">نظرة عامة على النظام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* معلومات الصلاحيات الحالية */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">صلاحياتك الحالية</h3>
        <PermissionInfo showDetails={true} />
      </div>

      {/* الأدوار وتصنيفات الصلاحيات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* الأدوار المتاحة */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">الأدوار المتاحة</h3>
            <span className="text-sm text-gray-500">{roles?.length || 0} دور</span>
          </div>
          <div className="space-y-4">
            {recentRoles.map((role) => {
              const IconComponent = getRoleIcon(role.icon || 'FaUser');

              return (
                <div key={role.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: role.color || '#6B7280' }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                    <p className="text-sm text-gray-600 line-clamp-1">{role.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">أولوية {role.priority}</span>
                    <div className="flex items-center gap-1 mt-1">
                      {role.isSystem && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">نظام</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        role.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.isActive !== false ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* تصنيفات الصلاحيات */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">تصنيفات الصلاحيات</h3>
            <span className="text-sm text-gray-500">{categories.length} تصنيف</span>
          </div>
          <div className="space-y-3">
            {categories.map((category) => {
              const categoryPermissions = permissions?.filter(p => p.category === category) || [];
              return (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaKey className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{category}</span>
                  </div>
                  <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                    {categoryPermissions.length} صلاحية
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* نصائح وإرشادات */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaShieldAlt className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">نصائح لإدارة الأدوار والصلاحيات</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>استخدم مبدأ الحد الأدنى من الصلاحيات - امنح المستخدمين الصلاحيات التي يحتاجونها فقط</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>راجع الأدوار والصلاحيات بانتظام وقم بإزالة الصلاحيات غير المستخدمة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>دور مدير النظام الرئيسي محمي ولا يمكن تعديل صلاحياته لأسباب أمنية</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>استخدم نظام الترابط التلقائي للصلاحيات لضمان منطقية التخصيص</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function RolesTab({ roles, loading, refetch, onCreateRole, onEditRole, onDeleteRole, onManagePermissions }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الأدوار...</p>
        </div>
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
    const iconMap: any = {
      'FaUserShield': FaUserShield,
      'FaUserCog': FaUserCog,
      'FaUserTie': FaUserTie,
      'FaChalkboardTeacher': FaChalkboardTeacher,
      'FaCalculator': FaCalculator,
      'FaBullhorn': FaBullhorn,
      'FaUserTag': FaUserTag,
      'FaUserPlus': FaUserPlus,
      'FaUser': FaUser,
      'FaEye': FaEye,
    };
    return iconMap[iconName] || FaUser;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">إدارة الأدوار</h2>
          <p className="text-gray-600 text-sm mt-1">إدارة وتكوين أدوار المستخدمين في النظام</p>
        </div>
        <button
          onClick={onCreateRole}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
        >
          <FaPlus className="h-4 w-4" />
          إضافة دور جديد
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="البحث في الأدوار..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400 h-4 w-4" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">جميع الأدوار</option>
            <option value="active">الأدوار النشطة</option>
            <option value="inactive">الأدوار غير النشطة</option>
          </select>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role: any) => {
          const IconComponent = getRoleIcon(role.icon);
          return (
            <div
              key={role.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
            >
              {/* Role Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: role.color || '#6B7280' }}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
                    <p className="text-sm text-gray-500">{role.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {role.isSystem && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      نظام
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    role.isActive !== false
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {role.isActive !== false ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>

              {/* Role Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {role.description || 'لا يوجد وصف متاح'}
              </p>

              {/* Role Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>الأولوية: {role.priority}</span>
                <span>{role._count?.rolePermissions || 0} صلاحية</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => onEditRole(role)}
                  className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  title="تعديل الدور"
                >
                  <FaEdit className="h-3 w-3" />
                  تعديل
                </button>

                {role.name !== 'super_admin' && (
                  <button
                    onClick={() => onManagePermissions(role)}
                    className="flex-1 bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    title="إدارة الصلاحيات"
                  >
                    <FaKey className="h-3 w-3" />
                    الصلاحيات
                  </button>
                )}

                {role.name === 'super_admin' && (
                  <div
                    className="flex-1 bg-gray-50 text-gray-400 px-3 py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    title="دور محمي - لا يمكن تعديل الصلاحيات"
                  >
                    <FaKey className="h-3 w-3" />
                    محمي
                  </div>
                )}

                {!role.isSystem && (
                  <button
                    onClick={() => onDeleteRole(role)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                    title="حذف الدور"
                  >
                    <FaTrash className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <FaUserShield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أدوار</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all'
              ? 'لا توجد أدوار تطابق معايير البحث'
              : 'لم يتم إنشاء أي أدوار بعد'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={onCreateRole}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              إنشاء أول دور
            </button>
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الصلاحيات...</p>
        </div>
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
          <h2 className="text-xl font-semibold text-gray-900">إدارة الصلاحيات</h2>
          <p className="text-gray-600 text-sm mt-1">إدارة وتكوين صلاحيات النظام</p>
        </div>
        <button
          onClick={onCreatePermission}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
        >
          <FaPlus className="h-4 w-4" />
          إضافة صلاحية جديدة
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="البحث في الصلاحيات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400 h-4 w-4" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryPermissions = filteredPermissions.filter((p: any) => p.category === category);
          if (categoryPermissions.length === 0) return null;

          return (
            <div key={category} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                <p className="text-sm text-gray-600">{categoryPermissions.length} صلاحية</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryPermissions.map((permission: any) => (
                    <div
                      key={permission.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {permission.displayName || permission.resource}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {permission.resource}.{permission.action}
                          </p>
                        </div>
                        <button
                          onClick={() => onEditPermission(permission)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="تعديل الصلاحية"
                        >
                          <FaEdit className="h-3 w-3" />
                        </button>
                      </div>
                      {permission.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPermissions.length === 0 && (
        <div className="text-center py-12">
          <FaKey className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صلاحيات</h3>
          <p className="text-gray-600 mb-4">
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
      <div className="mb-4 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">الصلاحيات:</p>
          {totalPermissions > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 font-medium"
            >
              <FaEye className="h-3 w-3" />
              عرض الكل ({totalPermissions})
            </button>
          )}
        </div>
        
        {totalPermissions === 0 ? (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
            لا توجد صلاحيات معينة
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {rolePermissions.slice(0, 2).map((perm: any) => (
              <span
                key={perm.id}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
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
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                +{totalPermissions - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal لعرض جميع الصلاحيات */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FaKey className="h-5 w-5" />
                    صلاحيات المستخدم
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">{user.name}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <span>📋 من الأدوار: {rolePermissions.length}</span>
                <span>⭐ مباشرة: {directPermissions.length}</span>
                <span className="font-bold">🎯 الإجمالي: {totalPermissions}</span>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {/* Permissions from roles */}
                {rolePermissions.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold">📋</span>
                      </div>
                      من الأدوار ({rolePermissions.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rolePermissions.map((perm: any) => (
                        <div
                          key={perm.id}
                          className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <p className="font-medium text-blue-900 text-sm">{perm.displayName}</p>
                          <p className="text-xs text-blue-600 mt-1 font-mono">
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
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-bold">⭐</span>
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
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <p className={`font-medium text-sm ${
                            up.granted ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {up.granted ? '✓' : '✗'} {up.permission.displayName}
                          </p>
                          <p className={`text-xs mt-1 font-mono ${
                            up.granted ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {up.permission.resource}.{up.permission.action}
                          </p>
                          {up.reason && (
                            <p className="text-xs text-gray-600 mt-2 italic">
                              💬 {up.reason}
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
                    <FaKey className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد صلاحيات معينة لهذا المستخدم</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                إغلاق
              </button>
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المستخدمين...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل المستخدمين</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          إعادة المحاولة
        </button>
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

  const availableUserRoles = Array.from(new Set(users?.flatMap((user: any) => user.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean)) || [])) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">إدارة المستخدمين</h2>
          <p className="text-gray-600 text-sm mt-1">إدارة أدوار وصلاحيات المستخدمين</p>
        </div>
        <div className="text-sm text-gray-500">
          إجمالي المستخدمين: {users?.length || 0}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="البحث في المستخدمين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400 h-4 w-4" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">جميع الأدوار</option>
            {roles?.map((role: any) => (
              <option
                key={typeof role === 'string' ? role : (role.id || role.name)}
                value={typeof role === 'string' ? role : role.name}
              >
                {typeof role === 'string' ? role : (role.displayName || role.name)}
              </option>
            )) || availableUserRoles?.map((roleName: string) => (
              <option key={roleName} value={roleName}>
                {roleName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user: any) => (
          <div
            key={user.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
          >
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.name || 'بدون اسم'}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.isActive !== false
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.isActive !== false ? 'نشط' : 'غير نشط'}
              </span>
            </div>

            {/* User Info */}
            <div className="space-y-2 mb-4">
              {user.phone && (
                <p className="text-sm text-gray-600">📱 {user.phone}</p>
              )}
              <p className="text-sm text-gray-600">
                📅 انضم في {new Date(user.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>

            {/* User Roles */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">الأدوار:</p>
              <div className="flex flex-wrap gap-1">
                {user.userRoles?.length > 0 ? (
                  user.userRoles.map((userRole: any) => (
                    <span
                      key={userRole.roleId}
                      className="px-2 py-1 text-xs rounded-full font-medium"
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
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">لا توجد أدوار معينة</span>
                )}
              </div>
            </div>

            {/* User Permissions Summary - Click to see all */}
            <UserPermissionsDisplay user={user} />

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => onAssignRoles(user)}
                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                title="إدارة الأدوار"
              >
                <FaUserShield className="h-3 w-3" />
                الأدوار
              </button>

              <button
                onClick={() => onAssignPermissions(user)}
                className="flex-1 bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                title="إدارة الصلاحيات"
              >
                <FaKey className="h-3 w-3" />
                الصلاحيات
              </button>

              <button
                onClick={() => onAssignPrograms(user)}
                className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                title="إدارة الوصول للبرامج"
              >
                <FaChalkboardTeacher className="h-3 w-3" />
                البرامج
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <FaUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مستخدمين</h3>
          <p className="text-gray-600">
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
        return <FaPlus className="h-4 w-4 text-green-600" />;
      case 'update':
        return <FaEdit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <FaTrash className="h-4 w-4 text-red-600" />;
      case 'assign':
        return <FaUserCheck className="h-4 w-4 text-purple-600" />;
      default:
        return <FaHistory className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'assign':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">سجل الأنشطة</h2>
          <p className="text-gray-600 text-sm mt-1">تتبع جميع التغييرات في الأدوار والصلاحيات</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm">
            <FaFilter className="h-3 w-3" />
            تصفية
          </button>
          <button className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm">
            <FaHistory className="h-3 w-3" />
            تصدير
          </button>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline Line */}
              {index !== logs.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
              )}

              {/* Log Entry */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {getActionIcon(log.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{log.action}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.type)}`}>
                          {log.type === 'create' && 'إنشاء'}
                          {log.type === 'update' && 'تعديل'}
                          {log.type === 'delete' && 'حذف'}
                          {log.type === 'assign' && 'تخصيص'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{log.details}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FaUser className="h-3 w-3" />
                          {log.user}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaCog className="h-3 w-3" />
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
            <FaHistory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أنشطة</h3>
            <p className="text-gray-600">لم يتم تسجيل أي أنشطة بعد</p>
          </div>
        )}
      </div>

      {/* Load More */}
      {logs.length > 0 && (
        <div className="text-center">
          <button className="bg-gray-50 text-gray-600 hover:bg-gray-100 px-6 py-2 rounded-lg transition-colors">
            تحميل المزيد من الأنشطة
          </button>
        </div>
      )}
    </div>
  );
}
