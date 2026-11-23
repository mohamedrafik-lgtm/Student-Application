import { IsString, IsOptional, IsBoolean, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGovernorateDto {
  @ApiProperty({ description: 'معرف الدولة', example: 'clx123abc' })
  @IsString()
  countryId: string;

  @ApiProperty({ description: 'كود المحافظة', example: 'cairo' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'اسم المحافظة بالعربية', example: 'القاهرة' })
  @IsString()
  @MinLength(2)
  nameAr: string;

  @ApiPropertyOptional({ description: 'اسم المحافظة بالإنجليزية', example: 'Cairo' })
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