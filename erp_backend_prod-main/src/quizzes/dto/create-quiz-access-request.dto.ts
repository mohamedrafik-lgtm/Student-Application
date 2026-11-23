import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateQuizAccessRequestDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  quizId: number;

  @ApiProperty({ enum: ['INTEGRITY_REVIEW', 'MISSED_EXAM'] })
  @IsIn(['INTEGRITY_REVIEW', 'MISSED_EXAM'])
  requestType: 'INTEGRITY_REVIEW' | 'MISSED_EXAM';

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;
}
