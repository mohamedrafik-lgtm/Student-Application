import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

export class QueryDeliveriesDto {
  @ApiProperty({ required: false, description: 'معرف الأداة الدراسية' })
  @IsOptional()
  @IsString()
  studyMaterialId?: string;

  @ApiProperty({ required: false, description: 'معرف المتدرب' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  traineeId?: number;

  @ApiProperty({ required: false, description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  programId?: number;

  @ApiProperty({ required: false, description: 'حالة التسليم', enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiProperty({ required: false, description: 'البحث في اسم المتدرب' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

