/**
 * OMR (Optical Mark Recognition) Detector
 * نظام احترافي للتعرف على الدوائر المظللة في أوراق الإجابة
 */

export interface BubbleDetectionResult {
  questionIndex: number;
  selectedOption: number; // 0 = A, 1 = B, 2 = C, 3 = D
  confidence: number;
  position: { x: number; y: number };
}

export interface OMRConfig {
  numberOfQuestions: number;
  optionsPerQuestion: number;
  bubbleRadius: number;
  threshold: number; // عتبة التظليل (0-255)
}

/**
 * تحويل الصورة إلى Grayscale
 */
export function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  const grayData = new ImageData(imageData.width, imageData.height);
  
  for (let i = 0; i < data.length; i += 4) {
    // معادلة Luminosity للحصول على أفضل نتيجة
    const gray = Math.round(
      0.299 * data[i] +     // Red
      0.587 * data[i + 1] + // Green
      0.114 * data[i + 2]   // Blue
    );
    grayData.data[i] = gray;
    grayData.data[i + 1] = gray;
    grayData.data[i + 2] = gray;
    grayData.data[i + 3] = data[i + 3]; // Alpha
  }
  
  return grayData;
}

/**
 * تطبيق Threshold لتحويل الصورة إلى أبيض وأسود
 */
export function applyThreshold(imageData: ImageData, threshold: number): ImageData {
  const data = imageData.data;
  const binaryData = new ImageData(imageData.width, imageData.height);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // القيمة الرمادية
    const binary = gray < threshold ? 0 : 255;
    
    binaryData.data[i] = binary;
    binaryData.data[i + 1] = binary;
    binaryData.data[i + 2] = binary;
    binaryData.data[i + 3] = 255;
  }
  
  return binaryData;
}

/**
 * حساب كثافة البكسلات الداكنة في منطقة معينة
 */
export function calculateDarkPixelDensity(
  imageData: ImageData,
  x: number,
  y: number,
  radius: number
): number {
  const data = imageData.data;
  const width = imageData.width;
  let darkPixels = 0;
  let totalPixels = 0;
  
  // فحص منطقة دائرية
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // التحقق من أن النقطة داخل الدائرة
      if (dx * dx + dy * dy <= radius * radius) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        
        // التحقق من الحدود
        if (px >= 0 && px < width && py >= 0 && py < imageData.height) {
          const index = (py * width + px) * 4;
          const brightness = data[index]; // قيمة الرمادي
          
          if (brightness < 128) { // بكسل داكن
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
 * الكشف عن الدوائر المظللة في شبكة منتظمة
 */
export function detectBubbleGrid(
  imageData: ImageData,
  config: OMRConfig,
  startX: number,
  startY: number,
  horizontalSpacing: number,
  verticalSpacing: number
): BubbleDetectionResult[] {
  const results: BubbleDetectionResult[] = [];
  
  // المرور على كل سؤال
  for (let q = 0; q < config.numberOfQuestions; q++) {
    const rowY = startY + (q * verticalSpacing);
    let maxDensity = 0;
    let selectedOption = -1;
    let selectedPosition = { x: 0, y: 0 };
    
    // المرور على كل خيار في السؤال
    for (let opt = 0; opt < config.optionsPerQuestion; opt++) {
      const colX = startX + (opt * horizontalSpacing);
      
      // حساب كثافة التظليل
      const density = calculateDarkPixelDensity(
        imageData,
        colX,
        rowY,
        config.bubbleRadius
      );
      
      // إذا كانت الكثافة أكبر من العتبة وأكبر من الخيارات السابقة
      if (density > config.threshold && density > maxDensity) {
        maxDensity = density;
        selectedOption = opt;
        selectedPosition = { x: colX, y: rowY };
      }
    }
    
    // إضافة النتيجة إذا تم اكتشاف إجابة
    if (selectedOption !== -1) {
      results.push({
        questionIndex: q,
        selectedOption,
        confidence: maxDensity,
        position: selectedPosition
      });
    }
  }
  
  return results;
}

/**
 * محاولة الكشف التلقائي عن مواقع الدوائر
 */
export function autoDetectBubblePositions(
  imageData: ImageData,
  config: OMRConfig
): { startX: number; startY: number; horizontalSpacing: number; verticalSpacing: number } | null {
  // هذه دالة متقدمة تحتاج لخوارزميات معقدة
  // للبساطة، سنعيد قيم افتراضية بناءً على حجم الصورة
  
  const width = imageData.width;
  const height = imageData.height;
  
  // افتراض أن الشبكة تبدأ من 20% من اليسار و 15% من الأعلى
  const startX = Math.floor(width * 0.2);
  const startY = Math.floor(height * 0.15);
  
  // المسافات بين الدوائر
  const horizontalSpacing = Math.floor(width * 0.15);
  const verticalSpacing = Math.floor(height * 0.08);
  
  return {
    startX,
    startY,
    horizontalSpacing,
    verticalSpacing
  };
}

/**
 * معالجة كاملة لورقة الإجابة
 */
export async function processAnswerSheet(
  imageData: ImageData,
  numberOfQuestions: number,
  optionsPerQuestion: number = 4
): Promise<BubbleDetectionResult[]> {
  // 1. تحويل إلى Grayscale
  const grayImage = convertToGrayscale(imageData);
  
  // 2. تطبيق Threshold
  const threshold = 128; // يمكن تعديله حسب جودة الصورة
  const binaryImage = applyThreshold(grayImage, threshold);
  
  // 3. إعداد الإعدادات
  const config: OMRConfig = {
    numberOfQuestions,
    optionsPerQuestion,
    bubbleRadius: Math.floor(Math.min(imageData.width, imageData.height) * 0.02), // 2% من أصغر بعد
    threshold: 0.3 // 30% كثافة
  };
  
  // 4. محاولة الكشف التلقائي عن مواقع الدوائر
  const positions = autoDetectBubblePositions(binaryImage, config);
  
  if (!positions) {
    throw new Error('فشل في تحديد مواقع الدوائر');
  }
  
  // 5. الكشف عن الدوائر المظللة
  const results = detectBubbleGrid(
    binaryImage,
    config,
    positions.startX,
    positions.startY,
    positions.horizontalSpacing,
    positions.verticalSpacing
  );
  
  return results;
}

/**
 * رسم مربعات حول الدوائر المكتشفة على الصورة
 */
export function drawDetectedBubbles(
  canvas: HTMLCanvasElement,
  results: BubbleDetectionResult[],
  bubbleRadius: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  
  results.forEach(result => {
    // رسم دائرة حول الإجابة المكتشفة
    ctx.beginPath();
    ctx.arc(result.position.x, result.position.y, bubbleRadius * 1.5, 0, 2 * Math.PI);
    ctx.stroke();
    
    // كتابة نسبة الثقة
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(
      `${(result.confidence * 100).toFixed(0)}%`,
      result.position.x + bubbleRadius * 2,
      result.position.y
    );
  });
}