"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowPathIcon, 
  ArrowUpTrayIcon, 
  DocumentTextIcon,
  PhotoIcon,
  IdentificationIcon,
  UserIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { uploadFile, getImageUrl } from '@/lib/api';
import { toast } from 'react-hot-toast';

// تعريف الأنواع
interface Position {
  x: number;
  y: number;
}

interface ElementSize {
  width: number;
  height: number;
}

interface IdCardSettings {
  idCardBackgroundImage?: string;
  idCardLogoPosition?: Position;
  idCardNamePosition?: Position;
  idCardPhotoPosition?: Position;
  idCardNationalIdPosition?: Position;
  idCardProgramPosition?: Position;
  idCardCenterNamePosition?: Position;
  idCardAdditionalText?: string;
  idCardAdditionalTextPosition?: Position;
  idCardWidth: number;
  idCardHeight: number;
  centerName: string;
  centerLogo?: string;
  
  // إعدادات حجم العناصر
  idCardLogoSize?: ElementSize;
  idCardPhotoSize?: ElementSize;
  idCardNameSize?: number;
  idCardNationalIdSize?: number;
  idCardProgramSize?: number;
  idCardCenterNameSize?: number;
  idCardAdditionalTextSize?: number;
  
  // إعدادات ظهور العناصر
  idCardLogoVisible?: boolean;
  idCardPhotoVisible?: boolean;
  idCardNameVisible?: boolean;
  idCardNationalIdVisible?: boolean;
  idCardProgramVisible?: boolean;
  idCardCenterNameVisible?: boolean;
  idCardAdditionalTextVisible?: boolean;
  idCardQrCodePosition?: Position;
  idCardQrCodeSize?: ElementSize;
  idCardQrCodeVisible?: boolean;
}

interface IdCardDesignerProps {
  settings: IdCardSettings;
  onSettingsChange: (settings: Partial<IdCardSettings>) => void;
}

// القيم الافتراضية للمواضع والأحجام
const DEFAULT_POSITIONS = {
  logo: { x: 20, y: 20 },
  name: { x: 100, y: 60 },
  photo: { x: 20, y: 60 },
  nationalId: { x: 100, y: 90 },
  program: { x: 100, y: 120 },
  centerName: { x: 100, y: 150 },
  additionalText: { x: 100, y: 180 },
  qrCode: { x: 250, y: 130 },
};

const DEFAULT_SIZES = {
  logo: { width: 60, height: 60 },
  photo: { width: 80, height: 100 },
  name: 16,  // حجم الخط بالبكسل
  nationalId: 14,
  program: 14,
  centerName: 14,
  additionalText: 14,
  qrCode: { width: 60, height: 60 },
};

