import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { RoleBadge, RolesList } from './RoleBadge';
import { 
  FaShieldAlt, 
  FaUserShield, 
  FaInfoCircle, 
  FaChevronDown, 
  FaChevronUp,
  FaCheck,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';

interface PermissionInfoProps {
  userId?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * مكون لعرض معلومات صلاحيات المستخدم الحالي
 */
export const PermissionInfo: React.FC<PermissionInfoProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { userPermissions, loading, roles, permissions } = usePermissions();
  const [isExpanded, setIsExpanded] = useState(showDetails);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <FaSpinner className="animate-spin h-5 w-5 text-blue-500" />
          <span className="text-gray-600">جاري تحميل الصلاحيات...</span>
        </div>
      </div>
    );
  }

  if (!userPermissions) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <FaTimes className="h-5 w-5 text-red-500" />
          <span className="text-red-700">لا يمكن تحميل معلومات الصلاحيات</span>
        </div>
      </div>
    );
  }

  const userRoles = userPermissions.roles.map(roleName => ({
    name: roleName,
  }));

  const permissionsList = Object.entries(userPermissions.permissions)
    .filter(([_, granted]) => granted)
    .map(([permission, _]) => permission);

  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaUserShield className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              معلومات الصلاحيات
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? (
              <FaChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <FaChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="p-4">
        <div className="space-y-3">
          {/* الأدوار */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FaShieldAlt className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">الأدوار:</span>
            </div>
            {userRoles.length > 0 ? (
              <RolesList roles={userRoles} size="sm" />
            ) : (
              <span className="text-sm text-gray-500">لا توجد أدوار معينة</span>
            )}
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{userRoles.length}</div>
              <div className="text-xs text-blue-600">الأدوار</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{permissionsList.length}</div>
              <div className="text-xs text-green-600">الصلاحيات</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Info */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-4">
            {/* تفاصيل الصلاحيات */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaInfoCircle className="h-4 w-4" />
                الصلاحيات المتاحة
              </h4>
              {permissionsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionsList.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center gap-2 text-xs bg-white p-2 rounded border"
                    >
                      <FaCheck className="h-3 w-3 text-green-500" />
                      <span className="text-gray-700">{permission}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">لا توجد صلاحيات محددة</p>
              )}
            </div>

            {/* الصلاحيات المحددة للموارد */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                فحص الصلاحيات السريع
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <PermissionCheck resource="dashboard.users" action="view" label="عرض المستخدمين" />
                <PermissionCheck resource="dashboard.trainees" action="view" label="عرض المتدربين" />
                <PermissionCheck resource="dashboard.programs" action="view" label="عرض البرامج" />
                <PermissionCheck resource="dashboard.attendance" action="view" label="عرض الحضور" />
                <PermissionCheck resource="dashboard.financial" action="view" label="عرض المالية" />
                <PermissionCheck resource="dashboard.settings" action="view" label="عرض الإعدادات" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * مكون فرعي لفحص صلاحية محددة
 */
const PermissionCheck: React.FC<{
  resource: string;
  action: string;
  label: string;
}> = ({ resource, action, label }) => {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(resource, action);

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border">
      {hasAccess ? (
        <FaCheck className="h-3 w-3 text-green-500" />
      ) : (
        <FaTimes className="h-3 w-3 text-red-500" />
      )}
      <span className={hasAccess ? 'text-green-700' : 'text-red-700'}>
        {label}
      </span>
    </div>
  );
};

/**
 * مكون مبسط لعرض حالة الصلاحيات
 */
interface PermissionStatusProps {
  className?: string;
}

export const PermissionStatus: React.FC<PermissionStatusProps> = ({
  className = '',
}) => {
  const { userPermissions, loading, roles } = usePermissions();

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <FaSpinner className="animate-spin h-4 w-4 text-blue-500" />
        <span className="text-sm text-gray-600">جاري التحميل...</span>
      </div>
    );
  }

  if (!userPermissions) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <FaTimes className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">خطأ في الصلاحيات</span>
      </div>
    );
  }

  const isAdmin = roles.isSuperAdmin() || roles.isAdmin();
  const permissionCount = Object.values(userPermissions.permissions).filter(Boolean).length;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <FaShieldAlt className={`h-4 w-4 ${isAdmin ? 'text-purple-500' : 'text-blue-500'}`} />
      <span className="text-sm text-gray-700">
        {userPermissions.roles.length} أدوار، {permissionCount} صلاحية
      </span>
      {isAdmin && (
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          مدير
        </span>
      )}
    </div>
  );
};
