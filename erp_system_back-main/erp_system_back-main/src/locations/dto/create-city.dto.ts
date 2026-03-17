import { IsString, IsOptional, IsBoolean, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({ description: 'معرف المحافظة', example: 'clx123abc' })
  @IsString()
  governorateId: string;

  @ApiProperty({ description: 'كود المدينة', example: 'mansoura' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'اسم المدينة بالعربية', example: 'المنصورة' })
  @IsString()
  @MinLength(2)
  nameAr: string;

  @ApiPropertyOptional({ description: 'اسم المدينة بالإنجليزية', example: 'Mansoura' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'حالة النشاط', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'الترتيب في القائمة', default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;
}