// مكونات عناصر الكارنيه
const ELEMENTS = [
  { 
    id: 'logo', 
    name: 'شعار المركز', 
    icon: BuildingOffice2Icon, 
    positionKey: 'idCardLogoPosition', 
    sizeKey: 'idCardLogoSize',
    visibilityKey: 'idCardLogoVisible',
    defaultPos: DEFAULT_POSITIONS.logo,
    defaultSize: DEFAULT_SIZES.logo,
    defaultVisible: true
  },
  { 
    id: 'name', 
    name: 'اسم الطالب', 
    icon: UserIcon, 
    positionKey: 'idCardNamePosition',
    sizeKey: 'idCardNameSize',
    visibilityKey: 'idCardNameVisible', 
    defaultPos: DEFAULT_POSITIONS.name,
    defaultSize: DEFAULT_SIZES.name,
    defaultVisible: true
  },
  { 
    id: 'photo', 
    name: 'صورة الطالب', 
    icon: PhotoIcon, 
    positionKey: 'idCardPhotoPosition',
    sizeKey: 'idCardPhotoSize',
    visibilityKey: 'idCardPhotoVisible', 
    defaultPos: DEFAULT_POSITIONS.photo,
    defaultSize: DEFAULT_SIZES.photo,
    defaultVisible: true
  },
  { 
    id: 'nationalId', 
    name: 'الرقم القومي', 
    icon: IdentificationIcon, 
    positionKey: 'idCardNationalIdPosition',
    sizeKey: 'idCardNationalIdSize',
    visibilityKey: 'idCardNationalIdVisible', 
    defaultPos: DEFAULT_POSITIONS.nationalId,
    defaultSize: DEFAULT_SIZES.nationalId,
    defaultVisible: true
  },
  { 
    id: 'program', 
    name: 'البرنامج', 
    icon: AcademicCapIcon, 
    positionKey: 'idCardProgramPosition',
    sizeKey: 'idCardProgramSize',
    visibilityKey: 'idCardProgramVisible', 
    defaultPos: DEFAULT_POSITIONS.program,
    defaultSize: DEFAULT_SIZES.program,
    defaultVisible: true
  },
  { 
    id: 'centerName', 
    name: 'اسم المركز', 
    icon: BuildingOffice2Icon, 
    positionKey: 'idCardCenterNamePosition',
    sizeKey: 'idCardCenterNameSize',
    visibilityKey: 'idCardCenterNameVisible', 
    defaultPos: DEFAULT_POSITIONS.centerName,
    defaultSize: DEFAULT_SIZES.centerName,
    defaultVisible: true
  },
  { 
    id: 'additionalText', 
    name: 'نص إضافي', 
    icon: DocumentTextIcon, 
    positionKey: 'idCardAdditionalTextPosition',
    sizeKey: 'idCardAdditionalTextSize',
    visibilityKey: 'idCardAdditionalTextVisible', 
    defaultPos: DEFAULT_POSITIONS.additionalText,
    defaultSize: DEFAULT_SIZES.additionalText,
    defaultVisible: true
  },
  { 
    id: 'qrCode', 
    name: 'QR Code', 
    icon: QrCodeIcon, 
    positionKey: 'idCardQrCodePosition',
    sizeKey: 'idCardQrCodeSize',
    visibilityKey: 'idCardQrCodeVisible', 
    defaultPos: DEFAULT_POSITIONS.qrCode,
    defaultSize: DEFAULT_SIZES.qrCode,
    defaultVisible: true
  },
];

