import { IsIn, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewDeferralRequestDto {
  @ApiProperty({
    description: 'قرار المراجعة',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'APPROVED'
  })
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ 
    description: 'رد الإدارة (سبب القبول أو الرفض)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  adminResponse?: string;

  @ApiProperty({ 
    description: 'ملاحظات إدارية إضافية', 
    required: false 
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}