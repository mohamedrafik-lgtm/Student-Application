import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class SubmitQuizDto {
  @ApiProperty({ description: 'منصة أداء الاختبار', enum: ['WEB', 'MOBILE'], required: false, default: 'WEB' })
  @IsOptional()
  @IsIn(['WEB', 'MOBILE'])
  platform?: 'WEB' | 'MOBILE';

  @ApiProperty({ description: 'معرف المحاولة' })
  @IsString()
  attemptId: string;
}

