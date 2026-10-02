import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_ROLE_KEY,
  REQUIRE_ANY_ROLE_KEY,
  REQUIRE_ALL_ROLES_KEY,
} from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('المستخدم غير مصرح له');
    }

    // الحصول على المتطلبات من الـ decorators
    const requiredPermission = this.reflector.getAllAndOverride<{
      resource: string;
      action: string;
    }>(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const requiredRole = this.reflector.getAllAndOverride<string>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredAnyRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ANY_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredAllRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ALL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const multiplePermissions = this.reflector.getAllAndOverride<any>(
      'multiplePermissions',
      [context.getHandler(), context.getClass()],
    );

    // إذا لم تكن هناك متطلبات، السماح بالوصول
    if (
      !requiredPermission &&
      !requiredRole &&
      !requiredAnyRoles &&
      !requiredAllRoles &&
      !multiplePermissions
    ) {
      return true;
    }

    try {
      // الحصول على صلاحيات المستخدم
      const userPermissions = await this.permissionsService.getUserPermissions(user.userId);

      // فحص الصلاحيات المتعددة
      if (multiplePermissions) {
        return await this.checkMultiplePermissions(userPermissions, multiplePermissions);
      }

      // فحص الصلاحية المحددة
      if (requiredPermission) {
        const hasPermission = userPermissions.hasPermission(
          requiredPermission.resource,
          requiredPermission.action,
        );
        if (!hasPermission) {
          throw new ForbiddenException(
            `ليس لديك صلاحية ${requiredPermission.action} على ${requiredPermission.resource}`,
          );
        }
      }

      // فحص الدور المحدد
      if (requiredRole) {
        const hasRole = userPermissions.hasRole(requiredRole);
        if (!hasRole) {
          throw new ForbiddenException(`يجب أن يكون لديك دور ${requiredRole}`);
        }
      }

      // فحص أي دور من القائمة
      if (requiredAnyRoles && requiredAnyRoles.length > 0) {
        const hasAnyRole = userPermissions.hasAnyRole(requiredAnyRoles);
        if (!hasAnyRole) {
          throw new ForbiddenException(
            `يجب أن يكون لديك أحد الأدوار التالية: ${requiredAnyRoles.join(', ')}`,
          );
        }
      }

      // فحص جميع الأدوار المطلوبة
      if (requiredAllRoles && requiredAllRoles.length > 0) {
        const hasAllRoles = requiredAllRoles.every(role => 
          userPermissions.hasRole(role)
        );
        if (!hasAllRoles) {
          throw new ForbiddenException(
            `يجب أن يكون لديك جميع الأدوار التالية: ${requiredAllRoles.join(', ')}`,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('خطأ في فحص الصلاحيات');
    }
  }

  private async checkMultiplePermissions(userPermissions: any, config: any): Promise<boolean> {
    const results: boolean[] = [];

    // فحص الصلاحيات
    if (config.permissions && config.permissions.length > 0) {
      for (const perm of config.permissions) {
        const hasPermission = userPermissions.hasPermission(perm.resource, perm.action);
        results.push(hasPermission);
      }
    }

    // فحص الأدوار
    if (config.roles && config.roles.length > 0) {
      for (const role of config.roles) {
        const hasRole = userPermissions.hasRole(role);
        results.push(hasRole);
      }
    }

    // فحص أي دور
    if (config.anyRoles && config.anyRoles.length > 0) {
      const hasAnyRole = userPermissions.hasAnyRole(config.anyRoles);
      results.push(hasAnyRole);
    }

    // فحص جميع الأدوار
    if (config.allRoles && config.allRoles.length > 0) {
      const hasAllRoles = config.allRoles.every((role: string) => 
        userPermissions.hasRole(role)
      );
      results.push(hasAllRoles);
    }

    // تطبيق المشغل (AND أو OR)
    const operator = config.operator || 'AND';
    
    if (operator === 'OR') {
      return results.some(result => result === true);
    } else {
      return results.every(result => result === true);
    }
  }
}

/**
 * Guard مبسط للفحص السريع للأدوار
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('المستخدم غير مصرح له');
    }

    try {
      const userPermissions = await this.permissionsService.getUserPermissions(user.userId);
      return userPermissions.hasAnyRole(requiredRoles);
    } catch (error) {
      throw new ForbiddenException('خطأ في فحص الأدوار');
    }
  }
}

/**
 * Decorator مساعد لـ RoleGuard
 */
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
