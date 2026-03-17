import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ description: 'حالة التسليم' })
  @IsBoolean()
  isDelivered: boolean;

  @ApiProperty({ description: 'ملاحظات التسليم', required: false })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
