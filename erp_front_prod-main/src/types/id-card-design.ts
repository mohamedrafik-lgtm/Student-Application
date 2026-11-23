// تعريف أنواع البيانات للنظام الجديد لتصميم الكارنيهات

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  direction?: 'ltr' | 'rtl';
  padding?: number;
  borderRadius?: number;
  border?: string;
  opacity?: number;
  rotation?: number; // زاوية الدوران بالدرجات
}

export interface IdCardElement {
  id: string; // معرف فريد للعنصر
  type: 'text' | 'image' | 'logo' | 'qr' | 'barcode' | 'shape'; // نوع العنصر - إضافة barcode
  position: Position; // موضع العنصر
  size: Size; // حجم العنصر
  style?: TextStyle; // تنسيق العنصر
  content?: string; // المحتوى النصي أو مسار الصورة
  data?: Record<string, unknown>; // بيانات إضافية خاصة بالعنصر
  visible?: boolean; // هل العنصر مرئي
  zIndex?: number; // ترتيب العنصر في الطبقات
  locked?: boolean; // هل العنصر مقفل (غير قابل للتحرير)
  // خصائص جديدة للحدود
  border?: {
    enabled: boolean;
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  // خصائص شكل الصورة
  imageShape?: {
    type: 'square' | 'circle' | 'rounded';
    borderRadius?: number; // للمربع بحواف ناعمة
  };
}

export interface IdCardDesign {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundImageCloudinaryId?: string;
  backgroundColor?: string;
  designData: {
    elements: IdCardElement[];
    version: string;
    lastModified: string;
  };
  version: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ResizeHandle {
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  cursor: string;
}

export interface DragGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  visible: boolean;
}

export interface DesignerState {
  selectedElement: string | null;
  isResizing: boolean;
  isDragging: boolean;
  dragOffset: Position;
  resizeHandle: string | null;
  showGuides: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
}

// أبعاد الكارنيه القياسية الدقيقة (ISO/IEC 7810 ID-1)
export const STANDARD_ID_CARD_DIMENSIONS = {
  // الأبعاد الصحيحة بالبكسل (96 DPI - حجم الكريديت كارد الفعلي)
  width_96dpi: 323,   // 85.60mm @ 96 DPI = 323px
  height_96dpi: 204,  // 53.98mm @ 96 DPI = 204px
  
  // بدقة 300 DPI (للطباعة)
  width_300dpi: 1011,  // 85.60mm @ 300 DPI
  height_300dpi: 638,  // 53.98mm @ 300 DPI
  
  // بدقة 600 DPI (للطباعة الاحترافية)
  width_600dpi: 2022,  // 85.60mm @ 600 DPI
  height_600dpi: 1276, // 53.98mm @ 600 DPI
  
  // الأبعاد بالملليمتر (دقيقة)
  widthMM: 85.60,
  heightMM: 53.98,
  
  // الأبعاد بالبوصة (دقيقة)
  widthInch: 3.37007874,
  heightInch: 2.12598425
};

// عناصر افتراضية للتصميم (بأبعاد الكريديت كارد الصحيحة 323×204)
export const DEFAULT_ELEMENTS: Partial<IdCardElement>[] = [
  {
    id: 'logo',
    type: 'logo',
    position: { x: 240, y: 10 },
    size: { width: 70, height: 70 },
    visible: true,
    zIndex: 2,
    locked: false,
  },
  {
    id: 'photo',
    type: 'image',
    position: { x: 15, y: 40 },
    size: { width: 80, height: 100 },
    visible: true,
    zIndex: 1,
    locked: false,
  },
  {
    id: 'centerName',
    type: 'text',
    position: { x: 110, y: 15 },
    size: { width: 120, height: 25 },
    style: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#000000',
      textAlign: 'center',
      direction: 'rtl',
    },
    content: 'اسم المركز',
    visible: true,
    zIndex: 2,
    locked: false,
  },
  {
    id: 'name',
    type: 'text',
    position: { x: 110, y: 50 },
    size: { width: 200, height: 25 },
    style: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#000000',
      textAlign: 'right',
      direction: 'rtl',
    },
    content: 'اسم الطالب',
    visible: true,
    zIndex: 2,
    locked: false,
  },
  {
    id: 'nationalId',
    type: 'text',
    position: { x: 110, y: 80 },
    size: { width: 200, height: 20 },
    style: {
      fontSize: 12,
      color: '#333333',
      textAlign: 'right',
      direction: 'rtl',
    },
    content: 'الرقم القومي',
    visible: true,
    zIndex: 2,
    locked: false,
  },
  {
    id: 'program',
    type: 'text',
    position: { x: 110, y: 105 },
    size: { width: 200, height: 20 },
    style: {
      fontSize: 12,
      color: '#333333',
      textAlign: 'right',
      direction: 'rtl',
    },
    content: 'البرنامج',
    visible: true,
    zIndex: 2,
    locked: false,
  },
  {
    id: 'traineeId',
    type: 'text',
    position: { x: 110, y: 130 },
    size: { width: 120, height: 20 },
    style: {
      fontSize: 12,
      color: '#333333',
      textAlign: 'right',
      direction: 'rtl',
    },
    content: 'رقم المتدرب',
    visible: false, // مخفي افتراضياً
    zIndex: 2,
    locked: false,
  },
  {
    id: 'qrCode',
    type: 'qr',
    position: { x: 15, y: 150 },
    size: { width: 45, height: 45 },
    visible: true,
    zIndex: 1,
    locked: false,
  },
  {
    id: 'barcode',
    type: 'barcode',
    position: { x: 70, y: 150 },
    size: { width: 150, height: 35 },
    style: {
      lineColor: '#000000',
      background: 'transparent',
    },
    visible: false, // مخفي افتراضياً
    zIndex: 1,
    locked: false,
  },
];

// مقابض تغيير الحجم
export const RESIZE_HANDLES: ResizeHandle[] = [
  { position: 'nw', cursor: 'nw-resize' },
  { position: 'n', cursor: 'n-resize' },
  { position: 'ne', cursor: 'ne-resize' },
  { position: 'e', cursor: 'e-resize' },
  { position: 'se', cursor: 'se-resize' },
  { position: 's', cursor: 's-resize' },
  { position: 'sw', cursor: 'sw-resize' },
  { position: 'w', cursor: 'w-resize' },
];

// دالة حساب مقياس الكريديت كارد الصحيح - بساطة تامة!
export const calculateCreditCardScale = (designWidth: number): number => {
  // إذا كان التصميم بالأبعاد الصحيحة (323px)، لا نحتاج مقياس
  if (designWidth === STANDARD_ID_CARD_DIMENSIONS.width_96dpi) {
    return 1.0;
  }
  
  // وإلا نحسب المقياس
  return STANDARD_ID_CARD_DIMENSIONS.width_96dpi / designWidth;
};