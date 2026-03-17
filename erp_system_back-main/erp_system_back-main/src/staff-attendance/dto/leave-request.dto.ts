import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum StaffLeaveTypeDto {
  PERSONAL = 'PERSONAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
  ANNUAL = 'ANNUAL',
  OTHER = 'OTHER',
}

export class CreateLeaveRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsEnum(StaffLeaveTypeDto)
  leaveType?: StaffLeaveTypeDto;
}

export class ReviewLeaveRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'] as const)
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
