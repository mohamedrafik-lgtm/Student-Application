"use client";

import React from 'react';
import { IdCardElement } from '@/types/id-card-design';
import { Button } from '@/components/ui/button';
import {
  DocumentTextIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  QrCodeIcon,
  Bars3BottomLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface ElementLayersPanelProps {
  elements: IdCardElement[];
  selectedElement: string | null;
  onSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, updates: Partial<IdCardElement>) => void;
  onRemoveElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  readOnly?: boolean;
}

export default function ElementLayersPanel({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onRemoveElement,
  onDuplicateElement,
  readOnly = false
}: ElementLayersPanelProps) {
  // ترتيب العناصر حسب zIndex (من الأعلى إلى الأسفل)
  const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  // تحديد أيقونة العنصر
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text':
        return DocumentTextIcon;
      case 'image':
        return PhotoIcon;
      case 'logo':
        return BuildingOffice2Icon;
      case 'qr':
        return QrCodeIcon;
      case 'barcode':
        return Bars3BottomLeftIcon;
      default:
        return DocumentTextIcon;
    }
  };

  // تحديد اسم العنصر
  const getElementName = (element: IdCardElement) => {
    // أسماء خاصة للعناصر المحددة مسبقاً
    const predefinedNames: Record<string, string> = {
      'name': 'اسم المتدرب',
      'nationalId': 'الرقم القومي', 
      'program': 'البرنامج',
      'traineeId': 'رقم المتدرب',
      'centerName': 'اسم المركز',
      'photo': 'الصورة الشخصية',
      'qrCode': 'QR Code',
      'barcode': 'Barcode'
    };

    if (predefinedNames[element.id]) {
      return predefinedNames[element.id];
    }

    switch (element.type) {
      case 'text':
        return element.content || 'نص';
      case 'image':
        return 'صورة';
      case 'logo':
        return 'شعار';
      case 'qr':
        return 'QR Code';
      case 'barcode':
        return 'Barcode';
      default:
        return element.type;
    }
  };

  // تحريك العنصر لأعلى في الطبقات
  const moveElementUp = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const maxZIndex = Math.max(...elements.map(el => el.zIndex || 0));
    if ((element.zIndex || 0) < maxZIndex) {
      onUpdateElement(elementId, { zIndex: (element.zIndex || 0) + 1 });
    }
  };

  // تحريك العنصر لأسفل في الطبقات
  const moveElementDown = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const minZIndex = Math.min(...elements.map(el => el.zIndex || 0));
    if ((element.zIndex || 0) > minZIndex && (element.zIndex || 0) > 1) {
      onUpdateElement(elementId, { zIndex: (element.zIndex || 0) - 1 });
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">طبقات العناصر</h3>
      
      {elements.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          لا توجد عناصر في التصميم
        </p>
      ) : (
        <div className="space-y-2">
          {sortedElements.map((element) => {
            const Icon = getElementIcon(element.type);
            const isSelected = selectedElement === element.id;
            
            return (
              <div
                key={element.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } ${!element.visible ? 'opacity-50' : ''}`}
                onClick={() => onSelectElement(element.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Icon className={`w-5 h-5 ${
                      element.type === 'text' ? 'text-blue-500' :
                      element.type === 'image' ? 'text-green-500' :
                      element.type === 'logo' ? 'text-purple-500' :
                      'text-orange-500'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800 truncate">
                        {getElementName(element)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {element.type} • طبقة {element.zIndex || 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 space-x-reverse">
                    {/* أزرار التحكم في الطبقات */}
                    {!readOnly && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveElementUp(element.id);
                          }}
                          title="تحريك لأعلى"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUpIcon className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveElementDown(element.id);
                          }}
                          title="تحريك لأسفل"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDownIcon className="w-3 h-3" />
                        </Button>
                      </>
                    )}

                    {/* تبديل الرؤية */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateElement(element.id, { visible: !element.visible });
                      }}
                      title={element.visible ? 'إخفاء' : 'إظهار'}
                      className="h-6 w-6 p-0"
                      disabled={readOnly}
                    >
                      {element.visible ? (
                        <EyeIcon className="w-3 h-3" />
                      ) : (
                        <EyeSlashIcon className="w-3 h-3" />
                      )}
                    </Button>

                    {/* تبديل القفل */}
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElement(element.id, { locked: !element.locked });
                        }}
                        title={element.locked ? 'إلغاء القفل' : 'قفل'}
                        className="h-6 w-6 p-0"
                      >
                        {element.locked ? (
                          <LockClosedIcon className="w-3 h-3" />
                        ) : (
                          <LockOpenIcon className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراءات للعنصر المحدد */}
                {isSelected && !readOnly && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end space-x-2 space-x-reverse">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateElement(element.id);
                      }}
                      title="نسخ"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveElement(element.id);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      title="حذف"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* معلومات إضافية */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600">
          <div>العناصر: {elements.length}</div>
          <div>مرئية: {elements.filter(el => el.visible).length}</div>
          <div>مقفلة: {elements.filter(el => el.locked).length}</div>
        </div>
      </div>
    </div>
  );
}
