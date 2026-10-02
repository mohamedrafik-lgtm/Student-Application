import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassroomsDto {
  @ApiProperty({ description: 'عدد الفصول الدراسية' })
  @IsInt()
  @Min(0)
  numberOfClassrooms: number;
}
