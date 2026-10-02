import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateSingleClassroomDto {
  @ApiProperty({ description: 'تاريخ بداية الفصل', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'تاريخ نهاية الفصل', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

