import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AssignRoleDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'معرف الدور' })
  @IsString()
  roleId: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم الذي قام بالتعيين' })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الدور' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'شروط إضافية (JSON)' })
  @IsOptional()
  conditions?: any;
}

export class AssignPermissionDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'معرف الصلاحية' })
  @IsString()
  permissionId: string;

  @ApiPropertyOptional({ description: 'منح أم منع الصلاحية', default: true })
  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @ApiPropertyOptional({ description: 'معرف المستخدم الذي قام بالتعيين' })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الصلاحية' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'سبب منح الصلاحية المباشرة' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkAssignRolesDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'قائمة معرفات الأدوار', type: [String] })
  @IsString({ each: true })
  roleIds: string[];

  @ApiPropertyOptional({ description: 'معرف المستخدم الذي قام بالتعيين' })
  @IsOptional()
  @IsString()
  assignedBy?: string;
}

export class BulkAssignPermissionsDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'قائمة معرفات الصلاحيات', type: [String] })
  @IsString({ each: true })
  permissionIds: string[];

  @ApiPropertyOptional({ description: 'منح أم منع الصلاحيات', default: true })
  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @ApiPropertyOptional({ description: 'معرف المستخدم الذي قام بالتعيين' })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiPropertyOptional({ description: 'سبب منح الصلاحيات المباشرة' })
  @IsOptional()
  @IsString()
  reason?: string;
}
