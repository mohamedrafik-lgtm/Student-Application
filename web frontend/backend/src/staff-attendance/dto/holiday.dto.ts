import { IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
