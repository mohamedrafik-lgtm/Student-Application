import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// تعريف العنصر الواحد في التصميم
export class IdCardElementDto {
  @IsString()
  id: string; // معرف فريد للعنصر

  @IsString()
  type: string; // نوع العنصر (text, image, logo, qr, etc.)

  @IsObject()
  position: {
    x: number;
    y: number;
  };

  @IsObject()
  size: {
    width: number;
    height: number;
  };

  @IsOptional()
  @IsObject()
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    padding?: number;
    borderRadius?: number;
    border?: string;
    opacity?: number;
    rotation?: number; // زاوية الدوران بالدرجات
  };

  @IsOptional()
  @IsString()
  content?: string; // المحتوى النصي أو مسار الصورة

  @IsOptional()
  @IsObject()
  data?: any; // بيانات إضافية خاصة بالعنصر

  @IsBoolean()
  @IsOptional()
  visible?: boolean; // هل العنصر مرئي

  @IsOptional()
  @IsNumber()
  zIndex?: number; // ترتيب العنصر في الطبقات

  @IsOptional()
  @IsBoolean()
  locked?: boolean; // هل العنصر مقفل (غير قابل للتحرير)
}

export class CreateIdCardDesignDto {
  @IsString()
  name: string; // اسم التصميم

  @IsOptional()
  @IsString()
  description?: string; // وصف التصميم

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean; // هل هو التصميم الافتراضي العام

  @IsOptional()
  @IsNumber()
  programId?: number; // معرف البرنامج التدريبي (null = تصميم عام)

  @IsOptional()
  @IsBoolean()
  isProgramDefault?: boolean; // هل هو التصميم الافتراضي لهذا البرنامج

  @IsNumber()
  @Min(100)
  @Max(2500) // دعم حتى 600 DPI للأحجام الكبيرة
  width: number; // عرض الكارنيه

  @IsNumber()
  @Min(60)
  @Max(1500) // دعم حتى 600 DPI للأحجام الكبيرة
  height: number; // ارتفاع الكارنيه

  @IsOptional()
  @IsString()
  backgroundImage?: string; // مسار صورة الخلفية

  @IsOptional()
  @IsString()
  backgroundColor?: string; // لون الخلفية

  @IsArray()
  @Type(() => IdCardElementDto)
  elements: IdCardElementDto[]; // العناصر الموجودة في التصميم

  @IsOptional()
  @IsString()
  version?: string; // إصدار التصميم

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // علامات التصنيف
}
