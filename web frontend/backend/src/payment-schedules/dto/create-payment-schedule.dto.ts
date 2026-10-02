import { IsInt, IsOptional, IsBoolean, IsDateString, IsEnum, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NonPaymentAction {
  DISABLE_ATTENDANCE = 'DISABLE_ATTENDANCE',
  DISABLE_PLATFORM = 'DISABLE_PLATFORM',
  DISABLE_QUIZZES = 'DISABLE_QUIZZES',
  DISABLE_ALL = 'DISABLE_ALL',
  NONE = 'NONE',
}

export class CreatePaymentScheduleDto {
  @ApiProperty({ description: 'معرف الرسوم' })
  @IsInt()
  feeId: number;

  @ApiProperty({ description: 'موعد بداية السداد', required: false })
  @IsOptional()
  @IsDateString()
  paymentStartDate?: string;

  @ApiProperty({ description: 'موعد نهاية السداد', required: false })
  @IsOptional()
  @IsDateString()
  paymentEndDate?: string;

  @ApiProperty({ description: 'فترة السماح بالأيام', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @ApiProperty({
    description: 'الإجراءات المتخذة عند عدم السداد (يمكن اختيار أكثر من إجراء)',
    type: [String],
    isArray: true,
    required: false
  })
  @IsOptional()
  nonPaymentActions?: string[];

  @ApiProperty({ description: 'هل الإجراء مفعل؟', default: false })
  @IsOptional()
  @IsBoolean()
  actionEnabled?: boolean;

  @ApiProperty({ description: 'ملاحظات إضافية', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}