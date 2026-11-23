"use client";

import React, { useState, useEffect } from 'react';
import { IdCardElement } from '@/types/id-card-design';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  TrashIcon,
  DocumentDuplicateIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface ElementPropertiesPanelProps {
  selectedElement: IdCardElement | null;
  onUpdateElement: (elementId: string, updates: Partial<IdCardElement>) => void;
  onRemoveElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  readOnly?: boolean;
}

export default function ElementPropertiesPanel({
  selectedElement,
  onUpdateElement,
  onRemoveElement,
  onDuplicateElement,
  readOnly = false
}: ElementPropertiesPanelProps) {
  const [localValues, setLocalValues] = useState({
    content: '',
    fontSize: 16,
    color: '#000000',
    backgroundColor: '',
    fontWeight: 'normal' as any,
    fontStyle: 'normal' as any,
    textDecoration: 'none' as any,
    textAlign: 'right' as any,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    // إعدادات الحدود
    borderEnabled: false,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid' as 'solid' | 'dashed' | 'dotted',
    // إعدادات الباركود
    lineColor: '#000000',
    background: 'transparent',
    // إعدادات شكل الصورة
    imageShapeType: 'square' as 'square' | 'circle' | 'rounded',
    imageBorderRadius: 10,
  });

  // تحديث القيم المحلية عند تغيير العنصر المحدد
  useEffect(() => {
    if (selectedElement) {
      setLocalValues({
        content: selectedElement.content || '',
        fontSize: selectedElement.style?.fontSize || 16,
        color: selectedElement.style?.color || '#000000',
        backgroundColor: selectedElement.style?.backgroundColor || '',
        fontWeight: selectedElement.style?.fontWeight || 'normal',
        fontStyle: selectedElement.style?.fontStyle || 'normal',
        textDecoration: selectedElement.style?.textDecoration || 'none',
        textAlign: selectedElement.style?.textAlign || 'right',
        x: selectedElement.position.x,
        y: selectedElement.position.y,
        width: selectedElement.size.width,
        height: selectedElement.size.height,
        rotation: selectedElement.style?.rotation || 0,
        opacity: selectedElement.style?.opacity || 1,
        zIndex: selectedElement.zIndex || 1,
        // قيم الحدود
        borderEnabled: selectedElement.border?.enabled || false,
        borderWidth: selectedElement.border?.width || 1,
        borderColor: selectedElement.border?.color || '#000000',
        borderStyle: selectedElement.border?.style || 'solid',
        // قيم الباركود
        lineColor: (selectedElement.style as any)?.lineColor || '#000000',
        background: (selectedElement.style as any)?.background || 'transparent',
        // قيم شكل الصورة
        imageShapeType: selectedElement.imageShape?.type || 'square',
        imageBorderRadius: selectedElement.imageShape?.borderRadius || 10,
      });
    }
  }, [selectedElement]);

  // تحديث العنصر
  const updateElement = (updates: Partial<IdCardElement>) => {
    if (!selectedElement || readOnly) return;
    onUpdateElement(selectedElement.id, updates);
  };

  // تحديث المحتوى
  const updateContent = (content: string) => {
    setLocalValues(prev => ({ ...prev, content }));
    updateElement({ content });
  };

  // تحديث الموضع
  const updatePosition = (x: number, y: number) => {
    setLocalValues(prev => ({ ...prev, x, y }));
    updateElement({ position: { x, y } });
  };

  // تحديث الحجم
  const updateSize = (width: number, height: number) => {
    setLocalValues(prev => ({ ...prev, width, height }));
    updateElement({ size: { width, height } });
  };

  // تحديث التنسيق
  const updateStyle = (styleUpdates: any) => {
    updateElement({
      style: {
        ...selectedElement?.style,
        ...styleUpdates,
      },
    });
  };

  // تحديث الحدود
  const updateBorder = (borderUpdates: Partial<{enabled: boolean; width: number; color: string; style: string}>) => {
    const newBorderSettings = {
      enabled: borderUpdates.enabled !== undefined ? borderUpdates.enabled : (selectedElement?.border?.enabled || false),
      width: borderUpdates.width !== undefined ? borderUpdates.width : (selectedElement?.border?.width || 1),
      color: borderUpdates.color !== undefined ? borderUpdates.color : (selectedElement?.border?.color || '#000000'),
      style: (borderUpdates.style !== undefined ? borderUpdates.style : (selectedElement?.border?.style || 'solid')) as 'solid' | 'dashed' | 'dotted',
    };
    
    console.log('تحديث إعدادات الحدود:', newBorderSettings);
    
    setLocalValues(prev => ({
      ...prev,
      borderEnabled: newBorderSettings.enabled,
      borderWidth: newBorderSettings.width,
      borderColor: newBorderSettings.color,
      borderStyle: newBorderSettings.style,
    }));
    
    updateElement({
      border: newBorderSettings,
    });
  };

  // تحديث شكل الصورة
  const updateImageShape = (shapeUpdates: Partial<{type: 'square' | 'circle' | 'rounded'; borderRadius: number}>) => {
    const newShapeSettings = {
      type: shapeUpdates.type !== undefined ? shapeUpdates.type : (selectedElement?.imageShape?.type || 'square'),
      borderRadius: shapeUpdates.borderRadius !== undefined ? shapeUpdates.borderRadius : (selectedElement?.imageShape?.borderRadius || 10),
    };
    
    console.log('تحديث إعدادات شكل الصورة:', newShapeSettings);
    
    setLocalValues(prev => ({
      ...prev,
      imageShapeType: newShapeSettings.type,
      imageBorderRadius: newShapeSettings.borderRadius,
    }));
    
    updateElement({
      imageShape: newShapeSettings,
    });
  };

  // تحديث ألوان الباركود
  const updateBarcodeColors = (updates: Partial<{ lineColor: string; background: string }>) => {
    const currentStyle = selectedElement?.style || {};
    const newStyle = { ...currentStyle, ...updates };
    setLocalValues(prev => ({
      ...prev,
      lineColor: updates.lineColor ?? prev.lineColor,
      background: updates.background ?? prev.background,
    }));
    updateElement({ style: newStyle });
  };

  if (!selectedElement) {
    return (
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">خصائص العنصر</h3>
        <p className="text-gray-500 text-center py-8">
          اختر عنصرًا لعرض خصائصه
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">خصائص العنصر</h3>
        
        {!readOnly && (
          <div className="flex gap-1">
            {/* تبديل القفل */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateElement({ locked: !selectedElement.locked })}
              title={selectedElement.locked ? 'إلغاء القفل' : 'قفل العنصر'}
            >
              {selectedElement.locked ? (
                <LockClosedIcon className="w-4 h-4" />
              ) : (
                <LockOpenIcon className="w-4 h-4" />
              )}
            </Button>

            {/* تبديل الرؤية */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateElement({ visible: !selectedElement.visible })}
              title={selectedElement.visible ? 'إخفاء' : 'إظهار'}
            >
              {selectedElement.visible ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
            </Button>

            {/* نسخ */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicateElement(selectedElement.id)}
              title="نسخ العنصر"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </Button>

            {/* حذف */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemoveElement(selectedElement.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
              title="حذف العنصر"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* المحتوى (للنصوص) */}
        {selectedElement.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المحتوى
            </label>
            <Input
              value={localValues.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="أدخل النص"
              disabled={readOnly || selectedElement.locked}
            />
          </div>
        )}

        {/* الموضع */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X
            </label>
            <Input
              type="number"
              value={localValues.x}
              onChange={(e) => updatePosition(Number(e.target.value), localValues.y)}
              disabled={readOnly || selectedElement.locked}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y
            </label>
            <Input
              type="number"
              value={localValues.y}
              onChange={(e) => updatePosition(localValues.x, Number(e.target.value))}
              disabled={readOnly || selectedElement.locked}
            />
          </div>
        </div>

        {/* الحجم */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              العرض
            </label>
            <Input
              type="number"
              value={localValues.width}
              onChange={(e) => updateSize(Number(e.target.value), localValues.height)}
              disabled={readOnly || selectedElement.locked}
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الارتفاع
            </label>
            <Input
              type="number"
              value={localValues.height}
              onChange={(e) => updateSize(localValues.width, Number(e.target.value))}
              disabled={readOnly || selectedElement.locked}
              min="1"
            />
          </div>
        </div>

        {/* خصائص النص */}
        {selectedElement.type === 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حجم الخط
              </label>
              <Input
                type="number"
                value={localValues.fontSize}
                onChange={(e) => {
                  const fontSize = Number(e.target.value);
                  setLocalValues(prev => ({ ...prev, fontSize }));
                  updateStyle({ fontSize });
                }}
                disabled={readOnly || selectedElement.locked}
                min="8"
                max="72"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اللون
              </label>
              <Input
                type="color"
                value={localValues.color}
                onChange={(e) => {
                  const color = e.target.value;
                  setLocalValues(prev => ({ ...prev, color }));
                  updateStyle({ color });
                }}
                disabled={readOnly || selectedElement.locked}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                خلفية النص
              </label>
              <Input
                type="color"
                value={localValues.backgroundColor}
                onChange={(e) => {
                  const backgroundColor = e.target.value;
                  setLocalValues(prev => ({ ...prev, backgroundColor }));
                  updateStyle({ backgroundColor });
                }}
                disabled={readOnly || selectedElement.locked}
              />
            </div>

            {/* نمط الخط */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  وزن الخط
                </label>
                <select
                  value={localValues.fontWeight}
                  onChange={(e) => {
                    const fontWeight = e.target.value;
                    setLocalValues(prev => ({ ...prev, fontWeight }));
                    updateStyle({ fontWeight });
                  }}
                  disabled={readOnly || selectedElement.locked}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="normal">عادي</option>
                  <option value="bold">عريض</option>
                  <option value="bolder">أكثر عرضًا</option>
                  <option value="lighter">أقل عرضًا</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نمط الخط
                </label>
                <select
                  value={localValues.fontStyle}
                  onChange={(e) => {
                    const fontStyle = e.target.value;
                    setLocalValues(prev => ({ ...prev, fontStyle }));
                    updateStyle({ fontStyle });
                  }}
                  disabled={readOnly || selectedElement.locked}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="normal">عادي</option>
                  <option value="italic">مائل</option>
                  <option value="oblique">منحرف</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  زخرفة النص
                </label>
                <select
                  value={localValues.textDecoration}
                  onChange={(e) => {
                    const textDecoration = e.target.value;
                    setLocalValues(prev => ({ ...prev, textDecoration }));
                    updateStyle({ textDecoration });
                  }}
                  disabled={readOnly || selectedElement.locked}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="none">بدون</option>
                  <option value="underline">تحته خط</option>
                  <option value="overline">فوقه خط</option>
                  <option value="line-through">يتوسطه خط</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  محاذاة النص
                </label>
                <select
                  value={localValues.textAlign}
                  onChange={(e) => {
                    const textAlign = e.target.value;
                    setLocalValues(prev => ({ ...prev, textAlign }));
                    updateStyle({ textAlign });
                  }}
                  disabled={readOnly || selectedElement.locked}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="right">يمين</option>
                  <option value="center">وسط</option>
                  <option value="left">يسار</option>
                  <option value="justify">ضبط</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* خصائص متقدمة */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              دوران (درجة)
            </label>
            <Input
              type="number"
              value={localValues.rotation}
              onChange={(e) => {
                const rotation = Number(e.target.value);
                setLocalValues(prev => ({ ...prev, rotation }));
                updateStyle({ rotation });
              }}
              disabled={readOnly || selectedElement.locked}
              min="-360"
              max="360"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الشفافية
            </label>
            <Input
              type="number"
              step="0.1"
              value={localValues.opacity}
              onChange={(e) => {
                const opacity = Number(e.target.value);
                setLocalValues(prev => ({ ...prev, opacity }));
                updateStyle({ opacity });
              }}
              disabled={readOnly || selectedElement.locked}
              min="0"
              max="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ترتيب الطبقة
          </label>
          <Input
            type="number"
            value={localValues.zIndex}
            onChange={(e) => {
              const zIndex = Number(e.target.value);
              setLocalValues(prev => ({ ...prev, zIndex }));
              updateElement({ zIndex });
            }}
            disabled={readOnly || selectedElement.locked}
            min="1"
          />
        </div>
        
        {/* إعدادات الحدود - للصور فقط */}
        {(selectedElement.type === 'image' || selectedElement.type === 'logo') && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">الحدود</label>
              <input
                type="checkbox"
                checked={localValues.borderEnabled}
                onChange={(e) => updateBorder({ enabled: e.target.checked })}
                disabled={readOnly || selectedElement.locked}
                className="rounded"
              />
            </div>
            
            {localValues.borderEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">العرض (px)</label>
                    <Input
                      type="number"
                      value={localValues.borderWidth}
                      onChange={(e) => updateBorder({ width: Number(e.target.value) })}
                      disabled={readOnly || selectedElement.locked}
                      min="1"
                      max="20"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">النوع</label>
                    <select
                      value={localValues.borderStyle}
                      onChange={(e) => updateBorder({ style: e.target.value })}
                      disabled={readOnly || selectedElement.locked}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="solid">مصمت</option>
                      <option value="dashed">متقطع</option>
                      <option value="dotted">منقط</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">اللون</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localValues.borderColor}
                      onChange={(e) => updateBorder({ color: e.target.value })}
                      disabled={readOnly || selectedElement.locked}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    <Input
                      type="text"
                      value={localValues.borderColor}
                      onChange={(e) => updateBorder({ color: e.target.value })}
                      disabled={readOnly || selectedElement.locked}
                      className="text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* إعدادات شكل الصورة - للصور فقط */}
        {(selectedElement.type === 'image' || selectedElement.type === 'logo') && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700 mb-2 block">شكل الصورة</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateImageShape({ type: 'square' })}
                  disabled={readOnly || selectedElement.locked}
                  className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                    localValues.imageShapeType === 'square'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  مربع
                </button>
                <button
                  onClick={() => updateImageShape({ type: 'circle' })}
                  disabled={readOnly || selectedElement.locked}
                  className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                    localValues.imageShapeType === 'circle'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  دائري
                </button>
                <button
                  onClick={() => updateImageShape({ type: 'rounded' })}
                  disabled={readOnly || selectedElement.locked}
                  className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                    localValues.imageShapeType === 'rounded'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  حواف ناعمة
                </button>
              </div>
            </div>
            
            {/* إعدادات الحواف الناعمة */}
            {localValues.imageShapeType === 'rounded' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">نصف قطر الحواف (px)</label>
                <Input
                  type="number"
                  value={localValues.imageBorderRadius || 10}
                  onChange={(e) => updateImageShape({ borderRadius: Number(e.target.value) })}
                  disabled={readOnly || selectedElement.locked}
                  min="1"
                  max="50"
                  className="text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* إعدادات ألوان الباركود */}
        {selectedElement.type === 'barcode' && (
          <div className="border-t border-gray-200 pt-4">
            <label className="text-sm font-medium text-gray-700 mb-3 block">ألوان الباركود</label>
            
            <div className="space-y-3">
              {/* لون الخطوط */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">لون الخطوط</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="color"
                    value={localValues.lineColor}
                    onChange={(e) => updateBarcodeColors({ lineColor: e.target.value })}
                    disabled={readOnly || selectedElement.locked}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <Input
                    type="text"
                    value={localValues.lineColor}
                    onChange={(e) => updateBarcodeColors({ lineColor: e.target.value })}
                    disabled={readOnly || selectedElement.locked}
                    className="text-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* لون الخلفية */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">لون الخلفية</label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="color"
                    value={localValues.background === 'transparent' ? '#ffffff' : localValues.background}
                    onChange={(e) => updateBarcodeColors({ background: e.target.value })}
                    disabled={readOnly || selectedElement.locked}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <select
                    value={localValues.background}
                    onChange={(e) => updateBarcodeColors({ background: e.target.value })}
                    disabled={readOnly || selectedElement.locked}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="transparent">شفاف</option>
                    <option value="#ffffff">أبيض</option>
                    <option value="#000000">أسود</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
