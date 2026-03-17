import { IsString, IsOptional, IsBoolean, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ description: 'كود الدولة', example: 'EG' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  code: string;

  @ApiProperty({ description: 'اسم الدولة بالعربية', example: 'مصر' })
  @IsString()
  @MinLength(2)
  nameAr: string;

  @ApiPropertyOptional({ description: 'اسم الدولة بالإنجليزية', example: 'Egypt' })
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