import React from 'react';
import { 
  FaUserShield, 
  FaUserCog, 
  FaUserTie, 
  FaChalkboardTeacher, 
  FaCalculator, 
  FaUser, 
  FaEye 
} from 'react-icons/fa';

interface RoleBadgeProps {
  roleName: string;
  displayName?: string;
  color?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const roleIcons: { [key: string]: React.ComponentType<any> } = {
  FaUserShield,
  FaUserCog,
  FaUserTie,
  FaChalkboardTeacher,
  FaCalculator,
  FaUser,
  FaEye,
};

const defaultRoleConfig: { [key: string]: { color: string; icon: string; displayName: string } } = {
  super_admin: { color: '#DC2626', icon: 'FaUserShield', displayName: 'مدير النظام الرئيسي' },
  admin: { color: '#7C3AED', icon: 'FaUserCog', displayName: 'مدير النظام' },
  manager: { color: '#059669', icon: 'FaUserTie', displayName: 'مدير' },
  instructor: { color: '#0891B2', icon: 'FaChalkboardTeacher', displayName: 'مدرس' },
  accountant: { color: '#EA580C', icon: 'FaCalculator', displayName: 'محاسب' },
  employee: { color: '#6B7280', icon: 'FaUser', displayName: 'موظف' },
  viewer: { color: '#9CA3AF', icon: 'FaEye', displayName: 'مشاهد' },
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

/**
 * مكون لعرض شارة الدور مع اللون والأيقونة
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  roleName,
  displayName,
  color,
  icon,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const config = defaultRoleConfig[roleName] || {
    color: '#6B7280',
    icon: 'FaUser',
    displayName: roleName,
  };

  const finalColor = color || config.color;
  const finalIcon = icon || config.icon;
  const finalDisplayName = displayName || config.displayName;
  const IconComponent = roleIcons[finalIcon] || FaUser;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: `${finalColor}20`,
        color: finalColor,
        border: `1px solid ${finalColor}40`,
      }}
    >
      {showIcon && (
        <IconComponent className={iconSizes[size]} />
      )}
      {finalDisplayName}
    </span>
  );
};

/**
 * مكون لعرض عدة أدوار
 */
interface RolesListProps {
  roles: Array<{
    name: string;
    displayName?: string;
    color?: string;
    icon?: string;
  }>;
  size?: 'sm' | 'md' | 'lg';
  showIcons?: boolean;
  maxVisible?: number;
  className?: string;
}

export const RolesList: React.FC<RolesListProps> = ({
  roles,
  size = 'md',
  showIcons = true,
  maxVisible = 3,
  className = '',
}) => {
  const visibleRoles = roles.slice(0, maxVisible);
  const hiddenCount = roles.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visibleRoles.map((role, index) => (
        <RoleBadge
          key={`${role.name}-${index}`}
          roleName={role.name}
          displayName={role.displayName}
          color={role.color}
          icon={role.icon}
          size={size}
          showIcon={showIcons}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className={`
            inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium
            ${sizeClasses[size]}
          `}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

/**
 * مكون لعرض الدور مع إمكانية الإزالة
 */
interface RemovableRoleBadgeProps extends RoleBadgeProps {
  onRemove?: () => void;
  removing?: boolean;
}

export const RemovableRoleBadge: React.FC<RemovableRoleBadgeProps> = ({
  onRemove,
  removing = false,
  className = '',
  ...props
}) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <RoleBadge {...props} />
      {onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className={`
            ml-1 h-4 w-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center text-xs
          `}
          title="إزالة الدور"
        >
          {removing ? (
            <div className="animate-spin h-2 w-2 border border-red-600 border-t-transparent rounded-full" />
          ) : (
            '×'
          )}
        </button>
      )}
    </span>
  );
};
