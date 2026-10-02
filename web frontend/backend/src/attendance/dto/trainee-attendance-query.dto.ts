import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TraineeAttendanceQueryDto {
  @ApiPropertyOptional({ description: 'رقم الصفحة', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'نص البحث (اسم، رقم قومي، بريد، هاتف)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'معرف البرنامج للتصفية' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  programId?: number;
}

