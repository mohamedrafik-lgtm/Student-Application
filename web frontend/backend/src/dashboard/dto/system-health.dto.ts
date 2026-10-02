import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthDto {
  @ApiProperty({ description: 'حالة الاتصال' })
  connected: boolean;

  @ApiProperty({ description: 'وقت الاستجابة (ms)' })
  responseTime: number;

  @ApiProperty({ description: 'نوع قاعدة البيانات' })
  type: string;
}

export class RedisHealthDto {
  @ApiProperty({ description: 'حالة الاتصال' })
  connected: boolean;

  @ApiProperty({ description: 'وقت الاستجابة (ms)' })
  responseTime?: number;

  @ApiProperty({ description: 'رسالة الخطأ' })
  error?: string;
}

export class CloudinaryHealthDto {
  @ApiProperty({ description: 'حالة الاتصال' })
  connected: boolean;

  @ApiProperty({ description: 'اسم الحساب' })
  cloudName?: string;

  @ApiProperty({ description: 'رسالة الخطأ' })
  error?: string;
}

export class WhatsAppHealthDto {
  @ApiProperty({ description: 'حالة الاتصال' })
  connected: boolean;

  @ApiProperty({ description: 'جاهز للإرسال' })
  ready: boolean;

  @ApiProperty({ description: 'رقم الهاتف' })
  phoneNumber?: string;

  @ApiProperty({ description: 'نوع التخزين' })
  storageType: string;

  @ApiProperty({ description: 'عدد الجلسات المحفوظة' })
  sessionsCount?: number;
}

export class SystemResourcesDto {
  @ApiProperty({ description: 'استخدام RAM (%)' })
  memoryUsagePercent: number;

  @ApiProperty({ description: 'RAM المستخدمة (MB)' })
  memoryUsedMB: number;

  @ApiProperty({ description: 'إجمالي RAM (MB)' })
  memoryTotalMB: number;

  @ApiProperty({ description: 'استخدام CPU (%)' })
  cpuUsagePercent: number;

  @ApiProperty({ description: 'وقت التشغيل (ثواني)' })
  uptimeSeconds: number;

  @ApiProperty({ description: 'نظام التشغيل' })
  platform: string;

  @ApiProperty({ description: 'إصدار Node.js' })
  nodeVersion: string;
}

export class SystemHealthResponseDto {
  @ApiProperty({ description: 'حالة النظام العامة' })
  healthy: boolean;

  @ApiProperty({ description: 'الطابع الزمني' })
  timestamp: Date;

  @ApiProperty({ description: 'حالة قاعدة البيانات' })
  database: DatabaseHealthDto;

  @ApiProperty({ description: 'حالة Redis' })
  redis: RedisHealthDto;

  @ApiProperty({ description: 'حالة Cloudinary' })
  cloudinary: CloudinaryHealthDto;

  @ApiProperty({ description: 'حالة WhatsApp' })
  whatsapp: WhatsAppHealthDto;

  @ApiProperty({ description: 'موارد النظام' })
  resources: SystemResourcesDto;
}

