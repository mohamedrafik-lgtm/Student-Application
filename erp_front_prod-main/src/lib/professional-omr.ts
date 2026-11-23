/**
 * نظام OMR احترافي متكامل
 * يعمل مع ورقة الإجابة المصممة بمعايير دولية
 */

export interface CalibrationMarks {
  topRight: { x: number; y: number };
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

export interface OMRDetectionResult {
  questionNumber: number;
  selectedOptionIndex: number;
  selectedOptionText: string;
  confidence: number;
  bubblePosition: { x: number; y: number };
}

/**
 * إيجاد العلامات المرجعية السوداء (Calibration Marks)
 */
function findCalibrationMarks(
  imageData: ImageData
): CalibrationMarks | null {
  const { width, height, data } = imageData;
  const marks: any = {};
  
  // البحث عن المربعات السوداء في الأركان الأربعة
  // حجم المربع المتوقع: حوالي 10mm = 40 بكسل (300 DPI)
  const searchRadius = 100; // بكسل للبحث في كل ركن
  const markSize = 30; // الحد الأدنى لحجم المربع
  
  // أعلى يمين
  marks.topRight = findBlackSquare(data, width, height, width - searchRadius, 0, width, searchRadius);
  
  // أعلى يسار
  marks.topLeft = findBlackSquare(data, width, height, 0, 0, searchRadius, searchRadius);
  
  // أسفل يمين
  marks.bottomRight = findBlackSquare(data, width, height, width - searchRadius, height - searchRadius, width, height);
  
  // أسفل يسار
  marks.bottomLeft = findBlackSquare(data, width, height, 0, height - searchRadius, searchRadius, height);
  
  // التحقق من إيجاد جميع العلامات
  if (marks.topRight && marks.topLeft && marks.bottomRight && marks.bottomLeft) {
    return marks as CalibrationMarks;
  }
  
  return null;
}

/**
 * البحث عن مربع أسود في منطقة محددة
 */
function findBlackSquare(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number } | null {
  let maxDarkArea = 0;
  let bestX = 0;
  let bestY = 0;
  
  // البحث في شبكة
  for (let y = startY; y < endY; y += 5) {
    for (let x = startX; x < endX; x += 5) {
      // حساب كثافة السواد في منطقة 40x40 بكسل
      let darkPixels = 0;
      const testSize = 40;
      
      for (let dy = 0; dy < testSize && y + dy < height; dy++) {
        for (let dx = 0; dx < testSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (brightness < 50) { // بكسل أسود
            darkPixels++;
          }
        }
      }
      
      if (darkPixels > maxDarkArea) {
        maxDarkArea = darkPixels;
        bestX = x + testSize / 2;
        bestY = y + testSize / 2;
      }
    }
  }
  
  // إذا وجدنا مساحة كبيرة سوداء
  if (maxDarkArea > 800) { // على الأقل 80% من 40x40
    return { x: Math.round(bestX), y: Math.round(bestY) };
  }
  
  return null;
}

/**
 * حساب التحويل من المواقع المعايرة
 */
function calculateTransform(marks: CalibrationMarks, imageWidth: number, imageHeight: number) {
  // حساب العرض والارتفاع الفعلي بين العلامات
  const actualWidth = marks.topRight.x - marks.topLeft.x;
  const actualHeight = marks.bottomLeft.y - marks.topLeft.y;
  
  // المواقع المتوقعة (A4: 210mm x 297mm)
  // العلامات على بعد 5mm من الحواف
  const expectedTopLeftX = (5 / 210) * imageWidth;
  const expectedTopLeftY = (5 / 297) * imageHeight;
  const expectedWidth = ((210 - 10) / 210) * imageWidth;
  const expectedHeight = ((297 - 10) / 297) * imageHeight;
  
  return {
    scaleX: expectedWidth / actualWidth,
    scaleY: expectedHeight / actualHeight,
    offsetX: marks.topLeft.x - expectedTopLeftX,
    offsetY: marks.topLeft.y - expectedTopLeftY
  };
}

/**
 * تحويل موقع نظري إلى موقع فعلي بعد المعايرة
 */
function transformPosition(
  theoreticalX: number,
  theoreticalY: number,
  transform: any,
  marks: CalibrationMarks
): { x: number; y: number } {
  // الموقع النسبي من العلامة أعلى اليسار
  const relativeX = theoreticalX - marks.topLeft.x;
  const relativeY = theoreticalY - marks.topLeft.y;
  
  // التطبيق
  const actualX = marks.topLeft.x + (relativeX / transform.scaleX);
  const actualY = marks.topLeft.y + (relativeY / transform.scaleY);
  
  return {
    x: Math.round(actualX),
    y: Math.round(actualY)
  };
}

/**
 * حساب كثافة السواد في دائرة
 */
function calculateBubbleDarkness(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number
): number {
  const { width, height, data } = imageData;
  let darkPixels = 0;
  let totalPixels = 0;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius * 0.8) { // فحص 80% من الدائرة (المنطقة الداخلية)
        const px = Math.round(centerX + dx);
        const py = Math.round(centerY + dy);
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (brightness < 150) { // بكسل داكن
            darkPixels++;
          }
          totalPixels++;
        }
      }
    }
  }
  
  return totalPixels > 0 ? darkPixels / totalPixels : 0;
}

/**
 * التعرف على الإجابات من ورقة OMR محترفة
 */
