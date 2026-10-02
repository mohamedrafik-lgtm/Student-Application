import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamCommitteeDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'الرقم القومي يجب أن يكون 14 رقم' })
  nationalId?: string;

  @IsString()
  @IsNotEmpty()
  traineeName: string;

  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @IsString()
  @IsNotEmpty()
  committeeNumber: string;

  @IsString()
  @IsNotEmpty()
  examDate: string;

  @IsString()
  @IsNotEmpty()
  attendanceTime: string;
}

export class BulkCreateExamCommitteeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamCommitteeDto)
  items: CreateExamCommitteeDto[];
}
