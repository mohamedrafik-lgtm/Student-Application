import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateOvertimeRequestDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  startTime: string; // HH:mm

  @IsString()
  endTime: string; // HH:mm

  @IsString()
  reason: string;
}

export class StartOvertimeDto {
  @IsString()
  reason: string;
}

export class ReviewOvertimeRequestDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
