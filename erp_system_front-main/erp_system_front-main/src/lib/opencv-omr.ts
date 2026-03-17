/**
 * محرك OMR متقدم باستخدام OpenCV.js
 * التعرف التلقائي الكامل على الدوائر المظللة
 */

import cv from '@techstark/opencv-js';

export interface CircleDetection {
  x: number;
  y: number;
  radius: number;
  filled: boolean;
  darkness: number;
}

export interface OMRResult {
  questionNumber: number;
  selectedAnswer: number;
  confidence: number;
}

/**
 * تحليل صورة OMR باستخدام OpenCV
 */
export async function analyzeOMRWithOpenCV(
  imageDataUrl: string,
  numberOfQuestions: number
): Promise<OMRResult[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = async () => {
      try {
        console.log('🔬 بدء تحليل OpenCV...');
        
        // 1. تحميل الصورة إلى OpenCV
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        
        ctx.drawImage(img, 0, 0);
        const src = cv.imread(canvas);
        
        console.log('📐 حجم الصورة:', src.cols, 'x', src.rows);
        
        // 2. تحويل إلى Grayscale
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        console.log('✓ تحويل Grayscale');
        
        // 3. تطبيق Gaussian Blur لتقليل الضوضاء
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        console.log('✓ تطبيق Blur');
        
        // 4. تطبيق Threshold للحصول على صورة ثنائية
        const binary = new cv.Mat();
        cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        console.log('✓ تطبيق Threshold');
        
        // 5. البحث عن الدوائر باستخدام HoughCircles
        const circles = new cv.Mat();
        cv.HoughCircles(
          blurred,
          circles,
          cv.HOUGH_GRADIENT,
          1,
          30, // المسافة الدنيا بين الدوائر
          100, // عتبة Canny العليا
          30, // عتبة التراكم
          15, // نصف قطر أدنى (pixels)
          50  // نصف قطر أقصى (pixels)
        );
        
        console.log(`🎯 تم إيجاد ${circles.cols} دائرة`);
        
        // 6. تصنيف الدوائر حسب الصفوف
        const detectedCircles: CircleDetection[] = [];
        
        for (let i = 0; i < circles.cols; i++) {
          const x = circles.data32F[i * 3];
          const y = circles.data32F[i * 3 + 1];
          const radius = circles.data32F[i * 3 + 2];
          
          // حساب كثافة السواد داخل الدائرة
          const darkness = calculateCircleDarkness(binary, x, y, radius);
          
          detectedCircles.push({
            x: Math.round(x),
            y: Math.round(y),
            radius: Math.round(radius),
            filled: darkness > 0.4, // مظللة إذا كان السواد > 40%
            darkness
          });
        }
        
        console.log(`💡 دوائر مظللة: ${detectedCircles.filter(c => c.filled).length}`);
        
        // 7. تنظيم الدوائر في صفوف (أسئلة)
        const questions = groupCirclesIntoQuestions(detectedCircles, numberOfQuestions);
        
        // 8. تحديد الإجابة المختارة لكل سؤال
        const results: OMRResult[] = questions.map((questionCircles, index) => {
          const filledCircles = questionCircles
            .map((circle, idx) => ({ circle, idx }))
            .filter(({ circle }) => circle.filled)
            .sort((a, b) => b.circle.darkness - a.circle.darkness);
          
          if (filledCircles.length > 0) {
            const selected = filledCircles[0];
            console.log(`سؤال ${index + 1}: الإجابة ${selected.idx + 1} (ثقة ${(selected.circle.darkness * 100).toFixed(0)}%)`);
            
            return {
              questionNumber: index + 1,
              selectedAnswer: selected.idx,
              confidence: selected.circle.darkness
            };
          }
          
          return {
            questionNumber: index + 1,
            selectedAnswer: -1,
            confidence: 0
          };
        });
        
        // تنظيف
        src.delete();
        gray.delete();
        blurred.delete();
        binary.delete();
        circles.delete();
        
        console.log('✅ تحليل OpenCV مكتمل!');
        resolve(results.filter(r => r.selectedAnswer !== -1));
        
      } catch (error) {
        console.error('❌ خطأ OpenCV:', error);
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
    img.src = imageDataUrl;
  });
}

/**
 * حساب كثافة السواد داخل دائرة
 */
function calculateCircleDarkness(
  binaryMat: any,
  centerX: number,
  centerY: number,
  radius: number
): number {
  let darkPixels = 0;
  let totalPixels = 0;
  
  const checkRadius = Math.round(radius * 0.7); // فحص 70% من الدائرة (المركز)
  
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= checkRadius) {
        const px = Math.round(centerX + dx);
        const py = Math.round(centerY + dy);
        
        if (px >= 0 && px < binaryMat.cols && py >= 0 && py < binaryMat.rows) {
          const pixelValue = binaryMat.ucharPtr(py, px)[0];
          
          if (pixelValue === 0) { // أسود في صورة ثنائية
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
 * تنظيم الدوائر في صفوف (أسئلة)
 */
function groupCirclesIntoQuestions(
  circles: CircleDetection[],
  numberOfQuestions: number
): CircleDetection[][] {
  // ترتيب الدوائر حسب Y (من أعلى لأسفل)
  const sortedByY = [...circles].sort((a, b) => a.y - b.y);
  
  // تقسيم إلى صفوف
  const rows: CircleDetection[][] = [];
  let currentRow: CircleDetection[] = [];
  let lastY = -1;
  const rowThreshold = 20; // المسافة القصوى بين الدوائر في نفس الصف
  
  sortedByY.forEach(circle => {
    if (lastY === -1 || Math.abs(circle.y - lastY) < rowThreshold) {
      currentRow.push(circle);
      lastY = circle.y;
    } else {
      if (currentRow.length > 0) {
        // ترتيب الدوائر في الصف من اليمين لليسار (عربي)
        currentRow.sort((a, b) => b.x - a.x);
        rows.push(currentRow);
      }
      currentRow = [circle];
      lastY = circle.y;
    }
  });
  
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => b.x - a.x);
    rows.push(currentRow);
  }
  
  console.log(`📊 تم تنظيم ${circles.length} دائرة في ${rows.length} صف`);
  
  // إرجاع أول numberOfQuestions صف
  return rows.slice(0, numberOfQuestions);
}

/**
 * رسم نتائج OpenCV على الصورة
 */
export function drawOpenCVResults(
  canvas: HTMLCanvasElement,
  imageDataUrl: string,
  results: OMRResult[],
  allCircles: CircleDetection[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // رسم جميع الدوائر المكتشفة (أزرق)
      allCircles.forEach(circle => {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();
      });
      
      // رسم الدوائر المظللة (أخضر)
      allCircles.filter(c => c.filled).forEach(circle => {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius * 1.2, 0, 2 * Math.PI);
        ctx.stroke();
        
        // نسبة الثقة
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(
          `${(circle.darkness * 100).toFixed(0)}%`,
          circle.x + circle.radius + 10,
          circle.y + 5
        );
      });
      
      resolve();
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}