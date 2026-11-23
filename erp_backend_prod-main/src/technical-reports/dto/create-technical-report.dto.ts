import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTechnicalReportDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2048)
  @Matches(/^\/(?!\/)/, { message: 'مسار الصفحة غير صالح' })
  pageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pageTitle?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  details: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https:\/\/res\.cloudinary\.com\/|\/uploads\/)/, { message: 'رابط الصورة غير صالح' })
  imageUrl?: string;
}
