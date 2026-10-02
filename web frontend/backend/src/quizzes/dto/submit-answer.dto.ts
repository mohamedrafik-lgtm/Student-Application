import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ description: 'معرف المحاولة' })
  @IsString()
  attemptId: string;

  @ApiProperty({ description: 'معرف السؤال' })
  @IsInt()
  questionId: number;

  @ApiProperty({ description: 'الإجابة المختارة (JSON للأسئلة متعددة الاختيارات)', required: false })
  @IsOptional()
  @IsString()
  selectedAnswer?: string;

  @ApiProperty({ description: 'الإجابة النصية', required: false })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

