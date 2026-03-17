import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewGradeAppealDto {
  @ApiProperty({ description: 'الحالة الجديدة', enum: ['ACCEPTED', 'REJECTED'] })
  @IsString()
  @IsIn(['ACCEPTED', 'REJECTED'], { message: 'الحالة يجب أن تكون ACCEPTED أو REJECTED' })
  status: 'ACCEPTED' | 'REJECTED';

  @ApiProperty({ description: 'رد الإدارة', required: false })
  @IsOptional()
  @IsString()
  adminResponse?: string;
}
