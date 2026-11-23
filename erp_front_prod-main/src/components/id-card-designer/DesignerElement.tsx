"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { 
  IdCardElement, 
  RESIZE_HANDLES 
} from '@/types/id-card-design';
import { getImageUrl } from '@/lib/api';
import '../../styles/image-shapes-force.css';
import {
  UserIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface DesignerElementProps {
  element: IdCardElement;
  scale: number;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: () => void;
  onResizeStart: (handle: string) => void;
  onResize: (handle: string, deltaX: number, deltaY: number) => void;
  onResizeEnd: () => void;
  readOnly?: boolean;
}

export default function DesignerElement({
  element,
  scale,
  isSelected,
  isDragging,
  isResizing,
  onMouseDown,
  onSelect,
  onResizeStart,
  onResize,
  onResizeEnd,
  readOnly = false
}: DesignerElementProps) {
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  // دالة للحصول على CSS الخاص بشكل الصورة
  const getImageShapeStyles = (element: IdCardElement) => {
    const shape = element.imageShape?.type || 'square';
    const borderRadius = element.imageShape?.borderRadius || 10;
    
    // console.log('شكل الصورة في المحرر:', {
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

  // حساب المواضع والأحجام مع التكبير/التصغير
  const scaledPosition = {
    x: element.position.x * scale,
    y: element.position.y * scale,
  };
  
  const scaledSize = {
    width: element.size.width * scale,
    height: element.size.height * scale,
  };

  // معالجة بدء تغيير الحجم
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    if (readOnly || element.locked) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // تحديد العنصر أولاً
    onSelect();
    
    setResizeHandle(handle);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    onResizeStart(handle);
  }, [readOnly, element.locked, onResizeStart, onSelect]);

  // معالجة حركة الماوس أثناء تغيير الحجم
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeHandle || !lastMousePos || readOnly || element.locked) return;

    // حساب التراكم من النقطة الأولى
    const deltaX = (e.clientX - lastMousePos.x) / scale;
    const deltaY = (e.clientY - lastMousePos.y) / scale;
    
    onResize(resizeHandle, deltaX, deltaY);
    // لا نحدث lastMousePos هنا - نبقيه ثابت للتراكم الصحيح
  }, [resizeHandle, lastMousePos, scale, onResize, readOnly, element.locked]);

  // معالجة انتهاء تغيير الحجم
  const handleMouseUp = useCallback(() => {
    if (resizeHandle) {
      setResizeHandle(null);
      setLastMousePos(null);
      onResizeEnd();
    }
  }, [resizeHandle, onResizeEnd]);

  // إضافة وإزالة event listeners
  useEffect(() => {
    if (resizeHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeHandle, handleMouseMove, handleMouseUp]);

  // رسم المحتوى حسب نوع العنصر
  const renderContent = () => {
    const style = {
      width: '100%',
      height: '100%',
      fontSize: element.style?.fontSize ? `${element.style.fontSize * scale}px` : undefined,
      fontFamily: element.style?.fontFamily || 'Arial, sans-serif',
      fontWeight: element.style?.fontWeight || 'bold',
      fontStyle: element.style?.fontStyle,
      textDecoration: element.style?.textDecoration,
      color: element.style?.color || '#000000',
      backgroundColor: element.style?.backgroundColor,
      textAlign: 'right', // جعل جميع النصوص من اليمين
      padding: element.style?.padding ? `${element.style.padding * scale}px` : '2px',
      borderRadius: element.style?.borderRadius ? `${element.style.borderRadius * scale}px` : undefined,
      border: element.style?.border,
      opacity: element.style?.opacity,
      transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end', // محاذاة لليمين
      direction: 'rtl', // اتجاه النص من اليمين لليسار
      pointerEvents: 'none',
      overflow: 'visible',
      whiteSpace: 'nowrap',
    };

    switch (element.type) {
      case 'text':
        return (
          <div style={style}>
            {element.content || 'نص'}
          </div>
        );

      case 'image':
      case 'logo':
        if (element.content) {
          const imageShapeStyles = getImageShapeStyles(element);
          return (
            <div 
              style={{ 
                ...style, 
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
              <img
                src={getImageUrl(element.content)}
                alt={element.type}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                draggable={false}
              />
            </div>
          );
        }
        return (
          <div style={{ ...style, backgroundColor: '#f3f4f6' }}>
            {element.type === 'logo' ? (
              <BuildingOffice2Icon className="w-8 h-8 text-gray-400 mx-auto" />
            ) : (
              <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto" />
            )}
          </div>
        );

      case 'qr':
        return (
          <div style={{ ...style, backgroundColor: '#f3f4f6' }}>
            <QrCodeIcon className="w-8 h-8 text-gray-400 mx-auto" />
          </div>
        );

      default:
        return (
          <div style={{ ...style, backgroundColor: '#f3f4f6' }}>
            <UserIcon className="w-8 h-8 text-gray-400 mx-auto" />
          </div>
        );
    }
  };

  // رسم مقابض تغيير الحجم
  const renderResizeHandles = () => {
    if (!isSelected || readOnly || element.locked) return null;

    return RESIZE_HANDLES.map(handle => {
      const handleSize = 12; // زيادة حجم المقابض
      let handleStyle: React.CSSProperties = {
        position: 'absolute',
        width: `${handleSize}px`,
        height: `${handleSize}px`,
        backgroundColor: '#2563eb',
        border: '2px solid white',
        borderRadius: '50%',
        cursor: handle.cursor,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.1s ease',
      };

      // تحديد موضع المقبض
      switch (handle.position) {
        case 'nw':
          handleStyle.top = `-${handleSize / 2}px`;
          handleStyle.left = `-${handleSize / 2}px`;
          break;
        case 'n':
          handleStyle.top = `-${handleSize / 2}px`;
          handleStyle.left = `${scaledSize.width / 2 - handleSize / 2}px`;
          break;
        case 'ne':
          handleStyle.top = `-${handleSize / 2}px`;
          handleStyle.right = `-${handleSize / 2}px`;
          break;
        case 'e':
          handleStyle.top = `${scaledSize.height / 2 - handleSize / 2}px`;
          handleStyle.right = `-${handleSize / 2}px`;
          break;
        case 'se':
          handleStyle.bottom = `-${handleSize / 2}px`;
          handleStyle.right = `-${handleSize / 2}px`;
          break;
        case 's':
          handleStyle.bottom = `-${handleSize / 2}px`;
          handleStyle.left = `${scaledSize.width / 2 - handleSize / 2}px`;
          break;
        case 'sw':
          handleStyle.bottom = `-${handleSize / 2}px`;
          handleStyle.left = `-${handleSize / 2}px`;
          break;
        case 'w':
          handleStyle.top = `${scaledSize.height / 2 - handleSize / 2}px`;
          handleStyle.left = `-${handleSize / 2}px`;
          break;
      }

      return (
        <div
          key={handle.position}
          className="resize-handle hover:scale-110 active:scale-125"
          style={handleStyle}
          onMouseDown={(e) => handleResizeStart(e, handle.position)}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#2563eb';
          }}
        />
      );
    });
  };

  return (
    <div
      className={`absolute select-none transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        element.locked ? 'opacity-75' : ''
      }`}
      style={{
        left: `${scaledPosition.x}px`,
        top: `${scaledPosition.y}px`,
        width: `${scaledSize.width}px`,
        height: `${scaledSize.height}px`,
        zIndex: element.zIndex || 1,
        transform: element.style?.rotation ? `rotate(${element.style.rotation}deg)` : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onMouseDown={!readOnly && !element.locked ? onMouseDown : undefined}
      onClick={onSelect}
    >
      {/* محتوى العنصر */}
      {renderContent()}

      {/* مقابض تغيير الحجم */}
      {renderResizeHandles()}

      {/* مؤشر القفل */}
      {element.locked && (
        <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded">
          🔒
        </div>
      )}

      {/* مؤشر النوع */}
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {element.type === 'text' && 'نص'}
          {element.type === 'image' && 'صورة'}
          {element.type === 'logo' && 'شعار'}
          {element.type === 'qr' && 'QR'}
        </div>
      )}
    </div>
  );
}
