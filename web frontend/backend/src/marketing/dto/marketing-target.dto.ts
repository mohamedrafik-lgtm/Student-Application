import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMarketingTargetDto {
  @ApiProperty({ description: 'معرف موظف التسويق' })
  @Type(() => Number)
  @IsInt({ message: 'معرف الموظف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الموظف غير صحيح' })
  employeeId: number;

  @ApiProperty({ description: 'الشهر (1-12)' })
  @Type(() => Number)
  @IsInt({ message: 'الشهر يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  month: number;

  @ApiProperty({ description: 'السنة' })
  @Type(() => Number)
  @IsInt({ message: 'السنة يجب أن تكون رقم صحيح' })
  @Min(2020, { message: 'السنة يجب أن تكون 2020 أو أكثر' })
  @Max(2050, { message: 'السنة يجب أن تكون 2050 أو أقل' })
  year: number;

  @ApiProperty({ description: 'الهدف المطلوب (عدد التقديمات)' })
  @Type(() => Number)
  @IsInt({ message: 'الهدف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'الهدف يجب أن يكون 1 على الأقل' })
  @Max(1000, { message: 'الهدف يجب أن يكون 1000 على الأكثر' })
  targetAmount: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'من قام بتحديد الهدف' })
  @IsOptional()
  @IsString()
  setById?: string;
}

export class UpdateMarketingTargetDto {
  @ApiPropertyOptional({ description: 'الهدف المطلوب (عدد التقديمات)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'الهدف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'الهدف يجب أن يكون 1 على الأقل' })
  @Max(1000, { message: 'الهدف يجب أن يكون 1000 على الأكثر' })
  targetAmount?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'من قام بتحديد الهدف' })
  @IsOptional()
  @IsString()
  setById?: string;
}
