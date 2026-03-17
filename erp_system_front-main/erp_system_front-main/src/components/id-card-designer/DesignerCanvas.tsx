"use client";

import React, { forwardRef } from 'react';
import { 
  IdCardDesign, 
  IdCardElement, 
  DesignerState 
} from '@/types/id-card-design';
import DesignerElement from './DesignerElement';
import { getImageUrl } from '@/lib/api';

interface DesignerCanvasProps {
  design: IdCardDesign;
  elements: IdCardElement[];
  designerState: DesignerState;
  onMouseDown: (e: React.MouseEvent, elementId: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onCanvasClick: (e: React.MouseEvent) => void;
  onSelectElement: (elementId: string | null) => void;
  onResizeStart: (elementId: string, handle: string) => void;
  onResize: (elementId: string, handle: string, deltaX: number, deltaY: number) => void;
  onResizeEnd: () => void;
  readOnly?: boolean;
}

const DesignerCanvas = forwardRef<HTMLDivElement, DesignerCanvasProps>(({
  design,
  elements,
  designerState,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onCanvasClick,
  onSelectElement,
  onResizeStart,
  onResize,
  onResizeEnd,
  readOnly = false
}, ref) => {
  // حساب نسبة التكبير/التصغير
  const scale = designerState.zoom;
  const scaledWidth = design.width * scale;
  const scaledHeight = design.height * scale;

  // رسم الشبكة إذا كانت مفعلة
  const renderGrid = () => {
    if (!designerState.snapToGrid) return null;

    const gridLines = [];
    const gridSize = designerState.gridSize * scale;

    // خطوط عمودية
    for (let x = 0; x <= scaledWidth; x += gridSize) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={scaledHeight}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }

    // خطوط أفقية
    for (let y = 0; y <= scaledHeight; y += gridSize) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={scaledWidth}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        width={scaledWidth}
        height={scaledHeight}
      >
        {gridLines}
      </svg>
    );
  };

  // رسم خطوط الإرشاد
  const renderGuides = () => {
    if (!designerState.showGuides || !designerState.selectedElement) return null;

    const selectedEl = elements.find(el => el.id === designerState.selectedElement);
    if (!selectedEl) return null;

    const guides = [];
    const centerX = selectedEl.position.x + selectedEl.size.width / 2;
    const centerY = selectedEl.position.y + selectedEl.size.height / 2;

    // خطوط المحاذاة مع العناصر الأخرى
    elements.forEach(el => {
      if (el.id === designerState.selectedElement || !el.visible) return;

      const elCenterX = el.position.x + el.size.width / 2;
      const elCenterY = el.position.y + el.size.height / 2;

      // محاذاة أفقية
      if (Math.abs(centerY - elCenterY) < 5) {
        guides.push(
          <line
            key={`h-guide-${el.id}`}
            x1={0}
            y1={elCenterY * scale}
            x2={scaledWidth}
            y2={elCenterY * scale}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        );
      }

      // محاذاة عمودية
      if (Math.abs(centerX - elCenterX) < 5) {
        guides.push(
          <line
            key={`v-guide-${el.id}`}
            x1={elCenterX * scale}
            y1={0}
            x2={elCenterX * scale}
            y2={scaledHeight}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        );
      }
    });

    // خطوط المحاذاة مع حواف الكانفاس
    const canvasCenterX = design.width / 2;
    const canvasCenterY = design.height / 2;

    if (Math.abs(centerX - canvasCenterX) < 5) {
      guides.push(
        <line
          key="canvas-v-center"
          x1={canvasCenterX * scale}
          y1={0}
          x2={canvasCenterX * scale}
          y2={scaledHeight}
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      );
    }

    if (Math.abs(centerY - canvasCenterY) < 5) {
      guides.push(
        <line
          key="canvas-h-center"
          x1={0}
          y1={canvasCenterY * scale}
          x2={scaledWidth}
          y2={canvasCenterY * scale}
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        width={scaledWidth}
        height={scaledHeight}
      >
        {guides}
      </svg>
    );
  };

  return (
    <div className="flex justify-center items-center min-h-full p-8">
      <div className="relative shadow-2xl bg-white rounded-lg overflow-hidden">
        {/* الكانفاس الرئيسي */}
        <div
          ref={ref}
          className="relative cursor-crosshair"
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
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={onCanvasClick}
        >
          {/* الشبكة */}
          {renderGrid()}

          {/* العناصر */}
          {elements
            .filter(el => el.visible)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map(element => (
              <DesignerElement
                key={element.id}
                element={element}
                scale={scale}
                isSelected={designerState.selectedElement === element.id}
                isDragging={designerState.isDragging && designerState.selectedElement === element.id}
                isResizing={designerState.isResizing && designerState.selectedElement === element.id}
                onMouseDown={(e) => onMouseDown(e, element.id)}
                onSelect={() => onSelectElement(element.id)}
                onResizeStart={(handle) => onResizeStart(element.id, handle)}
                onResize={(handle, deltaX, deltaY) => onResize(element.id, handle, deltaX, deltaY)}
                onResizeEnd={onResizeEnd}
                readOnly={readOnly}
              />
            ))}

          {/* خطوط الإرشاد */}
          {renderGuides()}

          {/* مؤشر الحجم والموضع */}
          {designerState.selectedElement && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded pointer-events-none">
              {(() => {
                const el = elements.find(e => e.id === designerState.selectedElement);
                if (!el) return '';
                return `X: ${Math.round(el.position.x)}، Y: ${Math.round(el.position.y)}، W: ${Math.round(el.size.width)}، H: ${Math.round(el.size.height)}`;
              })()}
            </div>
          )}
        </div>

        {/* مؤشر التكبير/التصغير */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
});

DesignerCanvas.displayName = 'DesignerCanvas';

export default DesignerCanvas;
