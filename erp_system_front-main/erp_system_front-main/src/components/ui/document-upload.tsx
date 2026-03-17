"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import toast from "react-hot-toast";
import { uploadFile, getImageUrl } from "@/lib/api";
import { DocumentType } from "@/app/types/trainee-documents";
import { FiUpload, FiCamera, FiFile, FiCheck, FiX, FiEye, FiAlertCircle } from "react-icons/fi";
import Webcam from "react-webcam";
import ImageCropper from "./ImageCropper";

// دالة ضغط الصور المحسنة (نفس التي في photo-upload.tsx)
const compressImage = (file: File, maxWidth = 1024, maxHeight = 768, quality = 0.85): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        let { width, height } = img;
        
        let adjustedQuality = quality;
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileSizeMB > 5) {
          adjustedQuality = 0.7;
        } else if (fileSizeMB > 2) {
          adjustedQuality = 0.8;
        }
        
        const aspectRatio = width / height;
        
        if (width > maxWidth || height > maxHeight) {
          if (aspectRatio > 1) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          } else {
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
        
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, Math.round(width), Math.round(height));
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.(png|webp|gif)$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', adjustedQuality);
        
      } catch (error) {
        console.error('خطأ في ضغط الصورة:', error);
        resolve(file);
      }
    };
    
    img.onerror = () => {
      console.error('فشل في تحميل الصورة للضغط');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

interface DocumentUploadProps {
  documentType: DocumentType;
  documentName: string;
  currentDocument?: any;
  onUploadComplete: (documentData: any) => void;
  isRequired?: boolean;
  isUploading?: boolean;
}

export function DocumentUpload({ 
  documentType, 
  documentName, 
  currentDocument, 
  onUploadComplete, 
  isRequired = false,
  isUploading = false
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMobile, setIsMobileState] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  // التحقق من كون الجهاز جوال
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      return mobileRegex.test(userAgent.toLowerCase());
    };
    setIsMobileState(checkIfMobile());
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة فقط');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    try {
      setUploading(true);
      
      console.log(`📸 الصورة الأصلية: ${(file.size / 1024 / 1024).toFixed(2)} ميجابايت`);
      
      // ضغط الصورة
      const compressedFile = await compressImage(file);
      const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
      
      console.log(`🗜️ الصورة المضغوطة: ${(compressedFile.size / 1024 / 1024).toFixed(2)} ميجابايت`);
      console.log(`📊 نسبة الضغط: ${compressionRatio}%`);
      
      // إنشاء معاينة
      const fileUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(fileUrl);
      
      // رفع الملف
      const response = await uploadFile(compressedFile, 'documents');
      
      // إنشاء بيانات الوثيقة
      const documentData = {
        documentType,
        fileName: file.name,
        filePath: response.url,
        fileSize: compressedFile.size,
        mimeType: compressedFile.type,
      };
      
      onUploadComplete(documentData);
      toast.success('تم رفع الوثيقة بنجاح');
      
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error('خطأ في رفع الوثيقة:', error);
      toast.error('فشل في رفع الوثيقة');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // فتح Cropper بدلاً من الرفع المباشر
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setShowCropper(false);
    const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await handleFileUpload(file);
    setImageToCrop(null);
  };

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

  const closeCamera = () => {
    console.log('إغلاق الكاميرا...');
    setIsCameraOpen(false);
  };

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

      setUploading(true);
      closeCamera();

      // فتح Cropper بدلاً من الرفع المباشر
      setImageToCrop(imageSrc);
      setShowCropper(true);
      closeCamera();
      
    } catch (error) {
      console.error('خطأ في التقاط الصورة:', error);
      toast.error('فشل في التقاط الصورة');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [webcamRef, documentType, onUploadComplete]);

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const viewDocument = () => {
    if (currentDocument?.filePath) {
      const imageUrl = currentDocument.filePath.startsWith('http') 
        ? currentDocument.filePath 
        : getImageUrl(currentDocument.filePath);
      window.open(imageUrl, '_blank');
    }
  };

  const displayUrl = previewUrl || (currentDocument?.filePath ? getImageUrl(currentDocument.filePath) : null);

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={mobileFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Document header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg shadow-sm">
            <FiFile className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {documentName}
              {isRequired && <span className="text-red-500 text-sm font-bold">*</span>}
            </h3>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {currentDocument ? (
            <>
              <span className="flex items-center gap-1 text-blue-700 text-xs font-semibold bg-blue-100 px-2 py-1 rounded-full">
                <FiCheck className="h-3 w-3" />
                مرفوع
              </span>
              {currentDocument.isVerified ? (
                <span className="flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 px-2 py-1 rounded-full">
                  <FiCheck className="h-3 w-3" />
                  محقق
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-700 text-xs font-semibold bg-yellow-100 px-2 py-1 rounded-full">
                  <FiAlertCircle className="h-3 w-3" />
                  بانتظار التحقق
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1 text-gray-600 text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full">
              <FiX className="h-3 w-3" />
              غير مرفوع
            </span>
          )}
        </div>
      </div>

      {/* Document preview or Camera */}
      <div className="mb-4 p-2 bg-gray-50 rounded-lg border-2 border-gray-200 flex-1 flex items-center justify-center min-h-[200px]">
        {isCameraOpen ? (
          <div className="relative w-full">
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
              className="w-full h-48 bg-gray-900 rounded-lg object-cover border-2 border-green-400"
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
        ) : displayUrl ? (
          <img 
            src={displayUrl} 
            alt={documentName}
            className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 h-48">
            <FiFile className="h-12 w-12 mb-2" />
            <p className="text-sm font-medium">لم يتم رفع الوثيقة بعد</p>
          </div>
        )}
      </div>

      {/* Upload status */}
      {currentDocument && (
        <div className={`mb-4 p-3 border rounded-lg ${
          currentDocument.id.startsWith('trainee-photo-') 
            ? 'bg-green-50 border-green-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="text-sm text-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FiCheck className={`h-4 w-4 ${
                currentDocument.id.startsWith('trainee-photo-') 
                  ? 'text-green-600' 
                  : 'text-blue-600'
              }`} />
              <span className={`font-medium ${
                currentDocument.id.startsWith('trainee-photo-') 
                  ? 'text-green-800' 
                  : 'text-blue-800'
              }`}>
                {currentDocument.id.startsWith('trainee-photo-') 
                  ? 'صورة شخصية من ملف المتدرب' 
                  : 'تم رفع الوثيقة بنجاح'}
              </span>
            </div>
            <p><strong>تاريخ الرفع:</strong> {new Date(currentDocument.uploadedAt).toLocaleDateString('ar-SA')}</p>
            <p><strong>بواسطة:</strong> {currentDocument.uploadedBy?.name}</p>
            {currentDocument.fileSize > 0 && (
              <p><strong>حجم الملف:</strong> {(currentDocument.fileSize / 1024 / 1024).toFixed(2)} ميجابايت</p>
            )}
            {currentDocument.notes && (
              <p><strong>ملاحظات:</strong> {currentDocument.notes}</p>
            )}
            {currentDocument.id.startsWith('trainee-photo-') && (
              <p className="text-xs text-green-600 mt-2">
                💡 لإدارة حالة التحقق، يرجى رفع الصورة مرة أخرى من هنا
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-auto">
        {isCameraOpen ? (
          <>
            <Button
              onClick={capturePhoto}
              disabled={uploading || isUploading}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <FiCamera className="h-4 w-4 mr-2" />
              التقاط الصورة
            </Button>
            <Button
              onClick={closeCamera}
              disabled={uploading || isUploading}
              variant="outline"
              size="sm"
              className="border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            >
              <FiX className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={openFileSelector}
              disabled={uploading || isUploading}
              variant="outline"
              size="sm"
              className="flex-1 border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400"
            >
              <FiUpload className="h-4 w-4 mr-2" />
              {currentDocument ? 'تحديث' : 'رفع ملف'}
            </Button>
            
            <Button
              onClick={openCamera}
              disabled={uploading || isUploading}
              variant="outline"
              size="sm"
              className="flex-1 border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
            >
              <FiCamera className="h-4 w-4 mr-2" />
              {isMobile ? 'فتح الكاميرا' : 'التقاط صورة'}
            </Button>

            {currentDocument && (
              <Button
                onClick={viewDocument}
                variant="outline"
                size="sm"
                className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
              >
                <FiEye className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Loading state */}
      {(uploading || isUploading) && (
        <div className="mt-4 flex items-center justify-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-sm font-medium text-blue-700">جاري الرفع...</span>
        </div>
      )}

      {/* Info text */}
      <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center font-medium">
          📁 رفع: JPG, PNG (حد أقصى 10 ميجابايت)<br/>
          📷 التقاط: {isMobile ? 'كاميرا الهاتف مباشرة' : 'كاميرا الويب المحسنة'}<br/>
          🗜️ ضغط تلقائي: تحسين الحجم والجودة
        </p>
      </div>

      {/* Image Cropper Modal */}
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
