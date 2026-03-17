import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SubmitQuizDto {
  @ApiProperty({ description: 'معرف المحاولة' })
  @IsString()
  attemptId: string;
}

