import { IsString, IsInt, IsBoolean, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ExamModelQuestionDto {
  @IsInt()
  questionId: number;

  @IsInt()
  orderInModel: number;

  @IsOptional()
  @IsNumber()
  points?: number;
}

export class CreateExamModelDto {
  @IsInt()
  paperExamId: number;

  @IsString()
  modelCode: string;

  @IsString()
  modelName: string;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamModelQuestionDto)
  questions: ExamModelQuestionDto[];
}