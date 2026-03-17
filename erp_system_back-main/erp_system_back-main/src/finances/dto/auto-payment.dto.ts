import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class AutoPaymentDto {
  @ApiProperty({ description: 'معرف المتدرب' })
  @IsNotEmpty({ message: 'يجب تحديد المتدرب' })
  @IsNumber({}, { message: 'معرف المتدرب يجب أن يكون رقمًا' })
  traineeId: number;

  @ApiProperty({ description: 'المبلغ الإجمالي المدفوع' })
  @IsNotEmpty({ message: 'يجب إدخال المبلغ المدفوع' })
  @IsNumber({}, { message: 'المبلغ المدفوع يجب أن يكون رقمًا' })
  @IsPositive({ message: 'المبلغ المدفوع يجب أن يكون أكبر من صفر' })
  amount: number;

  @ApiProperty({ description: 'معرف الخزينة المستلمة للدفع' })
  @IsNotEmpty({ message: 'يجب تحديد الخزينة المستلمة للدفع' })
  @IsString({ message: 'معرف الخزينة يجب أن يكون نصًا' })
  safeId: string;

  @ApiProperty({ description: 'ملاحظات إضافية', required: false })
  @IsOptional()
  @IsString({ message: 'الملاحظات يجب أن تكون نصًا' })
  notes?: string;
}
