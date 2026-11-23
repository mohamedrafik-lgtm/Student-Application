/**
 * معالجة الصور مثل CamScanner
 * استخراج حدود الورقة + إزالة الظلال + تحويل لأبيض وأسود
 */

declare const cv: any;

export async function enhanceOMRImage(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // إنشاء canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        // تحويل لـ Grayscale
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        
        // زيادة التباين
        const factor = 1.5; // 50% زيادة في التباين
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        
        // Thresholding (أبيض وأسود نقي)
        const threshold = 140;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const value = avg > threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = value;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // إرجاع الصورة المحسّنة
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        console.error('Image processing error:', error);
        // في حالة الخطأ، إرجاع الصورة الأصلية
        resolve(imageDataUrl);
      }
    };
    
    img.onerror = () => {
      // في حالة الخطأ، إرجاع الصورة الأصلية
      resolve(imageDataUrl);
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * معالجة أكثر تقدماً مع OpenCV (إذا كان متاحاً)
 */
export async function advancedEnhanceOMRImage(imageDataUrl: string): Promise<string> {
  // التحقق من توفر OpenCV
  if (typeof cv === 'undefined') {
    // إذا OpenCV غير متاح، استخدم المعالجة البسيطة
    return enhanceOMRImage(imageDataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const src = cv.imread(img);
        
        // 1. Grayscale
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // 2. إزالة الضوضاء
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        
        // 3. Adaptive Threshold (أفضل للإضاءة غير المتساوية)
        const thresh = new cv.Mat();
        cv.adaptiveThreshold(
          blurred,
          thresh,
          255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY,
          11,
          2
        );
        
        // 4. تحسين الحواف
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
        cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
        
        // تحويل للـ Canvas
        const canvas = document.createElement('canvas');
        cv.imshow(canvas, thresh);
        
        // تنظيف
        src.delete();
        gray.delete();
        blurred.delete();
        thresh.delete();
        kernel.delete();
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        console.error('OpenCV processing error:', error);
        // Fallback للمعالجة البسيطة
        enhanceOMRImage(imageDataUrl).then(resolve);
      }
    };
    
    img.onerror = () => {
      enhanceOMRImage(imageDataUrl).then(resolve);
    };
    
    img.src = imageDataUrl;
  });
}