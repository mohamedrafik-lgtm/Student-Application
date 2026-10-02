import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

export class UpdateDeliveryDto {
  @ApiProperty({ description: 'حالة التسليم', required: false, enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiProperty({ description: 'تاريخ التسليم', required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'تاريخ الإرجاع', required: false })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({ description: 'ملاحظات الإرجاع', required: false })
  @IsOptional()
  @IsString()
  returnNotes?: string;
}

