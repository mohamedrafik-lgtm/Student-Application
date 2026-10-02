import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAssignmentDto {
  @ApiProperty({ description: 'معرف المجموعة الجديدة' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
