import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class StartQuizDto {
  @ApiProperty({ description: 'معرف الاختبار' })
  @IsInt()
  quizId: number;
}

