import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';
import { FeeType } from './create-trainee-fee.dto';

export class UpdateTraineeFeeDto {
  @ApiProperty({ description: 'اسم الرسوم', required: false })
  @IsOptional()
  @IsString({ message: 'اسم الرسوم يجب أن يكون نصًا' })
  name?: string;

  @ApiProperty({ description: 'مبلغ الرسوم', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'مبلغ الرسوم يجب أن يكون رقمًا' })
  @Min(0.01, { message: 'مبلغ الرسوم يجب أن يكون أكبر من صفر' })
  amount?: number;

  @ApiProperty({ description: 'نوع الرسوم', enum: FeeType, required: false })
  @IsOptional()
  @IsEnum(FeeType, { message: 'نوع الرسوم غير صالح' })
  type?: FeeType;

  @ApiProperty({ description: 'العام الدراسي', required: false })
  @IsOptional()
  @IsString({ message: 'العام الدراسي يجب أن يكون نصًا' })
  academicYear?: string;

  @ApiProperty({ description: 'السماح بالتطبيق المتعدد', required: false })
  @IsOptional()
  @IsBoolean({ message: 'السماح بالتطبيق المتعدد يجب أن يكون قيمة منطقية' })
  allowMultipleApply?: boolean;

  @ApiProperty({ description: 'السماح بالسداد الجزئي (للرسوم غير الدراسية)', required: false })
  @IsOptional()
  @IsBoolean({ message: 'السماح بالسداد الجزئي يجب أن يكون قيمة منطقية' })
  allowPartialPayment?: boolean;

  @ApiProperty({ description: 'تفعيل الحد الأقصى للاسترداد/إزالة الرسم', required: false })
  @IsOptional()
  @IsBoolean({ message: 'تفعيل الحد الأقصى للاسترداد يجب أن يكون قيمة منطقية' })
  refundDeadlineEnabled?: boolean;

  @ApiProperty({ description: 'آخر تاريخ مسموح لإزالة الرسم', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الحد الأقصى للاسترداد غير صالح' })
  refundDeadlineAt?: string;

  @ApiProperty({ description: 'معرف البرنامج التدريبي', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'معرف البرنامج التدريبي يجب أن يكون رقمًا' })
  programId?: number;

  @ApiProperty({ description: 'معرف الخزينة', required: false })
  @IsOptional()
  @IsString({ message: 'معرف الخزينة يجب أن يكون نصًا' })
  safeId?: string;
}
