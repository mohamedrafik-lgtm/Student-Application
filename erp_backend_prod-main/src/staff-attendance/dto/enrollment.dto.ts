import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollStaffDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkEnrollStaffDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  // جدول مخصص
  @IsOptional()
  @IsArray()
  customWorkDays?: string[];

  @IsOptional()
  @IsString()
  customWorkStartTime?: string;

  @IsOptional()
  @IsString()
  customWorkEndTime?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customWorkHoursPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customLateThresholdMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customEarlyLeaveThresholdMinutes?: number;

  // جدول مخصص لكل يوم
  @IsOptional()
  customDaySchedules?: Record<string, { start: string; end: string }>;

  // السماح بالنقاط العامة
  @IsOptional()
  @IsBoolean()
  allowGlobalZones?: boolean;

  // مناطق مخصصة
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zoneIds?: string[];
}
