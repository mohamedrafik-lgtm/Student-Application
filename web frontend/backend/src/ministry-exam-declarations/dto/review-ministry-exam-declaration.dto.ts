import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MinistryExamDeclarationReviewStatus {
  APPROVED = 'APPROVED',
  NEEDS_RESUBMISSION = 'NEEDS_RESUBMISSION',
}

export class ReviewMinistryExamDeclarationDto {
  @ApiProperty({ enum: MinistryExamDeclarationReviewStatus, description: 'قرار المراجعة' })
  @IsEnum(MinistryExamDeclarationReviewStatus)
  status: MinistryExamDeclarationReviewStatus;

  @ApiPropertyOptional({ description: 'سبب طلب إعادة الرفع (إجباري عند عدم صلاحية الملف)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}
