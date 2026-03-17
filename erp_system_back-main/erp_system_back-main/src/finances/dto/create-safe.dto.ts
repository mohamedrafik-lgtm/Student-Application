import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { SafeCategory } from './safe-category.enum';

export class CreateSafeDto {
  @ApiProperty({ description: 'اسم الخزينة' })
  @IsNotEmpty({ message: 'يجب إدخال اسم الخزينة' })
  @IsString({ message: 'اسم الخزينة يجب أن يكون نصًا' })
  name: string;

  @ApiProperty({ description: 'وصف الخزينة', required: false })
  @IsOptional()
  @IsString({ message: 'وصف الخزينة يجب أن يكون نصًا' })
  description?: string;

  @ApiProperty({ 
    description: 'تصنيف الخزينة', 
    enum: SafeCategory,
    default: SafeCategory.UNSPECIFIED,
    required: false 
  })
  @IsOptional()
  @IsEnum(SafeCategory, { message: 'تصنيف الخزينة يجب أن يكون من التصنيفات المحددة' })
  category?: SafeCategory = SafeCategory.UNSPECIFIED;

  @ApiProperty({ description: 'الرصيد الابتدائي', default: 0, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'الرصيد يجب أن يكون رقمًا' })
  @Transform(({ value }) => parseFloat(value) || 0)
  balance?: number = 0;

  @ApiProperty({ description: 'العملة', default: 'EGP', required: false })
  @IsOptional()
  @IsString({ message: 'العملة يجب أن تكون نصًا' })
  currency?: string = 'EGP';

  @ApiProperty({ description: 'حالة الخزينة', default: true, required: false })
  @IsOptional()
  @IsBoolean({ message: 'حالة الخزينة يجب أن تكون قيمة منطقية' })
  isActive?: boolean = true;
} 