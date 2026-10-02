import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMinistryExamFeeSettingDto {
  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsInt()
  @Min(1)
  programId: number;

  @ApiProperty({ description: 'معرف الرسم المالي المطلوب' })
  @IsInt()
  @Min(1)
  feeId: number;

  @ApiProperty({
    description: 'آخر موعد لتقديم الإقرار (ISO Date أو YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsDateString()
  submissionDeadline: string;

  @ApiPropertyOptional({
    description: 'هل استقبال الطلبات مفتوح لهذا البرنامج؟',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequestsOpen?: boolean;

  @ApiPropertyOptional({
    description: 'حالة تفعيل الإعداد',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ملاحظات إدارية' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  notes?: string;
}
