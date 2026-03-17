import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';


export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ 
    description: 'User name (optional)',
    example: 'John Doe',
    required: false
  })
  name?: string;

  @ApiProperty({ 
    description: 'User email (optional)',
    example: 'user@example.com',
    required: false
  })
  email?: string;

  @ApiProperty({ 
    description: 'User phone number (optional)',
    example: '01234567890',
    required: false
  })
  phone?: string;

  @ApiProperty({ 
    description: 'User password (optional, min 6 characters)',
    example: 'newpassword123',
    required: false
  })
  password?: string;

  @ApiProperty({ 
    description: 'Archive status (optional)',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}