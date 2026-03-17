import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  role?: string;
  roles?: string[];
  anyRoles?: string[];
  allRoles?: string[];
  requireAll?: boolean;
  hideWhenDisabled?: boolean; // إخفاء الزر بدلاً من تعطيله
  disabledTooltip?: string; // نص tooltip عند التعطيل
  className?: string;
}

/**
 * زر يتم تعطيله أو إخفاؤه بناءً على الصلاحيات
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  resource,
  action,
  role,
  roles,
  anyRoles,
  allRoles,
  requireAll = true,
  hideWhenDisabled = false,
  disabledTooltip,
  className = '',
  disabled,
  ...props
}) => {
  const { 
    hasPermission, 
    hasRole, 
    hasAnyRole, 
    hasAllRoles, 
    loading 
  } = usePermissions();

  // إذا كان في حالة تحميل
  if (loading) {
    return hideWhenDisabled ? null : (
      <button 
        {...props}
        disabled={true}
        className={`${className} opacity-50 cursor-not-allowed`}
      >
        <div className="animate-pulse">جاري التحميل...</div>
      </button>
    );
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

  // فحص الأدوار المتعددة
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

  // إذا لم تكن هناك شروط صلاحيات، السماح بالوصول
  let hasAccess = true;
  if (checks.length > 0) {
    hasAccess = requireAll 
      ? checks.every(check => check === true)
      : checks.some(check => check === true);
  }

  // إخفاء الزر إذا لم يكن لديه صلاحية
  if (!hasAccess && hideWhenDisabled) {
    return null;
  }

  // تعطيل الزر إذا لم يكن لديه صلاحية أو إذا كان معطلاً أصلاً
  const isDisabled = disabled || !hasAccess;

  return (
    <button 
      {...props}
      disabled={isDisabled}
      title={!hasAccess ? disabledTooltip : props.title}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// أزرار مخصصة للأفعال الشائعة
export const CreateButton: React.FC<{
  resource: string;
  children: React.ReactNode;
  hideWhenDisabled?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ resource, children, hideWhenDisabled, className, onClick }) => (
  <PermissionButton
    resource={resource}
    action="create"
    hideWhenDisabled={hideWhenDisabled}
    disabledTooltip="ليس لديك صلاحية الإضافة"
    className={className}
    onClick={onClick}
  >
    {children}
  </PermissionButton>
);

export const EditButton: React.FC<{
  resource: string;
  children: React.ReactNode;
  hideWhenDisabled?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ resource, children, hideWhenDisabled, className, onClick }) => (
  <PermissionButton
    resource={resource}
    action="edit"
    hideWhenDisabled={hideWhenDisabled}
    disabledTooltip="ليس لديك صلاحية التعديل"
    className={className}
    onClick={onClick}
  >
    {children}
  </PermissionButton>
);

export const DeleteButton: React.FC<{
  resource: string;
  children: React.ReactNode;
  hideWhenDisabled?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ resource, children, hideWhenDisabled, className, onClick }) => (
  <PermissionButton
    resource={resource}
    action="delete"
    hideWhenDisabled={hideWhenDisabled}
    disabledTooltip="ليس لديك صلاحية الحذف"
    className={className}
    onClick={onClick}
  >
    {children}
  </PermissionButton>
);

export const ExportButton: React.FC<{
  resource: string;
  children: React.ReactNode;
  hideWhenDisabled?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ resource, children, hideWhenDisabled, className, onClick }) => (
  <PermissionButton
    resource={resource}
    action="export"
    hideWhenDisabled={hideWhenDisabled}
    disabledTooltip="ليس لديك صلاحية التصدير"
    className={className}
    onClick={onClick}
  >
    {children}
  </PermissionButton>
);
