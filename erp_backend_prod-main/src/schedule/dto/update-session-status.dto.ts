import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSessionDto {
  @ApiProperty({ description: 'إلغاء المحاضرة', example: true })
  @IsNotEmpty()
  @IsBoolean()
  isCancelled: boolean;

  @ApiPropertyOptional({ description: 'سبب الإلغاء' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

