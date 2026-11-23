import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewQuizAccessRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;

  @ApiProperty({ required: false, description: 'ISO date-time. Required for approval.' })
  @IsOptional()
  @IsString()
  scheduledStartAt?: string;

  @ApiProperty({ required: false, description: 'ISO date-time. Required for approval.' })
  @IsOptional()
  @IsString()
  scheduledEndAt?: string;
}
