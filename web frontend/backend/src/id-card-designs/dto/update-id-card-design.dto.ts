import { PartialType } from '@nestjs/mapped-types';
import { CreateIdCardDesignDto } from './create-id-card-design.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateIdCardDesignDto extends PartialType(CreateIdCardDesignDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // حالة التصميم
}
