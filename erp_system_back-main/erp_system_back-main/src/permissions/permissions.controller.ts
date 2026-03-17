import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsToRoleDto } from './dto/role.dto';
import { CreatePermissionDto, UpdatePermissionDto, BulkCreatePermissionsDto } from './dto/permission.dto';
import { AssignRoleDto, AssignPermissionDto, BulkAssignRolesDto, BulkAssignPermissionsDto } from './dto/assignment.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // =============== إدارة الأدوار ===============

  @Post('roles')
  @ApiOperation({ summary: 'إنشاء دور جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الدور بنجاح' })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.permissionsService.createRole(createRoleDto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'الحصول على جميع الأدوار' })
  @ApiResponse({ status: 200, description: 'قائمة الأدوار' })
  async findAllRoles(@Query('includeInactive') includeInactive?: string) {
    return this.permissionsService.findAllRoles(includeInactive === 'true');
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'الحصول على دور محدد' })
  @ApiResponse({ status: 200, description: 'تفاصيل الدور' })
  async findRoleById(@Param('id') id: string) {
    return this.permissionsService.findRoleById(id);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: 'تحديث دور' })
  @ApiResponse({ status: 200, description: 'تم تحديث الدور بنجاح' })
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.permissionsService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'حذف دور' })
  @ApiResponse({ status: 204, description: 'تم حذف الدور بنجاح' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string) {
    await this.permissionsService.deleteRole(id);
  }

  @Post('roles/:id/permissions')
  @ApiOperation({ summary: 'تعيين صلاحيات للدور' })
  @ApiResponse({ status: 200, description: 'تم تعيين الصلاحيات بنجاح' })
  async assignPermissionsToRole(
    @Param('id') roleId: string,
    @Body() body: { permissions: Array<{ permissionId: string; granted: boolean }> },
  ) {
    console.log('Received raw body:', JSON.stringify(body, null, 2));

    // التحقق من وجود permissions في البيانات
    if (!body.permissions || !Array.isArray(body.permissions)) {
      throw new BadRequestException('permissions field is required and must be an array');
    }

    // تحويل البيانات إلى الشكل المطلوب
    const assignPermissionsDto = {
      permissions: body.permissions.map((p: any) => ({
        permissionId: p.permissionId,
        granted: p.granted !== false, // default to true if not explicitly false
      })),
    };

    return this.permissionsService.assignPermissionsToRole(roleId, assignPermissionsDto);
  }

  // =============== إدارة الصلاحيات ===============

  @Post('permissions')
  @ApiOperation({ summary: 'إنشاء صلاحية جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الصلاحية بنجاح' })
  async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.createPermission(createPermissionDto);
  }

  @Post('permissions/bulk')
  @ApiOperation({ summary: 'إنشاء عدة صلاحيات' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الصلاحيات بنجاح' })
  async createBulkPermissions(@Body() bulkCreateDto: BulkCreatePermissionsDto) {
    const results = [];
    for (const permission of bulkCreateDto.permissions) {
      try {
        const result = await this.permissionsService.createPermission(permission);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, data: permission });
      }
    }
    return { results };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'الحصول على جميع الصلاحيات' })
  @ApiResponse({ status: 200, description: 'قائمة الصلاحيات' })
  async findAllPermissions(@Query('category') category?: string) {
    return this.permissionsService.findAllPermissions(category);
  }

  @Get('permissions/:id')
  @ApiOperation({ summary: 'الحصول على صلاحية محددة' })
  @ApiResponse({ status: 200, description: 'تفاصيل الصلاحية' })
  async findPermissionById(@Param('id') id: string) {
    return this.permissionsService.findPermissionById(id);
  }

  @Put('permissions/:id')
  @ApiOperation({ summary: 'تحديث صلاحية' })
  @ApiResponse({ status: 200, description: 'تم تحديث الصلاحية بنجاح' })
  async updatePermission(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionsService.updatePermission(id, updatePermissionDto);
  }

  @Delete('permissions/:id')
  @ApiOperation({ summary: 'حذف صلاحية' })
  @ApiResponse({ status: 204, description: 'تم حذف الصلاحية بنجاح' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id') id: string) {
    await this.permissionsService.deletePermission(id);
  }

  // =============== تعيين الأدوار ===============

  @Post('assign-role')
  @ApiOperation({ summary: 'تعيين دور لمستخدم' })
  @ApiResponse({ status: 201, description: 'تم تعيين الدور بنجاح' })
  async assignRole(@Body() assignRoleDto: AssignRoleDto, @Req() req: any) {
    assignRoleDto.assignedBy = req.user.userId;
    return this.permissionsService.assignRoleToUser(assignRoleDto);
  }

  @Post('assign-roles/bulk')
  @ApiOperation({ summary: 'تعيين عدة أدوار لمستخدم' })
  @ApiResponse({ status: 201, description: 'تم تعيين الأدوار بنجاح' })
  async assignRolesBulk(@Body() bulkAssignDto: BulkAssignRolesDto, @Req() req: any) {
    const results = [];
    for (const roleId of bulkAssignDto.roleIds) {
      try {
        const result = await this.permissionsService.assignRoleToUser({
          userId: bulkAssignDto.userId,
          roleId,
          assignedBy: req.user.userId,
        });
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, roleId });
      }
    }
    return { results };
  }

  @Delete('users/:userId/roles/:roleId')
  @ApiOperation({ summary: 'إزالة دور من مستخدم' })
  @ApiResponse({ status: 204, description: 'تم إزالة الدور بنجاح' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    await this.permissionsService.revokeRoleFromUser(userId, roleId);
  }

  // =============== تعيين الصلاحيات ===============

  @Post('assign-permission')
  @ApiOperation({ summary: 'تعيين صلاحية مباشرة لمستخدم' })
  @ApiResponse({ status: 201, description: 'تم تعيين الصلاحية بنجاح' })
  async assignPermission(@Body() assignPermissionDto: AssignPermissionDto, @Req() req: any) {
    assignPermissionDto.assignedBy = req.user.userId;
    return this.permissionsService.assignPermissionToUser(assignPermissionDto);
  }

  @Post('assign-permissions/bulk')
  @ApiOperation({ summary: 'تعيين عدة صلاحيات مباشرة لمستخدم' })
  @ApiResponse({ status: 201, description: 'تم تعيين الصلاحيات بنجاح' })
  async assignPermissionsBulk(@Body() bulkAssignDto: BulkAssignPermissionsDto, @Req() req: any) {
    const results = [];
    for (const permissionId of bulkAssignDto.permissionIds) {
      try {
        const result = await this.permissionsService.assignPermissionToUser({
          userId: bulkAssignDto.userId,
          permissionId,
          granted: bulkAssignDto.granted,
          assignedBy: req.user.userId,
          reason: bulkAssignDto.reason,
        });
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, permissionId });
      }
    }
    return { results };
  }

  @Delete('users/:userId/permissions/:permissionId')
  @ApiOperation({ summary: 'إزالة صلاحية مباشرة من مستخدم' })
  @ApiResponse({ status: 204, description: 'تم إزالة الصلاحية بنجاح' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePermission(@Param('userId') userId: string, @Param('permissionId') permissionId: string) {
    await this.permissionsService.revokePermissionFromUser(userId, permissionId);
  }

  // =============== استعلام الصلاحيات ===============

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: 'الحصول على صلاحيات مستخدم' })
  @ApiResponse({ status: 200, description: 'صلاحيات المستخدم' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: 'الحصول على أدوار مستخدم' })
  @ApiResponse({ status: 200, description: 'أدوار المستخدم' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.permissionsService.getUserRoles(userId);
  }

  @Get('users/:userId/direct-permissions')
  @ApiOperation({ summary: 'الحصول على الصلاحيات المباشرة لمستخدم' })
  @ApiResponse({ status: 200, description: 'الصلاحيات المباشرة للمستخدم' })
  async getUserDirectPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserDirectPermissions(userId);
  }

  @Get('check-permission/:userId/:resource/:action')
  @ApiOperation({ summary: 'فحص صلاحية محددة لمستخدم' })
  @ApiResponse({ status: 200, description: 'نتيجة فحص الصلاحية' })
  async checkPermission(
    @Param('userId') userId: string,
    @Param('resource') resource: string,
    @Param('action') action: string,
  ) {
    const hasPermission = await this.permissionsService.checkPermission(userId, resource, action);
    return { hasPermission };
  }

  @Get('check-role/:userId/:roleName')
  @ApiOperation({ summary: 'فحص دور محدد لمستخدم' })
  @ApiResponse({ status: 200, description: 'نتيجة فحص الدور' })
  async checkRole(@Param('userId') userId: string, @Param('roleName') roleName: string) {
    const hasRole = await this.permissionsService.checkRole(userId, roleName);
    return { hasRole };
  }

  // =============== الإحصائيات ===============

  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات الصلاحيات' })
  @ApiResponse({ status: 200, description: 'إحصائيات النظام' })
  async getPermissionStats() {
    return this.permissionsService.getPermissionStats();
  }

  // =============== سجل الأنشطة ===============

  @Get('logs')
  @ApiOperation({ summary: 'الحصول على سجل أنشطة الصلاحيات' })
  @ApiResponse({ status: 200, description: 'سجل الأنشطة' })
  async getPermissionLogs(
    @Query('userId') userId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.permissionsService.getPermissionLogs({
      userId,
      actorId,
      action,
      resourceType,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }
}
