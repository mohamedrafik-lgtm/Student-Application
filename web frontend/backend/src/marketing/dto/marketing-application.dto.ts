import { IsString, IsEmail, IsOptional, IsInt, IsEnum, IsBoolean, IsDateString, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

export class CreateMarketingApplicationDto {
  @ApiProperty({ description: 'معرف موظف التسويق' })
  @Type(() => Number)
  @IsInt({ message: 'معرف الموظف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الموظف غير صحيح' })
  employeeId: number;

  @ApiProperty({ description: 'اسم المتقدم' })
  @IsString()
  @MinLength(2, { message: 'يجب أن يكون الاسم أكثر من حرفين' })
  @MaxLength(100, { message: 'يجب أن يكون الاسم أقل من 100 حرف' })
  applicantName: string;

  @ApiProperty({ description: 'رقم هاتف المتقدم' })
  @IsString()
  @MinLength(10, { message: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' })
  @MaxLength(15, { message: 'رقم الهاتف يجب أن يكون 15 رقم على الأكثر' })
  applicantPhone: string;

  @ApiPropertyOptional({ description: 'بريد المتقدم' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  applicantEmail?: string;

  @ApiPropertyOptional({ description: 'البرنامج المهتم به' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'اسم البرنامج يجب أن يكون أقل من 200 حرف' })
  programInterest?: string;

  @ApiPropertyOptional({ description: 'مصدر التقديم' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'مصدر التقديم يجب أن يكون أقل من 100 حرف' })
  source?: string;

  @ApiPropertyOptional({ description: 'حالة التقديم', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: 'حالة التقديم غير صحيحة' })
  status?: ApplicationStatus;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات يجب أن تكون أقل من 500 حرف' })
  notes?: string;

  @ApiPropertyOptional({ description: 'تاريخ المتابعة' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ المتابعة غير صحيح' })
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'هل تم تحويله لمتدرب', default: false })
  @IsOptional()
  @IsBoolean()
  convertedToTrainee?: boolean;

  @ApiPropertyOptional({ description: 'معرف المتدرب (إذا تم التحويل)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'معرف المتدرب يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف المتدرب غير صحيح' })
  traineeId?: number;
}

export class UpdateMarketingApplicationDto {
  @ApiPropertyOptional({ description: 'اسم المتقدم' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'يجب أن يكون الاسم أكثر من حرفين' })
  @MaxLength(100, { message: 'يجب أن يكون الاسم أقل من 100 حرف' })
  applicantName?: string;

  @ApiPropertyOptional({ description: 'رقم هاتف المتقدم' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' })
  @MaxLength(15, { message: 'رقم الهاتف يجب أن يكون 15 رقم على الأكثر' })
  applicantPhone?: string;

  @ApiPropertyOptional({ description: 'بريد المتقدم' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  applicantEmail?: string;

  @ApiPropertyOptional({ description: 'البرنامج المهتم به' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'اسم البرنامج يجب أن يكون أقل من 200 حرف' })
  programInterest?: string;

  @ApiPropertyOptional({ description: 'مصدر التقديم' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'مصدر التقديم يجب أن يكون أقل من 100 حرف' })
  source?: string;

  @ApiPropertyOptional({ description: 'حالة التقديم', enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: 'حالة التقديم غير صحيحة' })
  status?: ApplicationStatus;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات يجب أن تكون أقل من 500 حرف' })
  notes?: string;

  @ApiPropertyOptional({ description: 'تاريخ المتابعة' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ المتابعة غير صحيح' })
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'هل تم تحويله لمتدرب' })
  @IsOptional()
  @IsBoolean()
  convertedToTrainee?: boolean;

  @ApiPropertyOptional({ description: 'معرف المتدرب (إذا تم التحويل)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'معرف المتدرب يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف المتدرب غير صحيح' })
  traineeId?: number;
}
