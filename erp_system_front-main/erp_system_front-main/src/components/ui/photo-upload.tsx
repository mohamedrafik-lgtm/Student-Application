"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import toast from "react-hot-toast";
import { uploadFile, getImageUrl } from "@/lib/api";
import Webcam from "react-webcam";
import ImageCropper from "./ImageCropper";

// دالة ضغط الصور المحسنة
const compressImage = (file: File, maxWidth = 1024, maxHeight = 768, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // حساب الأبعاد الجديدة مع الحفاظ على النسبة
        let { width, height } = img;
        
        // تحديد جودة الضغط بناءً على حجم الصورة الأصلية
        let adjustedQuality = quality;
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileSizeMB > 5) {
          adjustedQuality = 0.7; // ضغط أكبر للصور الكبيرة
        } else if (fileSizeMB > 2) {
          adjustedQuality = 0.8;
        }
        
        // حساب الأبعاد الجديدة
        const aspectRatio = width / height;
        
        if (width > maxWidth || height > maxHeight) {
          if (aspectRatio > 1) {
            // الصورة عرضية
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          } else {
            // الصورة طولية
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
          }
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        // تحسين جودة الرسم
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // رسم الصورة المضغوطة
          ctx.drawImage(img, 0, 0, Math.round(width), Math.round(height));
        }
        
        // تحويل إلى blob مضغوط
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.(png|webp|gif)$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // إرجاع الملف الأصلي في حالة الفشل
          }
        }, 'image/jpeg', adjustedQuality);
        
      } catch (error) {
        console.error('خطأ في ضغط الصورة:', error);
        resolve(file); // إرجاع الملف الأصلي في حالة الخطأ
      }
    };
    
    img.onerror = () => {
      console.error('فشل في تحميل الصورة للضغط');
      resolve(file); // إرجاع الملف الأصلي في حالة فشل التحميل
    };
    
    img.src = URL.createObjectURL(file);
  });
};

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void;
  currentPhotoUrl?: string;
  folder?: string;
}

