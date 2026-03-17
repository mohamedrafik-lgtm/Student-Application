'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FiCheck, FiX, FiRotateCw, FiZoomIn, FiZoomOut, FiMove } from 'react-icons/fi';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

export default function ImageCropper({
  image,
  onCropComplete,
  onCancel,
  aspect = 1,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropShape, setCropShape] = useState<'rect' | 'round'>('rect');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullSize, setFullSize] = useState(false); // خيار الحجم الكامل

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    setLoading(true);
    
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = image;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل في إنشاء canvas context');

      const pixelRatio = window.devicePixelRatio || 1;
      
      // إذا كان الحجم الكامل، استخدم أبعاد الصورة الأصلية
      if (fullSize) {
        canvas.width = img.width * pixelRatio;
        canvas.height = img.height * pixelRatio;
        
        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (rotation !== 0) {
          const centerX = img.width / 2;
          const centerY = img.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
      } else {
        // استخدام الاقتصاص العادي
        if (!croppedAreaPixels) return;
        
        canvas.width = (croppedAreaPixels as any).width * pixelRatio;
        canvas.height = (croppedAreaPixels as any).height * pixelRatio;
        
        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (rotation !== 0) {
          const centerX = (croppedAreaPixels as any).width / 2;
          const centerY = (croppedAreaPixels as any).height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(
          img,
          (croppedAreaPixels as any).x,
          (croppedAreaPixels as any).y,
          (croppedAreaPixels as any).width,
          (croppedAreaPixels as any).height,
          0,
          0,
          (croppedAreaPixels as any).width,
          (croppedAreaPixels as any).height
        );
      }

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        } else {
          throw new Error('فشل في إنشاء الصورة المقصوصة');
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error creating cropped image:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 bg-tiba-gray-900/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header - بألوان tiba */}
      <div className="bg-tiba-primary-600 text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FiMove className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">تحرير الصورة</h2>
              <p className="text-tiba-primary-100 text-sm">اسحب • كبّر • دوّر • اقتصص</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onCancel} 
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
            title="إغلاق"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Cropper Area */}
      <div className="flex-1 relative bg-tiba-gray-900 overflow-hidden" style={{ minHeight: 0 }}>
        {!fullSize ? (
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropCompleteCallback}
            objectFit="contain"
            restrictPosition={false}
            style={{
              containerStyle: {
                backgroundColor: 'rgb(17, 24, 39)',
              },
              mediaStyle: {
                maxHeight: '100%',
              },
              cropAreaStyle: {
                border: '3px solid rgb(47, 128, 237)',
                boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.75), 0 0 20px rgba(47, 128, 237, 0.3)',
              },
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <div className="relative" style={{ maxWidth: '90%', maxHeight: '90%' }}>
              <img 
                src={image} 
                alt="Preview" 
                className="w-auto h-auto max-w-full max-h-full object-contain"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.2s ease-out',
                  maxHeight: 'calc(100vh - 500px)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel - بألوان tiba */}
      <div className="bg-white border-t-4 border-tiba-primary-500 shadow-2xl">
        <div className="p-6 space-y-5 max-h-[420px] overflow-y-auto">
          
          {/* Zoom Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-tiba-primary-500 rounded-lg flex items-center justify-center shadow-sm">
                  <FiZoomIn className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-tiba-gray-800">التكبير</span>
              </div>
              <span className="px-3 py-1 bg-tiba-primary-100 text-tiba-primary-700 rounded-full text-sm font-bold">
                {zoom.toFixed(1)}×
              </span>
            </div>
            
            <div className="bg-tiba-gray-50 rounded-lg p-3 border border-tiba-gray-200">
              <div className="flex gap-2 items-center mb-3">
                <button 
                  type="button"
                  onClick={() => setZoom(Math.max(1, zoom - 0.2))} 
                  className="w-9 h-9 bg-white hover:bg-tiba-primary-50 rounded-lg transition-colors shadow-sm border border-tiba-gray-300 flex items-center justify-center"
                  disabled={zoom <= 1}
                >
                  <FiZoomOut className="w-4 h-4 text-tiba-primary-600" />
                </button>
                
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-tiba-primary-200 rounded-full appearance-none cursor-pointer"
                />
                
                <button 
                  type="button"
                  onClick={() => setZoom(Math.min(5, zoom + 0.2))} 
                  className="w-9 h-9 bg-tiba-primary-600 hover:bg-tiba-primary-700 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                  disabled={zoom >= 5}
                >
                  <FiZoomIn className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="flex gap-2">
                {[1, 1.5, 2, 3, 5].map((zoomValue) => (
                  <button
                    key={zoomValue}
                    type="button"
                    onClick={() => setZoom(zoomValue)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      Math.abs(zoom - zoomValue) < 0.1
                        ? 'bg-tiba-primary-600 text-white shadow-md' 
                        : 'bg-white hover:bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-gray-300'
                    }`}
                  >
                    {zoomValue}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-tiba-secondary-500 rounded-lg flex items-center justify-center shadow-sm">
                  <FiRotateCw className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-tiba-gray-800">الدوران</span>
              </div>
              <span className="px-3 py-1 bg-tiba-secondary-100 text-tiba-secondary-700 rounded-full text-sm font-bold">
                {rotation}°
              </span>
            </div>
            
            <div className="bg-tiba-gray-50 rounded-lg p-3 border border-tiba-gray-200">
              <div className="flex gap-2 items-center mb-3">
                <button 
                  type="button"
                  onClick={() => setRotation((rotation - 15 + 360) % 360)} 
                  className="w-9 h-9 bg-white hover:bg-tiba-secondary-50 rounded-lg transition-colors shadow-sm border border-tiba-gray-300 flex items-center justify-center"
                >
                  <FiRotateCw className="w-4 h-4 text-tiba-secondary-600 transform -scale-x-100" />
                </button>
                
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-tiba-secondary-200 rounded-full appearance-none cursor-pointer"
                />
                
                <button 
                  type="button"
                  onClick={() => setRotation((rotation + 15) % 360)} 
                  className="w-9 h-9 bg-tiba-secondary-600 hover:bg-tiba-secondary-700 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                >
                  <FiRotateCw className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="flex gap-2">
                {[0, 90, 180, 270].map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => setRotation(angle)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      rotation === angle
                        ? 'bg-tiba-secondary-600 text-white shadow-md' 
                        : 'bg-white hover:bg-tiba-secondary-50 text-tiba-secondary-700 border border-tiba-gray-300'
                    }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Crop Shape */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-tiba-gray-800">شكل القص</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCropShape('round');
                  setFullSize(false);
                }}
                className={`relative p-5 rounded-xl transition-all border-2 ${
                  cropShape === 'round' && !fullSize
                    ? 'bg-tiba-primary-600 border-tiba-primary-600 shadow-lg' 
                    : 'bg-white border-tiba-gray-300 hover:border-tiba-primary-400 hover:bg-tiba-primary-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-full border-3 flex items-center justify-center ${
                    cropShape === 'round' && !fullSize
                      ? 'border-white bg-white/20' 
                      : 'border-tiba-primary-400 bg-tiba-primary-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full ${
                      cropShape === 'round' && !fullSize ? 'bg-white' : 'bg-tiba-primary-400'
                    }`}></div>
                  </div>
                  <span className={`font-bold text-sm ${cropShape === 'round' && !fullSize ? 'text-white' : 'text-tiba-gray-700'}`}>
                    دائري
                  </span>
                  <span className={`text-xs ${cropShape === 'round' && !fullSize ? 'text-white/90' : 'text-tiba-gray-500'}`}>
                    للصور الشخصية
                  </span>
                </div>
                {cropShape === 'round' && !fullSize && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                    <FiCheck className="w-4 h-4 text-tiba-primary-600" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCropShape('rect');
                  setFullSize(false);
                }}
                className={`relative p-5 rounded-xl transition-all border-2 ${
                  cropShape === 'rect' && !fullSize
                    ? 'bg-tiba-secondary-600 border-tiba-secondary-600 shadow-lg' 
                    : 'bg-white border-tiba-gray-300 hover:border-tiba-secondary-400 hover:bg-tiba-secondary-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-lg border-3 flex items-center justify-center ${
                    cropShape === 'rect' && !fullSize
                      ? 'border-white bg-white/20' 
                      : 'border-tiba-secondary-400 bg-tiba-secondary-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-md ${
                      cropShape === 'rect' && !fullSize ? 'bg-white' : 'bg-tiba-secondary-400'
                    }`}></div>
                  </div>
                  <span className={`font-bold text-sm ${cropShape === 'rect' && !fullSize ? 'text-white' : 'text-tiba-gray-700'}`}>
                    مربع
                  </span>
                  <span className={`text-xs ${cropShape === 'rect' && !fullSize ? 'text-white/90' : 'text-tiba-gray-500'}`}>
                    للوثائق
                  </span>
                </div>
                {cropShape === 'rect' && !fullSize && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                    <FiCheck className="w-4 h-4 text-tiba-secondary-600" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFullSize(true)}
                className={`relative p-5 rounded-xl transition-all border-2 ${
                  fullSize
                    ? 'bg-green-600 border-green-600 shadow-lg' 
                    : 'bg-white border-tiba-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-lg border-3 flex items-center justify-center ${
                    fullSize
                      ? 'border-white bg-white/20' 
                      : 'border-green-400 bg-green-50'
                  }`}>
                    <svg className={`w-8 h-8 ${fullSize ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                  <span className={`font-bold text-sm ${fullSize ? 'text-white' : 'text-tiba-gray-700'}`}>
                    حجم كامل
                  </span>
                  <span className={`text-xs ${fullSize ? 'text-white/90' : 'text-tiba-gray-500'}`}>
                    بدون قص
                  </span>
                </div>
                {fullSize && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                    <FiCheck className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-tiba-gray-200">
            <button
              type="button"
              onClick={resetSettings}
              className="px-4 py-2.5 bg-tiba-gray-100 hover:bg-tiba-gray-200 rounded-lg font-semibold text-tiba-gray-700 transition-colors shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <FiX className="w-4 h-4" />
              إعادة ضبط
            </button>
            
            <button 
              type="button"
              onClick={onCancel} 
              className="flex-1 bg-white hover:bg-tiba-danger-50 text-tiba-danger-600 px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 border-2 border-tiba-danger-300 hover:border-tiba-danger-400" 
              disabled={loading}
            >
              <FiX className="w-5 h-5" />
              إلغاء
            </button>
            
            <button
              type="button"
              onClick={createCroppedImage}
              disabled={loading || (!fullSize && !croppedAreaPixels)}
              className="flex-1 bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white px-5 py-2.5 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-5 h-5" />
                  <span>تأكيد</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Tips */}
          <div className="bg-tiba-primary-50 rounded-lg p-4 border border-tiba-primary-200">
            <h3 className="text-sm font-bold text-tiba-primary-800 mb-2">💡 نصائح سريعة</h3>
            <ul className="space-y-1.5 text-xs text-tiba-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600">•</span>
                <span><strong>السحب:</strong> اسحب الصورة لتحريكها في أي اتجاه</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600">•</span>
                <span><strong>التكبير:</strong> استخدم عجلة الماوس أو الأزرار أعلاه</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-primary-600">•</span>
                <span><strong>الدوران:</strong> أزرار سريعة للزوايا الشائعة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tiba-secondary-600">✓</span>
                <span className="font-semibold text-tiba-secondary-700">الصورة تظهر كاملة - لا قص تلقائي!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2F80ED;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(47, 128, 237, 0.4);
          border: 2px solid white;
        }

        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2F80ED;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(47, 128, 237, 0.4);
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
}