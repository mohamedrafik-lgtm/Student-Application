import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

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

  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsNotEmpty({ message: 'يجب تحديد البرنامج التدريبي' })
  @IsNumber({}, { message: 'معرف البرنامج التدريبي يجب أن يكون رقمًا' })
  programId: number;

  @ApiProperty({ description: 'معرف الخزينة التي سيتم خصم الرسوم منها' })
  @IsNotEmpty({ message: 'يجب تحديد الخزينة' })
  @IsString({ message: 'معرف الخزينة يجب أن يكون نصًا' })
  safeId: string;
} 