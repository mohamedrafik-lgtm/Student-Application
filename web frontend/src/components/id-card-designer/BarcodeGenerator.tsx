"use client";

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string; // القيمة المراد تحويلها إلى barcode (الرقم القومي)
  width?: number;
  height?: number;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'CODE128B'; // نوع الBarcode
  className?: string;
  style?: React.CSSProperties;
  displayValue?: boolean; // إظهار النص تحت الBarcode
  fontSize?: number; // حجم خط النص
  textMargin?: number; // المسافة بين الBarcode والنص
  background?: string; // لون الخلفية
  lineColor?: string; // لون الخطوط
}

/**
 * مكون لإنتاج Barcode باستخدام jsbarcode المحترف
 * ينتج باركود عالي الجودة بدون خلفية
 */
export default function BarcodeGenerator({
  value,
  width = 200,
  height = 50,
  format = 'CODE128',
  className = '',
  style = {},
  displayValue = true,
  fontSize = 12,
  textMargin = 2,
  background = 'transparent', // خلفية شفافة افتراضياً
  lineColor = '#000000'
}: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // استخدام الألوان من style إذا كانت متوفرة
  const finalLineColor = (style as any)?.lineColor || lineColor;
  const finalBackground = (style as any)?.background || background;

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    try {
      // استخدام jsbarcode لإنتاج باركود محترف
      JsBarcode(canvas, value, {
        format: format,
        width: Math.max(1, Math.floor(width / 100)), // عرض الخط النسبي
        height: Math.floor(height * 0.6), // ارتفاع الخطوط (60% من الارتفاع الكلي)
        displayValue: displayValue,
        fontSize: fontSize,
        textMargin: textMargin,
        background: background, // خلفية شفافة
        lineColor: lineColor,
        margin: 0, // بدون هامش
        text: value, // النص المعروض
        textAlign: 'center',
        textPosition: 'bottom',
        font: 'monospace',
        fontOptions: 'bold'
      });
    } catch (error) {
      console.error('Error generating barcode with jsbarcode:', error);
      // في حالة فشل إنتاج Barcode، اعرض placeholder
      drawFallbackPlaceholder(canvas, value, width, height);
    }
  }, [value, width, height, format, displayValue, fontSize, textMargin, finalBackground, finalLineColor]);

  // دالة fallback لعرض placeholder في حالة فشل إنتاج Barcode
  const drawFallbackPlaceholder = (
    canvas: HTMLCanvasElement,
    text: string,
    w: number,
    h: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // تنظيف Canvas
    ctx.clearRect(0, 0, w, h);
    
    // رسم إطار متقطع
    ctx.strokeStyle = '#9CA3AF';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(2, 2, w - 4, h - 4);
    
    // رسم نص placeholder
    ctx.fillStyle = '#6B7280';
    ctx.font = `${Math.min(12, h / 4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BARCODE', w / 2, h / 2 - 5);
    ctx.font = `${Math.min(10, h / 5)}px monospace`;
    ctx.fillText(text, w / 2, h / 2 + 10);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`barcode-canvas ${className}`}
      style={{
        ...style,
        maxWidth: '100%',
        maxHeight: '100%',
        background: 'transparent', // تأكيد الخلفية الشفافة
      }}
    />
  );
}

/**
 * Hook لإنتاج Barcode كـ Data URL باستخدام jsbarcode
 */
export const useBarcodeDataURL = (
  value: string,
  width: number = 200,
  height: number = 50,
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' = 'CODE128'
): string | null => {
  const [dataURL, setDataURL] = React.useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataURL(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    try {
      // استخدام jsbarcode لإنتاج باركود محترف
      JsBarcode(canvas, value, {
        format: format,
        width: Math.max(1, Math.floor(width / 100)),
        height: Math.floor(height * 0.6),
        displayValue: true,
        fontSize: 12,
        textMargin: 2,
        background: 'transparent',
        lineColor: '#000000',
        margin: 0,
        text: value,
        textAlign: 'center',
        textPosition: 'bottom',
        font: 'monospace',
        fontOptions: 'bold'
      });

      setDataURL(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Error generating barcode data URL:', error);
      setDataURL(null);
    }
  }, [value, width, height, format]);

  return dataURL;
};
