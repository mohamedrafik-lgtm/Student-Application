import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsToRoleDto } from './dto/role.dto';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { AssignRoleDto, AssignPermissionDto } from './dto/assignment.dto';

export interface UserPermissions {
  roles: string[];
  permissions: { [key: string]: boolean };
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // =============== إدارة الأدوار ===============

  async createRole(createRoleDto: CreateRoleDto) {
    return this.prisma.role.create({
      data: createRoleDto,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });
  }

  async findAllRoles(includeInactive = false) {
    return this.prisma.role.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('الدور غير موجود');
    }

    return role;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findRoleById(id);

    if (role.isSystem && updateRoleDto.isActive === false) {
      throw new ForbiddenException('لا يمكن إلغاء تفعيل أدوار النظام');
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });
  }

  async deleteRole(id: string) {
    const role = await this.findRoleById(id);

    if (role.isSystem) {
      throw new ForbiddenException('لا يمكن حذف أدوار النظام');
    }

    if (role._count.userRoles > 0) {
      throw new ForbiddenException('لا يمكن حذف دور مرتبط بمستخدمين. قم بإزالة المستخدمين أولاً');
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermissionsToRole(roleId: string, assignPermissionsDto: AssignPermissionsToRoleDto) {
    console.log('Service received:', JSON.stringify(assignPermissionsDto, null, 2));
    const { permissions } = assignPermissionsDto;

    if (!permissions || !Array.isArray(permissions)) {
      throw new Error('Permissions array is required');
    }

    // التحقق من وجود الدور
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('الدور غير موجود');
    }

    // حماية دور السوبر أدمن من التعديل
    if (role.name === 'super_admin') {
      throw new ForbiddenException('لا يمكن تعديل صلاحيات مدير النظام الرئيسي');
    }

    // حذف جميع الصلاحيات الحالية للدور
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // إضافة الصلاحيات الجديدة
    const rolePermissions = permissions.map((permission: any) => ({
      roleId,
      permissionId: permission.permissionId,
      granted: permission.granted,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
    });

    // إرجاع الدور مع الصلاحيات المحدثة
    return this.findRoleById(roleId);
  }

  // =============== إدارة الصلاحيات ===============

  async createPermission(createPermissionDto: CreatePermissionDto) {
    const permission = await this.prisma.permission.create({
      data: createPermissionDto,
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
    });

    // منح الصلاحية الجديدة تلقائياً لمدير النظام الرئيسي
    await this.grantPermissionToSuperAdmin(permission.id);

    return permission;
  }

  // دالة لمنح صلاحية لمدير النظام الرئيسي تلقائياً
  private async grantPermissionToSuperAdmin(permissionId: string) {
    try {
      const superAdminRole = await this.prisma.role.findUnique({
        where: { name: 'super_admin' },
      });

      if (superAdminRole) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permissionId,
            },
          },
          update: { granted: true },
          create: {
            roleId: superAdminRole.id,
            permissionId: permissionId,
            granted: true,
          },
        });
        console.log(`✅ تم منح الصلاحية الجديدة لمدير النظام الرئيسي`);
      }
    } catch (error) {
      console.error('خطأ في منح الصلاحية لمدير النظام الرئيسي:', error);
    }
  }

  async findAllPermissions(category?: string) {
    return this.prisma.permission.findMany({
      where: category ? { category } : {},
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  async findPermissionById(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('الصلاحية غير موجودة');
    }

    return permission;
  }

  async updatePermission(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.findPermissionById(id);

    if (permission.isSystem) {
      throw new ForbiddenException('لا يمكن تعديل صلاحيات النظام');
    }

    return this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
    });
  }

  async deletePermission(id: string) {
    const permission = await this.findPermissionById(id);

    if (permission.isSystem) {
      throw new ForbiddenException('لا يمكن حذف صلاحيات النظام');
    }

    return this.prisma.permission.delete({
      where: { id },
    });
  }

  // =============== تعيين الأدوار والصلاحيات ===============

  async assignRoleToUser(assignRoleDto: AssignRoleDto) {
    const { userId, roleId, assignedBy, expiresAt, conditions } = assignRoleDto;

    // التحقق من وجود المستخدم والدور
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (!role) {
      throw new NotFoundException('الدور غير موجود');
    }

    if (!role.isActive) {
      throw new ForbiddenException('لا يمكن تعيين دور غير مفعل');
    }

    return this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {
        assignedBy,
        expiresAt,
        conditions,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        roleId,
        assignedBy,
        expiresAt,
        conditions,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: true,
      },
    });
  }

  async revokeRoleFromUser(userId: string, roleId: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException('الدور غير معين للمستخدم');
    }

    if (userRole.role.isSystem) {
      throw new ForbiddenException('لا يمكن إزالة أدوار النظام');
    }

    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  async assignPermissionToUser(assignPermissionDto: AssignPermissionDto) {
    const { userId, permissionId, granted, assignedBy, expiresAt, reason } = assignPermissionDto;

    // التحقق من وجود المستخدم والصلاحية
    const [user, permission] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.permission.findUnique({ where: { id: permissionId } }),
    ]);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (!permission) {
      throw new NotFoundException('الصلاحية غير موجودة');
    }

    return this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      update: {
        granted,
        assignedBy,
        expiresAt,
        reason,
        updatedAt: new Date(),
      },
      create: {
        userId,
        permissionId,
        granted,
        assignedBy,
        expiresAt,
        reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        permission: true,
      },
    });
  }

  async revokePermissionFromUser(userId: string, permissionId: string) {
    const userPermission = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException('الصلاحية غير معينة للمستخدم');
    }

    return this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });
  }

  // =============== فحص الصلاحيات ===============

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
            role: {
              isActive: true,
            },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    granted: true,
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: new Date() } },
                    ],
                  },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // جمع الأدوار
    const roles = user.userRoles.map(ur => ur.role.name);

    // جمع الصلاحيات من الأدوار
    const rolePermissions = new Map<string, boolean>();
    user.userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rp => {
        const key = `${rp.permission.resource}.${rp.permission.action}`;
        rolePermissions.set(key, rp.granted);
      });
    });

    // جمع الصلاحيات المباشرة (تجاوز أدوار)
    const directPermissions = new Map<string, boolean>();
    user.userPermissions.forEach(up => {
      const key = `${up.permission.resource}.${up.permission.action}`;
      directPermissions.set(key, up.granted);
    });

    // دمج الصلاحيات (الصلاحيات المباشرة لها أولوية)
    const permissions: { [key: string]: boolean } = {};
    rolePermissions.forEach((granted, key) => {
      permissions[key] = granted;
    });
    directPermissions.forEach((granted, key) => {
      permissions[key] = granted;
    });

    return {
      roles,
      permissions,
      hasPermission: (resource: string, action: string) => {
        const key = `${resource}.${action}`;
        
        // إذا كان لديه الصلاحية المطلوبة مباشرة
        if (permissions[key] === true) {
          return true;
        }
        
        // منطق الصلاحيات الذكي: إذا كان لديه صلاحية أعلى، فلديه الصلاحيات الأقل
        if (action === 'view') {
          // إذا كان لديه أي من هذه الصلاحيات، فلديه صلاحية العرض
          const higherPermissions = ['create', 'edit', 'delete', 'manage'];
          return higherPermissions.some(higherAction => 
            permissions[`${resource}.${higherAction}`] === true
          );
        }
        
        // إذا كان لديه صلاحية manage، فلديه جميع الصلاحيات الأخرى
        if (permissions[`${resource}.manage`] === true) {
          return true;
        }
        
        return false;
      },
      hasRole: (roleName: string) => {
        return roles.includes(roleName);
      },
      hasAnyRole: (roleNames: string[]) => {
        return roleNames.some(roleName => roles.includes(roleName));
      },
    };
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.hasPermission(resource, action);
  }

  async checkRole(userId: string, roleName: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.hasRole(roleName);
  }

  // =============== الأدوار والصلاحيات للمستخدم ===============

  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async getUserDirectPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  // =============== إحصائيات ===============

  async getPermissionStats() {
    const [totalRoles, activeRoles, totalPermissions, totalUsers] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.permission.count(),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      totalRoles,
      activeRoles,
      totalPermissions,
      totalUsers,
    };
  }

  // =============== تسجيل الأنشطة ===============

  async logPermissionActivity(
    userId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue?: any,
    newValue?: any,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.permissionLog.create({
      data: {
        userId,
        actorId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        reason,
        ipAddress,
        userAgent,
      },
    });
  }

  async getPermissionLogs(filters?: {
    userId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, actorId, action, resourceType, limit = 50, offset = 0 } = filters || {};

    const where: any = {};
    if (userId) where.userId = userId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    return this.prisma.permissionLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }
}
