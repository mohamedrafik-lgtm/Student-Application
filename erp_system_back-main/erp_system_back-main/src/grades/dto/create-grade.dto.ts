import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  traineeId: number;

  @IsInt()
  @Min(1)
  trainingContentId: number;

  @IsInt()
  @Min(1)
  classroomId: number;

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

