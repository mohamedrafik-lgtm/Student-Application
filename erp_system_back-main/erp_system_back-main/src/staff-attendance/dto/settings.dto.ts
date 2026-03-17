import { IsNumber, IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  workHoursPerDay?: number;

  @IsOptional()
  @IsString()
  workStartTime?: string;

  @IsOptional()
  @IsString()
  workEndTime?: string;

  @IsOptional()
  @IsNumber()
  lateThresholdMinutes?: number;

  @IsOptional()
  @IsNumber()
  earlyLeaveThreshold?: number;

  @IsOptional()
  @IsArray()
  weeklyOffDays?: string[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCheckInLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCheckOutLocation?: boolean;

  @IsOptional()
  @IsNumber()
  locationLatitude?: number;

  @IsOptional()
  @IsNumber()
  locationLongitude?: number;

  @IsOptional()
  @IsNumber()
  locationRadius?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
