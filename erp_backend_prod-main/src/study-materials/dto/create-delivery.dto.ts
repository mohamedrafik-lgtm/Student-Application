import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

export class CreateDeliveryDto {
  @ApiProperty({ description: 'معرف الأداة الدراسية' })
  @IsString()
  studyMaterialId: string;

  @ApiProperty({ description: 'معرف المتدرب' })
  @IsNumber()
  traineeId: number;

  @ApiProperty({ description: 'الكمية المسلمة', default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

