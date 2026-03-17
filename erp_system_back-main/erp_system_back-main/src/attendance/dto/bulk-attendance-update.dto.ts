import { IsNotEmpty, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateAttendanceRecordDto } from './create-attendance-record.dto';

export class BulkAttendanceUpdateDto {
  @ApiProperty({ description: 'رقم الجلسة' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  sessionId: number;

  @ApiProperty({ type: [CreateAttendanceRecordDto], description: 'سجلات الحضور المراد تحديثها' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceRecordDto)
  records: CreateAttendanceRecordDto[];
} 