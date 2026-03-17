import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { permissionsAPI, Role, Permission, UserPermissions as APIUserPermissions } from '../app/lib/api/permissions';

// استخدام الواجهات من API
export type { Permission, Role } from '../app/lib/api/permissions';

export interface UserPermissions {
  roles: string[];
  permissions: { [key: string]: boolean };
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPermissions = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUserPermissions(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await permissionsAPI.users.getUserPermissions(user.id);
      
      
      // تحويل response إلى الشكل المطلوب مع الدوال
      const userPerms: UserPermissions = {
        roles: response.roles || [],
        permissions: response.permissions || {},
        hasPermission: (resource: string, action: string) => {
          const key = `${resource}.${action}`;
          
          // فحص الصلاحية المباشرة أولاً
          if (response.permissions?.[key] === true) {
            return true;
          }
          
          // Super Admin لديه كل الصلاحيات
          if (response.roles?.includes('super_admin')) {
            return true;
          }
          
          // Admin لديه معظم الصلاحيات
          if (response.roles?.includes('admin')) {
            return true;
          }
          
          // المنطق الذكي للصلاحيات الهرمية
          // إذا كان لديه صلاحية 'manage' فيمكنه فعل أي شيء
          if (response.permissions?.[`${resource}.manage`] === true) {
            return true;
          }
          
          // إذا كان لديه صلاحية 'edit' فيمكنه 'view' أيضاً
          if (action === 'view' && response.permissions?.[`${resource}.edit`] === true) {
            return true;
          }
          
          // إذا كان لديه صلاحية 'create' فيمكنه 'view' أيضاً
          if (action === 'view' && response.permissions?.[`${resource}.create`] === true) {
            return true;
          }
          
          // إذا كان لديه صلاحية 'delete' فيمكنه 'view' أيضاً
          if (action === 'view' && response.permissions?.[`${resource}.delete`] === true) {
            return true;
          }
          
          // إذا كان لديه صلاحية 'export' فيمكنه 'view' أيضاً
          if (action === 'view' && response.permissions?.[`${resource}.export`] === true) {
            return true;
          }
          
          // صلاحيات مترابطة خاصة
          // إذا كان لديه صلاحية على وثائق المتدربين، فيمكنه عرض المتدربين
          if (resource === 'dashboard.trainees' && action === 'view') {
            if (response.permissions?.['dashboard.trainee-documents.view'] === true ||
                response.permissions?.['dashboard.trainee-documents.edit'] === true ||
                response.permissions?.['dashboard.trainee-documents.delete'] === true) {
              return true;
            }
          }
          
          // إذا كان لديه صلاحية تعديل وثائق المتدربين، فيمكنه تعديل المتدربين (للرفع)
          if (resource === 'dashboard.trainees' && action === 'edit') {
            if (response.permissions?.['dashboard.trainee-documents.edit'] === true) {
              return true;
            }
          }
          
          return false;
        },
        hasRole: (roleName: string) => {
          return response.roles?.includes(roleName) || false;
        },
        hasAnyRole: (roleNames: string[]) => {
          return roleNames.some(roleName => response.roles?.includes(roleName));
        },
      };
      
      setUserPermissions(userPerms);
    } catch (err: any) {
      console.error('خطأ في جلب صلاحيات المستخدم:', err);
      setError(err.message || 'خطأ في جلب الصلاحيات');
      // في حالة الخطأ، إنشاء كائن فارغ لتجنب الأخطاء
      setUserPermissions({
        roles: [],
        permissions: {},
        hasPermission: () => false,
        hasRole: () => false,
        hasAnyRole: () => false,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  // دوال مساعدة للفحص السريع
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.hasPermission(resource, action);
  }, [userPermissions]);

  // دالة للتحقق من صلاحية كاملة بصيغة "resource.action"
  const hasFullPermission = useCallback((fullPermission: string | string[]): boolean => {
    if (!userPermissions) return false;
    
    // إذا كان مصفوفة، تحقق من أي صلاحية
    if (Array.isArray(fullPermission)) {
      return fullPermission.some(perm => {
        if (typeof perm !== 'string') return false;
        const lastDotIndex = perm.lastIndexOf('.');
        if (lastDotIndex === -1) return false;
        const resource = perm.substring(0, lastDotIndex);
        const action = perm.substring(lastDotIndex + 1);
        return userPermissions.hasPermission(resource, action);
      });
    }
    
    // التأكد من أن القيمة string
    if (typeof fullPermission !== 'string') return false;
    
    // تقسيم الصلاحية إلى resource و action
    const lastDotIndex = fullPermission.lastIndexOf('.');
    if (lastDotIndex === -1) return false;
    
    const resource = fullPermission.substring(0, lastDotIndex);
    const action = fullPermission.substring(lastDotIndex + 1);
    
    return userPermissions.hasPermission(resource, action);
  }, [userPermissions]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.hasRole(roleName);
  }, [userPermissions]);

  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    if (!userPermissions) return false;
    return userPermissions.hasAnyRole(roleNames);
  }, [userPermissions]);

  const hasAllRoles = useCallback((roleNames: string[]): boolean => {
    if (!userPermissions) return false;
    return roleNames.every(roleName => userPermissions.hasRole(roleName));
  }, [userPermissions]);

  // دوال للأفعال الشائعة
  const canView = useCallback((resource: string) => hasPermission(resource, 'view'), [hasPermission]);
  const canCreate = useCallback((resource: string) => hasPermission(resource, 'create'), [hasPermission]);
  const canEdit = useCallback((resource: string) => hasPermission(resource, 'edit'), [hasPermission]);
  const canDelete = useCallback((resource: string) => hasPermission(resource, 'delete'), [hasPermission]);
  const canExport = useCallback((resource: string) => hasPermission(resource, 'export'), [hasPermission]);
  const canManage = useCallback((resource: string) => hasPermission(resource, 'manage'), [hasPermission]);

  // دالة للتحقق من إمكانية الوصول للصفحات المالية
  const canAccessFinancialPages = useCallback((): boolean => {
    if (!userPermissions) return false;
    
    // يمكن الوصول للصفحات المالية إذا كان لديه أي من هذه الصلاحيات:
    return (
      userPermissions.hasPermission('dashboard.financial', 'view') ||
      userPermissions.hasPermission('dashboard.financial', 'manage') ||
      // أو إذا كان محاسب
      userPermissions.hasRole('accountant') ||
      // أو إدارة عليا
      userPermissions.hasRole('admin') ||
      userPermissions.hasRole('manager')
    );
  }, [userPermissions]);

  // دالة للتحقق من إمكانية الوصول لصفحات معينة بناءً على المسار
  const canAccessPage = useCallback((path: string): boolean => {
    if (!userPermissions) return false;
    
    // الصفحات المالية
    if (path.startsWith('/dashboard/finances')) {
      return canAccessFinancialPages();
    }
    
    // صفحات المتدربين
    if (path.startsWith('/dashboard/trainees')) {
      // صفحة تحويل المتدربين تحتاج صلاحية خاصة
      if (path === '/dashboard/trainees/transfer') {
        return userPermissions.hasPermission('dashboard.trainees', 'transfer');
      }
      
      // صفحة استخراج البيانات تحتاج صلاحية خاصة
      if (path === '/dashboard/trainees/export') {
        return userPermissions.hasPermission('dashboard.trainees', 'export_data');
      }
      
      // باقي صفحات المتدربين تحتاج صلاحية العرض
      return userPermissions.hasPermission('dashboard.trainees', 'view');
    }
    
    // صفحات البرامج
    if (path.startsWith('/dashboard/programs')) {
      return userPermissions.hasPermission('dashboard.programs', 'view');
    }
    
    // صفحات المستخدمين
    if (path.startsWith('/dashboard/users')) {
      return userPermissions.hasPermission('dashboard.users', 'view');
    }
    
    // صفحات التقارير
    if (path.startsWith('/dashboard/reports')) {
      return userPermissions.hasPermission('dashboard.reports', 'view');
    }
    
    // صفحات الإعدادات
    if (path.startsWith('/dashboard/settings')) {
      return userPermissions.hasPermission('dashboard.settings', 'view');
    }
    
    // صفحات الحضور
    if (path.startsWith('/dashboard/attendance')) {
      return userPermissions.hasPermission('dashboard.attendance', 'view');
    }
    
    // صفحات المحتوى التدريبي
    if (path.startsWith('/dashboard/training-contents')) {
      return userPermissions.hasPermission('dashboard.training-contents', 'view');
    }
    
    // صفحات بنك الأسئلة
    if (path.startsWith('/dashboard/question-bank')) {
      return userPermissions.hasPermission('dashboard.questions', 'view');
    }
    
    // صفحات الوظائف
    if (path.startsWith('/dashboard/jobs')) {
      return userPermissions.hasPermission('dashboard.jobs', 'view');
    }
    
    // صفحات الأخبار
    if (path.startsWith('/dashboard/news')) {
      return userPermissions.hasPermission('dashboard.news', 'view');
    }
    
    // صفحات تسجيلات الفورم
    if (path.startsWith('/dashboard/registrations')) {
      return userPermissions.hasPermission('dashboard.registrations', 'view');
    }
    
    // صفحات الواتساب
    if (path.startsWith('/dashboard/whatsapp')) {
      return userPermissions.hasPermission('whatsapp', 'read') ||
             userPermissions.hasPermission('dashboard.whatsapp', 'view') ||
             userPermissions.hasRole('super_admin') ||
             userPermissions.hasRole('admin');
    }

    // صفحات التسويق
    if (path.startsWith('/dashboard/marketing')) {
      // فحص صفحات التسويق المختلفة
      if (path.startsWith('/dashboard/marketing/employees')) {
        return userPermissions.hasPermission('marketing.employees', 'view');
      }
      if (path.startsWith('/dashboard/marketing/targets')) {
        return userPermissions.hasPermission('marketing.targets', 'view');
      }
      if (path.startsWith('/dashboard/marketing/applications')) {
        return userPermissions.hasPermission('marketing.applications', 'view');
      }
      if (path.startsWith('/dashboard/marketing/stats')) {
        return userPermissions.hasPermission('marketing.stats', 'view');
      }
      // صفحة التسويق الرئيسية - إذا كان لديه أي صلاحية تسويق
      return userPermissions.hasPermission('marketing.employees', 'view') ||
             userPermissions.hasPermission('marketing.targets', 'view') ||
             userPermissions.hasPermission('marketing.applications', 'view') ||
             userPermissions.hasPermission('marketing.stats', 'view');
    }

    // صفحات منصة المتدربين
    if (path.startsWith('/dashboard/trainee-platform')) {
      if (path.startsWith('/dashboard/trainee-platform/accounts')) {
        return userPermissions.hasPermission('dashboard.trainee-platform.accounts', 'view');
      }
      if (path.startsWith('/dashboard/trainee-platform/stats')) {
        return userPermissions.hasPermission('dashboard.trainee-platform.stats', 'view');
      }
    }

    // صفحات الأدوات الدراسية
    if (path.startsWith('/dashboard/study-materials')) {
      if (path.includes('/deliveries')) {
        return userPermissions.hasPermission('study-materials.deliveries', 'view');
      }
      return userPermissions.hasPermission('study-materials', 'view');
    }

    // صفحات الصلاحيات
    if (path.startsWith('/dashboard/permissions')) {
      return userPermissions.hasPermission('dashboard.permissions', 'view');
    }
    
    // صفحات سجل الأنشطة
    if (path.startsWith('/dashboard/audit-logs')) {
      return userPermissions.hasPermission('dashboard.audit-logs', 'view');
    }
    
    // صفحة الملف الشخصي متاحة للجميع المسجلين
    if (path.startsWith('/dashboard/profile')) {
      return true;
    }
    
    // الصفحة الرئيسية للوحة التحكم متاحة للجميع المسجلين
    if (path === '/dashboard' || path === '/dashboard/') {
      return true;
    }
    
    // افتراضياً، منع الوصول للصفحات غير المحددة
    return false;
  }, [userPermissions, canAccessFinancialPages]);

  // دوال للموارد المحددة
  const permissions = {
    // المستخدمين
    users: {
      view: () => canView('dashboard.users'),
      create: () => canCreate('dashboard.users'),
      edit: () => canEdit('dashboard.users'),
      delete: () => canDelete('dashboard.users'),
    },
    // المتدربين
    trainees: {
      view: () => canView('dashboard.trainees'),
      create: () => canCreate('dashboard.trainees'),
      edit: () => canEdit('dashboard.trainees'),
      delete: () => canDelete('dashboard.trainees'),
      export: () => canExport('dashboard.trainees'),
    },
    // البرامج التدريبية
    programs: {
      view: () => canView('dashboard.programs'),
      create: () => canCreate('dashboard.programs'),
      edit: () => canEdit('dashboard.programs'),
      delete: () => canDelete('dashboard.programs'),
    },
    // المحتوى التدريبي
    trainingContents: {
      view: () => canView('dashboard.training-contents'),
      create: () => canCreate('dashboard.training-contents'),
      edit: () => canEdit('dashboard.training-contents'),
      delete: () => canDelete('dashboard.training-contents'),
    },
    // بنك الأسئلة
    questions: {
      view: () => canView('dashboard.questions'),
      create: () => canCreate('dashboard.questions'),
      edit: () => canEdit('dashboard.questions'),
      delete: () => canDelete('dashboard.questions'),
    },
    // الحضور والغياب
    attendance: {
      view: () => canView('dashboard.attendance'),
      create: () => canCreate('dashboard.attendance'),
      edit: () => canEdit('dashboard.attendance'),
    },
    // النظام المالي
    financial: {
      view: () => canView('dashboard.financial'),
      manage: () => canManage('dashboard.financial'),
      canAccess: canAccessFinancialPages,
    },
    // التقارير
    reports: {
      view: () => canView('dashboard.reports'),
      export: () => canExport('dashboard.reports'),
    },
    // الإعدادات
    settings: {
      view: () => canView('dashboard.settings'),
      edit: () => canEdit('dashboard.settings'),
    },
    // سجل الأنشطة
    auditLogs: {
      view: () => canView('dashboard.audit-logs'),
    },
    // الصلاحيات
    permissions: {
      view: () => canView('dashboard.permissions'),
      manage: () => canManage('dashboard.permissions'),
    },
    // التسويق
    marketing: {
      employees: {
        view: () => canView('marketing.employees'),
        create: () => canCreate('marketing.employees'),
        edit: () => canEdit('marketing.employees'),
        delete: () => canDelete('marketing.employees'),
      },
      targets: {
        view: () => canView('marketing.targets'),
        create: () => canCreate('marketing.targets'),
        edit: () => canEdit('marketing.targets'),
        delete: () => canDelete('marketing.targets'),
      },
      applications: {
        view: () => canView('marketing.applications'),
        create: () => canCreate('marketing.applications'),
        edit: () => canEdit('marketing.applications'),
        delete: () => canDelete('marketing.applications'),
      },
      stats: {
        view: () => canView('marketing.stats'),
      },
    },
    // منصة المتدربين
    traineePlatform: {
      view: () => canView('dashboard.trainee-platform'),
      accounts: {
        view: () => canView('dashboard.trainee-platform.accounts'),
        edit: () => hasPermission('dashboard.trainee-platform.accounts', 'edit'),
        activate: () => hasPermission('dashboard.trainee-platform.accounts', 'activate'),
        resetPassword: () => hasPermission('dashboard.trainee-platform.accounts', 'reset-password'),
      },
      stats: {
        view: () => canView('dashboard.trainee-platform.stats'),
      },
    },
  };

  // دوال للأدوار
  const roles = {
    isSuperAdmin: () => hasRole('super_admin'),
    isAdmin: () => hasRole('admin'),
    isManager: () => hasRole('manager'),
    isInstructor: () => hasRole('instructor'),
    isAccountant: () => hasRole('accountant'),
    isMarketingManager: () => hasRole('marketing_manager'),
    isEmployee: () => hasRole('employee'),
    isViewer: () => hasRole('viewer'),
    isStaff: () => hasAnyRole(['admin', 'manager', 'instructor', 'accountant', 'marketing_manager']),
    isAdminOrManager: () => hasAnyRole(['admin', 'manager']),
    isMarketingStaff: () => hasAnyRole(['admin', 'manager', 'marketing_manager']),
  };

  return {
    userPermissions,
    loading,
    error,
    refetch: fetchUserPermissions,
    
    // دوال الفحص الأساسية
    hasPermission,
    hasFullPermission, // دالة جديدة للصلاحيات الكاملة
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // دوال الأفعال
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canManage,
    
    // دوال فحص الوصول للصفحات
    canAccessPage,
    canAccessFinancialPages,
    
    // صلاحيات الموارد
    permissions,
    
    // فحص الأدوار
    roles,
  };
};

