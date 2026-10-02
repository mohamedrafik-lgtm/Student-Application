import { IsString, IsInt, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { PaperExamGradeType, Semester } from '@prisma/client';

export class CreatePaperExamDto {
  @IsInt()
  trainingContentId: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsDateString()
  examDate: string;

  @IsInt()
  duration: number;

  @IsEnum(PaperExamGradeType)
  gradeType: PaperExamGradeType;

  @IsNumber()
  totalMarks: number;

  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @IsString()
  academicYear: string;

  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}