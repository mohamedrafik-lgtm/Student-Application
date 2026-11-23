import { IsString, IsEnum, IsOptional, IsDateString, MinLength, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// أنواع الإجراءات العقابية
export enum DisciplinaryActionType {
  WARNING = 'WARNING',                      // لفت نظر
  GUARDIAN_SUMMON = 'GUARDIAN_SUMMON',      // استدعاء ولي الأمر
  REPORT_FILING = 'REPORT_FILING',          // حفظ محضر
  TEMPORARY_SUSPENSION = 'TEMPORARY_SUSPENSION', // فصل مؤقت
  PERMANENT_EXPULSION = 'PERMANENT_EXPULSION'    // فصل نهائي
}

export class CreateDisciplinaryActionDto {
  @ApiProperty({ description: 'معرف المتدرب', example: 123 })
  @IsInt({ message: 'معرف المتدرب يجب أن يكون رقماً صحيحاً' })
  @Type(() => Number)
  traineeId: number;

  @ApiProperty({ 
    description: 'نوع الإجراء العقابي',
    enum: DisciplinaryActionType,
    example: DisciplinaryActionType.WARNING
  })
  @IsEnum(DisciplinaryActionType)
  actionType: DisciplinaryActionType;

  @ApiProperty({ 
    description: 'سبب اتخاذ الإجراء العقابي',
    example: 'تكرار الغياب بدون عذر - 5 أيام متتالية'
  })
  @IsString()
  @MinLength(10, { message: 'يجب أن يكون السبب 10 أحرف على الأقل' })
  reason: string;

  @ApiPropertyOptional({ 
    description: 'تاريخ بداية الفصل (مطلوب للفصل المؤقت فقط)',
    example: '2025-01-15'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'تاريخ نهاية الفصل (مطلوب للفصل المؤقت فقط)',
    example: '2025-01-30'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'ملاحظات إدارية إضافية',
    example: 'تم التواصل مع ولي الأمر وإبلاغه'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'هل تم إبلاغ ولي الأمر',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  guardianNotified?: boolean;

  @ApiPropertyOptional({ 
    description: 'تاريخ إبلاغ ولي الأمر',
    example: '2025-01-15T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  guardianNotificationDate?: string;
}