import { IsEmail, IsOptional, IsString, IsBoolean, MinLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTraineeAccountDto {
  @ApiPropertyOptional({ description: 'كلمة المرور الجديدة' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password?: string;

  @ApiPropertyOptional({ description: 'حالة تفعيل الحساب' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TraineeAccountQueryDto {
  @ApiPropertyOptional({ description: 'البحث بالاسم أو الرقم القومي' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'فلترة بحالة التفعيل' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  programId?: number;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'ترتيب حسب', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'نوع الترتيب', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class ResetTraineePasswordDto {
  @ApiProperty({ description: 'كلمة المرور الجديدة' })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  newPassword: string;
}

export class TraineePlatformStatsQueryDto {
  @ApiPropertyOptional({ description: 'تاريخ البداية' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ النهاية' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  programId?: number;
}
