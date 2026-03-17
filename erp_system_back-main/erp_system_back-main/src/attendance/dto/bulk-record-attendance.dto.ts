import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from './record-attendance.dto';

// DTO للسجل الواحد في bulk (بدون sessionId لأنه موجود في الأعلى)
export class BulkAttendanceEntryDto {
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

export class BulkRecordAttendanceDto {
  @ApiProperty({ description: 'معرف المحاضرة' })
  @IsInt()
  sessionId: number;

  @ApiProperty({ 
    description: 'قائمة سجلات الحضور',
    type: [BulkAttendanceEntryDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceEntryDto)
  records: BulkAttendanceEntryDto[];
}

