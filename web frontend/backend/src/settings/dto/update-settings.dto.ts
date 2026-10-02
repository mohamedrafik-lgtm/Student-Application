import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  centerName: string;

  @IsString()
  centerManagerName: string;

  @IsString()
  centerAddress: string;

  @IsOptional()
  @IsString()
  centerLogo?: string;

  @IsOptional()
  @IsString()
  facebookPageUrl?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  loginUrl?: string;

  @IsOptional()
  @IsString()
  managerPhoneNumber?: string;

  @IsBoolean()
  showTraineeDebtsToTraineeAffairs: boolean;

  @IsNumber()
  printingAmount: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  // إعدادات كارنيه الطالب
  @IsOptional()
  @IsString()
  idCardBackgroundImage?: string;

  @IsOptional()
  @IsObject()
  idCardLogoPosition?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardNamePosition?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardPhotoPosition?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardNationalIdPosition?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardProgramPosition?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardCenterNamePosition?: Record<string, number>;

  @IsOptional()
  @IsString()
  idCardAdditionalText?: string;

  @IsOptional()
  @IsObject()
  idCardAdditionalTextPosition?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  idCardWidth?: number;

  @IsOptional()
  @IsNumber()
  idCardHeight?: number;
  
  // إعدادات حجم العناصر
  @IsOptional()
  @IsObject()
  idCardLogoSize?: Record<string, number>;

  @IsOptional()
  @IsObject()
  idCardPhotoSize?: Record<string, number>;
  
  @IsOptional()
  @IsNumber()
  idCardNameSize?: number;
  
  @IsOptional()
  @IsNumber()
  idCardNationalIdSize?: number;
  
  @IsOptional()
  @IsNumber()
  idCardProgramSize?: number;
  
  @IsOptional()
  @IsNumber()
  idCardCenterNameSize?: number;
  
  @IsOptional()
  @IsNumber()
  idCardAdditionalTextSize?: number;
  
  // إعدادات ظهور العناصر
  @IsOptional()
  @IsBoolean()
  idCardLogoVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardPhotoVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardNameVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardNationalIdVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardProgramVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardCenterNameVisible?: boolean;
  
  @IsOptional()
  @IsBoolean()
  idCardAdditionalTextVisible?: boolean;
} 