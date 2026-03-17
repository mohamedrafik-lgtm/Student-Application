import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',   // إيداع
  WITHDRAW = 'WITHDRAW', // سحب
  TRANSFER = 'TRANSFER', // تحويل بين حسابين
  FEE = 'FEE',           // رسوم متدربين
  PAYMENT = 'PAYMENT',   // دفع رسوم
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'قيمة المعاملة' })
  @IsNotEmpty({ message: 'يجب إدخال قيمة المعاملة' })
  @IsNumber({}, { message: 'قيمة المعاملة يجب أن تكون رقمًا' })
  @IsPositive({ message: 'قيمة المعاملة يجب أن تكون أكبر من صفر' })
  amount: number;

  @ApiProperty({
    description: 'نوع المعاملة',
    enum: TransactionType,
    example: TransactionType.DEPOSIT,
  })
  @IsNotEmpty({ message: 'يجب تحديد نوع المعاملة' })
  @IsEnum(TransactionType, { message: 'نوع المعاملة غير صالح' })
  type: TransactionType;

  @ApiProperty({ description: 'وصف المعاملة', required: false })
  @IsOptional()
  @IsString({ message: 'وصف المعاملة يجب أن يكون نصًا' })
  description?: string;

  @ApiProperty({ description: 'رقم مرجعي للمعاملة', required: false })
  @IsOptional()
  @IsString({ message: 'الرقم المرجعي يجب أن يكون نصًا' })
  reference?: string;

  @ApiProperty({ description: 'معرف الخزينة المصدر (للسحب والتحويل)', required: false })
  @IsOptional()
  @IsString({ message: 'معرف الخزينة المصدر يجب أن يكون نصًا' })
  sourceId?: string;

  @ApiProperty({ description: 'معرف الخزينة الهدف (للإيداع والتحويل)', required: false })
  @IsOptional()
  @IsString({ message: 'معرف الخزينة الهدف يجب أن يكون نصًا' })
  targetId?: string;
} 