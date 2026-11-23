import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryStudyMaterialsDto {
  @ApiProperty({ required: false, description: 'معرف البرنامج التدريبي' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  programId?: number;

  @ApiProperty({ required: false, description: 'البحث في الاسم' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'حالة النشاط' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

