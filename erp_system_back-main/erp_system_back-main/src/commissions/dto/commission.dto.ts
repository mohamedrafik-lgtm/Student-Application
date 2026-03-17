import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { CommissionType, CommissionStatus } from '@prisma/client';

export class CreateCommissionDto {
  @IsNotEmpty()
  @IsNumber()
  marketingEmployeeId: number;

  @IsNotEmpty()
  @IsNumber()
  traineeId: number;

  @IsNotEmpty()
  @IsEnum(CommissionType)
  type: CommissionType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCommissionDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePayoutDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @IsNotEmpty()
  @IsString()
  fromSafeId: string;

  @IsNotEmpty()
  @IsString()
  toSafeId: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}

export class CommissionFiltersDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  marketingEmployeeId?: number;

  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @IsOptional()
  @IsEnum(CommissionType)
  type?: CommissionType;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
