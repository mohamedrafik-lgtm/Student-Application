import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches, IsEnum, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AccountType {
  STAFF = 'STAFF',
  INSTRUCTOR = 'INSTRUCTOR',
}

export class CreateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '01234567890',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9+\-\s()]{10,15}$/, {
    message: 'رقم الهاتف غير صالح (يجب أن يكون من 10-15 رقم)'
  })
  phone: string;

  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'password123'
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Account Type: STAFF for admin users, INSTRUCTOR for instructors',
    example: 'STAFF',
    enum: AccountType,
    default: 'STAFF',
    required: false
  })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiProperty({
    description: 'Role ID to assign to the user',
    example: 'clxxxxx',
    required: false
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'البرامج التدريبية المسموح للمستخدم بالوصول إليها (فارغة = كل البرامج)',
    example: [1, 2, 3],
    required: false,
    type: [Number]
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  allowedProgramIds?: number[];
}