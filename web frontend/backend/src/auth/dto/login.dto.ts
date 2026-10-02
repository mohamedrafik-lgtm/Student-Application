import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'البريد الإلكتروني أو رقم الهاتف',
    example: 'admin@example.com أو 01234567890'
  })
  @IsNotEmpty({ message: 'البريد الإلكتروني أو رقم الهاتف مطلوب' })
  @IsString({ message: 'البريد الإلكتروني أو رقم الهاتف يجب أن يكون نصًا' })
  emailOrPhone: string;

  @ApiProperty({
    description: 'كلمة المرور',
    example: 'password123'
  })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور يجب أن تكون نصًا' })
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;
} 