// Hook للحصول على جميع الأدوار المتاحة
export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permissionsAPI.roles.getAll();
      setRoles(response);
    } catch (err: any) {
      console.error('خطأ في جلب الأدوار:', err);
      setError(err.message || 'خطأ في جلب الأدوار');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { roles, loading, error, refetch: fetchRoles };
};

// Hook للحصول على جميع الصلاحيات المتاحة
export const useAvailablePermissions = (category?: string) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permissionsAPI.permissions.getAll(category);
      setPermissions(response);
    } catch (err: any) {
      console.error('خطأ في جلب الصلاحيات:', err);
      setError(err.message || 'خطأ في جلب الصلاحيات');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, refetch: fetchPermissions };
};

// Hook لإدارة صلاحيات مستخدم محدد
export const useUserPermissionManager = (userId?: string) => {
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [userDirectPermissions, setUserDirectPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const [rolesResponse, permissionsResponse] = await Promise.all([
        permissionsAPI.users.getUserRoles(userId),
        permissionsAPI.users.getUserDirectPermissions(userId),
      ]);
      setUserRoles(rolesResponse);
      setUserDirectPermissions(permissionsResponse);
    } catch (err: any) {
      console.error('خطأ في جلب بيانات المستخدم:', err);
      setError(err.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const assignRole = useCallback(async (roleId: string, expiresAt?: Date) => {
    if (!userId) return;

    try {
      await permissionsAPI.users.assignRole({
        userId,
        roleId,
        expiresAt: expiresAt?.toISOString(),
      });
      await fetchUserData();
    } catch (err: any) {
      throw new Error(err.message || 'خطأ في تعيين الدور');
    }
  }, [userId, fetchUserData]);

  const revokeRole = useCallback(async (roleId: string) => {
    if (!userId) return;

    try {
      await permissionsAPI.users.revokeRole(userId, roleId);
      await fetchUserData();
    } catch (err: any) {
      throw new Error(err.message || 'خطأ في إزالة الدور');
    }
  }, [userId, fetchUserData]);

  const assignPermission = useCallback(async (permissionId: string, granted: boolean = true, reason?: string, expiresAt?: Date) => {
    if (!userId) return;

    try {
      await permissionsAPI.users.assignPermission({
        userId,
        permissionId,
        granted,
        reason,
        expiresAt: expiresAt?.toISOString(),
      });
      await fetchUserData();
    } catch (err: any) {
      throw new Error(err.message || 'خطأ في تعيين الصلاحية');
    }
  }, [userId, fetchUserData]);

  const revokePermission = useCallback(async (permissionId: string) => {
    if (!userId) return;

    try {
      await permissionsAPI.users.revokePermission(userId, permissionId);
      await fetchUserData();
    } catch (err: any) {
      throw new Error(err.message || 'خطأ في إزالة الصلاحية');
    }
  }, [userId, fetchUserData]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    userRoles,
    userDirectPermissions,
    loading,
    error,
    refetch: fetchUserData,
    assignRole,
    revokeRole,
    assignPermission,
    revokePermission,
  };
};

// Hook للحصول على جميع المستخدمين
export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 جلب قائمة المستخدمين...');
      
      // استخدام apiClient بدلاً من fetch مباشرة
      const { fetchAPI } = await import('@/lib/api');
      const data = await fetchAPI('/users');
      
      console.log('👥 تم جلب المستخدمين بنجاح:', data?.length || 0, 'مستخدم');
      setUsers(data || []);
    } catch (error: any) {
      console.error('❌ خطأ في جلب المستخدمين:', error);
      setError(error.message || 'خطأ في جلب المستخدمين');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
};
