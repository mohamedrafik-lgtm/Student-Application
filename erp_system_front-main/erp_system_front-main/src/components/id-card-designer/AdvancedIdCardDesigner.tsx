"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  IdCardDesign, 
  IdCardElement, 
  Position, 
  Size, 
  DesignerState,
  RESIZE_HANDLES 
} from '@/types/id-card-design';
import { idCardDesignsAPI } from '@/lib/id-card-designs-api';
import { toast } from 'react-hot-toast';
import DesignerCanvas from './DesignerCanvas';
import ElementPropertiesPanel from './ElementPropertiesPanel';
import ToolbarPanel from './ToolbarPanel';
import ElementLayersPanel from './ElementLayersPanel';
import CardDimensionsPanel from './CardDimensionsPanel';

interface AdvancedIdCardDesignerProps {
  design: IdCardDesign;
  onDesignChange: (design: IdCardDesign) => void;
  readOnly?: boolean;
}

export default function AdvancedIdCardDesigner({
  design,
  onDesignChange,
  readOnly = false
}: AdvancedIdCardDesignerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [designerState, setDesignerState] = useState<DesignerState>({
    selectedElement: null,
    isResizing: false,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    resizeHandle: null,
    showGuides: true,
    snapToGrid: true, // تفعيل المحاذاة افتراضياً
    gridSize: 5, // شبكة أدق للتحكم الأفضل
    zoom: 1,
  });

  const [resizeStartData, setResizeStartData] = useState<{
    elementId: string;
    handle: string;
    startPosition: { x: number; y: number };
    startSize: { width: number; height: number };
    mouseStart: { x: number; y: number };
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [elements, setElements] = useState<IdCardElement[]>(design.designData.elements);
  const [copiedElement, setCopiedElement] = useState<IdCardElement | null>(null);
  const [multiSelectElements, setMultiSelectElements] = useState<string[]>([]);

  // تحديث العناصر عند تغيير التصميم
  useEffect(() => {
    setElements(design.designData.elements);
  }, [design.designData.elements]);



  // حفظ التصميم
  const saveDesign = useCallback(async (updatedElements?: IdCardElement[]) => {
    if (readOnly) return;

    setSaving(true);
    try {
      const elementsToSave = updatedElements || elements;
      // console.log('حفظ العناصر:', elementsToSave.map(el => ({ 
      //   id: el.id, 
      //   type: el.type, 
      //   imageShape: el.imageShape 
      // })));
      
      const updatedDesign = await idCardDesignsAPI.saveElements(design.id, elementsToSave);
      onDesignChange(updatedDesign);
      setHasUnsavedChanges(false);
      toast.success('تم حفظ التصميم بنجاح');
    } catch (error) {
      console.error('Error saving design:', error);
      toast.error('حدث خطأ أثناء حفظ التصميم');
    } finally {
      setSaving(false);
    }
  }, [design.id, elements, onDesignChange, readOnly]);

  // تحديث أبعاد التصميم
  const updateDimensions = useCallback(async (width: number, height: number) => {
    if (readOnly) return;

    try {
      const updatedDesign = await idCardDesignsAPI.update(design.id, {
        width,
        height
      });
      onDesignChange(updatedDesign);
      toast.success('تم تحديث أبعاد الكارنيه بنجاح');
    } catch (error) {
      console.error('Error updating dimensions:', error);
      toast.error('حدث خطأ أثناء تحديث الأبعاد');
    }
  }, [design.id, onDesignChange, readOnly]);

  // تحديث عنصر
  const updateElement = useCallback((elementId: string, updates: Partial<IdCardElement>) => {
    // if (updates.imageShape) {
    //   console.log('تحديث imageShape للعنصر:', elementId, updates.imageShape);
    // }
    
    setElements(prev => 
      prev.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // دالة تحريك العنصر بالأسهم
  const moveElement = useCallback((deltaX: number, deltaY: number) => {
    if (!designerState.selectedElement) return;

    const element = elements.find(el => el.id === designerState.selectedElement);
    if (!element) return;

    // تطبيق التحريك بالبكسل الفعلي (بدون تأثير الزوم)
    let newX = element.position.x + deltaX;
    let newY = element.position.y + deltaY;

    // المحاذاة للشبكة إذا كانت مفعلة
    if (designerState.snapToGrid) {
      newX = Math.round(newX / designerState.gridSize) * designerState.gridSize;
      newY = Math.round(newY / designerState.gridSize) * designerState.gridSize;
    }

    // السماح بالحركة خارج الحدود قليلاً
    const allowedOverflow = 0.75;
    newX = Math.max(-element.size.width * allowedOverflow, Math.min(newX, design.width - element.size.width * (1 - allowedOverflow)));
    newY = Math.max(-element.size.height * allowedOverflow, Math.min(newY, design.height - element.size.height * (1 - allowedOverflow)));

    updateElement(designerState.selectedElement, {
      position: { x: newX, y: newY }
    });
    
    setHasUnsavedChanges(true);
  }, [designerState.selectedElement, elements, designerState.snapToGrid, designerState.gridSize, design.width, design.height, updateElement]);

  // نسخ العنصر
  const copyElement = useCallback(() => {
    if (!designerState.selectedElement) return;

    const element = elements.find(el => el.id === designerState.selectedElement);
    if (element) {
      setCopiedElement({ ...element });
      toast.success('تم نسخ العنصر');
    }
  }, [designerState.selectedElement, elements]);

  // لصق العنصر
  const pasteElement = useCallback(() => {
    if (!copiedElement) {
      toast.error('لا يوجد عنصر منسوخ');
      return;
    }

    // إنشاء معرف فريد للعنصر الجديد
    let newId = `${copiedElement.id}_paste_${Date.now()}`;
    while (elements.some(el => el.id === newId)) {
      newId = `${copiedElement.id}_paste_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    const newElement: IdCardElement = {
      ...copiedElement,
      id: newId,
      position: {
        x: copiedElement.position.x + 20,
        y: copiedElement.position.y + 20,
      },
      zIndex: elements.length + 1,
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    setDesignerState(prev => ({ ...prev, selectedElement: newElement.id }));
    setHasUnsavedChanges(true);
    
    toast.success('تم لصق العنصر');
  }, [copiedElement, elements]);

  // إضافة عنصر جديد
  const addElement = useCallback((elementType: string, customProps?: any) => {
    if (readOnly) return;

    // تحديد الحجم المناسب لكل نوع عنصر
    let elementSize = { width: 100, height: 100 };
    if (elementType === 'text') {
      elementSize = { width: 150, height: 30 };
    } else if (elementType === 'barcode') {
      elementSize = { width: 150, height: 35 }; // حجم محسن للباركود
    } else if (elementType === 'qr') {
      elementSize = { width: 80, height: 80 }; // حجم مربع للQR
    }

    // التأكد من أن المعرف فريد
    let elementId = customProps?.id || `element_${Date.now()}`;
    
    // إذا كان المعرف موجود مسبقاً، إنشاء معرف جديد
    if (elements.some(el => el.id === elementId)) {
      elementId = `${elementId}_${Date.now()}`;
    }

    const newElement: IdCardElement = {
      id: elementId,
      type: elementType as any,
      position: { x: 50, y: 50 },
      size: elementSize,
      visible: true,
      zIndex: elements.length + 1,
      locked: false,
      ...(elementType === 'text' && {
        content: customProps?.content || 'نص جديد',
        style: {
          fontSize: customProps?.style?.fontSize || 16,
          fontWeight: customProps?.style?.fontWeight || 'bold',
          color: customProps?.style?.color || '#000000',
          textAlign: customProps?.style?.textAlign || 'right',
          direction: customProps?.style?.direction || 'rtl',
          ...customProps?.style
        }
      })
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    setDesignerState(prev => ({ ...prev, selectedElement: newElement.id }));
    
    setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
  }, [elements, readOnly, saveDesign]);

  // حذف عنصر
  const removeElement = useCallback((elementId: string) => {
    if (readOnly) return;

    const updatedElements = elements.filter(el => el.id !== elementId);
    setElements(updatedElements);
    
    if (designerState.selectedElement === elementId) {
      setDesignerState(prev => ({ ...prev, selectedElement: null }));
    }
    
    setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
  }, [elements, designerState.selectedElement, readOnly, saveDesign]);

  // نسخ عنصر
  const duplicateElement = useCallback((elementId: string) => {
    if (readOnly) return;

    const elementToCopy = elements.find(el => el.id === elementId);
    if (!elementToCopy) return;

    // إنشاء معرف فريد للنسخة الجديدة
    let newId = `${elementToCopy.id}_copy_${Date.now()}`;
    
    // التأكد من أن المعرف فريد
    while (elements.some(el => el.id === newId)) {
      newId = `${elementToCopy.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    const newElement: IdCardElement = {
      ...elementToCopy,
      id: newId,
      position: {
        x: elementToCopy.position.x + 20,
        y: elementToCopy.position.y + 20,
      },
      zIndex: elements.length + 1,
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    setDesignerState(prev => ({ ...prev, selectedElement: newElement.id }));
    
    setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
  }, [elements, readOnly, saveDesign]);

  // تحديد عنصر
  const selectElement = useCallback((elementId: string | null) => {
    setDesignerState(prev => ({ 
      ...prev, 
      selectedElement: elementId,
      isResizing: false,
      isDragging: false 
    }));
  }, []);

  // تغيير خلفية الكارنيه
  const changeBackground = useCallback(async (file: File | null, color?: string) => {
    if (readOnly) return;

    try {
      if (file) {
        // رفع ملف الخلفية
        const { uploadFile } = await import('@/lib/api');
        const uploadResult = await uploadFile(file, 'idcards');
        
        const updatedDesign = await idCardDesignsAPI.update(design.id, {
          backgroundImage: uploadResult.url,
          backgroundColor: undefined
        });
        onDesignChange(updatedDesign);
        toast.success('تم تغيير خلفية الكارنيه بنجاح');
      } else if (color) {
        // تغيير لون الخلفية
        const updatedDesign = await idCardDesignsAPI.update(design.id, {
          backgroundColor: color,
          backgroundImage: undefined
        });
        onDesignChange(updatedDesign);
        toast.success('تم تغيير لون خلفية الكارنيه بنجاح');
      }
    } catch (error) {
      console.error('Error changing background:', error);
      toast.error('حدث خطأ أثناء تغيير الخلفية');
    }
  }, [design.id, onDesignChange, readOnly]);

  const updateCardDimensions = useCallback(async (width: number, height: number) => {
    if (readOnly) return;
    try {
      const updatedDesign = await idCardDesignsAPI.update(design.id, {
        width,
        height
      });
      onDesignChange(updatedDesign);
      setHasUnsavedChanges(true);
      toast.success(`تم تحديث أبعاد الكارنيه إلى ${width} × ${height} بكسل`);
    } catch (error) {
      console.error('Error updating card dimensions:', error);
      toast.error('حدث خطأ أثناء تحديث أبعاد الكارنيه');
    }
  }, [design.id, onDesignChange, readOnly]);

  // معالجة بدء السحب
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (readOnly || designerState.isResizing) return; // منع السحب أثناء تغيير الحجم

    // التحقق من أن النقر ليس على مقبض تغيير الحجم
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) return;

    e.preventDefault();
    e.stopPropagation();

    const element = elements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // حساب dragOffset مع مراعاة الزوم
    const actualScale = designerState.zoom || 1;
    setDesignerState(prev => ({
      ...prev,
      selectedElement: elementId,
      isDragging: true,
      dragOffset: {
        x: mouseX - (element.position.x * actualScale),
        y: mouseY - (element.position.y * actualScale),
      },
    }));
  }, [elements, readOnly]);

  // معالجة السحب
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!designerState.isDragging || !designerState.selectedElement || readOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // تحويل موضع الماوس من الشاشة إلى التصميم الفعلي (تعديل للزوم)
    const actualScale = designerState.zoom || 1;
    let newX = (mouseX - designerState.dragOffset.x) / actualScale;
    let newY = (mouseY - designerState.dragOffset.y) / actualScale;

    // المحاذاة للشبكة إذا كانت مفعلة
    if (designerState.snapToGrid) {
      newX = Math.round(newX / designerState.gridSize) * designerState.gridSize;
      newY = Math.round(newY / designerState.gridSize) * designerState.gridSize;
    }

    // السماح بالسحب خارج الحدود قليلاً (للمرونة في التحرير)
    const element = elements.find(el => el.id === designerState.selectedElement);
    const elementWidth = element?.size.width || 50;
    const elementHeight = element?.size.height || 50;
    
    // السماح بخروج 75% من العنصر خارج الحدود
    const allowedOverflow = 0.75;
    newX = Math.max(-elementWidth * allowedOverflow, Math.min(newX, design.width - elementWidth * (1 - allowedOverflow)));
    newY = Math.max(-elementHeight * allowedOverflow, Math.min(newY, design.height - elementHeight * (1 - allowedOverflow)));

    updateElement(designerState.selectedElement, {
      position: { x: newX, y: newY }
    });
  }, [
    designerState.isDragging, 
    designerState.selectedElement, 
    designerState.dragOffset,
    designerState.snapToGrid,
    designerState.gridSize,
    designerState.zoom,
    design.width,
    design.height,
    updateElement,
    readOnly
  ]);

  // معالجة انتهاء السحب
  const handleMouseUp = useCallback(() => {
    if (designerState.isDragging) {
      setDesignerState(prev => ({ 
        ...prev, 
        isDragging: false 
      }));
      
      setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
    }
    
    if (designerState.isResizing) {
      setDesignerState(prev => ({ 
        ...prev, 
        isResizing: false,
        resizeHandle: null
      }));
      setResizeStartData(null);
      
      setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
    }
  }, [designerState.isDragging, designerState.isResizing]);

  // معالجة بدء تغيير الحجم
  const handleResizeStart = useCallback((elementId: string, handle: string) => {
    if (readOnly) return;

    const element = elements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDesignerState(prev => ({
      ...prev,
      selectedElement: elementId,
      isResizing: true,
      resizeHandle: handle,
    }));

    setResizeStartData({
      elementId,
      handle,
      startPosition: { ...element.position },
      startSize: { ...element.size },
      mouseStart: { x: 0, y: 0 }, // سيتم تحديثه في handleResize
    });
  }, [elements, readOnly]);

  // معالجة تغيير الحجم
  const handleResize = useCallback((elementId: string, handle: string, deltaX: number, deltaY: number) => {
    if (!designerState.isResizing || !resizeStartData || readOnly) return;

    const element = elements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    // حساب الحجم والموضع الجديد بناءً على التراكم من البداية
    let newWidth = resizeStartData.startSize.width;
    let newHeight = resizeStartData.startSize.height;
    let newX = resizeStartData.startPosition.x;
    let newY = resizeStartData.startPosition.y;

    // تطبيق التغييرات حسب المقبض مع التراكم من نقطة البداية
    switch (handle) {
      case 'nw':
        newWidth = Math.max(20, resizeStartData.startSize.width - deltaX);
        newHeight = Math.max(20, resizeStartData.startSize.height - deltaY);
        newX = resizeStartData.startPosition.x + deltaX;
        newY = resizeStartData.startPosition.y + deltaY;
        break;
      case 'n':
        newHeight = Math.max(20, resizeStartData.startSize.height - deltaY);
        newY = resizeStartData.startPosition.y + deltaY;
        break;
      case 'ne':
        newWidth = Math.max(20, resizeStartData.startSize.width + deltaX);
        newHeight = Math.max(20, resizeStartData.startSize.height - deltaY);
        newY = resizeStartData.startPosition.y + deltaY;
        break;
      case 'e':
        newWidth = Math.max(20, resizeStartData.startSize.width + deltaX);
        break;
      case 'se':
        newWidth = Math.max(20, resizeStartData.startSize.width + deltaX);
        newHeight = Math.max(20, resizeStartData.startSize.height + deltaY);
        break;
      case 's':
        newHeight = Math.max(20, resizeStartData.startSize.height + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(20, resizeStartData.startSize.width - deltaX);
        newHeight = Math.max(20, resizeStartData.startSize.height + deltaY);
        newX = resizeStartData.startPosition.x + deltaX;
        break;
      case 'w':
        newWidth = Math.max(20, resizeStartData.startSize.width - deltaX);
        newX = resizeStartData.startPosition.x + deltaX;
        break;
    }

    // التأكد من البقاء داخل حدود الكانفاس
    if (newX < 0) {
      newWidth += newX;
      newX = 0;
    }
    if (newY < 0) {
      newHeight += newY;
      newY = 0;
    }
    
    newWidth = Math.min(newWidth, design.width - newX);
    newHeight = Math.min(newHeight, design.height - newY);
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    updateElement(elementId, {
      position: { x: newX, y: newY },
      size: { width: newWidth, height: newHeight }
    });
  }, [designerState.isResizing, resizeStartData, elements, design.width, design.height, updateElement, readOnly]);

  // معالجة انتهاء تغيير الحجم
  const handleResizeEnd = useCallback(() => {
    if (designerState.isResizing) {
      setDesignerState(prev => ({
        ...prev,
        isResizing: false,
        resizeHandle: null,
      }));
      setResizeStartData(null);
      
      setHasUnsavedChanges(true);
    
    // لا حفظ تلقائي - فقط عند الضغط على زر حفظ
    }
  }, [designerState.isResizing]);

  // معالجة النقر على الكانفاس
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // إلغاء تحديد العنصر إذا تم النقر على مساحة فارغة
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  }, [selectElement]);

  // معالجة أحداث لوحة المفاتيح للتحكم الاحترافي
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly || !designerState.selectedElement) return;

      // منع التداخل مع حقول النص
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const step = e.shiftKey ? 10 : 1; // Shift للحركة السريعة

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveElement(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveElement(0, step);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveElement(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveElement(step, 0);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (designerState.selectedElement) {
            removeElement(designerState.selectedElement);
          }
          break;
        case 'c':
          if (e.ctrlKey) {
            e.preventDefault();
            copyElement();
          }
          break;
        case 'v':
          if (e.ctrlKey) {
            e.preventDefault();
            pasteElement();
          }
          break;
        case 'd':
          if (e.ctrlKey) {
            e.preventDefault();
            if (designerState.selectedElement) {
              duplicateElement(designerState.selectedElement);
            }
          }
          break;
        case 's':
          if (e.ctrlKey) {
            e.preventDefault();
            saveDesign();
          }
          break;
        case 'z':
          if (e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            // TODO: إضافة Undo
          }
          break;
        case 'y':
          if (e.ctrlKey) {
            e.preventDefault();
            // TODO: إضافة Redo
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [designerState.selectedElement, readOnly, moveElement, copyElement, pasteElement, removeElement, duplicateElement, saveDesign]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* شريط الأدوات المحسن */}
      <div className="flex-shrink-0 h-full">
        <ToolbarPanel
          onAddElement={addElement}
          onSave={() => saveDesign()}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          readOnly={readOnly}
          designerState={designerState}
          onStateChange={setDesignerState}
          onChangeBackground={changeBackground}
          onCopyElement={copyElement}
          onPasteElement={pasteElement}
          onHasCopiedElement={!!copiedElement}
          onRemoveElement={removeElement}
          onDuplicateElement={duplicateElement}
        />
      </div>

      {/* منطقة التصميم الرئيسية */}
      <div className="flex-1 flex flex-col">
        {/* شريط حالة التحرير */}
        {!readOnly && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              {designerState.selectedElement && (
                <>
                  <span className="font-medium text-gray-800">
                    {elements.find(el => el.id === designerState.selectedElement)?.type || 'عنصر'}
                  </span>
                  <span>
                    الموضع: {Math.round(elements.find(el => el.id === designerState.selectedElement)?.position.x || 0)}, 
                    {Math.round(elements.find(el => el.id === designerState.selectedElement)?.position.y || 0)}
                  </span>
                  <span>
                    الحجم: {Math.round(elements.find(el => el.id === designerState.selectedElement)?.size.width || 0)} × 
                    {Math.round(elements.find(el => el.id === designerState.selectedElement)?.size.height || 0)}
                  </span>
                </>
              )}
              {!designerState.selectedElement && (
                <span>اضغط على عنصر لتحديده</span>
              )}
            </div>
            <div className="flex items-center space-x-4 space-x-reverse text-xs">
              <span>الأسهم: تحريك | Shift+الأسهم: تحريك سريع</span>
              <span>Ctrl+C: نسخ | Ctrl+V: لصق | Del: حذف</span>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto p-4">
          <DesignerCanvas
            ref={canvasRef}
            design={design}
            elements={elements}
            designerState={designerState}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onCanvasClick={handleCanvasClick}
            onSelectElement={selectElement}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* لوحات التحكم الجانبية */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        {/* لوحة أبعاد الكارنيه */}
        <CardDimensionsPanel
          design={design}
          onUpdateDimensions={updateDimensions}
          readOnly={readOnly}
        />

        {/* لوحة خصائص العنصر */}
        <ElementPropertiesPanel
          selectedElement={designerState.selectedElement ? 
            elements.find(el => el.id === designerState.selectedElement) : null
          }
          onUpdateElement={updateElement}
          onRemoveElement={removeElement}
          onDuplicateElement={duplicateElement}
          readOnly={readOnly}
        />

        {/* لوحة طبقات العناصر */}
        <ElementLayersPanel
          elements={elements}
          selectedElement={designerState.selectedElement}
          onSelectElement={selectElement}
          onUpdateElement={updateElement}
          onRemoveElement={removeElement}
          onDuplicateElement={duplicateElement}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