export function PhotoUpload({ onUploadComplete, currentPhotoUrl, folder }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // استخدام الصورة المعاينة أو الصورة الحالية
  const displayUrl = previewUrl || currentPhotoUrl;
  
  // تشخيص عرض الصورة
  useEffect(() => {
    console.log('🖼️ تحديث عرض الصورة:', {
      previewUrl,
      currentPhotoUrl,
      displayUrl,
      finalUrl: displayUrl ? (displayUrl.startsWith('blob:') ? displayUrl : getImageUrl(displayUrl)) : null
    });
  }, [previewUrl, currentPhotoUrl, displayUrl]);

  // تنظيف previewUrl عند تغيير currentPhotoUrl من الخارج
  useEffect(() => {
    if (currentPhotoUrl && previewUrl && currentPhotoUrl !== previewUrl) {
      setPreviewUrl(null);
    }
  }, [currentPhotoUrl, previewUrl]);

  // التحقق من كون الجهاز جوال
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      return mobileRegex.test(userAgent.toLowerCase());
    };

    setIsMobile(checkIfMobile());
  }, []);



  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة فقط');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    // فتح Cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setShowCropper(false);
    const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    try {
      setIsUploading(true);
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      
      const response = await uploadFile(file, folder);
      setPreviewUrl(response.url);
      onUploadComplete(response.url);
      toast.success('تم رفع الصورة بنجاح');
      
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      toast.error('فشل في رفع الصورة');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
    
    setImageToCrop(null);
  };

  // فتح الكاميرا
  const openCamera = () => {
    if (isMobile) {
      // على الجوال: فتح كاميرا الهاتف مباشرة
      console.log('فتح كاميرا الهاتف...');
      mobileFileInputRef.current?.click();
    } else {
      // على الكمبيوتر: استخدام react-webcam
      console.log('فتح الكاميرا باستخدام react-webcam...');
      setIsCameraOpen(true);
    }
  };

  // إغلاق الكاميرا
  const closeCamera = () => {
    console.log('إغلاق الكاميرا...');
    setIsCameraOpen(false);
  };

  // التقاط الصورة باستخدام react-webcam
  const capturePhoto = useCallback(async () => {
    if (!webcamRef.current) {
      toast.error('الكاميرا غير جاهزة، يرجى المحاولة مرة أخرى');
      return;
    }

    try {
      console.log('التقاط الصورة باستخدام react-webcam...');
      
      // التقاط الصورة كـ base64
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        toast.error('فشل في التقاط الصورة');
        return;
      }

      console.log('تم التقاط الصورة بنجاح، تحويل إلى ملف...');
      
      // تحويل base64 إلى blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      if (blob.size === 0) {
        toast.error('الصورة الملتقطة فارغة');
        return;
      }

      setIsUploading(true);
      closeCamera();

      // فتح Cropper للصورة الملتقطة
      setImageToCrop(imageSrc);
      setShowCropper(true);
      closeCamera();
      
    } catch (error) {
      console.error('خطأ في التقاط الصورة:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في التقاط الصورة');
      // إزالة المعاينة في حالة الخطأ
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [webcamRef, folder, onUploadComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Input مخفي لكاميرا الهاتف */}
      <input
        ref={mobileFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* عرض الصورة الحالية أو الكاميرا */}
      {isCameraOpen ? (
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            width={320}
            height={240}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: "user"
            }}
            className="w-80 h-60 bg-gray-900 rounded-lg object-cover border-2 border-green-400"
            style={{ 
              transform: 'scaleX(-1)', // مرآة الصورة لتبدو طبيعية
            }}
            onUserMedia={() => {
              console.log('✅ الكاميرا جاهزة باستخدام react-webcam');
              toast.success('تم فتح الكاميرا بنجاح!');
            }}
            onUserMediaError={(error) => {
              console.error('❌ خطأ في فتح الكاميرا:', error);
              toast.error('فشل في فتح الكاميرا');
              setIsCameraOpen(false);
            }}
          />
          
          {/* إطار التصوير الأخضر */}
          <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none">
            <div className="absolute top-2 left-2 w-6 h-6 border-l-4 border-t-4 border-green-500"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-r-4 border-t-4 border-green-500"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-4 border-b-4 border-green-500"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-4 border-b-4 border-green-500"></div>
          </div>
          
          {/* مؤشر الحالة */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-3 py-1 rounded-full text-xs font-medium shadow-lg bg-green-500 text-white">
              ✅ جاهز للتصوير
            </div>
          </div>
        </div>
      ) : (
        <Avatar className="w-32 h-32">
          {displayUrl ? (
            <AvatarImage 
              src={displayUrl.startsWith('blob:') ? displayUrl : getImageUrl(displayUrl)} 
              alt="صورة المتدرب" 
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/images/placeholder.png';
                console.error('فشل في تحميل الصورة:', displayUrl);
              }}
            />
          ) : (
            <AvatarFallback className="bg-gray-100 text-gray-400">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-xs">جاري الرفع...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">صورة</span>
                </div>
              )}
            </AvatarFallback>
          )}
        </Avatar>
      )}

      {/* أزرار التحكم */}
      <div className="flex flex-col items-center gap-3">
        {isCameraOpen ? (
          <div className="flex gap-3">
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={capturePhoto}
              disabled={isUploading}
            >
              📸 التقاط الصورة
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeCamera}
              disabled={isUploading}
            >
              ❌ إلغاء
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="relative flex-1"
                disabled={isUploading}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                📁 {displayUrl ? 'تحديث' : 'رفع صورة'}
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                onClick={openCamera}
                disabled={isUploading}
              >
                📷 {isMobile ? 'فتح الكاميرا' : 'التقاط صورة'}
              </Button>
            </div>
            {displayUrl && (
              <Button
                type="button"
                variant="outline"
                className="bg-orange-50 border-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => {
                  if (displayUrl) {
                    setImageToCrop(displayUrl.startsWith('blob:') ? displayUrl : getImageUrl(displayUrl));
                    setShowCropper(true);
                  }
                }}
                disabled={isUploading}
              >
                ✂️ قص الصورة الحالية
              </Button>
            )}
          </div>
        )}
        
        {isUploading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">جاري الرفع...</span>
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center max-w-xs">
          📁 رفع: JPG, PNG (حد أقصى 10 ميجابايت)<br/>
          📷 التقاط: {isMobile ? 'كاميرا الهاتف مباشرة' : 'كاميرا الويب المحسنة'}<br/>
          🗜️ ضغط تلقائي: تحسين الحجم والجودة
        </p>
      </div>

      {/* Image Cropper */}
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          aspect={1}
        />
      )}
    </div>
  );
}