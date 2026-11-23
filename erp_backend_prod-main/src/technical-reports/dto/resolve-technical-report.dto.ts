import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveTechnicalReportDto {
  @IsBoolean()
  resolved: boolean;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  reason?: string;
}
