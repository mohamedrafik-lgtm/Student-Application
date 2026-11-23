import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsBoolean, 
  IsDateString,
  Min,
  Max,
  ValidateIf
} from 'class-validator';

export enum ReminderTriggerType {
  PAYMENT_START = 'PAYMENT_START',       // عند بداية موعد السداد
  PAYMENT_END = 'PAYMENT_END',           // عند نهاية موعد السداد
  GRACE_START = 'GRACE_START',           // عند بداية فترة السماح
  GRACE_END = 'GRACE_END',               // عند نهاية فترة السماح (الموعد النهائي)
  CUSTOM_DATE = 'CUSTOM_DATE',           // تاريخ مخصص
  DAYS_BEFORE_END = 'DAYS_BEFORE_END',   // X أيام قبل النهاية
  DAYS_AFTER_START = 'DAYS_AFTER_START', // X أيام بعد البداية
}

export class CreateReminderTemplateDto {
  @ApiProperty({ 
    description: 'اسم الرسالة التذكيرية',
    example: 'تذكير بداية موعد السداد'
  })
  @IsNotEmpty({ message: 'اسم الرسالة مطلوب' })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  name: string;

  @ApiProperty({ 
    description: 'محتوى الرسالة (مع متغيرات)',
    example: 'عزيزي {{trainee_name}}، تذكير بأن موعد سداد {{fee_name}} قد بدأ...'
  })
  @IsNotEmpty({ message: 'محتوى الرسالة مطلوب' })
  @IsString({ message: 'المحتوى يجب أن يكون نصاً' })
  message: string;

  @ApiProperty({ 
    description: 'وصف الرسالة',
    example: 'رسالة تذكير ترسل عند بداية موعد السداد',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً' })
  description?: string;

  @ApiProperty({ 
    description: 'معرف الرسم المرتبط',
    example: 1
  })
  @IsNotEmpty({ message: 'معرف الرسم مطلوب' })
  @IsNumber({}, { message: 'معرف الرسم يجب أن يكون رقماً' })
  feeId: number;

  @ApiProperty({ 
    description: 'نوع توقيت الإرسال',
    enum: ReminderTriggerType,
    example: ReminderTriggerType.PAYMENT_START
  })
  @IsNotEmpty({ message: 'نوع التوقيت مطلوب' })
  @IsEnum(ReminderTriggerType, { message: 'نوع التوقيت غير صالح' })
  triggerType: ReminderTriggerType;

  @ApiProperty({ 
    description: 'التاريخ المخصص (مطلوب فقط عند اختيار CUSTOM_DATE)',
    example: '2025-02-15',
    required: false
  })
  @ValidateIf(o => o.triggerType === ReminderTriggerType.CUSTOM_DATE)
  @IsNotEmpty({ message: 'التاريخ المخصص مطلوب عند اختيار توقيت مخصص' })
  @IsDateString({}, { message: 'التاريخ المخصص يجب أن يكون بصيغة صحيحة' })
  customTriggerDate?: string;

  @ApiProperty({ 
    description: 'عدد الأيام (للأنواع DAYS_BEFORE_END و DAYS_AFTER_START)',
    example: 3,
    required: false,
    minimum: 1,
    maximum: 90
  })
  @ValidateIf(o => 
    o.triggerType === ReminderTriggerType.DAYS_BEFORE_END || 
    o.triggerType === ReminderTriggerType.DAYS_AFTER_START
  )
  @IsNumber({}, { message: 'عدد الأيام يجب أن يكون رقماً' })
  @Min(1, { message: 'عدد الأيام يجب أن يكون على الأقل 1' })
  @Max(90, { message: 'عدد الأيام لا يمكن أن يزيد عن 90' })
  daysOffset?: number;

  @ApiProperty({ 
    description: 'التأخير بين الرسائل (بالثواني)',
    example: 30,
    required: false,
    default: 30,
    minimum: 30,
    maximum: 300
  })
  @IsOptional()
  @IsNumber({}, { message: 'التأخير يجب أن يكون رقماً' })
  @Min(30, { message: 'التأخير يجب أن يكون على الأقل 30 ثانية' })
  @Max(300, { message: 'التأخير لا يمكن أن يزيد عن 300 ثانية (5 دقائق)' })
  delayBetweenMessages?: number;

  @ApiProperty({ 
    description: 'حالة نشاط الرسالة',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'الحالة يجب أن تكون قيمة منطقية' })
  isActive?: boolean;
}