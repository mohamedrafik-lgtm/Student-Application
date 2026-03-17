import { IsNotEmpty, IsEnum, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionType } from '../../types';
import { Transform, Type } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({ description: 'عنوان الجلسة' })
  @IsNotEmpty({ message: 'عنوان الجلسة مطلوب' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'نوع الجلسة', enum: SessionType })
  @IsNotEmpty({ message: 'نوع الجلسة مطلوب' })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiProperty({ description: 'تاريخ الجلسة' })
  @IsNotEmpty({ message: 'تاريخ الجلسة مطلوب' })
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'وقت بداية الجلسة' })
  @IsNotEmpty({ message: 'وقت بداية الجلسة مطلوب' })
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: 'وقت نهاية الجلسة' })
  @IsNotEmpty({ message: 'وقت نهاية الجلسة مطلوب' })
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ description: 'موقع/قاعة الجلسة', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'رقم الباب المرتبط بالمحتوى' })
  @IsNotEmpty({ message: 'رقم الباب مطلوب' })
  @IsNumber()
  @Type(() => Number)
  chapter: number;

  @ApiProperty({ description: 'ملاحظات عن المحتوى المقدم', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'رقم المحتوى التدريبي' })
  @IsNotEmpty({ message: 'رقم المحتوى التدريبي مطلوب' })
  @IsNumber()
  @Type(() => Number)
  contentId: number;
} 