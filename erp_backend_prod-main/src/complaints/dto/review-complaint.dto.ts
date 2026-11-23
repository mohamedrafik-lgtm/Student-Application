import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class ReviewComplaintDto {
  @ApiProperty({ enum: ReviewStatus, description: 'الحالة الجديدة' })
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @ApiPropertyOptional({ description: 'رد الإدارة' })
  @IsOptional()
  @IsString()
  adminResponse?: string;
}
