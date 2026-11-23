'use client';

import React, { ReactNode, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { FaLock } from 'react-icons/fa';
import TibaLoader from '@/components/ui/TibaLoader';

interface ProtectedPageProps {
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
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const ProtectedPage: React.FC<ProtectedPageProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requiredRoles,
  requireAll = false,
  fallback,
  redirectTo = '/unauthorized',
}) => {
  const { isAuthenticated, authLoading } = useAuth();
  const { userPermissions, loading: permissionsLoading } = usePermissions();
  const router = useRouter();

  // التوجيه إلى صفحة تسجيل الدخول في useEffect لتجنب تحديث الحالة أثناء الـ render
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('ProtectedPage: User not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // أثناء التحميل
  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TibaLoader variant="inline" type="permissions" size="md" />
      </div>
    );
  }

  // إذا لم يكن مسجل دخول
  if (!isAuthenticated) {
    return null; // سيتم التوجيه عبر useEffect
  }

  // إذا لم تكن هناك صلاحيات محددة، السماح بالدخول
  if (!requiredPermission && !requiredPermissions && !requiredRole && !requiredRoles) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // فحص الصلاحية المطلوبة الواحدة
  if (requiredPermission && userPermissions) {
    hasAccess = userPermissions.hasPermission(
      requiredPermission.resource,
      requiredPermission.action
    );
  }

  // فحص الصلاحيات المتعددة
  if (requiredPermissions && requiredPermissions.length > 0 && userPermissions) {
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
  if (requiredRole && userPermissions) {
    hasAccess = hasAccess && userPermissions.hasRole(requiredRole);
  }

  // فحص الأدوار المطلوبة (واحد منها على الأقل)
  if (requiredRoles && userPermissions) {
    hasAccess = hasAccess && userPermissions.hasAnyRole(requiredRoles);
  }

  // إذا لم يكن لديه صلاحية
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (redirectTo && redirectTo !== '/unauthorized') {
      // التوجيه المتأخر لتجنب التعارض
      setTimeout(() => {
        console.log('ProtectedPage: No access, redirecting to:', redirectTo);
        router.replace(redirectTo);
      }, 100);
      return null;
    }

    // صفحة عدم التفويض الافتراضية
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح بالوصول</h1>
          <p className="text-gray-600 mb-6">
            ليس لديك الصلاحية اللازمة للوصول إلى هذه الصفحة.
          </p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            {requiredPermission && (
              <p>
                <strong>الصلاحية المطلوبة:</strong> {requiredPermission.resource}.{requiredPermission.action}
              </p>
            )}
            {requiredRole && (
              <p>
                <strong>الدور المطلوب:</strong> {requiredRole}
              </p>
            )}
            {requiredRoles && (
              <p>
                <strong>أحد الأدوار التالية:</strong> {requiredRoles.join(', ')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              العودة
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedPage;
