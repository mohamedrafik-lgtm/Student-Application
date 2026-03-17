import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeveloperSettingDto {
  @ApiProperty({ description: 'مفتاح الإعداد', example: 'GEMINI_API_KEY' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'قيمة الإعداد' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'وصف الإعداد' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'التصنيف', default: 'general' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'هل القيمة مشفرة؟', default: true })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ description: 'هل الإعداد مفعل؟', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDeveloperSettingDto {
  @ApiPropertyOptional({ description: 'قيمة الإعداد' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'وصف الإعداد' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'التصنيف' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'هل القيمة مشفرة؟' })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ description: 'هل الإعداد مفعل؟' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
