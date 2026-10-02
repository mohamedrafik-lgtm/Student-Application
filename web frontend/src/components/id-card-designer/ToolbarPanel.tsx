"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { DesignerState } from '@/types/id-card-design';
import {
  DocumentTextIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  QrCodeIcon,
  Bars3BottomLeftIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  EyeIcon,
  EyeSlashIcon,
  PaintBrushIcon,
  SwatchIcon,
  UserIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  Square2StackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ToolbarPanelProps {
  onAddElement: (type: string, customProps?: any) => void;
  onSave: () => void;
  saving: boolean;
  hasUnsavedChanges?: boolean;
  readOnly?: boolean;
  designerState: DesignerState;
  onStateChange: (state: Partial<DesignerState>) => void;
  onChangeBackground: (file: File | null, color?: string) => void;
  onCopyElement?: () => void;
  onPasteElement?: () => void;
  onHasCopiedElement?: boolean;
  onRemoveElement?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
}

export default function ToolbarPanel({
  onAddElement,
  onSave,
  saving,
  hasUnsavedChanges = false,
  readOnly = false,
  designerState,
  onStateChange,
  onChangeBackground,
  onCopyElement,
  onPasteElement,
  onHasCopiedElement = false,
  onRemoveElement,
  onDuplicateElement,
}: ToolbarPanelProps) {
  // عناصر يمكن إضافتها
  const elementTypes = [
    { type: 'text', icon: DocumentTextIcon, label: 'نص', color: 'bg-blue-500' },
    { type: 'image', icon: UserIcon, label: 'صورة المتدرب', color: 'bg-green-500', isTraineePhoto: true },
    { type: 'logo', icon: BuildingOffice2Icon, label: 'شعار المركز', color: 'bg-purple-500', isCenterLogo: true },
    { type: 'qr', icon: QrCodeIcon, label: 'QR Code', color: 'bg-orange-500' },
    { type: 'barcode', icon: Bars3BottomLeftIcon, label: 'Barcode', color: 'bg-red-500' },
  ];

  // حقول البيانات الديناميكية المتاحة
  const dataFields = [
    { id: 'name', label: 'اسم المتدرب', icon: DocumentTextIcon },
    { id: 'nationalId', label: 'الرقم القومي', icon: DocumentTextIcon },
    { id: 'program', label: 'البرنامج', icon: DocumentTextIcon },
    { id: 'traineeId', label: 'رقم المتدرب', icon: DocumentTextIcon },
    { id: 'centerName', label: 'اسم المركز', icon: DocumentTextIcon },
  ];


  // إضافة حقل بيانات ديناميكي
  const addDataField = (fieldId: string, fieldLabel: string) => {
    onAddElement('text', {
      id: fieldId,
      content: fieldLabel,
      style: {
        fontSize: 14,
        color: '#000000',
        textAlign: 'right',
        direction: 'rtl',
        fontWeight: '500',
      }
    });
  };


  // تغيير مستوى التكبير
  const changeZoom = (delta: number) => {
    const newZoom = Math.max(0.25, Math.min(3, designerState.zoom + delta));
    onStateChange({ zoom: newZoom });
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      {/* المحتوى القابل للتمرير */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* أزرار إضافة العناصر */}
        {!readOnly && (
          <div className="px-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              إضافة عناصر
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {elementTypes.map(({ type, icon: Icon, label, color, isTraineePhoto, isCenterLogo }) => (
                <button
                  key={type}
                  onClick={() => {
                    if (isTraineePhoto) {
                      onAddElement(type, {
                        content: 'trainee-photo',
                        data: { dataSource: 'trainee-photo' },
                        imageShape: { type: 'square', borderRadius: 10 }, // شكل افتراضي للصورة
                      });
                    } else if (isCenterLogo) {
                      onAddElement(type, {
                        content: 'center-logo',
                        data: { dataSource: 'center-logo' },
                        imageShape: { type: 'square', borderRadius: 10 }, // شكل افتراضي للشعار
                      });
                    } else {
                      onAddElement(type);
                    }
                  }}
                  className={`${color} hover:opacity-90 rounded-lg p-3 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-lg`}
                  title={label}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* قسم البيانات الديناميكية */}
        {!readOnly && (
          <div className="px-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
              بيانات المتدرب
            </h3>
            <div className="space-y-2">
              {dataFields.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => addDataField(id, label)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg p-3 flex items-center transition-all hover:scale-105 shadow-lg text-right"
                  title={label}
                >
                  <Icon className="w-5 h-5 ml-2 flex-shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}


        {/* أدوات التحكم السريع */}
        {!readOnly && (
          <div className="px-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              أدوات سريعة
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCopyElement}
                disabled={!designerState.selectedElement}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg p-2 flex items-center justify-center transition-all text-xs"
                title="نسخ العنصر (Ctrl+C)"
              >
                <DocumentDuplicateIcon className="w-4 h-4 ml-1" />
                نسخ
              </button>
              <button
                onClick={onPasteElement}
                disabled={!onHasCopiedElement}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg p-2 flex items-center justify-center transition-all text-xs"
                title="لصق العنصر (Ctrl+V)"
              >
                <ClipboardDocumentIcon className="w-4 h-4 ml-1" />
                لصق
              </button>
              <button
                onClick={() => designerState.selectedElement && onDuplicateElement(designerState.selectedElement)}
                disabled={!designerState.selectedElement}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg p-2 flex items-center justify-center transition-all text-xs"
                title="تكرار العنصر (Ctrl+D)"
              >
                <Square2StackIcon className="w-4 h-4 ml-1" />
                تكرار
              </button>
              <button
                onClick={() => designerState.selectedElement && onRemoveElement(designerState.selectedElement)}
                disabled={!designerState.selectedElement}
                className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg p-2 flex items-center justify-center transition-all text-xs"
                title="حذف العنصر (Delete)"
              >
                <TrashIcon className="w-4 h-4 ml-1" />
                حذف
              </button>
            </div>
          </div>
        )}

        {/* فاصل */}
        {!readOnly && <div className="mx-4 h-px bg-gray-600 mb-6"></div>}

      {/* أدوات العرض */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          أدوات العرض
        </h3>
        
        <div className="space-y-3">
          {/* التكبير والتصغير */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeZoom(0.25)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 flex flex-col items-center justify-center transition-all"
              title="تكبير"
            >
              <MagnifyingGlassPlusIcon className="w-5 h-5 mb-1" />
              <span className="text-xs">تكبير</span>
            </button>
            <button
              onClick={() => changeZoom(-0.25)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 flex flex-col items-center justify-center transition-all"
              title="تصغير"
            >
              <MagnifyingGlassMinusIcon className="w-5 h-5 mb-1" />
              <span className="text-xs">تصغير</span>
            </button>
          </div>
          
          {/* عرض نسبة التكبير */}
          <div className="text-center py-2 bg-gray-700 rounded-lg">
            <span className="text-sm font-medium">{Math.round(designerState.zoom * 100)}%</span>
          </div>

          {/* أدوات مساعدة */}
          <div className="space-y-2">
            <button
              onClick={() => onStateChange({ snapToGrid: !designerState.snapToGrid })}
              className={`w-full rounded-lg p-2 flex items-center transition-all text-right ${
                designerState.snapToGrid ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="تبديل الشبكة"
            >
              <Squares2X2Icon className="w-5 h-5 ml-2" />
              <span className="text-sm">{designerState.snapToGrid ? 'إخفاء الشبكة' : 'إظهار الشبكة'}</span>
            </button>

            <button
              onClick={() => onStateChange({ showGuides: !designerState.showGuides })}
              className={`w-full rounded-lg p-2 flex items-center transition-all text-right ${
                designerState.showGuides ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="تبديل خطوط الإرشاد"
            >
              {designerState.showGuides ? (
                <EyeIcon className="w-5 h-5 ml-2" />
              ) : (
                <EyeSlashIcon className="w-5 h-5 ml-2" />
              )}
              <span className="text-sm">{designerState.showGuides ? 'إخفاء الإرشاد' : 'إظهار الإرشاد'}</span>
            </button>
          </div>
        </div>
      </div>

        {/* أدوات الخلفية */}
        {!readOnly && (
          <div className="px-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              تخصيص الخلفية
            </h3>
            
            <div className="space-y-2">
              {/* رفع صورة خلفية */}
              <label className="w-full bg-purple-600 hover:bg-purple-500 rounded-lg p-3 flex items-center transition-all cursor-pointer text-right">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChangeBackground(file);
                  }}
                  className="hidden"
                />
                <PhotoIcon className="w-5 h-5 ml-2" />
                <span className="text-sm font-medium">صورة خلفية</span>
              </label>

              {/* لون خلفية */}
              <label className="w-full bg-pink-600 hover:bg-pink-500 rounded-lg p-3 flex items-center transition-all cursor-pointer text-right">
                <input
                  type="color"
                  onChange={(e) => onChangeBackground(null, e.target.value)}
                  className="hidden"
                />
                <SwatchIcon className="w-5 h-5 ml-2" />
                <span className="text-sm font-medium">لون خلفية</span>
              </label>

              {/* إزالة الخلفية */}
              <button
                onClick={() => onChangeBackground(null, '#ffffff')}
                className="w-full bg-red-600 hover:bg-red-500 rounded-lg p-3 flex items-center transition-all text-right"
                title="إزالة الخلفية"
              >
                <PaintBrushIcon className="w-5 h-5 ml-2" />
                <span className="text-sm font-medium">إزالة الخلفية</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* زر الحفظ - مثبت في الأسفل */}
      <div className="border-t border-gray-700 p-4 bg-gray-900">
        {!readOnly ? (
          <button
            onClick={onSave}
            disabled={saving}
            className={`w-full ${
              hasUnsavedChanges 
                ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/50' 
                : 'bg-green-600 hover:bg-green-500 shadow-green-600/50'
            } disabled:bg-gray-600 rounded-lg p-4 flex items-center justify-center transition-all relative shadow-lg`}
            title={hasUnsavedChanges ? 'يوجد تغييرات غير محفوظة' : 'حفظ التصميم'}
          >
            {hasUnsavedChanges && !saving && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                <span className="text-sm font-semibold">جاري الحفظ...</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">
                  {hasUnsavedChanges ? 'حفظ التغييرات' : 'تم الحفظ'}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full bg-gray-600 rounded-lg p-4 flex items-center justify-center">
            <ArrowDownTrayIcon className="w-5 h-5 mr-2 text-gray-400" />
            <span className="text-sm font-semibold text-gray-400">وضع القراءة فقط</span>
          </div>
        )}
        
      </div>
    </div>
  );
}
