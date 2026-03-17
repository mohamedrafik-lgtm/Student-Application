import { IsInt, Min, IsEnum, IsNotEmpty, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'معرف الفصل الدراسي - اختياري. إذا لم يتم تحديده تكون التوزيعة عامة للبرنامج',
    required: false
  })
  @IsOptional()
  @IsInt()
  classroomId?: number;
}