export async function detectAnswersFromOMRSheet(
  imageDataUrl: string,
  questionsData: Array<{ id: number; options: Array<{ id: number; text: string }> }>
): Promise<OMRDetectionResult[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('فشل في إنشاء Canvas');
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        console.log(`📐 حجم الصورة: ${img.width} x ${img.height}`);
        
        // 1. إيجاد العلامات المرجعية
        const marks = findCalibrationMarks(imageData);
        
        if (!marks) {
          console.warn('⚠️ لم يتم العثور على العلامات المرجعية - استخدام مواقع افتراضية');
        } else {
          console.log('✓ تم إيجاد جميع العلامات المرجعية');
          console.log('  أعلى يمين:', marks.topRight);
          console.log('  أعلى يسار:', marks.topLeft);
          console.log('  أسفل يمين:', marks.bottomRight);
          console.log('  أسفل يسار:', marks.bottomLeft);
        }
        
        // 2. حساب المواقع المتوقعة للدوائر
        const results: OMRDetectionResult[] = [];
        
        // بناءً على التصميم الجديد:
        // - الأسئلة تبدأ من 60mm من الأعلى
        // - المسافة بين كل سؤال: 12mm
        // - الدوائر على بعد 140mm من اليسار
        // - المسافة بين الدوائر: 10mm
        
        const pageWidthMM = 210;
        const pageHeightMM = 297;
        const startYMM = 60; // بداية الأسئلة
        const questionSpacingMM = 12; // المسافة بين الأسئلة
        const bubblesStartXMM = 30; // بداية الدوائر من اليسار
        const bubbleSpacingMM = 10; // المسافة بين الدوائر
        const bubbleRadiusMM = 3; // نصف قطر الدائرة
        
        // تحويل من mm إلى pixels (assuming 300 DPI: 1mm ≈ 11.8 pixels)
        const mmToPx = img.width / pageWidthMM;
        
        const startY = startYMM * mmToPx;
        const questionSpacing = questionSpacingMM * mmToPx;
        const bubblesStartX = bubblesStartXMM * mmToPx;
        const bubbleSpacing = bubbleSpacingMM * mmToPx;
        const bubbleRadius = bubbleRadiusMM * mmToPx;
        
        console.log(`📊 معاملات التحويل:`);
        console.log(`  mm إلى px: ${mmToPx.toFixed(2)}`);
        console.log(`  بداية Y: ${startY.toFixed(0)}px`);
        console.log(`  المسافة بين الأسئلة: ${questionSpacing.toFixed(0)}px`);
        console.log(`  نصف قطر الدائرة: ${bubbleRadius.toFixed(0)}px`);
        
        // 3. فحص كل سؤال
        questionsData.forEach((question, qIndex) => {
          const rowY = startY + (qIndex * questionSpacing);
          
          let maxDarkness = 0;
          let selectedOptionIndex = -1;
          let selectedPosition = { x: 0, y: 0 };
          
          // فحص كل خيار
          question.options.forEach((option, optIndex) => {
            const bubbleX = bubblesStartX + (optIndex * bubbleSpacing);
            const darkness = calculateBubbleDarkness(imageData, bubbleX, rowY, bubbleRadius);
            
            console.log(`سؤال ${qIndex + 1}, خيار "${option.text}": موقع (${bubbleX.toFixed(0)}, ${rowY.toFixed(0)}), سواد ${(darkness * 100).toFixed(1)}%`);
            
            if (darkness > 0.3 && darkness > maxDarkness) { // عتبة 30%
              maxDarkness = darkness;
              selectedOptionIndex = optIndex;
              selectedPosition = { x: Math.round(bubbleX), y: Math.round(rowY) };
            }
          });
          
          if (selectedOptionIndex !== -1) {
            console.log(`  ✓ تم اختيار: ${question.options[selectedOptionIndex].text}`);
            results.push({
              questionNumber: qIndex + 1,
              selectedOptionIndex,
              selectedOptionText: question.options[selectedOptionIndex].text,
              confidence: maxDarkness,
              bubblePosition: selectedPosition
            });
          } else {
            console.log(`  ✗ لم يتم اكتشاف إجابة`);
          }
        });
        
        console.log(`\n✅ النتيجة النهائية: ${results.length}/${questionsData.length} إجابة`);
        
        resolve(results);
      } catch (error) {
        console.error('خطأ في التحليل:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('فشل في تحميل الصورة'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * رسم النتائج على الصورة
 */
export function drawOMRResults(
  canvas: HTMLCanvasElement,
  imageDataUrl: string,
  results: OMRDetectionResult[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('فشل في الحصول على Canvas context'));
        return;
      }
      
      // رسم الصورة الأصلية
      ctx.drawImage(img, 0, 0);
      
      // رسم دوائر خضراء حول الإجابات المكتشفة
      results.forEach((result) => {
        const radius = Math.floor(img.width * 0.015);
        
        // دائرة خضراء
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(result.bubblePosition.x, result.bubblePosition.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // خلفية للنص
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(
          result.bubblePosition.x + radius + 5,
          result.bubblePosition.y - 12,
          80,
          24
        );
        
        // النص
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(
          `${(result.confidence * 100).toFixed(0)}% ✓`,
          result.bubblePosition.x + radius + 10,
          result.bubblePosition.y + 5
        );
      });
      
      resolve();
    };
    
    img.onerror = () => {
      reject(new Error('فشل في تحميل الصورة'));
    };
    
    img.src = imageDataUrl;
  });
}