import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export class RecordAttendanceDto {
  @ApiProperty({ description: 'معرف المحاضرة' })
  @IsInt()
  sessionId: number;

  @ApiProperty({ description: 'معرف المتدرب' })
  @IsInt()
  traineeId: number;

  @ApiProperty({ description: 'حالة الحضور', enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

