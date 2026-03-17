import React, { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedNavigationProps {
  children: ReactNode;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requiredPermissions?: Array<{
    resource: string;
    action: string;
  }>;
  requiredRole?: string;
  requiredRoles?: string[];
  fallback?: ReactNode;
  // إذا كان true، يحتاج جميع الصلاحيات. إذا false، يحتاج واحدة فقط
  requireAll?: boolean;
}

export const ProtectedNavigation: React.FC<ProtectedNavigationProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requiredRoles,
  requireAll = false,
  fallback = null,
}) => {
  const { userPermissions, loading } = usePermissions();

  // أثناء التحميل، عرض fallback إذا وُجد
  if (loading || !userPermissions) {
    return fallback ? <>{fallback}</> : null;
  }

  // إذا لم تكن هناك صلاحيات محددة، إظهار العنصر
  if (!requiredPermission && !requiredPermissions && !requiredRole && !requiredRoles) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // فحص الصلاحية المطلوبة الواحدة
  if (requiredPermission) {
    hasAccess = userPermissions.hasPermission(
      requiredPermission.resource,
      requiredPermission.action
    );
  }

  // فحص الصلاحيات المتعددة
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (requireAll) {
      // يحتاج جميع الصلاحيات
      hasAccess = hasAccess && requiredPermissions.every(perm => 
        userPermissions.hasPermission(perm.resource, perm.action)
      );
    } else {
      // يحتاج واحدة على الأقل
      const hasAnyPermission = requiredPermissions.some(perm => 
        userPermissions.hasPermission(perm.resource, perm.action)
      );
      hasAccess = hasAccess && hasAnyPermission;
    }
  }

  // فحص الدور المطلوب
  if (requiredRole) {
    hasAccess = hasAccess && userPermissions.hasRole(requiredRole);
  }

  // فحص الأدوار المطلوبة (واحد منها على الأقل)
  if (requiredRoles) {
    hasAccess = hasAccess && userPermissions.hasAnyRole(requiredRoles);
  }

  // إظهار أو إخفاء العنصر حسب الصلاحية
  return hasAccess ? <>{children}</> : (fallback ? <>{fallback}</> : null);
};

export default ProtectedNavigation;
