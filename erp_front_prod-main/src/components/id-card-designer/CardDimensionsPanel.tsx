"use client";

import React, { useState, useEffect } from 'react';
import { IdCardDesign, STANDARD_ID_CARD_DIMENSIONS } from '@/types/id-card-design';
import { 
  ArrowsPointingOutIcon, 
  ArrowsPointingInIcon,
  PencilIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface CardDimensionsPanelProps {
  design: IdCardDesign;
  onUpdateDimensions: (width: number, height: number) => void;
  readOnly?: boolean;
}

export default function CardDimensionsPanel({
  design,
  onUpdateDimensions,
  readOnly = false
}: CardDimensionsPanelProps) {
  const [localWidth, setLocalWidth] = useState(design.width);
  const [localHeight, setLocalHeight] = useState(design.height);

  // تحديث القيم المحلية عند تغيير التصميم
  useEffect(() => {
    setLocalWidth(design.width);
    setLocalHeight(design.height);
  }, [design.width, design.height]);

  const handleDimensionChange = (width: number, height: number) => {
    if (readOnly) return;
    
    // التحقق من صحة الأبعاد
    if (width < 100 || width > 2500 || height < 60 || height > 1500) {
      return;
    }
    
    setLocalWidth(width);
    setLocalHeight(height);
    onUpdateDimensions(width, height);
  };

  const setPresetDimensions = (width: number, height: number, name: string) => {
    if (readOnly) return;
    handleDimensionChange(width, height);
    // يمكن إضافة toast للإشعار
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // حساب الأبعاد بالوحدات المختلفة
  const getDimensionsInfo = (width: number, height: number) => ({
    pixels: `${width} × ${height} بكسل`,
    mm: `${(width * 0.264583).toFixed(1)} × ${(height * 0.264583).toFixed(1)} ملم`,
    cm: `${(width * 0.0264583).toFixed(1)} × ${(height * 0.0264583).toFixed(1)} سم`,
    inches: `${(width * 0.0104167).toFixed(2)} × ${(height * 0.0104167).toFixed(2)} بوصة`
  });

  const currentDimensions = getDimensionsInfo(design.width, design.height);
  const standardDimensions = getDimensionsInfo(STANDARD_ID_CARD_DIMENSIONS.width_96dpi, STANDARD_ID_CARD_DIMENSIONS.height_96dpi);

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <ArrowsPointingOutIcon className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">أبعاد الكارنيه</h3>
            <p className="text-xs text-blue-600">
              {currentDimensions.pixels} - قابل للتعديل
            </p>
          </div>
        </div>
        <div className="flex items-center">
          {!readOnly && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
              className="p-1 mr-2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <PencilIcon className="w-4 h-4" />
            </div>
          )}
          {isExpanded ? (
            <ArrowsPointingInIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ArrowsPointingOutIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          
          {/* معلومات الأبعاد الحالية */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900">الأبعاد الحالية</h4>
              {!readOnly && (
                <div
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 cursor-pointer"
                >
                  {isEditing ? 'إلغاء' : 'تعديل'}
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">بالبكسل:</span>
                <span className="font-medium text-blue-900">{currentDimensions.pixels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">بالسنتيمتر:</span>
                <span className="font-medium text-blue-900">{currentDimensions.cm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">بالملليمتر:</span>
                <span className="font-medium text-blue-900">{currentDimensions.mm}</span>
              </div>
            </div>
          </div>

          {/* محرر الأبعاد */}
          {isEditing && !readOnly && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">تعديل الأبعاد</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    العرض (بكسل)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="2500"
                    value={localWidth}
                    onChange={(e) => setLocalWidth(parseInt(e.target.value) || design.width)}
                    onBlur={() => handleDimensionChange(localWidth, localHeight)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    الارتفاع (بكسل)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="1500"
                    value={localHeight}
                    onChange={(e) => setLocalHeight(parseInt(e.target.value) || design.height)}
                    onBlur={() => handleDimensionChange(localWidth, localHeight)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* أحجام جاهزة */}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">أحجام جاهزة:</p>
                <div className="flex gap-2 flex-wrap">
                  <div
                    onClick={() => setPresetDimensions(323, 204, "كريديت كارد")}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 cursor-pointer"
                  >
                    كريديت كارد (323×204)
                  </div>
                  <div
                    onClick={() => setPresetDimensions(340, 207, "مخصص")}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer"
                  >
                    مخصص (340×207)
                  </div>
                  <div
                    onClick={() => setPresetDimensions(400, 250, "كبير")}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 cursor-pointer"
                  >
                    كبير (400×250)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Cog6ToothIcon className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="text-xs text-gray-700">
                <strong>ملاحظة:</strong> سيتم حفظ الأبعاد مع التصميم واستخدامها أثناء الطباعة.
                المقاس الافتراضي هو الكريديت كارد المصري القياسي.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}