export default function IdCardDesigner({ settings, onSettingsChange }: IdCardDesignerProps) {
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [additionalText, setAdditionalText] = useState(settings.idCardAdditionalText || '');
  // const [backgroundLoaded, setBackgroundLoaded] = useState(false); // unused for now

  // تحديث النص الإضافي
  useEffect(() => {
    setAdditionalText(settings.idCardAdditionalText || '');
  }, [settings.idCardAdditionalText]);

  // تصحيح لمشكلة عرض خلفية الكارنيه
  useEffect(() => {
    if (settings.idCardBackgroundImage) {
      console.log('Background Image URL:', settings.idCardBackgroundImage);
      console.log('Processed URL:', getImageUrl(settings.idCardBackgroundImage));
      
      // اختبار تحميل الصورة
      const img = new Image();
      img.onload = () => {
        console.log('Background image loaded successfully');
        // setBackgroundLoaded(true);
      };
      img.onerror = (e) => {
        console.error('Error loading background image:', e);
        // setBackgroundLoaded(false);
      };
      img.src = getImageUrl(settings.idCardBackgroundImage);
    }
  }, [settings.idCardBackgroundImage]);

  // الحصول على موضع عنصر
  const getElementPosition = (elementId: string): Position => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (!element) return { x: 0, y: 0 };
    
    const positionKey = element.positionKey as keyof IdCardSettings;
    
    // إعدادات افتراضية صريحة لـ QR Code
    if (elementId === 'qrCode' && (!positionKey || !settings[positionKey])) {
      // console.log('QR Code position not set, using default'); // للتشخيص
      return { x: 250, y: 130 };
    }
    
    // تحقق من وجود الموضع في الإعدادات، وإلا استخدم الموضع الافتراضي
    if (positionKey && settings[positionKey] && typeof settings[positionKey] === 'object') {
      const position = settings[positionKey] as Position;
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        return position;
      }
    }
    // استخدام الموضع الافتراضي إذا لم يكن هناك موضع صالح
    const defaultPos = element.defaultPos || { x: 0, y: 0 };
    // console.log(`Position for ${elementId}:`, defaultPos); // للتشخيص
    return defaultPos;
  };

  // تحديث موضع عنصر
  const updateElementPosition = (elementId: string, position: Position) => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (element) {
      const positionKey = element.positionKey as keyof IdCardSettings;
      // if (elementId === 'qrCode') {
      //   console.log('Updating QR Code position:', { elementId, position, positionKey }); // للتشخيص
      // }
      onSettingsChange({ [positionKey]: position });
    }
  };

  // الحصول على حجم عنصر
  const getElementSize = (elementId: string) => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (!element) return elementId === 'logo' || elementId === 'photo' || elementId === 'qrCode' ? { width: 60, height: 60 } : 14;
    
    const sizeKey = element.sizeKey as keyof IdCardSettings;
    
    // إعدادات افتراضية صريحة لـ QR Code
    if (elementId === 'qrCode' && (!sizeKey || !settings[sizeKey])) {
      // console.log('QR Code size not set, using default'); // للتشخيص
      return { width: 60, height: 60 };
    }
    
    if (sizeKey && settings[sizeKey]) {
      return settings[sizeKey];
    }
    return element.defaultSize;
  };

  // تحديث حجم عنصر
  const updateElementSize = (elementId: string, size: ElementSize | number) => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (element) {
      const sizeKey = element.sizeKey as keyof IdCardSettings;
      onSettingsChange({ [sizeKey]: size });
    }
  };

  // الحصول على حالة ظهور عنصر
  const getElementVisibility = (elementId: string): boolean => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (!element) return true;
    
    const visibilityKey = element.visibilityKey as keyof IdCardSettings;
    
    // إعدادات افتراضية صريحة لـ QR Code
    if (elementId === 'qrCode' && (settings[visibilityKey] === undefined || settings[visibilityKey] === null)) {
      // console.log('QR Code visibility not set, using default true'); // للتشخيص
      return true;
    }
    
    if (visibilityKey && typeof settings[visibilityKey] === 'boolean') {
      return settings[visibilityKey] as boolean;
    }
    return element.defaultVisible;
  };

  // تحديث حالة ظهور عنصر
  const toggleElementVisibility = (elementId: string) => {
    const element = ELEMENTS.find(el => el.id === elementId);
    if (element) {
      const visibilityKey = element.visibilityKey as keyof IdCardSettings;
      const currentVisibility = getElementVisibility(elementId);
      onSettingsChange({ [visibilityKey]: !currentVisibility });
    }
  };

  // معالجة بدء السحب
  const handleDragStart = (elementId: string) => {
    setActiveElement(elementId);
    setDragging(true);
    // if (elementId === 'qrCode') {
    //   console.log(`Started dragging QR Code: ${elementId}`); // للتشخيص
    // }
  };

  // معالجة السحب
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging && activeElement && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(settings.idCardWidth - 50, e.clientX - rect.left - 25)); // تعديل للحفاظ على العنصر داخل الحدود
      const y = Math.max(0, Math.min(settings.idCardHeight - 50, e.clientY - rect.top - 25));
      // console.log(`Dragging ${activeElement} to:`, { x, y }); // للتشخيص
      updateElementPosition(activeElement, { x, y });
    }
  };

  // معالجة انتهاء السحب
  const handleDragEnd = () => {
    setDragging(false);
  };

  // رفع صورة خلفية الكارنيه
  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      const data = await uploadFile(file, 'idcards');
      // تأكد من تنسيق عنوان URL للصورة بشكل صحيح
      onSettingsChange({ idCardBackgroundImage: data.url });
      toast.success('تم رفع خلفية الكارنيه بنجاح');
    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('فشل في رفع خلفية الكارنيه');
    } finally {
      setUploadingBackground(false);
    }
  };

  // تحديث أبعاد الكارنيه
  const handleDimensionsChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onSettingsChange({ [`idCard${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`]: numValue });
    }
  };

  // تحديث النص الإضافي
  const handleAdditionalTextChange = (value: string) => {
    setAdditionalText(value);
    onSettingsChange({ idCardAdditionalText: value });
  };

  // إعادة تعيين المواضع
  const resetPositions = () => {
    const updates: Partial<IdCardSettings> = {};
    ELEMENTS.forEach(element => {
      updates[element.positionKey as keyof IdCardSettings] = element.defaultPos;
    });
    onSettingsChange(updates);
    toast.success('تم إعادة تعيين مواضع العناصر');
  };

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* منطقة معاينة الكارنيه */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h4 className="text-xl font-semibold text-tiba-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-tiba-primary-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              معاينة الكارنيه
            </h4>

            <div className="flex justify-center mb-5 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <div 
                ref={cardRef}
                className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg"
                style={{ 
                  width: `${settings.idCardWidth}px`, 
                  height: `${settings.idCardHeight}px`,
                  backgroundImage: settings.idCardBackgroundImage ? `url(${getImageUrl(settings.idCardBackgroundImage)})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {/* عناصر الكارنيه */}
                {ELEMENTS.map((element) => {
                  const position = getElementPosition(element.id);
                  const isVisible = getElementVisibility(element.id);
                  
                  // if (element.id === 'qrCode') {
                  //   console.log('QR Code element:', { position, isVisible, element }); // للتشخيص
                  // }
                  
                  if (!isVisible) return null;
                  
                  return (
                    <div 
                      key={`${element.id}-${position.x}-${position.y}`}
                      className={`absolute cursor-move select-none ${activeElement === element.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                      style={{ 
                        left: `${position.x}px`, 
                        top: `${position.y}px`,
                        padding: '4px',
                        backgroundColor: activeElement === element.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '4px',
                        border: activeElement === element.id ? '2px solid #3b82f6' : '1px dashed #aaa',
                        zIndex: activeElement === element.id ? 10 : 1
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        // if (element.id === 'qrCode') {
                        //   console.log('QR Code mouseDown event triggered'); // للتشخيص
                        // }
                        handleDragStart(element.id);
                      }}
                    >
                      {element.id === 'logo' && settings.centerLogo && (
                        <img 
                          src={getImageUrl(settings.centerLogo)} 
                          alt="شعار المركز" 
                          style={{
                            width: `${(getElementSize(element.id) as ElementSize)?.width || 60}px`,
                            height: `${(getElementSize(element.id) as ElementSize)?.height || 60}px`,
                            objectFit: 'fill', // تغيير من object-contain إلى object-fill لملء المساحة المحددة
                          }}
                          className="pointer-events-none"
                        />
                      )}
                      {element.id === 'logo' && !settings.centerLogo && (
                        <div style={{
                          width: `${(getElementSize(element.id) as ElementSize)?.width || 60}px`,
                          height: `${(getElementSize(element.id) as ElementSize)?.height || 60}px`,
                        }} className="bg-gray-200 flex items-center justify-center pointer-events-none">
                          <BuildingOffice2Icon className="w-8 h-8 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                      {element.id === 'photo' && (
                        <div style={{
                          width: `${(getElementSize(element.id) as ElementSize)?.width || 80}px`,
                          height: `${(getElementSize(element.id) as ElementSize)?.height || 100}px`,
                        }} className="bg-gray-200 flex items-center justify-center pointer-events-none">
                          <PhotoIcon className="w-10 h-10 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                      {element.id === 'name' && (
                        <div style={{ fontSize: `${getElementSize(element.id) || 16}px` }} className="font-bold pointer-events-none">اسم الطالب</div>
                      )}
                      {element.id === 'nationalId' && (
                        <div style={{ fontSize: `${getElementSize(element.id) || 14}px` }} className="text-xs pointer-events-none">الرقم القومي: 12345678901234</div>
                      )}
                      {element.id === 'program' && (
                        <div style={{ fontSize: `${getElementSize(element.id) || 14}px` }} className="text-xs pointer-events-none">البرنامج: تكنولوجيا المعلومات</div>
                      )}
                      {element.id === 'centerName' && (
                        <div style={{ fontSize: `${getElementSize(element.id) || 14}px` }} className="font-semibold pointer-events-none">{settings.centerName || 'اسم المركز'}</div>
                      )}
                      {element.id === 'additionalText' && (
                        <div style={{ fontSize: `${getElementSize(element.id) || 14}px` }} className="pointer-events-none">{additionalText || 'نص إضافي'}</div>
                      )}
                      {element.id === 'qrCode' && (
                        <div style={{
                          width: `${(getElementSize(element.id) as ElementSize)?.width || 60}px`,
                          height: `${(getElementSize(element.id) as ElementSize)?.height || 60}px`,
                        }} className="bg-gray-200 flex items-center justify-center border relative">
                          <QrCodeIcon className="w-8 h-8 text-gray-400 pointer-events-none" />
                          <div className="text-xs text-gray-600 absolute bottom-1 left-1/2 transform -translate-x-1/2 pointer-events-none">QR</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-tiba-primary-50 p-3 rounded-lg border border-tiba-primary-100">
                <label className="block text-sm font-medium text-tiba-primary-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" />
                  </svg>
                  عرض الكارنيه (بكسل)
                </label>
                <Input
                  type="number"
                  value={settings.idCardWidth}
                  onChange={(e) => handleDimensionsChange('width', e.target.value)}
                  className="text-tiba-primary-700 border-tiba-primary-300 focus:border-tiba-primary-500 focus:ring-tiba-primary-500"
                  min={200}
                  max={800}
                />
              </div>
              <div className="bg-tiba-secondary-50 p-3 rounded-lg border border-tiba-secondary-100">
                <label className="block text-sm font-medium text-tiba-secondary-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" />
                  </svg>
                  ارتفاع الكارنيه (بكسل)
                </label>
                <Input
                  type="number"
                  value={settings.idCardHeight}
                  onChange={(e) => handleDimensionsChange('height', e.target.value)}
                  className="text-tiba-secondary-700 border-tiba-secondary-300 focus:border-tiba-secondary-500 focus:ring-tiba-secondary-500"
                  min={100}
                  max={500}
                />
              </div>
            </div>

            <div className="mb-5 bg-tiba-warning-50 p-3 rounded-lg border border-tiba-warning-100">
              <label className="block text-sm font-medium text-tiba-warning-700 mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                النص الإضافي
              </label>
              <Input
                value={additionalText}
                onChange={(e) => handleAdditionalTextChange(e.target.value)}
                className="text-tiba-warning-700 border-tiba-warning-300 focus:border-tiba-warning-500 focus:ring-tiba-warning-500"
                placeholder="أدخل النص الإضافي للكارنيه"
              />
            </div>

            <div className="flex justify-center space-x-4 space-x-reverse">
              <Button
                type="button"
                onClick={resetPositions}
                className="flex items-center bg-gradient-to-r from-tiba-secondary-500 to-tiba-primary-500 hover:from-tiba-secondary-600 hover:to-tiba-primary-600 text-white"
              >
                <ArrowPathIcon className="w-5 h-5 ml-2" />
                إعادة تعيين المواضع
              </Button>
            </div>
          </div>
        </div>

        {/* منطقة الإعدادات */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
            {/* رفع صورة الخلفية */}
            <div className="mb-6 bg-gradient-to-br from-tiba-primary-50 to-tiba-secondary-50 p-4 rounded-lg border border-tiba-primary-100">
              <h5 className="font-medium text-base text-tiba-gray-800 mb-3 flex items-center">
                <PhotoIcon className="w-5 h-5 ml-2 text-tiba-primary-600" />
                خلفية الكارنيه
              </h5>
              {settings.idCardBackgroundImage ? (
                <div className="relative mb-3">
                  <img 
                    src={getImageUrl(settings.idCardBackgroundImage)} 
                    alt="خلفية الكارنيه" 
                    className="w-full h-32 object-fill rounded-lg border border-gray-200 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ idCardBackgroundImage: undefined })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-tiba-primary-200 rounded-lg p-4 text-center mb-3 bg-white">
                  <PhotoIcon className="w-10 h-10 text-tiba-primary-400 mx-auto mb-2" />
                  <p className="text-sm text-tiba-gray-600 mb-2">لم يتم رفع خلفية بعد</p>
                </div>
              )}
              <div className="mt-2">
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                    disabled={uploadingBackground}
                  />
                  <div className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-tiba-secondary-500 to-tiba-primary-500 text-white rounded-lg hover:from-tiba-secondary-600 hover:to-tiba-primary-600 transition-colors w-full font-medium shadow-md">
                    {uploadingBackground ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white ml-2"></div>
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="w-5 h-5 ml-2" />
                        {settings.idCardBackgroundImage ? 'تغيير الخلفية' : 'رفع خلفية'}
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* قائمة العناصر */}
            <div>
              <h5 className="font-medium text-base text-tiba-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-tiba-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                عناصر الكارنيه
              </h5>
              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                {ELEMENTS.map((element) => (
                  <div 
                    key={element.id}
                    className={`p-3 rounded-lg border transition-all ${
                      activeElement === element.id 
                        ? 'bg-gradient-to-r from-tiba-primary-50 to-tiba-secondary-50 border-tiba-primary-300 shadow-md' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center cursor-pointer"
                        onClick={() => setActiveElement(element.id)}
                      >
                        <element.icon className="w-5 h-5 text-tiba-secondary-600 ml-2" />
                        <span className="text-sm font-medium text-tiba-gray-700">{element.name}</span>
                      </div>
                      
                      {/* تبديل إظهار/إخفاء العنصر */}
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 ml-2">{getElementVisibility(element.id) ? 'ظاهر' : 'مخفي'}</span>
                        <div 
                          onClick={() => toggleElementVisibility(element.id)}
                          className={`w-10 h-5 rounded-full transition-all cursor-pointer flex items-center ${getElementVisibility(element.id) ? 'bg-tiba-primary-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-all transform ${getElementVisibility(element.id) ? 'translate-x-5' : 'translate-x-1'}`}></div>
                        </div>
                      </div>
                    </div>

                    {getElementVisibility(element.id) && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        <div className="text-xs text-gray-500 bg-white p-1.5 rounded border border-gray-200 flex items-center justify-between">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-tiba-primary-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                            </svg>
                            الموضع:
                          </div>
                          <div className="flex items-center">
                            <span className="mx-1">X: {getElementPosition(element.id).x}</span>
                            <span className="mx-1">|</span>
                            <span className="mx-1">Y: {getElementPosition(element.id).y}</span>
                          </div>
                        </div>
                        
                        {/* التحكم في حجم العنصر */}
                        {(element.id === 'logo' || element.id === 'photo' || element.id === 'qrCode') ? (
                          // حجم الصور (عرض وارتفاع)
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-1.5 rounded border border-gray-200">
                              <label className="text-xs text-gray-500 mb-1 block flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-tiba-secondary-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                العرض
                              </label>
                              <Input
                                type="number"
                                className="h-7 text-xs border-gray-200 focus:ring-tiba-secondary-500 focus:border-tiba-secondary-500"
                                value={(getElementSize(element.id) as ElementSize)?.width || 60}
                                onChange={(e) => {
                                  const currentSize = getElementSize(element.id) as ElementSize;
                                  updateElementSize(element.id, {
                                    width: parseInt(e.target.value, 10) || 60,
                                    height: currentSize?.height || 60
                                  });
                                }}
                              />
                            </div>
                            <div className="bg-white p-1.5 rounded border border-gray-200">
                              <label className="text-xs text-gray-500 mb-1 block flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-tiba-secondary-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                الارتفاع
                              </label>
                              <Input
                                type="number"
                                className="h-7 text-xs border-gray-200 focus:ring-tiba-secondary-500 focus:border-tiba-secondary-500"
                                value={(getElementSize(element.id) as ElementSize)?.height || 60}
                                onChange={(e) => {
                                  const currentSize = getElementSize(element.id) as ElementSize;
                                  updateElementSize(element.id, {
                                    width: currentSize?.width || 60,
                                    height: parseInt(e.target.value, 10) || 60
                                  });
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          // حجم النص
                          <div className="bg-white p-1.5 rounded border border-gray-200">
                            <label className="text-xs text-gray-500 mb-1 block flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-tiba-secondary-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                              حجم الخط
                            </label>
                            <Input
                              type="number"
                              className="h-7 text-xs border-gray-200 focus:ring-tiba-secondary-500 focus:border-tiba-secondary-500"
                              value={getElementSize(element.id) as number || 14}
                              onChange={(e) => updateElementSize(element.id, parseInt(e.target.value, 10) || 14)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 bg-tiba-primary-50 p-2 rounded-lg border border-tiba-primary-100 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 mt-0.5 flex-shrink-0 text-tiba-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                انقر على أي عنصر من القائمة ثم اسحبه في منطقة المعاينة لتغيير موضعه. يمكنك أيضاً التحكم في حجم العناصر وإظهارها أو إخفائها.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 