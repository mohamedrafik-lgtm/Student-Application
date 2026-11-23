import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'المورد', example: 'dashboard.users' })
  @IsString()
  @MaxLength(100)
  resource: string;

  @ApiProperty({ description: 'الفعل', example: 'view' })
  @IsString()
  @MaxLength(50)
  action: string;

  @ApiProperty({ description: 'الاسم المعروض', example: 'عرض المستخدمين' })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'وصف الصلاحية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'تصنيف الصلاحية', example: 'إدارة المستخدمين' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'شروط إضافية (JSON)' })
  @IsOptional()
  conditions?: any;

  @ApiPropertyOptional({ description: 'هل هي صلاحية نظام', default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'الاسم المعروض' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'وصف الصلاحية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'تصنيف الصلاحية' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'شروط إضافية (JSON)' })
  @IsOptional()
  conditions?: any;
}

export class BulkCreatePermissionsDto {
  @ApiProperty({ description: 'قائمة الصلاحيات', type: [CreatePermissionDto] })
  permissions: CreatePermissionDto[];
}
