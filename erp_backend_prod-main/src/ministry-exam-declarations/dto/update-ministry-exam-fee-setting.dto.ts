import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { CreateMinistryExamFeeSettingDto } from './create-ministry-exam-fee-setting.dto';

export class UpdateMinistryExamFeeSettingDto extends PartialType(
  CreateMinistryExamFeeSettingDto,
) {
  @ApiPropertyOptional({ description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  @IsInt()
  @Min(1)
  override programId?: number;

  @ApiPropertyOptional({ description: 'معرف الرسم المالي المطلوب' })
  @IsOptional()
  @IsInt()
  @Min(1)
  override feeId?: number;

  @ApiPropertyOptional({
    description: 'آخر موعد لتقديم الإقرار (ISO Date أو YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  override submissionDeadline?: string;
}
