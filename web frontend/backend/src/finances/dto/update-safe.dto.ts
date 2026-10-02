import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { SafeCategory } from './safe-category.enum';

export class UpdateSafeDto {
  @ApiProperty({ description: 'اسم الخزينة', required: false })
  @IsOptional()
  @IsString({ message: 'اسم الخزينة يجب أن يكون نصًا' })
  name?: string;

  @ApiProperty({ description: 'وصف الخزينة', required: false })
  @IsOptional()
  @IsString({ message: 'وصف الخزينة يجب أن يكون نصًا' })
  description?: string;

  @ApiProperty({ 
    description: 'تصنيف الخزينة', 
    enum: SafeCategory,
    required: false 
  })
  @IsOptional()
  @IsEnum(SafeCategory, { message: 'تصنيف الخزينة يجب أن يكون من التصنيفات المحددة' })
  category?: SafeCategory;

  @ApiProperty({ description: 'العملة', required: false })
  @IsOptional()
  @IsString({ message: 'العملة يجب أن تكون نصًا' })
  currency?: string;

  @ApiProperty({ description: 'حالة الخزينة', required: false })
  @IsOptional()
  @IsBoolean({ message: 'حالة الخزينة يجب أن تكون قيمة منطقية' })
  isActive?: boolean;
} 