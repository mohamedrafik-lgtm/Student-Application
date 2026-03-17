import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'معرف المجموعة' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'معرف المتدرب' })
  @IsNumber()
  traineeId: number;

  @ApiProperty({ description: 'ملاحظات إضافية', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

