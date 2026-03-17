import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordIdCardPrintDto {
  @ApiProperty({ description: 'معرف المتدرب' })
  @IsInt()
  traineeId: number;

  @ApiProperty({ description: 'معرف المستخدم الذي قام بالطباعة' })
  @IsString()
  printedById: string;

  @ApiProperty({ description: 'معرف التصميم المستخدم (اختياري)', required: false })
  @IsOptional()
  @IsString()
  designId?: string;

  @ApiProperty({ description: 'ملاحظات إضافية (اختياري)', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
} 