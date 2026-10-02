import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  page: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  photoUrl?: string;
}
