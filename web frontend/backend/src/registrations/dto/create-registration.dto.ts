import { IsNotEmpty, IsOptional, IsString, Matches, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRegistrationDto {
  @IsNotEmpty()
  @IsString()
  traineeName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Phone number must be valid' })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  altPhoneNumber?: string;

  @IsNotEmpty()
  @IsString()
  qualification: string;

  @IsNotEmpty()
  @IsString()
  branch: string;

  @IsNotEmpty()
  @IsString()
  program: string;

  @IsOptional()
  @IsString()
  friendName?: string;

  @IsOptional()
  @IsString()
  friendPhone?: string;
}