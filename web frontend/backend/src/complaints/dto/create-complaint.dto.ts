import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ComplaintType {
  COMPLAINT = 'COMPLAINT',
  SUGGESTION = 'SUGGESTION',
}

export class CreateComplaintDto {
  @ApiProperty({ enum: ComplaintType, description: 'نوع الطلب' })
  @IsEnum(ComplaintType)
  @IsNotEmpty()
  type: ComplaintType;

  @ApiProperty({ description: 'عنوان الشكوى/الاقتراح' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'التفاصيل' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'رابط الصورة المرفقة' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'معرف الصورة في Cloudinary' })
  @IsOptional()
  @IsString()
  attachmentCloudinaryId?: string;
}
