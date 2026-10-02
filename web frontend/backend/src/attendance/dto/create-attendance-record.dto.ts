import { IsNotEmpty, IsEnum, IsNumber, IsOptional, IsString, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '../../types';
import { Type } from 'class-transformer';

export class CreateAttendanceRecordDto {
  @ApiProperty({ description: 'رقم الجلسة' })
  @IsNotEmpty({ message: 'رقم الجلسة مطلوب' })
  @IsNumber()
  @Type(() => Number)
  sessionId: number;

  @ApiProperty({ description: 'رقم المتدرب' })
  @IsNotEmpty({ message: 'رقم المتدرب مطلوب' })
  @IsNumber()
  @Type(() => Number)
  traineeId: number;

  @ApiProperty({ description: 'حالة الحضور', enum: AttendanceStatus })
  @IsNotEmpty({ message: 'حالة الحضور مطلوبة' })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ description: 'وقت الحضور', required: false })
  @IsOptional()
  @Type(() => Date)
  arrivalTime?: Date;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
} 