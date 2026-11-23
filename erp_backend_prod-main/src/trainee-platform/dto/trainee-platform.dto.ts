import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  IsDateString,
  IsInt,
  IsPositive,
  ArrayNotEmpty,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTraineeAccountDto {
  @ApiProperty({ description: 'معرف المتدرب (واحد أو عدة)', type: [Number] })
  @IsArray()
  @ArrayNotEmpty({ message: 'يجب اختيار متدرب واحد على الأقل' })
  @Type(() => Number)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  traineeIds: number[];

  @ApiPropertyOptional({
    description:
      'طريقة توليد كلمة المرور: nationalId = نفس الرقم القومي (افتراضي)، random = كلمة مرور عشوائية آمنة',
    enum: ['nationalId', 'random'],
    default: 'nationalId',
  })
  @IsOptional()
  @IsIn(['nationalId', 'random'], {
    message: 'طريقة كلمة المرور يجب أن تكون nationalId أو random',
  })
  passwordMode?: 'nationalId' | 'random';

  @ApiPropertyOptional({ description: 'رقم المتدرب لعرض مجموعته', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  groupSize?: number;

  @ApiPropertyOptional({
    description: 'تجاوز المتدربين الذين يملكون حساباً مسبقاً بدلاً من تخطيهم',
  })
  @IsOptional()
  @IsBoolean()
  includeExisting?: boolean;
}

export class BulkCreateAccountsDto {
  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  programId?: number;

  @ApiPropertyOptional({
    description: 'كل المتدربين أو فقط الذين لا يملكون حساباً',
    enum: ['all', 'missing-only', 'missing-in-program'],
    default: 'missing-in-program',
  })
  @IsOptional()
  @IsIn(['all', 'missing-only', 'missing-in-program'], {
    message: 'النطاق يجب أن يكون all أو missing-only أو missing-in-program',
  })
  scope?: 'all' | 'missing-only' | 'missing-in-program';

  @ApiPropertyOptional({
    description: 'طريقة توليد كلمة المرور',
    enum: ['nationalId', 'random'],
    default: 'nationalId',
  })
  @IsOptional()
  @IsIn(['nationalId', 'random'])
  passwordMode?: 'nationalId' | 'random';

  @ApiPropertyOptional({ description: 'تجاوز المتدربين الذين يملكون حساباً', default: false })
  @IsOptional()
  @IsBoolean()
  includeExisting?: boolean;
}

export class UnassignedTraineesQueryDto {
  @ApiPropertyOptional({ description: 'البحث بالاسم أو الرقم القومي أو الهاتف' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  programId?: number;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'عدد العناصر', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class DeleteTraineeAccountDto {
  @ApiPropertyOptional({
    description:
      'هل انتهت مهلة التأكيد؟ (الواجهة تنتظر 5 ثوانٍ قبل السماح بالحذف)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  countdownElapsed?: boolean;

  @ApiPropertyOptional({
    description: 'السماح بالحذف حتى لو كان المتدرب نشطاً الآن (جلسة مفتوحة)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

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

export class TraineeTrackingQueryDto {
  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  programId?: number;

  @ApiPropertyOptional({ description: 'البحث بالاسم أو الرقم القومي' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TraineeSessionHistoryQueryDto {
  @ApiPropertyOptional({ description: 'تاريخ البداية' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ النهاية' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  limit?: number;
}
