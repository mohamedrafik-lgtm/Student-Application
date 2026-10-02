import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ 
    description: 'رقم الهاتف المرتبط بالحساب',
    example: '01012345678',
    minLength: 10,
    maxLength: 15 
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  phoneNumber: string;
}
