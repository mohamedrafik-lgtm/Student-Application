import { IsString, IsEmail, IsOptional, IsBoolean, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateMarketingEmployeeDto {
  @ApiProperty({ description: 'اسم موظف التسويق' })
  @IsString()
  @MinLength(2, { message: 'يجب أن يكون الاسم أكثر من حرفين' })
  @MaxLength(100, { message: 'يجب أن يكون الاسم أقل من 100 حرف' })
  name: string;

  @ApiProperty({ description: 'رقم الهاتف' })
  @IsString()
  @MinLength(10, { message: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' })
  @MaxLength(15, { message: 'رقم الهاتف يجب أن يكون 15 رقم على الأكثر' })
  phone: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  @Transform(({ value }) => value === '' ? undefined : value)
  email?: string;

  @ApiPropertyOptional({ description: 'حالة نشاط الموظف', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMarketingEmployeeDto {
  @ApiPropertyOptional({ description: 'اسم موظف التسويق' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'يجب أن يكون الاسم أكثر من حرفين' })
  @MaxLength(100, { message: 'يجب أن يكون الاسم أقل من 100 حرف' })
  name?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' })
  @MaxLength(15, { message: 'رقم الهاتف يجب أن يكون 15 رقم على الأكثر' })
  phone?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  @Transform(({ value }) => value === '' ? undefined : value)
  email?: string;

  @ApiPropertyOptional({ description: 'حالة نشاط الموظف' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
