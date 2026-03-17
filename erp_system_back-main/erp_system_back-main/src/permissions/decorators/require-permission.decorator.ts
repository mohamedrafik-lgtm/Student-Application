import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const REQUIRE_ROLE_KEY = 'requireRole';
export const REQUIRE_ANY_ROLE_KEY = 'requireAnyRole';
export const REQUIRE_ALL_ROLES_KEY = 'requireAllRoles';

/**
 * Decorator لطلب صلاحية محددة
 * @param resource المورد (مثل: 'dashboard.users')
 * @param action الفعل (مثل: 'view', 'create', 'edit', 'delete')
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { resource, action });

/**
 * Decorator لطلب دور محدد
 * @param roleName اسم الدور (مثل: 'admin', 'manager')
 */
export const RequireRole = (roleName: string) =>
  SetMetadata(REQUIRE_ROLE_KEY, roleName);

/**
 * Decorator لطلب أي دور من قائمة الأدوار
 * @param roleNames أسماء الأدوار
 */
export const RequireAnyRole = (...roleNames: string[]) =>
  SetMetadata(REQUIRE_ANY_ROLE_KEY, roleNames);

/**
 * Decorator لطلب جميع الأدوار من قائمة الأدوار
 * @param roleNames أسماء الأدوار
 */
export const RequireAllRoles = (...roleNames: string[]) =>
  SetMetadata(REQUIRE_ALL_ROLES_KEY, roleNames);

/**
 * Decorator مجمع للصلاحيات المتعددة
 */
export interface MultiplePermissions {
  permissions?: Array<{ resource: string; action: string }>;
  roles?: string[];
  anyRoles?: string[];
  allRoles?: string[];
  operator?: 'AND' | 'OR'; // كيفية دمج الشروط
}

export const RequireMultiple = (config: MultiplePermissions) =>
  SetMetadata('multiplePermissions', config);

/**
 * Decorators للأفعال الشائعة
 */
export const CanView = (resource: string) => RequirePermission(resource, 'view');
export const CanCreate = (resource: string) => RequirePermission(resource, 'create');
export const CanEdit = (resource: string) => RequirePermission(resource, 'edit');
export const CanDelete = (resource: string) => RequirePermission(resource, 'delete');
export const CanExport = (resource: string) => RequirePermission(resource, 'export');
export const CanManage = (resource: string) => RequirePermission(resource, 'manage');

/**
 * Decorators للموارد المحددة في النظام
 */
export const CanViewUsers = () => CanView('dashboard.users');
export const CanCreateUsers = () => CanCreate('dashboard.users');
export const CanEditUsers = () => CanEdit('dashboard.users');
export const CanDeleteUsers = () => CanDelete('dashboard.users');

export const CanViewTrainees = () => CanView('dashboard.trainees');
export const CanCreateTrainees = () => CanCreate('dashboard.trainees');
export const CanEditTrainees = () => CanEdit('dashboard.trainees');
export const CanDeleteTrainees = () => CanDelete('dashboard.trainees');

export const CanViewPrograms = () => CanView('dashboard.programs');
export const CanCreatePrograms = () => CanCreate('dashboard.programs');
export const CanEditPrograms = () => CanEdit('dashboard.programs');
export const CanDeletePrograms = () => CanDelete('dashboard.programs');

export const CanViewTrainingContents = () => CanView('dashboard.training-contents');
export const CanCreateTrainingContents = () => CanCreate('dashboard.training-contents');
export const CanEditTrainingContents = () => CanEdit('dashboard.training-contents');
export const CanDeleteTrainingContents = () => CanDelete('dashboard.training-contents');

export const CanViewQuestions = () => CanView('dashboard.questions');
export const CanCreateQuestions = () => CanCreate('dashboard.questions');
export const CanEditQuestions = () => CanEdit('dashboard.questions');
export const CanDeleteQuestions = () => CanDelete('dashboard.questions');

export const CanViewAttendance = () => CanView('dashboard.attendance');
export const CanCreateAttendance = () => CanCreate('dashboard.attendance');
export const CanEditAttendance = () => CanEdit('dashboard.attendance');

export const CanViewFinancial = () => CanView('dashboard.financial');
export const CanManageFinancial = () => CanManage('dashboard.financial');

export const CanViewReports = () => CanView('dashboard.reports');
export const CanExportReports = () => CanExport('dashboard.reports');

export const CanViewSettings = () => CanView('dashboard.settings');
export const CanEditSettings = () => CanEdit('dashboard.settings');

export const CanViewAuditLogs = () => CanView('dashboard.audit-logs');

// Decorators للأدوار المحددة
export const RequireAdmin = () => RequireRole('admin');
export const RequireManager = () => RequireRole('manager');
export const RequireInstructor = () => RequireRole('instructor');
export const RequireAccountant = () => RequireRole('accountant');

export const RequireAdminOrManager = () => RequireAnyRole('admin', 'manager');
export const RequireStaffRole = () => RequireAnyRole('admin', 'manager', 'instructor', 'accountant');
