import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  role?: string;
  roles?: string[];
  anyRoles?: string[];
  allRoles?: string[];
  requireAll?: boolean; // true = جميع الشروط مطلوبة، false = أي شرط
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

/**
 * مكون لإخفاء/إظهار المحتوى بناءً على الصلاحيات
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  role,
  roles,
  anyRoles,
  allRoles,
  requireAll = true,
  fallback = null,
  showLoader = false,
}) => {
  const { 
    hasPermission, 
    hasRole, 
    hasAnyRole, 
    hasAllRoles, 
    loading 
  } = usePermissions();

  if (loading && showLoader) {
    return (
      <div className="animate-pulse bg-gray-200 rounded h-4 w-20"></div>
    );
  }

  if (loading) {
    return null;
  }

  const checks: boolean[] = [];

  // فحص الصلاحية المحددة
  if (resource && action) {
    checks.push(hasPermission(resource, action));
  }

  // فحص الدور المحدد
  if (role) {
    checks.push(hasRole(role));
  }

  // فحص الأدوار المتعددة (كل واحد على حدة)
  if (roles && roles.length > 0) {
    roles.forEach(r => checks.push(hasRole(r)));
  }

  // فحص أي دور من القائمة
  if (anyRoles && anyRoles.length > 0) {
    checks.push(hasAnyRole(anyRoles));
  }

  // فحص جميع الأدوار المطلوبة
  if (allRoles && allRoles.length > 0) {
    checks.push(hasAllRoles(allRoles));
  }

  // إذا لم تكن هناك شروط، السماح بالعرض
  if (checks.length === 0) {
    return <>{children}</>;
  }

  // تطبيق المنطق
  const hasAccess = requireAll 
    ? checks.every(check => check === true)
    : checks.some(check => check === true);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// مكونات مخصصة للاستخدامات الشائعة
export const RequirePermission: React.FC<{
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, action, children, fallback }) => (
  <PermissionGate resource={resource} action={action} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RequireRole: React.FC<{
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ role, children, fallback }) => (
  <PermissionGate role={role} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RequireAnyRole: React.FC<{
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ roles, children, fallback }) => (
  <PermissionGate anyRoles={roles} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RequireAllRoles: React.FC<{
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ roles, children, fallback }) => (
  <PermissionGate allRoles={roles} fallback={fallback}>
    {children}
  </PermissionGate>
);

// مكونات للموارد المحددة
export const CanViewUsers: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.users" action="view" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanCreateUsers: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.users" action="create" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanEditUsers: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.users" action="edit" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanDeleteUsers: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.users" action="delete" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanViewTrainees: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.trainees" action="view" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanCreateTrainees: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.trainees" action="create" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanEditTrainees: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.trainees" action="edit" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanDeleteTrainees: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.trainees" action="delete" fallback={fallback}>
    {children}
  </RequirePermission>
);

export const CanManagePermissions: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequirePermission resource="dashboard.permissions" action="manage" fallback={fallback}>
    {children}
  </RequirePermission>
);

// مكونات للأدوار
export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireAnyRole roles={['super_admin', 'admin']} fallback={fallback}>
    {children}
  </RequireAnyRole>
);

export const ManagerOrAbove: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireAnyRole roles={['super_admin', 'admin', 'manager']} fallback={fallback}>
    {children}
  </RequireAnyRole>
);

export const StaffOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireAnyRole roles={['super_admin', 'admin', 'manager', 'instructor', 'accountant']} fallback={fallback}>
    {children}
  </RequireAnyRole>
);
