import { IsNumber, IsOptional, IsString, IsBoolean, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}
