"use client";

import React from 'react';
import { getImageUrl } from '@/lib/api';
import '../../styles/id-card-print.css';

interface OptimizedIdCardImageProps {
  src: string;
  alt: string;
  width: number | string;
  height: number | string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  objectFit?: 'fill' | 'contain' | 'cover' | 'scale-down' | 'none';
  imageType?: 'trainee-photo' | 'logo-image' | 'qr-code'; // نوع الصورة لتطبيق CSS مناسب
  imageShape?: 'square' | 'circle' | 'rounded'; // شكل الصورة
}

/**
 * مكون محسن لعرض الصور في الكارنيهات
 * يضمن أن الصور تحترم الأحجام المحددة في الإعدادات
 * ويملأ المساحة المحددة بالكامل بدون تجاوزها
 */
export default function OptimizedIdCardImage({
  src,
  alt,
  width,
  height,
  className = "",
  style = {},
  draggable = false,
  objectFit = 'fill', // القيمة الافتراضية للملء الكامل
  imageType = 'trainee-photo', // القيمة الافتراضية للصورة الشخصية
  imageShape = 'square' // الشكل الافتراضي
}: OptimizedIdCardImageProps) {
  
  // تحديد ما إذا كانت هناك حدود في الـ style
  const hasBorder = style.border || style.borderWidth || style.borderColor || style.borderStyle;
  
  const optimizedStyle: React.CSSProperties = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    objectFit,
    objectPosition: 'center',
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'block', // لضمان عدم وجود مساحات إضافية
  };

  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      style={optimizedStyle}
      className={`id-card-image ${imageType} id-card-optimized-image fill-container image-shape-${imageShape} ${hasBorder ? 'id-card-image-with-border' : 'no-spacing'} ${className}`}
      draggable={draggable}
      loading="lazy" // تحسين الأداء
      onError={(e) => {
        // في حالة فشل تحميل الصورة، اعرض placeholder
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        console.warn(`فشل في تحميل الصورة: ${src}`);
      }}
    />
  );
}

/**
 * مكون placeholder للصور التي لم يتم تحميلها بعد أو فشلت في التحميل
 */
export function IdCardImagePlaceholder({
  width,
  height,
  children,
  className = "",
  style = {}
}: {
  width: number | string;
  height: number | string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`id-card-image-container bg-gray-100 flex items-center justify-center no-spacing ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
