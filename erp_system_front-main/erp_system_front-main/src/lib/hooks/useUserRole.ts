import { useAuth, Role } from '../auth-context';

export interface UserRoleHelpers {
  // البيانات الأساسية
  roles: Role[];
  primaryRole: Role | null;
  
  // دوال المساعدة
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAllRoles: (roleNames: string[]) => boolean;
  getPrimaryRoleName: () => string | null;
  getPrimaryRoleDisplayName: () => string | null;
  getRoleColor: (roleName?: string) => string | null;
  getRoleIcon: (roleName?: string) => string | null;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isManager: () => boolean;
  isInstructor: () => boolean;
  isAccountant: () => boolean;
  getHighestPriorityRole: () => Role | null;
}

export function useUserRole(): UserRoleHelpers {
  const { user } = useAuth();
  
  const roles = user?.roles || [];
  const primaryRole = user?.primaryRole || null;

  // التحقق من وجود دور معين
  const hasRole = (roleName: string): boolean => {
    return roles.some(role => role.name === roleName);
  };

  // التحقق من وجود أي من الأدوار المحددة
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some(roleName => hasRole(roleName));
  };

  // التحقق من وجود جميع الأدوار المحددة
  const hasAllRoles = (roleNames: string[]): boolean => {
    return roleNames.every(roleName => hasRole(roleName));
  };

  // الحصول على اسم الدور الرئيسي
  const getPrimaryRoleName = (): string | null => {
    return primaryRole?.name || null;
  };

  // الحصول على الاسم المعروض للدور الرئيسي
  const getPrimaryRoleDisplayName = (): string | null => {
    return primaryRole?.displayName || null;
  };

  // الحصول على لون الدور
  const getRoleColor = (roleName?: string): string | null => {
    if (roleName) {
      const role = roles.find(r => r.name === roleName);
      return role?.color || null;
    }
    return primaryRole?.color || null;
  };

  // الحصول على أيقونة الدور
  const getRoleIcon = (roleName?: string): string | null => {
    if (roleName) {
      const role = roles.find(r => r.name === roleName);
      return role?.icon || null;
    }
    return primaryRole?.icon || null;
  };

  // دوال للتحقق من أدوار معينة
  const isAdmin = (): boolean => hasAnyRole(['admin', 'super_admin']);
  const isSuperAdmin = (): boolean => hasRole('super_admin');
  const isManager = (): boolean => hasRole('manager');
  const isInstructor = (): boolean => hasRole('instructor');
  const isAccountant = (): boolean => hasRole('accountant');

  // الحصول على الدور ذو الأولوية الأعلى
  const getHighestPriorityRole = (): Role | null => {
    if (roles.length === 0) return null;
    return roles.reduce((highest, current) => 
      current.priority > highest.priority ? current : highest
    );
  };

  return {
    roles,
    primaryRole,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getPrimaryRoleName,
    getPrimaryRoleDisplayName,
    getRoleColor,
    getRoleIcon,
    isAdmin,
    isSuperAdmin,
    isManager,
    isInstructor,
    isAccountant,
    getHighestPriorityRole,
  };
}
