import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SurveyAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  optionId: string;
}

export class SubmitSurveyResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'يجب الإجابة على سؤال واحد على الأقل' })
  @Type(() => SurveyAnswerDto)
  answers: SurveyAnswerDto[];
}
