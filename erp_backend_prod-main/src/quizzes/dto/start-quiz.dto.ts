import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class StartQuizDto {
  @ApiProperty({ description: 'معرف الاختبار' })
  @IsInt()
  quizId: number;

  @ApiProperty({ description: 'منصة أداء الاختبار', enum: ['WEB', 'MOBILE'], required: false, default: 'WEB' })
  @IsOptional()
  @IsString()
  @IsIn(['WEB', 'MOBILE'])
  platform?: 'WEB' | 'MOBILE';
}

