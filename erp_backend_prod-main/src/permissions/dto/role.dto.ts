import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ description: 'اسم الدور (مفتاح فريد)', example: 'admin' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'الاسم المعروض للدور', example: 'مدير النظام' })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'وصف الدور' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'لون الدور (hex)', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'أيقونة الدور', example: 'FaUserShield' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'أولوية الدور', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'هل هو دور نظام', default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'حالة نشاط الدور', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'الاسم المعروض للدور' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'وصف الدور' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'لون الدور (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'أيقونة الدور' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'أولوية الدور' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'حالة نشاط الدور' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RolePermissionDto {
  @ApiProperty({ description: 'معرف الصلاحية' })
  @IsString()
  permissionId: string;

  @ApiProperty({ description: 'منح أم منع الصلاحية', default: true })
  @IsBoolean()
  granted: boolean;

  @ApiPropertyOptional({ description: 'شروط إضافية (JSON)' })
  @IsOptional()
  conditions?: any;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الصلاحية' })
  @IsOptional()
  expiresAt?: Date;
}

export class AssignPermissionsToRoleDto {
  @ApiProperty({ description: 'قائمة الصلاحيات', type: [RolePermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}
