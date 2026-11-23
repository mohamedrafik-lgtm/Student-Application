import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class GradeEntryDto {
  @IsInt()
  @Min(1)
  traineeId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearWorkMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  practicalMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  writtenMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  attendanceMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quizzesMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalExamMarks?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpdateGradesDto {
  @IsInt()
  @Min(1)
  trainingContentId: number;

  @IsInt()
  @Min(1)
  classroomId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  grades: GradeEntryDto[];
}

