import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDistributionDto {
  @ApiProperty({ description: 'عدد المجموعات', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfRooms?: number;
}
