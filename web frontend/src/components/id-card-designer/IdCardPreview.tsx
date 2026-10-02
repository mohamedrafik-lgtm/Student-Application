"use client";

import React from 'react';
import { IdCardDesign, IdCardElement } from '@/types/id-card-design';
import { getImageUrl } from '@/lib/api';
import OptimizedIdCardImage, { IdCardImagePlaceholder } from './OptimizedIdCardImage';
import BarcodeGenerator from './BarcodeGenerator';
import '../../styles/id-card-print.css';
import '../../styles/image-shapes-force.css';
import {
  UserIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  QrCodeIcon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/24/outline';

interface IdCardPreviewProps {
  design: IdCardDesign;
  traineeData: {
    nameAr: string;
    nationalId: string;
    photoUrl?: string;
    program: { nameAr: string };
    id?: string | number; // معرف المتدرب (رقم المتدرب)
  };
  centerData: {
    centerName: string;
    centerLogo?: string;
  };
  qrCodeDataUrl?: string;
  scale?: number;
  className?: string;
}

export default function IdCardPreview({
  design,
  traineeData,
  centerData,
  qrCodeDataUrl,
  scale = 1,
  className = ""
}: IdCardPreviewProps) {
  // حساب الأبعاد مع التكبير/التصغير
  const scaledWidth = design.width * scale;
  const scaledHeight = design.height * scale;
  
  // دالة للحصول على CSS الخاص بشكل الصورة
  const getImageShapeStyles = (element: IdCardElement) => {
    const shape = element.imageShape?.type || 'square';
    const borderRadius = element.imageShape?.borderRadius || 10;
    
    // console.log('شكل الصورة:', {
    //   elementId: element.id,
    //   shape: shape,
    //   borderRadius: borderRadius,
    //   fullImageShape: element.imageShape
    // });
    
    switch (shape) {
      case 'circle':
        return { borderRadius: '50%' };
      case 'rounded':
        return { borderRadius: `${borderRadius}px` };
      case 'square':
      default:
        return { borderRadius: '0' };
    }
  };

  // دالة لتطبيق الحدود على العنصر
  const applyBorderStyle = (element: IdCardElement, baseStyle: React.CSSProperties): React.CSSProperties => {
    if (element.border?.enabled) {
      return {
        ...baseStyle,
        border: `${element.border.width * scale}px ${element.border.style} ${element.border.color}`,
        boxSizing: 'border-box',
      };
    }
    return baseStyle;
  };

  // رسم محتوى العنصر حسب نوعه
  const renderElementContent = (element: IdCardElement) => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      fontSize: element.style?.fontSize ? `${element.style.fontSize * scale}px` : '14px',
      fontFamily: element.style?.fontFamily || 'Arial, sans-serif',
      fontWeight: element.style?.fontWeight || 'bold',
      fontStyle: element.style?.fontStyle,
      textDecoration: element.style?.textDecoration,
      color: element.style?.color || '#000000',
      backgroundColor: element.style?.backgroundColor,
      textAlign: element.style?.textAlign || 'right', // استخدام النص الأصلي من التصميم
      padding: element.style?.padding ? `${element.style.padding * scale}px` : '2px',
      borderRadius: element.style?.borderRadius ? `${element.style.borderRadius * scale}px` : undefined,
      opacity: element.style?.opacity || 1,
      transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: element.style?.textAlign === 'center' ? 'center' : 
                     element.style?.textAlign === 'left' ? 'flex-start' : 'flex-end',
      direction: element.style?.direction || 'rtl',
      pointerEvents: 'none',
      overflow: 'visible',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    };

    const style = applyBorderStyle(element, baseStyle);

    // تحديد المحتوى الفعلي للعنصر - فقط البيانات بدون تسميات
    let content = '';
    
    // إضافة logging للتشخيص
    if (element.type === 'text') {
      console.log(`IdCardPreview - معالجة عنصر نص: id=${element.id}, content="${element.content}"`);
    }
    
    // استبدال البيانات الديناميكية - فحص أولوية للـ ID ثم المحتوى
    if (element.id === 'name') {
      // عرض أول 4 كلمات فقط من الاسم
      const nameWords = traineeData.nameAr ? traineeData.nameAr.split(' ').filter(word => word.trim()) : [];
      content = nameWords.slice(0, 4).join(' ');
    } else if (element.id === 'nationalId') {
      content = traineeData.nationalId; // فقط الرقم بدون "الرقم القومي:"
    } else if (element.id === 'program') {
      content = traineeData.program.nameAr; // فقط اسم البرنامج بدون "البرنامج:"
    } else if (element.id === 'traineeId') {
      content = traineeData.id ? String(traineeData.id) : ''; // رقم المتدرب
      console.log(`IdCardPreview - استبدال رقم المتدرب (بـ ID): ${content} (ID الفعلي: ${traineeData.id})`);
    } else if (element.id === 'centerName') {
      content = centerData.centerName;
    } else if (element.id === 'additionalText') {
      content = element.content || '';
    }
    // فحص المحتوى كـ fallback إذا لم يتم العثور على ID مطابق
    else if (element.content?.includes('اسم المتدرب') || element.content === 'اسم المتدرب') {
      const nameWords = traineeData.nameAr ? traineeData.nameAr.split(' ').filter(word => word.trim()) : [];
      content = nameWords.slice(0, 4).join(' ');
    } else if (element.content?.includes('الرقم القومي') || element.content === 'الرقم القومي') {
      content = traineeData.nationalId;
    } else if (element.content?.includes('البرنامج') || element.content === 'البرنامج') {
      content = traineeData.program.nameAr;
    } else if (element.content?.includes('رقم المتدرب') || element.content === 'رقم المتدرب') {
      content = traineeData.id ? String(traineeData.id) : '';
      if (element.type === 'text') {
        console.log(`IdCardPreview - استبدال رقم المتدرب (بالمحتوى): ${content} (ID الفعلي: ${traineeData.id})`);
      }
    } else if (element.content?.includes('اسم المركز') || element.content === 'اسم المركز') {
      content = centerData.centerName;
    } else {
      // استخدام المحتوى الأصلي إذا لم يطابق أي شرط
      content = element.content || '';
      if (element.type === 'text' && element.content) {
        console.log(`IdCardPreview - لم يتم استبدال النص، سيبقى كما هو: "${content}"`);
      }
    }
    
    // إضافة logging للنتيجة النهائية
    if (element.type === 'text' && (element.id === 'traineeId' || element.content?.includes('رقم المتدرب'))) {
      console.log(`IdCardPreview - النتيجة النهائية لرقم المتدرب: "${content}"`);
    }

    switch (element.type) {
      case 'text':
        return (
          <div style={style} title={content}>
            {content}
          </div>
        );

      case 'image':
        // تحديد ما إذا كان هذا عنصر صورة المتدرب
        const isTraineePhoto = element.id === 'photo' || 
                              element.content === 'trainee-photo' ||
                              (element.data && element.data.dataSource === 'trainee-photo') ||
                              (!element.content && !element.data?.imageUrl); // عنصر صورة فارغ = صورة متدرب
        
        if (isTraineePhoto && traineeData.photoUrl) {
          const borderStyle = element.border?.enabled ? {
            border: `${element.border.width * scale}px ${element.border.style} ${element.border.color}`,
            boxSizing: 'border-box' as const,
          } : {};
          
          // تتبع الحدود للتأكد من تطبيقها
          if (element.border?.enabled) {
            console.log('تطبيق حدود على الصورة الشخصية:', borderStyle);
          }
          
          const imageShapeStyles = getImageShapeStyles(element);
          
          return (
            <div 
              style={{ 
                ...style, 
                ...borderStyle, 
                ...imageShapeStyles, 
                overflow: 'hidden',
                // إضافة CSS مباشر لضمان التطبيق
                WebkitBorderRadius: imageShapeStyles.borderRadius,
                MozBorderRadius: imageShapeStyles.borderRadius,
                // إجبار التطبيق بقوة
                borderRadius: imageShapeStyles.borderRadius + ' !important',
                clipPath: element.imageShape?.type === 'circle' 
                  ? 'circle(50%)' 
                  : element.imageShape?.type === 'rounded' 
                    ? `inset(0 round ${element.imageShape?.borderRadius || 10}px)`
                    : 'none',
              }}
              className={`image-shape-${element.imageShape?.type || 'square'}`}
            >
              <OptimizedIdCardImage
                src={traineeData.photoUrl}
                alt="صورة الطالب"
                width="100%"
                height="100%"
                style={{ 
                  width: '100%',
                  height: '100%',
                }}
                objectFit="cover" // تغيير إلى cover للحصول على نتيجة أفضل مع الأشكال
                imageType="trainee-photo"
                imageShape={element.imageShape?.type || 'square'}
                draggable={false}
              />
            </div>
          );
        }
        // إذا لم تكن هناك صورة، اعرض placeholder
        const borderStyle = element.border?.enabled ? {
          border: `${element.border.width * scale}px ${element.border.style} ${element.border.color}`,
          boxSizing: 'border-box' as const,
        } : {};
        
        return (
          <IdCardImagePlaceholder 
            width="100%" 
            height="100%" 
            className="bg-gray-100"
            style={borderStyle}
          >
            <PhotoIcon className="w-8 h-8 text-gray-400" style={{ transform: `scale(${scale})` }} />
          </IdCardImagePlaceholder>
        );

      case 'logo':
        // تحديد ما إذا كان هذا عنصر شعار المركز
        const isCenterLogo = element.id === 'logo' || 
                            element.content === 'center-logo' ||
                            (element.data && element.data.dataSource === 'center-logo') ||
                            element.type === 'logo'; // أي عنصر من نوع logo = شعار المركز
        
        if (isCenterLogo && centerData.centerLogo) {
          const borderStyle = element.border?.enabled ? {
            border: `${element.border.width * scale}px ${element.border.style} ${element.border.color}`,
            boxSizing: 'border-box' as const,
          } : {};
          
          const imageShapeStyles = getImageShapeStyles(element);
          
          return (
            <div 
              style={{ 
                ...style, 
                ...borderStyle, 
                ...imageShapeStyles, 
                overflow: 'hidden',
                // إضافة CSS مباشر لضمان التطبيق
                WebkitBorderRadius: imageShapeStyles.borderRadius,
                MozBorderRadius: imageShapeStyles.borderRadius,
                // إجبار التطبيق بقوة
                borderRadius: imageShapeStyles.borderRadius + ' !important',
                clipPath: element.imageShape?.type === 'circle' 
                  ? 'circle(50%)' 
                  : element.imageShape?.type === 'rounded' 
                    ? `inset(0 round ${element.imageShape?.borderRadius || 10}px)`
                    : 'none',
              }}
              className={`image-shape-${element.imageShape?.type || 'square'}`}
            >
              <OptimizedIdCardImage
                src={centerData.centerLogo}
                alt="شعار المركز"
                width="100%"
                height="100%"
                style={{ 
                  width: '100%',
                  height: '100%',
                }}
                objectFit="contain" // استخدام contain للشعار للحفاظ على نسبة العرض إلى الارتفاع
                imageType="logo-image"
                imageShape={element.imageShape?.type || 'square'}
                draggable={false}
              />
            </div>
          );
        }
        const logoPlaceholderBorderStyle = element.border?.enabled ? {
          border: `${element.border.width * scale}px ${element.border.style} ${element.border.color}`,
          boxSizing: 'border-box' as const,
        } : {};
        
        return (
          <IdCardImagePlaceholder 
            width="100%" 
            height="100%" 
            className="bg-gray-100"
            style={logoPlaceholderBorderStyle}
          >
            <BuildingOffice2Icon className="w-8 h-8 text-gray-400" style={{ transform: `scale(${scale})` }} />
          </IdCardImagePlaceholder>
        );

      case 'qr':
        if (qrCodeDataUrl) {
          return (
            <img
              src={qrCodeDataUrl}
              alt="QR Code"
              style={{
                ...style,
                objectFit: 'contain', // الحفاظ على contain للQR Code لضمان قابليته للقراءة
                objectPosition: 'center',
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                height: '100%',
              }}
              draggable={false}
            />
          );
        }
        return (
          <div style={{ ...style, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCodeIcon className="w-8 h-8 text-gray-400" style={{ transform: `scale(${scale})` }} />
          </div>
        );

      case 'barcode':
        if (traineeData.nationalId) {
          return (
            <div style={style}>
              <BarcodeGenerator
                value={traineeData.nationalId}
                width={element.size.width * scale}
                height={element.size.height * scale}
                format="CODE128"
                background={(element.style as {background?: string; lineColor?: string})?.background || 'transparent'}
                lineColor={(element.style as {background?: string; lineColor?: string})?.lineColor || '#000000'}
                displayValue={true}
                fontSize={Math.max(8, Math.floor((element.size.height * scale) / 4))}
                style={{
                  width: '100%',
                  height: '100%',
                  ...(element.style || {}),
                }}
              />
            </div>
          );
        }
        return (
          <div style={{ ...style, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bars3BottomLeftIcon className="w-8 h-8 text-gray-400" style={{ transform: `scale(${scale})` }} />
          </div>
        );

      default:
        return (
          <IdCardImagePlaceholder width="100%" height="100%" className="bg-gray-100">
            <UserIcon className="w-8 h-8 text-gray-400" style={{ transform: `scale(${scale})` }} />
          </IdCardImagePlaceholder>
        );
    }
  };

  return (
    <div className={`relative id-card-preview ${className}`}>
      <div
        className="relative bg-white overflow-hidden id-card-preview"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          backgroundImage: design.backgroundImage 
            ? `url(${getImageUrl(design.backgroundImage)})` 
            : undefined,
          backgroundColor: design.backgroundColor || '#ffffff',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: className?.includes('shadow-none') ? 'none' : '2px solid #d1d5db',
          borderRadius: className?.includes('shadow-none') ? '0' : '8px',
          boxShadow: className?.includes('shadow-none') ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* عرض العناصر */}
        {design.designData.elements
          .filter(el => el.visible)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map(element => (
            <div
              key={element.id}
              className="absolute id-card-element id-card-image-container"
              style={{
                left: `${element.position.x * scale}px`,
                top: `${element.position.y * scale}px`,
                width: `${element.size.width * scale}px`,
                height: `${element.size.height * scale}px`,
                zIndex: element.zIndex || 1,
                transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : undefined,
              }}
            >
              {renderElementContent(element)}
            </div>
          ))}
      </div>
    </div>
  );
}
