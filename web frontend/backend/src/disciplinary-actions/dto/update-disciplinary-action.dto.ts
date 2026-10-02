import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DisciplinaryActionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export class UpdateDisciplinaryActionDto {
  @ApiPropertyOptional({ description: 'حالة الإجراء', enum: DisciplinaryActionStatus })
  @IsOptional()
  @IsEnum(DisciplinaryActionStatus)
  status?: DisciplinaryActionStatus;

  @ApiPropertyOptional({ description: 'ملاحظات إدارية' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'هل تم إبلاغ ولي الأمر' })
  @IsOptional()
  @IsBoolean()
  guardianNotified?: boolean;

  @ApiPropertyOptional({ description: 'تاريخ إبلاغ ولي الأمر' })
  @IsOptional()
  @IsDateString()
  guardianNotificationDate?: string;

  @ApiPropertyOptional({ description: 'سبب الإلغاء (إذا تم الإلغاء)' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}