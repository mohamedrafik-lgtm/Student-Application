import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class ManualRecordDto {
  @IsString()
  userId: string;

  @IsDateString()
  date: string;

  @IsEnum(['PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED'] as const)
  status: string;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLogDto {
  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED'] as const)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;
}
