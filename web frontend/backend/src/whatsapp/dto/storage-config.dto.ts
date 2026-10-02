import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StorageType {
  FILE = 'file',
  DATABASE = 'database'
}

export class StorageConfigDto {
  @ApiProperty({ 
    enum: StorageType, 
    example: StorageType.DATABASE,
    description: 'نوع التخزين: file (ملفات) أو database (قاعدة بيانات)' 
  })
  @IsEnum(StorageType)
  storageType: StorageType;
}
