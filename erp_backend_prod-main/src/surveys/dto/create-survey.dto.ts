import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsArray, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSurveyQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateSurveyQuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2, { message: 'يجب إضافة خيارين على الأقل لكل سؤال' })
  @Type(() => CreateSurveyQuestionOptionDto)
  options: CreateSurveyQuestionOptionDto[];
}

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان الاستبيان مطلوب' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  allPrograms: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  programIds?: number[];

  @IsDateString()
  @IsNotEmpty({ message: 'تاريخ البداية مطلوب' })
  startDate: string;

  @IsDateString()
  @IsNotEmpty({ message: 'تاريخ النهاية مطلوب' })
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'يجب إضافة سؤال واحد على الأقل' })
  @Type(() => CreateSurveyQuestionDto)
  questions: CreateSurveyQuestionDto[];
}
