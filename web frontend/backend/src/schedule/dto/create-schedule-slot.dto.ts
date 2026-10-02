import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { DayOfWeek, SessionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleSlotDto {
  @ApiProperty({ description: 'معرف المحتوى التدريبي' })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  contentId: number;

  @ApiProperty({ description: 'معرف الفصل الدراسي' })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  classroomId: number;

  @ApiProperty({ description: 'يوم الأسبوع', enum: DayOfWeek })
  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'وقت البداية (HH:mm)', example: '09:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'يجب أن يكون وقت البداية بصيغة HH:mm',
  })
  startTime: string;

  @ApiProperty({ description: 'وقت النهاية (HH:mm)', example: '11:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'يجب أن يكون وقت النهاية بصيغة HH:mm',
  })
  endTime: string;

  @ApiProperty({ description: 'نوع الحضور', enum: SessionType })
  @IsNotEmpty()
  @IsEnum(SessionType)
  type: SessionType;

  @ApiPropertyOptional({ description: 'القاعة أو المكان' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'معرف المجموعة (اختياري)' })
  @IsOptional()
  @IsString()
  distributionRoomId?: string;
}

