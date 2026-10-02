'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionObject {
  resource: string;
  action: string;
}

interface PageGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
  showError?: boolean;
  requiredPermission?: string | string[] | PermissionObject; // صلاحية محددة مطلوبة
}

export default function PageGuard({ 
  children, 
  fallbackPath = '/dashboard', 
  showError = false,
  requiredPermission 
}: PageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessPage, hasFullPermission, hasPermission, loading, userPermissions } = usePermissions();

  // دالة مساعدة لفحص الصلاحية بأي صيغة
  const checkPermission = (perm: string | string[] | PermissionObject | undefined): boolean => {
    if (!perm) return canAccessPage(pathname);
    
    // إذا كان object بصيغة { resource, action }
    if (typeof perm === 'object' && !Array.isArray(perm) && 'resource' in perm && 'action' in perm) {
      return hasPermission(perm.resource, perm.action);
    }
    
    // إذا كان string أو مصفوفة strings
    return hasFullPermission(perm as string | string[]);
  };

  useEffect(() => {
    // انتظار تحميل الصلاحيات
    if (loading || !userPermissions) return;

    // فحص الصلاحية
    const hasAccess = checkPermission(requiredPermission);

    if (!hasAccess) {
      console.warn(`🚫 غير مسموح بالوصول للصفحة: ${pathname}`);
      
      if (showError) {
        console.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
      }
      
      // إعادة توجيه للصفحة البديلة
      router.replace(fallbackPath);
    }
  }, [pathname, canAccessPage, hasFullPermission, hasPermission, requiredPermission, loading, userPermissions, router, fallbackPath, showError]);

  // عرض محتوى التحميل أثناء فحص الصلاحيات
  if (loading || !userPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // فحص الصلاحية مرة أخرى قبل العرض (إذا تم تحميل الصلاحيات)
  const hasAccess = checkPermission(requiredPermission);

  if (!loading && userPermissions && !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            غير مسموح بالوصول
          </h1>
          <p className="text-gray-600 mb-4">
            ليس لديك صلاحية للوصول إلى هذه الصفحة: {pathname}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {requiredPermission 
              ? `تحتاج إلى صلاحية: ${typeof requiredPermission === 'object' && !Array.isArray(requiredPermission) ? `${requiredPermission.resource}.${requiredPermission.action}` : requiredPermission}`
              : 'تحتاج إلى صلاحية المحتوى التدريبي للوصول لهذه الصفحة'
            }
          </p>
          <button
            onClick={() => router.replace(fallbackPath)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// مكون خاص للصفحات المالية
export function FinancialPageGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { canAccessFinancialPages, loading, userPermissions } = usePermissions();

  useEffect(() => {
    if (loading || !userPermissions) return;

    if (!canAccessFinancialPages()) {
      console.warn('🚫 غير مسموح بالوصول للصفحات المالية');
      router.replace('/dashboard');
    }
  }, [canAccessFinancialPages, loading, userPermissions, router]);

  if (loading || !userPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات المالية...</p>
        </div>
      </div>
    );
  }

  if (!canAccessFinancialPages()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">💰🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            غير مسموح بالوصول للنظام المالي
          </h1>
          <p className="text-gray-600 mb-4">
            تحتاج إلى صلاحيات مالية أو دور محاسب للوصول لهذه الصفحة
          </p>
          <button
            onClick={() => router.replace('/dashboard')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
