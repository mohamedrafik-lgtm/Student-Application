'use client';

import { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { ArrowUpTrayIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

/**
 * أداة معايرة نظام OMR
 * تساعد في تحديد المواقع الدقيقة للدوائر
 */

export default function OMRCalibrationPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // القيم القابلة للتعديل
  const [config, setConfig] = useState({
    startYMM: 60,
    questionSpacingMM: 12,
    bubblesStartXMM: 30,
    bubbleSpacingMM: 10,
    bubbleRadiusMM: 3,
    darknessThreshold: 0.3,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      setImage(imageDataUrl);
      
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setTimeout(() => drawCalibrationOverlay(img), 100);
      };
      img.src = imageDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const drawCalibrationOverlay = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    console.log('Drawing calibration overlay...', img.width, img.height);
    
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Context not found');
      return;
    }

    // رسم الصورة الأصلية
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    console.log('Image drawn');

    // حساب المواقع بناءً على القيم الحالية
    const pageWidthMM = 210;
    const mmToPx = img.width / pageWidthMM;

    const startY = config.startYMM * mmToPx;
    const questionSpacing = config.questionSpacingMM * mmToPx;
    const bubblesStartX = config.bubblesStartXMM * mmToPx;
    const bubbleSpacing = config.bubbleSpacingMM * mmToPx;
    const bubbleRadius = config.bubbleRadiusMM * mmToPx;

    // رسم 3 أسئلة تجريبية (4 خيارات لكل سؤال)
    for (let q = 0; q < 3; q++) {
      const rowY = startY + (q * questionSpacing);
      
      // رسم خط أفقي للصف
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(img.width, rowY);
      ctx.stroke();

      // رسم رقم السؤال
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`${q + 1}`, 20, rowY + 7);

      // رسم 4 دوائر
      for (let opt = 0; opt < 4; opt++) {
        const bubbleX = bubblesStartX + (opt * bubbleSpacing);
        
        // رسم دائرة
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(bubbleX, rowY, bubbleRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // رسم علامة × في المركز
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        const crossSize = 5;
        ctx.beginPath();
        ctx.moveTo(bubbleX - crossSize, rowY - crossSize);
        ctx.lineTo(bubbleX + crossSize, rowY + crossSize);
        ctx.moveTo(bubbleX + crossSize, rowY - crossSize);
        ctx.lineTo(bubbleX - crossSize, rowY + crossSize);
        ctx.stroke();
      }
    }
    
    console.log('Overlay complete!');
  };

  const updateConfig = (key: string, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // إعادة رسم
    if (image) {
      const img = new Image();
      img.onload = () => {
        setTimeout(() => drawCalibrationOverlay(img), 50);
      };
      img.src = image;
    }
  };

  const saveConfig = () => {
    const configCode = `
// أضف هذا في src/lib/professional-omr.ts السطر ~248

const startYMM = ${config.startYMM};
const questionSpacingMM = ${config.questionSpacingMM};
const bubblesStartXMM = ${config.bubblesStartXMM};
const bubbleSpacingMM = ${config.bubbleSpacingMM};
const bubbleRadiusMM = ${config.bubbleRadiusMM};

// في دالة calculateBubbleDarkness، السطر ~189
if (darkness > ${config.darknessThreshold}) // عتبة التظليل
`;

    navigator.clipboard.writeText(configCode);
    toast.success('تم نسخ الإعدادات');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <PageHeader
        title="أداة معايرة OMR"
        description="ضبط المواقع الدقيقة للدوائر على ورقة OMR"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الاختبارات الورقية', href: '/dashboard/paper-exams' },
          { label: 'معايرة الماسح' },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 -mx-6 -mt-6 mb-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">كيفية الاستخدام</h3>
          </div>
        </div>
        <ol className="space-y-1 text-sm text-slate-600">
          <li>1. ارفع صورة ورقة OMR (مظللة أو فارغة)</li>
          <li>2. ستظهر دوائر خضراء ومربعات حمراء على الصورة</li>
          <li>3. عدّل القيم حتى تتطابق الدوائر الخضراء مع الدوائر الفعلية</li>
          <li>4. اضغط "حفظ الإعدادات" ثم الصقها في الكود</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* التحكم */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800">إعدادات المعايرة</h3>
            </div>
          </div>
          <div className="p-6">
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">بداية الأسئلة (Y) - mm</label>
              <input
                type="number"
                value={config.startYMM}
                onChange={(e) => updateConfig('startYMM', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="1"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">المسافة بين الأسئلة - mm</label>
              <input
                type="number"
                value={config.questionSpacingMM}
                onChange={(e) => updateConfig('questionSpacingMM', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="0.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">بداية الدوائر (X) - mm</label>
              <input
                type="number"
                value={config.bubblesStartXMM}
                onChange={(e) => updateConfig('bubblesStartXMM', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="1"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">المسافة بين الدوائر - mm</label>
              <input
                type="number"
                value={config.bubbleSpacingMM}
                onChange={(e) => updateConfig('bubbleSpacingMM', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="0.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">نصف قطر الدائرة - mm</label>
              <input
                type="number"
                value={config.bubbleRadiusMM}
                onChange={(e) => updateConfig('bubbleRadiusMM', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="0.1"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm text-slate-700 mb-2">عتبة التظليل (0-1)</label>
              <input
                type="number"
                value={config.darknessThreshold}
                onChange={(e) => updateConfig('darknessThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm border"
                step="0.05"
                min="0"
                max="1"
              />
            </div>

            <Button
              onClick={saveConfig}
              variant="success"
              fullWidth
              size="lg"
            >
              حفظ الإعدادات
            </Button>
          </div>
          </div>
        </div>

        {/* الصورة */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <ArrowUpTrayIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-800">صورة المعاينة</h3>
            </div>
          </div>
          <div className="p-6">
          
          {!image ? (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="calibration-upload"
              />
              <label
                htmlFor="calibration-upload"
                className="block border-2 border-dashed border-slate-300 rounded-xl p-16 text-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <ArrowUpTrayIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-700">ارفع صورة ورقة OMR</p>
                <p className="text-sm text-slate-500 mt-2">للبدء في المعايرة</p>
              </label>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>حجم الصورة:</strong> {imageSize.width} x {imageSize.height} px
                </p>
                <p className="text-sm mt-1 text-slate-700">
                  <strong>الدوائر الخضراء:</strong> المواقع المحسوبة
                  <br />
                  <strong>الخطوط الحمراء:</strong> مواقع الأسئلة
                </p>
              </div>
              
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                <canvas ref={canvasRef} className="w-full" />
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    setImage(null);
                    if (canvasRef.current) {
                      const ctx = canvasRef.current.getContext('2d');
                      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                  }}
                  variant="outline"
                >
                  رفع صورة أخرى
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800">الخطوات بعد المعايرة</h3>
          </div>
        </div>
        <div className="p-6">
          <ol className="space-y-2 text-sm text-slate-600">
            <li>1. عدّل القيم حتى تتطابق الدوائر الخضراء مع الدوائر الفعلية</li>
            <li>2. اضغط "حفظ الإعدادات"</li>
            <li>3. افتح ملف <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">src/lib/professional-omr.ts</code></li>
            <li>4. ابحث عن السطر ~248 (التعليق: "تحويل من mm إلى pixels")</li>
            <li>5. الصق الإعدادات الجديدة</li>
            <li>6. احفظ الملف</li>
            <li>7. جرب التصحيح مرة أخرى</li>
          </ol>
        </div>
      </div>
    </div>
  );
}