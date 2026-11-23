import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDistributionDto {
  @ApiProperty({ description: 'عدد المجموعات', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfRooms?: number;

  @ApiProperty({ description: 'تاريخ بداية التسجيل', required: false })
  @IsOptional()
  registrationStartDate?: string | null;

  @ApiProperty({ description: 'تاريخ نهاية التسجيل', required: false })
  @IsOptional()
  registrationEndDate?: string | null;

  @ApiProperty({ description: 'هل يظهر للمتدربين للتسجيل الذاتي', required: false })
  @IsOptional()
  @IsBoolean()
  isVisibleToTrainees?: boolean;
}
