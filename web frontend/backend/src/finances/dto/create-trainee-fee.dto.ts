import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export enum FeeType {
  TUITION = 'TUITION',       // رسوم دراسية أساسية
  SERVICES = 'SERVICES',     // خدمات
  TRAINING = 'TRAINING',     // تدريب
  ADDITIONAL = 'ADDITIONAL', // رسوم إضافية
}

export class CreateTraineeFeeDto {
  @ApiProperty({ description: 'اسم الرسوم' })
  @IsNotEmpty({ message: 'يجب إدخال اسم الرسوم' })
  @IsString({ message: 'اسم الرسوم يجب أن يكون نصًا' })
  name: string;

  @ApiProperty({ description: 'قيمة الرسوم' })
  @IsNotEmpty({ message: 'يجب إدخال قيمة الرسوم' })
  @IsNumber({}, { message: 'قيمة الرسوم يجب أن تكون رقمًا' })
  @IsPositive({ message: 'قيمة الرسوم يجب أن تكون أكبر من صفر' })
  amount: number;

  @ApiProperty({
    description: 'نوع الرسوم',
    enum: FeeType,
    example: FeeType.TUITION,
  })
  @IsNotEmpty({ message: 'يجب تحديد نوع الرسوم' })
  @IsEnum(FeeType, { message: 'نوع الرسوم غير صالح' })
  type: FeeType;

  @ApiProperty({ description: 'العام الدراسي' })
  @IsNotEmpty({ message: 'يجب إدخال العام الدراسي' })
  @IsString({ message: 'العام الدراسي يجب أن يكون نصًا' })
  academicYear: string;

  @ApiProperty({ description: 'السماح بتطبيق الرسوم أكثر من مرة', default: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'قيمة السماح بتطبيق الرسوم أكثر من مرة يجب أن تكون قيمة منطقية' })
  allowMultipleApply?: boolean = false;

  @ApiProperty({
    description: 'السماح بالسداد الجزئي (للرسوم غير الدراسية)',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'قيمة السماح بالسداد الجزئي يجب أن تكون قيمة منطقية' })
  allowPartialPayment?: boolean = true;

  @ApiProperty({
    description: 'تفعيل الحد الأقصى للاسترداد/إزالة الرسم',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'قيمة تفعيل الحد الأقصى للاسترداد يجب أن تكون قيمة منطقية' })
  refundDeadlineEnabled?: boolean = false;

  @ApiProperty({
    description: 'آخر تاريخ مسموح لإزالة الرسم (YYYY-MM-DD أو ISO Date)',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الحد الأقصى للاسترداد غير صالح' })
  refundDeadlineAt?: string;

  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsNotEmpty({ message: 'يجب تحديد البرنامج التدريبي' })
  @IsNumber({}, { message: 'معرف البرنامج التدريبي يجب أن يكون رقمًا' })
  programId: number;

  @ApiProperty({ description: 'معرف الخزينة التي سيتم خصم الرسوم منها' })
  @IsNotEmpty({ message: 'يجب تحديد الخزينة' })
  @IsString({ message: 'معرف الخزينة يجب أن يكون نصًا' })
  safeId: string;
} 