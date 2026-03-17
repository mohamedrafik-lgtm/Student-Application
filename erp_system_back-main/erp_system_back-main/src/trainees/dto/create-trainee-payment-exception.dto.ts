import { IsInt, IsOptional, IsDateString, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTraineePaymentExceptionDto {
  @ApiProperty({ description: 'معرف الرسوم (اختياري - null للتطبيق على جميع الرسوم)', required: false })
  @IsOptional()
  @IsInt()
  feeId?: number;

  @ApiProperty({ description: 'موعد نهاية السداد المخصص', required: false })
  @IsOptional()
  @IsDateString()
  customPaymentEndDate?: string;

  @ApiProperty({ description: 'فترة السماح المخصصة بالأيام', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  customGracePeriodDays?: number;

  @ApiProperty({ description: 'سبب الاستثناء' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'ملاحظات إضافية', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}