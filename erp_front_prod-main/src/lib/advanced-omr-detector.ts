/**
 * نظام OMR متقدم للتعرف على الدوائر المظللة
 * يعمل مع تصميم ورقة الإجابة الخاصة بنا
 */

export interface DetectedAnswer {
  questionIndex: number;
  selectedOption: string; // 'صحيح' أو 'خطأ'
  selectedOptionIndex: number; // 0 للأول، 1 للثاني
  confidence: number;
  bubblePosition: { x: number; y: number };
}

export interface BubbleInfo {
  x: number;
  y: number;
  darkness: number; // 0-1, حيث 1 = أسود كامل
}

/**
 * تحليل الصورة والتعرف على الإجابات
 */
export async function analyzeAnswerSheet(
  imageDataUrl: string,
  numberOfQuestions: number
): Promise<DetectedAnswer[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // إنشاء Canvas للمعالجة
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('فشل في إنشاء Canvas');
        }
        
        // رسم الصورة
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // تحويل لـ Grayscale
        const grayData = convertToGrayscale(imageData);
        
        // إيجاد مواقع الدوائر والتعرف على التظليل
        const answers = detectAnswersFromImage(grayData, canvas.width, canvas.height, numberOfQuestions);
        
        resolve(answers);
      } catch (error) {
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
 * تحويل الصورة إلى Grayscale
 */
function convertToGrayscale(imageData: ImageData): Uint8ClampedArray {
  const data = imageData.data;
  const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      0.299 * data[i] +     // Red
      0.587 * data[i + 1] + // Green  
      0.114 * data[i + 2]   // Blue
    );
    grayData[i / 4] = gray;
  }
  
  return grayData;
}

/**
 * حساب كثافة السواد في منطقة دائرية
 */
function calculateCircleDarkness(
  grayData: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number
): number {
  let totalDarkness = 0;
  let pixelCount = 0;
  
  // فحص منطقة دائرية
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // التحقق من أن النقطة داخل الدائرة
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius) {
        const px = Math.round(centerX + dx);
        const py = Math.round(centerY + dy);
        
        // التحقق من الحدود
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const index = py * width + px;
          const brightness = grayData[index];
          
          // كلما كانت القيمة أقل، كان البكسل أغمق
          // نحول إلى نسبة السواد (0 = أبيض، 1 = أسود)
          const darkness = 1 - (brightness / 255);
          totalDarkness += darkness;
          pixelCount++;
        }
      }
    }
  }
  
  return pixelCount > 0 ? totalDarkness / pixelCount : 0;
}

/**
 * البحث عن الدوائر في منطقة محددة
 */
function findBubblesInRow(
  grayData: Uint8ClampedArray,
  width: number,
  height: number,
  rowY: number,
  numberOfOptions: number = 2
): BubbleInfo[] {
  const bubbles: BubbleInfo[] = [];
  const bubbleRadius = Math.floor(Math.min(width, height) * 0.012); // 1.2% من أصغر بعد
  
  // البحث في أقصى اليمين (75% - 95% من عرض الصورة)
  // لأن الصورة عربية والدوائر على اليمين
  const searchStartX = Math.floor(width * 0.75);
  const searchEndX = Math.floor(width * 0.95);
  const bubbleSpacing = Math.floor((searchEndX - searchStartX) / (numberOfOptions + 1));
  
  // البحث عن دائرتين: الأولى على اليمين (صحيح)، الثانية على اليسار (خطأ)
  for (let i = 0; i < numberOfOptions; i++) {
    const x = searchEndX - (i + 1) * bubbleSpacing; // من اليمين لليسار
    const darkness = calculateCircleDarkness(grayData, width, height, x, rowY, bubbleRadius);
    
    console.log(`السؤال ${rowY}: الخيار ${i}: موقع X=${x}, السواد=${(darkness * 100).toFixed(1)}%`);
    
    bubbles.push({
      x,
      y: rowY,
      darkness
    });
  }
  
  return bubbles;
}

/**
 * التعرف على الإجابات من الصورة
 */
function detectAnswersFromImage(
  grayData: Uint8ClampedArray,
  width: number,
  height: number,
  numberOfQuestions: number
): DetectedAnswer[] {
  const answers: DetectedAnswer[] = [];
  
  // حساب المسافات بين الأسئلة بناءً على تصميم الورقة
  // من الصورة: الأسئلة تبدأ حوالي 40% من الأعلى
  const startY = Math.floor(height * 0.40);
  const questionSpacing = Math.floor(height * 0.055); // حوالي 5.5% بين كل سؤال
  
  const optionLabels = ['صحيح', 'خطأ']; // الخيار الأول = صحيح، الثاني = خطأ
  const darknessThreshold = 0.25; // عتبة التظليل: 25% سواد يعني مظلل
  
  console.log(`📊 تحليل ${numberOfQuestions} سؤال`);
  console.log(`📐 بدء Y: ${startY}, المسافة: ${questionSpacing}`);
  
  // المرور على كل سؤال
  for (let q = 0; q < numberOfQuestions; q++) {
    const rowY = startY + (q * questionSpacing);
    
    // البحث عن الدوائر في هذا الصف
    const bubbles = findBubblesInRow(grayData, width, height, rowY, 2);
    
    console.log(`سؤال ${q + 1}: دائرة 1 (صحيح)=${(bubbles[0]?.darkness * 100 || 0).toFixed(1)}%, دائرة 2 (خطأ)=${(bubbles[1]?.darkness * 100 || 0).toFixed(1)}%`);
    
    // إيجاد أكثر دائرة مظللة
    let maxDarkness = 0;
    let selectedIndex = -1;
    let selectedBubblePos = { x: 0, y: 0 };
    
    bubbles.forEach((bubble, index) => {
      if (bubble.darkness > darknessThreshold && bubble.darkness > maxDarkness) {
        maxDarkness = bubble.darkness;
        selectedIndex = index;
        selectedBubblePos = { x: bubble.x, y: bubble.y };
        console.log(`  ✓ تم اختيار: ${optionLabels[index]} (السواد: ${(bubble.darkness * 100).toFixed(1)}%)`);
      }
    });
    
    // إذا تم اكتشاف إجابة
    if (selectedIndex !== -1) {
      answers.push({
        questionIndex: q,
        selectedOption: optionLabels[selectedIndex],
        selectedOptionIndex: selectedIndex,
        confidence: Math.min(maxDarkness * 2, 1),
        bubblePosition: selectedBubblePos
      });
    }
  }
  
  return answers;
}

/**
 * رسم النتائج على الصورة
 */
export function drawDetectionResults(
  canvas: HTMLCanvasElement,
  imageDataUrl: string,
  answers: DetectedAnswer[]
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
      
      // رسم المربعات حول الإجابات المكتشفة
      answers.forEach((answer) => {
        const radius = Math.floor(img.width * 0.02);
        
        // دائرة خضراء حول الإجابة
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(answer.bubblePosition.x, answer.bubblePosition.y, radius * 1.5, 0, 2 * Math.PI);
        ctx.stroke();
        
        // نسبة الثقة
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(
          `${(answer.confidence * 100).toFixed(0)}%`,
          answer.bubblePosition.x + radius * 2,
          answer.bubblePosition.y + 8
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