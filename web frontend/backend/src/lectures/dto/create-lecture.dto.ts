import { IsNotEmpty, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min, IsInt, IsPositive } from 'class-validator';
import { LectureType } from '../../types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLectureDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(LectureType)
  type: LectureType;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  chapter: number;

  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  pdfFile?: string;

  @IsNotEmpty()
  @IsInt()
  order: number;
  
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  contentId: number;
} 