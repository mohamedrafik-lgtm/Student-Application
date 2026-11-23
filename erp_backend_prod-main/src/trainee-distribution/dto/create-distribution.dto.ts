import { IsInt, Min, IsEnum, IsNotEmpty, IsArray, IsOptional, ArrayMinSize, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DistributionAssignmentMode } from '@prisma/client';

export enum DistributionType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL',
}

export class CreateDistributionDto {
  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsInt()
  @IsNotEmpty()
  programId: number;

  @ApiProperty({ description: 'نوع التوزيع (نظري أو عملي)', enum: DistributionType })
  @IsEnum(DistributionType)
  @IsNotEmpty()
  type: DistributionType;

  @ApiProperty({ description: 'عدد المجموعات' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  numberOfRooms: number;

  @ApiProperty({ 
    description: 'سعة كل مجموعة (عدد المتدربين في كل مجموعة) - اختياري. إذا لم يتم تحديده، سيتم التوزيع بالتساوي',
    type: [Number],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  roomCapacities?: number[];

  @ApiProperty({ 
    description: 'أسماء المجموعات - اختياري. إذا لم يتم تحديده، سيتم التسمية تلقائياً',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  roomNames?: string[];

  @ApiProperty({ 
    description: 'معرف الفصل الدراسي - اختياري. إذا لم يتم تحديده تكون التوزيعة عامة للبرنامج',
    required: false
  })
  @IsOptional()
  @IsInt()
  classroomId?: number;

  @ApiProperty({ description: 'طريقة التوزيع', enum: DistributionAssignmentMode, required: false })
  @IsOptional()
  @IsEnum(DistributionAssignmentMode)
  assignmentMode?: DistributionAssignmentMode;

  @ApiProperty({ description: 'تاريخ بداية التسجيل', required: false })
  @IsOptional()
  @IsDateString()
  registrationStartDate?: string;

  @ApiProperty({ description: 'تاريخ نهاية التسجيل', required: false })
  @IsOptional()
  @IsDateString()
  registrationEndDate?: string;

  @ApiProperty({ description: 'هل يظهر للمتدربين للتسجيل الذاتي', required: false })
  @IsOptional()
  @IsBoolean()
  isVisibleToTrainees?: boolean;
}
