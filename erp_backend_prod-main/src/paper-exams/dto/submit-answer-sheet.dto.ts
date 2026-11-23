import { IsString, IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsInt()
  questionId: number;

  @IsOptional()
  @IsInt()
  selectedOptionId?: number;
}

export class SubmitAnswerSheetDto {
  @IsString()
  sheetCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsOptional()
  @IsString()
  scannedImageUrl?: string;
}