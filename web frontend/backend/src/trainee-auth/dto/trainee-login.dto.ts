import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TraineeLoginDto {
  @ApiProperty({
    description: 'الرقم القومي للمتدرب',
    example: '12345678901234',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({
    description: 'كلمة المرور',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
